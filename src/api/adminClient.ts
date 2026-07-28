// src/api/adminClient.ts
// A SEPARATE axios instance from src/api/client.ts — attaches the admin
// (staff) token instead of the member portal token. These are two
// genuinely independent auth systems (different JWT `type`, different
// backend middleware), so this file intentionally mirrors client.ts's
// structure rather than sharing it.
import axios from 'axios';
import { API_URL, STORAGE_KEYS } from '../config/constants';
import { storage } from '../utils/secureStorage';

const adminClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach admin JWT token to every request
adminClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — admin token expired/invalid
adminClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear admin auth and force re-login
      try {
        await storage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
        await storage.removeItem(STORAGE_KEYS.ADMIN_USER);
      } catch {}
      adminAuthEventEmitter.emit('logout');
    }
    return Promise.reject(error);
  }
);

class SimpleEventEmitter {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: Function) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(...args));
  }
}

// Separate emitter from the member portal's authEventEmitter (src/api/client.ts)
// so a 401 on one auth system never triggers a logout on the other.
export const adminAuthEventEmitter = new SimpleEventEmitter();

export default adminClient;
