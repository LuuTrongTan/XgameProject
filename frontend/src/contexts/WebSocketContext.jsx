import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { io } from 'socket.io-client';
import { useAuth } from "./AuthContext";

// Tạo context
const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [joinedRooms, setJoinedRooms] = useState(new Set());
  const [forceReconnect, setForceReconnect] = useState(0);

  // Hàm để khởi tạo kết nối mới hoặc kết nối lại
  const connectSocket = useCallback(() => {
    // Kiểm tra chi tiết trạng thái xác thực
    console.log('[WebSocket Debug] isAuthenticated:', isAuthenticated);
    console.log('[WebSocket Debug] user:', user ? `${user.name} (${user._id})` : 'Không có thông tin user');
    console.log('[WebSocket Debug] token:', localStorage.getItem("token") ? 'Có token' : 'Không có token');

    // Sửa điều kiện kiểm tra - chỉ cần token là đủ, không cần kiểm tra user
    const token = localStorage.getItem("token");
    if (!token) {
      console.log('[WebSocket] Không thể kết nối khi chưa xác thực - không tìm thấy token');
      return null;
    }

    // Lấy URL từ biến môi trường hoặc mặc định
    const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') : 'http://localhost:5002';
    console.log('[WebSocket] Đang kết nối đến:', socketUrl);
    
    // Khởi tạo kết nối Socket.IO với server
    const socketInstance = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 60000,
      transports: ['websocket'], // Chỉ sử dụng WebSocket, không dùng polling
      pingTimeout: 15000,
      pingInterval: 10000,
      auth: {
        token: token
      }
    });

    // Xử lý sự kiện kết nối
    socketInstance.on('connect', () => {
      console.log('[WebSocket] Kết nối thành công:', socketInstance.id);
      setIsConnected(true);
      setLastError(null);
      setReconnectAttempt(0);
      
      // Tự động tham gia phòng cá nhân của người dùng - chỉ khi có thông tin user
      if (user?._id) {
        console.log(`[WebSocket] Tự động tham gia phòng cá nhân: ${user._id}`);
        socketInstance.emit('join', user._id);
        setJoinedRooms(prev => new Set(prev).add(user._id));
      }
      
      // Tự động tham gia lại các phòng đã tham gia trước đó
      joinedRooms.forEach(room => {
        if (room !== user._id) { // Tránh tham gia lại phòng người dùng
          console.log(`[WebSocket] Tự động tham gia lại phòng: ${room}`);
          socketInstance.emit(room.startsWith('project:') ? 'join_project' : 
                           room.startsWith('sprint:') ? 'join_sprint' : 
                           room.startsWith('task:') ? 'join_task' : 'join',
                           room.split(':')[1]);
        }
      });
    });

    // Xử lý sự kiện mất kết nối
    socketInstance.on('disconnect', (reason) => {
      console.log('[WebSocket] Mất kết nối, lý do:', reason);
      setIsConnected(false);
      
      // Nếu ngắt kết nối do lỗi xác thực, thử kết nối lại sau 5 giây
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        console.log('[WebSocket] Kết nối bị ngắt bởi server, có thể do xác thực thất bại. Thử kết nối lại sau 5 giây...');
        setTimeout(() => {
          setForceReconnect(prev => prev + 1);
        }, 5000);
      }
    });

    // Xử lý sự kiện lỗi kết nối
    socketInstance.on('connect_error', (error) => {
      console.error('[WebSocket] Lỗi kết nối:', error.message);
      setIsConnected(false);
      setLastError(error.message);
      
      // Phát hiện lỗi cấu hình server
      if (error.message.includes('JWT_SECRET is not defined')) {
        console.log('[WebSocket] Lỗi cấu hình server: JWT_SECRET không được định nghĩa');
        setLastError('Lỗi cấu hình server: JWT_SECRET không được định nghĩa');
        
        // Đối với lỗi server, thử lại với thời gian chờ lâu hơn
        setTimeout(() => {
          console.log('[WebSocket] Thử kết nối lại sau lỗi server...');
          setForceReconnect(prev => prev + 1);
        }, 30000); // Chờ 30 giây trước khi thử lại - cho phép admin thời gian khắc phục
        
        return; // Không thử các xử lý khác
      }
      
      // Nếu lỗi xác thực, thử kết nối lại với token mới sau 5 giây
      if (error.message.includes('Unauthorized') || error.message.includes('jwt')) {
        console.log('[WebSocket] Lỗi xác thực, thử kết nối lại sau 5 giây...');
        setTimeout(() => {
          setForceReconnect(prev => prev + 1);
        }, 5000);
      }
    });

    // Xử lý sự kiện kết nối lại
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('[WebSocket] Kết nối lại thành công sau', attemptNumber, 'lần thử');
      setIsConnected(true);
      setReconnectAttempt(0);
      setLastError(null);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('[WebSocket] Đang thử kết nối lại lần', attemptNumber);
      setReconnectAttempt(attemptNumber);
      
      // Cập nhật token mới nhất trước khi thử kết nối lại
      socketInstance.auth = { token: localStorage.getItem("token") };
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error('[WebSocket] Lỗi khi thử kết nối lại:', error.message);
      setLastError(error.message);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('[WebSocket] Đã thử kết nối lại nhưng thất bại');
      setLastError('Không thể kết nối lại sau nhiều lần thử');
      
      // Thử khởi tạo lại kết nối mới sau 10 giây
      setTimeout(() => {
        setForceReconnect(prev => prev + 1);
      }, 10000);
    });

    // Sự kiện ping-pong để giữ kết nối
    socketInstance.on('ping', () => {
      console.log('[WebSocket] Server ping');
    });

    socketInstance.on('pong', (latency) => {
      console.log('[WebSocket] Server pong, độ trễ:', latency, 'ms');
    });

    // Sự kiện chung
    socketInstance.on('task_updated', (data) => {
      console.log('[WebSocket] Task updated:', data);
    });
    
    socketInstance.on('project_updated', (data) => {
      console.log('[WebSocket] Project updated:', data);
    });
    
    socketInstance.on('sprint_updated', (data) => {
      console.log('[WebSocket] Sprint updated:', data);
    });
    
    socketInstance.on('new_notification', (data) => {
      console.log('[WebSocket] New notification:', data);
    });

    // Debugging: Ghi log tất cả sự kiện
    const onevent = socketInstance.onevent;
    socketInstance.onevent = function(packet) {
      const args = packet.data || [];
      console.log('[WebSocket] Nhận sự kiện:', args[0], args.slice(1));
      onevent.call(this, packet);
    };

    return socketInstance;
  }, [isAuthenticated, user?._id, joinedRooms]);

  // Thiết lập kết nối WebSocket khi component mount hoặc user thay đổi
  useEffect(() => {
    // Tránh khởi tạo lại kết nối nếu đã có kết nối hoạt động
    if (socket && isConnected) {
      console.log('[WebSocket] Kết nối đã tồn tại và đang hoạt động, giữ nguyên');
      return;
    }

    // Đóng kết nối cũ nếu có
    if (socket && !isConnected) {
      console.log('[WebSocket] Đóng kết nối cũ trước khi tạo kết nối mới');
      socket.disconnect();
    }

    // Tạo kết nối mới
    const newSocket = connectSocket();
    if (newSocket) {
      setSocket(newSocket);
    }

    // Cleanup khi component unmount - CHỈ đóng kết nối khi ứng dụng thực sự đóng
    return () => {
      // Kiểm tra nếu đây thực sự là unmount toàn bộ ứng dụng
      const isAppClosing = document.visibilityState === 'hidden' || !document.body;
      
      if (newSocket && isAppClosing) {
        console.log('[WebSocket] Dọn dẹp kết nối khi ứng dụng đóng');
        newSocket.disconnect();
      } else if (newSocket) {
        console.log('[WebSocket] Giữ kết nối khi component re-render');
        // Không ngắt kết nối khi chỉ là re-render
      }
    };
  }, [isAuthenticated, user?._id, forceReconnect, connectSocket, socket, isConnected]);

  // Theo dõi thay đổi token để kết nối lại khi cần
  useEffect(() => {
    // Lắng nghe sự kiện storage để phát hiện thay đổi token
    const handleStorageChange = (e) => {
      if (e.key === 'token' && e.newValue !== e.oldValue) {
        console.log('[WebSocket] Phát hiện thay đổi token, khởi tạo lại kết nối...');
        setForceReconnect(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Kiểm tra trường hợp đã đăng nhập mà chưa kết nối
    const token = localStorage.getItem("token");
    if (token && !socket && !isConnected) {
      console.log('[WebSocket] Có token nhưng chưa kết nối, thử kết nối lại...');
      // Sử dụng timeout để tránh vòng lặp vô hạn
      const timeoutId = setTimeout(() => {
        setForceReconnect(prev => prev + 1);
      }, 3000);
      
      return () => clearTimeout(timeoutId);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [socket, isConnected]);

  // Hàm tham gia phòng cá nhân (theo userId)
  const joinUserRoom = (userId) => {
    if (!socket || !userId) return;
    
    console.log(`[WebSocket] Tham gia phòng cá nhân: ${userId}`);
    socket.emit('join', userId);
    setJoinedRooms(prev => new Set(prev).add(userId));
  };

  // Hàm tham gia phòng project
  const joinProjectRoom = (projectId) => {
    if (!socket || !projectId) return;
    
    const roomId = `project:${projectId}`;
    console.log(`[WebSocket] Tham gia phòng dự án: ${projectId}`);
    socket.emit('join_project', projectId);
    setJoinedRooms(prev => new Set(prev).add(roomId));
  };

  // Hàm tham gia phòng sprint
  const joinSprintRoom = (sprintId) => {
    if (!socket || !sprintId) return;
    
    const roomId = `sprint:${sprintId}`;
    console.log(`[WebSocket] Tham gia phòng sprint: ${sprintId}`);
    socket.emit('join_sprint', sprintId);
    setJoinedRooms(prev => new Set(prev).add(roomId));
  };

  // Hàm tham gia phòng task
  const joinTaskRoom = (taskId) => {
    if (!socket || !taskId) return;
    
    const roomId = `task:${taskId}`;
    console.log(`[WebSocket] Tham gia phòng task: ${taskId}`);
    socket.emit('join_task', taskId);
    setJoinedRooms(prev => new Set(prev).add(roomId));
  };

  // Hàm rời khỏi phòng project
  const leaveProjectRoom = (projectId) => {
    if (!socket || !projectId) return;
    
    const roomId = `project:${projectId}`;
    console.log(`[WebSocket] Rời khỏi phòng dự án: ${projectId}`);
    socket.emit('leave_project', projectId);
    setJoinedRooms(prev => {
      const newRooms = new Set(prev);
      newRooms.delete(roomId);
      return newRooms;
    });
  };

  // Hàm rời khỏi phòng sprint
  const leaveSprintRoom = (sprintId) => {
    if (!socket || !sprintId) return;
    
    const roomId = `sprint:${sprintId}`;
    console.log(`[WebSocket] Rời khỏi phòng sprint: ${sprintId}`);
    socket.emit('leave_sprint', sprintId);
    setJoinedRooms(prev => {
      const newRooms = new Set(prev);
      newRooms.delete(roomId);
      return newRooms;
    });
  };

  // Hàm rời khỏi phòng task
  const leaveTaskRoom = (taskId) => {
    if (!socket || !taskId) return;
    
    const roomId = `task:${taskId}`;
    console.log(`[WebSocket] Rời khỏi phòng task: ${taskId}`);
    socket.emit('leave_task', taskId);
    setJoinedRooms(prev => {
      const newRooms = new Set(prev);
      newRooms.delete(roomId);
      return newRooms;
    });
  };

  // Hàm thử kết nối lại thủ công
  const reconnect = () => {
    console.log('[WebSocket] Kích hoạt kết nối lại thủ công');
    setForceReconnect(prev => prev + 1);
  };

  // Giá trị cung cấp bởi context
  const value = {
    socket,
    isConnected,
    reconnectAttempt,
    lastError,
    joinedRooms: Array.from(joinedRooms),
    joinUserRoom,
    joinProjectRoom,
    joinSprintRoom,
    joinTaskRoom,
    leaveProjectRoom,
    leaveSprintRoom,
    leaveTaskRoom,
    reconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 