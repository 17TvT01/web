# Store Management Application

Ứng dụng quản lý cửa hàng sử dụng Python và MySQL.

## Yêu cầu hệ thống

- Python 3.7+
- MySQL Server
- Các thư viện Python trong `requirements.txt`

## Cài đặt

1. Cài đặt MySQL và tạo database:
```sql
CREATE DATABASE web_store;
```

2. Thiết lập môi trường Python:
```bash
# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Cài đặt thư viện
pip install -r requirements.txt
```

3. Cấu hình database:
- Mở file `database.py`
- Cập nhật thông tin kết nối MySQL:
```python
self.conn = mysql.connector.connect(
    host='localhost',
    user='root',      # Thay đổi username
    password='',      # Thay đổi password
    database='web_store'
)
```

## Sử dụng

Chạy ứng dụng:
```bash
python main.py
```

### Các chức năng

1. **Xem tất cả sản phẩm**
   - Hiển thị danh sách đầy đủ sản phẩm
   - Thông tin chi tiết và thuộc tính

2. **Xem theo danh mục**
   - Bánh kem
   - Đồ ăn
   - Đồ uống

3. **Tìm kiếm sản phẩm**
   - Tìm theo tên hoặc mô tả
   - Kết quả có đầy đủ thông tin

4. **Thêm sản phẩm mới**
   - Nhập thông tin cơ bản:
     + Tên
     + Giá
     + Danh mục
     + Mô tả
     + URL hình ảnh
   - Thuộc tính riêng cho bánh kem:
     + Dịp sử dụng
     + Hương vị
     + Thành phần
     + Kích thước

5. **Xóa sản phẩm**
   - Xóa theo ID
   - Tự động xóa các thuộc tính liên quan

## Cấu trúc Database

### Bảng products
- id (primary key)
- name
- price
- category (cake/food/drink)
- description
- image_url
- is_available
- created_at

### Bảng product_attributes
- id (primary key)
- product_id (foreign key)
- attribute_type
- attribute_value

## Ví dụ sử dụng

### Thêm sản phẩm mới:
```
=== Add New Product ===
Enter product name: Bánh sinh nhật chocolate
Enter price: 350000
Select category:
1. Cake
2. Food
3. Drink
Enter category (1-3): 1
Enter description: Bánh chocolate 2 tầng
Enter image URL: /images/chocolate-cake.jpg

Add cake attributes:
Enter occasions: Sinh nhật, Kỷ niệm
Enter flavors: Chocolate, Vanilla
Enter main ingredients: Chocolate, Cream
Enter available sizes: 6 người, 8 người
```

### Tìm kiếm sản phẩm:
```
Enter search keyword: chocolate
=== Search Results for 'chocolate' ===
ID: 1
Name: Bánh sinh nhật chocolate
Price: $350.00
Category: Cake
Description: Bánh chocolate 2 tầng
Image URL: /images/chocolate-cake.jpg
Attributes:
  Occasion: Sinh nhật, Kỷ niệm
  Flavor: Chocolate, Vanilla
  Ingredient: Chocolate, Cream
  Size: 6 người, 8 người
## Ung dung bo sung cho quy trinh moi

### Nhan vien phuc vu (`App/staff_app/app.py`)
- Man hinh danh sach don hang theo trang thai (`pending`, `confirmed`, `sent_to_kitchen`, `completed`, `served`, `cancelled`).
- Cho phep xac nhan, chinh sua mon an, gui xuong bep, danh dau da phuc vu va hien QR thanh toan.
- Cach chay:
  ```bash
  cd App
  python -m staff_app.app
  ```

### Bep (`App/kitchen_app/app.py`)
- Hien cac don o cac trang thai cho bep (`sent_to_kitchen`, `processing`, `completed`, `cancelled`).
- Cap nhat trang thai bang cac nut: "Chua xu ly", "Dang xu ly", "Hoan thanh", "Da huy".
- Nhan doi vao mon de xem chi tiet tuy chon cua khach hang.
- Cach chay:
  ```bash
  cd App
  python -m kitchen_app.app
  ```

- Danh sach ban hien thi trong tab Quan ly don hang duoc dinh nghia trong `App/config/tables.json`. Chinh sua file nay de cap nhat so ban hoac ten ban.

### API bo sung
- `PUT /orders/<id>/items`: Cap nhat mon an hoac thong tin ban.
- `POST /orders/<id>/confirm`: Nhan vien xac nhan don.
- `POST /orders/<id>/send-to-kitchen`: Day don xuong bep.
- `POST /orders/<id>/status`: Cap nhat cac trang thai (bao gom `served` tao QR thanh toan).
- `GET /orders/<id>/qr`: Lay du lieu QR thanh toan.

