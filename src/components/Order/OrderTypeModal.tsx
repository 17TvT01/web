import React, { useState } from 'react';
import { DineInModal } from './DineInModal';
import '../../assets/css/components/modal.css';

interface OrderTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectOrderType: (type: 'dine-in' | 'takeaway', tableNumber?: string, needsAssistance?: boolean) => void;
}

export const OrderTypeModal: React.FC<OrderTypeModalProps> = ({ isOpen, onClose, onSelectOrderType }) => {
    const [showDineInModal, setShowDineInModal] = useState(false);

    const handleDineInSubmit = (tableNumber: string, needsAssistance: boolean) => {
        onSelectOrderType('dine-in', tableNumber, needsAssistance);
        setShowDineInModal(false);
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <>
            <div className="modal-overlay">
                <div className="modal-content">
                    <h2>Chọn hình thức dùng bữa</h2>
                    <div className="order-type-options">
                        <button 
                            className="order-type-btn"
                            onClick={() => setShowDineInModal(true)}
                        >
                            <i className="fas fa-utensils"></i>
                            <span>Dùng tại quán</span>
                        </button>
                        <button 
                            className="order-type-btn"
                            onClick={() => {
                                onSelectOrderType('takeaway');
                                onClose();
                            }}
                        >
                            <i className="fas fa-shopping-bag"></i>
                            <span>Mang đi</span>
                        </button>
                    </div>
                    <div className="modal-actions">
                        <button onClick={onClose} className="btn-secondary">Hủy</button>
                    </div>
                </div>
            </div>

            <DineInModal
                isOpen={showDineInModal}
                onClose={() => setShowDineInModal(false)}
                onSubmit={handleDineInSubmit}
            />
        </>
    );
};
