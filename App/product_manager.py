from database import Database
from mysql.connector import Error
import os
import json

class ProductManager:
    def __init__(self):
        try:
            self.db = Database()
        except Exception as e:
            print(f"Error initializing ProductManager: {e}")
            raise

    def ensure_connection(self):
        self.db.reconnect_if_needed()

    def _extract_attributes_from_text(self, name, description):
        # Đơn giản hóa việc trích xuất thuộc tính
        attributes = {
            'name': [name],
            'keywords': []
        }
        
        # Thêm từ khóa từ mô tả nếu có
        if description:
            keywords = [word.strip() for word in description.split() if len(word.strip()) > 2]
            attributes['keywords'] = keywords[:5]  # Giới hạn 5 từ khóa
            
        return attributes

    def _parse_ai_keys_field(self, raw):
        """Return normalized list of ai_keys from assorted storage formats."""
        keys = []
        if not raw:
            return keys
        if isinstance(raw, (list, tuple, set)):
            for item in raw:
                item_str = str(item).strip()
                if item_str:
                    keys.append(item_str)
            return keys
        if isinstance(raw, str):
            candidate = raw.strip()
            if not candidate:
                return keys
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError:
                for token in candidate.replace(';', ',').split(','):
                    token = token.strip()
                    if token:
                        keys.append(token)
                if not keys:
                    keys.append(candidate)
                return keys
            else:
                if isinstance(parsed, str):
                    parsed = [parsed]
                if isinstance(parsed, (list, tuple, set)):
                    for item in parsed:
                        item_str = str(item).strip()
                        if item_str:
                            keys.append(item_str)
                return keys
        item_str = str(raw).strip()
        if item_str:
            keys.append(item_str)
        return keys

    def _attach_filters(self, product):
        """Populate product['filters'] with normalized ai_keys when available."""
        ai_keys = set()

        attrs = product.get('attributes')
        if isinstance(attrs, dict):
            raw_attr_keys = attrs.get('ai_keys')
            for item in self._parse_ai_keys_field(raw_attr_keys):
                ai_keys.add(item)

        if 'ai_keys' in product:
            for item in self._parse_ai_keys_field(product.get('ai_keys')):
                ai_keys.add(item)

        if ai_keys:
            product['filters'] = {'ai_keys': sorted(ai_keys)}
        elif 'filters' in product:
            product['filters'].pop('ai_keys', None)
            if not product['filters']:
                product.pop('filters', None)
        return product

    def _update_product_ai_keys(self, product_id, attributes):
        """Persist ai_keys list to products.ai_keys column for faster lookups."""
        try:
            keys = []
            if isinstance(attributes, dict) and 'ai_keys' in attributes:
                keys = [item.strip() for item in self._parse_ai_keys_field(attributes.get('ai_keys')) if item.strip()]
            keys_json = json.dumps(sorted(set(keys))) if keys else None
            self.db.cursor.execute("UPDATE products SET ai_keys = %s WHERE id = %s", (keys_json, product_id))
        except Error as e:
            print(f"Warning: Could not update ai_keys for product {product_id}: {e}")

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
            extracted_attrs = self._extract_attributes_from_text(name, description)

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

            self._update_product_ai_keys(next_id, attributes)
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
                extracted_attrs = self._extract_attributes_from_text(updated_name, updated_description)
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
            else:
                self.db.cursor.execute(
                    "DELETE FROM product_attributes WHERE product_id = %s",
                    (product_id,)
                )

            self._update_product_ai_keys(product_id, attributes)
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
            
            # Parse attributes
            if product['attributes']:
                attrs = {}
                for attr in product['attributes'].split('|'):
                    attr_type, attr_value = attr.split(':')
                    if attr_type not in attrs:
                        attrs[attr_type] = []
                    attrs[attr_type].append(attr_value)
                product['attributes'] = attrs

            self._attach_filters(product)
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
                
                # Parse attributes
                if product['attributes']:
                    attrs = {}
                    for attr in product['attributes'].split('|'):
                        attr_type, attr_value = attr.split(':')
                        if attr_type not in attrs:
                            attrs[attr_type] = []
                        attrs[attr_type].append(attr_value)
                    product['attributes'] = attrs

                self._attach_filters(product)
                products.append(product)
                
            return products
            
        except Error as e:
            print(f"Lỗi khi lấy sản phẩm từ database: {e}")
            return []

    def get_filter_options(self, category=None):
        """Return sorted unique ai_keys available for the given category."""
        try:
            self.ensure_connection()
            keys = set()

            attr_sql = (
                "SELECT DISTINCT pa.attribute_value "
                "FROM product_attributes pa "
                "JOIN products p ON pa.product_id = p.id "
                "WHERE pa.attribute_type = %s"
            )
            params = ['ai_keys']
            if category:
                attr_sql += " AND p.category = %s"
                params.append(category)
            self.db.cursor.execute(attr_sql, tuple(params))
            for (value,) in self.db.cursor.fetchall():
                value = (value or '').strip()
                if value:
                    keys.add(value)

            col_sql = "SELECT ai_keys FROM products"
            col_params = []
            if category:
                col_sql += " WHERE category = %s"
                col_params.append(category)
            self.db.cursor.execute(col_sql, tuple(col_params))
            for (raw,) in self.db.cursor.fetchall():
                for item in self._parse_ai_keys_field(raw):
                    if item:
                        keys.add(item)

            return sorted(keys)
        except Error as e:
            print(f"Error fetching filter options: {e}")
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
                
                # Parse attributes
                if product['attributes']:
                    attrs = {}
                    for attr in product['attributes'].split('|'):
                        attr_type, attr_value = attr.split(':')
                        if attr_type not in attrs:
                            attrs[attr_type] = []
                        attrs[attr_type].append(attr_value)
                    product['attributes'] = attrs

                self._attach_filters(product)
                products.append(product)
                
            return products
            
        except Error as e:
            print(f"Error searching products: {e}")
            return []

    def close(self):
        if self.db:
            self.db.close()