import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MainCategory } from '@shared/types';
import { useProducts } from '@mobile/context/ProductContext';
import CategoryTabs, { CategoryOption } from '@mobile/components/CategoryTabs';
import ProductCard from '@mobile/components/ProductCard';

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'all', label: 'Tất cả', icon: '✨' },
  { id: 'cake', label: 'Bánh ngọt', icon: '🍰' },
  { id: 'drink', label: 'Đồ uống', icon: '🥤' },
  { id: 'food', label: 'Đồ ăn', icon: '🍜' }
];

const HomeScreen = () => {
  const navigate = useNavigate();
  const { products, loading, error } = useProducts();
  const [activeCategory, setActiveCategory] = useState<MainCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProducts = useMemo(() => {
    return products
      .filter(product => (activeCategory === 'all' ? true : product.category === activeCategory))
      .filter(product => {
        if (!searchQuery.trim()) {
          return true;
        }
        const query = searchQuery.trim().toLowerCase();
        return (
          product.name.toLowerCase().includes(query) ||
          product.aiKeys?.some(key => key.toLowerCase().includes(query))
        );
      });
  }, [products, activeCategory, searchQuery]);

  return (
    <section className="page-section">
      <header>
        <h1 className="screen-heading">Khám phá menu</h1>
        <p className="muted-text">Đặt món - giao nhanh, thanh toán tiện lợi.</p>
      </header>

      <div className="form-group">
        <label htmlFor="home-search" className="form-label">
          Tìm kiếm món
        </label>
        <input
          id="home-search"
          className="text-field"
          type="search"
          placeholder="Nhập tên món, ví dụ: trà sữa..."
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
        />
      </div>

      <CategoryTabs categories={CATEGORY_OPTIONS} active={activeCategory} onSelect={setActiveCategory} />

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-state">Đang tải món ngon...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state">Không tìm thấy sản phẩm phù hợp. Thử thay đổi bộ lọc nhé!</div>
      ) : (
        <div className="card-grid">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onViewDetail={() => navigate(`/product/${product.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HomeScreen;
