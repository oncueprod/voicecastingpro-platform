// services/messagingService.ts - MINIMAL FIX for "connect is not a function" error
// This fixes the frontend only - don't change your backend!

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  originalContent?: string;
  timestamp: Date;
  type: 'text' | 'file' | 'image' | 'audio';
  metadata?: {
    fileId?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileUrl?: string;
  };
  read: boolean;
  filtered?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  projectId?: string;
  projectTitle?: string;
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
}

interface MessageEventHandlers {
  message: (message: Message) => void;
  conversation_created: (conversation: Conversation) => void;
  message_read: (messageId: string) => void;
  user_typing: (data: { userId: string; conversationId: string }) => void;
}

class MessagingService {
  private socket: any = null; // Use any to avoid Socket.IO import issues
  private eventHandlers: Partial<MessageEventHandlers> = {};
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private currentUserId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.loadFromLocalStorage();
  }

  // Get backend URL - use your existing backend
  private getBackendUrl(): string {
    if (typeof window !== 'undefined') {
      // Use the same domain as your frontend - your backend is working on the same URL
      return window.location.origin;
    }
    return 'http://localhost:3001';
  }

  // Connect method - this fixes the "connect is not a function" error
  async connect(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    try {
      console.log('🔌 Connecting messaging service for user:', userId);
      
      // Try to load Socket.IO dynamically to avoid import issues
      if (typeof window !== 'undefined' && (window as any).io) {
        const io = (window as any).io;
        const socketUrl = this.getBackendUrl();
        
        this.socket = io(socketUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          query: { userId }
        });

        this.setupSocketListeners();
        
        // Wait for connection
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
          
          this.socket.on('connect', () => {
            clearTimeout(timeout);
            console.log('✅ Connected to messaging service');
            this.reconnectAttempts = 0;
            resolve();
          });

          this.socket.on('connect_error', (error: any) => {
            clearTimeout(timeout);
            console.error('❌ Connection error:', error);
            reject(error);
          });
        });
      } else {
        console.warn('⚠️ Socket.IO not available, working in fallback mode');
        // Continue without WebSocket - use REST API only
      }

    } catch (error) {
      console.error('❌ Failed to connect messaging service:', error);
      console.log('📱 Working in offline mode with local storage');
      // Don't throw error - allow app to work without real-time features
    }
  }

  // Disconnect method
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentUserId = null;
    console.log('📴 Disconnected from messaging service');
  }

  // Setup socket listeners
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
      window.dispatchEvent(new CustomEvent('socket_connected'));
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 Socket disconnected:', reason);
      window.dispatchEvent(new CustomEvent('socket_disconnected', { detail: reason }));
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ Socket connection error:', error);
      window.dispatchEvent(new CustomEvent('socket_error', { detail: error }));
    });

    // Message events
    this.socket.on('new_message', (data: any) => {
      console.log('📨 Received new message:', data);
      const message = this.parseMessage(data);
      this.addMessage(message);
      this.emit('message', message);
    });

    this.socket.on('conversation_created', (data: any) => {
      console.log('💬 New conversation created:', data);
      const conversation = this.parseConversation(data);
      this.addConversation(conversation);
      this.emit('conversation_created', conversation);
    });

    this.socket.on('message_read', (data: any) => {
      console.log('👁️ Message read:', data);
      this.markMessageAsRead(data.messageId);
      this.emit('message_read', data.messageId);
    });
  }

  // Send message - works with your existing backend
  async sendMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    content: string,
    type: 'text' | 'file' | 'image' | 'audio' = 'text'
  ): Promise<Message> {
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId,
      receiverId,
      content,
      timestamp: new Date(),
      type,
      read: false
    };

    try {
      // Try WebSocket first if available
      if (this.socket && this.socket.connected) {
        await new Promise<void>((resolve, reject) => {
          this.socket.emit('send_message', {
            conversationId, senderId, receiverId, content, type
          }, (response: any) => {
            if (response?.success) {
              resolve();
            } else {
              reject(new Error(response?.error || 'Failed to send message'));
            }
          });

          setTimeout(() => reject(new Error('Message send timeout')), 5000);
        });
      } else {
        // Fallback to your existing API
        await this.sendMessageViaAPI(message);
      }

      this.addMessage(message);
      this.updateConversationLastMessage(conversationId, message);
      
      console.log('✅ Message sent successfully');
      return message;

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Try API fallback
      try {
        await this.sendMessageViaAPI(message);
        this.addMessage(message);
        this.updateConversationLastMessage(conversationId, message);
        return message;
      } catch (apiError) {
        console.error('❌ API fallback failed:', apiError);
        throw new Error('Failed to send message');
      }
    }
  }

  // Send via your existing API
  private async sendMessageViaAPI(message: Message): Promise<void> {
    const baseUrl = this.getBackendUrl();
    const authToken = this.getAuthToken();
    
    // Try your existing API endpoints
    const endpoints = [
      '/api/messages',
      '/api/contact/talent',
      '/contact/talent' // Your existing endpoint
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'user-id': this.currentUserId || ''
          },
          body: JSON.stringify({
            conversationId: message.conversationId,
            senderId: message.senderId,
            receiverId: message.receiverId,
            content: message.content,
            type: message.type,
            metadata: message.metadata,
            timestamp: message.timestamp.toISOString()
          })
        });

        if (response.ok) {
          console.log(`✅ Message sent via ${endpoint}`);
          return;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to send via ${endpoint}:`, error);
      }
    }
    
    throw new Error('All API endpoints failed');
  }

  // File upload - adapt to your existing system
  async sendFileMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    file: File
  ): Promise<Message> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', this.currentUserId || '');

      const baseUrl = this.getBackendUrl();
      const authToken = this.getAuthToken();

      // Try your existing upload endpoint
      const response = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'user-id': this.currentUserId || ''
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const fileData = await response.json();
      
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        senderId,
        receiverId,
        content: `📎 Shared file: ${file.name}`,
        timestamp: new Date(),
        type: 'file',
        metadata: {
          fileId: fileData.fileId || fileData.id,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileUrl: fileData.url || fileData.fileUrl
        },
        read: false
      };

      // Send the file message
      await this.sendMessage(conversationId, senderId, receiverId, message.content, 'file');
      
      return message;

    } catch (error) {
      console.error('❌ Failed to send file message:', error);
      throw error;
    }
  }

  // Get conversations - works with your existing storage
  getConversations(userId?: string): Conversation[] {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) return [];

    return Array.from(this.conversations.values())
      .filter(conv => conv.participants.includes(targetUserId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  // Get messages for conversation
  getMessages(conversationId: string): Message[] {
    return this.messages.get(conversationId) || [];
  }

  // Mark message as read
  markAsRead(messageId: string): void {
    for (const messages of this.messages.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        message.read = true;
        this.saveToLocalStorage();
        
        if (this.socket && this.socket.connected) {
          this.socket.emit('mark_read', { messageId });
        }
        break;
      }
    }
  }

  // Get unread count
  getUnreadCount(userId?: string): number {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) return 0;

    let count = 0;
    for (const messages of this.messages.values()) {
      count += messages.filter(m => m.receiverId === targetUserId && !m.read).length;
    }
    return count;
  }

  // Event handling
  on<K extends keyof MessageEventHandlers>(event: K, handler: MessageEventHandlers[K]): void {
    this.eventHandlers[event] = handler;
  }

  off<K extends keyof MessageEventHandlers>(event: K, handler?: MessageEventHandlers[K]): void {
    delete this.eventHandlers[event];
  }

  private emit<K extends keyof MessageEventHandlers>(event: K, ...args: Parameters<MessageEventHandlers[K]>): void {
    const handler = this.eventHandlers[event];
    if (handler) {
      (handler as any)(...args);
    }
  }

  // Helper methods for local storage
  private addMessage(message: Message): void {
    const conversationMessages = this.messages.get(message.conversationId) || [];
    
    if (!conversationMessages.find(m => m.id === message.id)) {
      conversationMessages.push(message);
      conversationMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      this.messages.set(message.conversationId, conversationMessages);
      this.saveToLocalStorage();
    }
  }

  private addConversation(conversation: Conversation): void {
    this.conversations.set(conversation.id, conversation);
    this.saveToLocalStorage();
  }

  private updateConversationLastMessage(conversationId: string, message: Message): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.lastMessage = message;
      conversation.updatedAt = new Date();
      this.conversations.set(conversationId, conversation);
      this.saveToLocalStorage();
    }
  }

  private markMessageAsRead(messageId: string): void {
    for (const messages of this.messages.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        message.read = true;
        this.saveToLocalStorage();
        break;
      }
    }
  }

  private parseMessage(data: any): Message {
    return {
      id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: data.conversationId || data.conversation_id,
      senderId: data.senderId || data.sender_id,
      receiverId: data.receiverId || data.receiver_id,
      content: data.content,
      originalContent: data.originalContent,
      timestamp: new Date(data.timestamp || data.created_at || Date.now()),
      type: data.type || 'text',
      metadata: data.metadata,
      read: data.read || false,
      filtered: data.filtered || false
    };
  }

  private parseConversation(data: any): Conversation {
    return {
      id: data.id,
      participants: data.participants,
      projectId: data.projectId || data.project_id,
      projectTitle: data.projectTitle || data.project_title,
      lastMessage: data.lastMessage ? this.parseMessage(data.lastMessage) : undefined,
      createdAt: new Date(data.createdAt || data.created_at || Date.now()),
      updatedAt: new Date(data.updatedAt || data.updated_at || Date.now())
    };
  }

  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('token') || '';
  }

  // Local storage methods
  private saveToLocalStorage(): void {
    try {
      const data = {
        conversations: Array.from(this.conversations.entries()),
        messages: Array.from(this.messages.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem('messaging_data', JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to save to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const data = localStorage.getItem('messaging_data');
      if (data) {
        const parsed = JSON.parse(data);
        
        if (parsed.conversations) {
          this.conversations = new Map(parsed.conversations);
        }
        
        if (parsed.messages) {
          this.messages = new Map(parsed.messages);
        }
        
        console.log('📂 Loaded messaging data from localStorage');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from localStorage:', error);
    }
  }

  // Clear all data
  clearData(): void {
    this.conversations.clear();
    this.messages.clear();
    localStorage.removeItem('messaging_data');
    console.log('🗑️ Messaging data cleared');
  }
}

// Create singleton instance
export const messagingService = new MessagingService();
export default messagingService;