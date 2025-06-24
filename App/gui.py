import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from PIL import Image, ImageTk
import shutil
import os
from datetime import datetime
from product_manager import ProductManager
from order_manager import OrderManager

class StoreGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Hệ Thống Quản Lý Cửa Hàng")
        self.root.geometry("1400x800")

        # Create images directory if not exists
        self.images_dir = "images"
        if not os.path.exists(self.images_dir):
            os.makedirs(self.images_dir)

        self.product_manager = ProductManager()
        self.order_manager = OrderManager()

        self.selected_image_path = None
        self.current_product_id = None  # For editing
        self.editing_mode = False

        # Main container with tab control
        self.tab_control = ttk.Notebook(root)
        self.tab_control.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Product management tab
        self.product_tab = ttk.Frame(self.tab_control)
        self.tab_control.add(self.product_tab, text="Quản Lý Sản Phẩm")

        # Order management tab
        self.order_tab = ttk.Frame(self.tab_control)
        self.tab_control.add(self.order_tab, text="Quản Lý Đơn Hàng")

        # Setup product management UI in product_tab
        self._setup_left_panel()
        self._setup_center_panel()
        self._setup_right_panel()

        # Setup order management UI in order_tab
        self._setup_order_ui()

        # Load initial data
        self.load_products()
        self.load_orders()

    # Existing product management UI setup methods, but adjusted to use self.product_tab as parent
    def _setup_left_panel(self):
        self.left_panel = ttk.Frame(self.product_tab)
        self.left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)

        # Category filter
        ttk.Label(self.left_panel, text="Lọc Theo Danh Mục", font=('Helvetica', 12, 'bold')).pack(pady=10)
        self.category_var = tk.StringVar(value="all")
        categories = [
            ("Tất cả", "all"),
            ("Bánh kem", "cake"),
            ("Đồ ăn", "food"),
            ("Đồ uống", "drink")
        ]

        for text, value in categories:
            ttk.Radiobutton(
                self.left_panel,
                text=text,
                value=value,
                variable=self.category_var,
                command=self.load_products
            ).pack(pady=2)

        # Search
        ttk.Label(self.left_panel, text="Tìm Kiếm", font=('Helvetica', 12, 'bold')).pack(pady=(20, 5))
        self.search_var = tk.StringVar()
        self.search_var.trace('w', lambda *args: self.load_products())
        ttk.Entry(self.left_panel, textvariable=self.search_var).pack(padx=5, fill=tk.X)

        # Product form frame
        form_frame = ttk.LabelFrame(self.left_panel, text="Thông Tin Sản Phẩm", padding=10)
        form_frame.pack(fill=tk.X, padx=5, pady=10, expand=True)

        # Product form fields
        self.product_fields = {
            'name': tk.StringVar(),
            'price': tk.StringVar(),
            'quantity': tk.StringVar(),
            'description': tk.StringVar(),
        }

        # Add form fields
        field_labels = [
            ("Tên sản phẩm:", "name"),
            ("Giá (VNĐ):", "price"),
            ("Số lượng:", "quantity"),
            ("Mô tả:", "description"),
        ]

        for label, key in field_labels:
            ttk.Label(form_frame, text=label).pack(anchor=tk.W)
            ttk.Entry(
                form_frame,
                textvariable=self.product_fields[key]
            ).pack(fill=tk.X, pady=(0, 10))

        # Image upload
        ttk.Label(form_frame, text="Hình ảnh:").pack(anchor=tk.W)
        ttk.Button(
            form_frame,
            text="Chọn ảnh",
            command=self.choose_image
        ).pack(fill=tk.X, pady=(0, 5))

        # Image preview in form
        self.form_preview = ttk.Label(form_frame)
        self.form_preview.pack(pady=(0, 10))

        # Category selection
        ttk.Label(form_frame, text="Danh mục:").pack(anchor=tk.W)
        self.new_category_var = tk.StringVar()
        category_combo = ttk.Combobox(
            form_frame,
            textvariable=self.new_category_var,
            values=["Bánh kem", "Đồ ăn", "Đồ uống"],
            state="readonly"
        )
        category_combo.pack(fill=tk.X, pady=(0, 10))

        # Buttons frame
        buttons_frame = ttk.Frame(form_frame)
        buttons_frame.pack(fill=tk.X, pady=10)

        # Add/Update button (will change text based on mode)
        self.submit_btn = ttk.Button(
            buttons_frame,
            text="Thêm Sản Phẩm",
            command=self.submit_product
        )
        self.submit_btn.pack(side=tk.LEFT, expand=True, padx=2)

        # Cancel button (for editing mode)
        self.cancel_btn = ttk.Button(
            buttons_frame,
            text="Hủy",
            command=self.cancel_edit,
            state=tk.DISABLED
        )
        self.cancel_btn.pack(side=tk.LEFT, expand=True, padx=2)

    def _setup_center_panel(self):
        self.center_panel = ttk.Frame(self.product_tab)
        self.center_panel.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Products list
        columns = ("ID", "Tên", "Giá", "Số lượng", "Danh mục", "Mô tả")
        self.tree = ttk.Treeview(
            self.center_panel,
            columns=columns,
            show="headings"
        )

        # Define headings
        for col in columns:
            self.tree.heading(col, text=col)

        # Define columns
        self.tree.column("ID", width=50)
        self.tree.column("Tên", width=200)
        self.tree.column("Giá", width=100)
        self.tree.column("Số lượng", width=80)
        self.tree.column("Danh mục", width=100)
        self.tree.column("Mô tả", width=200)

        # Bind selection event
        self.tree.bind('<<TreeviewSelect>>', self.on_select_product)

        # Scrollbar
        scrollbar = ttk.Scrollbar(self.center_panel, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        # Action buttons
        btn_frame = ttk.Frame(self.center_panel)

        ttk.Button(
            btn_frame,
            text="Sửa",
            command=self.edit_product
        ).pack(side=tk.LEFT, padx=5)

        ttk.Button(
            btn_frame,
            text="Xóa",
            command=self.delete_product
        ).pack(side=tk.LEFT, padx=5)

        # Pack widgets
        self.tree.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        btn_frame.pack(side=tk.BOTTOM, pady=10)

    def _setup_right_panel(self):
        self.right_panel = ttk.Frame(self.product_tab, width=300)
        self.right_panel.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)

        # Image preview
        self.preview_label = ttk.Label(self.right_panel, text="Hình ảnh sản phẩm")
        self.preview_label.pack(pady=10)

        self.image_preview = ttk.Label(self.right_panel)
        self.image_preview.pack(expand=True)

    def show_product_image(self, image_path):
        if image_path and os.path.exists(image_path):
            try:
                # Load and resize image for preview
                image = Image.open(image_path)
                # Calculate size to maintain aspect ratio
                display_size = (280, 280)
                image.thumbnail(display_size)
                photo = ImageTk.PhotoImage(image)
                self.image_preview.configure(image=photo)
                self.image_preview.image = photo
            except Exception as e:
                self.image_preview.configure(image='')
                print(f"Error loading image: {e}")
        else:
            self.image_preview.configure(image='')

    def choose_image(self):
        file_types = [
            ('Image files', '*.png *.jpg *.jpeg *.gif *.bmp'),
            ('All files', '*.*')
        ]
        filename = filedialog.askopenfilename(
            title="Chọn hình ảnh",
            filetypes=file_types
        )

        if filename:
            self.selected_image_path = filename
            # Show preview in form
            try:
                image = Image.open(filename)
                image.thumbnail((100, 100))
                photo = ImageTk.PhotoImage(image)
                self.form_preview.configure(image=photo)
                self.form_preview.image = photo

                # Also update main preview
                self.show_product_image(filename)
            except Exception as e:
                messagebox.showerror("Lỗi", f"Không thể tải ảnh: {str(e)}")

    def on_select_product(self, event):
        selected = self.tree.selection()
        if selected:
            item = selected[0]
            product_id = self.tree.item(item)['values'][0]
            product = self.product_manager.get_product(product_id)
            if product and product.get('image_url'):
                self.show_product_image(product['image_url'])

    def edit_product(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn sản phẩm để sửa!")
            return

        # Get product details
        item = selected[0]
        product_id = self.tree.item(item)['values'][0]
        product = self.product_manager.get_product(product_id)

        if product:
            # Enter edit mode
            self.editing_mode = True
            self.current_product_id = product_id

            # Populate form
            self.product_fields['name'].set(product['name'])
            self.product_fields['price'].set(str(product['price']))
            self.product_fields['quantity'].set(str(product['quantity']))
            self.product_fields['description'].set(product['description'] or '')

            category_display = {
                'cake': 'Bánh kem',
                'food': 'Đồ ăn',
                'drink': 'Đồ uống'
            }
            self.new_category_var.set(category_display.get(product['category']))

            # Show current image
            if product['image_url']:
                self.selected_image_path = product['image_url']
                self.show_product_image(product['image_url'])

            # Update buttons
            self.submit_btn.configure(text="Cập Nhật")
            self.cancel_btn.configure(state=tk.NORMAL)

    def cancel_edit(self):
        self.editing_mode = False
        self.current_product_id = None
        self.clear_form()
        self.submit_btn.configure(text="Thêm Sản Phẩm")
        self.cancel_btn.configure(state=tk.DISABLED)

    def submit_product(self):
        try:
            # Get values from form
            name = self.product_fields['name'].get().strip()
            price_str = self.product_fields['price'].get().strip()
            quantity_str = self.product_fields['quantity'].get().strip()
            description = self.product_fields['description'].get().strip()
            category_display = self.new_category_var.get()

            # Extract attributes using ProductManager
            attributes = self.product_manager._extract_attributes_from_text(name, description)

            # Validate inputs
            if not name:
                messagebox.showerror("Lỗi", "Vui lòng nhập tên sản phẩm!")
                return

            try:
                price = float(price_str)
                if price < 0:
                    raise ValueError()
            except ValueError:
                messagebox.showerror("Lỗi", "Vui lòng nhập giá hợp lệ!")
                return

            try:
                quantity = int(quantity_str)
                if quantity < 0:
                    raise ValueError()
            except ValueError:
                messagebox.showerror("Lỗi", "Vui lòng nhập số lượng hợp lệ!")
                return

            if not category_display:
                messagebox.showerror("Lỗi", "Vui lòng chọn danh mục!")
                return

            # Convert display category to database category
            category_map = {
                "Bánh kem": "cake",
                "Đồ ăn": "food",
                "Đồ uống": "drink"
            }
            category = category_map.get(category_display)

            # Save/Update image if selected
            image_path = None
            if self.selected_image_path:
                if not self.selected_image_path.startswith(self.images_dir):
                    image_path = self.save_uploaded_image(self.selected_image_path)
                else:
                    image_path = self.selected_image_path

            if self.editing_mode:
                # Update existing product
                success = self.product_manager.update_product(
                    self.current_product_id,
                    name=name,
                    price=price,
                    category=category,
                    quantity=quantity,
                    description=description,
                    image_url=image_path
                )

                if success:
                    messagebox.showinfo("Thành công", "Đã cập nhật sản phẩm!")
                    self.cancel_edit()
                else:
                    messagebox.showerror("Lỗi", "Không thể cập nhật sản phẩm!")
            else:
                # Add new product
                product_id = self.product_manager.add_product(
                    name=name,
                    price=price,
                    category=category,
                    quantity=quantity,
                    description=description,
                    image_url=image_path
                )

                if product_id:
                    messagebox.showinfo("Thành công", "Đã thêm sản phẩm!")
                    self.clear_form()
                else:
                    messagebox.showerror("Lỗi", "Không thể thêm sản phẩm!")

            self.load_products()

        except Exception as e:
            messagebox.showerror("Lỗi", f"Đã xảy ra lỗi: {str(e)}")

    def save_uploaded_image(self, source_path):
        if not source_path:
            return None

        try:
            # Create a unique filename using timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_ext = os.path.splitext(source_path)[1]
            filename = f"product_{timestamp}{file_ext}"
            destination = os.path.join(self.images_dir, filename)

            # Copy the file
            shutil.copy2(source_path, destination)
            return destination

        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể lưu ảnh: {str(e)}")
            return None

    def clear_form(self):
        # Clear all form fields
        for var in self.product_fields.values():
            var.set("")
        self.new_category_var.set("")
        self.selected_image_path = None
        self.form_preview.configure(image='')
        self.image_preview.configure(image='')

    def load_products(self):
        # Clear current items
        for item in self.tree.get_children():
            self.tree.delete(item)

        # Get products based on category and search
        category = self.category_var.get()
        search = self.search_var.get()

        if search:
            products = self.product_manager.search_products(search)
        elif category != "all":
            products = self.product_manager.get_all_products(category)
        else:
            products = self.product_manager.get_all_products()

        # Category display mapping
        category_display = {
            "cake": "Bánh kem",
            "food": "Đồ ăn",
            "drink": "Đồ uống"
        }

        # Insert products into tree
        for product in products:
            self.tree.insert(
                "",
                tk.END,
                values=(
                    product['id'],
                    product['name'],
                    f"{int(product['price']):,d} VNĐ",
                    product['quantity'],
                    category_display.get(product['category'], product['category']),
                    product['description'] or ""
                )
            )

    def delete_product(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn sản phẩm để xóa!")
            return

        if messagebox.askyesno("Xác nhận", "Bạn có chắc muốn xóa sản phẩm này?"):
            for item in selected:
                product_id = self.tree.item(item)['values'][0]
                if self.product_manager.delete_product(product_id):
                    self.tree.delete(item)
                    # Clear image preview if deleted product was selected
                    if product_id == self.current_product_id:
                        self.image_preview.configure(image='')
                else:
                    messagebox.showerror("Lỗi", f"Không thể xóa sản phẩm {product_id}")

    # New order management UI setup
    def _setup_order_ui(self):
        self.order_left_panel = ttk.Frame(self.order_tab)
        self.order_left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)

        self.order_center_panel = ttk.Frame(self.order_tab)
        self.order_center_panel.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)

        self.order_right_panel = ttk.Frame(self.order_tab, width=300)
        self.order_right_panel.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)

        # Order list treeview
        columns = ("ID", "Khách hàng", "Tổng tiền", "Trạng thái")
        self.order_tree = ttk.Treeview(
            self.order_center_panel,
            columns=columns,
            show="headings"
        )

        for col in columns:
            self.order_tree.heading(col, text=col)

        self.order_tree.column("ID", width=50)
        self.order_tree.column("Khách hàng", width=150)
        self.order_tree.column("Tổng tiền", width=100)
        self.order_tree.column("Trạng thái", width=100)

        self.order_tree.bind('<<TreeviewSelect>>', self.on_select_order)

        scrollbar = ttk.Scrollbar(self.order_center_panel, orient=tk.VERTICAL, command=self.order_tree.yview)
        self.order_tree.configure(yscrollcommand=scrollbar.set)

        btn_frame = ttk.Frame(self.order_center_panel)

        ttk.Button(
            btn_frame,
            text="Cập Nhật Trạng Thái",
            command=self.update_order_status
        ).pack(side=tk.LEFT, padx=5)

        ttk.Button(
            btn_frame,
            text="Xóa Đơn Hàng",
            command=self.delete_order
        ).pack(side=tk.LEFT, padx=5)

        self.order_tree.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        btn_frame.pack(side=tk.BOTTOM, pady=10)

        # Order detail display
        self.order_detail_label = ttk.Label(self.order_right_panel, text="Chi tiết đơn hàng")
        self.order_detail_label.pack(pady=10)

        self.order_detail_text = tk.Text(self.order_right_panel, width=40, height=30, state=tk.DISABLED)
        self.order_detail_text.pack(expand=True)

    def load_orders(self):
        # Clear current items
        for item in self.order_tree.get_children():
            self.order_tree.delete(item)

        orders = self.order_manager.get_all_orders()

        for order in orders:
            self.order_tree.insert(
                "",
                tk.END,
                values=(
                    order['id'],
                    order['customer_name'],
                    f"{order['total_price']:,} VNĐ",
                    order['status']
                )
            )

    def on_select_order(self, event):
        selected = self.order_tree.selection()
        if not selected:
            return

        item = selected[0]
        order_id = self.order_tree.item(item)['values'][0]
        order = self.order_manager.get_order(order_id)

        if order:
            self.order_detail_text.configure(state=tk.NORMAL)
            self.order_detail_text.delete('1.0', tk.END)

            detail_str = f"ID: {order['id']}\n"
            detail_str += f"Khách hàng: {order['customer_name']}\n"
            detail_str += f"Tổng tiền: {order['total_price']:,} VNĐ\n"
            detail_str += f"Trạng thái: {order['status']}\n"
            detail_str += "Sản phẩm:\n"

            for item in order.get('items', []):
                detail_str += f" - {item['name']} (ID: {item['product_id']}), Số lượng: {item['quantity']}\n"

            self.order_detail_text.insert(tk.END, detail_str)
            self.order_detail_text.configure(state=tk.DISABLED)

    def update_order_status(self):
        selected = self.order_tree.selection()
        if not selected:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn đơn hàng để cập nhật trạng thái!")
            return

        item = selected[0]
        order_id = self.order_tree.item(item)['values'][0]

        # Prompt for new status
        status_options = ['pending', 'completed', 'cancelled']
        new_status = tk.simpledialog.askstring("Cập Nhật Trạng Thái", f"Nhập trạng thái mới ({', '.join(status_options)}):")

        if new_status not in status_options:
            messagebox.showerror("Lỗi", "Trạng thái không hợp lệ!")
            return

        success = self.order_manager.update_order_status(order_id, new_status)
        if success:
            messagebox.showinfo("Thành công", "Đã cập nhật trạng thái đơn hàng!")
            self.load_orders()
        else:
            messagebox.showerror("Lỗi", "Không thể cập nhật trạng thái đơn hàng!")

    def delete_order(self):
        selected = self.order_tree.selection()
        if not selected:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn đơn hàng để xóa!")
            return

        if messagebox.askyesno("Xác nhận", "Bạn có chắc muốn xóa đơn hàng này?"):
            for item in selected:
                order_id = self.order_tree.item(item)['values'][0]
                if self.order_manager.delete_order(order_id):
                    self.order_tree.delete(item)
                    self.order_detail_text.configure(state=tk.NORMAL)
                    self.order_detail_text.delete('1.0', tk.END)
                    self.order_detail_text.configure(state=tk.DISABLED)
                else:
                    messagebox.showerror("Lỗi", f"Không thể xóa đơn hàng {order_id}")

def main():
    root = tk.Tk()
    app = StoreGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
