import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { uiService } from '../../services/uiService';
import { cartService } from '../../services/cartService';
import { authService } from '../../services/authService';
import { User } from '../../types/auth';
import '../../assets/Css/components/header.css';
import '../../assets/Css/components/auth-header.css';
import '../../assets/Css/auth.css';

interface Props {
    onSearch?: (query: string) => void;
}

export const Header = ({ onSearch }: Props) => {
    const [cartCount, setCartCount] = useState(0);
    const [searchValue, setSearchValue] = useState('');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    useEffect(() => {
        // Initialize user state
        const user = authService.getCurrentUser();
        setCurrentUser(user);

        // Initial cart count
        setCartCount(cartService.getTotalItems());

        // Update cart count when cart changes
        const handleCartUpdate = (e: CustomEvent) => {
            setCartCount(e.detail.totalItems);
        };

        // Update user state when auth changes
        const handleAuthUpdate = (e: CustomEvent) => {
            setCurrentUser(e.detail.user);
        };

        window.addEventListener('cart:updated', handleCartUpdate as EventListener);
        window.addEventListener('auth:updated', handleAuthUpdate as EventListener);

        return () => {
            window.removeEventListener('cart:updated', handleCartUpdate as EventListener);
            window.removeEventListener('auth:updated', handleAuthUpdate as EventListener);
        };
    }, []);

    const handleShowLoginForm = () => {
        console.log('Showing login form...'); // Debug
        uiService.showForm('login');
    };

    const handleShowRegisterForm = () => {
        console.log('Showing register form...'); // Debug
        uiService.showForm('register');
    };

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
        setShowUserDropdown(false);
    };

    const toggleUserDropdown = () => {
        setShowUserDropdown(!showUserDropdown);
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

                {!currentUser ? (
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
                ) : (
                    <div 
                        className={`user-menu ${showUserDropdown ? 'active' : ''}`}
                        onClick={toggleUserDropdown}
                    >
                        <div className="user-info">
                            <div className="user-avatar">
                                <img 
                                    src={currentUser.avatar || "/images/default-avatar.svg"} 
                                    alt={`${currentUser.name}'s avatar`} 
                                />
                            </div>
                            <span className="user-name">{currentUser.name}</span>
                        </div>
                        {showUserDropdown && (
                            <div className="user-dropdown">
                                <Link 
                                    to="/profile" 
                                    className="dropdown-item"
                                    onClick={() => setShowUserDropdown(false)}
                                >
                                    <i className="fas fa-user"></i>
                                    Tài khoản
                                </Link>
                                <Link 
                                    to="/orders" 
                                    className="dropdown-item"
                                    onClick={() => setShowUserDropdown(false)}
                                >
                                    <i className="fas fa-shopping-bag"></i>
                                    Đơn hàng
                                </Link>
                                <button 
                                    className="dropdown-item logout-btn"
                                    onClick={handleLogout}
                                >
                                    <i className="fas fa-sign-out-alt"></i>
                                    Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};