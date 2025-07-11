// services/messagingService.ts
import { io, Socket } from 'socket.io-client';

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
  private socket: Socket | null = null;
  private eventHandlers: Partial<MessageEventHandlers> = {};
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private currentUserId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private baseUrl: string;

  constructor() {
    this.baseUrl = this.getBaseUrl();
    this.loadFromLocalStorage();
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const host = window.location.hostname;
      
      // For development
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:3001';
      }
      
      // For production - replace with your actual backend URL
      return 'https://voicecastingpro-backend.onrender.com';
    }
    
    return 'http://localhost:3001';
  }

  private getSocketUrl(): string {
    return this.baseUrl.replace('http', 'ws').replace('https', 'wss');
  }

  // Connect to WebSocket server
  async connect(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    try {
      // Disconnect existing connection
      if (this.socket) {
        this.socket.disconnect();
      }

      const socketUrl = this.getSocketUrl();
      console.log('🔌 Connecting to messaging service:', socketUrl);

      // Create new socket connection
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        query: {
          userId: userId
        },
        autoConnect: true
      });

      // Set up event listeners
      this.setupSocketListeners();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('✅ Connected to messaging service');
          this.reconnectAttempts = 0;
          
          // Join user room
          if (this.socket) {
            this.socket.emit('join_user', userId);
          }
          
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('❌ Connection error:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Failed to connect to messaging service:', error);
      // Don't throw error, allow app to work with local data
      console.log('📱 Working in offline mode');
    }
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentUserId = null;
    console.log('📴 Disconnected from messaging service');
  }

  // Set up socket event listeners
  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
      window.dispatchEvent(new CustomEvent('socket_connected'));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      window.dispatchEvent(new CustomEvent('socket_disconnected', { detail: reason }));
      
      if (reason === 'io server disconnect') {
        return;
      }
      
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      window.dispatchEvent(new CustomEvent('socket_error', { detail: error }));
      this.handleReconnect();
    });

    // Message events
    this.socket.on('new_message', (data) => {
      console.log('📨 Received new message:', data);
      const message = this.parseMessage(data);
      this.addMessage(message);
      this.emit('message', message);
    });

    this.socket.on('conversation_created', (data) => {
      console.log('💬 New conversation created:', data);
      const conversation = this.parseConversation(data);
      this.addConversation(conversation);
      this.emit('conversation_created', conversation);
    });

    this.socket.on('message_read', (data) => {
      console.log('👁️ Message read:', data);
      this.markMessageAsRead(data.messageId);
      this.emit('message_read', data.messageId);
    });

    this.socket.on('user_typing', (data) => {
      console.log('⌨️ User typing:', data);
      this.emit('user_typing', data);
    });
  }

  // Handle reconnection
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.currentUserId) {
        this.connect(this.currentUserId).catch(console.error);
      }
    }, delay);
  }

  // Send a text message
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
      // Try WebSocket first if connected
      if (this.socket && this.socket.connected) {
        await new Promise<void>((resolve, reject) => {
          if (!this.socket) {
            reject(new Error('Socket not available'));
            return;
          }

          this.socket.emit('send_message', {
            conversationId,
            senderId,
            receiverId,
            content,
            type
          }, (response: any) => {
            if (response?.success) {
              resolve();
            } else {
              reject(new Error(response?.error || 'Failed to send message'));
            }
          });

          // Timeout after 5 seconds
          setTimeout(() => {
            reject(new Error('Message send timeout'));
          }, 5000);
        });
      } else {
        // Fallback to REST API
        await this.sendMessageViaAPI(message);
      }

      // Add to local storage
      this.addMessage(message);
      this.updateConversationLastMessage(conversationId, message);

      console.log('✅ Message sent successfully');
      return message;

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Try API fallback if WebSocket failed
      try {
        await this.sendMessageViaAPI(message);
        this.addMessage(message);
        this.updateConversationLastMessage(conversationId, message);
        return message;
      } catch (apiError) {
        console.error('❌ Failed to send message via API:', apiError);
        throw new Error('Failed to send message');
      }
    }
  }

  // Send message via REST API (fallback)
  private async sendMessageViaAPI(message: Message): Promise<void> {
    const authToken = this.getAuthToken();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/messages`, {
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
          metadata: message.metadata
        })
      });

      if (!response.ok) {
        // Try alternative endpoint
        const altResponse = await fetch(`${this.baseUrl}/api/contact/talent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

        if (!altResponse.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  // Send file message
  async sendFileMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    file: File
  ): Promise<Message> {
    try {
      // Upload file first
      const fileData = await this.uploadFile(file);

      // Create message with file metadata
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        senderId,
        receiverId,
        content: `📎 Shared file: ${file.name}`,
        timestamp: new Date(),
        type: 'file',
        metadata: {
          fileId: fileData.fileId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileUrl: fileData.url
        },
        read: false
      };

      // Send message
      if (this.socket && this.socket.connected) {
        this.socket.emit('send_message', {
          conversationId,
          senderId,
          receiverId,
          content: message.content,
          type: 'file',
          metadata: message.metadata
        });
      } else {
        await this.sendMessageViaAPI(message);
      }

      // Add to local storage
      this.addMessage(message);
      this.updateConversationLastMessage(conversationId, message);

      console.log('✅ File message sent successfully');
      return message;

    } catch (error) {
      console.error('❌ Failed to send file message:', error);
      throw error;
    }
  }

  // Upload file
  private async uploadFile(file: File): Promise<{ fileId: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', this.currentUserId || '');

    const authToken = this.getAuthToken();

    const response = await fetch(`${this.baseUrl}/api/upload`, {
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

    const data = await response.json();
    return {
      fileId: data.fileId || data.id,
      url: data.url || data.fileUrl
    };
  }

  // Create or get conversation
  async createConversation(
    participants: string[],
    projectId?: string,
    projectTitle?: string
  ): Promise<Conversation> {
    // Check if conversation already exists
    const existing = Array.from(this.conversations.values()).find(conv => {
      return conv.participants.length === participants.length &&
             conv.participants.every(p => participants.includes(p));
    });

    if (existing) {
      return existing;
    }

    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participants,
      projectId,
      projectTitle,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // Create via WebSocket
      if (this.socket && this.socket.connected) {
        this.socket.emit('create_conversation', {
          participants,
          projectId,
          projectTitle
        });
      } else {
        // Create via API
        await this.createConversationViaAPI(conversation);
      }

      // Add to local storage
      this.addConversation(conversation);

      console.log('✅ Conversation created successfully');
      return conversation;

    } catch (error) {
      console.error('❌ Failed to create conversation:', error);
      
      // Add to local storage anyway
      this.addConversation(conversation);
      return conversation;
    }
  }

  // Create conversation via REST API
  private async createConversationViaAPI(conversation: Conversation): Promise<void> {
    const authToken = this.getAuthToken();

    const response = await fetch(`${this.baseUrl}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'user-id': this.currentUserId || ''
      },
      body: JSON.stringify({
        participants: conversation.participants,
        projectId: conversation.projectId,
        projectTitle: conversation.projectTitle
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
  }

  // Get conversations for user
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
        
        // Notify server
        if (this.socket && this.socket.connected) {
          this.socket.emit('mark_read', { messageId });
        }
        break;
      }
    }
  }

  // Get unread count for user
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

  // Helper methods
  private addMessage(message: Message): void {
    const conversationMessages = this.messages.get(message.conversationId) || [];
    
    // Avoid duplicates
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
        
        // Load conversations
        if (parsed.conversations) {
          this.conversations = new Map(parsed.conversations);
        }
        
        // Load messages
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