import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@mobile/context/AuthContext';

const RegisterScreen = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    const result = await register(name.trim(), email.trim(), password);
    setIsSubmitting(false);
    if (result.success) {
      setFeedback({ type: 'success', message: 'Đăng ký thành công! Vui lòng đăng nhập.' });
      setTimeout(() => navigate('/login'), 1200);
    } else {
      setFeedback({
        type: 'error',
        message: result.message ?? 'Đăng ký thất bại. Vui lòng thử lại.'
      });
    }
  };

  return (
    <section className="page-section" style={{ justifyContent: 'center', paddingTop: 48, gap: 24 }}>
      <header style={{ textAlign: 'center' }}>
        <h1 className="screen-heading">Tạo tài khoản</h1>
        <p className="muted-text">Đăng ký để lưu đơn hàng và ưu đãi dành riêng cho bạn.</p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          background: '#ffffff',
          padding: 24,
          borderRadius: 24,
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)'
        }}
      >
        {feedback && (
          <div className={feedback.type === 'success' ? 'success-banner' : 'error-banner'}>
            {feedback.message}
          </div>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="register-name">
            Họ và tên
          </label>
          <input
            id="register-name"
            className="text-field"
            type="text"
            placeholder="Nguyễn Văn A"
            value={name}
            onChange={event => setName(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            className="text-field"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="register-password">
            Mật khẩu
          </label>
          <input
            id="register-password"
            className="text-field"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="register-confirm">
            Xác nhận mật khẩu
          </label>
          <input
            id="register-confirm"
            className="text-field"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={event => setConfirmPassword(event.target.value)}
            required
          />
        </div>
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>
        <span style={{ fontSize: 13, textAlign: 'center', color: '#6b7280' }}>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </span>
      </form>
    </section>
  );
};

export default RegisterScreen;
