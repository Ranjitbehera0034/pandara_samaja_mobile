// src/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { storage } from '../utils/secureStorage';
import { STORAGE_KEYS } from '../config/constants';

// Replace with your mobile backend URL
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:6000';

interface SocketHandlers {
  onNewPost?: (post: any) => void;
  onLikeUpdated?: (data: { postId: string; likes: number }) => void;
  onNewComment?: (data: { postId: string; comment: any }) => void;
  onCommentLikeUpdated?: (data: { commentId: string; likes: number }) => void;
  onNotificationCount?: (data: { count: number }) => void;
  onUserOnline?: (data: { userId: string }) => void;
  onUserOffline?: (data: { userId: string }) => void;
  onReceiveMessage?: (message: any) => void;
  onMessageSent?: (message: any) => void;
  onMessageError?: (data: { error: string }) => void;
  onTypingStart?: (data: { senderId: string }) => void;
  onTypingStop?: (data: { senderId: string }) => void;
  onMessagesRead?: (data: { readerId: string }) => void;
}

export const useSocket = (handlers: SocketHandlers) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let socket: Socket;

    const connectSocket = async () => {
      const token = await storage.getItem(STORAGE_KEYS.PORTAL_TOKEN);
      if (!token) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('[SOCKET] Connected:', socket.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('[SOCKET] Disconnected:', reason);
      });

      socket.on('connect_error', (err) => {
        console.error('[SOCKET] Connection error:', err.message);
      });

      // Feed events
      if (handlers.onNewPost) socket.on('new_post', handlers.onNewPost);
      if (handlers.onLikeUpdated) socket.on('like_updated', handlers.onLikeUpdated);
      if (handlers.onNewComment) socket.on('new_comment', handlers.onNewComment);
      if (handlers.onCommentLikeUpdated) socket.on('comment_like_updated', handlers.onCommentLikeUpdated);

      // Notification events
      if (handlers.onNotificationCount) socket.on('notification_count', handlers.onNotificationCount);

      // Presence events
      if (handlers.onUserOnline) socket.on('user_online', handlers.onUserOnline);
      if (handlers.onUserOffline) socket.on('user_offline', handlers.onUserOffline);

      // Chat events
      if (handlers.onReceiveMessage) socket.on('receive_message', handlers.onReceiveMessage);
      if (handlers.onMessageSent) socket.on('message_sent', handlers.onMessageSent);
      if (handlers.onMessageError) socket.on('message_error', handlers.onMessageError);
      if (handlers.onTypingStart) socket.on('typing_start', handlers.onTypingStart);
      if (handlers.onTypingStop) socket.on('typing_stop', handlers.onTypingStop);
      if (handlers.onMessagesRead) socket.on('messages_read', handlers.onMessagesRead);
    };

    connectSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [handlers.onNewPost, handlers.onLikeUpdated, handlers.onNewComment, handlers.onCommentLikeUpdated, handlers.onNotificationCount, handlers.onUserOnline, handlers.onUserOffline, handlers.onReceiveMessage, handlers.onMessageSent, handlers.onMessageError, handlers.onTypingStart, handlers.onTypingStop, handlers.onMessagesRead]);

  const emit = (event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  };

  const joinChat = (userId: string) => {
    socketRef.current?.emit('join_chat', { userId });
  };

  const sendMessage = (receiverId: string, content: string, type = 'text') => {
    socketRef.current?.emit('send_message', { receiverId, content, type });
  };

  const typingStart = (receiverId: string) => {
    socketRef.current?.emit('typing_start', { receiverId });
  };

  const typingStop = (receiverId: string) => {
    socketRef.current?.emit('typing_stop', { receiverId });
  };

  const markRead = (senderId: string) => {
    socketRef.current?.emit('mark_read', { senderId });
  };

  return { emit, joinChat, sendMessage, typingStart, typingStop, markRead, socket: socketRef.current };
};
