import { useEffect, useState } from 'react';
import { productService } from '../../services/productService';
import { cartService } from '../../services/cartService';
import { notificationService } from '../../services/notificationService';
import { MainCategory, Product, FilterState, SelectedOption } from '../../types';
import { ProductDetailModal } from './ProductDetailModal';
import '../../assets/css/components/product-grid.css';


interface Props {
    category: MainCategory;
    filters: FilterState;
    sortBy: string;
    searchQuery: string;
} 

export const ProductList = ({ category, filters, sortBy, searchQuery }: Props) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);


    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                await productService.loadProducts();
                const allProducts = await productService.getProducts();
                let filteredProducts = allProducts;

                // Filter by main category
                if (category !== 'all') {
                    filteredProducts = filteredProducts.filter(p => p.category === category);
                }

                // Apply subcategory filters
                if (Object.keys(filters).length > 0) {
                    filteredProducts = filteredProducts.filter(product => {
                        // Chỉ áp dụng bộ lọc cho sản phẩm thuộc danh mục hiện tại
                        if (category !== 'all' && product.category !== category) {
                            return false;
                        }
                        
                        return Object.entries(filters).every(([filterType, selectedValues]) => {
                            if (selectedValues.length === 0) return true;
                            
                            const productFilters = product.filters as any;
                            if (!productFilters) return false;

                            // Check if product matches any of the selected values for this filter type
                            if (Array.isArray(productFilters[filterType])) {
                                return selectedValues.some(value => 
                                    productFilters[filterType].includes(value)
                                );
                            }
                            return selectedValues.includes(productFilters[filterType]);
                        });
                    });
                }

                // Apply search filter
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    filteredProducts = filteredProducts.filter(product =>
                        product.name.toLowerCase().includes(query)
                    );
                }

                // Apply sorting
                if (sortBy) {
                    filteredProducts = [...filteredProducts].sort((a, b) => {
                        switch (sortBy) {
                            case 'price-asc':
                                return (a.onSale ? a.salePrice! : a.price) - (b.onSale ? b.salePrice! : b.price);
                            case 'price-desc':
                                return (b.onSale ? b.salePrice! : b.price) - (a.onSale ? a.salePrice! : a.price);
                            case 'name-asc':
                                return a.name.localeCompare(b.name);
                            case 'name-desc':
                                return b.name.localeCompare(a.name);
                            case 'newest':
                                return b.isNew === a.isNew ? 0 : b.isNew ? 1 : -1;
                            default:
                                return 0;
                        }
                    });
                }

                setProducts(filteredProducts);
            } catch (error) {
                console.error('Error fetching products:', error);
                notificationService.show('Không thể tải danh sách sản phẩm', { type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [category, filters, sortBy, searchQuery]);

    const handleProductClick = (product: Product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProduct(null);
    };

    const handleAddToCartWithOptions = async (product: Product, selectedOptions: SelectedOption[], quantity: number) => {
        try {
            console.log('Adding to cart with quantity:', quantity);
            // Tạo uniqueId từ product.id và selectedOptions
            const optionsString = selectedOptions.map(opt => `${opt.name}:${opt.value}`).join('|');
            const uniqueId = `${product.id}_${optionsString || 'default'}`;
            
            const cartItem = {
                ...product,
                uniqueId,
                selectedOptions,
                quantity
            };
            console.log('Cart item being added:', cartItem);
            await cartService.addItem(cartItem);
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
            <div className="empty-products">
                <i className="fas fa-box-open"></i>
                <p>Không tìm thấy sản phẩm phù hợp</p>
            </div>
        );
    }

    return (
        <>
            <div className="products-grid">
                {products.map(product => (
                    <div 
                        key={product.id} 
                        className="product-card"
                        onClick={() => product.inStock && handleProductClick(product)}
                        style={{ cursor: product.inStock ? 'pointer' : 'not-allowed' }}
                    >
                        <div className="product-image">
                            <img src={product.image} alt={product.name} />
                            {product.onSale && <span className="sale-badge">Sale</span>}
                            {product.isNew && <span className="new-badge">New</span>}
                        </div>
                        <div className="product-info">
                            <h3>{product.name}</h3>
                            {product.filters && (
                                <div className="product-tags">
                                    {Object.entries(product.filters).map(([type, values]) => (
                                        Array.isArray(values) ? values.map(value => (
                                            <span key={`${type}-${value}`} className="tag">
                                                {value}
                                            </span>
                                        )) : null
                                    ))}
                                </div>
                            )}
                            <div className="product-price">
                                {product.onSale ? (
                                    <>
                                        <span className="original-price">
                                            {product.price.toLocaleString()}₫
                                        </span>
                                        <span className="sale-price">
                                            {product.salePrice?.toLocaleString()}₫
                                        </span>
                                    </>
                                ) : (
                                    <span className="sale-price">
                                        {product.price.toLocaleString()}₫
                                    </span>
                                )}
                            </div>
                            <div className="product-actions">
                                <button 
                                    className="add-to-cart"
                                    disabled={!product.inStock}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
                                        product.inStock && handleProductClick(product);
                                    }}
                                >
                                    {product.inStock ? 'Xem chi tiết' : 'Hết hàng'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ProductDetailModal
                product={selectedProduct}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onAddToCart={handleAddToCartWithOptions}
            />
        </>
    );

};
