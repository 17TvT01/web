import { Product, Filter, SearchResult } from '../types';

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
            const response = await fetch('http://localhost:5000/products');
            if (!response.ok) {
                throw new Error('Failed to fetch products from backend');
            }
            const data = await response.json();

            // Map backend product data to frontend Product type
            this.products = data.map((p: any) => ({
                id: p.id.toString(),
                name: p.name,
                price: p.price,
                image: p.image_url || '/images/default-product.jpg',
                category: p.category.toLowerCase(), // Đảm bảo category được chuyển thành chữ thường
                rating: p.rating || 0,
                filters: p.attributes ? p.attributes.reduce((acc: any, attr: any) => {
                    if (!acc[attr.type]) acc[attr.type] = [];
                    acc[attr.type].push(attr.value);
                    return acc;
                }, {}) : {},
                inStock: p.quantity > 0,
                onSale: false,
                salePrice: null,
                isNew: false
            }));
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