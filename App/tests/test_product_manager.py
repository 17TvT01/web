import pytest
from ..product_manager import ProductManager

@pytest.fixture
def product_manager():
    pm = ProductManager()
    yield pm
    # Cleanup test data after each test
    test_products = pm.search_products("Test Product")
    for product in test_products:
        pm.delete_product(product['id'])

def test_add_product(product_manager):
    # Test adding a simple product
    product_id = product_manager.add_product(
        name="Test Product 1",
        price=100.00,
        category="food",
        description="Test description",
        image_url="test.jpg"
    )
    
    assert product_id is not None
    
    # Verify product was added
    product = product_manager.get_product(product_id)
    assert product is not None
    assert product['name'] == "Test Product 1"
    assert float(product['price']) == 100.00
    assert product['category'] == "food"

def test_add_product_with_attributes(product_manager):
    # Test adding a cake with attributes
    attributes = {
        'occasion': ['Birthday', 'Anniversary'],
        'flavor': ['Chocolate'],
        'ingredient': ['Cocoa', 'Cream'],
        'size': ['6 inch']
    }
    
    product_id = product_manager.add_product(
        name="Test Cake",
        price=200.00,
        category="cake",
        description="Test cake",
        image_url="cake.jpg",
        attributes=attributes
    )
    
    assert product_id is not None
    
    # Verify product and its attributes
    product = product_manager.get_product(product_id)
    assert product is not None
    assert product['name'] == "Test Cake"
    assert product['category'] == "cake"
    assert 'attributes' in product
    assert 'Birthday' in product['attributes']['occasion']
    assert 'Chocolate' in product['attributes']['flavor']

def test_delete_product(product_manager):
    # Add a product to delete
    product_id = product_manager.add_product(
        name="Test Product Delete",
        price=150.00,
        category="drink"
    )
    
    assert product_id is not None
    
    # Delete the product
    result = product_manager.delete_product(product_id)
    assert result is True
    
    # Verify product was deleted
    product = product_manager.get_product(product_id)
    assert product is None

def test_search_products(product_manager):
    # Add test products
    product_manager.add_product(
        name="Test Search Product 1",
        price=100.00,
        category="food"
    )
    product_manager.add_product(
        name="Test Search Product 2",
        price=200.00,
        category="food"
    )
    
    # Search for products
    results = product_manager.search_products("Test Search")
    assert len(results) == 2
    
    # Search with specific term
    results = product_manager.search_products("Product 1")
    assert len(results) == 1
    assert results[0]['name'] == "Test Search Product 1"

def test_get_products_by_category(product_manager):
    # Add products in different categories
    product_manager.add_product(
        name="Test Cake 1",
        price=300.00,
        category="cake"
    )
    product_manager.add_product(
        name="Test Food 1",
        price=100.00,
        category="food"
    )
    
    # Get products by category
    cakes = product_manager.get_all_products("cake")
    foods = product_manager.get_all_products("food")
    
    assert any(p['name'] == "Test Cake 1" for p in cakes)
    assert any(p['name'] == "Test Food 1" for p in foods)
    assert all(p['category'] == "cake" for p in cakes)
    assert all(p['category'] == "food" for p in foods)