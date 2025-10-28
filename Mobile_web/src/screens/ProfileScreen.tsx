import { useNavigate } from 'react-router-dom';
import { useAuth } from '@mobile/context/AuthContext';

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <section className="page-section">
        <div className="empty-state">Bạn cần đăng nhập để xem thông tin cá nhân.</div>
        <button className="primary-button" type="button" onClick={() => navigate('/login')}>
          Đăng nhập
        </button>
      </section>
    );
  }

  return (
    <section className="page-section" style={{ gap: 18 }}>
      <header>
        <h1 className="screen-heading">Tài khoản của bạn</h1>
        <p className="muted-text">Quản lý thông tin và đơn hàng tại SweetHome.</p>
      </header>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: '#ffffff',
          padding: 18,
          borderRadius: 18,
          boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)'
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--primary-color)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 700
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{user.name}</strong>
            <div className="muted-text">{user.email}</div>
          </div>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => navigate('/orders')}
        >
          Xem đơn hàng của tôi
        </button>
        <button
          className="danger-button"
          type="button"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          Đăng xuất
        </button>
      </div>
    </section>
  );
};

export default ProfileScreen;
