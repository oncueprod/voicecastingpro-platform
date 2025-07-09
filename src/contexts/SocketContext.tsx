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
      // Get WebSocket URL from environment or fallback
      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 
                   (import.meta.env.PROD ? 
                     `wss://${window.location.host}` : 
                     'ws://localhost:3000');

      console.log('Connecting to WebSocket:', wsUrl);

      // Create socket connection with authentication
      const newSocket = io(wsUrl, {
        auth: {
          userId: user.id
        },
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Message event handlers
      newSocket.on('message', (message) => {
        console.log('Received message:', message);
        // Dispatch custom event for components to listen to
        window.dispatchEvent(new CustomEvent('newMessage', { 
          detail: message 
        }));
      });

      newSocket.on('message_sent', (message) => {
        console.log('Message sent confirmation:', message);
        window.dispatchEvent(new CustomEvent('messageSent', { 
          detail: message 
        }));
      });

      newSocket.on('message_error', (error) => {
        console.error('Message error:', error);
        window.dispatchEvent(new CustomEvent('messageError', { 
          detail: error 
        }));
      });

      newSocket.on('conversation_created', (conversation) => {
        console.log('Conversation created:', conversation);
        window.dispatchEvent(new CustomEvent('conversationCreated', { 
          detail: conversation 
        }));
      });

      newSocket.on('conversation_error', (error) => {
        console.error('Conversation error:', error);
        window.dispatchEvent(new CustomEvent('conversationError', { 
          detail: error 
        }));
      });

      setSocket(newSocket);

      // Cleanup on unmount
      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect socket if user logs out
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
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
      socket.emit('send_message', {
        ...message,
        senderId: user.id,
        type: message.type || 'text',
        metadata: message.metadata || {}
      });
    } else {
      console.error('Socket not connected or user not authenticated');
    }
  };

  const createConversation = (conversation: {
    participants: string[];
    projectId?: string;
    projectTitle?: string;
  }) => {
    if (socket && isConnected) {
      socket.emit('create_conversation', conversation);
    } else {
      console.error('Socket not connected');
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