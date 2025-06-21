export interface Product {
    id: number;
    name: string;
    price: number;
    image: string;
    category: string;
    description?: string;
    onSale?: boolean;
    salePrice?: number;
    isNew?: boolean;
    inStock: boolean;
    rating?: number;
    reviews?: Review[];
}

export interface CartItem extends Product {
    quantity: number;
}

export interface Review {
    id: number;
    userId: number;
    rating: number;
    comment: string;
    date: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    role: 'user' | 'admin';
}

export interface Order {
    id: number;
    userId: number;
    items: CartItem[];
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    paymentMethod: 'cash' | 'card' | 'transfer';
    shippingAddress: Address;
    createdAt: string;
    updatedAt: string;
}

export interface Address {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
}

export interface NotificationMessage {
    id: number;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    read: boolean;
    createdAt: string;
}

export interface CategoryFilter {
    id: string;
    name: string;
    count: number;
}

export interface PriceFilter {
    min: number;
    max: number;
}

export interface ProductFilters {
    category?: string;
    price?: PriceFilter;
    inStock?: boolean;
    onSale?: boolean;
    isNew?: boolean;
    rating?: number;
}

export interface APIResponse<T> {
    data: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T> {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
}