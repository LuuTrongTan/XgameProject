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
  const [joinedRooms, setJoinedRooms] = useState(new Set());

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
      
      // Tự động tham gia lại các phòng đã tham gia trước đó
      joinedRooms.forEach(room => {
        console.log(`Rejoining room: ${room}`);
        socketInstance.emit(room.startsWith('project:') ? 'join_project' : 
                          room.startsWith('sprint:') ? 'join_sprint' : 
                          room.startsWith('task:') ? 'join_task' : 'join',
                          room.split(':')[1]);
      });
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

  // Hàm tham gia phòng cá nhân (theo userId)
  const joinUserRoom = (userId) => {
    if (!socket || !userId) return;
    
    console.log(`Joining user room: ${userId}`);
    socket.emit('join', userId);
    setJoinedRooms(prev => new Set(prev).add(userId));
  };

  // Hàm tham gia phòng project
  const joinProjectRoom = (projectId) => {
    if (!socket || !projectId) return;
    
    const roomId = `project:${projectId}`;
    console.log(`Joining project room: ${projectId}`);
    socket.emit('join_project', projectId);
    setJoinedRooms(prev => new Set(prev).add(roomId));
  };

  // Hàm tham gia phòng sprint
  const joinSprintRoom = (sprintId) => {
    if (!socket || !sprintId) return;
    
    const roomId = `sprint:${sprintId}`;
    console.log(`Joining sprint room: ${sprintId}`);
    socket.emit('join_sprint', sprintId);
    setJoinedRooms(prev => new Set(prev).add(roomId));
  };

  // Hàm tham gia phòng task
  const joinTaskRoom = (taskId) => {
    if (!socket || !taskId) return;
    
    const roomId = `task:${taskId}`;
    console.log(`Joining task room: ${taskId}`);
    socket.emit('join_task', taskId);
    setJoinedRooms(prev => new Set(prev).add(roomId));
  };

  // Hàm rời khỏi phòng project
  const leaveProjectRoom = (projectId) => {
    if (!socket || !projectId) return;
    
    const roomId = `project:${projectId}`;
    console.log(`Leaving project room: ${projectId}`);
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
    console.log(`Leaving sprint room: ${sprintId}`);
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
    console.log(`Leaving task room: ${taskId}`);
    socket.emit('leave_task', taskId);
    setJoinedRooms(prev => {
      const newRooms = new Set(prev);
      newRooms.delete(roomId);
      return newRooms;
    });
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
    leaveTaskRoom
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext; 