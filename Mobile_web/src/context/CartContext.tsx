import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';
import type { Product, ProductOption, SelectedOption } from '@shared/types';
import defaultOptionsByCategory from '@shared/config/defaultProductOptions';

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

const buildOptionLookup = (product: Product): Record<string, ProductOption> => {
  const map: Record<string, ProductOption> = {};
  const defaults = defaultOptionsByCategory[product.category] ?? [];
  const custom = Array.isArray(product.options) ? product.options : [];
  [...defaults, ...custom].forEach(option => {
    map[option.name] = option;
  });
  return map;
};

const calculateOptionExtra = (product: Product, selectedOptions?: SelectedOption[]): number => {
  if (!selectedOptions || !selectedOptions.length) {
    return 0;
  }
  const optionMap = buildOptionLookup(product);
  return selectedOptions.reduce((acc, selected) => {
    const option = optionMap[selected.name];
    if (!option) {
      return acc;
    }
    const matched = option.items.find(item =>
      typeof item === 'string' ? item === selected.value : item.name === selected.value
    );
    if (!matched || typeof matched === 'string') {
      return acc;
    }
    const price = typeof matched.price === 'number' ? matched.price : 0;
    if (price <= 0) {
      return acc;
    }
    return acc + price;
  }, 0);
};

export const CartProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => loadInitialItems());

  const persist = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems);
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    } catch {
      // ignore write errors
    }
  }, []);

  const addItem = useCallback<CartContextValue['addItem']>(
    (product, quantity, selectedOptions = []) => {
      const uniqueId = createUniqueId(product.id, selectedOptions);
      const existing = items.find(item => item.uniqueId === uniqueId);

      if (existing) {
        const nextItems = items.map(item =>
          item.uniqueId === uniqueId ? { ...item, quantity: item.quantity + quantity } : item
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
      const nextItems = items.map(item => (item.uniqueId === uniqueId ? { ...item, quantity } : item));
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
      const base = getProductUnitPrice(item);
      const extra = calculateOptionExtra(item, item.selectedOptions);
      const unitTotal = base + extra;
      return acc + unitTotal * item.quantity;
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
