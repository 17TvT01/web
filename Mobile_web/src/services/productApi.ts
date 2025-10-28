import type { MainCategory, Product, ProductFilterMap } from '@shared/types';
import { API_BASE_URL } from '@shared/config/env';

type RawProduct = Record<string, unknown>;

let productCache: Product[] | null = null;

const normalizeCategory = (value: unknown): MainCategory => {
  if (typeof value !== 'string') {
    return 'all';
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'cake' || normalized === 'food' || normalized === 'drink') {
    return normalized;
  }
  return 'all';
};

const toNumberOrZero = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseAttributes = (raw: unknown): ProductFilterMap | undefined => {
  if (!raw) {
    return undefined;
  }

  const map: ProductFilterMap = {};

  const addValue = (key: string, val: string) => {
    const trimmedKey = key.trim();
    const trimmedVal = val.trim();
    if (!trimmedKey || !trimmedVal) {
      return;
    }
    if (!map[trimmedKey]) {
      map[trimmedKey] = [];
    }
    if (!map[trimmedKey].includes(trimmedVal)) {
      map[trimmedKey].push(trimmedVal);
    }
  };

  if (Array.isArray(raw)) {
    raw.forEach(entry => {
      if (!entry || typeof entry !== 'object') {
        return;
      }
      const record = entry as Record<string, unknown>;
      const type =
        typeof record.type === 'string' ? record.type : (record.attribute_type as string | undefined);
      const value = record.value ?? record.attribute_value;
      if (typeof type === 'string' && value !== undefined && value !== null) {
        addValue(type, String(value));
      }
    });
  } else if (typeof raw === 'object') {
    Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item !== null && item !== undefined) {
            addValue(key, String(item));
          }
        });
      } else if (value !== null && value !== undefined) {
        addValue(key, String(value));
      }
    });
  }

  return Object.keys(map).length ? map : undefined;
};

const parseAiKeys = (raw: unknown): string[] | undefined => {
  if (!raw) {
    return undefined;
  }

  const set = new Set<string>();

  const add = (value: unknown) => {
    if (value === null || value === undefined) {
      return;
    }
    const text = String(value).trim();
    if (text) {
      set.add(text);
    }
  };

  if (Array.isArray(raw)) {
    raw.forEach(add);
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(add);
      } else {
        add(parsed);
      }
    } catch {
      add(raw);
    }
  } else {
    add(raw);
  }

  return set.size ? Array.from(set) : undefined;
};

const joinUrl = (base: string, path: string): string => {
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

const resolveImageUrl = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '/images/default-product.jpg';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '/images/default-product.jpg';
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) {
    return trimmed;
  }
  const normalizedPath = trimmed.replace(/\\/g, '/');
  const assetBase =
    (import.meta.env.VITE_ASSET_BASE_URL as string | undefined)?.trim() || '';
  if (assetBase) {
    return joinUrl(assetBase, normalizedPath);
  }
  return joinUrl(API_BASE_URL, normalizedPath);
};

const mapProduct = (raw: RawProduct): Product => {
  const price = toNumberOrZero(raw.price);
  const salePrice =
    raw.sale_price === null || raw.sale_price === undefined
      ? undefined
      : toNumberOrZero(raw.sale_price);

  return {
    id: String(raw.id ?? raw.product_id ?? ''),
    name: String(raw.name ?? 'Sản phẩm'),
    price,
    image: resolveImageUrl(raw.image_url),
    category: normalizeCategory(raw.category),
    subCategory: raw.subcategory ? String(raw.subcategory) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    filters: parseAttributes(raw.attributes ?? raw.filters),
    aiKeys: parseAiKeys(raw.ai_keys),
    onSale: Boolean(raw.on_sale),
    salePrice,
    isNew: Boolean(raw.is_new),
    inStock: toNumberOrZero(raw.quantity ?? raw.stock ?? 0) > 0,
    rating:
      raw.rating === null || raw.rating === undefined
        ? undefined
        : toNumberOrZero(raw.rating),
    options: Array.isArray(raw.options) ? (raw.options as Product['options']) : undefined
  };
};

export const loadProducts = async (forceReload = false): Promise<Product[]> => {
  if (!forceReload && productCache) {
    return productCache;
  }

  const response = await fetch(`${API_BASE_URL}/products`);

  if (!response.ok) {
    throw new Error('Không thể tải danh sách sản phẩm');
  }

  const rawData: RawProduct[] = await response.json();
  productCache = rawData.map(mapProduct);
  return productCache;
};

export const getCachedProducts = (): Product[] => {
  return productCache ? [...productCache] : [];
};

export const findProductById = async (id: string): Promise<Product | undefined> => {
  const products = await loadProducts();
  return products.find(product => product.id === id);
};

export const filterProductsByCategory = async (
  category: MainCategory
): Promise<Product[]> => {
  const products = await loadProducts();
  if (category === 'all') {
    return products;
  }
  return products.filter(product => product.category === category);
};

export const searchProducts = async (query: string): Promise<Product[]> => {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return loadProducts();
  }
  const products = await loadProducts();
  return products.filter(
    product =>
      product.name.toLowerCase().includes(trimmed) ||
      product.aiKeys?.some(key => key.toLowerCase().includes(trimmed))
  );
};

export const refreshProducts = async (): Promise<Product[]> => {
  productCache = null;
  return loadProducts(true);
};
