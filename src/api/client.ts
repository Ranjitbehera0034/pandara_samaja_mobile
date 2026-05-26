// src/api/client.ts
import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../config/constants';
import { storage } from '../utils/secureStorage';

const client = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
client.interceptors.request.use(async (config) => {
  const token = await storage.getItem(STORAGE_KEYS.PORTAL_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — token expired
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth and force re-login
      await storage.removeItem(STORAGE_KEYS.PORTAL_TOKEN);
      await storage.removeItem(STORAGE_KEYS.PORTAL_MEMBER);
      await storage.removeItem(STORAGE_KEYS.PORTAL_USER);
    }
    return Promise.reject(error);
  }
);

export default client;
