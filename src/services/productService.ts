import { Product, Filter, SearchResult, CAKE_FILTERS, FOOD_FILTERS, DRINK_FILTERS, ProductFilterMap, MainCategory } from '../types';
import { API_BASE_URL } from '../config/env';

class ProductService {
    private products: Product[] = [];
    private currentFilters: Filter = {
        category: 'Tất cả',
        subcategory: null,
        style: [],
        suitable: [],
        temperature: [],
        sugar: [],
        price: null
    };

    async loadProducts(): Promise<void> {
        try {
            const response = await fetch(`${API_BASE_URL}/products`);
            if (!response.ok) {
                throw new Error('Failed to fetch products from backend');
            }
            const data = await response.json();

            // Map backend product data to frontend Product type
            this.products = data.map((p: any) => {
                const filterAccumulator: ProductFilterMap = {};

                const addFilterValue = (key: string, value: string) => {
                    const trimmedKey = key.trim();
                    const trimmedValue = value.trim();
                    if (!trimmedKey || !trimmedValue) return;
                    if (!filterAccumulator[trimmedKey]) {
                        filterAccumulator[trimmedKey] = [];
                    }
                    if (!filterAccumulator[trimmedKey].includes(trimmedValue)) {
                        filterAccumulator[trimmedKey].push(trimmedValue);
                    }
                };

                const aiKeySet = new Set<string>();
                const addAiKey = (value: any) => {
                    const text = String(value ?? '').trim();
                    if (text) {
                        aiKeySet.add(text);
                    }
                };

                if (Array.isArray(p.attributes)) {
                    p.attributes.forEach((attr: any) => {
                        const type = typeof attr.type === 'string' ? attr.type : attr?.attribute_type;
                        const value = attr?.value ?? attr?.attribute_value;
                        const typeKey = typeof type === 'string' ? type.trim() : '';
                        const valueText = value !== undefined && value !== null ? String(value).trim() : '';
                        if (!typeKey || !valueText) {
                            return;
                        }

                        if (typeKey === 'ai_keys') {
                            addAiKey(valueText);
                        } else {
                            addFilterValue(typeKey, valueText);
                        }
                    });
                }

                if (Array.isArray(p.ai_keys)) {
                    p.ai_keys.forEach(addAiKey);
                } else if (typeof p.ai_keys === 'string' && p.ai_keys.trim()) {
                    try {
                        const parsed = JSON.parse(p.ai_keys);
                        if (Array.isArray(parsed)) {
                            parsed.forEach(addAiKey);
                        } else {
                            addAiKey(parsed);
                        }
                    } catch {
                        addAiKey(p.ai_keys);
                    }
                }

                const normalizedCategory = typeof p.category === 'string'
                    ? p.category.toLowerCase()
                    : 'all';
                const categoryMap: Record<string, Record<string, string[]>> = {
                    cake: CAKE_FILTERS,
                    food: FOOD_FILTERS,
                    drink: DRINK_FILTERS,
                };
                const categoryFilters = categoryMap[normalizedCategory] || null;

                const aiKeyList = Array.from(aiKeySet);
                if (aiKeyList.length) {
                    filterAccumulator['ai_keys'] = aiKeyList;
                }

                if (categoryFilters) {
                    Object.entries(categoryFilters).forEach(([filterKey, options]) => {
                        options
                            .filter(option => aiKeySet.has(option))
                            .forEach(option => addFilterValue(filterKey, option));
                    });
                }

                const category: MainCategory = ['cake', 'drink', 'food'].includes(normalizedCategory)
                    ? (normalizedCategory as MainCategory)
                    : 'all';
                const price = typeof p.price === 'number' ? p.price : Number(p.price) || 0;

                return ({
                    id: String(p.id),
                    name: p.name,
                    price,
                    image: p.image_url || '/images/default-product.jpg',
                    category,
                    rating: p.rating || 0,
                    filters: Object.keys(filterAccumulator).length ? filterAccumulator : undefined,
                    aiKeys: aiKeyList,
                    inStock: (p.quantity ?? 0) > 0,
                    onSale: false,
                    salePrice: null,
                    isNew: false
                });
            });
        } catch (error) {
            console.error('Error loading products:', error);
            throw error;
        }
    }

    getProducts(category: string = 'Tất cả', subcategory: string | null = null): Product[] {
        let filteredProducts = [...this.products];

        // Chuyển đổi category sang chữ thường để so sánh nhất quán
        const normalizedCategory = category.toLowerCase();

        if (normalizedCategory !== 'tất cả' && normalizedCategory !== 'all') {
            filteredProducts = filteredProducts.filter(p => p.category === normalizedCategory);
        }

        if (subcategory) {
            const normalizedSubcategory = subcategory.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.subCategory && p.subCategory.toLowerCase() === normalizedSubcategory
            );
        }

        return filteredProducts;
    }

    applyFilters(filters: Partial<Filter>): Product[] {
        this.currentFilters = { ...this.currentFilters, ...filters };
        let filteredProducts = [...this.products];

        // Apply category filter
        if (this.currentFilters.category !== 'Tất cả') {
            filteredProducts = filteredProducts.filter(
                p => p.category === this.currentFilters.category
            );
        }

        // Apply subcategory filter
        if (this.currentFilters.subcategory) {
            filteredProducts = filteredProducts.filter(
                p => p.subcategory === this.currentFilters.subcategory
            );
        }

        // Apply array filters
        ['style', 'suitable', 'temperature', 'sugar'].forEach(filterType => {
            const activeFilters = this.currentFilters[filterType as keyof Filter] as string[];
            if (activeFilters.length > 0) {
                filteredProducts = filteredProducts.filter(product =>
                    activeFilters.every(filter => 
                        product[filterType as keyof Product]?.includes(filter)
                    )
                );
            }
        });

        // Apply price filter
        if (this.currentFilters.price) {
            const { min, max } = this.currentFilters.price;
            filteredProducts = filteredProducts.filter(
                p => p.price >= min && p.price <= max
            );
        }

        return filteredProducts;
    }

    searchProducts(query: string): SearchResult[] {
        if (!query) return [];
        
        query = query.toLowerCase();
        return this.products
            .filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query)
            )
            .map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                image: p.image,
                category: p.category
            }))
            .slice(0, 5);
    }

    getProductById(id: string): Product | undefined {
        return this.products.find(p => p.id === id);
    }

    resetFilters() {
        this.currentFilters = {
            category: 'Tất cả',
            subcategory: null,
            style: [],
            suitable: [],
            temperature: [],
            sugar: [],
            price: null
        };
    }

    getCurrentFilters(): Filter {
        return { ...this.currentFilters };
    }
}

export const productService = new ProductService();
