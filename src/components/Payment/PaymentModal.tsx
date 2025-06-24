import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { paymentService } from '../../services/paymentService';
import { cartService } from '../../services/cartService';
import { uiService } from '../../services/uiService';
import { CartItem } from '../../types';

type PaymentMethod = 'cash' | 'card' | 'momo' | 'zalopay';
type OrderType = 'dine-in' | 'takeaway';

export const PaymentModal = () => {
    const [orderType, setOrderType] = useState<OrderType>(localStorage.getItem('orderType') as OrderType);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(localStorage.getItem('paymentMethod') as PaymentMethod);
    const [totalPrice, setTotalPrice] = useState(0);

    useEffect(() => {
        const handleOrderTypeChange = (e: CustomEvent<{ orderType: OrderType }>) => {
            setOrderType(e.detail.orderType);
        };

        const handlePaymentMethodChange = () => {
            const newPaymentMethod = localStorage.getItem('paymentMethod') as PaymentMethod;
            setPaymentMethod(newPaymentMethod);
        };

        // Listen for custom orderType change event
        window.addEventListener('orderType:changed', handleOrderTypeChange as EventListener);
        // Listen for localStorage changes from other tabs
        window.addEventListener('storage', handlePaymentMethodChange);

        return () => {
            window.removeEventListener('orderType:changed', handleOrderTypeChange as EventListener);
            window.removeEventListener('storage', handlePaymentMethodChange);
        };
    }, []);
    
    const [details, setDetails] = useState({
        fullName: '',
        phone: '',
        street: '',
        city: '',
    });
    const [items, setItems] = useState<CartItem[]>([]);

    useEffect(() => {
        const handleCartUpdate = (e: CustomEvent) => {
            setItems(e.detail.items);
            setTotalPrice(e.detail.totalPrice);
        };

        // Initial state
        setItems(cartService.getItems());
        setTotalPrice(cartService.getTotalPrice());

        // Listen for cart updates
        window.addEventListener('cart:updated', handleCartUpdate as EventListener);

        return () => {
            window.removeEventListener('cart:updated', handleCartUpdate as EventListener);
        };
    }, []);

    useEffect(() => {
        setTotalPrice(cartService.getTotalPrice());
    }, []);

    const handleClose = () => {
        uiService.hideForm('payment');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDetails(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const getQRValue = () => {
        // Tạo chi tiết đơn hàng
        const orderDetails = items.map(item =>
            `${item.name} x${item.quantity}`
        ).join(', ');

        // Format: paymentApp://pay?amount=XXX&message=XXX
        const message = `${orderType === 'dine-in' ? 'Thanh toán tại quán' : 'Đơn hàng mang về'}: ${orderDetails}`;
        const amount = totalPrice;
        
        if (orderType === 'dine-in') {
            // QR code cho thanh toán tại quán
            return `vietnamqr://pay?amount=${amount}&message=${encodeURIComponent(message)}`;
        } else if (paymentMethod === 'momo') {
            return `momo://pay?amount=${amount}&message=${encodeURIComponent(message)}`;
        } else if (paymentMethod === 'zalopay') {
            return `zalopay://pay?amount=${amount}&message=${encodeURIComponent(message)}`;
        }
        return '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const paymentDetails = {
                orderType,
                paymentMethod,
                ...(orderType === 'takeaway' ? {
                    address: {
                        fullName: details.fullName,
                        phone: details.phone,
                        street: details.street,
                        city: details.city
                    }
                } : {})
            };

            await paymentService.submitOrder(paymentDetails);

        } catch (error) {
            console.error('Submit payment error:', error);
        }
    };

    return (
        <div className="form-overlay payment-form">
            <div className="modal">
                <div className="modal-header">
                    <h2>Xác nhận thanh toán</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-content">
                        {orderType === 'takeaway' && (
                            <>
                                <div className="form-group">
                                    <label>Họ và tên</label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        className="form-control"
                                        value={details.fullName}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Số điện thoại</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        className="form-control"
                                        value={details.phone}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Địa chỉ</label>
                                    <input
                                        type="text"
                                        name="street"
                                        className="form-control"
                                        value={details.street}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Thành phố</label>
                                    <input
                                        type="text"
                                        name="city"
                                        className="form-control"
                                        value={details.city}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div className="payment-summary">
                            <h3>Chi tiết đơn hàng</h3>
                            <div className="order-items">
                                {items.map(item => (
                                    <div key={item.id} className="summary-item">
                                        <div className="item-info">
                                            <span className="item-name">{item.name}</span>
                                            <span className="item-quantity">x{item.quantity}</span>
                                        </div>
                                        <span className="item-price">
                                            {((item.onSale ? item.salePrice || item.price : item.price) * item.quantity).toLocaleString()}₫
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="summary-section">
                                <h4>Thông tin thanh toán</h4>
                                <div className="summary-item">
                                    <span>Hình thức:</span>
                                    <span>{orderType === 'dine-in' ? 'Dùng tại quán' : 'Mang về'}</span>
                                </div>
                                <div className="summary-item">
                                    <span>Phương thức:</span>
                                    <span>
                                        {paymentMethod === 'cash' && 'Tiền mặt'}
                                        {paymentMethod === 'card' && 'Thẻ ngân hàng'}
                                        {paymentMethod === 'momo' && 'Ví MoMo'}
                                        {paymentMethod === 'zalopay' && 'ZaloPay'}
                                    </span>
                                </div>
                                <div className="summary-item total">
                                    <span>Tổng tiền:</span>
                                    <span className="total-price">{totalPrice.toLocaleString()}₫</span>
                                </div>
                            </div>

                            {(orderType === 'dine-in' || paymentMethod === 'momo' || paymentMethod === 'zalopay') && (
                                <div className="qr-code-container">
                                    <p>Quét mã để thanh toán</p>
                                    <QRCodeSVG
                                        value={getQRValue()}
                                        size={200}
                                        level="L"
                                        includeMargin={true}
                                    />
                                    <p className="qr-price">{totalPrice.toLocaleString()}₫</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="cancel-btn" onClick={handleClose}>
                            Hủy
                        </button>
                        <button type="submit" className="confirm-btn">
                            Xác nhận
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};