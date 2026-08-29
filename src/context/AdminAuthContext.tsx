// src/context/AdminAuthContext.tsx
// Mirrors the shape of AuthContext.tsx but for the SEPARATE admin/staff
// auth system — different token, different storage keys. Login is now
// two-step (password, then a Firebase Phone Auth OTP to the admin's own
// registered mobile) — see ADMIN_OTP_LOGIN.md in the backend repo for the
// full design and why it reuses the exact same FirebaseRecaptcha WebView
// component the member AuthContext uses, rather than a new mechanism.
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { STORAGE_KEYS } from '../config/constants';
import { storage } from '../utils/secureStorage';
import { adminAuthEventEmitter } from '../api/adminClient';
import * as adminApi from '../api/admin';
import { AdminUser } from '../api/admin';
import { FirebaseRecaptcha, FirebaseRecaptchaRef } from '../components/common/FirebaseRecaptcha';

interface AdminLoginStep1Result {
  requiresOtp: boolean;
  pendingToken: string;
  mobile: string;
  maskedMobile: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  adminToken: string | null;
  isAdminAuthenticated: boolean;
  isLoading: boolean;
  // Step 1: username+password. Does NOT log the admin in — returns what's
  // needed to drive step 2 (the OTP screen).
  adminLogin: (username: string, password: string) => Promise<AdminLoginStep1Result>;
  // Step 2: sends the actual SMS via Firebase to the mobile returned by
  // step 1. Resolves once the SMS has been sent (not once it's verified).
  adminRequestOtp: (pendingToken: string, mobile: string) => Promise<void>;
  // Step 3: verifies the code the admin typed, then completes login.
  adminVerifyOtp: (pendingToken: string, otp: string) => Promise<void>;
  adminLogout: () => Promise<void>;
  // Re-fetches /admin/me and updates adminUser in place — used after
  // completing the email/membershipNo/mobile grace-period nag so the
  // banner clears without forcing a fresh login.
  refreshAdminUser: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Firebase phone-auth WebView plumbing — mirrors AuthContext.tsx's
  // member-facing setup exactly, just with its own ref/state so the two
  // don't interfere with each other. ──
  const recaptchaRef = useRef<FirebaseRecaptchaRef>(null);
  const [isRecaptchaVisible, setIsRecaptchaVisible] = useState(false);
  const isRecaptchaReady = useRef(false);
  const pendingOtpRequest = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
    mobile: string;
  } | null>(null);
  const pendingVerifyRequest = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
    pendingToken: string;
  } | null>(null);

  const handleRecaptchaEvent = async (event: any) => {
    switch (event.type) {
      case 'ready':
        isRecaptchaReady.current = true;
        if (pendingOtpRequest.current) {
          const formattedMobile = `+91${pendingOtpRequest.current.mobile.replace(/\D/g, '')}`;
          recaptchaRef.current?.injectMessage({ type: 'sendOtp', phoneNumber: formattedMobile });
        }
        break;

      case 'otpSent':
        setIsRecaptchaVisible(false);
        if (pendingOtpRequest.current) {
          pendingOtpRequest.current.resolve();
        }
        break;

      case 'sendOtpError':
        setIsRecaptchaVisible(false);
        if (pendingOtpRequest.current) {
          pendingOtpRequest.current.reject(new Error(event.message || 'Failed to send OTP'));
          pendingOtpRequest.current = null;
        }
        break;

      case 'otpVerified': {
        const idToken = event.idToken;
        try {
          if (!pendingVerifyRequest.current) {
            throw new Error('Verification session metadata is missing');
          }
          const { pendingToken } = pendingVerifyRequest.current;

          const res = await adminApi.adminVerifyOtp(pendingToken, idToken);
          if (!res.success || !res.token || !res.user) {
            throw new Error(res.message || 'OTP verification failed on server');
          }

          setAdminUser(res.user);
          setAdminToken(res.token);
          await Promise.all([
            storage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(res.user)),
            storage.setItem(STORAGE_KEYS.ADMIN_TOKEN, res.token),
          ]);

          pendingVerifyRequest.current.resolve();
          pendingVerifyRequest.current = null;
        } catch (err: any) {
          if (pendingVerifyRequest.current) {
            pendingVerifyRequest.current.reject(err);
            pendingVerifyRequest.current = null;
          }
        }
        break;
      }

      case 'verifyOtpError':
        if (pendingVerifyRequest.current) {
          pendingVerifyRequest.current.reject(new Error(event.message || 'Invalid or expired OTP'));
          pendingVerifyRequest.current = null;
        }
        break;

      case 'error':
        if (pendingOtpRequest.current) {
          pendingOtpRequest.current.reject(new Error(event.message || 'Verification initialization error'));
          pendingOtpRequest.current = null;
          setIsRecaptchaVisible(false);
        }
        if (pendingVerifyRequest.current) {
          pendingVerifyRequest.current.reject(new Error(event.message || 'Verification initialization error'));
          pendingVerifyRequest.current = null;
        }
        break;
    }
  };

  const handleRecaptchaClose = () => {
    setIsRecaptchaVisible(false);
    if (pendingOtpRequest.current) {
      pendingOtpRequest.current.reject(new Error('Security check cancelled by user.'));
      pendingOtpRequest.current = null;
    }
  };

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

  // Step 1: password check only — does not set adminUser/adminToken.
  const adminLogin = async (username: string, password: string): Promise<AdminLoginStep1Result> => {
    const res = await adminApi.adminLoginRequest(username, password);
    if (!res.success || !res.pendingToken || !res.mobile) {
      throw new Error(res.message || 'Invalid username or password');
    }
    return {
      requiresOtp: true,
      pendingToken: res.pendingToken,
      mobile: res.mobile,
      maskedMobile: res.maskedMobile || res.mobile,
    };
  };

  // Step 2: trigger the actual SMS send via the Firebase WebView.
  const adminRequestOtp = (pendingToken: string, mobile: string) => {
    return new Promise<void>((resolve, reject) => {
      pendingOtpRequest.current = { resolve, reject, mobile };
      setIsRecaptchaVisible(true);

      if (isRecaptchaReady.current) {
        const formattedMobile = `+91${mobile.replace(/\D/g, '')}`;
        recaptchaRef.current?.injectMessage({ type: 'sendOtp', phoneNumber: formattedMobile });
      }
    });
  };

  // Step 3: verify the typed code, then complete login on success.
  const adminVerifyOtp = (pendingToken: string, otp: string) => {
    return new Promise<void>((resolve, reject) => {
      pendingVerifyRequest.current = { resolve, reject, pendingToken };
      recaptchaRef.current?.injectMessage({ type: 'verifyOtp', code: otp.trim() });
    });
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
      adminRequestOtp,
      adminVerifyOtp,
      adminLogout: logout,
      refreshAdminUser,
    }}>
      {children}
      <FirebaseRecaptcha
        ref={recaptchaRef}
        onEvent={handleRecaptchaEvent}
        isVisible={isRecaptchaVisible}
        onClose={handleRecaptchaClose}
      />
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
