import axios from 'axios';
import { notificationService } from './notificationService';
import { uiService } from './uiService';
import { cartService } from './cartService';
import { orderService } from './orderService';

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:5000';

interface PaymentDetails {
    orderType: 'dine-in' | 'takeaway';
    paymentMethod: 'cash' | 'card' | 'momo' | 'zalopay';
    address?: {
        fullName: string;
        phone: string;
        street: string;
        city: string;
    };
    tableNumber?: string;
}

class PaymentService {
    private async createOrderInDatabase(details: PaymentDetails) {
        try {
            const cartItems = cartService.getItems();
            
            if (!cartItems || cartItems.length === 0) {
                throw new Error('Giỏ hàng trống');
            }

            // Validate cart items
            const validItems = cartItems.filter(item => 
                item.id && item.quantity > 0 && item.price > 0
            );

            if (validItems.length === 0) {
                throw new Error('Không có sản phẩm hợp lệ trong giỏ hàng');
            }

            // Create order data for backend - ensure proper type conversion
            const orderData = {
                customer_name: details.address?.fullName || 'Khách hàng',
                items: validItems.map(item => ({
                    product_id: parseInt(String(item.id), 10),
                    quantity: parseInt(String(item.quantity), 10)
                })),
                total_price: parseFloat(String(cartService.getTotalPrice())),
                status: 'pending'
            };

            console.log('Creating order with data:', orderData);

            // Call backend API to create order
            const response = await axios.post(`${API_BASE}/orders`, orderData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Order creation response:', response.data);
            
            if (response.data && response.data.order_id) {
                return response.data.order_id;
            } else {
                throw new Error('Không nhận được order_id từ server');
            }

        } catch (error: any) {
            console.error('Order creation error:', error);
            if (error.response) {
                console.error('Server response:', error.response.data);
                console.error('Status:', error.response.status);
            }
            throw new Error(`Lỗi tạo đơn hàng: ${error.message || 'Lỗi không xác định'}`);
        }
    }

    async submitOrder(details: PaymentDetails) {
        try {
            // Create order in database
            const orderId = await this.createOrderInDatabase(details);

            // Clear cart after successful order
            cartService.clearCart();

            // Success notification
            notificationService.show(`Đặt hàng thành công! Mã đơn hàng: #${orderId}`, {
                type: 'success',
                duration: 5000
            });

            // Close all modals
            uiService.hideAllOverlays();

            // Trigger order created event
            window.dispatchEvent(new CustomEvent('order:created', { 
                detail: { orderId, details } 
            }));

            return orderId;

        } catch (error) {
            console.error('Submit order error:', error);
            notificationService.show('Không thể tạo đơn hàng. Vui lòng thử lại!', {
                type: 'error'
            });
            throw error;
        }
    }

    async startPaymentFlow() {
        try {
            uiService.showForm('payment');
        } catch (error) {
            console.error('Payment flow error:', error);
            notificationService.show('Có lỗi xảy ra. Vui lòng thử lại!', {
                type: 'error'
            });
        }
    }
}

export const paymentService = new PaymentService();
