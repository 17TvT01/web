import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/orderService';
import { authService } from '../../services/authService';
import { notificationService } from '../../services/notificationService';
import { uiService } from '../../services/uiService';
import '../../assets/Css/components/orders.css';

interface OrderItem {
    id: number;
    product_name: string;
    quantity: number;
    price: number;
}

interface Order {
    id: number;
    user_id: string;
    status: string;
    payment_status?: 'paid' | 'unpaid' | null;
    payment_method: string;
    order_type: string;
    total: number;
    created_at: string;
    items: OrderItem[];
}

export const Orders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const user = authService.getCurrentUser();
                if (!user) {
                    setError('Bạn cần đăng nhập để xem đơn hàng');
                    setLoading(false);
                    return;
                }

                const response = await orderService.getOrders();
                const userOrders = response.filter((order: Order) => order.user_id === user.id);
                setOrders(userOrders);
            } catch (err) {
                console.error('Failed to load orders', err);
                setError('Không thể tải đơn hàng. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const toggleOrderDetails = (orderId: number) => {
        setExpandedOrder(prev => (prev === orderId ? null : orderId));
    };

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

    const getStatusLabel = (status: string) => {
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

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'processing':
                return 'status-processing';
            case 'completed':
                return 'status-delivered';
            case 'cancelled':
                return 'status-cancelled';
            default:
                return 'status-pending';
        }
    };

    const getPaymentStatusClass = (status?: 'paid' | 'unpaid' | null) =>
        status === 'paid' ? 'payment-paid' : 'payment-unpaid';

    const getPaymentStatusLabel = (status?: 'paid' | 'unpaid' | null) =>
        status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán';

    const getPaymentMethodLabel = (method: string) => {
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

    const handleMarkPaid = async (order: Order) => {
        try {
            await orderService.updateOrderPaymentStatus(order.id, 'paid');
            await orderService.updateOrderStatus(order.id, 'processing');
            notificationService.show('Đơn hàng đã được đánh dấu thanh toán.', { type: 'success', duration: 3000 });
            setOrders(prev => prev.map(o =>
                o.id === order.id
                    ? { ...o, payment_status: 'paid', status: o.status === 'pending' ? 'processing' : o.status }
                    : o
            ));
        } catch (err) {
            console.error('Failed to update payment status', err);
            notificationService.show('Không thể cập nhật trạng thái thanh toán.', { type: 'error', duration: 3000 });
        }
    };

    if (loading) {
        return <div className="orders-loading">Đang tải đơn hàng...</div>;
    }

    if (error) {
        return (
            <div className="orders-empty">
                <i className="fas fa-exclamation-circle orders-empty-icon"></i>
                <h3>{error}</h3>
                <button className="btn-shop-now" onClick={() => uiService.showForm('login')}>
                    Đăng nhập
                </button>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="orders-empty">
                <i className="fas fa-shopping-bag orders-empty-icon"></i>
                <h3>Bạn chưa có đơn hàng nào</h3>
                <p>Hãy mua sắm và quay lại đây để xem đơn của bạn.</p>
                <Link to="/" className="btn-shop-now">Mua sắm ngay</Link>
            </div>
        );
    }

    return (
        <div className="orders-container">
            <h2>Đơn hàng của bạn</h2>
            <div className="orders-list">
                {orders.map(order => (
                    <div key={order.id} className="order-card">
                        <div className="order-header" onClick={() => toggleOrderDetails(order.id)}>
                            <div className="order-info">
                                <div className="order-id">Đơn #{order.id}</div>
                                <div className="order-date">{formatDate(order.created_at)}</div>
                            </div>
                            <div className="order-summary">
                                <div className={`order-status ${getStatusClass(order.status)}`}>
                                    {getStatusLabel(order.status)}
                                </div>
                                <div className={`payment-status ${getPaymentStatusClass(order.payment_status)}`}>
                                    {getPaymentStatusLabel(order.payment_status)}
                                </div>
                                <div className="order-total">{order.total.toLocaleString('vi-VN')}₫</div>
                                <div className="order-toggle">
                                    <i className={`fas fa-chevron-${expandedOrder === order.id ? 'up' : 'down'}`}></i>
                                </div>
                            </div>
                        </div>

                        {expandedOrder === order.id && (
                            <div className="order-details">
                                <div className="order-type-payment">
                                    <div className="order-type">
                                        <span className="label">Hình thức:</span>
                                        <span className="value">{order.order_type === 'dine-in' ? 'Dùng tại quán' : 'Mang về'}</span>
                                    </div>
                                    <div className="payment-method">
                                        <span className="label">Thanh toán:</span>
                                        <span className="value">{getPaymentMethodLabel(order.payment_method)}</span>
                                    </div>
                                </div>

                                <div className="order-items">
                                    <h4>Sản phẩm</h4>
                                    <table className="items-table">
                                        <thead>
                                            <tr>
                                                <th>Sản phẩm</th>
                                                <th>Số lượng</th>
                                                <th>Đơn giá</th>
                                                <th>Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.product_name}</td>
                                                    <td>{item.quantity}</td>
                                                    <td>{item.price.toLocaleString('vi-VN')}₫</td>
                                                    <td>{(item.price * item.quantity).toLocaleString('vi-VN')}₫</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {order.status !== 'cancelled' && order.payment_method === 'cash' && order.payment_status !== 'paid' && (
                                    <div className="order-actions">
                                        <button className="btn-confirm-payment" onClick={() => handleMarkPaid(order)}>
                                            Đánh dấu đã thanh toán (tiền mặt)
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Orders;
