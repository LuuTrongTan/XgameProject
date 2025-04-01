import { io } from 'socket.io-client';

// Khởi tạo socket với cách xử lý lỗi phù hợp
let socket;

try {
  // Lấy URL từ biến môi trường hoặc mặc định
  // Backend đang chạy trên cổng 5002
  const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5002';
  console.log('Connecting to socket server at:', socketUrl);
  
  // Khởi tạo kết nối Socket.IO với server
  // Không sử dụng namespace, kết nối trực tiếp
  socket = io(socketUrl, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    // Không dùng withCredentials nếu không cần thiết
    transports: ['polling', 'websocket'], // Polling trước, websocket sau
  });

  // Xử lý sự kiện kết nối
  socket.on('connect', () => {
    console.log('Socket connected successfully:', socket.id);
  });

  // Xử lý sự kiện mất kết nối
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  // Xử lý sự kiện lỗi kết nối
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  // Xử lý sự kiện kết nối lại
  socket.on('reconnect', (attemptNumber) => {
    console.log('Socket reconnected after', attemptNumber, 'attempts');
  });
} catch (error) {
  console.error('Error initializing socket:', error);
  // Tạo một socket mock để tránh lỗi khi gọi các phương thức
  socket = {
    on: () => {},
    off: () => {},
    emit: () => {},
    id: null,
    connected: false
  };
}

// Chỉ sử dụng một cách export để tránh nhầm lẫn
export { socket };
export default socket; 