const EMPTY_TEMPLATE = `
    <div class="empty-notifications">
        <i class="fas fa-bell-slash"></i>
        <p>Không có thông báo</p>
    </div>
`;

type NotificationType = 'info' | 'success' | 'warning' | 'error';
type NotificationData = { type: NotificationType; duration?: number };

class NotificationService {
    private container: HTMLElement | null = null;

    initialize() {
        this.container = document.querySelector('.notification-dropdown');

        const closeBtn = document.querySelector('.close-notifications');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.container?.classList.remove('active');
                const overlay = document.querySelector('.dropdown-overlay');
                overlay?.classList.remove('active');
            });
        }
    }

    private ensureEmptyState(notifications: Element) {
        if (!notifications.querySelector('.notification-item')) {
            notifications.innerHTML = EMPTY_TEMPLATE;
        }
    }

    show(message: string, data: NotificationData) {
        const { type = 'info', duration = 3000 } = data;

        if (this.container) {
            const notifications = this.container.querySelector('.notification-items');
            if (notifications) {
                const emptyState = notifications.querySelector('.empty-notifications');
                if (emptyState) {
                    emptyState.remove();
                }

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
                    <button class="notification-actions">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                `;
                notifications.insertBefore(notification, notifications.firstChild);

                const oldNotifications = notifications.querySelectorAll('.notification-item');
                oldNotifications.forEach((notif, index) => {
                    const time = notif.querySelector('.time');
                    if (time) {
                        time.textContent = index
                            ? `${index} phút trước`
                            : 'Vừa xong';
                    }
                });

                if (oldNotifications.length > 5) {
                    notifications.removeChild(oldNotifications[oldNotifications.length - 1]);
                }

                const actionsButton = notification.querySelector('.notification-actions');
                if (actionsButton) {
                    actionsButton.addEventListener('click', (event) => {
                        event.stopPropagation();
                        notification.remove();
                        this.ensureEmptyState(notifications);
                    });
                }
            }
        }

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
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, duration);
    }

    clearAll() {
        if (!this.container) {
            return;
        }

        const notifications = this.container.querySelector('.notification-items');
        if (!notifications) {
            return;
        }

        notifications.innerHTML = EMPTY_TEMPLATE;
    }
}

export const notificationService = new NotificationService();
