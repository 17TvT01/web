import type { Product } from '@shared/types';
import { useCart } from '@mobile/context/CartContext';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
  onViewDetail: (productId: string) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetail }) => {
  const { addItem } = useCart();
  const unitPrice =
    product.onSale && typeof product.salePrice === 'number' ? product.salePrice : product.price;

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!product.inStock) {
      return;
    }
    addItem(product, 1);
  };

  return (
    <article className="product-card" onClick={() => onViewDetail(product.id)}>
      <img
        src={product.image || '/images/default-product.jpg'}
        alt={product.name}
        className="product-card__image"
      />
      <div className="product-card__meta">
        <h3 className="product-card__name">{product.name}</h3>
        <div className="product-card__price-row">
          <span className="product-card__price">{formatCurrency(unitPrice)}</span>
          {product.onSale && product.salePrice && (
            <span className="product-card__price--old">{formatCurrency(product.price)}</span>
          )}
        </div>
        {product.rating && (
          <span className="product-card__rating">
            ⭐ {product.rating.toFixed(1)}
          </span>
        )}
        <span className={`stock-pill ${product.inStock ? '' : 'stock-pill--out'}`}>
          {product.inStock ? 'Còn hàng' : 'Hết hàng'}
        </span>
      </div>
      <div className="product-card__actions">
        <button className="secondary-button" type="button" onClick={() => onViewDetail(product.id)}>
          Chi tiết
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={handleAddToCart}
          disabled={!product.inStock}
        >
          Thêm
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
