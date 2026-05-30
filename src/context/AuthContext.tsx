// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../config/constants';
import { storage } from '../utils/secureStorage';
import { Member, LoggedUser } from '../types';
import client, { authEventEmitter } from '../api/client';

interface AuthContextType {
  member: Member | null;
  user: LoggedUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Step 1: send OTP
  requestOtp: (membershipNo: string, mobile: string) => Promise<void>;
  // Step 2: verify OTP (Fast2SMS path)
  verifyOtp: (membershipNo: string, mobile: string, otp: string) => Promise<void>;
  // Step 2b: verify Firebase OTP path
  verifyFirebaseOtp: (idToken: string, membershipNo: string, mobile: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<Member | null>(null);
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted auth on app start
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [savedMember, savedUser, savedToken] = await Promise.all([
          storage.getItem(STORAGE_KEYS.PORTAL_MEMBER),
          storage.getItem(STORAGE_KEYS.PORTAL_USER),
          storage.getItem(STORAGE_KEYS.PORTAL_TOKEN),
        ]);

        if (savedMember) setMember(JSON.parse(savedMember));
        if (savedUser) setUser(JSON.parse(savedUser));
        if (savedToken) setToken(savedToken);
      } catch (e) {
        console.error('[AUTH] Failed to load stored auth:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuth();
  }, []);

  // Listen for forced logout event from API interceptor
  useEffect(() => {
    const handleForcedLogout = () => {
      logout();
    };
    authEventEmitter.on('logout', handleForcedLogout);
    return () => {
      authEventEmitter.off('logout', handleForcedLogout);
    };
  }, []);

  const handleLoginSuccess = async (data: any) => {
    const memberData = data.member;
    const userData = data.loggedInUser || { name: memberData.name, relation: 'Head' };
    const jwtToken = data.token;

    setMember(memberData);
    setUser(userData);
    setToken(jwtToken);

    await Promise.all([
      storage.setItem(STORAGE_KEYS.PORTAL_MEMBER, JSON.stringify(memberData)),
      storage.setItem(STORAGE_KEYS.PORTAL_USER, JSON.stringify(userData)),
      storage.setItem(STORAGE_KEYS.PORTAL_TOKEN, jwtToken),
    ]);
  };

  // Step 1: Request OTP via Fast2SMS
  const requestOtp = async (membershipNo: string, mobile: string) => {
    const response = await client.post('/portal/login', {
      membership_no: membershipNo.trim(),
      mobile: mobile.replace(/\D/g, ''),
    });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to send OTP');
    }
  };

  // Step 2a: Verify OTP (Fast2SMS path)
  const verifyOtp = async (membershipNo: string, mobile: string, otp: string) => {
    const response = await client.post('/portal/verify-otp', {
      membership_no: membershipNo.trim(),
      mobile: mobile.replace(/\D/g, ''),
      otp: otp.trim(),
    });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Invalid OTP');
    }
    await handleLoginSuccess(response.data);
  };

  // Step 2b: Verify Firebase OTP path
  const verifyFirebaseOtp = async (idToken: string, membershipNo: string, mobile: string) => {
    const response = await client.post('/portal/login/firebase', {
      idToken,
      membership_no: membershipNo.trim(),
      mobile: mobile.replace(/\D/g, ''),
    });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Firebase login failed');
    }
    await handleLoginSuccess(response.data);
  };

  const logout = async () => {
    setMember(null);
    setUser(null);
    setToken(null);
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.PORTAL_TOKEN),
      storage.removeItem(STORAGE_KEYS.PORTAL_MEMBER),
      storage.removeItem(STORAGE_KEYS.PORTAL_USER),
    ]);
  };

  return (
    <AuthContext.Provider value={{
      member,
      user,
      token,
      isLoading,
      isAuthenticated: !!member && !!token,
      requestOtp,
      verifyOtp,
      verifyFirebaseOtp,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
