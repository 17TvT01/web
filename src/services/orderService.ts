import axios from 'axios';

const API_BASE = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:5000';

export const orderService = {
  getOrders: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await axios.get(`${API_BASE}/orders`, { params });
    return response.data;
  },

  getOrder: async (orderId: number) => {
    const response = await axios.get(`${API_BASE}/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (orderData: any) => {
    const response = await axios.post(`${API_BASE}/orders`, orderData);
    return response.data;
  },

  updateOrderStatus: async (orderId: number, status: string) => {
    const response = await axios.put(`${API_BASE}/orders/${orderId}`, { status });
    return response.data;
  },

  deleteOrder: async (orderId: number) => {
    const response = await axios.delete(`${API_BASE}/orders/${orderId}`);
    return response.data;
  },
};
