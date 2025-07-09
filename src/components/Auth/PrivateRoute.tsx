import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';

interface PrivateRouteProps {
    element: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ element }) => {
    const isAuthenticated = authService.isAuthenticated();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{element}</>;
};