import { useEffect, useState } from 'react';
import { Header } from '../Header/Header';
import { ProductList } from '../Product/ProductList';
import { ProductNavigation } from '../Product/ProductNavigation';
import { Footer } from '../Footer/Footer';
import { Cart } from '../Cart/Cart';
import { PaymentModal } from '../Payment/PaymentModal';
import { PaymentOptionsModal } from '../Payment/PaymentOptionsModal';
import { OrderTypeModal } from '../Order/OrderTypeModal';
import { Notification } from '../Notification/Notification';
import { uiService } from '../../services/uiService';
import { 
    MainCategory, 
    CAKE_FILTERS, 
    FOOD_FILTERS, 
    DRINK_FILTERS, 
    FilterState,
    SORT_OPTIONS 
} from '../../types';

type FilterConfig = {
    key: string;
    title: string;
};

export const Layout = () => {
    const [activeCategory, setActiveCategory] = useState<MainCategory>('all');
    const [selectedFilters, setSelectedFilters] = useState<FilterState>({});
    const [sortBy, setSortBy] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        uiService.initialize();
    }, []);

    const handleCategoryChange = (category: MainCategory) => {
        setActiveCategory(category);
        setSelectedFilters({}); // Reset filters when changing category
        setSortBy(''); // Reset sort when changing category
    };

    const handleFilterChange = (filterType: string, value: string) => {
        setSelectedFilters(prev => {
            const currentFilters = prev[filterType] || [];
            if (currentFilters.includes(value)) {
                return {
                    ...prev,
                    [filterType]: currentFilters.filter(v => v !== value)
                };
            } else {
                return {
                    ...prev,
                    [filterType]: [...currentFilters, value]
                };
            }
        });
    };

    const handleSortChange = (sortOption: string) => {
        setSortBy(sortOption);
    };

    const clearFilters = () => {
        setSelectedFilters({});
        setSortBy('');
        setSearchQuery('');
    };

    const getSelectedFiltersCount = () => {
        return Object.values(selectedFilters).reduce((count, values) => count + values.length, 0);
    };

    const renderFilters = () => {
        let currentFilters: typeof CAKE_FILTERS | typeof FOOD_FILTERS | typeof DRINK_FILTERS;
        let filterSections: FilterConfig[];

        switch (activeCategory) {
            case 'cake':
                currentFilters = CAKE_FILTERS;
                filterSections = [
                    { key: 'occasion', title: 'Dịp sử dụng' },
                    { key: 'flavor', title: 'Hương vị' },
                    { key: 'ingredient', title: 'Thành phần chính' },
                    { key: 'size', title: 'Kích thước' }
                ];
                break;
            case 'food':
                currentFilters = FOOD_FILTERS;
                filterSections = [{ key: 'type', title: 'Loại đồ ăn' }];
                break;
            case 'drink':
                currentFilters = DRINK_FILTERS;
                filterSections = [{ key: 'type', title: 'Loại nước' }];
                break;
            default:
                return null;
        }

        const filterCount = getSelectedFiltersCount();

        return (
            <>
                <div className="filter-header">
                    <h3 className="category-title">Bộ lọc sản phẩm</h3>
                    {filterCount > 0 && (
                        <button className="clear-filters" onClick={clearFilters}>
                            Xóa ({filterCount})
                        </button>
                    )}
                </div>

                {filterSections.map(section => (
                    <div key={section.key} className="filter-section">
                        <h4>{section.title}</h4>
                        <div className="filter-options">
                            {(currentFilters as any)[section.key].map((option: string) => (
                                <div key={option} className="filter-option">
                                    <input
                                        type="checkbox"
                                        id={`${section.key}-${option}`}
                                        checked={selectedFilters[section.key]?.includes(option) || false}
                                        onChange={() => handleFilterChange(section.key, option)}
                                    />
                                    <label htmlFor={`${section.key}-${option}`}>{option}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="sort-section">
                    <span className="sort-label">Sắp xếp theo:</span>
                    <div className="sort-options">
                        {SORT_OPTIONS.map(option => (
                            <button
                                key={option.id}
                                className={`sort-btn ${sortBy === option.id ? 'active' : ''}`}
                                onClick={() => handleSortChange(option.id)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    return (
        <>
            <Header onSearch={setSearchQuery} />
            
            <ProductNavigation 
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
            />

            <div className="main-container">
                {activeCategory !== 'all' && (
                    <aside className="sidebar">
                        <div className="category-menu">
                            {renderFilters()}
                        </div>
                    </aside>
                )}

                <main className="content-area">
                    <ProductList 
                        category={activeCategory} 
                        filters={selectedFilters}
                        sortBy={sortBy}
                        searchQuery={searchQuery}
                    />
                </main>
            </div>

            <Footer />

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
                            <label htmlFor="login-email">Email</label>
                            <input 
                                type="text"
                                id="login-email" 
                                className="form-control" 
                                placeholder="Nhập email của bạn" 
                                required 
                            />
                        </div>
                        <div className="form-group password-field">
                            <label htmlFor="login-password">Mật khẩu</label>
                            <input 
                                type="password"
                                id="login-password"
                                className="form-control" 
                                placeholder="Nhập mật khẩu" 
                                required 
                            />
                            <button 
                                type="button" 
                                className="toggle-password"
                                onClick={() => window.togglePasswordVisibility('login-password')}
                            >
                                <i className="fas fa-eye"></i>
                            </button>
                        </div>
                        <div className="form-buttons">
                            <button type="submit" className="submit-btn">Đăng nhập</button>
                        </div>
                    </form>
                    <div className="switch-form">
                        Chưa có tài khoản?
                        <a onClick={() => {
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
                            <label htmlFor="register-name">Họ và tên</label>
                            <input 
                                type="text"
                                id="register-name"
                                className="form-control" 
                                placeholder="Nhập họ và tên" 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="register-email">Email</label>
                            <input 
                                type="email"
                                id="register-email"
                                className="form-control" 
                                placeholder="Nhập email" 
                                required 
                            />
                        </div>
                        <div className="form-group password-field">
                            <label htmlFor="register-password">Mật khẩu</label>
                            <input 
                                type="password"
                                id="register-password"
                                className="form-control" 
                                placeholder="Nhập mật khẩu" 
                                required 
                            />
                            <button 
                                type="button" 
                                className="toggle-password"
                                onClick={() => window.togglePasswordVisibility('register-password')}
                            >
                                <i className="fas fa-eye"></i>
                            </button>
                        </div>
                        <div className="form-group password-field">
                            <label htmlFor="register-confirm">Xác nhận mật khẩu</label>
                            <input 
                                type="password"
                                id="register-confirm"
                                className="form-control" 
                                placeholder="Nhập lại mật khẩu" 
                                required 
                            />
                            <button 
                                type="button" 
                                className="toggle-password"
                                onClick={() => window.togglePasswordVisibility('register-confirm')}
                            >
                                <i className="fas fa-eye"></i>
                            </button>
                        </div>
                        <div className="form-buttons">
                            <button type="submit" className="submit-btn">Đăng ký</button>
                        </div>
                    </form>
                    <div className="switch-form">
                        Đã có tài khoản?
                        <a onClick={() => {
                            uiService.hideForm('register');
                            setTimeout(() => uiService.showForm('login'), 300);
                        }}>
                            Đăng nhập
                        </a>
                    </div>
                </div>
            </div>

            {/* Overlays and Modals */}
            <div className="dropdown-overlay"></div>
            <Cart />
            <Notification />
            <PaymentOptionsModal />
            <PaymentModal />
            <OrderTypeModal />
        </>
    );
};