// src/config/constants.ts
import Constants from 'expo-constants';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:6000/api';
export const PORTAL_API_URL = `${API_URL}/portal`;

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
