from flask import Flask, jsonify
from product_manager import ProductManager
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

product_manager = ProductManager()

@app.route('/products', methods=['GET'])
def get_products():
    products = product_manager.get_all_products()
    # Convert products to JSON serializable format
    for p in products:
        # Convert attributes dict to list of key-value pairs for JSON serialization
        if 'attributes' in p and isinstance(p['attributes'], dict):
            p['attributes'] = [{'type': k, 'value': v} for k, vals in p['attributes'].items() for v in vals]
    return jsonify(products)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
