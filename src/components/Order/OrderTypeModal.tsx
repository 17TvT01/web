import { useState } from 'react';
import { uiService } from '../../services/uiService';

type OrderType = 'dine-in' | 'takeaway';

export const OrderTypeModal = () => {
    const [selectedType, setSelectedType] = useState<OrderType>('dine-in');

    const handleClose = () => {
        uiService.hideForm('orderType');
    };

    const handleConfirm = () => {
        // Lưu lựa chọn và chuyển sang modal thanh toán
        localStorage.setItem('orderType', selectedType);
        handleClose();
        uiService.showForm('paymentOptions');
    };

    return (
        <div className="form-overlay order-type-form">
            <div className="modal">
                <div className="modal-header">
                    <h2>Chọn hình thức</h2>
                    <button className="modal-close" onClick={handleClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <div className="modal-content">
                    <div className="order-type-options">
                        <button 
                            className={`order-type-btn ${selectedType === 'dine-in' ? 'active' : ''}`}
                            onClick={() => setSelectedType('dine-in')}
                        >
                            <i className="fas fa-utensils"></i>
                            <span>Dùng tại quán</span>
                            {selectedType === 'dine-in' && (
                                <i className="fas fa-check check-icon"></i>
                            )}
                        </button>

                        <button 
                            className={`order-type-btn ${selectedType === 'takeaway' ? 'active' : ''}`}
                            onClick={() => setSelectedType('takeaway')}
                        >
                            <i className="fas fa-shopping-bag"></i>
                            <span>Mang về</span>
                            {selectedType === 'takeaway' && (
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