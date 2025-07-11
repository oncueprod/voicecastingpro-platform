// messagingService.ts - ENHANCED WITH FILE UPLOAD SUPPORT
import { Socket, io } from 'socket.io-client';

export interface User {
  id: string;
  name: string;
  type: 'client' | 'talent' | 'admin';
  email?: string;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: string;
  senderName?: string;
  subject?: string;
  read?: boolean;
  conversationId?: string;
  attachments?: FileAttachment[];
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames?: string[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  projectTitle?: string;
  messageCount?: number;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  data?: string;
}

class MessagingService {
  private socket: Socket | null = null;
  private conversations: Conversation[] = [];
  private messages: Map<string, Message> = new Map();
  private currentUser: User | null = null;
  private listeners: Map<string, Function[]> = new Map();
  private isConnected: boolean = false;
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;

  constructor() {
    console.log('🔧 Enhanced MessagingService initialized');
    this.currentUser = this.getCurrentUser();
    this.initializeWebSocket();
  }

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const userData = localStorage.getItem('currentUser') || 
                      localStorage.getItem('user') ||
                      sessionStorage.getItem('currentUser');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('📱 Current user loaded:', user.id);
        return user;
      }

      // Try to extract from JWT
      const token = this.getStoredToken();
      if (token && !token.startsWith('session_')) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.id) {
            return {
              id: payload.id,
              name: payload.name || 'JWT User',
              type: payload.type || 'client'
            };
          }
        } catch (jwtError) {
          console.log('⚠️ Could not parse JWT:', jwtError);
        }
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
    }
    return null;
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    return localStorage.getItem('authToken') || 
           localStorage.getItem('token') || 
           localStorage.getItem('accessToken') ||
           sessionStorage.getItem('authToken') ||
           sessionStorage.getItem('token') ||
           null;
  }

  setCurrentUser(user: User, token?: string): void {
    this.currentUser = user;
    if (user && typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(user));
      if (token) {
        localStorage.setItem('authToken', token);
      }
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    const token = this.getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (this.currentUser?.id) {
      headers['user-id'] = this.currentUser.id;
      headers['x-user-name'] = this.currentUser.name || 'Anonymous';
    }
    
    return headers;
  }

  // Initialize WebSocket connection
  private initializeWebSocket(): void {
    if (typeof window === 'undefined') return;

    try {
      console.log('🔌 Initializing WebSocket connection...');
      
      this.socket = io('/', {
        transports: ['websocket', 'polling'],
        auth: {
          userId: this.currentUser?.id,
          token: this.getStoredToken()
        },
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log(`✅ WebSocket connected: ${this.socket?.id}`);
        this.isConnected = true;
        this.retryCount = 0;
        
        if (this.currentUser?.id) {
          this.socket?.emit('join_user', this.currentUser.id);
        }
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log(`🔌 WebSocket disconnected: ${reason}`);
        this.isConnected = false;
        
        if (reason === 'io server disconnect') {
          this.handleReconnection();
        }
      });

      this.socket.on('connect_error', (error: Error) => {
        console.warn('⚠️ WebSocket connection error:', error);
        this.isConnected = false;
      });

      // Message event listeners
      this.socket.on('new_message', (message: any) => {
        this.handleNewMessage(message);
      });

      this.socket.on('message', (message: any) => {
        this.handleNewMessage(message);
      });

      this.socket.on('message_sent', (data: any) => {
        this.handleMessageSent(data);
      });

      this.socket.on('typing', (data: { userId: string; conversationId: string }) => {
        this.emit('userTyping', data);
      });

      this.socket.on('stop_typing', (data: { userId: string; conversationId: string }) => {
        this.emit('userStoppedTyping', data);
      });

    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
    }
  }

  // Handle WebSocket reconnection
  private handleReconnection(): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`🔄 Attempting WebSocket reconnection ${this.retryCount}/${this.maxRetries}...`);
      
      setTimeout(() => {
        this.initializeWebSocket();
      }, 2000 * this.retryCount);
    } else {
      console.error('❌ Max WebSocket reconnection attempts reached');
      this.emit('connectionFailed', null);
    }
  }

  async initialize(userId?: string): Promise<boolean> {
    console.log('🔄 Initializing enhanced messaging system...');
    
    try {
      await this.loadConversations(userId || this.currentUser?.id || '');
      console.log('✅ Enhanced messaging system initialized');
      return true;
    } catch (error) {
      console.error('❌ Init failed:', error);
      return false;
    }
  }

  async loadConversations(userId: string): Promise<Conversation[]> {
    console.log('🌐 Loading conversations with enhanced features...');
    
    if (!userId) {
      this.conversations = [];
      return [];
    }

    try {
      const response = await fetch('/api/messages/conversations', {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.warn('⚠️ Conversations API failed:', response.status);
        this.conversations = [];
        return [];
      }

      const data = await response.json();
      
      let rawConversations: any[] = [];
      
      if (data?.success && Array.isArray(data.conversations)) {
        rawConversations = data.conversations;
      } else if (Array.isArray(data?.conversations)) {
        rawConversations = data.conversations;
      } else if (Array.isArray(data)) {
        rawConversations = data;
      }
      
      this.conversations = rawConversations.map((conv: any) => {
        let participants: string[] = [];
        
        if (Array.isArray(conv.participants)) {
          participants = conv.participants;
        } else if (typeof conv.participants === 'string') {
          try {
            participants = conv.participants
              .replace(/[{}]/g, '')
              .split(',')
              .map(p => p.trim())
              .filter(p => p.length > 0);
          } catch {
            participants = [userId];
          }
        } else {
          participants = [userId];
        }
        
        return {
          id: conv.id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          participants,
          participantNames: conv.participantNames || [],
          lastMessage: conv.lastMessage || '',
          lastMessageTime: conv.lastMessageTime || new Date().toISOString(),
          unreadCount: Number(conv.unreadCount) || 0,
          projectTitle: conv.projectTitle || 'Conversation',
          messageCount: Number(conv.messageCount) || 0
        };
      }).filter((conv: Conversation) => {
        try {
          return Array.isArray(conv.participants) && conv.participants.includes(userId);
        } catch {
          return false;
        }
      });

      // Sort by last message time
      this.conversations.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      console.log(`✅ Loaded ${this.conversations.length} conversations`);
      this.emit('conversationsLoaded', this.conversations);
      return this.conversations;
      
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      this.conversations = [];
      return [];
    }
  }

  getConversations(userId?: string): Conversation[] {
    const user = userId || this.currentUser?.id;
    if (!user || !Array.isArray(this.conversations)) {
      return [];
    }
    
    return this.conversations.filter(conv => {
      try {
        return Array.isArray(conv.participants) && conv.participants.includes(user);
      } catch {
        return false;
      }
    });
  }

  // Enhanced send message with file support
  async sendMessage(
    recipientId: string, 
    content: string, 
    senderName?: string,
    attachments?: FileAttachment[]
  ): Promise<any> {
    if (!this.currentUser?.id) {
      throw new Error('No current user');
    }

    const messageData = {
      toId: recipientId,
      fromName: senderName || this.currentUser.name || 'Anonymous',
      subject: 'New Message',
      message: content,
      messageType: 'direct_message',
      attachments: attachments || []
    };

    console.log('📤 Sending enhanced message:', messageData);

    try {
      // Try WebSocket first for real-time delivery
      if (this.socket && this.isConnected) {
        this.socket.emit('send_message', {
          senderId: this.currentUser.id,
          receiverId: recipientId,
          content: content,
          senderName: senderName || this.currentUser.name,
          timestamp: new Date().toISOString(),
          attachments: attachments || []
        });
      }

      // Also send via HTTP API for persistence
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Enhanced message sent:', result);
      return result;
    } catch (error) {
      console.error('❌ Send failed:', error);
      throw error;
    }
  }

  // Upload file attachment
  async uploadFile(file: File): Promise<FileAttachment> {
    if (!this.currentUser?.id) {
      throw new Error('No current user');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size must be less than 10MB');
    }

    console.log('📎 Uploading file:', file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', this.currentUser.id);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getStoredToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      const attachment: FileAttachment = {
        id: result.id || `file_${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: result.url
      };

      console.log('✅ File uploaded:', attachment);
      return attachment;
    } catch (error) {
      console.error('❌ File upload failed:', error);
      throw error;
    }
  }

  // Load messages for a conversation
  async loadConversationMessages(conversationId: string): Promise<Message[]> {
    try {
      console.log('📨 Loading conversation messages:', conversationId);
      
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const messages = data.messages || [];
      
      // Store in local cache
      messages.forEach((msg: Message) => {
        this.messages.set(msg.id, msg);
      });
      
      console.log(`✅ Loaded ${messages.length} messages`);
      return messages;
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      return [];
    }
  }

  // Send typing indicator
  sendTypingIndicator(conversationId: string): void {
    if (this.socket && this.isConnected && this.currentUser?.id) {
      this.socket.emit('typing', {
        userId: this.currentUser.id,
        conversationId: conversationId
      });
    }
  }

  // Stop typing indicator
  stopTypingIndicator(conversationId: string): void {
    if (this.socket && this.isConnected && this.currentUser?.id) {
      this.socket.emit('stop_typing', {
        userId: this.currentUser.id,
        conversationId: conversationId
      });
    }
  }

  // Mark message as read
  markAsRead(messageId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark_read', {
        messageId: messageId,
        userId: this.currentUser?.id
      });
    }
    
    const message = this.messages.get(messageId);
    if (message) {
      message.read = true;
      this.messages.set(messageId, message);
    }
  }

  // Handle new message
  private handleNewMessage(message: any): void {
    console.log('📨 New enhanced message received:', message);
    
    const normalizedMessage: Message = {
      id: message.id || `msg_${Date.now()}`,
      senderId: message.senderId || message.sender_id,
      recipientId: message.recipientId || message.recipient_id,
      content: message.content,
      timestamp: message.timestamp || message.created_at || new Date().toISOString(),
      senderName: message.senderName || message.sender_name || 'Unknown',
      conversationId: message.conversationId,
      attachments: message.attachments || []
    };
    
    if (normalizedMessage.id) {
      this.messages.set(normalizedMessage.id, normalizedMessage);
    }
    
    this.updateConversationWithMessage(normalizedMessage);
    this.emit('newMessage', normalizedMessage);
  }

  // Handle message sent confirmation
  private handleMessageSent(data: any): void {
    console.log('✅ Enhanced message sent confirmation:', data);
    
    if (data.message) {
      const messageId = data.message.id || data.messageId;
      this.messages.set(messageId, data.message);
      this.updateConversationWithMessage(data.message);
    }
    
    this.emit('messageSent', data);
  }

  // Update conversation with new message
  private updateConversationWithMessage(message: Message): void {
    if (!message || !this.currentUser?.id) {
      return;
    }
    
    const senderId = message.senderId;
    const recipientId = message.recipientId;
    
    if (!senderId || !recipientId) {
      return;
    }
    
    const conversationId = message.conversationId || 
                          this.generateConversationId(senderId, recipientId);
    
    let conversation = this.conversations.find(conv => conv.id === conversationId);
    
    if (!conversation) {
      conversation = {
        id: conversationId,
        participants: [senderId, recipientId],
        lastMessage: message.content || '',
        lastMessageTime: message.timestamp || new Date().toISOString(),
        unreadCount: (recipientId === this.currentUser.id) ? 1 : 0,
        projectTitle: message.subject || 'New Conversation',
        messageCount: 1
      };
      this.conversations.unshift(conversation);
    } else {
      conversation.lastMessage = message.content || '';
      conversation.lastMessageTime = message.timestamp || new Date().toISOString();
      
      if (recipientId === this.currentUser.id) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }
      
      conversation.messageCount = (conversation.messageCount || 0) + 1;
    }
    
    this.conversations.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
    
    this.emit('conversationUpdated', conversation);
  }

  // Generate conversation ID
  private generateConversationId(user1: string, user2: string): string {
    const sorted = [user1, user2].sort();
    return `conv_${sorted[0]}_${sorted[1]}`;
  }

  // Event management
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Event listener error:`, error);
        }
      });
    }
  }

  // Get service status
  getStatus() {
    return {
      isConnected: this.isConnected,
      hasUser: !!this.currentUser,
      conversationsCount: this.conversations.length,
      messagesCount: this.messages.size,
      socketId: this.socket?.id || null
    };
  }

  // Check if connected
  isConnectedToWebSocket(): boolean {
    return this.isConnected;
  }

  // Disconnect
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  // Reconnect
  async reconnect(): Promise<boolean> {
    this.disconnect();
    this.initializeWebSocket();
    
    if (this.currentUser?.id) {
      return await this.initialize(this.currentUser.id);
    }
    return false;
  }
}

// Create singleton
const messagingService = new MessagingService();

// Auto-initialize with enhanced features
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const user = messagingService.getCurrentUser();
    if (user) {
      messagingService.initialize(user.id).catch(console.error);
    }
  }, 1000);
}

export { messagingService };
export default messagingService;