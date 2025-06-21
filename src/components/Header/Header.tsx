import { useEffect, useState } from 'react';
import { uiService } from '../../services/uiService';
import { cartService } from '../../services/cartService';
import { notificationService } from '../../services/notificationService';

export const Header = () => {
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        // Initial cart count
        setCartCount(cartService.getTotalItems());

        // Update cart count when cart changes
        const handleCartUpdate = (e: CustomEvent) => {
            setCartCount(e.detail.totalItems);
        };

        window.addEventListener('cart:updated', handleCartUpdate as EventListener);

        return () => {
            window.removeEventListener('cart:updated', handleCartUpdate as EventListener);
        };
    }, []);

    const handleShowLoginForm = () => {
        console.log('Showing login form...'); // Debug
        uiService.hideAllOverlays();
        uiService.showForm('login');
    };

    const handleShowRegisterForm = () => {
        console.log('Showing register form...'); // Debug
        uiService.hideAllOverlays();
        uiService.showForm('register');
    };

    const handleCartClick = () => {
        uiService.toggleDropdown('cart');
    };

    const handleNotificationClick = () => {
        uiService.toggleDropdown('notification');
    };

    return (
        <header>
            <div className="logo">
                <img src="/images/logo.png" alt="Store Logo" />
            </div>

            <div className="search-section">
                <div className="search-bar">
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm sản phẩm..."
                        aria-label="Search"
                    />
                    <button className="search-btn">
                        <i className="fas fa-search"></i>
                    </button>
                </div>
            </div>

            <div className="header-icons">
                <button 
                    className="notification-icon"
                    onClick={handleNotificationClick}
                >
                    <i className="fas fa-bell"></i>
                </button>

                <button 
                    className="cart-icon"
                    onClick={handleCartClick}
                >
                    <i className="fas fa-shopping-cart"></i>
                    {cartCount > 0 && (
                        <span className="cart-count">{cartCount}</span>
                    )}
                </button>

                <div className="auth-buttons">
                    <button 
                        type="button"
                        className="auth-btn login-btn"
                        onClick={handleShowLoginForm}
                    >
                        Đăng nhập
                    </button>
                    <button 
                        type="button"
                        className="auth-btn register-btn"
                        onClick={handleShowRegisterForm}
                    >
                        Đăng ký
                    </button>
                </div>

                <div className="user-icon" style={{ display: 'none' }}>
                    <div className="user-avatar">
                        <img src="/images/default-avatar.png" alt="User avatar" />
                    </div>
                    <span className="user-name">User</span>
                </div>
            </div>
        </header>
    );
};