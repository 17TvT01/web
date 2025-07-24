from database import Database
from mysql.connector import Error

class OrderManager:
    def __init__(self):
        try:
            self.db = Database()
        except Exception as e:
            print(f"Error initializing OrderManager: {e}")
            raise

    def ensure_connection(self):
        self.db.reconnect_if_needed()

    def add_order(self, customer_name, items, total_price, status='pending'):
        """
        Add a new order.
        :param customer_name: str
        :param items: list of dicts, each with product_id and quantity
        :param total_price: float
        :param status: str, e.g. 'pending', 'completed', 'cancelled'
        :return: order_id or None
        """
        try:
            self.ensure_connection()
            
            # Validate input
            if not customer_name or not customer_name.strip():
                raise ValueError("Tên khách hàng không được để trống")
            
            if not items or len(items) == 0:
                raise ValueError("Đơn hàng phải có ít nhất một sản phẩm")
            
            if total_price is None or total_price < 0:
                raise ValueError("Tổng giá không hợp lệ")
            
            # Validate items
            for item in items:
                if not isinstance(item, dict):
                    raise ValueError("Mỗi item phải là dictionary")
                if 'product_id' not in item or 'quantity' not in item:
                    raise ValueError("Mỗi item phải có product_id và quantity")
                if not isinstance(item['product_id'], int) or item['product_id'] <= 0:
                    raise ValueError("product_id phải là số nguyên dương")
                if not isinstance(item['quantity'], int) or item['quantity'] <= 0:
                    raise ValueError("quantity phải là số nguyên dương")
            
            # Check if products exist
            for item in items:
                self.db.cursor.execute("SELECT id FROM products WHERE id = %s", (item['product_id'],))
                if not self.db.cursor.fetchone():
                    raise ValueError(f"Sản phẩm với ID {item['product_id']} không tồn tại")

            next_id = self.db.get_next_id(table='orders')
            if next_id is None:
                raise Exception("Không thể tạo ID đơn hàng")

            sql = '''INSERT INTO orders (id, customer_name, total_price, status) 
                     VALUES (%s, %s, %s, %s)'''
            values = (next_id, customer_name.strip(), float(total_price), status)
            self.db.cursor.execute(sql, values)

            # Insert order items
            item_sql = '''INSERT INTO order_items (order_id, product_id, quantity) VALUES (%s, %s, %s)'''
            item_values = [(next_id, int(item['product_id']), int(item['quantity'])) for item in items]
            self.db.cursor.executemany(item_sql, item_values)

            self.db.conn.commit()
            print(f"Đơn hàng được tạo thành công với ID: {next_id}")
            return next_id
        except ValueError as e:
            print(f"Lỗi validation: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return None
        except Error as e:
            print(f"Lỗi database khi thêm đơn hàng: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return None
        except Exception as e:
            print(f"Lỗi không xác định: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return None

    def update_order_status(self, order_id, status):
        """
        Update the status of an order.
        :param order_id: int
        :param status: str
        :return: True if success else False
        """
        try:
            self.ensure_connection()
            sql = "UPDATE orders SET status = %s WHERE id = %s"
            self.db.cursor.execute(sql, (status, order_id))
            self.db.conn.commit()
            print(f"Order {order_id} status updated to {status}")
            return True
        except Error as e:
            print(f"Error updating order status: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return False

    def get_order(self, order_id):
        """
        Get order details including items.
        :param order_id: int
        :return: dict or None
        """
        try:
            self.ensure_connection()
            sql = '''SELECT * FROM orders WHERE id = %s'''
            self.db.cursor.execute(sql, (order_id,))
            order = self.db.cursor.fetchone()
            if not order:
                return None

            columns = [desc[0] for desc in self.db.cursor.description]
            order_dict = dict(zip(columns, order))

            # Get order items
            item_sql = '''SELECT oi.product_id, oi.quantity, p.name FROM order_items oi
                          JOIN products p ON oi.product_id = p.id
                          WHERE oi.order_id = %s'''
            self.db.cursor.execute(item_sql, (order_id,))
            items = self.db.cursor.fetchall()
            item_columns = [desc[0] for desc in self.db.cursor.description]
            order_dict['items'] = [dict(zip(item_columns, item)) for item in items]

            return order_dict
        except Error as e:
            print(f"Error getting order: {e}")
            return None

    def get_all_orders(self, status=None):
        """
        Get all orders, optionally filtered by status.
        :param status: str or None
        :return: list of dicts
        """
        try:
            self.ensure_connection()
            sql = '''SELECT * FROM orders'''
            params = ()
            if status:
                sql += ' WHERE status = %s'
                params = (status,)
            sql += ' ORDER BY id DESC'
            self.db.cursor.execute(sql, params)
            orders = self.db.cursor.fetchall()
            columns = [desc[0] for desc in self.db.cursor.description]
            orders_list = [dict(zip(columns, order)) for order in orders]
            return orders_list
        except Error as e:
            print(f"Error getting orders: {e}")
            return []

    def delete_order(self, order_id):
        """
        Delete an order and its items.
        :param order_id: int
        :return: True if success else False
        """
        try:
            self.ensure_connection()
            self.db.cursor.execute("DELETE FROM order_items WHERE order_id = %s", (order_id,))
            self.db.cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
            self.db.conn.commit()
            print(f"Order {order_id} deleted successfully")
            return True
        except Error as e:
            print(f"Error deleting order: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return False
