import axios from 'axios';
import { API_BASE_URL } from '../config/env';

export const orderService = {
  getOrders: async (status?: string) => {
    const params = status ? { status } : {};
    const response = await axios.get(`${API_BASE_URL}/orders`, { params });
    return response.data;
  },

  getOrder: async (orderId: number) => {
    const response = await axios.get(`${API_BASE_URL}/orders/${orderId}`);
    return response.data;
  },

  createOrder: async (orderData: any) => {
    const response = await axios.post(`${API_BASE_URL}/orders`, orderData);
    return response.data;
  },

  updateOrderStatus: async (orderId: number, status: string) => {
    const response = await axios.put(`${API_BASE_URL}/orders/${orderId}`, { status });
    return response.data;
  },

  deleteOrder: async (orderId: number) => {
    const response = await axios.delete(`${API_BASE_URL}/orders/${orderId}`);
    return response.data;
  },
};

