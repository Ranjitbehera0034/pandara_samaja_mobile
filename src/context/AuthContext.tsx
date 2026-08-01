// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { STORAGE_KEYS } from '../config/constants';
import { storage } from '../utils/secureStorage';
import { Member, LoggedUser } from '../types';
import client, { authEventEmitter } from '../api/client';
import { FirebaseRecaptcha, FirebaseRecaptchaRef } from '../components/common/FirebaseRecaptcha';
import { registerForPushNotificationsAsync, clearPushToken } from '../utils/pushNotifications';

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
  // Updates the locally-cached profile photo (member + logged-in user) after
  // a successful upload, without waiting for the next silent refresh.
  updateProfilePhoto: (url: string) => Promise<void>;
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
  // The WebView now mounts once at app launch (kept alive persistently — see
  // FirebaseRecaptcha.tsx) instead of remounting each time it's shown, so its
  // one-shot 'ready' event fires immediately at launch, long before any OTP
  // request exists. Track readiness separately so requestOtp() can send the
  // 'sendOtp' message itself instead of waiting for a 'ready' that already
  // happened and will never fire again.
  const isRecaptchaReady = useRef(false);

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
        isRecaptchaReady.current = true;
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

  // Silently refresh the session on every app launch — this, plus a
  // long-lived token on the backend, is what makes login "stay logged in
  // indefinitely" rather than expiring on a fixed timer. Runs after the UI
  // is already up so it doesn't add startup latency; only forces logout if
  // the refresh explicitly fails (banned/deleted member, truly invalid
  // token) — a real network hiccup just leaves the existing token in place
  // to retry next launch.
  useEffect(() => {
    if (isLoading || !token) return;
    let cancelled = false;

    client.post('/portal/refresh')
      .then(async (res) => {
        if (cancelled || !res.data?.success) return;
        const newToken = res.data.token;
        setToken(newToken);
        await storage.setItem(STORAGE_KEYS.PORTAL_TOKEN, newToken);

        // The backend now also returns fresh member data (family_members,
        // profile_photo_url, etc.) alongside the token — keep the stored
        // member object current instead of only ever refreshing the JWT.
        if (res.data.member) {
          setMember(res.data.member);
          await storage.setItem(STORAGE_KEYS.PORTAL_MEMBER, JSON.stringify(res.data.member));
        }
        // loggedInUser reflects the SPECIFIC logged-in person (name/photo),
        // which for a non-head family member differs from `member` (the
        // household record) — without this, a family member's own avatar
        // could only ever change via their own device's upload, never pick
        // up an admin-side edit or a change made from another device.
        if (res.data.loggedInUser) {
          setUser(res.data.loggedInUser);
          await storage.setItem(STORAGE_KEYS.PORTAL_USER, JSON.stringify(res.data.loggedInUser));
        }
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (!cancelled && (status === 401 || status === 403)) {
          logout();
        }
        // Any other error (offline, 5xx) — keep the existing token, try again next launch.
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  // Register this device's push token on every app launch where a session
  // is already restored (not just right after a fresh login below) — quiet,
  // best-effort, never blocks or shows an error (see pushNotifications.ts).
  useEffect(() => {
    if (isLoading || !token) return;
    registerForPushNotificationsAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

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

    // Fire-and-forget — quietly register this device for push notifications
    // right after login. Never blocks the login flow and never surfaces an
    // error (permission denied is a normal outcome, not a bug).
    registerForPushNotificationsAsync();
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

      // The WebView is persistently mounted, so its 'ready' event almost
      // certainly already fired at app launch, before this request existed —
      // send now instead of waiting for a 'ready' that won't come again.
      if (isRecaptchaReady.current) {
        const formattedMobile = `+91${mobile.replace(/\D/g, '')}`;
        console.log('[RECAPTCHA] Already ready — sending OTP to:', formattedMobile);
        recaptchaRef.current?.injectMessage({
          type: 'sendOtp',
          phoneNumber: formattedMobile,
        });
      }
      // If it's not ready yet (e.g. user taps Send OTP within the first
      // instant of a cold start), the 'ready' handler above still covers it.
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
    // Best-effort — clear the server-side push token so this device stops
    // receiving pushes for an account it's no longer signed into. Fired
    // before local state clears so it still has a valid token to authenticate
    // the request with; failure here must never block logout itself.
    clearPushToken();

    setMember(null);
    setUser(null);
    setToken(null);
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.PORTAL_TOKEN),
      storage.removeItem(STORAGE_KEYS.PORTAL_MEMBER),
      storage.removeItem(STORAGE_KEYS.PORTAL_USER),
    ]);
  };

  const updateProfilePhoto = async (url: string) => {
    const updatedMember = member ? { ...member, profile_photo_url: url } : member;
    const updatedUser = user ? { ...user, profile_photo_url: url } : user;
    setMember(updatedMember);
    setUser(updatedUser);
    await Promise.all([
      updatedMember ? storage.setItem(STORAGE_KEYS.PORTAL_MEMBER, JSON.stringify(updatedMember)) : Promise.resolve(),
      updatedUser ? storage.setItem(STORAGE_KEYS.PORTAL_USER, JSON.stringify(updatedUser)) : Promise.resolve(),
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
      updateProfilePhoto,
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
