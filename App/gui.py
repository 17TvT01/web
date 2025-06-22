import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from PIL import Image, ImageTk
from product_manager import ProductManager

class StoreGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Store Management System")
        self.root.geometry("1200x700")
        
        self.product_manager = ProductManager()
        
        # Main container
        self.main_container = ttk.PanedWindow(root, orient=tk.HORIZONTAL)
        self.main_container.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Left panel (Controls)
        self.left_panel = ttk.Frame(self.main_container)
        self.main_container.add(self.left_panel)
        
        # Right panel (Product list)
        self.right_panel = ttk.Frame(self.main_container)
        self.main_container.add(self.right_panel)
        
        self._setup_left_panel()
        self._setup_right_panel()
        self.load_products()

    def _setup_left_panel(self):
        # Bộ lọc danh mục
        ttk.Label(self.left_panel, text="Lọc theo danh mục", font=('Helvetica', 12, 'bold')).pack(pady=10)
        self.category_var = tk.StringVar(value="all")
        categories = [("Tất cả", "all"), ("Bánh ngọt", "cake"), ("Đồ ăn", "food"), ("Đồ uống", "drink")]
        
        for text, value in categories:
            ttk.Radiobutton(
                self.left_panel, 
                text=text, 
                value=value, 
                variable=self.category_var,
                command=self.load_products
            ).pack(pady=2)

        # Tìm kiếm
        ttk.Label(self.left_panel, text="Tìm kiếm", font=('Helvetica', 12, 'bold')).pack(pady=(20,5))
        self.search_var = tk.StringVar()
        self.search_var.trace('w', lambda *args: self.load_products())
        ttk.Entry(self.left_panel, textvariable=self.search_var).pack(padx=5, fill=tk.X)

        # Thêm sản phẩm mới
        ttk.Label(self.left_panel, text="Thêm sản phẩm mới", font=('Helvetica', 12, 'bold')).pack(pady=(20,10))
        
        fields = [
            ("Tên:", "name"),
            ("Giá:", "price"),
            ("Số lượng:", "quantity"),
            ("Mô tả:", "description"),
            ("Đường dẫn ảnh:", "image_url")
        ]
        
        self.new_product_vars = {}
        for label, key in fields:
            ttk.Label(self.left_panel, text=label).pack(anchor=tk.W, padx=5)
            self.new_product_vars[key] = tk.StringVar()
            if key == "image_url":
                self.image_path_label = ttk.Label(self.left_panel, textvariable=self.new_product_vars['image_url'])
                self.image_path_label.pack(anchor=tk.W, padx=5)
                upload_button = ttk.Button(self.left_panel, text="Tải ảnh lên", command=self.select_image_file)
                upload_button.pack(padx=5, fill=tk.X, pady=(0,10))
            else:
                widget = ttk.Entry(self.left_panel, textvariable=self.new_product_vars[key])
                widget.pack(padx=5, fill=tk.X, pady=(0,10))

        # Chọn danh mục cho sản phẩm mới
        ttk.Label(self.left_panel, text="Danh mục:").pack(anchor=tk.W, padx=5)
        self.new_product_category_var = tk.StringVar()
        self.new_product_category = ttk.Combobox(
            self.left_panel, 
            textvariable=self.new_product_category_var,
            values=["cake", "food", "drink"],
            state="readonly"
        )
        self.new_product_category.pack(padx=5, fill=tk.X, pady=(0,10))
        
        # Nút thêm sản phẩm
        ttk.Button(
            self.left_panel, 
            text="Thêm sản phẩm", 
            command=self.add_product
        ).pack(pady=10, padx=5, fill=tk.X)

    def _setup_right_panel(self):
        # Danh sách sản phẩm
        self.tree = ttk.Treeview(
            self.right_panel,
            columns=("ID", "Tên", "Giá", "Số lượng", "Danh mục", "Mô tả", "Ảnh"),
            show="headings"
        )
        
        # Định nghĩa tiêu đề cột
        self.tree.heading("ID", text="ID")
        self.tree.heading("Tên", text="Tên")
        self.tree.heading("Giá", text="Giá")
        self.tree.heading("Số lượng", text="Số lượng")
        self.tree.heading("Danh mục", text="Danh mục")
        self.tree.heading("Mô tả", text="Mô tả")
        self.tree.heading("Ảnh", text="Ảnh")
        
        # Định nghĩa cột
        self.tree.column("ID", width=50)
        self.tree.column("Tên", width=150)
        self.tree.column("Giá", width=80)
        self.tree.column("Số lượng", width=80)
        self.tree.column("Danh mục", width=100)
        self.tree.column("Mô tả", width=250)
        self.tree.column("Ảnh", width=100)
        self.tree.image_references = {} # To store PhotoImage references
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(self.right_panel, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        # Nút xóa
        self.delete_btn = ttk.Button(
            self.right_panel,
            text="Xóa đã chọn",
            command=self.delete_product
        )
        
        # Pack widgets
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.delete_btn.pack(side=tk.BOTTOM, pady=10)

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
        
        # Insert products into tree
        for product in products:
            item_id = self.tree.insert(
                    "",
                    tk.END,
                    values=(
                        product['id'],
                        product['name'],
                        f"{product['price']:.2f} VNĐ",
                        product['quantity'],
                        product['category'],
                        product['description'] or "",
                        ""
                    )
            )
            if product['image_url']:
                self._display_image_in_treeview(product['image_url'], item_id)

    def add_product(self):
        print("DEBUG: add_product method in GUI called.")
        try:
            # Get values from form
            name = self.new_product_vars['name'].get()
            price = float(self.new_product_vars['price'].get())
            quantity = int(self.new_product_vars['quantity'].get())
            description = self.new_product_vars['description'].get()
            image_url = self.new_product_vars['image_url'].get()
            category = self.new_product_category_var.get()


            

            if not all([name, price, quantity, category]):
                messagebox.showerror("Lỗi", "Tên, giá, số lượng và danh mục là bắt buộc!")
                return
            
            # Add product
            product_id = self.product_manager.add_product(
                name, price, quantity, category, description, image_url
            )
            
            if product_id:
                messagebox.showinfo("Thành công", "Sản phẩm đã được thêm thành công!")
                # Xóa form
                for key, var in self.new_product_vars.items():
                    if key not in ['image_url', 'quantity']:
                        var.set('')
                self.new_product_vars['quantity'].set('')
                self.new_product_vars['image_url'].set("")
                self.image_path_label.config(text="Chưa chọn ảnh")
                self.new_product_category.set('')
                # Reload products
                self.load_products()
            else:
                messagebox.showerror("Lỗi", "Không thể thêm sản phẩm!")
        except Exception as e:
            messagebox.showerror("Lỗi", f"Đã xảy ra lỗi: {e}")

    def _display_image_in_treeview(self, image_path, item_id):
        if image_path:
            try:
                img = Image.open(image_path)
                img = img.resize((50, 50), Image.LANCZOS)
                photo = ImageTk.PhotoImage(img)
                self.tree.item(item_id, image=photo)
                self.tree.image_references[item_id] = photo  # Store reference
            except FileNotFoundError:
                print(f"Image file not found: {image_path}")
            except Exception as e:
                print(f"Error loading image {image_path}: {e}")

    def select_image_file(self):
        file_path = filedialog.askopenfilename(
            title="Chọn ảnh sản phẩm",
            filetypes=[("Image files", "*.png *.jpg *.jpeg *.gif *.bmp")]
        )
        if file_path:
            self.new_product_vars['image_url'].set(file_path)
            print(f"DEBUG: Image URL set to: {file_path}")
            self.image_path_label.config(text=file_path)

    def select_image_file(self):
        file_path = filedialog.askopenfilename(
            title="Chọn tệp ảnh",
            filetypes=[("Tệp ảnh", "*.png *.jpg *.jpeg *.gif *.bmp")]
        )
        if file_path:
            self.new_product_vars['image_url'] = file_path
            self.image_path_label.config(text=file_path)

    def delete_product(self):
        selected = self.tree.selection()
        if not selected:
            messagebox.showwarning("Warning", "Please select a product to delete!")
            return
            
        if messagebox.askyesno("Confirm", "Are you sure you want to delete this product?"):
            for item in selected:
                product_id = self.tree.item(item)['values'][0]
                if self.product_manager.delete_product(product_id):
                    self.tree.delete(item)
                else:
                    messagebox.showerror("Error", f"Failed to delete product {product_id}")

def main():
    root = tk.Tk()
    app = StoreGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()