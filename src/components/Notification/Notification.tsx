import { useState } from 'react';
import { uiService } from '../../services/uiService';

export const Notification = () => {
    const [notifications] = useState([
        {
            id: 1,
            type: 'info',
            message: 'Chào mừng bạn đến với Store!',
            time: '1 phút trước'
        },
        {
            id: 2,
            type: 'success',
            message: 'Đơn hàng #123 đã được giao thành công',
            time: '5 phút trước'
        }
    ]);

    const handleClose = () => {
        uiService.hideAllOverlays();
    };

    const handleClearAll = () => {
        // Implement clear all notifications
        uiService.hideAllOverlays();
    };

    return (
        <div className="notification-dropdown">
            <div className="notification-header">
                <h3>Thông báo</h3>
                <div>
                    <button className="clear-notifications" onClick={handleClearAll}>
                        Xóa tất cả
                    </button>
                    <button className="close-notifications" onClick={handleClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <div className="notification-items">
                {notifications.length === 0 ? (
                    <div className="empty-notifications">
                        <i className="fas fa-bell-slash"></i>
                        <p>Không có thông báo</p>
                    </div>
                ) : (
                    notifications.map(notification => (
                        <div 
                            key={notification.id} 
                            className={`notification-item ${notification.type}`}
                        >
                            <i className={`fas fa-${
                                notification.type === 'info' ? 'info-circle' :
                                notification.type === 'success' ? 'check-circle' :
                                notification.type === 'warning' ? 'exclamation-circle' :
                                'times-circle'
                            }`}></i>
                            <div>
                                <p>{notification.message}</p>
                                <span className="time">{notification.time}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};