import { MouseEvent } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@mobile/context/AuthContext';
import './BottomNav.css';

type BottomNavItem = {
  to: string;
  icon: string;
  label: string;
  requiresAuth?: boolean;
};

const NAV_ITEMS: BottomNavItem[] = [
  { to: '/', icon: '🏠', label: 'Trang chủ' },
  { to: '/cart', icon: '🛒', label: 'Giỏ hàng' },
  { to: '/orders', icon: '📦', label: 'Đơn hàng', requiresAuth: true },
  { to: '/profile', icon: '👤', label: 'Tài khoản', requiresAuth: true }
];

const BottomNav = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>, item: BottomNavItem) => {
    if (item.requiresAuth && !user) {
      event.preventDefault();
      navigate('/login');
    }
  };

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={event => handleClick(event, item)}
          className={({ isActive }) =>
            `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
          }
          end={item.to === '/'}
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
