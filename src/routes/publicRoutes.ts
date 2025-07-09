import { ProductList } from '../components/Product/ProductList';
import { Login } from '../components/Auth/Login';
import { Register } from '../components/Auth/Register';

export const publicRoutes = [
    {
        path: '/',
        component: ProductList
    },
    {
        path: '/login',
        component: Login
    },
    {
        path: '/register',
        component: Register
    }
];