import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

/**
 * SocketContext - Context để quản lý Socket.IO connection
 * Cung cấp socket instance cho toàn bộ app
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
 * SocketProvider - Provider component cho Socket.IO
 * Wrap component này ở root App để toàn bộ app có thể dùng socket
 * 
 * Props:
 * @param {string} url - Socket server URL (mặc định: VITE_API_BASE_URL hoặc http://localhost:3000)
 * @param {function} getToken - Function trả về access token hiện tại
 * @param {ReactNode} children - Child components
 * 
 * Logic:
 * 1. Tự động kết nối socket khi app khởi động (nếu có token)
 * 2. Gửi JWT token qua auth.token trong handshake
 * 3. Tự động reconnect khi mất kết nối
 * 4. Disconnect khi user logout (token = null)
 */
export const SocketProvider = ({ url, getToken, children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Lấy token hiện tại
    const token = getToken ? getToken() : null;

    // Nếu không có token, không kết nối socket
    if (!token) {
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

    // Socket server URL
    const socketUrl = url || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

    console.log('🔌 Connecting to socket server:', socketUrl);

    // Tạo socket connection với JWT token
    const newSocket = io(socketUrl, {
      auth: {
        token, // Gửi JWT token qua handshake
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
  }, [url, getToken]);

  const value = {
    socket,
    isConnected,
    error,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
