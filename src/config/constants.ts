// src/config/constants.ts
import Constants from 'expo-constants';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6000/api';
export const PORTAL_API_URL = `${API_URL}/portal`;

const SERVER_ROOT_URL = API_URL.replace(/\/api\/?$/, '');
export const PRIVACY_POLICY_URL = `${SERVER_ROOT_URL}/privacy-policy`;
export const TERMS_OF_SERVICE_URL = `${SERVER_ROOT_URL}/terms-of-service`;

// Separate service (own repo/deployment) — not part of the main backend.
export const NEWS_API_URL = process.env.EXPO_PUBLIC_NEWS_API_URL || 'http://localhost:7000';

// Secure storage keys — match web localStorage keys exactly
export const STORAGE_KEYS = {
  PORTAL_TOKEN: 'portalToken',
  PORTAL_MEMBER: 'portalMember',
  PORTAL_USER: 'portalUser',
  ADMIN_TOKEN: 'adminToken',
  ADMIN_USER: 'adminUser',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  LANGUAGE: 'appLanguage',
  THEME: 'appTheme',
};

export const APP_NAME = 'Nikhila Odisha Pandara Samaja';
export const APP_TAGLINE = 'COMMUNITY PORTAL';

// Google Drive URL transform — same logic as web cleanPhoto()
export const GOOGLE_DRIVE_PROXY = 'https://lh3.googleusercontent.com/d/';
