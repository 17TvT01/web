from flask import Flask, jsonify, request
from product_manager import ProductManager
from order_manager import OrderManager
from flask_cors import CORS
import mysql.connector
import hashlib

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

product_manager = ProductManager()
order_manager = OrderManager()

# --- User Registration Endpoint ---
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    print(f"Đang xử lý đăng ký cho email: {email}")
    if not name or not email or not password:
        print("Thiếu thông tin đăng ký")
        return jsonify({'error': 'Missing required fields'}), 400
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    try:
        print("Đang kết nối database...")
        db = product_manager.db  # Use the same db connection
        print("Đã kết nối database thành công")
        
        db.cursor.execute('SELECT id FROM users WHERE email=%s', (email,))
        if db.cursor.fetchone():
            print(f"Email {email} đã tồn tại")
            return jsonify({'error': 'Email already registered'}), 409
            
        print("Đang thêm người dùng mới...")
        db.cursor.execute('INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)', (name, email, password_hash))
        db.conn.commit()
        print("Đăng ký thành công")
        return jsonify({'message': 'Registration successful'}), 201
    except mysql.connector.Error as e:
        print(f"Lỗi SQL: {str(e)}")
        return jsonify({'error': str(e)}), 500

# --- User Login Endpoint ---
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Missing required fields'}), 400
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    try:
        db = product_manager.db
        db.cursor.execute('SELECT id, name, email FROM users WHERE email=%s AND password_hash=%s', (email, password_hash))
        user = db.cursor.fetchone()
        if user:
            return jsonify({'id': user[0], 'name': user[1], 'email': user[2]}), 200
        else:
            return jsonify({'error': 'Invalid email or password'}), 401
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/products', methods=['GET'])
def get_products():
    products = product_manager.get_all_products()
    # Convert products to JSON serializable format
    for p in products:
        # Convert attributes dict to list of key-value pairs for JSON serialization
        if 'attributes' in p and isinstance(p['attributes'], dict):
            p['attributes'] = [{'type': k, 'value': v} for k, vals in p['attributes'].items() for v in vals]
    return jsonify(products)

@app.route('/orders', methods=['GET'])
def get_orders():
    status = request.args.get('status')
    orders = order_manager.get_all_orders(status)
    return jsonify(orders)

@app.route('/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    order = order_manager.get_order(order_id)
    if order:
        return jsonify(order)
    else:
        return jsonify({'error': 'Order not found'}), 404

@app.route('/orders', methods=['POST'])
def create_order():
    data = request.json
    customer_name = data.get('customer_name')
    items = data.get('items')
    total_price = data.get('total_price')
    status = data.get('status', 'pending')

    if not customer_name or not items or total_price is None:
        return jsonify({'error': 'Missing required fields'}), 400

    order_id = order_manager.add_order(customer_name, items, total_price, status)
    if order_id:
        return jsonify({'order_id': order_id}), 201
    else:
        return jsonify({'error': 'Failed to create order'}), 500

@app.route('/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    data = request.json
    status = data.get('status')
    if not status:
        return jsonify({'error': 'Missing status field'}), 400

    success = order_manager.update_order_status(order_id, status)
    if success:
        return jsonify({'message': 'Order updated successfully'})
    else:
        return jsonify({'error': 'Failed to update order'}), 500

@app.route('/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    success = order_manager.delete_order(order_id)
    if success:
        return jsonify({'message': 'Order deleted successfully'})
    else:
        return jsonify({'error': 'Failed to delete order'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
