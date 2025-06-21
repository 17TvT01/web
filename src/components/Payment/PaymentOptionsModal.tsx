import { useState } from 'react';
import { uiService } from '../../services/uiService';

type PaymentMethod = 'cash' | 'card' | 'momo' | 'zalopay';

export const PaymentOptionsModal = () => {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');

    const handleClose = () => {
        uiService.hideForm('paymentOptions');
    };

    const handleConfirm = () => {
        // Lưu phương thức thanh toán và chuyển sang form thanh toán
        localStorage.setItem('paymentMethod', selectedMethod);
        handleClose();
        uiService.showForm('payment');
    };

    return (
        <div className="form-overlay payment-options-form">
            <div className="modal">
                <div className="modal-header">
                    <h2>Chọn phương thức thanh toán</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <div className="modal-content">
                    <div className="payment-methods">
                        <button 
                            className={`payment-method-btn ${selectedMethod === 'cash' ? 'active' : ''}`}
                            onClick={() => setSelectedMethod('cash')}
                        >
                            <i className="fas fa-money-bill-wave"></i>
                            <span>Tiền mặt</span>
                            {selectedMethod === 'cash' && (
                                <i className="fas fa-check check-icon"></i>
                            )}
                        </button>

                        <button 
                            className={`payment-method-btn ${selectedMethod === 'card' ? 'active' : ''}`}
                            onClick={() => setSelectedMethod('card')}
                        >
                            <i className="fas fa-credit-card"></i>
                            <span>Thẻ ngân hàng</span>
                            {selectedMethod === 'card' && (
                                <i className="fas fa-check check-icon"></i>
                            )}
                        </button>

                        <button 
                            className={`payment-method-btn ${selectedMethod === 'momo' ? 'active' : ''}`}
                            onClick={() => setSelectedMethod('momo')}
                        >
                            <img src="/images/momo-icon.png" alt="MoMo" />
                            <span>Ví MoMo</span>
                            {selectedMethod === 'momo' && (
                                <i className="fas fa-check check-icon"></i>
                            )}
                        </button>

                        <button 
                            className={`payment-method-btn ${selectedMethod === 'zalopay' ? 'active' : ''}`}
                            onClick={() => setSelectedMethod('zalopay')}
                        >
                            <img src="/images/zalopay-icon.png" alt="ZaloPay" />
                            <span>ZaloPay</span>
                            {selectedMethod === 'zalopay' && (
                                <i className="fas fa-check check-icon"></i>
                            )}
                        </button>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-btn" onClick={handleClose}>
                        Hủy
                    </button>
                    <button className="confirm-btn" onClick={handleConfirm}>
                        Tiếp tục
                    </button>
                </div>
            </div>
        </div>
    );
};