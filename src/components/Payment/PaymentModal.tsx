import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { paymentService } from '../../services/paymentService';
import { cartService } from '../../services/cartService';
import { uiService } from '../../services/uiService';

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
        // Format: paymentApp://pay?amount=XXX&message=XXX
        const message = `Thanh toán ${orderType === 'dine-in' ? 'tại quán' : 'mang về'}`;
        const amount = totalPrice;
        
        if (paymentMethod === 'momo') {
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
                            <h3>Thông tin thanh toán</h3>
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
                            <div className="summary-item">
                                <span>Tổng tiền:</span>
                                <span>{totalPrice.toLocaleString()}₫</span>
                            </div>

                            {(paymentMethod === 'momo' || paymentMethod === 'zalopay') && (
                                <div className="qr-code-container">
                                    <p>Quét mã để thanh toán</p>
                                    <QRCodeSVG
                                        value={getQRValue()}
                                        size={200}
                                        level="L"
                                        includeMargin={true}
                                    />
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