import json
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog

import qrcode
from PIL import Image, ImageTk

import sys
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from order_manager import OrderManager

STATUS_DISPLAY = {
    "pending": "Cho xac nhan",
    "confirmed": "Da xac nhan",
    "sent_to_kitchen": "Cho bep",
    "processing": "Bep dang lam",
    "completed": "Hoan thanh",
    "served": "Da phuc vu",
    "cancelled": "Da huy"
}

FILTER_OPTIONS = [
    ("Tat ca", "all"),
    ("Cho xac nhan", "pending"),
    ("Da xac nhan", "confirmed"),
    ("Cho bep", "sent_to_kitchen"),
    ("Bep dang lam", "processing"),
    ("Hoan thanh", "completed"),
    ("Da phuc vu", "served"),
    ("Da huy", "cancelled")
]

FILTER_LABEL_TO_VALUE = {label: value for label, value in FILTER_OPTIONS}


def as_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


class StaffApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Quan ly don hang - Nhan vien phuc vu")
        self.geometry("1100x650")

        self.order_manager = OrderManager()
        self.orders_data = {}
        self.current_items = []
        self.selected_order_data = None
        self.qr_images = []

        self.status_filter_var = tk.StringVar(value=FILTER_OPTIONS[1][0])
        self.customer_name_var = tk.StringVar()
        self.table_number_var = tk.StringVar()
        self.status_value_var = tk.StringVar(value="---")
        self.payment_value_var = tk.StringVar(value="---")
        self.total_value_var = tk.StringVar(value="0.00 VND")
        self.needs_assistance_var = tk.BooleanVar()

        self.auto_refresh_ms = 60_000
        self._auto_refresh_job = None
        self._known_order_ids = set()
        self._initial_orders_loaded = False
        self._status_snapshot = {}
        self._refresh_in_progress = False
        self._pending_refresh = False
        self.last_refresh_var = tk.StringVar(value="Chua cap nhat")

        self._build_layout()
        self.refresh_orders()

    # --- Layout helpers -------------------------------------------------
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
            textvariable=self.status_filter_var,
            values=[label for label, _ in FILTER_OPTIONS],
            state="readonly",
            width=18
        )
        filter_box.current(1)  # default to "Cho xac nhan"
        filter_box.pack(side=tk.LEFT, padx=5)
        filter_box.bind("<<ComboboxSelected>>", lambda _: self.refresh_orders())

        self.refresh_button = ttk.Button(filter_frame, text="Lam moi", command=self.refresh_orders)
        self.refresh_button.pack(side=tk.RIGHT)

        ttk.Label(left_frame, textvariable=self.last_refresh_var, anchor=tk.W, font=("TkDefaultFont", 9)).pack(fill=tk.X, pady=(4, 6))

        self.orders_tree = ttk.Treeview(
            left_frame,
            columns=("id", "customer", "status", "total", "table"),
            show="headings",
            height=25,
            selectmode="browse"
        )
        self.orders_tree.heading("id", text="Ma don")
        self.orders_tree.heading("customer", text="Khach hang")
        self.orders_tree.heading("status", text="Trang thai")
        self.orders_tree.heading("total", text="Tong tien")
        self.orders_tree.heading("table", text="Ban")
        self.orders_tree.column("id", width=70, anchor=tk.CENTER)
        self.orders_tree.column("customer", width=140)
        self.orders_tree.column("status", width=120, anchor=tk.CENTER)
        self.orders_tree.column("total", width=110, anchor=tk.E)
        self.orders_tree.column("table", width=70, anchor=tk.CENTER)
        self.orders_tree.tag_configure("new", background="#E5F0FF")
        self.orders_tree.pack(fill=tk.Y, expand=True)
        self.orders_tree.bind("<<TreeviewSelect>>", self.on_order_select)

        right_frame = ttk.Frame(main_frame)
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(15, 0))

        info_frame = ttk.LabelFrame(right_frame, text="Thong tin don hang", padding=10)
        info_frame.pack(fill=tk.X)

        ttk.Label(info_frame, text="Khach hang:").grid(row=0, column=0, sticky=tk.W)
        ttk.Entry(info_frame, textvariable=self.customer_name_var, width=30).grid(row=0, column=1, sticky=tk.W)

        ttk.Label(info_frame, text="Ban so:").grid(row=0, column=2, sticky=tk.W, padx=(15, 0))
        ttk.Entry(info_frame, textvariable=self.table_number_var, width=10).grid(row=0, column=3, sticky=tk.W)

        ttk.Label(info_frame, text="Trang thai:").grid(row=1, column=0, sticky=tk.W, pady=5)
        ttk.Label(info_frame, textvariable=self.status_value_var).grid(row=1, column=1, sticky=tk.W, pady=5)

        ttk.Label(info_frame, text="Thanh toan:").grid(row=1, column=2, sticky=tk.W, padx=(15, 0))
        ttk.Label(info_frame, textvariable=self.payment_value_var).grid(row=1, column=3, sticky=tk.W)

        ttk.Label(info_frame, text="Tong tien:").grid(row=2, column=0, sticky=tk.W)
        ttk.Label(info_frame, textvariable=self.total_value_var, font=("TkDefaultFont", 10, "bold")).grid(row=2, column=1, sticky=tk.W)

        ttk.Checkbutton(info_frame, text="Can ho tro", variable=self.needs_assistance_var).grid(row=2, column=2, sticky=tk.W, padx=(15, 0))

        ttk.Label(info_frame, text="Ghi chu:").grid(row=3, column=0, sticky=tk.NW, pady=(8, 0))
        self.note_text = tk.Text(info_frame, height=3, width=50)
        self.note_text.grid(row=3, column=1, columnspan=3, sticky=tk.W, pady=(8, 0))

        info_frame.columnconfigure(1, weight=1)
        info_frame.columnconfigure(3, weight=1)

        items_frame = ttk.LabelFrame(right_frame, text="Danh sach mon", padding=10)
        items_frame.pack(fill=tk.BOTH, expand=True, pady=(10, 0))

        self.items_tree = ttk.Treeview(
            items_frame,
            columns=("product_id", "name", "quantity", "price", "line_total"),
            show="headings",
            height=12,
            selectmode="browse"
        )
        for col, label, width, anchor in (
            ("product_id", "Ma SP", 70, tk.CENTER),
            ("name", "Ten mon", 200, tk.W),
            ("quantity", "So luong", 80, tk.CENTER),
            ("price", "Don gia", 90, tk.E),
            ("line_total", "Thanh tien", 110, tk.E),
        ):
            self.items_tree.heading(col, text=label)
            self.items_tree.column(col, width=width, anchor=anchor)
        self.items_tree.pack(fill=tk.BOTH, expand=True)

        item_buttons = ttk.Frame(items_frame)
        item_buttons.pack(fill=tk.X, pady=(8, 0))

        self.add_item_btn = ttk.Button(item_buttons, text="Them mon", command=self.add_item)
        self.add_item_btn.pack(side=tk.LEFT)

        self.remove_item_btn = ttk.Button(item_buttons, text="Xoa mon", command=self.remove_item)
        self.remove_item_btn.pack(side=tk.LEFT, padx=5)

        self.change_qty_btn = ttk.Button(item_buttons, text="Doi so luong", command=self.change_quantity)
        self.change_qty_btn.pack(side=tk.LEFT)

        action_frame = ttk.Frame(right_frame)
        action_frame.pack(fill=tk.X, pady=(12, 0))

        self.save_details_btn = ttk.Button(action_frame, text="Luu thong tin", command=self.save_details)
        self.save_details_btn.pack(side=tk.LEFT)

        self.confirm_btn = ttk.Button(action_frame, text="Xac nhan don", command=self.confirm_order)
        self.confirm_btn.pack(side=tk.LEFT, padx=5)

        self.send_kitchen_btn = ttk.Button(action_frame, text="Gui xuong bep", command=self.send_to_kitchen)
        self.send_kitchen_btn.pack(side=tk.LEFT)

        self.mark_served_btn = ttk.Button(action_frame, text="Da phuc vu (QR)", command=self.mark_served)
        self.mark_served_btn.pack(side=tk.LEFT, padx=5)

        self.cancel_btn = ttk.Button(action_frame, text="Huy don", command=self.cancel_order)
        self.cancel_btn.pack(side=tk.LEFT)

        self._set_buttons_state("disabled")

    # --- Data loading ---------------------------------------------------
    def refresh_orders(self, keep_selection=None):
        if self._refresh_in_progress:
            self._pending_refresh = True
            return

        if keep_selection is None and self.selected_order_data:
            keep_selection = self.selected_order_data.get("id")

        filter_label = self.status_filter_var.get()
        filter_value = FILTER_LABEL_TO_VALUE.get(filter_label, "all")

        status_filter = None if filter_value == "all" else filter_value
        normalized_filter = None
        if status_filter is not None:
            if isinstance(status_filter, (list, tuple, set)):
                normalized_filter = {str(item).lower() for item in status_filter}
            else:
                normalized_filter = str(status_filter).lower()

        self._refresh_in_progress = True
        refresh_stamp = datetime.now().strftime("%H:%M:%S")
        if hasattr(self, "refresh_button"):
            self.refresh_button["state"] = "disabled"

        try:
            all_orders = self.order_manager.get_all_orders()
        except Exception as exc:  # pylint: disable=broad-except
            self.last_refresh_var.set(f"Loi cap nhat luc {refresh_stamp}")
            messagebox.showerror("Loi", f"Khong the tai danh sach don hang:\n{exc}")
        else:
            current_ids = {order["id"] for order in all_orders}
            status_alerts = []
            new_orders = []
            if self._initial_orders_loaded:
                new_orders = [order for order in all_orders if order["id"] not in self._known_order_ids]
                for order in all_orders:
                    order_id = order["id"]
                    current_status = str(order.get("status") or "").lower()
                    previous_status = self._status_snapshot.get(order_id)
                    if previous_status and current_status != previous_status:
                        table = order.get("table_number") or "-"
                        if current_status == "processing":
                            status_alerts.append(f"Bep dang che bien don #{order_id} (Ban {table}).")
                        elif current_status == "completed":
                            status_alerts.append(f"Mon cho don #{order_id} (Ban {table}) da san sang. Moi den bep nhan.")
            self._known_order_ids = current_ids
            self._initial_orders_loaded = True
            self._status_snapshot = {
                order["id"]: str(order.get("status") or "").lower()
                for order in all_orders
            }

            def _matches_filter(order):
                if normalized_filter is None:
                    return True
                status_code = str(order.get("status") or "").lower()
                if isinstance(normalized_filter, set):
                    return status_code in normalized_filter
                return status_code == normalized_filter

            orders = [order for order in all_orders if _matches_filter(order)]
            new_ids = {order["id"] for order in new_orders}

            self.orders_data = {order["id"]: order for order in orders}
            self.orders_tree.delete(*self.orders_tree.get_children())

            for order in orders:
                order_id = order["id"]
                customer = order.get("customer_name") or "Khach le"
                status_code = order.get("status")
                status_text = STATUS_DISPLAY.get(status_code, status_code)
                total = as_float(order.get("total_price"))
                table = order.get("table_number") or "-"
                tags = ("new",) if order_id in new_ids else ()
                self.orders_tree.insert(
                    "",
                    tk.END,
                    iid=str(order_id),
                    values=(order_id, customer, status_text, f"{total:,.2f}", table),
                    tags=tags
                )

            if keep_selection and str(keep_selection) in self.orders_tree.get_children():
                self.orders_tree.selection_set(str(keep_selection))
                self.orders_tree.see(str(keep_selection))
            elif self.orders_tree.get_children():
                first = self.orders_tree.get_children()[0]
                self.orders_tree.selection_set(first)
                self.orders_tree.see(first)
            else:
                self.clear_details()

            if new_ids:
                self.after(8000, lambda ids=list(new_ids): self._clear_new_order_tags(ids))
            self.last_refresh_var.set(f"Cap nhat luc {refresh_stamp}")

            if new_orders:
                count = len(new_orders)
                if count == 1:
                    messagebox.showinfo("Thong bao", f"Don hang moi #{new_orders[0]['id']} vua duoc tao.")
                else:
                    messagebox.showinfo("Thong bao", f"Ban co {count} don hang moi.")
                try:
                    self.bell()
                except Exception:
                    pass

            for alert in status_alerts:
                messagebox.showinfo("Thong bao", alert)
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

    def load_order_details(self, order_id, order_data=None):
        order = order_data or self.order_manager.get_order(order_id)
        if not order:
            messagebox.showwarning("Thong bao", "Khong the tai chi tiet don hang.")
            return

        self.selected_order_data = order
        self.customer_name_var.set(order.get("customer_name") or "")
        self.table_number_var.set(order.get("table_number") or "")
        self.needs_assistance_var.set(bool(order.get("needs_assistance")))
        self.status_value_var.set(STATUS_DISPLAY.get(order.get("status"), order.get("status")))
        payment_status = order.get("payment_status") or "unpaid"
        self.payment_value_var.set("Da thanh toan" if payment_status == "paid" else "Chua thanh toan")
        total_price = as_float(order.get("total_price"))
        self.total_value_var.set(f"{total_price:,.2f} VND")

        self.note_text.delete("1.0", tk.END)
        if order.get("note"):
            self.note_text.insert(tk.END, order["note"])

        self.current_items = []
        for item in order.get("items", []):
            price = as_float(item.get("price"))
            self.current_items.append({
                "product_id": item.get("product_id"),
                "name": item.get("name") or f"San pham {item.get('product_id')}",
                "quantity": int(item.get("quantity") or 0),
                "price": price,
                "selected_options": item.get("selected_options")
            })

        self.update_items_tree()
        self._update_action_states()

    def clear_details(self):
        self.selected_order_data = None
        self.current_items = []
        self.customer_name_var.set("")
        self.table_number_var.set("")
        self.needs_assistance_var.set(False)
        self.status_value_var.set("---")
        self.payment_value_var.set("---")
        self.total_value_var.set("0.00 VND")
        self.note_text.delete("1.0", tk.END)
        self.items_tree.delete(*self.items_tree.get_children())
        self._set_buttons_state("disabled")

    # --- Items manipulation ---------------------------------------------
    def update_items_tree(self):
        self.items_tree.delete(*self.items_tree.get_children())
        total = 0.0
        for index, item in enumerate(self.current_items):
            line_total = item["price"] * item["quantity"]
            total += line_total
            self.items_tree.insert(
                "",
                tk.END,
                iid=str(index),
                values=(
                    item["product_id"],
                    item["name"],
                    item["quantity"],
                    f"{item['price']:.2f}",
                    f"{line_total:.2f}"
                )
            )
        self.total_value_var.set(f"{total:,.2f} VND")

    def add_item(self):
        if not self.selected_order_data:
            messagebox.showinfo("Thong bao", "Hay chon mot don hang truoc.")
            return

        try:
            product_id = simpledialog.askinteger("Them mon", "Nhap ID san pham:", minvalue=1)
            if not product_id:
                return
            quantity = simpledialog.askinteger("So luong", "Nhap so luong:", initialvalue=1, minvalue=1)
            if not quantity:
                return

            self.order_manager.ensure_connection()
            self.order_manager.db.cursor.execute(
                "SELECT name, price FROM products WHERE id = %s",
                (product_id,)
            )
            result = self.order_manager.db.cursor.fetchone()
            if not result:
                messagebox.showerror("Loi", "Khong tim thay san pham.")
                return

            name, price = result[0], as_float(result[1])

            for item in self.current_items:
                if item["product_id"] == product_id:
                    item["quantity"] += quantity
                    break
            else:
                self.current_items.append({
                    "product_id": product_id,
                    "name": name,
                    "quantity": quantity,
                    "price": price,
                    "selected_options": None
                })

            self.push_item_updates()
        except Exception as exc:  # pylint: disable=broad-except
            messagebox.showerror("Loi", f"Khong the them mon: {exc}")

    def remove_item(self):
        if not self.selected_order_data:
            messagebox.showinfo("Thong bao", "Hay chon mot don hang truoc.")
            return
        selection = self.items_tree.selection()
        if not selection:
            messagebox.showinfo("Thong bao", "Hay chon mon can xoa.")
            return
        index = int(selection[0])
        del self.current_items[index]
        self.push_item_updates()

    def change_quantity(self):
        if not self.selected_order_data:
            messagebox.showinfo("Thong bao", "Hay chon mot don hang truoc.")
            return
        selection = self.items_tree.selection()
        if not selection:
            messagebox.showinfo("Thong bao", "Hay chon mon can chinh sua.")
            return
        index = int(selection[0])
        current_item = self.current_items[index]
        new_quantity = simpledialog.askinteger(
            "Doi so luong",
            f"So luong moi cho {current_item['name']}:",
            initialvalue=current_item["quantity"],
            minvalue=1
        )
        if not new_quantity:
            return
        self.current_items[index]["quantity"] = new_quantity
        self.push_item_updates()

    def push_item_updates(self):
        if not self.current_items:
            messagebox.showwarning("Canh bao", "Don hang phai co it nhat mot mon an.")
            return

        order_id = self.selected_order_data["id"]
        items_payload = [
            {
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "selected_options": item.get("selected_options")
            }
            for item in self.current_items
        ]

        result = self.order_manager.update_order_details(order_id, items=items_payload)
        if result is None:
            messagebox.showerror("Loi", "Khong the cap nhat mon an cho don hang.")
            self.load_order_details(order_id)
            return

        updated = self.order_manager.get_order(order_id)
        self.load_order_details(order_id, updated)
        self.refresh_orders(keep_selection=order_id)

    # --- Order actions --------------------------------------------------
    def save_details(self):
        if not self.selected_order_data:
            messagebox.showinfo("Thong bao", "Hay chon mot don hang truoc.")
            return

        order_id = self.selected_order_data["id"]
        note = self.note_text.get("1.0", tk.END).strip()
        table_number = self.table_number_var.get().strip() or None
        customer_name = self.customer_name_var.get().strip() or None
        needs_assistance = self.needs_assistance_var.get()

        result = self.order_manager.update_order_details(
            order_id,
            items=None,
            note=note or None,
            table_number=table_number,
            customer_name=customer_name,
            needs_assistance=needs_assistance
        )

        if result is None:
            messagebox.showerror("Loi", "Khong the luu thong tin don hang.")
            return

        messagebox.showinfo("Thanh cong", "Da luu thong tin don hang.")
        self.load_order_details(order_id)
        self.refresh_orders(keep_selection=order_id)

    def confirm_order(self):
        if not self.selected_order_data:
            messagebox.showinfo("Thong bao", "Hay chon mot don hang truoc.")
            return

        current_status = self.selected_order_data.get("status")
        if current_status != "pending":
            status_label = STATUS_DISPLAY.get("pending", "pending")
            messagebox.showwarning("Khong hop le", f"Chi thuc hien duoc khi don o trang thai: {status_label}.")
            return

        order_id = self.selected_order_data["id"]
        if not self.order_manager.update_order_status(order_id, "confirmed"):
            messagebox.showerror("Loi", "Khong the xac nhan don hang.")
            return

        # Immediately hand off to the kitchen once staff confirms with the customer
        if not self.order_manager.update_order_status(order_id, "sent_to_kitchen"):
            messagebox.showwarning(
                "Thong bao",
                "Don hang da duoc xac nhan nhung chua gui xuong bep. Hay thu nut 'Gui bep'."
            )
            self.load_order_details(order_id)
            self.refresh_orders(keep_selection=order_id)
            return

        messagebox.showinfo("Thanh cong", "Don hang da xac nhan va gui xuong bep.")
        self.load_order_details(order_id)
        self.refresh_orders(keep_selection=order_id)

    def send_to_kitchen(self):
        self._transition_order("confirmed", "sent_to_kitchen", success_message="Da gui don xuong bep.")

    def mark_served(self):
        if not self.selected_order_data:
            messagebox.showinfo("Thong bao", "Hay chon mot don hang truoc.")
            return
        order_id = self.selected_order_data["id"]
        qr_data = self.order_manager.mark_order_served(order_id)
        if qr_data is None:
            messagebox.showerror("Loi", "Khong the danh dau don hang da phuc vu.")
            return
        self.show_qr_popup(order_id, qr_data)
        self.load_order_details(order_id)
        self.refresh_orders(keep_selection=order_id)

    def cancel_order(self):
        if not self.selected_order_data:
            messagebox.showinfo("Thong bao", "Hay chon mot don hang truoc.")
            return
        if not messagebox.askyesno("Xac nhan", "Ban chac chan muon huy don hang nay?"):
            return
        order_id = self.selected_order_data["id"]
        if not self.order_manager.update_order_status(order_id, "cancelled"):
            messagebox.showerror("Loi", "Khong the huy don hang.")
            return
        messagebox.showinfo("Thanh cong", "Don hang da duoc huy.")
        self.load_order_details(order_id)
        self.refresh_orders(keep_selection=order_id)

    def _transition_order(self, required_status, target_status, success_message):
        if not self.selected_order_data:
            messagebox.showinfo("Thong bao", "Hay chon mot don hang truoc.")
            return
        current_status = self.selected_order_data.get("status")
        if current_status != required_status:
            status_label = STATUS_DISPLAY.get(required_status, required_status)
            messagebox.showwarning("Khong hop le", f"Chi thuc hien duoc khi don o trang thai: {status_label}.")
            return
        order_id = self.selected_order_data["id"]
        if not self.order_manager.update_order_status(order_id, target_status):
            messagebox.showerror("Loi", "Khong the cap nhat trang thai don hang.")
            return
        messagebox.showinfo("Thanh cong", success_message)
        self.load_order_details(order_id)
        self.refresh_orders(keep_selection=order_id)

    # --- QR rendering ---------------------------------------------------
    def show_qr_popup(self, order_id, qr_data):
        popup = tk.Toplevel(self)
        popup.title(f"QR Thanh toan - Don #{order_id}")
        popup.grab_set()

        payload = {}
        try:
            payload = json.loads(qr_data)
        except json.JSONDecodeError:
            payload = {"order_id": order_id, "amount": qr_data}

        qr_img = qrcode.make(qr_data)
        qr_img = qr_img.resize((250, 250))
        photo = ImageTk.PhotoImage(qr_img)
        self.qr_images.append(photo)

        ttk.Label(popup, text=f"Don hang #{order_id}", font=("TkDefaultFont", 12, "bold")).pack(pady=(10, 5))
        ttk.Label(popup, image=photo).pack(pady=5)

        amount = payload.get("amount")
        if amount is not None:
            ttk.Label(popup, text=f"Thanh toan: {as_float(amount):,.2f} VND").pack(pady=(0, 10))

        ttk.Label(popup, text="Quet ma de thanh toan").pack(pady=(0, 10))
        ttk.Button(popup, text="Dong", command=popup.destroy).pack(pady=(0, 15))

    # --- Helpers --------------------------------------------------------
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
        keep_id = None
        if self.selected_order_data:
            keep_id = self.selected_order_data.get("id")
        self.refresh_orders(keep_selection=keep_id)

    def _clear_new_order_tags(self, order_ids):
        if not self.orders_tree:
            return
        for order_id in order_ids:
            iid = str(order_id)
            if self.orders_tree.exists(iid):
                tags = tuple(tag for tag in self.orders_tree.item(iid, "tags") if tag != "new")
                self.orders_tree.item(iid, tags=tags)

    def _set_buttons_state(self, state):
        for button in (
            self.save_details_btn,
            self.confirm_btn,
            self.send_kitchen_btn,
            self.mark_served_btn,
            self.cancel_btn,
            self.add_item_btn,
            self.remove_item_btn,
            self.change_qty_btn,
        ):
            button["state"] = state

    def _update_action_states(self):
        if not self.selected_order_data:
            self._set_buttons_state("disabled")
            return

        status_code = self.selected_order_data.get("status")
        editable = status_code in {"pending", "confirmed"}

        self.add_item_btn["state"] = "normal" if editable else "disabled"
        self.remove_item_btn["state"] = "normal" if editable else "disabled"
        self.change_qty_btn["state"] = "normal" if editable else "disabled"
        self.save_details_btn["state"] = "normal"

        self.confirm_btn["state"] = "normal" if status_code == "pending" else "disabled"
        self.send_kitchen_btn["state"] = "normal" if status_code == "confirmed" else "disabled"
        self.mark_served_btn["state"] = "normal" if status_code == "completed" else "disabled"
        self.cancel_btn["state"] = "normal" if status_code not in {"cancelled", "served"} else "disabled"


def run():
    app = StaffApp()
    app.mainloop()


if __name__ == "__main__":
    run()
