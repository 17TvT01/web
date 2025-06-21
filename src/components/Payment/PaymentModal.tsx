import { useState } from 'react';
import { paymentService } from '../../services/paymentService';
import { uiService } from '../../services/uiService';

type PaymentMethod = 'cash' | 'card' | 'momo' | 'zalopay';
type OrderType = 'dine-in' | 'takeaway';

export const PaymentModal = () => {
    const orderType = localStorage.getItem('orderType') as OrderType;
    const paymentMethod = localStorage.getItem('paymentMethod') as PaymentMethod;
    
    const [details, setDetails] = useState({
        fullName: '',
        phone: '',
        street: '',
        city: '',
        tableNumber: ''
    });

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
                } : {
                    tableNumber: details.tableNumber
                })
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
                        {orderType === 'takeaway' ? (
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
                        ) : (
                            <div className="form-group">
                                <label>Số bàn</label>
                                <input
                                    type="text"
                                    name="tableNumber"
                                    className="form-control"
                                    value={details.tableNumber}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
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