// src/context/AdminAuthContext.tsx
// Mirrors the shape of AuthContext.tsx but for the SEPARATE admin/staff
// auth system — different token, different storage keys, no OTP/Firebase
// flow. Deliberately independent from the member AuthContext.
import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../config/constants';
import { storage } from '../utils/secureStorage';
import { adminAuthEventEmitter } from '../api/adminClient';
import * as adminApi from '../api/admin';
import { AdminUser } from '../api/admin';

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  adminToken: string | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  adminLogin: (username: string, password: string) => Promise<void>;
  adminLogout: () => Promise<void>;
  // Re-fetches /admin/me and updates adminUser in place — used after
  // completing the email/membershipNo grace-period nag so the banner
  // clears without forcing a fresh login.
  refreshAdminUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted admin auth on app start
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [savedUser, savedToken] = await Promise.all([
          storage.getItem(STORAGE_KEYS.ADMIN_USER),
          storage.getItem(STORAGE_KEYS.ADMIN_TOKEN),
        ]);

        if (savedUser) setAdminUser(JSON.parse(savedUser));
        if (savedToken) setAdminToken(savedToken);
      } catch (e) {
        console.error('[ADMIN_AUTH] Failed to load stored auth:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, []);

  // Silently verify the session on launch — only forces logout on an
  // explicit auth failure (invalid/expired/banned token), never on a plain
  // network hiccup, matching the member AuthContext's refresh behavior.
  useEffect(() => {
    if (isLoading || !adminToken) return;
    let cancelled = false;

    adminApi.fetchAdminMe()
      .then((res) => {
        if (cancelled || !res.success || !res.user) return;
        setAdminUser(res.user);
        storage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(res.user));
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (!cancelled && (status === 401 || status === 403)) {
          logout();
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Listen for forced logout event from the admin API interceptor
  useEffect(() => {
    const handleForcedLogout = () => {
      logout();
    };
    adminAuthEventEmitter.on('logout', handleForcedLogout);
    return () => {
      adminAuthEventEmitter.off('logout', handleForcedLogout);
    };
  }, []);

  const adminLogin = async (username: string, password: string) => {
    const res = await adminApi.adminLoginRequest(username, password);
    if (!res.success || !res.token || !res.user) {
      throw new Error(res.message || 'Invalid username or password');
    }

    setAdminUser(res.user);
    setAdminToken(res.token);

    await Promise.all([
      storage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(res.user)),
      storage.setItem(STORAGE_KEYS.ADMIN_TOKEN, res.token),
    ]);
  };

  const refreshAdminUser = async () => {
    const res = await adminApi.fetchAdminMe();
    if (!res.success || !res.user) return;
    setAdminUser(res.user);
    await storage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(res.user));
  };

  const logout = async () => {
    setAdminUser(null);
    setAdminToken(null);
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.ADMIN_TOKEN),
      storage.removeItem(STORAGE_KEYS.ADMIN_USER),
    ]);
  };

  return (
    <AdminAuthContext.Provider value={{
      adminUser,
      adminToken,
      isLoading,
      isAdminAuthenticated: !!adminUser && !!adminToken,
      adminLogin,
      adminLogout: logout,
      refreshAdminUser,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
