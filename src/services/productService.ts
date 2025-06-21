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
            // Trong thực tế, đây sẽ là API endpoint
            this.products = [
                {
                    id: '1',
                    name: 'Cà phê sữa',
                    price: 35000,
                    image: '/images/coffee1.jpg',
                    category: 'Cà phê',
                    rating: 4.5
                },
                {
                    id: '2',
                    name: 'Trà sữa trân châu',
                    price: 45000,
                    image: '/images/tea1.jpg',
                    category: 'Trà sữa',
                    rating: 4.8
                }
            ];
        } catch (error) {
            console.error('Error loading products:', error);
            throw error;
        }
    }

    getProducts(category: string = 'Tất cả', subcategory: string | null = null): Product[] {
        let filteredProducts = [...this.products];

        if (category !== 'Tất cả') {
            filteredProducts = filteredProducts.filter(p => p.category === category);
        }

        if (subcategory) {
            filteredProducts = filteredProducts.filter(p => p.subcategory === subcategory);
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
            .slice(0, 5); // Limit to 5 results
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