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
    private async createOrderInDatabase(details: PaymentDetails): Promise<{ orderId: number; tableNumber?: string }> {
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
            payment_status: 'unpaid',
        };

        const response = await axios.post(`${API_BASE}/orders`, orderData);
        if (response.data.order_id) {
            return {
                orderId: response.data.order_id as number,
                tableNumber: response.data.table_number as string | undefined,
            };
        }
        throw new Error('Failed to create order');
    }

    async submitOrder(details: PaymentDetails) {
        const { orderId, tableNumber } = await this.createOrderInDatabase(details);

        // Clear cart and close overlays
        cartService.clearCart();
        const resolvedTable = tableNumber || details.tableNumber;
        const tableInfo = details.orderType === 'dine-in' && resolvedTable ? ` - Bàn: ${resolvedTable}` : '';
        notificationService.show(`Đặt hàng thành công! Mã đơn hàng: #${orderId}${tableInfo}`, {
            type: 'success',
            duration: 5000,
        });
        uiService.hideAllOverlays();

        // Event for any listeners
        const enrichedDetails = { ...details, tableNumber: resolvedTable ?? details.tableNumber };
        window.dispatchEvent(new CustomEvent('order:created', { detail: { orderId, details: enrichedDetails } }));
        return orderId;
    }

    async startPaymentFlow() {
        uiService.showForm('payment');
    }
}

export const paymentService = new PaymentService();

