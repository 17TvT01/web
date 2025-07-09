import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const user = authService.getCurrentUser();

    if (!user) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;