import { Product, CartItem, SelectedOption, ProductOption } from '../types';
import defaultOptionsByCategory from '../config/defaultProductOptions';

class CartService {
    private cartKey = 'cart_items';
    private items: CartItem[] = [];

    constructor() {
        this.restoreCart();
    }

    public restoreCart() {
        const savedCart = localStorage.getItem(this.cartKey);
        if (savedCart) {
            try {
                this.items = JSON.parse(savedCart);
            } catch (error) {
                console.error('Error restoring cart:', error);
                this.items = [];
            }
        }
    }

    private saveCart() {
        localStorage.setItem(this.cartKey, JSON.stringify(this.items));
    }

    public getItems(): CartItem[] {
        return this.items;
    }

    public getTotalItems(): number {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    public getTotalPrice(): number {
        return this.items.reduce((total, item) => {
            const basePrice = item.onSale ? (item.salePrice || item.price) : item.price;
            const mergedOptionsMap: Record<string, ProductOption> = {};
            const categoryOptions = defaultOptionsByCategory[item.category] || [];
            categoryOptions.forEach(opt => { mergedOptionsMap[opt.name] = opt; });
            (item.options || []).forEach(opt => { mergedOptionsMap[opt.name] = opt; });
            const mergedOptions = Object.values(mergedOptionsMap);

            // Calculate extra price from selected checkbox options
            const extraPerUnit = (item.selectedOptions || []).reduce((acc, sel) => {
                const opt = mergedOptions.find(o => o.name === sel.name);
                if (opt?.type === 'checkbox') {
                    const found = opt.items.find(it => typeof it !== 'string' && it.name === sel.value) as { name: string; price?: number } | undefined;
                    return acc + (found?.price || 0);
                }
                return acc;
            }, 0);

            const unitPrice = basePrice + extraPerUnit;
            return total + (unitPrice * item.quantity);
        }, 0);
    }

    private generateUniqueId(product: Product, selectedOptions: SelectedOption[]): string {
        const optionsString = selectedOptions
            .map(opt => `${opt.name}:${opt.value}`)
            .sort()
            .join('|');
        return `${product.id}_${optionsString || 'default'}`;
    }

    public async addItem(item: CartItem): Promise<void> {
        console.log('CartService addItem called with:', item);
        const existingItem = this.items.find(i => i.uniqueId === item.uniqueId);

        if (existingItem) {
            existingItem.quantity += item.quantity;
            console.log('Updated existing item quantity:', existingItem.quantity);
        } else {
            this.items.push(item);
            console.log('Added new item with quantity:', item.quantity);
        }

        this.saveCart();
        this.notifyCartUpdated();
    }

    public updateQuantity(uniqueId: string, quantity: number): void {
        const item = this.items.find(item => item.uniqueId === uniqueId);

        if (item) {
            if (quantity > 0) {
                item.quantity = quantity;
            } else {
                this.removeItem(uniqueId);
            }
            this.saveCart();
            this.notifyCartUpdated();
        }
    }

    public removeItem(uniqueId: string): void {
        this.items = this.items.filter(item => item.uniqueId !== uniqueId);
        this.saveCart();
        this.notifyCartUpdated();
    }

    public clearCart(): void {
        this.items = [];
        localStorage.removeItem(this.cartKey);
        this.notifyCartUpdated();
    }

    private notifyCartUpdated() {
        // Dispatch custom event for cart updates
        window.dispatchEvent(new CustomEvent('cart:updated', {
            detail: {
                items: this.items,
                totalItems: this.getTotalItems(),
                totalPrice: this.getTotalPrice()
            }
        }));
    }
}

export const cartService = new CartService();
