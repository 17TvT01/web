import React, { useState } from 'react';
import '../../assets/css/components/modal.css';

interface DineInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (tableNumber: string, needsAssistance: boolean) => void;
}

export const DineInModal: React.FC<DineInModalProps> = ({ 
    isOpen, 
    onClose, 
    onSubmit 
}) => {
    const [tableNumber, setTableNumber] = useState('');
    const [needsAssistance, setNeedsAssistance] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (tableNumber.trim()) {
            onSubmit(tableNumber.trim(), needsAssistance);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Chọn bàn</h2>
                <div className="form-group">
                    <label>Số bàn:</label>
                    <input
                        type="text"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="Nhập số bàn"
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={needsAssistance}
                            onChange={(e) => setNeedsAssistance(e.target.checked)}
                        />
                        Cần hỗ trợ
                    </label>
                </div>
                <div className="modal-actions">
                    <button onClick={onClose} className="btn-secondary">
                        Hủy
                    </button>
                    <button onClick={handleSubmit} className="btn-primary" disabled={!tableNumber.trim()}>
                        Xác nhận
                    </button>
                </div>
            </div>
        </div>
    );
};