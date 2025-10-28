import { useCallback, useEffect, useState } from 'react';
import { fetchOrders } from '@mobile/services/orderApi';

interface OrderRecord {
  id?: number;
  status?: string;
  customer_name?: string;
  total_price?: number;
  created_at?: string;
  updated_at?: string;
  items?: Array<{ product_id?: number; quantity?: number; name?: string }>;
  [key: string]: unknown;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'sent_to_kitchen', label: 'Đang chế biến' },
  { value: 'served', label: 'Đã phục vụ' }
];

const formatCurrency = (value?: number) =>
  value !== undefined
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
    : 'Đang cập nhật';

const formatDateTime = (value?: string) => {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('vi-VN');
};

const OrdersScreen = () => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (status?: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchOrders(status && status.trim() ? status : undefined);
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Không thể tải danh sách đơn hàng.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadOrders(statusFilter);
  }, [loadOrders, statusFilter]);

  return (
    <section className="page-section" style={{ gap: 18 }}>
      <header>
        <h1 className="screen-heading">Đơn hàng của tôi</h1>
        <p className="muted-text">Theo dõi trạng thái và chi tiết đơn hàng.</p>
      </header>

      <div className="form-group">
        <label className="form-label" htmlFor="status-filter">
          Trạng thái
        </label>
        <select
          id="status-filter"
          className="select-field"
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
        >
          {STATUS_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-state">Đang tải đơn hàng...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">Bạn chưa có đơn hàng nào.</div>
      ) : (
        <div className="page-section" style={{ gap: 12 }}>
          {orders.map(order => (
            <article
              key={order.id ?? Math.random()}
              style={{
                background: '#ffffff',
                borderRadius: 18,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)'
              }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>#{order.id ?? '—'}</strong>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: 'rgba(255, 107, 107, 0.12)',
                      color: 'var(--primary-color)',
                      textTransform: 'capitalize'
                    }}
                  >
                    {order.status ?? 'pending'}
                  </span>
                </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                Khách: <strong>{order.customer_name ?? 'Khách lẻ'}</strong>
              </div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                Tổng: <strong>{formatCurrency(typeof order.total_price === 'number' ? order.total_price : Number(order.total_price))}</strong>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                Tạo lúc: {formatDateTime(typeof order.created_at === 'string' ? order.created_at : undefined)}
              </div>
              {Array.isArray(order.items) && order.items.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, color: '#4b5563', fontSize: 12 }}>
                  {order.items.map((item, index) => (
                    <li key={`${item.product_id ?? index}-${index}`}>
                      Món {item.name ?? item.product_id}: x{item.quantity ?? 0}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default OrdersScreen;
