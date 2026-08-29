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
  onUserOnline?: (data: { userId: string; mobile?: string }) => void;
  onUserOffline?: (data: { userId: string; mobile?: string }) => void;
  onReceiveMessage?: (message: any) => void;
  onMessageSent?: (message: any) => void;
  onMessageError?: (data: { error: string }) => void;
  onTypingStart?: (data: { senderId: string; senderMobile?: string }) => void;
  onTypingStop?: (data: { senderId: string; senderMobile?: string }) => void;
  onMessagesRead?: (data: { readerId: string; readerMobile?: string }) => void;
  onLiveStarted?: (stream: any) => void;
  onLiveEnded?: (data: { roomName: string }) => void;
  onLiveViewerCount?: (data: { roomName: string; count: number }) => void;
  onLiveComment?: (data: { id: string; senderId: string; senderName: string; text: string; at: string }) => void;
}

interface UseSocketOptions {
  // Which stored token to authenticate the socket with — member portal
  // (default) or admin/superadmin. Admin screens (e.g. Go Live) pass 'admin'.
  tokenType?: 'member' | 'admin';
}

export const useSocket = (handlers: SocketHandlers, options: UseSocketOptions = {}) => {
  const socketRef = useRef<Socket | null>(null);
  const tokenType = options.tokenType || 'member';

  // Callers (e.g. ChatScreen) pass a fresh handlers object with new inline
  // closures on every render — typing a single character used to redeclare
  // onTypingStart/onMessageSent/etc, which (before this ref) sat in the
  // effect's dependency array below and tore the whole socket down and
  // reconnected it on nearly every keystroke. A message sent right as that
  // reconnect churn was mid-flight could have its server ack land on a
  // socket instance the client had already discarded, so the sender's own
  // screen would never see their own just-sent message appear — even
  // though it was correctly saved server-side the whole time. Routing
  // dispatch through a ref means the connection is made once and handlers
  // simply always call whatever is current, no reconnect required.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let socket: Socket;

    const connectSocket = async () => {
      const token = await storage.getItem(tokenType === 'admin' ? STORAGE_KEYS.ADMIN_TOKEN : STORAGE_KEYS.PORTAL_TOKEN);
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
      socket.on('new_post', (p: any) => handlersRef.current.onNewPost?.(p));
      socket.on('like_updated', (d: any) => handlersRef.current.onLikeUpdated?.(d));
      socket.on('new_comment', (d: any) => handlersRef.current.onNewComment?.(d));
      socket.on('comment_like_updated', (d: any) => handlersRef.current.onCommentLikeUpdated?.(d));

      // Notification events
      socket.on('notification_count', (d: any) => handlersRef.current.onNotificationCount?.(d));

      // Presence events
      socket.on('user_online', (d: any) => handlersRef.current.onUserOnline?.(d));
      socket.on('user_offline', (d: any) => handlersRef.current.onUserOffline?.(d));

      // Chat events
      socket.on('receive_message', (m: any) => handlersRef.current.onReceiveMessage?.(m));
      socket.on('message_sent', (m: any) => handlersRef.current.onMessageSent?.(m));
      socket.on('message_error', (d: any) => handlersRef.current.onMessageError?.(d));
      socket.on('typing_start', (d: any) => handlersRef.current.onTypingStart?.(d));
      socket.on('typing_stop', (d: any) => handlersRef.current.onTypingStop?.(d));
      socket.on('messages_read', (d: any) => handlersRef.current.onMessagesRead?.(d));

      // Live streaming events
      socket.on('live_started', (s: any) => handlersRef.current.onLiveStarted?.(s));
      socket.on('live_ended', (d: any) => handlersRef.current.onLiveEnded?.(d));
      socket.on('live_viewer_count', (d: any) => handlersRef.current.onLiveViewerCount?.(d));
      socket.on('live_comment', (d: any) => handlersRef.current.onLiveComment?.(d));
    };

    connectSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [tokenType]);

  const emit = (event: string, data?: any) => {
    socketRef.current?.emit(event, data);
  };

  const joinChat = (userId: string) => {
    socketRef.current?.emit('join_chat', { userId });
  };

  const sendMessage = (receiverId: string, receiverMobile: string, content: string, type = 'text') => {
    socketRef.current?.emit('send_message', { receiverId, receiverMobile, content, type });
  };

  const typingStart = (receiverId: string, receiverMobile: string) => {
    socketRef.current?.emit('typing_start', { receiverId, receiverMobile });
  };

  const typingStop = (receiverId: string, receiverMobile: string) => {
    socketRef.current?.emit('typing_stop', { receiverId, receiverMobile });
  };

  const markRead = (senderId: string, senderMobile: string) => {
    socketRef.current?.emit('mark_read', { senderId, senderMobile });
  };

  const joinLive = (roomName: string) => {
    socketRef.current?.emit('join_live', { roomName });
  };

  const leaveLive = (roomName: string) => {
    socketRef.current?.emit('leave_live', { roomName });
  };

  const sendLiveComment = (roomName: string, text: string) => {
    socketRef.current?.emit('live_comment', { roomName, text });
  };

  return { emit, joinChat, sendMessage, typingStart, typingStop, markRead, joinLive, leaveLive, sendLiveComment, socket: socketRef.current };
};
