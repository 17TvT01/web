import { notificationService } from './notificationService';
import { uiService } from './uiService';
import { cartService } from './cartService';

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
    private async processPayment(details: PaymentDetails) {
        try {
            // Giả lập xử lý thanh toán
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Lưu thông tin đơn hàng
            const order = {
                id: Date.now(),
                items: cartService.getItems(),
                total: cartService.getTotalPrice(),
                ...details,
                status: 'processing',
                createdAt: new Date().toISOString()
            };

            // Lưu vào localStorage
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            orders.push(order);
            localStorage.setItem('orders', JSON.stringify(orders));

            // Clear giỏ hàng
            cartService.clearCart();

            // Thông báo thành công
            notificationService.show('Đặt hàng thành công!', {
                type: 'success',
                duration: 5000
            });

            return order;

        } catch (error) {
            console.error('Payment error:', error);
            notificationService.show('Thanh toán thất bại. Vui lòng thử lại!', {
                type: 'error'
            });
            throw error;
        }
    }

    async startPaymentFlow() {
        // Bắt đầu quy trình thanh toán
        try {
            // 1. Hiển thị modal chọn hình thức dùng
            uiService.showForm('orderType');

        } catch (error) {
            console.error('Payment flow error:', error);
            notificationService.show('Có lỗi xảy ra. Vui lòng thử lại!', {
                type: 'error'
            });
        }
    }

    async submitOrder(details: PaymentDetails) {
        try {
            // Xử lý thanh toán
            const order = await this.processPayment(details);

            // Đóng tất cả modal
            uiService.hideAllOverlays();

            // Thông báo chi tiết
            if (details.orderType === 'dine-in') {
                notificationService.show(`Đơn hàng #${order.id} đang được xử lý. Vui lòng đợi tại bàn ${details.tableNumber}`, {
                    type: 'info',
                    duration: 5000
                });
            } else {
                notificationService.show(`Đơn hàng #${order.id} đang được chuẩn bị và sẽ giao đến bạn sớm nhất!`, {
                    type: 'info',
                    duration: 5000
                });
            }

            return order;

        } catch (error) {
            console.error('Submit order error:', error);
            notificationService.show('Không thể hoàn tất đơn hàng. Vui lòng thử lại!', {
                type: 'error'
            });
            throw error;
        }
    }
}

export const paymentService = new PaymentService();