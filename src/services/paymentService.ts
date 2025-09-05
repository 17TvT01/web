import axios from 'axios';
import { notificationService } from './notificationService';
import { uiService } from './uiService';
import { cartService } from './cartService';

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
    needsAssistance?: boolean;
    note?: string;
    emailReceipt?: boolean;
    customerEmail?: string;
}

class PaymentService {
    private async createOrderInDatabase(details: PaymentDetails) {
        // Prepare order payload for backend
        const orderData = {
            customer_name: details.address?.fullName || 'Customer',
            items: cartService.getItems().map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                selected_options: item.selectedOptions || []
            })),
            total_price: cartService.getTotalPrice(),
            status: 'pending',
            order_type: details.orderType,
            payment_method: details.paymentMethod,
            table_number: details.tableNumber,
            needs_assistance: !!details.needsAssistance,
            note: details.note,
            customer_email: details.customerEmail,
            email_receipt: !!details.emailReceipt,
            payment_status: 'paid',
        };

        const response = await axios.post(`${API_BASE}/orders`, orderData);
        if (response.data.order_id) return response.data.order_id as number;
        throw new Error('Failed to create order');
    }

    async submitOrder(details: PaymentDetails) {
        const orderId = await this.createOrderInDatabase(details);

        // Clear cart and close overlays
        cartService.clearCart();
        const tableInfo = details.orderType === 'dine-in' && details.tableNumber ? ` - Bàn: ${details.tableNumber}` : '';
        notificationService.show(`Đặt hàng thành công! Mã đơn hàng: #${orderId}${tableInfo}`, {
            type: 'success',
            duration: 5000,
        });
        uiService.hideAllOverlays();

        // Event for any listeners
        window.dispatchEvent(new CustomEvent('order:created', { detail: { orderId, details } }));
        return orderId;
    }

    async startPaymentFlow() {
        uiService.showForm('payment');
    }
}

export const paymentService = new PaymentService();

