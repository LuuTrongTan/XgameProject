import React, { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Connect to the WebSocket server when the user is authenticated
  useEffect(() => {
    let socketInstance = null;

    const connectSocket = () => {
      // Only connect if the user is authenticated
      if (isAuthenticated && user?._id) {
        // Create socket connection
        socketInstance = io("/", {
          transports: ["websocket"],
          auth: {
            token: localStorage.getItem("token")
          }
        });

        // Set up event listeners
        socketInstance.on("connect", () => {
          console.log("Socket connected");
          setIsConnected(true);
        });

        socketInstance.on("disconnect", () => {
          console.log("Socket disconnected");
          setIsConnected(false);
        });

        socketInstance.on("connect_error", (error) => {
          console.error("Socket connection error:", error);
          setIsConnected(false);
        });

        // Set the socket instance in state
        setSocket(socketInstance);
      }
    };

    connectSocket();

    // Cleanup function
    return () => {
      if (socketInstance) {
        console.log("Cleaning up socket connection");
        socketInstance.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [isAuthenticated, user?._id]);

  // Value to be provided by the context
  const value = {
    socket,
    isConnected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 