import json
from database import Database
from mysql.connector import Error
import os

class ProductManager:
    def __init__(self):
        try:
            self.db = Database()
        except Exception as e:
            print(f"Error initializing ProductManager: {e}")
            raise

    def ensure_connection(self):
        self.db.reconnect_if_needed()

    def _extract_attributes_from_text(self, name, description, category):
        # Đơn giản hóa việc trích xuất thuộc tính
        attributes = {
            'name': [name],
            'keywords': []
        }
        
        # Thêm từ khóa từ mô tả nếu có
        if description:
            keywords = [word.strip() for word in description.split() if len(word.strip()) > 2]
            attributes['keywords'] = keywords[:5]  # Giới hạn 5 từ khóa

        # TODO: Nâng cao: tích hợp AI hoặc thuật toán để tạo key lọc tự động
        # Ví dụ: gọi API AI để phân tích name và description, trích xuất các từ khóa quan trọng
        # Kết quả trả về có thể là một danh sách từ khóa hoặc các nhãn (tags) phù hợp

        # Giả lập kết quả AI (ví dụ tạm thời)
        ai_generated_keys = self._ai_generate_filter_keys(name, description, category)
        if ai_generated_keys:
            if 'ai_keys' not in attributes:
                attributes['ai_keys'] = []
            for key in ai_generated_keys:
                if key not in attributes['ai_keys']:
                    attributes['ai_keys'].append(key)
            
        return attributes

    def _ai_generate_filter_keys(self, name, description, category):
        """
        Tạo các key lọc tự động dựa trên tên, mô tả và danh mục sản phẩm.
        Đây là phiên bản nâng cao, tạo bộ lọc chi tiết cho từng loại sản phẩm.
        """
        keys = []
        text = f"{name} {description}".lower() if description else name.lower()

        # Bộ lọc chung cho tất cả sản phẩm
        common_filters = {
            'khuyến mãi': ['khuyến mãi', 'giảm giá', 'sale'],
            'mới': ['mới', 'new'],
            'bán chạy': ['bán chạy', 'best seller', 'hot']
        }
        for key, keywords in common_filters.items():
            if any(keyword in text for keyword in keywords):
                keys.append(key)

        # Bộ lọc riêng cho từng danh mục
        if category == 'cake':
            cake_filters = {
                'socola': ['socola', 'chocolate'],
                'vani': ['vani', 'vanilla'],
                'dâu': ['dâu', 'strawberry'],
                'matcha': ['matcha', 'trà xanh'],
                'tiramisu': ['tiramisu'],
                'cupcake': ['cupcake'],
                'sinh nhật': ['sinh nhật', 'birthday'],
                'ít ngọt': ['ít ngọt', 'less sugar'],
            }
            for key, keywords in cake_filters.items():
                if any(keyword in text for keyword in keywords):
                    keys.append(key)

        elif category == 'drink':
            drink_filters = {
                'trà sữa': ['trà sữa', 'milk tea'],
                'cà phê': ['cà phê', 'coffee'],
                'nước ép': ['nước ép', 'juice'],
                'sinh tố': ['sinh tố', 'smoothie'],
                'trân châu': ['trân châu', 'pearl', 'bubble'],
                'đá xay': ['đá xay', 'ice blended'],
                'ít đá': ['ít đá'],
                'ít ngọt': ['ít ngọt'],
            }
            for key, keywords in drink_filters.items():
                if any(keyword in text for keyword in keywords):
                    keys.append(key)

        elif category == 'food':
            food_filters = {
                'món chính': ['cơm', 'phở', 'bún', 'mì'],
                'ăn vặt': ['ăn vặt', 'snack', 'khoai tây chiên'],
                'cay': ['cay', 'spicy'],
                'không cay': ['không cay'],
            }
            for key, keywords in food_filters.items():
                if any(keyword in text for keyword in keywords):
                    keys.append(key)
        
        # Loại bỏ các key trùng lặp
        return list(set(keys))


    def add_product(self, name, price, category, quantity=0, description=None, image_url=None, attributes=None):
        try:
            self.ensure_connection()
            
            # Get next available ID
            next_id = self.db.get_next_id()
            if next_id is None:
                raise Exception("Could not generate product ID")

            # Insert product with specific ID
            sql = '''INSERT INTO products (id, name, price, category, quantity, description, image_url) 
                    VALUES (%s, %s, %s, %s, %s, %s, %s)'''
            values = (next_id, name, price, category, quantity, description, image_url)
            
            self.db.cursor.execute(sql, values)
            
            # Extract attributes from name and description
            extracted_attrs = self._extract_attributes_from_text(name, description, category)

            # Merge extracted attributes with manually provided attributes
            if attributes is None:
                attributes = {}
            elif not isinstance(attributes, dict):
                print("Warning: Provided attributes are not a dictionary. Ignoring.")
                attributes = {}

            for attr_type, values in extracted_attrs.items():
                if attr_type not in attributes:
                    attributes[attr_type] = []
                for value in values:
                    if value not in attributes[attr_type]: # Avoid duplicates
                        attributes[attr_type].append(value)

            if attributes:
                attr_sql = '''INSERT INTO product_attributes 
                            (product_id, attribute_type, attribute_value) 
                            VALUES (%s, %s, %s)'''
                
                attr_values = []
                for attr_type, values in attributes.items():
                    if isinstance(values, str):
                        values = [values]
                    for value in values:
                        if value and isinstance(value, str):
                            attr_values.append((next_id, attr_type, value.strip()))
                
                if attr_values:
                    self.db.cursor.executemany(attr_sql, attr_values)
            
            self.db.conn.commit()
            print(f"Product added successfully with ID: {next_id}")
            return next_id
            
        except Error as e:
            print(f"Error adding product: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return None

    def update_product(self, product_id, name=None, price=None, category=None, 
                      quantity=None, description=None, image_url=None, attributes=None):
        try:
            self.ensure_connection()
            
            # Update product details
            update_fields = []
            values = []
            
            if name is not None:
                update_fields.append("name = %s")
                values.append(name)
            if price is not None:
                update_fields.append("price = %s")
                values.append(price)
            if category is not None:
                update_fields.append("category = %s")
                values.append(category)
            if quantity is not None:
                update_fields.append("quantity = %s")
                values.append(quantity)
            if description is not None:
                update_fields.append("description = %s")
                values.append(description)
            if image_url is not None:
                update_fields.append("image_url = %s")
                values.append(image_url)
                
            if update_fields:
                sql = f"UPDATE products SET {', '.join(update_fields)} WHERE id = %s"
                values.append(product_id)
                self.db.cursor.execute(sql, tuple(values))
                
            # Extract attributes from name and description if they are being updated
            current_product = self.get_product(product_id)
            if current_product:
                updated_name = name if name is not None else current_product.get('name')
                updated_description = description if description is not None else current_product.get('description')
                updated_category = category if category is not None else current_product.get('category')
                extracted_attrs = self._extract_attributes_from_text(updated_name, updated_description, updated_category)
            else:
                extracted_attrs = {}

            # Merge extracted attributes with manually provided attributes
            if attributes is None:
                attributes = {}
            elif not isinstance(attributes, dict):
                print("Warning: Provided attributes are not a dictionary. Ignoring.")
                attributes = {}

            for attr_type, values in extracted_attrs.items():
                if attr_type not in attributes:
                    attributes[attr_type] = []
                for value in values:
                    if value not in attributes[attr_type]: # Avoid duplicates
                        attributes[attr_type].append(value)

            if attributes:
                # Delete existing attributes
                self.db.cursor.execute(
                    "DELETE FROM product_attributes WHERE product_id = %s",
                    (product_id,)
                )
                
                # Insert new attributes
                attr_sql = '''INSERT INTO product_attributes 
                            (product_id, attribute_type, attribute_value) 
                            VALUES (%s, %s, %s)'''
                
                attr_values = []
                for attr_type, values in attributes.items():
                    if isinstance(values, str):
                        values = [values]
                    for value in values:
                        if value and isinstance(value, str):
                            attr_values.append((product_id, attr_type, value.strip()))
                
                if attr_values:
                    self.db.cursor.executemany(attr_sql, attr_values)
            
            self.db.conn.commit()
            print(f"Product {product_id} updated successfully")
            return True
            
        except Error as e:
            print(f"Error updating product: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return False

    def get_product(self, product_id):
        try:
            self.ensure_connection()
            
            # Get product details
            sql = '''SELECT p.*, GROUP_CONCAT(
                        CONCAT(pa.attribute_type, ':', pa.attribute_value)
                        SEPARATOR '|'
                    ) as attributes
                    FROM products p
                    LEFT JOIN product_attributes pa ON p.id = pa.product_id
                    WHERE p.id = %s
                    GROUP BY p.id'''
            
            self.db.cursor.execute(sql, (product_id,))
            result = self.db.cursor.fetchone()
            
            if not result:
                return None
                
            # Convert result to dictionary
            columns = [desc[0] for desc in self.db.cursor.description]
            product = dict(zip(columns, result))
            
            # Parse attributes into filters and options
            raw_attributes = product.pop('attributes', None)
            filters = {}
            product['options'] = []

            if raw_attributes:
                for attr in raw_attributes.split('|'):
                    try:
                        attr_type, attr_value = attr.split(':', 1)
                        if attr_type == 'options':
                            product['options'] = json.loads(attr_value)
                        else:
                            if attr_type not in filters:
                                filters[attr_type] = []
                            filters[attr_type].append(attr_value)
                    except ValueError:
                        print(f"Warning: Malformed attribute string '{attr}' for product {product['id']}")
                    except json.JSONDecodeError:
                        print(f"Warning: Could not decode options JSON for product {product['id']}")
            
            product['filters'] = filters
            
            return product
            
        except Error as e:
            print(f"Error getting product: {e}")
            return None

    def get_all_products(self, category=None):
        try:
            print("Đang kết nối database để lấy sản phẩm...")
            self.ensure_connection()
            print("Đã kết nối database thành công")
            
            # Base query
            sql = '''SELECT p.*, GROUP_CONCAT(
                        CONCAT(pa.attribute_type, ':', pa.attribute_value)
                        SEPARATOR '|'
                    ) as attributes
                    FROM products p
                    LEFT JOIN product_attributes pa ON p.id = pa.product_id'''
            
            if category:
                sql += ' WHERE p.category = %s'
            
            sql += ' GROUP BY p.id ORDER BY p.id'  # Add ORDER BY to maintain ID sequence
            
            if category:
                self.db.cursor.execute(sql, (category,))
            else:
                self.db.cursor.execute(sql)
                
            results = self.db.cursor.fetchall()
            print(f"Đã tìm thấy {len(results)} sản phẩm")
            
            # Convert results to list of dictionaries
            columns = [desc[0] for desc in self.db.cursor.description]
            products = []
            
            for result in results:
                product = dict(zip(columns, result))
                
                # Parse attributes into filters and options
                raw_attributes = product.pop('attributes', None)
                filters = {}
                product['options'] = []

                if raw_attributes:
                    for attr in raw_attributes.split('|'):
                        try:
                            attr_type, attr_value = attr.split(':', 1)
                            if attr_type == 'options':
                                # Assuming options are stored as a JSON string
                                product['options'] = json.loads(attr_value)
                            else:
                                if attr_type not in filters:
                                    filters[attr_type] = []
                                filters[attr_type].append(attr_value)
                        except ValueError:
                            print(f"Warning: Malformed attribute string '{attr}' for product {product['id']}")
                        except json.JSONDecodeError:
                             print(f"Warning: Could not decode options JSON for product {product['id']}")

                product['filters'] = filters
                products.append(product)
                
            return products
            
        except Error as e:
            print(f"Lỗi khi lấy sản phẩm từ database: {e}")
            return []

    def delete_product(self, product_id):        
        try:
            self.ensure_connection()
            
            # Lấy thông tin sản phẩm trước khi xóa để có đường dẫn hình ảnh
            product = self.get_product(product_id)
            image_path = product.get('image_url') if product else None
            
            # Xóa sản phẩm từ cơ sở dữ liệu
            sql = 'DELETE FROM products WHERE id = %s'
            self.db.cursor.execute(sql, (product_id,))
            self.db.conn.commit()
            
            rows_affected = self.db.cursor.rowcount
            if rows_affected > 0:
                print(f"Product {product_id} deleted successfully")
                
                # Xóa tệp hình ảnh nếu tồn tại
                if image_path and os.path.exists(image_path):
                    try:
                        os.remove(image_path)
                        print(f"Image file {image_path} deleted successfully")
                    except Exception as e:
                        print(f"Error deleting image file: {e}")
                        
            return rows_affected > 0
            
        except Error as e:
            print(f"Error deleting product: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return False

    def search_products(self, keyword):
        try:
            self.ensure_connection()
            
            sql = '''SELECT p.*, GROUP_CONCAT(
                        CONCAT(pa.attribute_type, ':', pa.attribute_value)
                        SEPARATOR '|'
                    ) as attributes
                    FROM products p
                    LEFT JOIN product_attributes pa ON p.id = pa.product_id
                    WHERE p.name LIKE %s OR p.description LIKE %s
                    GROUP BY p.id
                    ORDER BY p.id'''
            
            search_term = f'%{keyword}%'
            self.db.cursor.execute(sql, (search_term, search_term))
            results = self.db.cursor.fetchall()
            
            # Convert results to list of dictionaries
            columns = [desc[0] for desc in self.db.cursor.description]
            products = []
            
            for result in results:
                product = dict(zip(columns, result))
                
                # Parse attributes into filters and options
                raw_attributes = product.pop('attributes', None)
                filters = {}
                product['options'] = []

                if raw_attributes:
                    for attr in raw_attributes.split('|'):
                        try:
                            attr_type, attr_value = attr.split(':', 1)
                            if attr_type == 'options':
                                # Assuming options are stored as a JSON string
                                product['options'] = json.loads(attr_value)
                            else:
                                if attr_type not in filters:
                                    filters[attr_type] = []
                                filters[attr_type].append(attr_value)
                        except ValueError:
                            print(f"Warning: Malformed attribute string '{attr}' for product {product['id']}")
                        except json.JSONDecodeError:
                             print(f"Warning: Could not decode options JSON for product {product['id']}")

                product['filters'] = filters
                products.append(product)
                
            return products
            
        except Error as e:
            print(f"Error searching products: {e}")
            return []

    def close(self):
        if self.db:
            self.db.close()

    def get_all_products(self, category=None, filters=None):
        try:
            print("Đang kết nối database để lấy sản phẩm...")
            self.ensure_connection()
            print("Đã kết nối database thành công")
            
            # Base query
            sql = '''SELECT p.*, GROUP_CONCAT(
                        CONCAT(pa.attribute_type, ':', pa.attribute_value)
                        SEPARATOR '|'
                    ) as attributes
                    FROM products p
                    LEFT JOIN product_attributes pa ON p.id = pa.product_id'''
            
            conditions = []
            params = []

            if category:
                conditions.append('p.category = %s')
                params.append(category)

            if filters:
                for filter_type, filter_value in filters.items():
                    conditions.append('pa.attribute_type = %s AND pa.attribute_value = %s')
                    params.extend([filter_type, filter_value])
            
            if conditions:
                sql += ' WHERE ' + ' AND '.join(conditions)
            
            sql += ' GROUP BY p.id ORDER BY p.id'  # Add ORDER BY to maintain ID sequence
            
            if params:
                self.db.cursor.execute(sql, tuple(params))
            else:
                self.db.cursor.execute(sql)
                
            results = self.db.cursor.fetchall()
            print(f"Đã tìm thấy {len(results)} sản phẩm")
            
            # Convert results to list of dictionaries
            columns = [desc[0] for desc in self.db.cursor.description]
            products = []
            
            for result in results:
                product = dict(zip(columns, result))
                
                # Parse attributes into filters and options
                raw_attributes = product.pop('attributes', None)
                filters = {}
                product['options'] = []

                if raw_attributes:
                    for attr in raw_attributes.split('|'):
                        try:
                            attr_type, attr_value = attr.split(':', 1)
                            if attr_type == 'options':
                                # Assuming options are stored as a JSON string
                                product['options'] = json.loads(attr_value)
                            else:
                                if attr_type not in filters:
                                    filters[attr_type] = []
                                filters[attr_type].append(attr_value)
                        except ValueError:
                            print(f"Warning: Malformed attribute string '{attr}' for product {product['id']}")
                        except json.JSONDecodeError:
                             print(f"Warning: Could not decode options JSON for product {product['id']}")

                product['filters'] = filters
                products.append(product)
                
            return products
            
        except Error as e:
            print(f"Lỗi khi lấy sản phẩm từ database: {e}")
            return []
