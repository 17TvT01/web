import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@mobile/context/AuthContext';
import './TopBar.css';

const getInitial = (value?: string) => {
  if (!value) {
    return '👤';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '👤';
  }
  return trimmed.charAt(0).toUpperCase();
};

const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const showBackButton =
    location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="top-bar">
      <div className="top-bar__left">
        {showBackButton ? (
          <button className="icon-button icon-button--ghost" onClick={handleBack} aria-label="Quay lại">
            ←
          </button>
        ) : (
          <div className="top-bar__logo">Shop</div>
        )}
        <div className="top-bar__welcome">
          <span>Xin chào</span>
          <span>{user?.name ?? 'Khách'}</span>
        </div>
      </div>
      <div className="top-bar__actions">
        <button className="icon-button" onClick={() => navigate('/orders')} aria-label="Đơn hàng">
          🧾
        </button>
        <button
          className="icon-button"
          onClick={() => navigate(user ? '/profile' : '/login')}
          aria-label="Tài khoản"
        >
          {getInitial(user?.name)}
        </button>
      </div>
    </header>
  );
};

export default TopBar;
