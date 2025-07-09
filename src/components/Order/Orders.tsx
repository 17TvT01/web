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
  total: number;
  created_at: string;
  items: OrderItem[];
  payment_method: string;
  order_type: string;
}

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<number | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const user = authService.getCurrentUser();
        if (!user) {
          setError('Bạn cần đăng nhập để xem đơn hàng');
          setLoading(false);
          return;
        }

        const data = await orderService.getOrders();
        // Lọc đơn hàng của người dùng hiện tại
        const userOrders = data.filter((order: Order) => order.user_id === user.id);
        setOrders(userOrders);
        setLoading(false);
      } catch (err) {
        console.error('Lỗi khi tải đơn hàng:', err);
        setError('Không thể tải đơn hàng. Vui lòng thử lại sau.');
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const toggleOrderDetails = (orderId: number) => {
    if (activeOrder === orderId) {
      setActiveOrder(null);
    } else {
      setActiveOrder(orderId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Đang xử lý';
      case 'processing':
        return 'Đang chuẩn bị';
      case 'shipped':
        return 'Đang giao hàng';
      case 'delivered':
        return 'Đã giao hàng';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
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
        <button 
          className="btn-shop-now"
          onClick={() => {
            // Hiển thị form đăng nhập thay vì chuyển trang
            uiService.showForm('login');
          }}
        >
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
        <p>Hãy mua sắm và quay lại đây để xem đơn hàng của bạn</p>
        <Link to="/" className="btn-shop-now">Mua sắm ngay</Link>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <h2>Đơn hàng của bạn</h2>
      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-header" onClick={() => toggleOrderDetails(order.id)}>
              <div className="order-info">
                <div className="order-id">Đơn hàng #{order.id}</div>
                <div className="order-date">{formatDate(order.created_at)}</div>
              </div>
              <div className="order-summary">
                <div className={`order-status ${getStatusClass(order.status)}`}>
                  {getStatusLabel(order.status)}
                </div>
                <div className="order-total">{order.total.toLocaleString('vi-VN')}đ</div>
                <div className="order-toggle">
                  <i className={`fas fa-chevron-${activeOrder === order.id ? 'up' : 'down'}`}></i>
                </div>
              </div>
            </div>
            
            {activeOrder === order.id && (
              <div className="order-details">
                <div className="order-type-payment">
                  <div className="order-type">
                    <span className="label">Hình thức:</span>
                    <span className="value">{order.order_type === 'dine-in' ? 'Dùng tại quán' : 'Mang về'}</span>
                  </div>
                  <div className="payment-method">
                    <span className="label">Thanh toán:</span>
                    <span className="value">{order.payment_method === 'cash' ? 'Tiền mặt' : 'Thẻ'}</span>
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
                      {order.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>{item.price.toLocaleString('vi-VN')}đ</td>
                          <td>{(item.price * item.quantity).toLocaleString('vi-VN')}đ</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>Tổng cộng</td>
                        <td>{order.total.toLocaleString('vi-VN')}đ</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                
                {order.status === 'pending' && (
                  <div className="order-actions">
                    <button 
                      className="btn-cancel-order"
                      onClick={async () => {
                        try {
                          await orderService.updateOrderStatus(order.id, 'cancelled');
                          // Cập nhật trạng thái đơn hàng trong state
                          setOrders(orders.map(o => 
                            o.id === order.id ? {...o, status: 'cancelled'} : o
                          ));
                          notificationService.show('Đã hủy đơn hàng thành công!', { type: 'success', duration: 3000 });
                        } catch (err) {
                          console.error('Lỗi khi hủy đơn hàng:', err);
                          notificationService.show('Không thể hủy đơn hàng. Vui lòng thử lại sau.', { type: 'error', duration: 3000 });
                        }
                      }}
                    >
                      Hủy đơn hàng
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