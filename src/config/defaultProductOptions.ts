import { ProductOption } from '../types';

const defaultOptionsByCategory: Record<string, ProductOption[]> = {
    drink: [
        {
            name: 'Mức đường',
            type: 'radio',
            items: ['100%', '70%', '50%', '30%', '0%'],
        },
        {
            name: 'Mức đá',
            type: 'radio',
            items: ['100%', '70%', '50%', '30%', '0%'],
        },
        {
            name: 'Topping thêm',
            type: 'checkbox',
            items: [
                { name: 'Trân châu', price: 5000 },
                { name: 'Pudding', price: 7000 },
                { name: 'Thạch', price: 6000 },
            ],
        },
    ],
    cake: [
        {
            name: 'Kích thước',
            type: 'radio',
            items: ['Mini', 'Nhỏ', 'Trung bình', 'Lớn'],
        },
        {
            name: 'Trang trí thêm',
            type: 'checkbox',
            items: [
                { name: 'Nến', price: 10000 },
                { name: 'Hoa tươi', price: 20000 },
            ],
        },
    ],
    food: [
        {
            name: 'Độ cay',
            type: 'radio',
            items: ['Không cay', 'Nhẹ', 'Vừa', 'Nhiều'],
        },
        {
            name: 'Phụ gia',
            type: 'checkbox',
            items: [
                { name: 'Thêm rau', price: 5000 },
                { name: 'Thêm trứng', price: 7000 },
            ],
        },
    ],
};

export default defaultOptionsByCategory;
