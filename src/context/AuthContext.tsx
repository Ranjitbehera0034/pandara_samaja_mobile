// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { STORAGE_KEYS } from '../config/constants';
import { storage } from '../utils/secureStorage';
import { Member, LoggedUser } from '../types';
import client, { authEventEmitter } from '../api/client';
import { FirebaseRecaptcha, FirebaseRecaptchaRef } from '../components/common/FirebaseRecaptcha';

interface AuthContextType {
  member: Member | null;
  user: LoggedUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Step 1: send OTP. Returns { useFirebase, devOtp }
  requestOtp: (membershipNo: string, mobile: string) => Promise<{ useFirebase: boolean; devOtp?: string }>;
  // Step 2: verify OTP (Fast2SMS path)
  verifyOtp: (membershipNo: string, mobile: string, otp: string) => Promise<void>;
  // Step 2b: verify Firebase OTP path (takes OTP code directly)
  verifyFirebaseOtp: (membershipNo: string, mobile: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<Member | null>(null);
  const [user, setUser] = useState<LoggedUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Firebase WebView OTP verification coordination
  const recaptchaRef = useRef<FirebaseRecaptchaRef>(null);
  const [isRecaptchaVisible, setIsRecaptchaVisible] = useState(false);
  
  const pendingOtpRequest = useRef<{
    resolve: (val: { useFirebase: boolean; devOtp?: string }) => void;
    reject: (err: Error) => void;
    membershipNo: string;
    mobile: string;
  } | null>(null);

  const pendingVerifyRequest = useRef<{
    resolve: () => void;
    reject: (err: Error) => void;
    membershipNo: string;
    mobile: string;
  } | null>(null);

  const handleRecaptchaEvent = async (event: any) => {
    switch (event.type) {
      case 'ready':
        console.log('[RECAPTCHA] WebView Ready');
        if (pendingOtpRequest.current) {
          const formattedMobile = `+91${pendingOtpRequest.current.mobile.replace(/\D/g, '')}`;
          console.log('[RECAPTCHA] Sending OTP to:', formattedMobile);
          recaptchaRef.current?.injectMessage({
            type: 'sendOtp',
            phoneNumber: formattedMobile,
          });
        }
        break;

      case 'otpSent':
        console.log('[RECAPTCHA] OTP Sent successfully');
        setIsRecaptchaVisible(false);
        if (pendingOtpRequest.current) {
          pendingOtpRequest.current.resolve({ useFirebase: true });
        }
        break;

      case 'sendOtpError':
        console.error('[RECAPTCHA] Send OTP Error:', event.message);
        Alert.alert('Firebase Error', event.message || 'Failed to send OTP. Please check your credentials and try again.');
        setIsRecaptchaVisible(false);
        if (pendingOtpRequest.current) {
          pendingOtpRequest.current.reject(new Error(event.message || 'Failed to send OTP'));
          pendingOtpRequest.current = null;
        }
        break;

      case 'otpVerified':
        console.log('[RECAPTCHA] OTP Verified. ID Token received.');
        const idToken = event.idToken;
        try {
          const reqMetadata = pendingVerifyRequest.current || pendingOtpRequest.current;
          if (!reqMetadata) {
            throw new Error('Verification session metadata is missing');
          }

          const response = await client.post('/portal/login/firebase', {
            idToken,
            membership_no: reqMetadata.membershipNo,
            mobile: reqMetadata.mobile.replace(/\D/g, ''),
          });

          if (!response.data.success) {
            throw new Error(response.data.message || 'Firebase login verification failed on server');
          }

          await handleLoginSuccess(response.data);

          if (pendingVerifyRequest.current) {
            pendingVerifyRequest.current.resolve();
            pendingVerifyRequest.current = null;
          }
        } catch (err: any) {
          console.error('[RECAPTCHA] Backend verify error:', err);
          if (pendingVerifyRequest.current) {
            pendingVerifyRequest.current.reject(err);
            pendingVerifyRequest.current = null;
          }
        }
        break;

      case 'verifyOtpError':
        console.error('[RECAPTCHA] Verify OTP Error:', event.message);
        if (pendingVerifyRequest.current) {
          pendingVerifyRequest.current.reject(new Error(event.message || 'Invalid or expired OTP'));
          pendingVerifyRequest.current = null;
        }
        break;

      case 'error':
        console.error('[RECAPTCHA] Internal WebView error:', event.message);
        Alert.alert('WebView Error', event.message || 'Verification initialization error.');
        if (pendingOtpRequest.current) {
          pendingOtpRequest.current.reject(new Error(event.message || 'Verification initialization error'));
          pendingOtpRequest.current = null;
          setIsRecaptchaVisible(false);
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

  // Step 1: Request OTP (Checks credentials on backend, then starts Firebase if needed)
  const requestOtp = async (membershipNo: string, mobile: string) => {
    const response = await client.post('/portal/login', {
      membership_no: membershipNo.trim(),
      mobile: mobile.replace(/\D/g, ''),
    });

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to request verification session');
    }

    // In development mode, standard OTP bypass is available
    if (response.data.devOtp) {
      return { useFirebase: false, devOtp: response.data.devOtp };
    }

    return new Promise<{ useFirebase: boolean; devOtp?: string }>((resolve, reject) => {
      pendingOtpRequest.current = { resolve, reject, membershipNo, mobile };
      setIsRecaptchaVisible(true);
    });
  };

  // Step 2a: Verify OTP (Fast2SMS / Dev bypass path)
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

  // Step 2b: Verify Firebase OTP path (uses WebView transaction)
  const verifyFirebaseOtp = async (membershipNo: string, mobile: string, otp: string) => {
    return new Promise<void>((resolve, reject) => {
      pendingVerifyRequest.current = { resolve, reject, membershipNo, mobile };
      
      recaptchaRef.current?.injectMessage({
        type: 'verifyOtp',
        code: otp.trim(),
      });
    });
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
      <FirebaseRecaptcha
        ref={recaptchaRef}
        onEvent={handleRecaptchaEvent}
        isVisible={isRecaptchaVisible}
        onClose={handleRecaptchaClose}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
