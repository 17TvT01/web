import { useEffect, useState } from 'react';
import { cartService } from '../../services/cartService';
import { uiService } from '../../services/uiService';
import { CartItem } from '../../types';

export const Cart = () => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | null>(null);

    useEffect(() => {
        const handleCartUpdate = (e: CustomEvent) => {
            setItems(e.detail.items);
            setTotalPrice(e.detail.totalPrice);
        };

        // Initial cart state
        setItems(cartService.getItems());
        setTotalPrice(cartService.getTotalPrice());

        // Listen for cart updates
        window.addEventListener('cart:updated', handleCartUpdate as EventListener);

        return () => {
            window.removeEventListener('cart:updated', handleCartUpdate as EventListener);
        };
    }, []);

    const handleClose = () => {
        uiService.hideAllOverlays();
    };

    const handleQuantityChange = (uniqueId: string, newQuantity: number) => {
        cartService.updateQuantity(uniqueId, newQuantity);
    };

    const handleRemoveItem = (uniqueId: string) => {
        cartService.removeItem(uniqueId);
    };

    const handleOrderTypeSelect = (type: 'dine-in' | 'takeaway') => {
        setOrderType(type);
        localStorage.setItem('orderType', type);
        // Dispatch custom event for orderType change
        window.dispatchEvent(new CustomEvent('orderType:changed', {
            detail: { orderType: type }
        }));
        uiService.hideAllOverlays();
        setTimeout(() => {
            uiService.showForm('payment');
        }, 300);
    };

    return (
        <>
            <div className="cart-dropdown">
                <div className="cart-header">
                    <h3>Giỏ hàng</h3>
                    <button className="close-cart" onClick={handleClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <div className="cart-items">
                    {items.length === 0 ? (
                        <div className="empty-cart">
                            <i className="fas fa-shopping-cart"></i>
                            <p>Giỏ hàng trống</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.uniqueId} className="cart-item">
                                <img src={item.image} alt={item.name} />
                                <div className="item-details">
                                    <h4>{item.name}</h4>
                                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                                        <div className="item-options">
                                            {item.selectedOptions.map(opt => (
                                                <div key={`${opt.name}-${opt.value}`} className="item-option">
                                                    {opt.name}: {opt.value}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="item-price">
                                        {item.onSale ? (
                                            <>
                                                <span className="original-price">
                                                    {item.price.toLocaleString()}₫
                                                </span>
                                                <span className="sale-price">
                                                    {item.salePrice?.toLocaleString()}₫
                                                </span>
                                            </>
                                        ) : (
                                            <span>{item.price.toLocaleString()}₫</span>
                                        )}
                                    </div>
                                    <div className="quantity-controls">
                                        <button 
                                            className="quantity-btn"
                                            onClick={() => handleQuantityChange(item.uniqueId, item.quantity - 1)}
                                        >
                                            <i className="fas fa-minus"></i>
                                        </button>
                                        <span>{item.quantity}</span>
                                        <button 
                                            className="quantity-btn"
                                            onClick={() => handleQuantityChange(item.uniqueId, item.quantity + 1)}
                                        >
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </div>
                                <button 
                                    className="remove-item"
                                    onClick={() => handleRemoveItem(item.uniqueId)}
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="cart-footer">
                    <div className="cart-summary">
                        <div className="cart-total">
                            <span>Tổng cộng:</span>
                            <span>{totalPrice.toLocaleString()}₫</span>
                        </div>
                    </div>
                    <div className="order-options">
                        <button 
                            className="order-btn"
                            onClick={() => handleOrderTypeSelect('dine-in')}
                            disabled={items.length === 0}
                        >
                            <i className="fas fa-utensils"></i>
                            Dùng tại quán
                        </button>
                        <button 
                            className="order-btn"
                            onClick={() => handleOrderTypeSelect('takeaway')}
                            disabled={items.length === 0}
                        >
                            <i className="fas fa-shopping-bag"></i>
                            Mang về
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};
