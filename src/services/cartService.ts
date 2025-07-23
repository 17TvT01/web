import { Product, CartItem, SelectedOption } from '../types';

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
            const price = item.onSale ? (item.salePrice || item.price) : item.price;
            return total + (price * item.quantity);
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
