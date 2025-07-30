import axios from 'axios';
import { API_ENDPOINTS } from './end-point';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken'); // Or wherever your token is stored
    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        config.headers = { Authorization: `Bearer ${token}` };
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const callApiRoute = {
  // Example function to make a GET request
  getData: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CHAT);
      return response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  },

  // Example function to make a POST request
  postItem: async (data: unknown) => {
    try {
      const response = await api.post(API_ENDPOINTS.CHAT, data);
      return response.data;
    } catch (error) {
      console.error('Error posting item:', error);
      throw error;
    }
  },

  // Add more API call functions as needed
};