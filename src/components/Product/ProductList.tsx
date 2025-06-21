import { useEffect, useState } from 'react';
import { productService } from '../../services/productService';
import { Product } from '../../types';
import { cartService } from '../../services/cartService';
import { notificationService } from '../../services/notificationService';
import './ProductList.css';

interface Props {
    category: string;
}

export const ProductList = ({ category }: Props) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const response = await productService.getProducts();
                const filteredProducts = category === 'all' 
                    ? response
                    : response.filter(p => p.category === category);
                setProducts(filteredProducts);
            } catch (error) {
                console.error('Error fetching products:', error);
                notificationService.show('Không thể tải danh sách sản phẩm', { type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [category]);

    const handleAddToCart = async (product: Product) => {
        try {
            await cartService.addItem(product);
            notificationService.show('Đã thêm vào giỏ hàng', { type: 'success' });
        } catch (error) {
            console.error('Error adding to cart:', error);
            notificationService.show('Không thể thêm vào giỏ hàng', { type: 'error' });
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Đang tải sản phẩm...</p>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="loading-container">
                <p>Không có sản phẩm nào trong danh mục này</p>
            </div>
        );
    }

    return (
        <div className="products-grid">
            {products.map(product => (
                <div key={product.id} className="product-card">
                    <div className="product-image">
                        <img src={product.image} alt={product.name} />
                        {product.onSale && <span className="sale-badge">Sale</span>}
                        {product.isNew && <span className="new-badge">New</span>}
                    </div>
                    <div className="product-info">
                        <h3>{product.name}</h3>
                        <div className="product-price">
                            {product.onSale ? (
                                <>
                                    <span className="original-price">{product.price.toLocaleString()}₫</span>
                                    <span className="sale-price">{product.salePrice?.toLocaleString()}₫</span>
                                </>
                            ) : (
                                <span className="sale-price">{product.price.toLocaleString()}₫</span>
                            )}
                        </div>
                        <div className="product-actions">
                            <button 
                                className="add-to-cart"
                                disabled={!product.inStock}
                                onClick={() => product.inStock && handleAddToCart(product)}
                            >
                                {product.inStock ? (
                                    <>
                                        <i className="fas fa-shopping-cart"></i>
                                        Thêm vào giỏ
                                    </>
                                ) : (
                                    'Hết hàng'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};