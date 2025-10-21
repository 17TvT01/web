import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from PIL import Image, ImageTk
import shutil
import os
import json
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
        self.table_settings = self._load_table_settings()
        self.table_lookup = {}
        self.table_name_map = {}
        for entry in self.table_settings:
            identifier = str(entry['number'])
            name = entry.get('name') or f"Bàn {identifier}"
            self.table_name_map[identifier] = name
            self.table_lookup[self._normalize_table_key(identifier)] = identifier
            self.table_lookup[self._normalize_table_key(name)] = identifier
        self.table_tiles = {}
        self.table_orders = {}
        self.table_colors = {
            "empty": "#D1D5DB",
            "paid": "#34D399",
            "unpaid": "#FDBA74",
            "cancelled": "#FCA5A5"
        }
        self.table_auto_refresh_ms = 60_000
        self._table_auto_refresh_job = None
        self._table_refresh_in_progress = False
        self._table_pending_refresh = False
        self.last_table_refresh_var = tk.StringVar(value="Chưa cập nhật")

        # Status label mapping between UI (VN) and DB enum values
        self.UI_TO_DB_STATUS = {
            "chưa giải quyết": "pending",
            "Chưa giải quyết": "pending",
            "đang xử lý": "pending",
            "Hoàn thành": "completed",
            "Hoàn thành": "completed",
            "Đã hủy": "cancelled",
            "Đã hủy": "cancelled",
        }
        self.DB_TO_UI_STATUS = {
            "pending": "Chưa giải quyết",
            "completed": "Hoàn thành",
            "cancelled": "Đã hủy",
        }

        # Override status mappings with clean Vietnamese labels (used with lowercased lookups)
        self.UI_TO_DB_STATUS = {
            "chưa giải quyết": "pending",
            "đang xử lý": "pending",
            "hoàn thành": "completed",
            "đã hủy": "cancelled",
        }
        self.DB_TO_UI_STATUS = {
            "pending": "Chưa giải quyết",
            "completed": "Hoàn thành",
            "cancelled": "Đã hủy",
        }

        self.selected_image_path = None
        self.current_product_id = None  # For editing
        self.editing_mode = False
        self.filter_vars = {} # Để lưu trạng thái của các checkbox lọc
        self.form_filter_vars = {}  # Lưu trạng thái key lọc khi thêm sản phẩm

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
        self._setup_order_ui_v2()

        # Load initial data
        self.on_category_change() # Tải bộ lọc và sản phẩm ban đầu
        self.load_orders()

    def _load_table_settings(self):
        try:
            tables = self.order_manager.get_table_configuration()
            if tables:
                return tables
        except Exception as exc:
            print(f"Không thể tải danh sách bàn từ database: {exc}")

        config_path = os.path.join(os.path.dirname(__file__), "config", "tables.json")
        try:
            with open(config_path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            tables = data.get("tables", [])
        except FileNotFoundError:
            tables = []
        except Exception as exc:
            print(f"Không thể đọc cấu hình bàn: {exc}")
            tables = []
        result = []
        for index, entry in enumerate(tables):
            number = entry.get("number")
            if number is None:
                number = entry.get("id")
            if number is None:
                continue
            identifier = str(number).strip()
            if not identifier:
                continue
            name = entry.get("name") or f"Bàn {identifier}"
            result.append({"number": identifier, "name": name})
        if result:
            return result
        return [{"number": str(i), "name": f"Bàn {i}"} for i in range(1, 13)]

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
            ("Đồ Ăn", "food"),
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
            values=["Bánh kem", "Đồ Ăn", "Đồ uống"],
            state="readonly"
        )
        category_combo.pack(fill=tk.X, pady=(0, 10))
        self.new_category_var.trace('w', lambda *args: self._update_form_filter_options())

        ttk.Label(form_frame, text="Key lọc sản phẩm:").pack(anchor=tk.W)
        self.form_filter_frame = ttk.Frame(form_frame)
        self.form_filter_frame.pack(fill=tk.X, pady=(0, 10))

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
                'food': 'Đồ Ăn',
                'drink': 'Đồ uống'
            }
            self.new_category_var.set(category_display.get(product['category']))
            self._update_form_filter_options(product.get('filters', {}).get('ai_keys', []))

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

    def _update_form_filter_options(self, selected_keys=None):
        """Cập nhật các checkbox key lọc trong form sản phẩm."""
        for widget in self.form_filter_frame.winfo_children():
            widget.destroy()
        self.form_filter_vars.clear()

        category_display = self.new_category_var.get()
        category_map = {
            "Bánh kem": "cake",
            "Đồ Ăn": "food",
            "Đồ uống": "drink",
        }
        category = category_map.get(category_display)
        if not category:
            return

        options = self.product_manager.get_filter_options(category)
        for opt in options:
            var = tk.BooleanVar(value=opt in selected_keys if selected_keys else False)
            ttk.Checkbutton(self.form_filter_frame, text=opt.capitalize(), variable=var).pack(anchor=tk.W, padx=10)
            self.form_filter_vars[opt] = var

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
                "Đồ Ăn": "food",
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

            selected_keys = [k for k, v in self.form_filter_vars.items() if v.get()]
            attributes = {'ai_keys': selected_keys} if selected_keys else None

            if self.editing_mode:
                # Update existing product
                success = self.product_manager.update_product(
                    self.current_product_id,
                    name=name,
                    price=price,
                    category=category,
                    quantity=quantity,
                    description=description,
                    image_url=image_path,
                    attributes=attributes
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
                    image_url=image_path,
                    attributes=attributes
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
            "food": "Đồ Ăn",
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
        """Refresh table overview to reflect current orders."""
        self.refresh_table_overview()


    def _format_option_fragments(self, opts):
        """Normalize assorted option payloads into readable label/value fragments."""
        fragments = []

        def push(label, value=None):
            label_text = str(label).strip() if label is not None else ''
            value_text = '' if value is None else str(value).strip()
            if label_text and value_text:
                fragments.append(f"{label_text}: {value_text}")
            elif label_text:
                fragments.append(label_text)
            elif value_text:
                fragments.append(value_text)

        def handle_node(node):
            if isinstance(node, dict):
                base_label = node.get('label') or node.get('name')
                base_value = node.get('value')
                if base_label is not None or base_value not in (None, ''):
                    push(base_label, base_value)

                name_map = {}
                value_map = {}
                for key, value in node.items():
                    if key in ('label', 'name', 'value'):
                        continue
                    lower = key.lower()
                    if lower.startswith('name'):
                        name_map[lower[4:]] = value
                        continue
                    if lower.startswith('value'):
                        value_map[lower[5:]] = value
                        continue
                    if isinstance(value, (dict, list)):
                        handle_node(value)
                    else:
                        push(key, value)

                for suffix, label in name_map.items():
                    push(label, value_map.pop(suffix, None))
                for leftover in value_map.values():
                    push(None, leftover)
            elif isinstance(node, list):
                pending_label = None
                for item in node:
                    if isinstance(item, (dict, list)):
                        handle_node(item)
                        continue
                    text_item = str(item).strip()
                    if not text_item:
                        continue
                    lower = text_item.lower()
                    if lower.startswith('name:') :
                        pending_label = text_item.split(':', 1)[1].strip()
                    elif lower.startswith('value:') :
                        value_text = text_item.split(':', 1)[1].strip()
                        if pending_label:
                            push(pending_label, value_text)
                            pending_label = None
                        else:
                            push(None, value_text)
                    else:
                        if pending_label:
                            push(pending_label, text_item)
                            pending_label = None
                        else:
                            push(None, text_item)
                if pending_label:
                    push(pending_label)
            elif isinstance(node, str):
                text_item = node.strip()
                if not text_item:
                    return
                lower = text_item.lower()
                if lower.startswith('name:') or lower.startswith('value:') :
                    _, rest = text_item.split(':', 1)
                    rest = rest.strip()
                    if rest:
                        push(None, rest)
                else:
                    push(None, text_item)
            elif node not in (None, ''):
                push(None, node)

        handle_node(opts)
        return fragments

    def display_order_details(self, order):
        """Display order details in right panel with enhanced format"""
        # Clear order info
        for widget in self.order_info_frame.winfo_children():
            widget.destroy()
            
        # Display order information
        table_info = order.get('table_number') or 'N/A'
        created_at = order.get('created_at', '')
        if isinstance(created_at, str) and len(created_at) > 10:
            created_at = created_at[:10]
            
            table_info = order.get('table_number') or 'N/A'
        assist = 'Có' if order.get('needs_assistance') else 'Không'
        info_text = f"""
ID đơn hàng: {order['id']}
                    Khách hàng: {order['customer_name']}
                    Tổng tiền: {order['total_price']:,} VNĐ
                    Trạng thái: {order['status'].upper()}
                    Ngày đặt: {created_at}
                    Bàn: {table_info}
                    Gọi phục vụ: {assist}"""
        
        ttk.Label(self.order_info_frame, text=info_text.strip(), 
                 justify=tk.LEFT).pack(anchor=tk.W)

        # Hiển thị tóm tắt tùy chọn sản phẩm (trong khu vực chi tiết đơn hàng)
        try:
            opts_lines = []
            for it in order.get('items', []):
                name = it.get('name', f"#{it.get('product_id','')}")
                opts = it.get('selected_options')
                fragments = self._format_option_fragments(opts)
                if fragments:
                    opts_lines.append(f"- {name}: " + "; ".join(fragments))
            if opts_lines:
                ttk.Label(self.order_info_frame, text="Tùy chọn:", font=('Helvetica', 10, 'bold')).pack(anchor=tk.W, pady=(6,0))
                ttk.Label(self.order_info_frame, text="\n".join(opts_lines), justify=tk.LEFT).pack(anchor=tk.W)
        except Exception:
            pass
        
        # Update status combo (map DB status to UI label if possible)
        try:
            status_display = self.DB_TO_UI_STATUS.get(order.get('status'), order.get('status'))
        except Exception:
            status_display = order.get('status')
        self.order_status_combo.set(status_display)
        
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
            
        # Map UI label to DB enum value before updating
        db_status = self.UI_TO_DB_STATUS.get(new_status.strip().lower(), new_status)
        allowed_statuses = {"pending", "completed", "cancelled", "canceled"}
        if db_status not in allowed_statuses:
            messagebox.showerror("Lỗi", f"Trạng thái không hợp lệ: {new_status}")
            return
        success = self.order_manager.update_order_status(order_id, db_status)
        if success:
            messagebox.showinfo("Thành công", "Đã cập nhật trạng thái đơn hàng!")
            self.load_orders()
            # Refresh details
            order = self.order_manager.get_order(order_id)
            if order:
                # Render base details then rebuild items with options + prices
                self.display_order_details(order)
                try:
                    for iid in self.items_tree.get_children():
                        self.items_tree.delete(iid)
                    for it in order.get('items', []):
                        name = it.get('name', f"#{it.get('product_id','')}")
                        qty = it.get('quantity', 0)
                        price = it.get('price', 0) or 0
                        # Build options string
                        opts = it.get('selected_options')
                        fragments = self._format_option_fragments(opts)
                        opts_text = ''
                        if fragments:
                            opts_text = ' - ' + '; '.join(fragments)
                        label = name + opts_text
                        try:
                            total = (qty or 0) * float(price)
                        except Exception:
                            total = 0
                        self.items_tree.insert('', tk.END, values=(label, qty, f"{price:,} VND", f"{total:,} VND"))
                except Exception:
                    pass
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

    # --- New, simplified Order UI (v2) ---
    def _setup_order_ui_v2(self):
        self.order_tree = None
        self.items_tree = None
        main_order_frame = ttk.Frame(self.order_tab)
        main_order_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        header_frame = ttk.Frame(main_order_frame)
        header_frame.pack(fill=tk.X, pady=(0, 12))
        ttk.Label(header_frame, text="Quản lý bàn và đơn hàng", font=('Helvetica', 14, 'bold')).pack(side=tk.LEFT)
        self.table_refresh_button = ttk.Button(header_frame, text="Làm mới", command=self.refresh_table_overview)
        self.table_refresh_button.pack(side=tk.RIGHT)
        ttk.Label(header_frame, textvariable=self.last_table_refresh_var, font=('Helvetica', 10), foreground="#4B5563").pack(side=tk.RIGHT, padx=(0, 12))

        legend_frame = ttk.Frame(main_order_frame)
        legend_frame.pack(fill=tk.X, pady=(0, 12))
        self._add_legend_item(legend_frame, self.table_colors["empty"], "Bàn trống")
        self._add_legend_item(legend_frame, self.table_colors["unpaid"], "Khách chưa thanh toán")
        self._add_legend_item(legend_frame, self.table_colors["paid"], "Khách đã thanh toán")
        self._add_legend_item(legend_frame, self.table_colors["cancelled"], "Đơn đã hủy")

        grid_container = ttk.Frame(main_order_frame)
        grid_container.pack(fill=tk.BOTH, expand=True)

        canvas = tk.Canvas(grid_container, highlightthickness=0)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar = ttk.Scrollbar(grid_container, orient=tk.VERTICAL, command=canvas.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.configure(yscrollcommand=scrollbar.set)

        self.table_grid_frame = ttk.Frame(canvas)
        canvas_window = canvas.create_window((0, 0), window=self.table_grid_frame, anchor="nw", tags="table_grid")

        def _update_scrollregion(_event):
            canvas.configure(scrollregion=canvas.bbox("all"))

        def _resize_canvas(event):
            canvas.itemconfigure(canvas_window, width=event.width)

        self.table_grid_frame.bind("<Configure>", _update_scrollregion)
        canvas.bind("<Configure>", _resize_canvas)

        self._build_table_grid()
        self.refresh_table_overview()
    def _add_legend_item(self, parent, color, text):
        container = ttk.Frame(parent)
        container.pack(side=tk.LEFT, padx=(0, 12))
        swatch = tk.Frame(container, width=18, height=18, bg=color, relief=tk.GROOVE, bd=1)
        swatch.pack(side=tk.LEFT)
        swatch.pack_propagate(False)
        ttk.Label(container, text=text).pack(side=tk.LEFT, padx=6)

    def _build_table_grid(self):
        for child in self.table_grid_frame.winfo_children():
            child.destroy()
        self.table_tiles.clear()
        total_tables = len(self.table_settings)
        columns = 4 if total_tables >= 4 else max(1, total_tables)
        for index, table in enumerate(self.table_settings):
            row = index // columns
            column = index % columns
            tile = self._create_table_tile(self.table_grid_frame, table)
            tile.grid(row=row, column=column, padx=6, pady=6, sticky="nsew")
        for col in range(columns):
            self.table_grid_frame.grid_columnconfigure(col, weight=1)

    def _create_table_tile(self, parent, table_info):
        identifier = str(table_info.get("number"))
        display_name = table_info.get("name") or f"Bàn {identifier}"
        tile = tk.Frame(parent, width=220, height=140, bg=self.table_colors["empty"], bd=1, relief=tk.RIDGE)
        tile.grid_propagate(False)
        number_label = tk.Label(tile, text=identifier, font=('Helvetica', 12, 'bold'), bg=self.table_colors["empty"], anchor='nw')
        number_label.place(x=8, y=8)
        info_label = tk.Label(tile, text=f"{display_name}\nTrống", font=('Helvetica', 10), justify=tk.LEFT, bg=self.table_colors["empty"], wraplength=180)
        info_label.place(x=8, y=36)
        tile.identifier = identifier
        tile.display_name = display_name
        tile.number_label = number_label
        tile.info_label = info_label
        self.table_tiles[identifier] = tile

        def handler(_event, ident=identifier):
            self._on_table_double_click(ident)

        tile.bind("<Double-Button-1>", handler)
        number_label.bind("<Double-Button-1>", handler)
        info_label.bind("<Double-Button-1>", handler)
        return tile

    def _set_tile_state(self, tile, state, order):
        color = self.table_colors.get(state, self.table_colors["empty"])
        tile.configure(bg=color)
        tile.number_label.configure(bg=color)
        tile.info_label.configure(bg=color)
        lines = [tile.display_name]
        if order:
            customer = order.get("customer_name") or "Khách"
            if state == "paid":
                lines.append(customer)
                lines.append("Đã thanh toán")
            elif state == "unpaid":
                lines.append(customer)
                lines.append("Chưa thanh toán")
            elif state == "cancelled":
                lines.append("Đơn đã hủy")
            total = order.get("total_price")
            if total is not None:
                formatted_total = self._format_currency(total)
                if formatted_total:
                    lines.append(formatted_total)
        else:
            lines.append("Trống")
        tile.info_label.configure(text="\n".join(lines))

    def _format_currency(self, value):
        if value is None:
            return ""
        try:
            return f"{float(value):,.0f} VND"
        except (TypeError, ValueError):
            return str(value)

    def _normalize_table_key(self, value):
        if value is None:
            return ""
        return str(value).strip().lower()

    def _find_table_identifier(self, table_value):
        key = self._normalize_table_key(table_value)
        return self.table_lookup.get(key)

    def refresh_table_overview(self):
        if self._table_refresh_in_progress:
            self._table_pending_refresh = True
            return

        self._table_refresh_in_progress = True
        refresh_stamp = datetime.now().strftime("%H:%M:%S")
        if hasattr(self, "table_refresh_button"):
            self.table_refresh_button["state"] = "disabled"

        try:
            table_snapshot = self.order_manager.get_tables_overview()
        except Exception as exc:
            self.last_table_refresh_var.set(f"Lỗi cập nhật lúc {refresh_stamp}")
            messagebox.showerror("Lỗi", f"Không thể tải danh sách bàn: {exc}")
        else:
            table_states = {}
            for entry in self.table_settings:
                number = entry.get('number')
                if number is None:
                    continue
                table_states[str(number)] = None
            for entry in table_snapshot:
                table_number_value = entry.get('table_number')
                if not table_number_value:
                    continue
                identifier = self._find_table_identifier(table_number_value)
                if not identifier:
                    continue
                order_info = None
                if entry.get('is_occupied') and entry.get('current_order_id'):
                    order_info = {
                        'id': entry.get('current_order_id'),
                        'status': entry.get('order_status'),
                        'payment_status': entry.get('payment_status'),
                        'customer_name': entry.get('customer_name'),
                        'total_price': entry.get('total_price'),
                        'table_number': table_number_value,
                        'needs_assistance': entry.get('needs_assistance'),
                        'note': entry.get('note'),
                        'created_at': entry.get('created_at'),
                    }
                table_states[identifier] = order_info
            self.table_orders = table_states
            for identifier, tile in self.table_tiles.items():
                order = table_states.get(identifier)
                if not order:
                    self._set_tile_state(tile, 'empty', None)
                    continue
                status = (order.get('status') or '').lower()
                payment_status = (order.get('payment_status') or '').lower()
                if status == 'cancelled':
                    self._set_tile_state(tile, 'cancelled', order)
                elif payment_status == 'paid':
                    self._set_tile_state(tile, 'paid', order)
                else:
                    self._set_tile_state(tile, 'unpaid', order)
            self.last_table_refresh_var.set(f"Cập nhật lúc {refresh_stamp}")
        finally:
            self._table_refresh_in_progress = False
            if hasattr(self, "table_refresh_button"):
                self.table_refresh_button["state"] = "normal"
            self._schedule_table_auto_refresh()
            if self._table_pending_refresh:
                self._table_pending_refresh = False
                self.root.after(120, self.refresh_table_overview)

    def _schedule_table_auto_refresh(self):
        if self.table_auto_refresh_ms <= 0:
            return
        if self._table_auto_refresh_job is not None:
            try:
                self.root.after_cancel(self._table_auto_refresh_job)
            except Exception:
                pass
        self._table_auto_refresh_job = self.root.after(
            self.table_auto_refresh_ms,
            self._on_table_auto_refresh
        )

    def _on_table_auto_refresh(self):
        self.refresh_table_overview()

    def _on_table_double_click(self, identifier):
        order = self.table_orders.get(identifier)
        if not order:
            messagebox.showinfo("Thông báo", "Bàn hiện đang trống.")
            return
        payment_status = (order.get("payment_status") or '').lower()
        status = (order.get("status") or '').lower()
        if payment_status == 'paid':
            if messagebox.askyesno(
                "Bàn đã thanh toán",
                "Khách đã dùng xong bàn này? Chọn Yes để trả bàn về trạng thái trống."
            ):
                result = self.order_manager.update_order_details(order.get("id"), table_number="")
                if result is not None:
                    messagebox.showinfo("Thông báo", "Đã trả bàn về trạng thái trống.")
                    self.refresh_table_overview()
                else:
                    messagebox.showerror("Lỗi", "Không thể cập nhật trạng thái bàn.")
            return
        if status == 'cancelled':
            return
        self._open_table_order_detail(order.get("id"), identifier)

    def _open_table_order_detail(self, order_id, identifier):
        detail = self.order_manager.get_order(order_id)
        if not detail:
            messagebox.showerror("Lỗi", "Không thể lấy thông tin chi tiết đơn hàng.")
            return
        window = tk.Toplevel(self.root)
        window.title(f"Đơn #{order_id} - {self.table_name_map.get(identifier, identifier)}")
        window.geometry("520x520")
        window.grab_set()

        content = ttk.Frame(window, padding=10)
        content.pack(fill=tk.BOTH, expand=True)

        ttk.Label(content, text=f"Khách: {detail.get('customer_name', 'Khách')}", font=('Helvetica', 11, 'bold')).pack(anchor='w')
        ttk.Label(content, text=f"Trạng thái: {detail.get('status', '')}").pack(anchor='w')
        payment_status = (detail.get('payment_status') or 'unpaid').lower()
        ttk.Label(content, text=f"Thanh toán: {'Đã thanh toán' if payment_status == 'paid' else 'Chưa thanh toán'}").pack(anchor='w')
        ttk.Label(content, text=f"Tổng tiền: {self._format_currency(detail.get('total_price'))}").pack(anchor='w', pady=(0, 8))

        note = detail.get('note')
        if note:
            note_box = ttk.LabelFrame(content, text="Ghi chú", padding=8)
            note_box.pack(fill=tk.X, pady=(0, 10))
            ttk.Label(note_box, text=note, wraplength=460, justify=tk.LEFT).pack(anchor='w')

        items_frame = ttk.LabelFrame(content, text="Món đã gọi", padding=6)
        items_frame.pack(fill=tk.BOTH, expand=True)
        columns = ("name", "quantity", "price", "total")
        tree = ttk.Treeview(items_frame, columns=columns, show='headings', height=8)
        headings = {"name": "Món", "quantity": "SL", "price": "Đơn giá", "total": "Thành tiền"}
        for key in columns:
            tree.heading(key, text=headings[key])
        tree.column("name", width=220)
        tree.column("quantity", width=60, anchor=tk.CENTER)
        tree.column("price", width=100, anchor=tk.E)
        tree.column("total", width=120, anchor=tk.E)
        tree.pack(fill=tk.BOTH, expand=True)
        for item in detail.get('items', []):
            name = item.get('name') or f"#{item.get('product_id', '')}"
            qty = item.get('quantity') or 0
            price = item.get('price') or 0
            try:
                price_value = float(price)
            except (TypeError, ValueError):
                price_value = 0.0
            try:
                qty_value = float(qty)
            except (TypeError, ValueError):
                qty_value = 0.0
            line_total = price_value * qty_value
            tree.insert('', tk.END, values=(name, qty, f"{price_value:,.0f} VND", f"{line_total:,.0f} VND"))

        button_frame = ttk.Frame(content)
        button_frame.pack(fill=tk.X, pady=(10, 0))
        ttk.Button(button_frame, text="Đóng", command=window.destroy).pack(side=tk.RIGHT)
        mark_paid_btn = ttk.Button(button_frame, text="Đã thanh toán (tiền mặt)", command=lambda: self._mark_order_paid(order_id, window))
        if payment_status == 'paid':
            mark_paid_btn.state(['disabled'])
        mark_paid_btn.pack(side=tk.RIGHT, padx=6)

    def _mark_order_paid(self, order_id, window):
        if not messagebox.askyesno("Xác nhận", "Bạn chắc chắn muốn đánh dấu đơn hàng đã thanh toán?"):
            return
        if self.order_manager.update_payment_status(order_id, "paid"):
            messagebox.showinfo("Thành công", "Đơn hàng đã được đánh dấu đã thanh toán.")
            if window is not None:
                window.destroy()
            self.refresh_table_overview()
        else:
            messagebox.showerror("Lỗi", "Không thể cập nhật trạng thái thanh toán.")

def main():
    root = tk.Tk()
    app = StoreGUI(root)
    root.mainloop()

if __name__ == "__main__":
    main()
