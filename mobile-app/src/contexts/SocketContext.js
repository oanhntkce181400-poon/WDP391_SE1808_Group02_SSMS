import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../stores/useAuthStore';

/**
 * SocketContext - Context để quản lý Socket.IO connection cho React Native
 * Cung cấp socket instance cho toàn bộ mobile app
 */
const SocketContext = createContext(null);

/**
 * Hook để sử dụng socket trong component
 * @returns {{ socket, isConnected, error }}
 * 
 * Ví dụ sử dụng trong component:
 * const { socket, isConnected } = useSocket();
 * 
 * useEffect(() => {
 *   if (!socket) return;
 *   
 *   socket.on('notification', (data) => {
 *     console.log('New notification:', data);
 *   });
 *   
 *   return () => socket.off('notification');
 * }, [socket]);
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

/**
 * SocketProvider - Provider component cho Socket.IO trong React Native
 * Wrap component này ở root App để toàn bộ app có thể dùng socket
 * 
 * Props:
 * @param {string} url - Socket server URL (mặc định từ env hoặc http://localhost:3000)
 * @param {ReactNode} children - Child components
 * 
 * Logic:
 * 1. Tự động kết nối socket khi app khởi động (nếu có accessToken)
 * 2. Gửi JWT token qua auth.token trong handshake
 * 3. Tự động reconnect khi mất kết nối
 * 4. Disconnect khi user logout (accessToken = null)
 * 5. Lấy accessToken từ Zustand store (useAuthStore)
 */
export const SocketProvider = ({ url, children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  
  // Lấy accessToken từ Zustand store
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    // Nếu không có token, không kết nối socket
    if (!accessToken) {
      // Disconnect socket nếu đang connect
      if (socketRef.current) {
        console.log('🔌 Disconnecting socket (no token)...');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Nếu socket đã tồn tại và đang connect, không tạo mới
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    // Socket server URL - đọc từ environment variable hoặc default
    // TODO: Thay đổi URL này thành URL production khi deploy
    const socketUrl = url || process.env.API_BASE_URL || 'http://localhost:3000';

    console.log('🔌 Connecting to socket server:', socketUrl);

    // Tạo socket connection với JWT token
    const newSocket = io(socketUrl, {
      auth: {
        token: accessToken, // Gửi JWT token qua handshake
      },
      transports: ['websocket', 'polling'], // Ưu tiên websocket, fallback polling
      reconnection: true, // Tự động reconnect
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Event: Kết nối thành công
    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
      setError(null);
    });

    // Event: Welcome message từ server
    newSocket.on('welcome', (data) => {
      console.log('👋 Welcome message:', data);
    });

    // Event: Mất kết nối
    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
    });

    // Event: Lỗi kết nối
    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
      setError(err.message);
      setIsConnected(false);
    });

    // Event: Reconnect attempt
    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnecting... (attempt ${attemptNumber})`);
    });

    // Event: Reconnect thành công
    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setError(null);
    });

    // Event: Reconnect thất bại
    newSocket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
      setError('Failed to reconnect');
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup: Disconnect khi component unmount
    return () => {
      if (socketRef.current) {
        console.log('🔌 Cleaning up socket connection...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [url, accessToken]); // Re-connect khi accessToken thay đổi

  const value = {
    socket,
    isConnected,
    error,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
