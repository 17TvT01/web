import React from 'react';
import { MainCategory } from '../../types';
import '../../assets/css/components/product-navigation.css';

interface Props {
    activeCategory: MainCategory;
    onCategoryChange: (category: MainCategory) => void;
}

export const ProductNavigation: React.FC<Props> = ({ activeCategory, onCategoryChange }) => {
    const categories: { id: MainCategory; label: string; icon: string }[] = [
        { id: 'all', label: 'Tất cả', icon: 'fas fa-th-large' },
        { id: 'cake', label: 'Bánh kem', icon: 'fas fa-birthday-cake' },
        { id: 'drink', label: 'Đồ uống', icon: 'fas fa-glass-martini-alt' },
        { id: 'food', label: 'Đồ ăn', icon: 'fas fa-utensils' }
    ];

    return (
        <nav className="product-navigation">
            <div className="nav-container">
                <div className="category-list">
                    {categories.map(category => (
                        <button
                            key={category.id}
                            className={`category-btn ${activeCategory === category.id ? 'active' : ''}`}
                            onClick={() => onCategoryChange(category.id)}
                        >
                            <i className={category.icon}></i>
                            <span>{category.label}</span>
                            {activeCategory === category.id && (
                                <div className="active-indicator"></div>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
};