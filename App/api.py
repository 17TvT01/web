# -*- coding: utf-8 -*-
from flask import Flask, jsonify, request
from product_manager import ProductManager
from order_manager import OrderManager
from flask_cors import CORS
import mysql.connector
import hashlib
import json
from decimal import Decimal
from datetime import datetime

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

    # Normalize filters/attributes for frontend consumption and ensure JSON-safe types
    for p in products:
        # Convert Decimal and datetime to JSON-serializable types
        for key, val in list(p.items()):
            if isinstance(val, Decimal):
                p[key] = float(val)
            elif isinstance(val, datetime):
                p[key] = val.isoformat()

        # If backend provides structured filters, expose as attributes array for FE
        if 'filters' in p and isinstance(p['filters'], dict):
            attrs = []
            for k, vals in p['filters'].items():
                if isinstance(vals, list):
                    for v in vals:
                        attrs.append({'type': k, 'value': v})
                elif vals is not None:
                    attrs.append({'type': k, 'value': vals})
            p['attributes'] = attrs
        elif 'attributes' in p and isinstance(p['attributes'], dict):
            # Legacy path: convert dict to array of {type, value}
            p['attributes'] = [{'type': k, 'value': v} for k, vals in p['attributes'].items() for v in vals]

        # Optionally, decode ai_keys JSON to array for convenience
        if 'ai_keys' in p and isinstance(p['ai_keys'], str):
            try:
                parsed = json.loads(p['ai_keys'])
                if isinstance(parsed, list):
                    p['ai_keys'] = parsed
            except Exception:
                pass

    return jsonify(products)

