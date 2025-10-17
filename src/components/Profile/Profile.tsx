import React, { useEffect, useState } from 'react';
import { authService } from '../../services/authService';
import { orderService } from '../../services/orderService';
import { User } from '../../types/auth';
import { notificationService } from '../../services/notificationService';
import { uiService } from '../../services/uiService';
import '../../assets/Css/components/profile.css';

interface ProfileOrderItem {
    id: number;
    product_name: string;
    quantity: number;
    price: number;
}

interface ProfileOrder {
    id: number;
    user_id: string;
    status: string;
    payment_status?: 'paid' | 'unpaid' | null;
    payment_method: string;
    order_type: string;
    total: number;
    created_at: string;
    items: ProfileOrderItem[];
}

const formatMoney = (value: number) => `${value.toLocaleString('vi-VN')}₫`;

const getOrderStatusLabel = (status: string) => {
    switch (status) {
        case 'processing':
            return 'Đang chế biến';
        case 'completed':
            return 'Đã hoàn thành';
        case 'cancelled':
            return 'Đã hủy';
        default:
            return 'Chờ xử lý';
    }
};

const getPaymentBadge = (status?: 'paid' | 'unpaid' | null) =>
    status === 'paid' ? 'payment-paid' : 'payment-unpaid';

const getPaymentLabel = (method: string) => {
    switch (method) {
        case 'cash':
            return 'Tiền mặt';
        case 'card':
            return 'Thẻ';
        case 'momo':
            return 'MoMo';
        case 'zalopay':
            return 'ZaloPay';
        default:
            return method;
    }
};

const getPaymentStatusLabel = (status?: 'paid' | 'unpaid' | null) =>
    status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán';

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const Profile: React.FC = () => {
    const user = authService.getCurrentUser() as User;
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');

    const [orders, setOrders] = useState<ProfileOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!user) {
                setOrdersLoading(false);
                return;
            }
            try {
                const data = await orderService.getOrdersByUser(user.id);
                setOrders(data);
            } catch (err) {
                console.error('Failed to load order history', err);
                setOrdersError('Không thể tải lịch sử đơn hàng.');
            } finally {
                setOrdersLoading(false);
            }
        };

        fetchOrders();
    }, [user?.id]);

    if (!user) {
        return (
            <div className="profile-not-logged-in">
                <h2>Bạn chưa đăng nhập</h2>
                <p>Vui lòng đăng nhập để xem thông tin tài khoản</p>
                <button
                    className="login-btn"
                    onClick={() => {
                        uiService.showForm('login');
                    }}
                >
                    Đăng nhập
                </button>
            </div>
        );
    }

    const handleSaveProfile = () => {
        setTimeout(() => {
            notificationService.show('Cập nhật thông tin thành công!', { type: 'success', duration: 3000 });
            setIsEditing(false);
        }, 1000);
    };

    return (
        <div className="profile-container">
            <h2>Thông tin tài khoản</h2>

            <div className="profile-content">
                <div className="profile-avatar">
                    <img
                        src={user.avatar || '/images/default-avatar.svg'}
                        alt={`${user.name}'s avatar`}
                    />
                    <button className="change-avatar-btn">
                        <i className="fas fa-camera"></i>
                        Thay đổi
                    </button>
                </div>

                <div className="profile-details">
                    {isEditing ? (
                        <div className="profile-form">
                            <div className="form-group">
                                <label htmlFor="profile-name">Họ và tên</label>
                                <input
                                    type="text"
                                    id="profile-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="profile-email">Email</label>
                                <input
                                    type="email"
                                    id="profile-email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled
                                />
                                <small>Email không thể thay đổi</small>
                            </div>
                            <div className="profile-actions">
                                <button
                                    className="cancel-btn"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setName(user.name);
                                        setEmail(user.email);
                                    }}
                                >
                                    Hủy
                                </button>
                                <button
                                    className="save-btn"
                                    onClick={handleSaveProfile}
                                >
                                    Lưu thay đổi
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="profile-info">
                            <div className="profile-field">
                                <label>Họ và tên:</label>
                                <span>{user.name}</span>
                            </div>
                            <div className="profile-field">
                                <label>Email:</label>
                                <span>{user.email}</span>
                            </div>
                            <button
                                className="edit-profile-btn"
                                onClick={() => setIsEditing(true)}
                            >
                                <i className="fas fa-edit"></i>
                                Chỉnh sửa thông tin
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="order-history-section">
                <h3>Lịch sử đơn hàng</h3>
                {ordersLoading ? (
                    <div className="order-history-empty">Đang tải lịch sử đơn hàng...</div>
                ) : ordersError ? (
                    <div className="order-history-empty error">{ordersError}</div>
                ) : orders.length === 0 ? (
                    <div className="order-history-empty">Bạn chưa có đơn hàng nào.</div>
                ) : (
                    <div className="order-history-list">
                        {orders.map(order => (
                            <div key={order.id} className="order-history-card">
                                <div className="order-history-header">
                                    <div>
                                        <div className="order-history-id">Đơn #{order.id}</div>
                                        <div className="order-history-date">{formatDate(order.created_at)}</div>
                                    </div>
                                    <div className="order-history-status">
                                        <span className={`status-pill ${getStatusClass(order.status)}`}>
                                            {getOrderStatusLabel(order.status)}
                                        </span>
                                        <span className={`status-pill ${getPaymentBadge(order.payment_status)}`}>
                                            {getPaymentStatusLabel(order.payment_status)}
                                        </span>
                                    </div>
                                </div>

                                <div className="order-history-meta">
                                    <div>
                                        <span className="label">Hình thức:</span>
                                        <span>{order.order_type === 'dine-in' ? 'Dùng tại quán' : 'Mang về'}</span>
                                    </div>
                                    <div>
                                        <span className="label">Thanh toán:</span>
                                        <span>{getPaymentLabel(order.payment_method)}</span>
                                    </div>
                                    <div>
                                        <span className="label">Tổng tiền:</span>
                                        <span className="total">{formatMoney(order.total)}</span>
                                    </div>
                                </div>

                                <div className="order-history-items">
                                    {order.items.map(item => (
                                        <div key={item.id} className="order-history-item">
                                            <span className="item-name">{item.product_name}</span>
                                            <span className="item-qty">x{item.quantity}</span>
                                            <span className="item-price">{formatMoney(item.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
