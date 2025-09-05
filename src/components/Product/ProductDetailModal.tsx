import React, { useState } from 'react';
import { Product, ProductOption, SelectedOption } from '../../types';
import defaultOptionsByCategory from '../../config/defaultProductOptions';
import '../../assets/css/components/product-modal.css';

interface ProductDetailModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (product: Product, selectedOptions: SelectedOption[], quantity: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
    product,
    isOpen,
    onClose,
    onAddToCart,
}) => {
    const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
    const [quantity, setQuantity] = useState<number>(1);

    if (!isOpen || !product) return null;

    // Merge product options with default options based on category
    const categoryOptions = defaultOptionsByCategory[product.category] || [];
    // Merge options, avoiding duplicates by option name
    const mergedOptionsMap: Record<string, ProductOption> = {};

    categoryOptions.forEach(opt => {
        mergedOptionsMap[opt.name] = opt;
    });

    (product.options || []).forEach(opt => {
        mergedOptionsMap[opt.name] = opt;
    });

    const mergedOptions = Object.values(mergedOptionsMap);

    const handleOptionChange = (optionName: string, value: string) => {
        setSelectedOptions(prev => {
            const newOptions = prev.filter(opt => opt.name !== optionName);
            newOptions.push({ name: optionName, value });
            return newOptions;
        });
    };

    const handleCheckboxChange = (optionName: string, itemName: string, isChecked: boolean) => {
        setSelectedOptions(prev => {
            let newOptions = prev.filter(opt => !(opt.name === optionName && opt.value === itemName));
            if (isChecked) {
                newOptions.push({ name: optionName, value: itemName });
            }
            return newOptions;
        });
    };

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val > 0) {
            setQuantity(val);
        }
    };

    const handleAddToCart = () => {
        onAddToCart(product, selectedOptions, quantity);
        onClose();
    };

    const calculateTotalPrice = () => {
        let total = product.onSale ? product.salePrice! : product.price;
        selectedOptions.forEach(option => {
            const productOption = mergedOptions.find(opt => opt.name === option.name);
            if (productOption?.type === 'checkbox') {
                const item = productOption.items.find(item => typeof item !== 'string' && item.name === option.value) as { name: string; price?: number } | undefined;
                if (item?.price) {
                    total += item.price;
                }
            }
        });
        return total * quantity;
    };

    // Mock reviews data - in real app, this would come from props or API
    const mockReviews = [
        { id: 1, user: "Nguyễn Văn A", rating: 5, comment: "Sản phẩm rất ngon, giao hàng nhanh!" },
        { id: 2, user: "Trần Thị B", rating: 4, comment: "Hương vị ổn, sẽ mua lại." },
        { id: 3, user: "Lê Văn C", rating: 5, comment: "Tuyệt vời, rất hài lòng!" },
    ];

    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={`star ${i < rating ? 'filled' : ''}`}>★</span>
        ));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>×</button>
                <div className="product-detail">
                    <img src={product.image} alt={product.name} className="product-detail-image" />
                    <div className="product-detail-info">
                        <h2>{product.name}</h2>
                        <p className="product-detail-description">{product.description || 'Chưa có mô tả cho sản phẩm này.'}</p>
                        
                        <div className="product-rating">
                            <h3>Đánh giá</h3>
                            <div className="rating-display">
                                {renderStars(product.rating ?? 0)}
                                <span className="rating-text">
                                    {product.rating ? `${product.rating}/5` : 'Chưa có đánh giá'}
                                </span>
                            </div>
                            <div className="reviews-list">
                                {mockReviews.map(review => (
                                    <div key={review.id} className="review-item">
                                        <div className="review-user">{review.user}</div>
                                        <div className="review-rating">{renderStars(review.rating)}</div>
                                        <div className="review-comment">{review.comment}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="quantity-selector">
                            <h3>Số lượng</h3>
                            <input
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={handleQuantityChange}
                                className="quantity-input"
                            />
                        </div>

                        {mergedOptions.length > 0 && (
                            <div className="product-options">
                                <h3>Tùy chọn:</h3>
                                {mergedOptions.map(option => (
                                    <div key={option.name} className="option-group">
                                        <h4>{option.name}</h4>
                                        {option.type === 'radio' && (
                                            <div className="radio-options">
                                                {option.items.map(item => (
                                                    <label key={typeof item === 'string' ? item : item.name}>
                                                        <input
                                                            type="radio"
                                                            name={option.name}
                                                            value={typeof item === 'string' ? item : item.name}
                                                            onChange={(e) => handleOptionChange(option.name, e.target.value)}
                                                            checked={selectedOptions.find(opt => opt.name === option.name)?.value === (typeof item === 'string' ? item : item.name)}
                                                        />
                                                        {typeof item === 'string' ? item : item.name}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {option.type === 'checkbox' && (
                                            <div className="checkbox-options">
                                                {option.items.map(item => (
                                                    <label key={typeof item === 'string' ? item : item.name}>
                                                        <input
                                                            type="checkbox"
                                                            value={typeof item === 'string' ? item : item.name}
                                                            onChange={(e) => handleCheckboxChange(option.name, typeof item === 'string' ? item : item.name, e.target.checked)}
                                                            checked={selectedOptions.some(opt => opt.name === option.name && opt.value === (typeof item === 'string' ? item : item.name))}
                                                        />
                                                        {typeof item === 'string' ? item : item.name}
                                                        {typeof item !== 'string' && item.price && (
                                                            <span className="option-price"> (+{item.price.toLocaleString()}₫)</span>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="modal-footer">
                            <button className="add-to-cart-button" onClick={handleAddToCart}>
                                Thêm vào giỏ hàng ({quantity})
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
