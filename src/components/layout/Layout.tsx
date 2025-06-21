import { useEffect, useState } from 'react';
import { Header } from '../Header/Header';
import { ProductList } from '../Product/ProductList';
import { Footer } from '../Footer/Footer';
import { Cart } from '../Cart/Cart';
import { PaymentModal } from '../Payment/PaymentModal';
import { PaymentOptionsModal } from '../Payment/PaymentOptionsModal';
import { OrderTypeModal } from '../Order/OrderTypeModal';
import { Notification } from '../Notification/Notification';
import { uiService } from '../../services/uiService';

export const Layout = () => {
    const [activeCategory, setActiveCategory] = useState('all');
    const [priceRange, setPriceRange] = useState({ min: 0, max: 1000000 });
    const [selectedFilters, setSelectedFilters] = useState({
        inStock: false,
        onSale: false,
        newArrival: false
    });

    useEffect(() => {
        // Initialize services when component mounts
        uiService.initialize();
    }, []);

    const handleCategoryChange = (category: string) => {
        setActiveCategory(category);
    };

    return (
        <>
            <Header />
            
            <nav>
                <div className="container">
                    <div className="nav-buttons">
                        <button 
                            className={`nav-btn ${activeCategory === 'all' ? 'active' : ''}`}
                            onClick={() => handleCategoryChange('all')}
                        >
                            Tất cả
                        </button>
                        <button 
                            className={`nav-btn ${activeCategory === 'cake' ? 'active' : ''}`}
                            onClick={() => handleCategoryChange('cake')}
                        >
                            Bánh kem
                        </button>
                        <button 
                            className={`nav-btn ${activeCategory === 'drink' ? 'active' : ''}`}
                            onClick={() => handleCategoryChange('drink')}
                        >
                            Đồ uống
                        </button>
                        <button 
                            className={`nav-btn ${activeCategory === 'food' ? 'active' : ''}`}
                            onClick={() => handleCategoryChange('food')}
                        >
                            Đồ ăn
                        </button>
                    </div>
                </div>
            </nav>

            <div className="main-container">
                <aside className="sidebar">
                    <div className="category-menu">
                        <h3 className="category-title">Bộ lọc sản phẩm</h3>
                        
                        <div className="filter-section">
                            <h4>Trạng thái</h4>
                            <div className="filter-options">
                                <div className="filter-option">
                                    <input 
                                        type="checkbox"
                                        id="inStock"
                                        checked={selectedFilters.inStock}
                                        onChange={() => {}}
                                    />
                                    <label htmlFor="inStock">Còn hàng</label>
                                </div>
                                <div className="filter-option">
                                    <input 
                                        type="checkbox"
                                        id="onSale"
                                        checked={selectedFilters.onSale}
                                        onChange={() => {}}
                                    />
                                    <label htmlFor="onSale">Đang giảm giá</label>
                                </div>
                                <div className="filter-option">
                                    <input 
                                        type="checkbox"
                                        id="newArrival"
                                        checked={selectedFilters.newArrival}
                                        onChange={() => {}}
                                    />
                                    <label htmlFor="newArrival">Hàng mới về</label>
                                </div>
                            </div>
                        </div>

                        <div className="filter-section">
                            <h4>Giá</h4>
                            <div className="price-range">
                                <div className="price-inputs">
                                    <input 
                                        type="number"
                                        className="price-input"
                                        placeholder="Min"
                                        value={priceRange.min}
                                        onChange={() => {}}
                                    />
                                    <span className="divider">-</span>
                                    <input 
                                        type="number"
                                        className="price-input"
                                        placeholder="Max"
                                        value={priceRange.max}
                                        onChange={() => {}}
                                    />
                                </div>
                            </div>
                            <button className="apply-filters">
                                Áp dụng
                            </button>
                        </div>
                    </div>
                </aside>

                <main className="content-area">
                    <ProductList category={activeCategory} />
                </main>
            </div>

            <Footer />

            {/* Overlay */}
            <div className="dropdown-overlay"></div>

            {/* Auth Forms */}
            <div className="form-overlay login-form">
                <div className="auth-form">
                    <div className="form-header">
                        <h2>Đăng nhập</h2>
                        <button className="close-form">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <form onSubmit={(e) => window.handleLogin(e)}>
                        <div className="form-group">
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="Email" 
                                required 
                            />
                        </div>
                        <div className="form-group password-field">
                            <input 
                                type="password" 
                                className="form-control" 
                                placeholder="Mật khẩu" 
                                required 
                            />
                            <i className="fas fa-eye toggle-password"></i>
                        </div>
                        <div className="form-buttons">
                            <button type="submit" className="submit-btn">Đăng nhập</button>
                        </div>
                    </form>
                    <div className="switch-form">
                        Chưa có tài khoản?
                        <a href="#" onClick={(e) => {
                            e.preventDefault();
                            uiService.hideForm('login');
                            setTimeout(() => uiService.showForm('register'), 300);
                        }}>
                            Đăng ký ngay
                        </a>
                    </div>
                </div>
            </div>

            <div className="form-overlay register-form">
                <div className="auth-form">
                    <div className="form-header">
                        <h2>Đăng ký</h2>
                        <button className="close-form">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <form onSubmit={(e) => window.handleRegister(e)}>
                        <div className="form-group">
                            <input 
                                type="text" 
                                className="form-control" 
                                placeholder="Họ và tên" 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <input 
                                type="email" 
                                className="form-control" 
                                placeholder="Email" 
                                required 
                            />
                        </div>
                        <div className="form-group password-field">
                            <input 
                                type="password" 
                                className="form-control" 
                                placeholder="Mật khẩu" 
                                required 
                            />
                            <i className="fas fa-eye toggle-password"></i>
                        </div>
                        <div className="form-group password-field">
                            <input 
                                type="password" 
                                className="form-control" 
                                placeholder="Nhập lại mật khẩu" 
                                required 
                            />
                            <i className="fas fa-eye toggle-password"></i>
                        </div>
                        <div className="form-buttons">
                            <button type="submit" className="submit-btn">Đăng ký</button>
                        </div>
                    </form>
                    <div className="switch-form">
                        Đã có tài khoản?
                        <a href="#" onClick={(e) => {
                            e.preventDefault();
                            uiService.hideForm('register');
                            setTimeout(() => uiService.showForm('login'), 300);
                        }}>
                            Đăng nhập
                        </a>
                    </div>
                </div>
            </div>

            {/* Order Flow Components */}
            <Cart />
            <Notification />
            <PaymentOptionsModal />
            <PaymentModal />

            {/* Chat bot */}
            <div className="chatbot">
                <button className="chat-btn" onClick={() => window.toggleChatbot()}>
                    <i className="fas fa-comments"></i>
                    <span className="chat-tooltip">Chat với chúng tôi</span>
                </button>
                <div className="chatbot-content">
                    <div className="chat-header">
                        <h4><i className="fas fa-robot"></i> Hỗ trợ trực tuyến</h4>
                        <button onClick={() => window.toggleChatbot()}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="chat-messages">
                        <div className="message bot-message">
                            <i className="fas fa-robot"></i>
                            <p>Xin chào! Tôi có thể giúp gì cho bạn?</p>
                        </div>
                    </div>
                    <div className="chat-input">
                        <input type="text" placeholder="Nhập tin nhắn..." id="chatInput" />
                        <button onClick={() => window.sendMessage()}>
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Back to top button */}
            <button className="back-to-top" onClick={() => window.scrollToTop()}>
                <i className="fas fa-angle-up"></i>
            </button>
        </>
    );
};