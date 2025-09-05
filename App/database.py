import mysql.connector
import json
from mysql.connector import Error

class Database:
    def __init__(self):
        self.conn = None
        self.cursor = None
        self.connect()
        
    def connect(self):
        try:
            # Try common credential sets (prefer empty password for XAMPP)
            last_error = None
            for pwd in ['', 'mysql', 'root']:
                try:
                    self.conn = mysql.connector.connect(
                        host='localhost',
                        user='root',
                        password=pwd,
                        charset='utf8mb4'
                    )
                    break
                except Error as e:
                    last_error = e
                    self.conn = None
            if not self.conn:
                # Re-raise the last error if connection failed for all attempts
                raise last_error if last_error else Error("Unable to connect to MySQL with tried credentials")
            
            # Create cursor
            self.cursor = self.conn.cursor()
            
            # Drop and recreate database
            # self.cursor.execute("DROP DATABASE IF EXISTS web_store")
            # self.cursor.execute("CREATE DATABASE web_store")
            self.cursor.execute("USE web_store")
            print("Database connection established and using existing database")
            
            # Create tables
            self.create_tables()
            
            print("Database connection successful")
            
        except Error as e:
            print("\nError connecting to MySQL. Please check your MySQL configuration:")
            print("1. Make sure XAMPP/MySQL is running")
            print("2. Default XAMPP MySQL credentials are:")
            print("   - Username: root")
            print("   - Password: (empty)")
            print(f"\nError details: {str(e)}")
            
            # Additional help for XAMPP users
            print("\nTo fix this:")
            print("1. Open XAMPP Control Panel")
            print("2. Make sure MySQL is running (Status should be green)")
            print("3. Click 'Shell' button")
            print("4. Type: mysql -u root")
            print("5. If that fails, try: mysql -u root -p")
            print("   (press Enter when asked for password)")
            raise

    def create_tables(self):
        try:
            # Create products table with quantity field
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS products (
                    id INT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    category ENUM('cake', 'food', 'drink') NOT NULL,
                    description TEXT,
                    image_url VARCHAR(255),
                    quantity INT DEFAULT 0,
                    is_available BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Ensure optional columns exist on products
            try:
                self.cursor.execute("DESCRIBE products")
                product_columns = {row[0] for row in self.cursor.fetchall()}
                if 'ai_keys' not in product_columns:
                    # Store as TEXT (JSON-encoded array)
                    self.cursor.execute("ALTER TABLE products ADD COLUMN ai_keys TEXT NULL")
                    self.conn.commit()
                    print("Added column 'ai_keys' to products table")
            except Error as e:
                print(f"Warning: Could not verify/alter products table for ai_keys column: {e}")
            
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

            # Optional backfill: populate products.ai_keys from product_attributes
            try:
                # Only run if ai_keys column exists
                self.cursor.execute("DESCRIBE products")
                product_columns = {row[0] for row in self.cursor.fetchall()}
                if 'ai_keys' in product_columns:
                    # Fetch all product ids
                    self.cursor.execute("SELECT id FROM products")
                    product_ids = [row[0] for row in self.cursor.fetchall()]
                    for pid in product_ids:
                        self.cursor.execute(
                            "SELECT attribute_value FROM product_attributes WHERE product_id = %s AND attribute_type = %s",
                            (pid, 'ai_keys')
                        )
                        keys = [row[0] for row in self.cursor.fetchall() if row and row[0]]
                        # Only update if we have keys and the current column is NULL or different
                        if keys:
                            keys_json = json.dumps(sorted(list(set(keys))))
                            # Check current value
                            self.cursor.execute("SELECT ai_keys FROM products WHERE id = %s", (pid,))
                            current = self.cursor.fetchone()
                            current_val = current[0] if current else None
                            if current_val != keys_json:
                                self.cursor.execute("UPDATE products SET ai_keys = %s WHERE id = %s", (keys_json, pid))
                    self.conn.commit()
            except Error as e:
                print(f"Warning: Could not backfill products.ai_keys: {e}")
            
            # Create orders table
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS orders (
                    id INT PRIMARY KEY,
                    customer_name VARCHAR(255) NOT NULL,
                    total_price DECIMAL(10, 2) NOT NULL,
                    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Ensure extended order columns exist
            try:
                self.cursor.execute("DESCRIBE orders")
                order_columns = {row[0] for row in self.cursor.fetchall()}
                alter_stmts = []
                if 'order_type' not in order_columns:
                    alter_stmts.append("ADD COLUMN order_type VARCHAR(20) NULL")
                if 'payment_method' not in order_columns:
                    alter_stmts.append("ADD COLUMN payment_method VARCHAR(20) NULL")
                if 'table_number' not in order_columns:
                    alter_stmts.append("ADD COLUMN table_number VARCHAR(50) NULL")
                if 'needs_assistance' not in order_columns:
                    alter_stmts.append("ADD COLUMN needs_assistance BOOLEAN DEFAULT FALSE")
                if 'note' not in order_columns:
                    alter_stmts.append("ADD COLUMN note TEXT NULL")
                if 'customer_email' not in order_columns:
                    alter_stmts.append("ADD COLUMN customer_email VARCHAR(255) NULL")
                if 'email_receipt' not in order_columns:
                    alter_stmts.append("ADD COLUMN email_receipt BOOLEAN DEFAULT FALSE")
                if 'payment_status' not in order_columns:
                    alter_stmts.append("ADD COLUMN payment_status ENUM('unpaid','paid') DEFAULT 'unpaid'")
                if alter_stmts:
                    stmt = "ALTER TABLE orders " + ", ".join(alter_stmts)
                    self.cursor.execute(stmt)
                    self.conn.commit()
            except Error as e:
                print(f"Warning: Could not alter orders table: {e}")
            
            # Create order_items table
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS order_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id INT,
                    product_id INT,
                    quantity INT,
                    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                )
            ''')

            # Ensure selected options column exists for order_items
            try:
                self.cursor.execute("DESCRIBE order_items")
                item_columns = {row[0] for row in self.cursor.fetchall()}
                if 'selected_options' not in item_columns:
                    self.cursor.execute("ALTER TABLE order_items ADD COLUMN selected_options TEXT NULL")
                    self.conn.commit()
            except Error as e:
                print(f"Warning: Could not alter order_items table: {e}")

            # Check if users table exists and has correct structure
            self.cursor.execute("SHOW TABLES LIKE 'users'")
            if self.cursor.fetchone():
                self.cursor.execute("DESCRIBE users")
                columns = [row[0] for row in self.cursor.fetchall()]
                if 'name' not in columns or 'email' not in columns or 'password_hash' not in columns:
                    print("Dropping users table due to missing required columns")
                    self.cursor.execute("DROP TABLE users")
                    self.conn.commit()

            # Create users table for authentication
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Verify table structure
            self.cursor.execute("DESCRIBE users")
            columns = [row[0] for row in self.cursor.fetchall()]
            print("Users table columns:", columns)
            
            self.conn.commit()
            print("Tables created successfully")
            
        except Error as e:
            print(f"Error creating tables: {e}")
            raise

    def get_next_id(self, table='products'):
        try:
            # Get list of all IDs from specified table
            self.cursor.execute(f"SELECT id FROM {table} ORDER BY id")
            ids = [row[0] for row in self.cursor.fetchall()]
            
            if not ids:
                return 1  # First record
            
            # Find first gap in sequence
            expected_id = 1
            for current_id in ids:
                if current_id != expected_id:
                    return expected_id
                expected_id += 1
            
            # If no gaps, return next number
            return expected_id
            
        except Error as e:
            print(f"Error getting next ID for {table}: {e}")
            return None

    def reconnect_if_needed(self):
        try:
            if self.conn is None or not self.conn.is_connected():
                print("Reconnecting to database...")
                self.connect()
        except Error as e:
            print(f"Error reconnecting: {e}")
            raise

    def close(self):
        try:
            if self.conn and self.conn.is_connected():
                if self.cursor:
                    self.cursor.close()
                self.conn.close()
                print("Database connection closed")
        except Error as e:
            print(f"Error closing connection: {e}")

    def __del__(self):
        self.close()
