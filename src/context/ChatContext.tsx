// src/context/ChatContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as chatApi from '../api/chat';
import { useAuth } from './AuthContext';

interface ChatContextType {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  refreshUnreadCount: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// The Chat tab is lazy-mounted (React Navigation only renders it on first
// visit), so the tab badge needs its own source of truth independent of
// ChatScreen — fetched on login and on app foreground. Once ChatScreen is
// open it takes over pushing live updates here (see ChatScreen's threads
// effect), since it already tracks per-contact unread counts in real time.
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await chatApi.fetchUnreadCount();
      if (data.success) setUnreadCount(data.count);
    } catch {
      // Silent — badge just keeps its last known value until the next refresh
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) refreshUnreadCount();
    else setUnreadCount(0);
  }, [isAuthenticated, refreshUnreadCount]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        refreshUnreadCount();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [refreshUnreadCount]);

  return (
    <ChatContext.Provider value={{ unreadCount, setUnreadCount, refreshUnreadCount }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};
