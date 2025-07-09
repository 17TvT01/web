import { Order } from '../components/Order/Order';
import { Profile } from '../components/Profile/Profile';

export const privateRoutes = [
    {
        path: '/orders',
        component: Order
    },
    {
        path: '/profile',
        component: Profile
    }
];