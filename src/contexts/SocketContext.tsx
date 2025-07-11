import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (message: {
    conversationId: string;
    receiverId: string;
    content: string;
    type?: string;
    metadata?: any;
  }) => void;
  createConversation: (conversation: {
    participants: string[];
    projectId?: string;
    projectTitle?: string;
  }) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // FIXED: Get Socket.io URL (HTTP/HTTPS, not WebSocket URLs)
      const socketUrl = import.meta.env.VITE_API_URL || 
                       (import.meta.env.PROD ? 
                         `https://${window.location.host}` : 
                         'http://localhost:3000');

      console.log('🔌 Connecting to Socket.io server:', socketUrl);
      console.log('👤 Authenticating user:', user.id);

      // Create socket connection with authentication
      const newSocket = io(socketUrl, {
        auth: {
          userId: user.id
        },
        transports: ['websocket', 'polling'], // Socket.io will auto-upgrade
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        console.log('👤 User room joined: user:' + user.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        setIsConnected(false);
      });

      // Message event handlers
      newSocket.on('message', (message) => {
        console.log('📥 Received message:', message);
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('newMessage', { 
          detail: message 
        }));
      });

      newSocket.on('message_sent', (message) => {
        console.log('✅ Message sent confirmation:', message);
        window.dispatchEvent(new CustomEvent('messageSent', { 
          detail: message 
        }));
      });

      newSocket.on('message_error', (error) => {
        console.error('❌ Message error:', error);
        window.dispatchEvent(new CustomEvent('messageError', { 
          detail: error 
        }));
      });

      newSocket.on('conversation_created', (conversation) => {
        console.log('💬 Conversation created:', conversation);
        window.dispatchEvent(new CustomEvent('conversationCreated', { 
          detail: conversation 
        }));
      });

      newSocket.on('conversation_error', (error) => {
        console.error('❌ Conversation error:', error);
        window.dispatchEvent(new CustomEvent('conversationError', { 
          detail: error 
        }));
      });

      // ADDED: Store socket globally for debugging
      window.socket = newSocket;
      
      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        console.log('🔌 Cleaning up socket connection');
        newSocket.close();
        window.socket = null;
      };
    } else {
      // Disconnect socket if user logs out
      if (socket) {
        console.log('👤 User logged out, disconnecting socket');
        socket.close();
        setSocket(null);
        setIsConnected(false);
        window.socket = null;
      }
    }
  }, [isAuthenticated, user]);

  const sendMessage = (message: {
    conversationId: string;
    receiverId: string;
    content: string;
    type?: string;
    metadata?: any;
  }) => {
    if (socket && isConnected && user) {
      console.log('📤 Sending message:', message);
      socket.emit('send_message', {
        ...message,
        senderId: user.id,
        type: message.type || 'text',
        metadata: message.metadata || {}
      });
    } else {
      console.error('❌ Cannot send message:', {
        hasSocket: !!socket,
        isConnected,
        hasUser: !!user
      });
    }
  };

  const createConversation = (conversation: {
    participants: string[];
    projectId?: string;
    projectTitle?: string;
  }) => {
    if (socket && isConnected) {
      console.log('💬 Creating conversation:', conversation);
      socket.emit('create_conversation', conversation);
    } else {
      console.error('❌ Cannot create conversation - socket not connected');
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    sendMessage,
    createConversation
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};