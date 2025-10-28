import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@mobile/context/CartContext';
import { useAuth } from '@mobile/context/AuthContext';
import { createOrder, CreateOrderPayload } from '@mobile/services/orderApi';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

type FeedbackState = {
  type: 'success' | 'error';
  message: string;
} | null;

const CartScreen = () => {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (user?.name) {
      setCustomerName(user.name);
    }
  }, [user]);

  const disabled = useMemo(() => items.length === 0 || isSubmitting, [items.length, isSubmitting]);

  const handleOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items.length || isSubmitting) {
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);
    try {
      const payload: CreateOrderPayload = {
        customer_name: customerName.trim() || 'Khách lẻ',
        items: items.map(item => ({
          product_id: Number(item.id),
          quantity: item.quantity,
          selected_options: item.selectedOptions
        })),
        total_price: totalPrice,
        order_type: 'dine_in',
        payment_method: paymentMethod,
        note: note.trim() || undefined,
        customer_email: user?.email,
        email_receipt: Boolean(user?.email)
      };

      const response = await createOrder(payload);
      setFeedback({
        type: 'success',
        message: `Đặt món thành công! Mã đơn #${response.order_id}${
          response.table_number ? ` • Bàn ${response.table_number}` : ''
        }`
      });
      clearCart();
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Không thể gửi đơn hàng. Vui lòng thử lại sau.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <section className="page-section">
        <div className="empty-state">
          Giỏ hàng của bạn đang trống. Khám phá món ngon tại trang chủ nhé!
        </div>
        <button className="primary-button" type="button" onClick={() => navigate('/')}>
          Về trang chủ
        </button>
      </section>
    );
  }

  return (
    <section className="page-section" style={{ gap: 20 }}>
      <header>
        <h1 className="screen-heading">Giỏ hàng của bạn</h1>
        <p className="muted-text">{totalItems} món • Tổng {formatCurrency(totalPrice)}</p>
      </header>

      {feedback && (
        <div className={feedback.type === 'success' ? 'success-banner' : 'error-banner'}>
          {feedback.message}
        </div>
      )}

      <div className="page-section" style={{ gap: 12 }}>
        {items.map(item => {
          const unitPrice =
            item.onSale && typeof item.salePrice === 'number' ? item.salePrice : item.price;
          return (
            <article
              key={item.uniqueId}
              style={{
                display: 'grid',
                gridTemplateColumns: '96px 1fr',
                gap: 16,
                padding: 12,
                borderRadius: 16,
                background: '#ffffff',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)'
              }}
            >
              <img
                src={item.image || '/images/default-product.jpg'}
                alt={item.name}
                style={{
                  width: '100%',
                  height: '96px',
                  objectFit: 'cover',
                  borderRadius: 14
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <strong>{item.name}</strong>
                <span className="muted-text">{formatCurrency(unitPrice)} / món</span>
                {item.selectedOptions && (
                  <ul style={{ margin: 0, paddingLeft: 16, color: '#6b7280', fontSize: 12 }}>
                    {item.selectedOptions.map(option => (
                      <li key={`${option.name}-${option.value}`}>
                        {option.name}: {option.value}
                      </li>
                    ))}
                  </ul>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => updateQuantity(item.uniqueId, item.quantity - 1)}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 600 }}>{item.quantity}</span>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => updateQuantity(item.uniqueId, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button className="danger-button" type="button" onClick={() => removeItem(item.uniqueId)}>
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <form className="page-section" style={{ gap: 16 }} onSubmit={handleOrder}>
        <div className="form-group">
          <label className="form-label" htmlFor="customer-name">
            Tên khách hàng
          </label>
          <input
            id="customer-name"
            className="text-field"
            placeholder="Nhập tên của bạn"
            value={customerName}
            onChange={event => setCustomerName(event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="payment-method">
            Phương thức thanh toán
          </label>
          <select
            id="payment-method"
            className="select-field"
            value={paymentMethod}
            onChange={event => setPaymentMethod(event.target.value)}
          >
            <option value="cash">Tiền mặt tại quầy</option>
            <option value="bank_transfer">Chuyển khoản</option>
            <option value="ewallet">Ví điện tử</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="order-note">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="order-note"
            className="text-area"
            rows={3}
            placeholder="Ví dụ: Ít đá, thêm trân châu..."
            value={note}
            onChange={event => setNote(event.target.value)}
          />
        </div>

        <button className="primary-button" type="submit" disabled={disabled}>
          {isSubmitting ? 'Đang gửi đơn...' : `Đặt món ngay • ${formatCurrency(totalPrice)}`}
        </button>
      </form>
    </section>
  );
};

export default CartScreen;
