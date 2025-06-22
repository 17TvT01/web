from database import Database
from mysql.connector import Error

class ProductManager:
    def __init__(self):
        self.db = Database()

    def add_product(self, name, price, category, description=None, image_url=None, attributes=None):
        try:
            # Validate inputs
            if not isinstance(name, str) or not name.strip():
                raise ValueError("Invalid product name")
            
            if not isinstance(price, (int, float)) or price < 0:
                raise ValueError("Invalid price")
            
            if category not in ['cake', 'food', 'drink']:
                raise ValueError("Invalid category")

            # Insert product
            sql = '''INSERT INTO products (name, price, category, description, image_url) 
                    VALUES (%s, %s, %s, %s, %s)'''
            values = (name, price, category, description, image_url)
            
            self.db.cursor.execute(sql, values)
            product_id = self.db.cursor.lastrowid
            
            # Insert attributes if provided
            if attributes and isinstance(attributes, dict) and product_id:
                attr_sql = '''INSERT INTO product_attributes 
                            (product_id, attribute_type, attribute_value) 
                            VALUES (%s, %s, %s)'''
                
                attr_values = []
                for attr_type, values in attributes.items():
                    # Ensure values is a list
                    if isinstance(values, str):
                        values = [values]
                    for value in values:
                        if value and isinstance(value, str):
                            attr_values.append((product_id, attr_type, value.strip()))
                
                if attr_values:
                    self.db.cursor.executemany(attr_sql, attr_values)
            
            self.db.conn.commit()
            print(f"Product added successfully with ID: {product_id}")  # Debug log
            return product_id

        except Error as e:
            print(f"Database error in add_product: {e}")  # Debug log
            self.db.conn.rollback()
            return None
        except Exception as e:
            print(f"Error in add_product: {e}")  # Debug log
            self.db.conn.rollback()
            return None

    def get_product(self, product_id):
        try:
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
            
            return product
        except Error as e:
            print(f"Database error in get_product: {e}")  # Debug log
            return None

    def get_all_products(self, category=None):
        try:
            # Base query
            sql = '''SELECT p.*, GROUP_CONCAT(
                        CONCAT(pa.attribute_type, ':', pa.attribute_value)
                        SEPARATOR '|'
                    ) as attributes
                    FROM products p
                    LEFT JOIN product_attributes pa ON p.id = pa.product_id'''
            
            # Add category filter if provided
            if category:
                sql += ' WHERE p.category = %s'
            
            sql += ' GROUP BY p.id'
            
            # Execute query
            if category:
                self.db.cursor.execute(sql, (category,))
            else:
                self.db.cursor.execute(sql)
                
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
                    
                products.append(product)
                
            return products
        except Error as e:
            print(f"Database error in get_all_products: {e}")  # Debug log
            return []

    def delete_product(self, product_id):
        try:
            sql = 'DELETE FROM products WHERE id = %s'
            self.db.cursor.execute(sql, (product_id,))
            self.db.conn.commit()
            return self.db.cursor.rowcount > 0
        except Error as e:
            print(f"Database error in delete_product: {e}")  # Debug log
            self.db.conn.rollback()
            return False

    def search_products(self, keyword):
        try:
            sql = '''SELECT p.*, GROUP_CONCAT(
                        CONCAT(pa.attribute_type, ':', pa.attribute_value)
                        SEPARATOR '|'
                    ) as attributes
                    FROM products p
                    LEFT JOIN product_attributes pa ON p.id = pa.product_id
                    WHERE p.name LIKE %s OR p.description LIKE %s
                    GROUP BY p.id'''
            
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
                    
                products.append(product)
                
            return products
        except Error as e:
            print(f"Database error in search_products: {e}")  # Debug log
            return []

    def close(self):
        self.db.close()