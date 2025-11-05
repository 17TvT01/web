import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ProductOption, SelectedOption } from '@shared/types';
import defaultOptionsByCategory from '@shared/config/defaultProductOptions';
import { useProducts } from '@mobile/context/ProductContext';
import { useCart } from '@mobile/context/CartContext';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const mergeOptions = (
  defaults: ProductOption[] | undefined,
  custom: ProductOption[] | undefined
): ProductOption[] => {
  const map = new Map<string, ProductOption>();
  (defaults ?? []).forEach(option => map.set(option.name, option));
  (custom ?? []).forEach(option => map.set(option.name, option));
  return Array.from(map.values());
};

const ProductDetailScreen = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { findById, loading } = useProducts();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const product = useMemo(() => (productId ? findById(productId) : undefined), [findById, productId]);

  useEffect(() => {
    if (!loading && !product) {
      setError('Không tìm thấy sản phẩm.');
    }
  }, [loading, product]);

  useEffect(() => {
    setSelectedOptions([]);
    setQuantity(1);
  }, [productId]);

  const combinedOptions = useMemo<ProductOption[]>(() => {
    if (!product) {
      return [];
    }
    const defaults = defaultOptionsByCategory[product.category] ?? [];
    const custom = Array.isArray(product.options) ? product.options : [];
    return mergeOptions(defaults, custom);
  }, [product]);

  const handleQuantityChange = (next: number) => {
    if (next < 1) {
      return;
    }
    setQuantity(next);
  };

  const handleToggleOption = (name: string, value: string, type: 'radio' | 'checkbox') => {
    setSelectedOptions(prev => {
      if (type === 'radio') {
        const others = prev.filter(option => option.name !== name);
        return [...others, { name, value }];
      }
      const exists = prev.some(option => option.name === name && option.value === value);
      if (exists) {
        return prev.filter(option => !(option.name === name && option.value === value));
      }
      return [...prev, { name, value }];
    });
  };

  const handleAddToCart = () => {
    if (!product) {
      return;
    }
    addItem(product, quantity, selectedOptions);
    navigate('/cart');
  };

  if (loading || !productId) {
    return <div className="loading-state">Đang tải sản phẩm...</div>;
  }

  if (error || !product) {
    return (
      <section className="page-section">
        <div className="error-banner">{error ?? 'Không tìm thấy sản phẩm.'}</div>
        <button className="secondary-button" type="button" onClick={() => navigate('/')}>
          Quay lại trang chủ
        </button>
      </section>
    );
  }

  const unitPrice =
    product.onSale && typeof product.salePrice === 'number' ? product.salePrice : product.price;
  const totalPrice = unitPrice * quantity;

  return (
    <section className="page-section">
      <img
        src={product.image || '/images/default-product.jpg'}
        alt={product.name}
        style={{
          width: '100%',
          borderRadius: 24,
          aspectRatio: '4 / 3',
          objectFit: 'cover',
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.25)'
        }}
      />

      <div>
        <h1 className="screen-heading">{product.name}</h1>
        <p className="muted-text" style={{ marginTop: 6 }}>
          {product.description ?? 'Thưởng thức món ngon với nguyên liệu tươi mới mỗi ngày.'}
        </p>
      </div>

      <div className="product-card__price-row">
        <span className="product-card__price">{formatCurrency(unitPrice)}</span>
        {product.onSale && product.salePrice && (
          <span className="product-card__price--old">{formatCurrency(product.price)}</span>
        )}
      </div>

      <div className="form-group">
        <span className="form-label">Số lượng</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="secondary-button" type="button" onClick={() => handleQuantityChange(quantity - 1)}>
            -
          </button>
          <strong>{quantity}</strong>
          <button className="secondary-button" type="button" onClick={() => handleQuantityChange(quantity + 1)}>
            +
          </button>
        </div>
      </div>

      {combinedOptions.length > 0 && (
        <div className="page-section" style={{ gap: 12 }}>
          {combinedOptions.map(option => (
            <div key={option.name} className="form-group">
              <span className="form-label">{option.name}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {option.items.map(item => {
                  const label = typeof item === 'string' ? item : item.name;
                  const value = label;
                  const price = typeof item === 'string' ? 0 : item.price ?? 0;
                  const isSelected = selectedOptions.some(
                    selected => selected.name === option.name && selected.value === value
                  );
                  const extraInfo = price ? ` (+${formatCurrency(price)})` : '';
                  const buttonClass = isSelected ? 'primary-button' : 'secondary-button';

                  return (
                    <button
                      key={value}
                      className={buttonClass}
                      type="button"
                      onClick={() => handleToggleOption(option.name, value, option.type)}
                    >
                      {label}
                      {extraInfo}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="primary-button" type="button" onClick={handleAddToCart} disabled={!product.inStock}>
        Thêm vào giỏ - {formatCurrency(totalPrice)}
      </button>
    </section>
  );
};

export default ProductDetailScreen;
