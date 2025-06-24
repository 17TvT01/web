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
            next_id = self.db.get_next_id(table='orders')
            if next_id is None:
                raise Exception("Could not generate order ID")

            sql = '''INSERT INTO orders (id, customer_name, total_price, status) 
                     VALUES (%s, %s, %s, %s)'''
            values = (next_id, customer_name, total_price, status)
            self.db.cursor.execute(sql, values)

            # Insert order items
            item_sql = '''INSERT INTO order_items (order_id, product_id, quantity) VALUES (%s, %s, %s)'''
            item_values = [(next_id, item['product_id'], item['quantity']) for item in items]
            self.db.cursor.executemany(item_sql, item_values)

            self.db.conn.commit()
            print(f"Order added successfully with ID: {next_id}")
            return next_id
        except Error as e:
            print(f"Error adding order: {e}")
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
