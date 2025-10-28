import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';
import type { Product, SelectedOption } from '@shared/types';

export interface CartItem extends Product {
  uniqueId: string;
  quantity: number;
  selectedOptions?: SelectedOption[];
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (product: Product, quantity: number, selectedOptions?: SelectedOption[]) => void;
  updateQuantity: (uniqueId: string, quantity: number) => void;
  removeItem: (uniqueId: string) => void;
  clearCart: () => void;
}

const STORAGE_KEY = 'mobile_web_cart';

const CartContext = createContext<CartContextValue | undefined>(undefined);

const loadInitialItems = (): CartItem[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

const createUniqueId = (productId: string, selectedOptions: SelectedOption[] = []) => {
  if (!selectedOptions.length) {
    return `${productId}::default`;
  }
  const sortedOptions = [...selectedOptions]
    .map(option => `${option.name}:${option.value}`)
    .sort()
    .join('|');
  return `${productId}::${sortedOptions}`;
};

const getProductUnitPrice = (product: Product) => {
  if (product.onSale && typeof product.salePrice === 'number') {
    return product.salePrice;
  }
  return product.price;
};

export const CartProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => loadInitialItems());

  const persist = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems);
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  }, []);

  const addItem = useCallback<CartContextValue['addItem']>(
    (product, quantity, selectedOptions = []) => {
      const uniqueId = createUniqueId(product.id, selectedOptions);
      const existing = items.find(item => item.uniqueId === uniqueId);

      if (existing) {
        const nextItems = items.map(item =>
          item.uniqueId === uniqueId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
        persist(nextItems);
        return;
      }

      const cartItem: CartItem = {
        ...product,
        uniqueId,
        quantity,
        selectedOptions: selectedOptions.length ? selectedOptions : undefined
      };

      persist([...items, cartItem]);
    },
    [items, persist]
  );

  const updateQuantity = useCallback<CartContextValue['updateQuantity']>(
    (uniqueId, quantity) => {
      if (quantity <= 0) {
        const filtered = items.filter(item => item.uniqueId !== uniqueId);
        persist(filtered);
        return;
      }
      const nextItems = items.map(item =>
        item.uniqueId === uniqueId ? { ...item, quantity } : item
      );
      persist(nextItems);
    },
    [items, persist]
  );

  const removeItem = useCallback<CartContextValue['removeItem']>(
    uniqueId => {
      const filtered = items.filter(item => item.uniqueId !== uniqueId);
      persist(filtered);
    },
    [items, persist]
  );

  const clearCart = useCallback(() => {
    persist([]);
  }, [persist]);

  const totals = useMemo(() => {
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = items.reduce((acc, item) => {
      const unitPrice = getProductUnitPrice(item);
      return acc + unitPrice * item.quantity;
    }, 0);
    return { totalItems, totalPrice };
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems: totals.totalItems,
      totalPrice: totals.totalPrice,
      addItem,
      updateQuantity,
      removeItem,
      clearCart
    }),
    [items, totals, addItem, updateQuantity, removeItem, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart phải được sử dụng trong CartProvider');
  }
  return context;
};
