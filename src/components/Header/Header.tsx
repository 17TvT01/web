import { useEffect, useState } from 'react';
import { uiService } from '../../services/uiService';
import { cartService } from '../../services/cartService';
import '../../assets/css/components/header.css';

interface Props {
    onSearch?: (query: string) => void;
}

export const Header = ({ onSearch }: Props) => {
    const [cartCount, setCartCount] = useState(0);
    const [searchValue, setSearchValue] = useState('');

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
        uiService.hideAllOverlays();
        // Add a small delay to ensure overlays are cleared
        setTimeout(() => {
            const loginForm = document.querySelector('.login-form');
            if (loginForm) {
                loginForm.classList.add('active');
                const overlay = document.querySelector('.dropdown-overlay');
                if (overlay) {
                    overlay.classList.add('active');
                }
            }
        }, 100);
    };

    const handleShowRegisterForm = () => {
        uiService.hideAllOverlays();
        // Add a small delay to ensure overlays are cleared
        setTimeout(() => {
            const registerForm = document.querySelector('.register-form');
            if (registerForm) {
                registerForm.classList.add('active');
                const overlay = document.querySelector('.dropdown-overlay');
                if (overlay) {
                    overlay.classList.add('active');
                }
            }
        }, 100);
    };

    const handleCartClick = () => {
        uiService.toggleDropdown('cart');
    };

    const handleNotificationClick = () => {
        uiService.toggleDropdown('notification');
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchValue(value);
        onSearch?.(value);
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
                        value={searchValue}
                        onChange={handleSearchChange}
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
                        <i className="fas fa-sign-in-alt"></i>
                        Đăng nhập
                    </button>
                    <button 
                        type="button"
                        className="auth-btn register-btn"
                        onClick={handleShowRegisterForm}
                    >
                        <i className="fas fa-user-plus"></i>
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