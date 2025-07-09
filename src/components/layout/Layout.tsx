import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../Header/Header';
import { ProductList } from '../Product/ProductList';
import { ProductNavigation } from '../Product/ProductNavigation';
import { Footer } from '../Footer/Footer';
import { Cart } from '../Cart/Cart';
import { PaymentModal } from '../Payment/PaymentModal';
import { PaymentOptionsModal } from '../Payment/PaymentOptionsModal';
import { OrderTypeModal } from '../Order/OrderTypeModal';
import { Notification } from '../Notification/Notification';
import { Login } from '../Auth/Login';
import { Register } from '../Auth/Register';
import { AppRoutes } from '../../routes';
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
    const location = useLocation();
    const isHomePage = location.pathname === '/';
    
    const [activeCategory, setActiveCategory] = useState<MainCategory>('all');
    const [selectedFilters, setSelectedFilters] = useState<FilterState>({});
    const [sortBy, setSortBy] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Initialize UI service after components are mounted
        setTimeout(() => {
            uiService.initialize();
        }, 0);
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
            
            {isHomePage && (
                <ProductNavigation 
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                />
            )}

            <div className="main-container">
                {isHomePage && activeCategory !== 'all' && (
                    <aside className="sidebar">
                        <div className="category-menu">
                            {renderFilters()}
                        </div>
                    </aside>
                )}

                <main className="content-area">
                    <AppRoutes 
                        category={activeCategory}
                        filters={selectedFilters}
                        sortBy={sortBy}
                        searchQuery={searchQuery}
                    />
                </main>
            </div>

            <Footer />

            {/* Auth Components */}
            <Login />
            <Register />

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