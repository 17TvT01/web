import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '@mobile/context/CartContext';
import './CartFab.css';

const CartFab = () => {
  const { totalItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const hiddenRoutes = ['/cart', '/login', '/register'];

  if (totalItems === 0 || hiddenRoutes.includes(location.pathname)) {
    return null;
  }

  return (
    <button className="cart-fab" onClick={() => navigate('/cart')}>
      🛍
      <span className="cart-fab__count">{totalItems} món</span>
    </button>
  );
};

export default CartFab;
