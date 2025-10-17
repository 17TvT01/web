import { uiService } from '../../services/uiService';
import { notificationService } from '../../services/notificationService';

export const Notification = () => {
    const handleClose = () => {
        uiService.hideAllOverlays();
    };

    const handleClearAll = () => {
        notificationService.clearAll();
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
                <div className="empty-notifications">
                    <i className="fas fa-bell-slash"></i>
                    <p>Không có thông báo</p>
                </div>
            </div>
        </div>
    );
};
