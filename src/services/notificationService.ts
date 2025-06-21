type NotificationType = 'info' | 'success' | 'warning' | 'error';
type NotificationData = { type: NotificationType; duration?: number };

class NotificationService {
    private container: HTMLElement | null = null;

    initialize() {
        this.container = document.querySelector('.notification-dropdown');

        // Close notification when clicking close button
        const closeBtn = document.querySelector('.close-notifications');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.container?.classList.remove('active');
                const overlay = document.querySelector('.dropdown-overlay');
                overlay?.classList.remove('active');
            });
        }
    }

    show(message: string, data: NotificationData) {
        const { type = 'info', duration = 3000 } = data;

        // Add notification to dropdown
        if (this.container) {
            const notifications = this.container.querySelector('.notification-items');
            if (notifications) {
                const notification = document.createElement('div');
                notification.className = `notification-item ${type}`;
                notification.innerHTML = `
                    <i class="fas fa-${
                        type === 'info' ? 'info-circle' :
                        type === 'success' ? 'check-circle' :
                        type === 'warning' ? 'exclamation-circle' :
                        'times-circle'
                    }"></i>
                    <div>
                        <p>${message}</p>
                        <span class="time">Vừa xong</span>
                    </div>
                `;
                notifications.insertBefore(notification, notifications.firstChild);

                // Update timestamp for old notifications
                const oldNotifications = notifications.querySelectorAll('.notification-item');
                oldNotifications.forEach((notif, index) => {
                    if (index > 0) {
                        const time = notif.querySelector('.time');
                        if (time) {
                            time.textContent = index === 1 ? '1 phút trước' : `${index} phút trước`;
                        }
                    }
                });

                // Remove old notifications if too many
                if (oldNotifications.length > 5) {
                    notifications.removeChild(oldNotifications[oldNotifications.length - 1]);
                }

                // Show notification dropdown briefly
                this.container.classList.add('active');
                const overlay = document.querySelector('.dropdown-overlay');
                overlay?.classList.add('active');

                // Auto hide after duration
                setTimeout(() => {
                    if (!this.container?.contains(document.activeElement)) {
                        this.container?.classList.remove('active');
                        overlay?.classList.remove('active');
                    }
                }, duration);
            }
        }

        // Also show toast notification
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${
                type === 'info' ? 'info-circle' :
                type === 'success' ? 'check-circle' :
                type === 'warning' ? 'exclamation-circle' :
                'times-circle'
            }"></i>
            <p>${message}</p>
        `;

        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);
    }

    clearAll() {
        if (this.container) {
            const notifications = this.container.querySelector('.notification-items');
            if (notifications) {
                notifications.innerHTML = `
                    <div class="empty-notifications">
                        <i class="fas fa-bell-slash"></i>
                        <p>Không có thông báo</p>
                    </div>
                `;
            }
        }
    }
}

export const notificationService = new NotificationService();