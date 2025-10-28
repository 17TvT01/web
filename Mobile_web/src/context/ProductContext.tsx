import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import type { MainCategory, Product } from '@shared/types';
import {
  filterProductsByCategory,
  loadProducts,
  refreshProducts,
  searchProducts
} from '@mobile/services/productApi';

interface ProductContextValue {
  products: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  filterByCategory: (category: MainCategory) => Promise<Product[]>;
  search: (query: string) => Promise<Product[]>;
  findById: (id: string) => Product | undefined;
}

const ProductContext = createContext<ProductContextValue | undefined>(undefined);

export const ProductProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải sản phẩm.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await refreshProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải sản phẩm.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterByCategory = useCallback<ProductContextValue['filterByCategory']>(
    async category => {
      try {
        return await filterProductsByCategory(category);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Không thể lọc sản phẩm.';
        setError(message);
        throw err;
      }
    },
    []
  );

  const handleSearch = useCallback<ProductContextValue['search']>(async query => {
    try {
      return await searchProducts(query);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tìm kiếm sản phẩm.';
      setError(message);
      throw err;
    }
  }, []);

  const findById = useCallback<ProductContextValue['findById']>(
    id => {
      return products.find(product => product.id === id);
    },
    [products]
  );

  const value = useMemo<ProductContextValue>(
    () => ({
      products,
      loading,
      error,
      refresh,
      filterByCategory: handleFilterByCategory,
      search: handleSearch,
      findById
    }),
    [products, loading, error, refresh, handleFilterByCategory, handleSearch, findById]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};

export const useProducts = (): ProductContextValue => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts phải được sử dụng trong ProductProvider');
  }
  return context;
};
