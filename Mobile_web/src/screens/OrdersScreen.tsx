import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOrder } from '@mobile/services/orderApi';
import {
  getGuestOrders,
  saveGuestOrders,
  removeGuestOrder,
  GuestOrderRecord
} from '@mobile/utils/guestOrders';

type OrderDetail = Record<string, unknown>;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  sent_to_kitchen: 'Đang chế biến',
  served: 'Đã phục vụ',
  cancelled: 'Đã hủy'
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: STATUS_LABELS.pending },
  { value: 'confirmed', label: STATUS_LABELS.confirmed },
  { value: 'sent_to_kitchen', label: STATUS_LABELS.sent_to_kitchen },
  { value: 'served', label: STATUS_LABELS.served },
  { value: 'cancelled', label: STATUS_LABELS.cancelled }
];

const normalizeStatus = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim().toLowerCase();
  }
  return 'pending';
};

const toNumberOrUndefined = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatCurrency = (value?: number) =>
  value !== undefined
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
    : 'Dang cap nhat';

const formatDateTime = (value?: string) => {
  if (!value) {
    return 'N/A';
  }
  return new Date(value).toLocaleString('vi-VN');
};

const OrdersScreen = () => {
  const [orders, setOrders] = useState<GuestOrderRecord[]>(() => getGuestOrders());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [updates, setUpdates] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    const stored = getGuestOrders();
    setOrders(stored);
    if (!stored.length) {
      setLoading(false);
      setError(null);
      setLastRefresh(new Date().toISOString());
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.all(
        stored.map(async record => {
          try {
            const detail = await getOrder(record.id);
            return { record, detail };
          } catch (err) {
            return { record, error: err as Error };
          }
        })
      );

      const nextUpdates: string[] = [];
      const nextOrders: GuestOrderRecord[] = stored.map(record => {
        const result = results.find(item => item.record.id === record.id);
        if (!result || !result.detail) {
          return record;
        }

        const detail = result.detail as OrderDetail;
        const status = normalizeStatus(detail.status);
        if (status !== record.status) {
          nextUpdates.push(
            `Đơn #${record.id} đã chuyển sang trạng thái "${STATUS_LABELS[status] ?? status}".`
          );
        }

        return {
          ...record,
          status,
          totalPrice: toNumberOrUndefined(detail.total_price) ?? record.totalPrice,
          customerName:
            (typeof detail.customer_name === 'string' && detail.customer_name) || record.customerName,
          lastUpdated:
            (typeof detail.updated_at === 'string' && detail.updated_at) ||
            (typeof detail.created_at === 'string' && detail.created_at) ||
            record.lastUpdated,
          tableNumber:
            (typeof detail.table_number === 'string' && detail.table_number) ||
            (typeof detail.table_number === 'number' ? String(detail.table_number) : record.tableNumber),
          items:
            Array.isArray(detail.items) && detail.items.length
              ? (detail.items as GuestOrderRecord['items'])
              : record.items
        };
      });

      saveGuestOrders(nextOrders);
      setOrders(nextOrders);

      if (nextUpdates.length) {
        setUpdates(prev => [...nextUpdates, ...prev].slice(0, 5));
      }

      const failed = results.filter(result => result.error);
      if (failed.length) {
        setError('Không thể cập nhật một số đơn hàng. Vui lòng thử lại sau.');
      } else {
        setError(null);
      }
    } catch (err) {
      setError('Không thể cập nhật đơn hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
      setLastRefresh(new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    void refreshOrders();
    const interval = window.setInterval(() => {
      void refreshOrders();
    }, 15000);
    return () => window.clearInterval(interval);
  }, [refreshOrders]);

  const filteredOrders = useMemo(() => {
    if (!statusFilter) {
      return orders;
    }
    return orders.filter(order => normalizeStatus(order.status) === statusFilter);
  }, [orders, statusFilter]);

  const handleDismissUpdate = (index: number) => {
    setUpdates(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleRemoveOrder = (orderId: number) => {
    const next = removeGuestOrder(orderId);
    setOrders(next);
  };

  const lastRefreshText = lastRefresh ? formatDateTime(lastRefresh) : null;

  return (
    <section className="page-section" style={{ gap: 18 }}>
      <header>
        <h1 className="screen-heading">Đơn hàng của bạn</h1>
        <p className="muted-text">
          Lưu và theo dõi trạng thái đơn trực tiếp trên thiết bị của bạn, không cần đăng nhập.
        </p>
      </header>

      {updates.map((update, index) => (
        <div key={`${update}-${index}`} className="success-banner">
          {update}{' '}
          <button
            type="button"
            className="icon-button icon-button--ghost"
            onClick={() => handleDismissUpdate(index)}
            aria-label="An thong bao"
            style={{ width: 24, height: 24, fontSize: 14 }}
          >
            x
          </button>
        </div>
      ))}

      <div className="form-group">
        <label className="form-label" htmlFor="status-filter">
          Loc theo trang thai
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

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="secondary-button" type="button" onClick={() => void refreshOrders()}>
          Làm mới trạng thái
        </button>
        {lastRefreshText && (
          <span className="muted-text" style={{ fontSize: 12 }}>
            Cập nhật lần cuối: {lastRefreshText}
          </span>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && !orders.length ? (
        <div className="loading-state">Đang tải đơn hàng...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          Chưa có đơn nào được lưu. Khi dặt hàng thành công, chúng tôi sẽ tự động theo dõi ở đây.
        </div>
      ) : (
        <div className="page-section" style={{ gap: 12 }}>
          {filteredOrders.map(order => {
            const status = normalizeStatus(order.status);
            const statusLabel = STATUS_LABELS[status] ?? status;
            return (
              <article
                key={order.id}
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
                  <strong>#{order.id}</strong>
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
                    {statusLabel}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  Khach: <strong>{order.customerName ?? 'Khach le'}</strong>
                </div>
                {order.tableNumber && (
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Ban: {order.tableNumber}</div>
                )}
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  Tong: <strong>{formatCurrency(order.totalPrice)}</strong>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  Cap nhat: {formatDateTime(order.lastUpdated ?? order.createdAt)}
                </div>
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#4b5563', fontSize: 12 }}>
                    {order.items.map((item, index) => (
                      <li key={`${item?.product_id ?? index}-${index}`}>
                        Mon {item?.name ?? item?.product_id}: x{item?.quantity ?? 0}
                      </li>
                    ))}
                  </ul>
                )}
                {status === 'served' || status === 'cancelled' ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => handleRemoveOrder(order.id)}
                  >
                    Ẩn đơn này khỏi danh sách
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default OrdersScreen;
