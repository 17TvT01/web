import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from PIL import Image, ImageTk
import shutil
import os
from datetime import datetime
from product_manager import ProductManager

class StoreGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Hệ Thống Quản Lý Cửa Hàng")
        self.root.geometry("1200x700")
        
        # Create images directory if not exists
        self.images_dir = "images"
        if not os.path.exists(self.images_dir):
            os.makedirs(self.images_dir)
        
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
        ttk.Label(self.left_panel, text="Tìm Kiếm", font=('Helvetica', 12, 'bold')).pack(pady=(20,5))
        self.search_var = tk.StringVar()
        self.search_var.trace('w', lambda *args: self.load_products())
        ttk.Entry(self.left_panel, textvariable=self.search_var).pack(padx=5, fill=tk.X)

        # Add product form
        ttk.Label(self.left_panel, text="Thêm Sản Phẩm Mới", font=('Helvetica', 12, 'bold')).pack(pady=(20,10))
        
        # Create StringVar for each field
        self.product_fields = {
            'name': tk.StringVar(),
            'price': tk.StringVar(),
            'description': tk.StringVar(),
        }
        self.selected_image_path = None
        self.image_preview_label = None
        
        # Add form fields
        field_labels = [
            ("Tên sản phẩm:", "name"),
            ("Giá (VNĐ):", "price"),
            ("Mô tả:", "description"),
        ]
        
        for label, key in field_labels:
            ttk.Label(self.left_panel, text=label).pack(anchor=tk.W, padx=5)
            ttk.Entry(
                self.left_panel,
                textvariable=self.product_fields[key]
            ).pack(padx=5, fill=tk.X, pady=(0,10))

        # Image upload
        ttk.Label(self.left_panel, text="Hình ảnh:").pack(anchor=tk.W, padx=5)
        ttk.Button(
            self.left_panel,
            text="Chọn ảnh",
            command=self.choose_image
        ).pack(padx=5, fill=tk.X, pady=(0,5))
        
        # Image preview
        self.image_preview_label = ttk.Label(self.left_panel)
        self.image_preview_label.pack(pady=(0,10))

        # Category selection
        ttk.Label(self.left_panel, text="Danh mục:").pack(anchor=tk.W, padx=5)
        self.new_category_var = tk.StringVar()
        category_combo = ttk.Combobox(
            self.left_panel, 
            textvariable=self.new_category_var,
            values=["Bánh kem", "Đồ ăn", "Đồ uống"],
            state="readonly"
        )
        category_combo.pack(padx=5, fill=tk.X, pady=(0,10))
        
        # Buttons
        ttk.Button(
            self.left_panel, 
            text="Thêm Sản Phẩm", 
            command=self.add_product
        ).pack(pady=10, padx=5, fill=tk.X)

        ttk.Button(
            self.left_panel,
            text="Xóa Form",
            command=self.clear_form
        ).pack(pady=(0,10), padx=5, fill=tk.X)

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
            # Show image preview
            try:
                image = Image.open(filename)
                image.thumbnail((100, 100))  # Resize for preview
                photo = ImageTk.PhotoImage(image)
                self.image_preview_label.configure(image=photo)
                self.image_preview_label.image = photo  # Keep a reference
            except Exception as e:
                messagebox.showerror("Lỗi", f"Không thể tải ảnh: {str(e)}")

    def _setup_right_panel(self):
        # Products list
        self.tree = ttk.Treeview(
            self.right_panel,
            columns=("ID", "Tên", "Giá", "Danh mục", "Mô tả"),
            show="headings"
        )
        
        # Define headings
        self.tree.heading("ID", text="ID")
        self.tree.heading("Tên", text="Tên sản phẩm")
        self.tree.heading("Giá", text="Giá (VNĐ)")
        self.tree.heading("Danh mục", text="Danh mục")
        self.tree.heading("Mô tả", text="Mô tả")
        
        # Define columns
        self.tree.column("ID", width=50)
        self.tree.column("Tên", width=200)
        self.tree.column("Giá", width=100)
        self.tree.column("Danh mục", width=100)
        self.tree.column("Mô tả", width=300)
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(self.right_panel, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        # Delete button
        self.delete_btn = ttk.Button(
            self.right_panel,
            text="Xóa Sản Phẩm",
            command=self.delete_product
        )
        
        # Pack widgets
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.delete_btn.pack(side=tk.BOTTOM, pady=10)

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

    def add_product(self):
        try:
            # Get values from form
            name = self.product_fields['name'].get().strip()
            price_str = self.product_fields['price'].get().strip()
            description = self.product_fields['description'].get().strip()
            category_display = self.new_category_var.get()
            
            # Convert display category to database category
            category_map = {
                "Bánh kem": "cake",
                "Đồ ăn": "food",
                "Đồ uống": "drink"
            }
            category = category_map.get(category_display)
            
            # Validate inputs
            if not name:
                messagebox.showerror("Lỗi", "Vui lòng nhập tên sản phẩm!")
                return
                
            try:
                price = float(price_str)
                if price < 0:
                    raise ValueError("Giá phải là số dương")
            except ValueError:
                messagebox.showerror("Lỗi", "Vui lòng nhập giá hợp lệ!")
                return
            
            if not category:
                messagebox.showerror("Lỗi", "Vui lòng chọn danh mục!")
                return
            
            # Save image if selected
            image_path = None
            if self.selected_image_path:
                image_path = self.save_uploaded_image(self.selected_image_path)
            
            # Add product to database
            product_id = self.product_manager.add_product(
                name=name,
                price=price,
                category=category,
                description=description if description else None,
                image_url=image_path
            )
            
            if product_id:
                messagebox.showinfo("Thành công", "Đã thêm sản phẩm!")
                self.clear_form()
                self.load_products()
            else:
                messagebox.showerror("Lỗi", "Không thể thêm sản phẩm!")
                
        except Exception as e:
            messagebox.showerror("Lỗi", f"Đã xảy ra lỗi: {str(e)}")

    def clear_form(self):
        # Clear all form fields
        for var in self.product_fields.values():
            var.set("")
        self.new_category_var.set("")
        self.selected_image_path = None
        # Clear image preview
        self.image_preview_label.configure(image='')

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
                else:
                    messagebox.showerror("Lỗi", f"Không thể xóa sản phẩm {product_id}")

def main():
    root = tk.Tk()
    app = StoreGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()