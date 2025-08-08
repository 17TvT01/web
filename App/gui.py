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
        self.filter_vars = {} # Để lưu trạng thái của các checkbox lọc

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
        self.on_category_change() # Tải bộ lọc và sản phẩm ban đầu
        self.load_orders()

    # Existing product management UI setup methods, but adjusted to use self.product_tab as parent
    def _setup_left_panel(self):
        # Cấu hình left panel với kích thước cố định
        self.left_panel = ttk.Frame(self.product_tab, width=300)
        self.left_panel.pack(side=tk.LEFT, fill=tk.BOTH, padx=5, pady=5)
        self.left_panel.pack_propagate(False)  # Giữ kích thước cố định

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
                command=self.on_category_change
            ).pack(pady=2)

        # Thêm đường phân cách
        ttk.Separator(self.left_panel, orient='horizontal').pack(fill='x', pady=10, padx=5)

        # Frame cho các bộ lọc chi tiết (sẽ được tạo động)
        self.dynamic_filter_frame = ttk.Frame(self.left_panel)
        self.dynamic_filter_frame.pack(fill=tk.X, padx=5, pady=5, anchor='n')

        # Thêm đường phân cách
        ttk.Separator(self.left_panel, orient='horizontal').pack(fill='x', pady=10, padx=5)

        # Search với style mới
        search_frame = ttk.Frame(self.left_panel)
        search_frame.pack(fill=tk.X, padx=5, pady=(20, 10))
        
        ttk.Label(
            search_frame,
            text="Tìm Kiếm",
            font=('Helvetica', 12, 'bold')
        ).pack(anchor=tk.W, pady=(0, 5))
        
        self.search_var = tk.StringVar()
        self.search_var.trace('w', lambda *args: self.load_products(update_filters=False))
        search_entry = ttk.Entry(
            search_frame,
            textvariable=self.search_var,
        )
        search_entry.pack(fill=tk.X)

        # Tạo container cho form với scrollbar
        form_container = ttk.Frame(self.left_panel)
        form_container.pack(fill=tk.BOTH, padx=5, pady=10, expand=True)
        
        # Tạo canvas để scroll
        form_canvas = tk.Canvas(form_container)
        scrollbar = ttk.Scrollbar(form_container, orient="vertical", command=form_canvas.yview)
        
        # Product form frame
        form_frame = ttk.LabelFrame(form_canvas, text="Thông Tin Sản Phẩm", padding=10)
        
        # Cấu hình scroll
        form_canvas.configure(yscrollcommand=scrollbar.set)
        
        # Pack scrollbar và canvas
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        form_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Tạo cửa sổ trong canvas để chứa form
        form_window = form_canvas.create_window((0, 0), window=form_frame, anchor='nw')
        
        # Cập nhật kích thước scroll region khi form thay đổi
        def on_frame_configure(event):
            form_canvas.configure(scrollregion=form_canvas.bbox("all"))
            # Đảm bảo form luôn rộng bằng canvas
            width = form_canvas.winfo_width()
            form_canvas.itemconfig(form_window, width=width)
            
        form_frame.bind('<Configure>', on_frame_configure)
        
        # Cho phép scroll bằng chuột
        def on_mousewheel(event):
            form_canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        form_canvas.bind_all("<MouseWheel>", on_mousewheel)

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

        # Tạo frame cố định ở dưới cùng cho các nút
        bottom_frame = ttk.Frame(self.left_panel)
        bottom_frame.pack(side=tk.BOTTOM, fill=tk.X, padx=5, pady=5)

        # Thêm đường phân cách
        separator = ttk.Separator(self.left_panel, orient='horizontal')
        separator.pack(side=tk.BOTTOM, fill=tk.X, padx=5, pady=5)

        # Buttons frame với style mới
        buttons_frame = ttk.Frame(bottom_frame)
        buttons_frame.pack(fill=tk.X)

        # Add/Update button với style nổi bật
        self.submit_btn = ttk.Button(
            buttons_frame,
            text="Thêm Sản Phẩm",
            command=self.submit_product,
            style='Accent.TButton'  # Style nổi bật cho nút chính
        )
        self.submit_btn.pack(side=tk.LEFT, expand=True, padx=2, pady=5, fill=tk.X)

        # Cancel button với style thông thường
        self.cancel_btn = ttk.Button(
            buttons_frame,
            text="Hủy",
            command=self.cancel_edit,
            state=tk.DISABLED,
            style='Secondary.TButton'  # Style phụ cho nút hủy
        )
        self.cancel_btn.pack(side=tk.LEFT, expand=True, padx=2, pady=5, fill=tk.X)

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
        # Tạo panel chứa hình ảnh với kích thước cố định
        self.right_panel = ttk.Frame(self.product_tab)
        self.right_panel.pack(side=tk.LEFT, fill=tk.BOTH, padx=5, pady=5)
        
        # Tạo container để căn giữa nội dung
        container = ttk.Frame(self.right_panel)
        container.pack(expand=True, fill=tk.BOTH, padx=10, pady=10)
        
        # Label tiêu đề
        self.preview_label = ttk.Label(
            container,
            text="Hình ảnh sản phẩm",
            font=('Helvetica', 12, 'bold')
        )
        self.preview_label.pack(pady=(0, 10))

        # Frame chứa preview với border
        preview_frame = ttk.Frame(container, relief="solid", borderwidth=1)
        preview_frame.pack(expand=True, fill=tk.BOTH)
        
        # Tạo canvas cho hình ảnh để có thể scroll
        preview_canvas = tk.Canvas(
            preview_frame,
            width=300,
            height=300,
            bg='white'
        )
        preview_canvas.pack(expand=True, fill=tk.BOTH, padx=5, pady=5)

        # Label hiển thị hình ảnh
        self.image_preview = ttk.Label(preview_canvas)
        preview_canvas.create_window(
            150, # x center
            150, # y center
            window=self.image_preview,
            anchor='center'
        )

    def show_product_image(self, image_path):
        if image_path and os.path.exists(image_path):
            try:
                # Load image
                image = Image.open(image_path)
                
                # Get original dimensions
                original_width, original_height = image.size
                
                # Target display size
                display_width = 280
                display_height = 280
                
                # Calculate dimensions maintaining aspect ratio
                if original_width > original_height:
                    ratio = display_width / original_width
                    new_width = display_width
                    new_height = int(original_height * ratio)
                else:
                    ratio = display_height / original_height
                    new_height = display_height
                    new_width = int(original_width * ratio)
                
                # Resize image
                resized_image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Create background
                background = Image.new('RGBA', (display_width, display_height), (255, 255, 255, 0))
                
                # Calculate position to center the image
                x = (display_width - new_width) // 2
                y = (display_height - new_height) // 2
                
                # Paste resized image onto background
                background.paste(resized_image, (x, y))
                
                # Convert to PhotoImage
                photo = ImageTk.PhotoImage(background)
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
                # Optimize and resize image for storage
                image = Image.open(filename)
                
                # Convert to RGB if necessary
                if image.mode in ('RGBA', 'P'):
                    image = image.convert('RGB')
                
                # Calculate dimensions for form preview (150x150)
                preview_size = (150, 150)
                display_image = image.copy()
                display_image.thumbnail(preview_size, Image.Resampling.LANCZOS)
                
                # Center the preview image
                background = Image.new('RGB', preview_size, (255, 255, 255))
                x = (preview_size[0] - display_image.width) // 2
                y = (preview_size[1] - display_image.height) // 2
                background.paste(display_image, (x, y))
                
                # Show preview
                photo = ImageTk.PhotoImage(background)
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

    def on_category_change(self):
        """Được gọi khi người dùng thay đổi danh mục."""
        self.load_products(update_filters=True)

    def _update_dynamic_filters(self):
        """Cập nhật các checkbox lọc chi tiết dựa trên danh mục đã chọn."""
        # Xóa các bộ lọc cũ
        for widget in self.dynamic_filter_frame.winfo_children():
            widget.destroy()
        self.filter_vars.clear()

        category = self.category_var.get()
        if category == "all":
            return  # Không hiển thị bộ lọc chi tiết cho "Tất cả"

        # Lấy tất cả sản phẩm của danh mục để tìm các thẻ lọc có sẵn
        all_category_products = self.product_manager.get_all_products(category)
        available_filters = set()
        for p in all_category_products:
            if 'ai_keys' in p.get('filters', {}):
                available_filters.update(p['filters']['ai_keys'])
        
        # Tạo các checkbox mới nếu có
        if available_filters:
            ttk.Label(self.dynamic_filter_frame, text="Lọc Chi Tiết", font=('Helvetica', 10, 'bold')).pack(anchor=tk.W, pady=(0, 5))
            for f in sorted(list(available_filters)):
                var = tk.BooleanVar(value=False)
                cb = ttk.Checkbutton(self.dynamic_filter_frame, text=f.capitalize(), variable=var, command=lambda: self.load_products(update_filters=False))
                cb.pack(anchor=tk.W, padx=10)
                self.filter_vars[f] = var

    def submit_product(self):
        try:
            # Get values from form
            name = self.product_fields['name'].get().strip()
            price_str = self.product_fields['price'].get().strip()
            quantity_str = self.product_fields['quantity'].get().strip()
            description = self.product_fields['description'].get().strip()
            category_display = self.new_category_var.get()

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
                    self.cancel_edit() # Xóa form
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

            # Tải lại sản phẩm và cập nhật bộ lọc
            self.on_category_change()

        except Exception as e:
            messagebox.showerror("Lỗi", f"Đã xảy ra lỗi: {str(e)}")

    def save_uploaded_image(self, source_path):
        if not source_path:
            return None

        try:
            # Open and optimize image
            image = Image.open(source_path)
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')
            
            # Calculate optimal dimensions while maintaining aspect ratio
            max_size = (800, 800)  # Maximum dimensions
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Create a unique filename using timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"product_{timestamp}.jpg"  # Always save as JPG
            destination = os.path.join(self.images_dir, filename)
            
            # Save optimized image with good quality but reduced file size
            image.save(destination, 'JPEG', quality=85, optimize=True)
            
            print(f"Image saved successfully: {destination}")
            return destination

        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể lưu ảnh: {str(e)}")
            print(f"Error saving image: {e}")
            return None

    def clear_form(self):
        # Clear all form fields
        for var in self.product_fields.values():
            var.set("")
        self.new_category_var.set("")
        self.selected_image_path = None
        self.form_preview.configure(image='')
        self.image_preview.configure(image='')

    def load_products(self, update_filters=True):
        """
        Tải và hiển thị sản phẩm, có tùy chọn cập nhật bộ lọc chi tiết.
        :param update_filters: True nếu cần tạo lại các checkbox lọc (khi đổi danh mục).
        """
        if update_filters:
            self._update_dynamic_filters()

        # Clear current items
        for item in self.tree.get_children():
            self.tree.delete(item)

        # Lấy sản phẩm dựa trên danh mục và tìm kiếm
        category = self.category_var.get()
        search = self.search_var.get()

        if search:
            products = self.product_manager.search_products(search)
            # Nếu đang tìm kiếm, có thể lọc thêm theo danh mục hiện tại
            if category != "all":
                products = [p for p in products if p['category'] == category]
        elif category != "all":
            products = self.product_manager.get_all_products(category)
        else:
            products = self.product_manager.get_all_products()

        # Lọc sản phẩm dựa trên các checkbox đã chọn
        active_filters = {key for key, var in self.filter_vars.items() if var.get()}
        if active_filters:
            filtered_products = []
            for product in products:
                product_tags = set(product.get('filters', {}).get('ai_keys', []))
                if active_filters.issubset(product_tags):
                    filtered_products.append(product)
            products = filtered_products

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
                if not self.product_manager.delete_product(product_id):
                    messagebox.showerror("Lỗi", f"Không thể xóa sản phẩm {product_id}")
            
            # Tải lại danh sách sản phẩm và bộ lọc
            self.on_category_change()
            self.image_preview.configure(image='') # Xóa ảnh preview


    # Enhanced order management UI setup with features from order_gui.py
    def _setup_order_ui(self):
        # Main order frame
        main_order_frame = ttk.Frame(self.order_tab)
        main_order_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Header frame
        header_frame = ttk.Frame(main_order_frame)
        header_frame.pack(fill=tk.X, pady=(0, 10))
        
        ttk.Label(header_frame, text="QUẢN LÝ ĐƠN HÀNG", 
                 font=('Helvetica', 14, 'bold')).pack(side=tk.LEFT)
        
        # Filter frame
        filter_frame = ttk.LabelFrame(main_order_frame, text="Bộ lọc", padding="5")
        filter_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Status filter
        ttk.Label(filter_frame, text="Trạng thái:").pack(side=tk.LEFT, padx=5)
        self.order_status_var = tk.StringVar(value="all")
        status_combo = ttk.Combobox(filter_frame, textvariable=self.order_status_var,
                                   values=["all", "chưa giải quyết", "hoàn thành", "đã hủy"],
                                   state="readonly", width=15)
        status_combo.pack(side=tk.LEFT, padx=5)
        status_combo.bind('<<ComboboxSelected>>', lambda e: self.load_orders())
        
        # Date filter
        ttk.Label(filter_frame, text="Từ ngày:").pack(side=tk.LEFT, padx=5)
        self.from_date = ttk.Entry(filter_frame, width=12)
        self.from_date.pack(side=tk.LEFT, padx=5)
        self.from_date.insert(0, datetime.now().strftime("%Y-%m-%d"))
        
        ttk.Label(filter_frame, text="Đến ngày:").pack(side=tk.LEFT, padx=5)
        self.to_date = ttk.Entry(filter_frame, width=12)
        self.to_date.pack(side=tk.LEFT, padx=5)
        self.to_date.insert(0, datetime.now().strftime("%Y-%m-%d"))
        
        ttk.Button(filter_frame, text="Làm mới", 
                  command=self.load_orders).pack(side=tk.LEFT, padx=5)
        
        # Create paned window for order management
        paned = ttk.PanedWindow(main_order_frame, orient=tk.HORIZONTAL)
        paned.pack(fill=tk.BOTH, expand=True)
        
        # Left panel - Order list
        left_frame = ttk.Frame(paned)
        paned.add(left_frame, weight=2)
        
        # Right panel - Order details
        right_frame = ttk.Frame(paned)
        paned.add(right_frame, weight=1)
        
        # Order list with enhanced columns
        columns = ("ID", "Khách hàng", "Tổng tiền", "Trạng thái", "Ngày đặt")
        self.order_tree = ttk.Treeview(left_frame, columns=columns, show="headings", height=15)
        
        # Configure columns
        for col in columns:
            self.order_tree.heading(col, text=col)
            
        self.order_tree.column("ID", width=50)
        self.order_tree.column("Khách hàng", width=150)
        self.order_tree.column("Tổng tiền", width=100)
        self.order_tree.column("Trạng thái", width=100)
        self.order_tree.column("Ngày đặt", width=120)
        
        # Scrollbars for order tree
        v_scrollbar = ttk.Scrollbar(left_frame, orient=tk.VERTICAL, command=self.order_tree.yview)
        h_scrollbar = ttk.Scrollbar(left_frame, orient=tk.HORIZONTAL, command=self.order_tree.xview)
        self.order_tree.configure(yscrollcommand=v_scrollbar.set, xscrollcommand=h_scrollbar.set)
        
        # Action buttons frame
        action_frame = ttk.Frame(left_frame)
        
        ttk.Button(action_frame, text="Cập nhật trạng thái", 
                  command=self.update_order_status).pack(side=tk.LEFT, padx=2)
        ttk.Button(action_frame, text="Xóa đơn hàng", 
                  command=self.delete_order).pack(side=tk.LEFT, padx=2)
        ttk.Button(action_frame, text="In hóa đơn", 
                  command=self.print_invoice).pack(side=tk.LEFT, padx=2)
        
        # Pack order list widgets
        self.order_tree.grid(row=0, column=0, sticky='nsew')
        v_scrollbar.grid(row=0, column=1, sticky='ns')
        h_scrollbar.grid(row=1, column=0, sticky='ew')
        action_frame.grid(row=2, column=0, columnspan=2, pady=5)
        
        left_frame.grid_rowconfigure(0, weight=1)
        left_frame.grid_columnconfigure(0, weight=1)
        
        # Order details panel
        details_frame = ttk.LabelFrame(right_frame, text="Chi tiết đơn hàng", padding="10")
        details_frame.pack(fill=tk.BOTH, expand=True)
        
        # Order info
        self.order_info_frame = ttk.Frame(details_frame)
        self.order_info_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Items treeview
        items_frame = ttk.LabelFrame(details_frame, text="Sản phẩm", padding="5")
        items_frame.pack(fill=tk.BOTH, expand=True)
        
        item_columns = ("Sản phẩm", "Số lượng", "Đơn giá", "Thành tiền")
        self.items_tree = ttk.Treeview(items_frame, columns=item_columns, 
                                      show="headings", height=8)
        
        for col in item_columns:
            self.items_tree.heading(col, text=col)
            
        self.items_tree.column("Sản phẩm", width=150)
        self.items_tree.column("Số lượng", width=70)
        self.items_tree.column("Đơn giá", width=100)
        self.items_tree.column("Thành tiền", width=100)
        
        item_scrollbar = ttk.Scrollbar(items_frame, orient=tk.VERTICAL, 
                                      command=self.items_tree.yview)
        self.items_tree.configure(yscrollcommand=item_scrollbar.set)
        
        self.items_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        item_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Status update frame
        status_frame = ttk.LabelFrame(details_frame, text="Cập nhật trạng thái", padding="5")
        status_frame.pack(fill=tk.X, pady=(10, 0))
        
        self.order_status_combo = ttk.Combobox(status_frame, 
                                        values=["Chưa giải quyết", "Đang xử lý", "Hoàn thành", "Đã hủy"],
                                        state="readonly", width=15)
        self.order_status_combo.pack(side=tk.LEFT, padx=5)
        
        ttk.Button(status_frame, text="Cập nhật", 
                  command=self.update_selected_status).pack(side=tk.LEFT, padx=5)
        
        # Bind selection event
        self.order_tree.bind('<<TreeviewSelect>>', self.on_order_select)

    def load_orders(self):
        """Load orders with enhanced filtering"""
        try:
            # Clear current items
            for item in self.order_tree.get_children():
                self.order_tree.delete(item)
            
            # Get filter values
            status = self.order_status_var.get()
            if status == "all":
                status = None
                
            # Load orders
            orders = self.order_manager.get_all_orders(status)
            
            # Insert orders into tree
            for order in orders:
                created_at = order.get('created_at', '')
                if isinstance(created_at, str) and len(created_at) > 10:
                    created_at = created_at[:10]
                    
                self.order_tree.insert(
                    "",
                    tk.END,
                    values=(
                        order['id'],
                        order['customer_name'],
                        f"{order['total_price']:,} VNĐ",
                        order['status'],
                        created_at
                    )
                )
                
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể tải danh sách đơn hàng: {str(e)}")

    def on_order_select(self, event):
        """Handle order selection with enhanced details display"""
        selected = self.order_tree.selection()
        if not selected:
            return
            
        item = selected[0]
        order_id = self.order_tree.item(item)['values'][0]
        order = self.order_manager.get_order(order_id)
        
        if order:
            self.display_order_details(order)
            
    def display_order_details(self, order):
        """Display order details in right panel with enhanced format"""
        # Clear order info
        for widget in self.order_info_frame.winfo_children():
            widget.destroy()
            
        # Display order information
        created_at = order.get('created_at', '')
        if isinstance(created_at, str) and len(created_at) > 10:
            created_at = created_at[:10]
            
        info_text = f"""ID Đơn hàng: {order['id']}
Khách hàng: {order['customer_name']}
Tổng tiền: {order['total_price']:,} VNĐ
Trạng thái: {order['status'].upper()}
Ngày đặt: {created_at}"""
        
        ttk.Label(self.order_info_frame, text=info_text.strip(), 
                 justify=tk.LEFT).pack(anchor=tk.W)
        
        # Update status combo
        self.order_status_combo.set(order['status'])
        
        # Clear items tree
        for item in self.items_tree.get_children():
            self.items_tree.delete(item)
            
        # Display items
        items = order.get('items', [])
        for item in items:
            product_name = item.get('name', f"Sản phẩm #{item.get('product_id', 'N/A')}")
            quantity = item.get('quantity', 0)
            price = item.get('price', 0)
            total = quantity * price
            
            self.items_tree.insert(
                "",
                tk.END,
                values=(
                    product_name,
                    quantity,
                    f"{price:,} VNĐ",
                    f"{total:,} VNĐ"
                )
            )

    def update_order_status(self):
        """Update order status from main button"""
        selected = self.order_tree.selection()
        if not selected:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn đơn hàng!")
            return
            
        self.update_selected_status()
        
    def update_selected_status(self):
        """Update status of selected order"""
        selected = self.order_tree.selection()
        if not selected:
            return
            
        item = selected[0]
        order_id = self.order_tree.item(item)['values'][0]
        new_status = self.order_status_combo.get()
        
        if not new_status:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn trạng thái!")
            return
            
        success = self.order_manager.update_order_status(order_id, new_status)
        if success:
            messagebox.showinfo("Thành công", "Đã cập nhật trạng thái đơn hàng!")
            self.load_orders()
            # Refresh details
            order = self.order_manager.get_order(order_id)
            if order:
                self.display_order_details(order)
        else:
            messagebox.showerror("Lỗi", "Không thể cập nhật trạng thái!")

    def delete_order(self):
        """Delete selected order with confirmation"""
        selected = self.order_tree.selection()
        if not selected:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn đơn hàng!")
            return

        if messagebox.askyesno("Xác nhận", "Bạn có chắc muốn xóa đơn hàng này?"):
            for item in selected:
                order_id = self.order_tree.item(item)['values'][0]
                if self.order_manager.delete_order(order_id):
                    self.order_tree.delete(item)
                    # Clear details
                    for widget in self.order_info_frame.winfo_children():
                        widget.destroy()
                    for item in self.items_tree.get_children():
                        self.items_tree.delete(item)
                else:
                    messagebox.showerror("Lỗi", f"Không thể xóa đơn hàng {order_id}")
                    
    def print_invoice(self):
        """Print order invoice (placeholder)"""
        selected = self.order_tree.selection()
        if not selected:
            messagebox.showwarning("Cảnh báo", "Vui lòng chọn đơn hàng!")
            return
            
        item = selected[0]
        order_id = self.order_tree.item(item)['values'][0]
        messagebox.showinfo("In hóa đơn", f"Chức năng in hóa đơn cho đơn #{order_id} sẽ được triển khai sau!")

def main():
    root = tk.Tk()
    app = StoreGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
