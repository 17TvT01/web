import type { MainCategory } from '@shared/types';
import './CategoryTabs.css';

export type CategoryOption = {
  id: MainCategory;
  label: string;
  icon: string;
};

interface CategoryTabsProps {
  categories: CategoryOption[];
  active: MainCategory;
  onSelect: (category: MainCategory) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ categories, active, onSelect }) => {
  return (
    <div className="category-tabs">
      {categories.map(category => (
        <button
          key={category.id}
          className={`category-tab ${category.id === active ? 'category-tab--active' : ''}`}
          onClick={() => onSelect(category.id)}
        >
          <span className="category-tab__icon" aria-hidden="true">
            {category.icon}
          </span>
          {category.label}
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;
