import mysql.connector
from mysql.connector import Error

class Database:
    def __init__(self):
        try:
            self.conn = mysql.connector.connect(
                host='localhost',
                user='root',
                password='mysql',
                database='web_store'
            )
            self.cursor = self.conn.cursor()
            self.create_tables()
        except Error as e:
            print(f"Error connecting to MySQL: {e}")

    def create_tables(self):
        try:
            # Create products table
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS products (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    quantity INT NOT NULL DEFAULT 0,
                    category ENUM('cake', 'food', 'drink') NOT NULL,
                    description TEXT,
                    image_url VARCHAR(255),
                    is_available BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create product_attributes table for filters
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS product_attributes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT,
                    attribute_type VARCHAR(50),
                    attribute_value VARCHAR(255),
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                )
            ''')
            
            self.conn.commit()
        except Error as e:
            print(f"Error creating tables: {e}")

    def reset_auto_increment(self, table_name):
        try:
            # Find the maximum ID in the table
            self.cursor.execute(f"SELECT MAX(id) FROM {table_name}")
            max_id = self.cursor.fetchone()[0]
            if max_id is None:
                max_id = 0
            
            # Set the auto increment to max_id + 1
            self.cursor.execute(f"ALTER TABLE {table_name} AUTO_INCREMENT = {max_id + 1}")
            self.conn.commit()
            print(f"Auto-increment for {table_name} reset to {max_id + 1}")
        except Error as e:
            print(f"Error resetting auto-increment for {table_name}: {e}")

    def close(self):
        if self.conn.is_connected():
            self.cursor.close()
            self.conn.close()