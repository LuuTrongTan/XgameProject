import { useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

/**
 * Hook để đăng ký các handler cho sự kiện WebSocket
 * @param {Object} eventHandlers - Object chứa các hàm handler cho từng sự kiện
 * @param {Array} dependencies - Mảng dependencies để useEffect biết khi nào cần chạy lại
 */
const useWebSocketEvents = (eventHandlers = {}, dependencies = []) => {
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Đăng ký các event handlers
    const handlers = {};

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      if (typeof handler === 'function') {
        // Lưu trữ handler để có thể gỡ bỏ sau này
        handlers[event] = handler;
        
        // Đăng ký handler với socket
        socket.on(event, handler);
        console.log(`[WebSocket] Registered handler for event: ${event}`);
      }
    });

    // Cleanup khi component unmount hoặc dependencies thay đổi
    return () => {
      // Gỡ bỏ tất cả các handlers
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
        console.log(`[WebSocket] Removed handler for event: ${event}`);
      });
    };
  }, [socket, isConnected, ...dependencies]);
};

export default useWebSocketEvents; 