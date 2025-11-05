import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@mobile/context/AuthContext';
import { CartProvider } from '@mobile/context/CartContext';
import { ProductProvider } from '@mobile/context/ProductContext';
import TopBar from '@mobile/components/TopBar';
import BottomNav from '@mobile/components/BottomNav';
import CartFab from '@mobile/components/CartFab';
import HomeScreen from '@mobile/screens/HomeScreen';
import ProductDetailScreen from '@mobile/screens/ProductDetailScreen';
import CartScreen from '@mobile/screens/CartScreen';
import OrdersScreen from '@mobile/screens/OrdersScreen';
import ProfileScreen from '@mobile/screens/ProfileScreen';
import LoginScreen from '@mobile/screens/LoginScreen';
import RegisterScreen from '@mobile/screens/RegisterScreen';
import NotFoundScreen from '@mobile/screens/NotFoundScreen';

const RequireAuth: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return <div className="loading-state">Đang tải ...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppLayout = () => {
  const location = useLocation();
  const hideChrome = location.pathname === '/login' || location.pathname === '/register';

  return (
    <div className="app-shell">
      {!hideChrome && <TopBar />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/product/:productId" element={<ProductDetailScreen />} />
          <Route path="/cart" element={<CartScreen />} />
          <Route path="/orders" element={<OrdersScreen />} />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfileScreen />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </main>
      {!hideChrome && (
        <>
          <CartFab />
          <BottomNav />
        </>
      )}
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          <AppLayout />
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
