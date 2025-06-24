from flask import Flask, jsonify, request
from product_manager import ProductManager
from order_manager import OrderManager
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

product_manager = ProductManager()
order_manager = OrderManager()

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
