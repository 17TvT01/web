import { Product, CartItem } from '../types';

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

    public async addItem(product: Product): Promise<void> {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                ...product,
                quantity: 1
            });
        }

        this.saveCart();
        this.notifyCartUpdated();
    }

    public updateQuantity(productId: number, quantity: number): void {
        const item = this.items.find(item => item.id === productId);
        
        if (item) {
            if (quantity > 0) {
                item.quantity = quantity;
            } else {
                this.removeItem(productId);
            }
            this.saveCart();
            this.notifyCartUpdated();
        }
    }

    public removeItem(productId: number): void {
        this.items = this.items.filter(item => item.id !== productId);
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