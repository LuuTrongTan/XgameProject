import React, { createContext, useState, useContext, useEffect } from "react";
import { io } from 'socket.io-client';

// Tạo context
const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    // Lấy URL từ biến môi trường hoặc mặc định
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002';
    console.log('Connecting to socket server at:', socketUrl);
    
    // Khởi tạo kết nối Socket.IO với server
    const socketInstance = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['polling', 'websocket'],
    });

    // Xử lý sự kiện kết nối
    socketInstance.on('connect', () => {
      console.log('Socket connected successfully:', socketInstance.id);
      setIsConnected(true);
      setLastError(null);
    });

    // Xử lý sự kiện mất kết nối
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    // Xử lý sự kiện lỗi kết nối
    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
      setLastError(error.message);
    });

    // Xử lý sự kiện kết nối lại
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setReconnectAttempt(attemptNumber);
      setLastError(null);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnect attempt:', attemptNumber);
      setReconnectAttempt(attemptNumber);
    });

    // Lưu socket vào state
    setSocket(socketInstance);

    // Cleanup khi component unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Giá trị cung cấp bởi context
  const value = {
    socket,
    isConnected,
    reconnectAttempt,
    lastError
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 