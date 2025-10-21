import json
import sys
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from order_manager import OrderManager, STATUS_TRANSITIONS


STATUS_LABELS = {
    "sent_to_kitchen": "Chua xu ly",
    "processing": "Dang xu ly",
    "completed": "Hoan thanh",
    "cancelled": "Da huy",
    "pending": "Cho nhan vien",
    "confirmed": "Da xac nhan",
    "served": "Da phuc vu"
}

KITCHEN_RELEVANT_STATUSES = ["sent_to_kitchen", "processing", "completed", "cancelled"]

FILTER_OPTIONS = [
    ("Tat ca", []),
    ("Chua xu ly", ["sent_to_kitchen"]),
    ("Dang xu ly", ["processing"]),
    ("Hoan thanh", ["completed"]),
    ("Da huy", ["cancelled"])
]


def can_transition(current_status, target_status):
    if current_status == target_status:
        return True
    allowed = STATUS_TRANSITIONS.get(current_status, set())
    return target_status in allowed


def format_currency(value):
    try:
        return f"{float(value):,.2f} VND"
    except (TypeError, ValueError):
        return "0.00 VND"


def _flatten_option_entries(options):
    entries = []

    def visit(node, pending_label=None):
        if node in (None, "", [], {}):
            return
        if isinstance(node, dict):
            label = node.get("label") or node.get("name") or pending_label
            value = node.get("value")
            handled = False
            if value is not None and not isinstance(value, (dict, list)):
                value_text = str(value).strip()
                label_text = (label or "").strip()
                if label_text or value_text:
                    entries.append((label_text, value_text))
                    handled = True
            if not handled:
                for key, val in node.items():
                    if key in {"label", "name", "value"}:
                        continue
                    visit(val, label)
            else:
                for key, val in node.items():
                    if key in {"label", "name", "value"}:
                        continue
                    visit(val)
        elif isinstance(node, list):
            for item in node:
                visit(item, pending_label)
        else:
            value_text = str(node).strip()
            if value_text:
                entries.append(((pending_label or "").strip(), value_text))

    visit(options)
    cleaned = []
    seen = set()
    for label, value in entries:
        key = (label, value)
        if key in seen:
            continue
        seen.add(key)
        cleaned.append((label, value))
    return cleaned


def format_option_detail(options):
    pairs = _flatten_option_entries(options)
    if not pairs:
        return ""
    lines = []
    for label, value in pairs:
        if label and value:
            lines.append(f"- {label}: {value}")
        elif value:
            lines.append(f"- {value}")
        else:
            lines.append(f"- {label}")
    return "\n".join(lines)


def summarize_options(options):
    pairs = _flatten_option_entries(options)
    if not pairs:
        return ""
    fragments = []
    for label, value in pairs:
        if label and value:
            fragments.append(f"{label}: {value}")
        elif value:
            fragments.append(value)
        elif label:
            fragments.append(label)
    summary = "; ".join(fragments)
    return summary if len(summary) <= 120 else summary[:117] + "..."


class KitchenApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Quan ly bep - Trang thai don hang")
        self.geometry("1000x600")

        self.order_manager = OrderManager()
        self.orders_data = {}
        self.current_items = []
        self.selected_order = None

        self.filter_var = tk.StringVar(value=FILTER_OPTIONS[0][0])
        self.order_title_var = tk.StringVar(value="Chua chon don hang")
        self.customer_var = tk.StringVar(value="---")
        self.table_var = tk.StringVar(value="---")
        self.status_var = tk.StringVar(value="---")
        self.assistance_var = tk.StringVar(value="---")

        self.auto_refresh_ms = 30_000
        self._auto_refresh_job = None
        self._refresh_in_progress = False
        self._pending_refresh = False
        self._known_order_ids = set()
        self.last_refresh_var = tk.StringVar(value="Chua cap nhat")

        self._build_layout()
        self.refresh_orders()

    # --- Layout --------------------------------------------------------
    def _build_layout(self):
        main_frame = ttk.Frame(self, padding=10)
        main_frame.pack(fill=tk.BOTH, expand=True)

        left_frame = ttk.Frame(main_frame)
        left_frame.pack(side=tk.LEFT, fill=tk.Y)

        filter_frame = ttk.Frame(left_frame)
        filter_frame.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(filter_frame, text="Loc trang thai:").pack(side=tk.LEFT)
        filter_box = ttk.Combobox(
            filter_frame,
            textvariable=self.filter_var,
            values=[label for label, _ in FILTER_OPTIONS],
            state="readonly",
            width=18
        )
        filter_box.pack(side=tk.LEFT, padx=5)
        filter_box.bind("<<ComboboxSelected>>", lambda _: self.refresh_orders())

        self.refresh_button = ttk.Button(filter_frame, text="Lam moi", command=self.refresh_orders)
        self.refresh_button.pack(side=tk.RIGHT)

        ttk.Label(left_frame, textvariable=self.last_refresh_var, anchor=tk.W, font=("TkDefaultFont", 9)).pack(fill=tk.X, pady=(4, 6))

        self.orders_tree = ttk.Treeview(
            left_frame,
            columns=("id", "table", "customer", "status"),
            show="headings",
            height=24,
            selectmode="browse"
        )
        self.orders_tree.heading("id", text="Ma don")
        self.orders_tree.heading("table", text="Ban")
        self.orders_tree.heading("customer", text="Khach hang")
        self.orders_tree.heading("status", text="Trang thai")

        self.orders_tree.column("id", width=80, anchor=tk.CENTER)
        self.orders_tree.column("table", width=70, anchor=tk.CENTER)
        self.orders_tree.column("customer", width=150)
        self.orders_tree.column("status", width=120, anchor=tk.CENTER)

        self.orders_tree.tag_configure("new", background="#FFF4CC")

        self.orders_tree.pack(fill=tk.Y, expand=True)
        self.orders_tree.bind("<<TreeviewSelect>>", self.on_order_select)

        right_frame = ttk.Frame(main_frame)
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(15, 0))

        info_frame = ttk.LabelFrame(right_frame, text="Thong tin don", padding=10)
        info_frame.pack(fill=tk.X)

        ttk.Label(info_frame, textvariable=self.order_title_var, font=("TkDefaultFont", 11, "bold")).grid(row=0, column=0, columnspan=2, sticky=tk.W)

        ttk.Label(info_frame, text="Khach hang:").grid(row=1, column=0, sticky=tk.W, pady=3)
        ttk.Label(info_frame, textvariable=self.customer_var).grid(row=1, column=1, sticky=tk.W, pady=3)

        ttk.Label(info_frame, text="Ban so:").grid(row=2, column=0, sticky=tk.W, pady=3)
        ttk.Label(info_frame, textvariable=self.table_var).grid(row=2, column=1, sticky=tk.W, pady=3)

        ttk.Label(info_frame, text="Trang thai:").grid(row=3, column=0, sticky=tk.W, pady=3)
        ttk.Label(info_frame, textvariable=self.status_var).grid(row=3, column=1, sticky=tk.W, pady=3)

        ttk.Label(info_frame, text="Can ho tro:").grid(row=4, column=0, sticky=tk.W, pady=3)
        ttk.Label(info_frame, textvariable=self.assistance_var).grid(row=4, column=1, sticky=tk.W, pady=3)

        info_frame.columnconfigure(1, weight=1)

        button_frame = ttk.Frame(right_frame)
        button_frame.pack(fill=tk.X, pady=(8, 10))

        self.btn_pending = ttk.Button(button_frame, text="Tra ve cho bep", command=lambda: self.set_status("sent_to_kitchen"))
        self.btn_pending.pack(side=tk.LEFT)

        self.btn_processing = ttk.Button(button_frame, text="Bat dau che bien", command=lambda: self.set_status("processing"))
        self.btn_processing.pack(side=tk.LEFT, padx=5)

        self.btn_completed = ttk.Button(button_frame, text="Mon da san sang", command=lambda: self.set_status("completed"))
        self.btn_completed.pack(side=tk.LEFT, padx=5)

        self.btn_cancelled = ttk.Button(button_frame, text="Huy don", command=lambda: self.set_status("cancelled"))
        self.btn_cancelled.pack(side=tk.LEFT, padx=5)

        items_frame = ttk.LabelFrame(right_frame, text="Mon trong don", padding=10)
        items_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 0))

        self.items_tree = ttk.Treeview(
            items_frame,
            columns=("product_id", "name", "options", "quantity", "price"),
            show="headings",
            height=12,
            selectmode="browse"
        )
        for col, label, width, anchor in (
            ("product_id", "Ma SP", 70, tk.CENTER),
            ("name", "Ten mon", 200, tk.W),
            ("options", "Tuy chon", 200, tk.W),
            ("quantity", "So luong", 80, tk.CENTER),
            ("price", "Thanh tien", 110, tk.E),
        ):
            self.items_tree.heading(col, text=label)
            self.items_tree.column(col, width=width, anchor=anchor)
        self.items_tree.pack(fill=tk.BOTH, expand=True)
        self.items_tree.bind("<Double-1>", self.on_item_double_click)
        self.items_tree.bind("<<TreeviewSelect>>", self.on_item_select)

        options_frame = ttk.LabelFrame(right_frame, text="Tuy chon mon", padding=10)
        options_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 0))

        self.options_text = tk.Text(options_frame, height=4, wrap=tk.WORD)
        self.options_text.pack(fill=tk.BOTH, expand=True)
        self.options_text.configure(state="disabled")

        note_frame = ttk.LabelFrame(right_frame, text="Ghi chu tu khach", padding=10)
        note_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 0))

        self.note_text = tk.Text(note_frame, height=5, wrap=tk.WORD)
        self.note_text.pack(fill=tk.BOTH, expand=True)
        self.note_text.configure(state="disabled")

        self._update_action_buttons()

    # --- Data flow ------------------------------------------------------
    def refresh_orders(self, keep_selection=None):
        if self._refresh_in_progress:
            self._pending_refresh = True
            return

        if keep_selection is None and self.selected_order:
            keep_selection = self.selected_order.get("id")

        self._refresh_in_progress = True
        refresh_stamp = datetime.now().strftime("%H:%M:%S")
        if hasattr(self, "refresh_button"):
            self.refresh_button["state"] = "disabled"

        filter_label = self.filter_var.get()
        status_filter = next((values for label, values in FILTER_OPTIONS if label == filter_label), [])

        try:
            if status_filter:
                orders = self.order_manager.get_all_orders(status_filter)
            else:
                orders = self.order_manager.get_all_orders(KITCHEN_RELEVANT_STATUSES)
        except Exception as exc:  # pylint: disable=broad-except
            self.last_refresh_var.set(f"Loi cap nhat luc {refresh_stamp}")
            messagebox.showerror("Loi", f"Khong the tai danh sach don hang:\n{exc}")
        else:
            previous_ids = set(self._known_order_ids)
            current_ids = {order["id"] for order in orders}
            new_ids = current_ids - previous_ids if previous_ids else set()

            self.orders_data = {order["id"]: order for order in orders}
            self.orders_tree.delete(*self.orders_tree.get_children())

            for order in orders:
                order_id = order["id"]
                table_number = order.get("table_number") or "-"
                customer = order.get("customer_name") or "Khach le"
                status_label = STATUS_LABELS.get(order.get("status"), order.get("status"))
                tags = ("new",) if order_id in new_ids else ()
                self.orders_tree.insert(
                    "",
                    tk.END,
                    iid=str(order_id),
                    values=(order_id, table_number, customer, status_label),
                    tags=tags
                )

            children = self.orders_tree.get_children()
            target = None
            if keep_selection:
                candidate = str(keep_selection)
                if candidate in children:
                    target = candidate
            if target is None and children:
                target = children[0]

            if target:
                self.orders_tree.selection_set(target)
                self.orders_tree.see(target)
                try:
                    self.load_order_details(int(target))
                except ValueError:
                    self.load_order_details(int(self.orders_tree.item(target)["values"][0]))
            else:
                self.clear_details()

            self._known_order_ids = current_ids
            if new_ids:
                self.after(8000, lambda ids=list(new_ids): self._clear_new_order_tags(ids))
            self.last_refresh_var.set(f"Cap nhat luc {refresh_stamp}")
        finally:
            self._refresh_in_progress = False
            if hasattr(self, "refresh_button"):
                self.refresh_button["state"] = "normal"
            self._start_auto_refresh()
            if self._pending_refresh:
                self._pending_refresh = False
                self.after(100, self.refresh_orders)

    def on_order_select(self, _event=None):
        selection = self.orders_tree.selection()
        if not selection:
            self.clear_details()
            return
        order_id = int(selection[0])
        self.load_order_details(order_id)

    def load_order_details(self, order_id):
        order = self.order_manager.get_order(order_id)
        if not order:
            messagebox.showwarning("Thong bao", "Khong the tai chi tiet don hang.")
            return

        self.selected_order = order
        self.order_title_var.set(f"Don hang #{order_id}")
        self.customer_var.set(order.get("customer_name") or "Khach le")
        self.table_var.set(order.get("table_number") or "-")
        self.status_var.set(STATUS_LABELS.get(order.get("status"), order.get("status")))
        self.assistance_var.set("Co" if order.get("needs_assistance") else "Khong")

        self.note_text.configure(state="normal")
        self.note_text.delete("1.0", tk.END)
        if order.get("note"):
            self.note_text.insert(tk.END, order["note"])
        self.note_text.configure(state="disabled")

        self.current_items = []
        self.items_tree.delete(*self.items_tree.get_children())

        for index, item in enumerate(order.get("items", [])):
            unit_price = float(item.get("price") or 0)
            quantity = int(item.get("quantity") or 0)
            line_total = unit_price * quantity
            options_payload = item.get("selected_options")
            options_detail = format_option_detail(options_payload)
            options_summary = summarize_options(options_payload)
            entry = {
                "product_id": item.get("product_id"),
                "name": item.get("name") or f"San pham {item.get('product_id')}",
                "quantity": quantity,
                "unit_price": unit_price,
                "selected_options": options_payload,
                "options_detail": options_detail,
                "options_summary": options_summary
            }
            self.current_items.append(entry)
            self.items_tree.insert(
                "",
                tk.END,
                iid=str(index),
                values=(
                    entry["product_id"],
                    entry["name"],
                    options_summary or "-",
                    entry["quantity"],
                    f"{line_total:,.2f}"
                )
            )

        if self.items_tree.get_children():
            first_item = self.items_tree.get_children()[0]
            self.items_tree.selection_set(first_item)
            self.items_tree.see(first_item)
        self._update_options_display()

        self._update_action_buttons()

    def clear_details(self):
        self.selected_order = None
        self.order_title_var.set("Chua chon don hang")
        self.customer_var.set("---")
        self.table_var.set("---")
        self.status_var.set("---")
        self.assistance_var.set("---")
        self.note_text.configure(state="normal")
        self.note_text.delete("1.0", tk.END)
        self.note_text.configure(state="disabled")
        self.items_tree.delete(*self.items_tree.get_children())
        self.current_items = []
        self.options_text.configure(state="normal")
        self.options_text.delete("1.0", tk.END)
        self.options_text.insert(tk.END, "Khong co tuy chon dac biet.")
        self.options_text.configure(state="disabled")
        self._update_action_buttons()

    # --- Actions --------------------------------------------------------
    def set_status(self, target_status):
        if not self.selected_order:
            messagebox.showinfo("Thong bao", "Hay chon mot don hang truoc.")
            return

        order_id = self.selected_order["id"]
        current_status = self.selected_order.get("status")

        if not can_transition(current_status, target_status):
            messagebox.showwarning(
                "Khong hop le",
                f"Khong the chuyen tu {STATUS_LABELS.get(current_status, current_status)} "
                f"sang {STATUS_LABELS.get(target_status, target_status)}."
            )
            return

        if not self.order_manager.update_order_status(order_id, target_status):
            messagebox.showerror("Loi", "Khong the cap nhat trang thai don hang.")
            return

        if target_status == "completed":
            messagebox.showinfo("Thong bao", "Don hang da hoan thanh. Da gui thong bao toi nhan vien phuc vu.")
        elif target_status == "processing":
            messagebox.showinfo("Thong bao", "Da danh dau bat dau che bien don hang.")
        elif target_status == "cancelled":
            messagebox.showinfo("Thong bao", "Don hang da huy.")

        self.refresh_orders(keep_selection=order_id)

    def on_item_double_click(self, _event=None):
        selection = self.items_tree.selection()
        if not selection:
            return
        index = int(selection[0])
        if index >= len(self.current_items):
            return
        item = self.current_items[index]
        self.show_item_detail(item)

    def on_item_select(self, _event=None):
        self._update_options_display()

    def show_item_detail(self, item):
        window = tk.Toplevel(self)
        window.title(f"Chi tiet mon #{item['product_id']}")
        window.geometry("360x320")
        window.grab_set()

        frame = ttk.Frame(window, padding=10)
        frame.pack(fill=tk.BOTH, expand=True)

        total_price = item["unit_price"] * item["quantity"]
        info_lines = [
            f"Ten mon: {item['name']}",
            f"So luong: {item['quantity']}",
            f"Don gia: {item['unit_price']:,.2f} VND",
            f"Thanh tien: {total_price:,.2f} VND"
        ]
        ttk.Label(frame, text="\n".join(info_lines), justify=tk.LEFT).pack(anchor=tk.W)

        options = item.get("selected_options")
        if options:
            ttk.Label(frame, text="Tuy chon:").pack(anchor=tk.W, pady=(10, 0))
            text = tk.Text(frame, height=8, wrap=tk.WORD)
            text.pack(fill=tk.BOTH, expand=True)
            detail_text = item.get("options_detail") or format_option_detail(options)
            text.insert(tk.END, detail_text if detail_text else "Khong co tuy chon dac biet.")
            text.configure(state="disabled")
        ttk.Button(frame, text="Dong", command=window.destroy).pack(pady=(10, 0))

    # --- Helpers --------------------------------------------------------
    def _update_options_display(self, item=None):
        message = "Khong co tuy chon dac biet."
        target = item
        if target is None:
            selection = self.items_tree.selection()
            if selection:
                try:
                    index = int(selection[0])
                except (ValueError, TypeError):
                    index = None
                if index is not None and 0 <= index < len(self.current_items):
                    target = self.current_items[index]
        if target:
            detail = target.get("options_detail") or format_option_detail(target.get("selected_options"))
            if detail:
                message = detail
        self.options_text.configure(state="normal")
        self.options_text.delete("1.0", tk.END)
        self.options_text.insert(tk.END, message)
        self.options_text.configure(state="disabled")

    def _start_auto_refresh(self):
        if self.auto_refresh_ms <= 0:
            return
        if self._auto_refresh_job is not None:
            try:
                self.after_cancel(self._auto_refresh_job)
            except Exception:
                pass
        self._auto_refresh_job = self.after(self.auto_refresh_ms, self._auto_refresh_callback)

    def _auto_refresh_callback(self):
        keep_id = self.selected_order["id"] if self.selected_order else None
        self.refresh_orders(keep_selection=keep_id)

    def _clear_new_order_tags(self, order_ids):
        if not self.orders_tree:
            return
        for order_id in order_ids:
            iid = str(order_id)
            if self.orders_tree.exists(iid):
                tags = tuple(tag for tag in self.orders_tree.item(iid, "tags") if tag != "new")
                self.orders_tree.item(iid, tags=tags)

    def _update_action_buttons(self):
        buttons = [self.btn_pending, self.btn_processing, self.btn_completed, self.btn_cancelled]
        if not self.selected_order:
            for button in buttons:
                button["state"] = "disabled"
            return

        status = self.selected_order.get("status")
        self.btn_pending["state"] = "normal" if can_transition(status, "sent_to_kitchen") else "disabled"
        self.btn_processing["state"] = "normal" if can_transition(status, "processing") else "disabled"
        self.btn_completed["state"] = "normal" if can_transition(status, "completed") else "disabled"
        self.btn_cancelled["state"] = "normal" if can_transition(status, "cancelled") else "disabled"


def run():
    app = KitchenApp()
    app.mainloop()


if __name__ == "__main__":
    run()
