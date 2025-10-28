import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@mobile/context/AuthContext';

const LoginScreen = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const result = await login(email.trim(), password);
    setIsSubmitting(false);
    if (result.success) {
      const redirectPath =
        (location.state as { from?: string } | null)?.from && typeof location.state === 'object'
          ? (location.state as { from?: string }).from
          : '/';
      navigate(redirectPath, { replace: true });
    } else {
      setError(result.message ?? 'Đăng nhập thất bại.');
    }
  };

  return (
    <section className="page-section" style={{ justifyContent: 'center', paddingTop: 64, gap: 24 }}>
      <header style={{ textAlign: 'center' }}>
        <h1 className="screen-heading">Xin chào trở lại</h1>
        <p className="muted-text">Đăng nhập để tiếp tục đặt món.</p>
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
        {error && <div className="error-banner">{error}</div>}
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="text-field"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="login-password">
            Mật khẩu
          </label>
          <input
            id="login-password"
            className="text-field"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={event => setPassword(event.target.value)}
            required
          />
        </div>
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
        <span style={{ fontSize: 13, textAlign: 'center', color: '#6b7280' }}>
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </span>
      </form>
    </section>
  );
};

export default LoginScreen;
