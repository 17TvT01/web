export type MainCategory = 'all' | 'cake' | 'drink' | 'food';

export interface CakeFilters {
    occasion?: string[];   // Dịp sử dụng
    flavor?: string[];     // Hương vị
    ingredient?: string[]; // Thành phần chính
    size?: string[];      // Kích thước
}

export interface FoodFilters {
    type?: string[];      // Loại đồ ăn
}

export interface DrinkFilters {
    type?: string[];      // Loại nước
}

// Filter Options Constants
export const CAKE_FILTERS = {
    occasion: [
        'Sinh nhật',
        'Đám cưới / hỏi',
        'Lễ tình nhân / Kỷ niệm',
        'Lễ hội',
        'Tặng đối tác / doanh nghiệp',
        'Khác'
    ],
    flavor: [
        'Kem bơ',
        'Kem tươi',
        'Mousse',
        'Tiramisu',
        'Bánh kem lạnh'
    ],
    ingredient: [
        'Trái cây tươi',
        'Socola',
        'Phô mai / cream cheese',
        'Trà xanh / matcha',
        'Các loại hạt'
    ],
    size: [
        'Mini (1 người)',
        'Nhỏ – Trung bình (2-4 người)',
        'Lớn (trên 6 người)',
        'Nhiều tầng',
        'Hình dạng đặc biệt'
    ]
};

export const FOOD_FILTERS = {
    type: [
        'Mì',
        'Bánh',
        'Pizza',
        'Snack',
        'Đồ chiên'
    ]
};

export const DRINK_FILTERS = {
    type: [
        'Nước ngọt',
        'Nước ép trái cây',
        'Trà sữa',
        'Cà phê',
        'Sinh tố'
    ]
};

// Types for Product Customization Options
export interface ProductOptionItem {
    name: string;
    price?: number; // Optional price for the item (e.g., extra for topping)
}

export interface ProductOption {
    name: string; // e.g., "Mức đường" or "Topping"
    type: 'radio' | 'checkbox';
    items: (string | ProductOptionItem)[];
}

// Represents a choice made by the user for a single option group
export interface SelectedOption {
    name: string; // Name of the option group, e.g., "Mức đường"
    value: string; // The chosen value, e.g., "70%"
}


// Product Interface
export interface Product {
    id: number;
    name: string;
    price: number;
    image: string;
    category: MainCategory;
    subCategory?: string;
    filters?: CakeFilters | FoodFilters | DrinkFilters;
    options?: ProductOption[];
    description?: string;
    onSale?: boolean;
    salePrice?: number;
    isNew?: boolean;
    inStock: boolean;
    rating?: number;
}

export interface CartItem extends Product {
    quantity: number;
    // A unique identifier for the cart item, typically combining the product ID and selected options.
    // This allows having the same product with different options as separate items in the cart.
    uniqueId: string; 
    selectedOptions?: SelectedOption[];
}


// Filter Types
export interface CategoryFilter {
    id: string;
    label: string;
    count?: number;
}

export interface FilterState {
    [key: string]: string[];
}

export interface SortOption {
    id: string;
    label: string;
}

export const SORT_OPTIONS: SortOption[] = [
    { id: 'price-asc', label: 'Giá tăng dần' },
    { id: 'price-desc', label: 'Giá giảm dần' },
    { id: 'name-asc', label: 'Tên A-Z' },
    { id: 'name-desc', label: 'Tên Z-A' },
    { id: 'newest', label: 'Mới nhất' }
];
