import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../components/Auth/ProtectedRoute';
import { Login } from '../components/Auth/Login';
import { Register } from '../components/Auth/Register';
import { Profile } from '../components/Profile/Profile';
import { Orders } from '../components/Order/Orders';
import { ProductList } from '../components/Product/ProductList';
import { MainCategory, FilterState } from '../types';

interface AppRoutesProps {
    category: MainCategory;
    filters: FilterState;
    sortBy: string;
    searchQuery: string;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ category, filters, sortBy, searchQuery }) => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    // Nếu đang ở trang chủ, hiển thị danh sách sản phẩm
    // Nếu đang ở trang profile hoặc orders, hiển thị component tương ứng
    return (
        <Routes>
            {/* Public Routes */}
            <Route
                path="/"
                element={
                    <ProductList
                        category={category}
                        filters={filters}
                        sortBy={sortBy}
                        searchQuery={searchQuery}
                    />
                }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <Profile />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/orders"
                element={
                    <ProtectedRoute>
                        <Orders />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
};

export default AppRoutes;