@app.route('/orders', methods=['GET'])
def get_orders():
    status_param = request.args.get('status')
    status_filter = None
    if status_param:
        if ',' in status_param:
            status_filter = [item.strip() for item in status_param.split(',') if item.strip()]
        else:
            status_filter = status_param.strip()
    orders = order_manager.get_all_orders(status_filter)
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
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'Không có dữ liệu được gửi'}), 400
            
        customer_name = data.get('customer_name')
        items = data.get('items')
        total_price = data.get('total_price')
        # Force all customer orders to start as pending so staff can confirm before the kitchen sees them
        if 'status' in data and data.get('status') not in (None, '', 'pending'):
            print(f"Ignoring client-supplied status '{data.get('status')}' for new order")
        status = 'pending'
        order_type = data.get('order_type')
        payment_method = data.get('payment_method')
        table_number = data.get('table_number')
        if isinstance(table_number, str):
            table_number = table_number.strip()
            if table_number == "":
                table_number = None
        elif table_number is not None:
            table_number = str(table_number).strip() or None
        needs_assistance = bool(data.get('needs_assistance', False))
        note = data.get('note')
        customer_email = data.get('customer_email')
        email_receipt = bool(data.get('email_receipt', False))
        payment_status = data.get('payment_status', 'unpaid')

        # Validate required fields
        if not customer_name or not customer_name.strip():
            return jsonify({'error': 'Tên khách hàng là bắt buộc'}), 400
            
        if not items or not isinstance(items, list) or len(items) == 0:
            return jsonify({'error': 'Danh sách sản phẩm không được để trống'}), 400
            
        if total_price is None:
            return jsonify({'error': 'Tổng giá là bắt buộc'}), 400
            
        try:
            total_price = float(total_price)
            if total_price < 0:
                return jsonify({'error': 'Tổng giá phải lớn hơn 0'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Tổng giá phải là số'}), 400

        # Validate and sanitize items
        sanitized_items = []
        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                return jsonify({'error': f'Item thứ {idx+1} phải là object'}), 400

            if 'product_id' not in item or 'quantity' not in item:
                return jsonify({'error': f'Item thứ {idx+1} thiếu product_id hoặc quantity'}), 400

            try:
                product_id = int(item['product_id'])
                quantity = int(item['quantity'])

                if product_id <= 0:
                    return jsonify({'error': f'Lỗi validation: product_id trong item {idx+1} phải là số nguyên dương'}), 400
                if quantity <= 0:
                    return jsonify({'error': f'Lỗi validation: quantity trong item {idx+1} phải là số nguyên dương'}), 400
                sanitized = {'product_id': product_id, 'quantity': quantity}
                if 'selected_options' in item:
                    try:
                        json.dumps(item['selected_options'])
                        sanitized['selected_options'] = item['selected_options']
                    except Exception:
                        pass
                sanitized_items.append(sanitized)
            except (ValueError, TypeError):
                return jsonify({'error': f'Lỗi validation: product_id và quantity trong item {idx+1} phải là số nguyên'}), 400

        order_id = order_manager.add_order(
            customer_name,
            sanitized_items,
            total_price,
            status,
            order_type,
            payment_method,
            table_number,
            needs_assistance,
            note,
            customer_email,
            email_receipt,
            payment_status
        )
        if order_id:
            payload = {'order_id': order_id}
            assigned_table = getattr(order_manager, 'last_assigned_table', None)
            if assigned_table:
                payload['table_number'] = assigned_table
            return jsonify(payload), 201
        else:
            message = order_manager.last_error or 'Không thể tạo đơn hàng trong database'
            error_code = getattr(order_manager, 'last_error_code', None)
            status_code = 500
            if error_code == 'validation':
                status_code = 400
            elif error_code == 'conflict':
                status_code = 409
            elif error_code == 'not_found':
                status_code = 404
            elif error_code == 'database':
                status_code = 500
            return jsonify({'error': message}), status_code
            
            
    except Exception as e:
        print(f"Error in create_order API: {str(e)}")
        return jsonify({'error': f'Lỗi server: {str(e)}'}), 500


@app.route('/orders/<int:order_id>/items', methods=['PUT'])
def update_order_items(order_id):
    data = request.json or {}
    items = data.get('items')
    if items is None:
        return jsonify({'error': 'Danh sách món ăn bắt buộc'}), 400

    update_result = order_manager.update_order_details(
        order_id,
        items=items,
        note=data.get('note'),
        table_number=data.get('table_number'),
        customer_name=data.get('customer_name'),
        needs_assistance=data.get('needs_assistance')
    )

    if update_result is None:
        if order_manager.get_order(order_id) is None:
            return jsonify({'error': 'Order not found'}), 404
        return jsonify({'error': 'Failed to update order items'}), 400

    refreshed = order_manager.get_order(order_id)
    return jsonify({'message': 'Order items updated', 'order': refreshed}), 200


@app.route('/orders/<int:order_id>/confirm', methods=['POST'])
def confirm_order(order_id):
    data = request.json or {}
    if any(key in data for key in ('items', 'note', 'table_number', 'customer_name', 'needs_assistance')):
        details = order_manager.update_order_details(
            order_id,
            items=data.get('items'),
            note=data.get('note'),
            table_number=data.get('table_number'),
            customer_name=data.get('customer_name'),
            needs_assistance=data.get('needs_assistance')
        )
        if details is None and order_manager.get_order(order_id) is None:
            return jsonify({'error': 'Order not found'}), 404
        if details is None:
            return jsonify({'error': 'Failed to update order before confirmation'}), 400

    if not order_manager.update_order_status(order_id, 'confirmed'):
        if order_manager.get_order(order_id) is None:
            return jsonify({'error': 'Order not found'}), 404
        return jsonify({'error': 'Could not confirm order'}), 400

    refreshed = order_manager.get_order(order_id)
    return jsonify({'message': 'Order confirmed', 'order': refreshed}), 200


@app.route('/orders/<int:order_id>/send-to-kitchen', methods=['POST'])
def send_order_to_kitchen(order_id):
    if not order_manager.update_order_status(order_id, 'sent_to_kitchen'):
        if order_manager.get_order(order_id) is None:
            return jsonify({'error': 'Order not found'}), 404
        return jsonify({'error': 'Could not send order to kitchen'}), 400
    refreshed = order_manager.get_order(order_id)
    return jsonify({'message': 'Order sent to kitchen', 'order': refreshed}), 200


@app.route('/orders/<int:order_id>/status', methods=['POST'])
def set_order_status(order_id):
    data = request.json or {}
    status = data.get('status')
    if not status:
        return jsonify({'error': 'Missing status field'}), 400

    normalized = str(status).strip().lower()
    if normalized in {'served', 'đã phục vụ'}:
        qr_data = order_manager.mark_order_served(order_id)
        if qr_data is None:
            if order_manager.get_order(order_id) is None:
                return jsonify({'error': 'Order not found'}), 404
            return jsonify({'error': 'Unable to mark order as served'}), 400
        return jsonify({'message': 'Order marked as served', 'qr_code_data': qr_data}), 200

    if not order_manager.update_order_status(order_id, status):
        if order_manager.get_order(order_id) is None:
            return jsonify({'error': 'Order not found'}), 404
        return jsonify({'error': 'Unable to update order status'}), 400
    refreshed = order_manager.get_order(order_id)
    return jsonify({'message': 'Order status updated', 'order': refreshed}), 200


@app.route('/orders/<int:order_id>/qr', methods=['GET'])
def get_order_qr(order_id):
    qr_data = order_manager.get_qr_code_data(order_id)
    if not qr_data:
        if order_manager.get_order(order_id) is None:
            return jsonify({'error': 'Order not found'}), 404
        return jsonify({'error': 'QR code not available'}), 404
    return jsonify({'qr_code_data': qr_data}), 200
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