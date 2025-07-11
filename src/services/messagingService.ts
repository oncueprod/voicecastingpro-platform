// messagingService.ts - Simple Working Version
// Fixes console errors without breaking existing functionality

import { Socket, io } from 'socket.io-client';

// Type definitions
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
  recipientName?: string;
  subject?: string;
  read?: boolean;
  type?: string;
  conversationId?: string;
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

export interface ServiceStatus {
  isConnected: boolean;
  hasUser: boolean;
  hasToken: boolean;
  conversationsCount: number;
  messagesCount: number;
  socketId: string | null;
}

// Event listener types
type EventCallback<T = any> = (data: T) => void;
type EventMap = Map<string, EventCallback[]>;

class MessagingService {
  private socket: Socket | null = null;
  private conversations: Conversation[] = [];
  private messages: Map<string, Message> = new Map();
  private currentUser: User | null = null;
  private listeners: EventMap = new Map();
  private isConnected: boolean = false;
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;
  private authToken: string | null = null;

  constructor() {
    // Get auth token from localStorage
    this.authToken = this.getStoredToken();
    this.currentUser = this.getCurrentUser();
    
    console.log('🔧 MessagingService initialized', {
      hasToken: !!this.authToken,
      hasUser: !!this.currentUser
    });
  }

  // Get stored token from localStorage
  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    return localStorage.getItem('authToken') || 
           localStorage.getItem('token') || 
           localStorage.getItem('accessToken') ||
           sessionStorage.getItem('authToken') ||
           sessionStorage.getItem('token') ||
           null;
  }

  // Get current user with error handling
  public getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const userData = localStorage.getItem('currentUser') || 
                      localStorage.getItem('user') ||
                      sessionStorage.getItem('currentUser');
      
      if (userData) {
        const user: User = JSON.parse(userData);
        console.log('📱 Current user loaded:', { id: user.id, name: user.name, type: user.type });
        return user;
      }
      
      // Try to extract user from JWT token
      if (this.authToken && !this.authToken.startsWith('session_')) {
        try {
          const payload = JSON.parse(atob(this.authToken.split('.')[1]));
          if (payload.id) {
            return {
              id: payload.id,
              name: payload.name || 'JWT User',
              type: payload.type || 'client'
            };
          }
        } catch (jwtError) {
          console.log('⚠️ Could not parse JWT:', (jwtError as Error).message);
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting current user:', error);
      return null;
    }
  }

  // Set current user and token
  public setCurrentUser(user: User, token?: string): void {
    this.currentUser = user;
    if (user && typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(user));
      console.log('💾 User stored:', user.id);
    }
    if (token) {
      this.authToken = token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', token);
      }
      console.log('🔑 Token stored');
    }
  }

  // Get auth headers for API calls
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    if (this.currentUser?.id) {
      headers['user-id'] = this.currentUser.id;
      headers['x-user-name'] = this.currentUser.name || 'Anonymous';
    }
    
    return headers;
  }

  // Initialize messaging system
  public async initialize(userId?: string): Promise<boolean> {
    const user = userId || this.currentUser?.id;
    
    if (!user) {
      console.warn('⚠️ No user ID provided for messaging initialization');
      return false;
    }

    console.log(`🔄 Initializing messaging system for user: ${user}`);
    
    try {
      // Only connect to WebSocket - no database calls
      await this.connectWebSocket();
      
      // Load conversations via API
      await this.loadConversations(user);
      
      console.log('✅ Messaging system initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize messaging:', error);
      return false;
    }
  }

  // Connect to WebSocket (simplified)
  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to WebSocket server...');
        
        if (this.socket) {
          this.socket.disconnect();
        }

        this.socket = io('/', {
          transports: ['websocket', 'polling'],
          auth: {
            userId: this.currentUser?.id,
            token: this.authToken
          },
          timeout: 10000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          console.log(`✅ WebSocket connected: ${this.socket?.id}`);
          this.isConnected = true;
          this.retryCount = 0;
          
          if (this.currentUser?.id) {
            this.socket?.emit('join_user', this.currentUser.id);
          }
          
          resolve();
        });

        this.socket.on('disconnect', (reason: string) => {
          console.log(`🔌 WebSocket disconnected: ${reason}`);
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('❌ WebSocket connection error:', error);
          this.isConnected = false;
          // Don't reject on WebSocket error - allow API-only mode
          resolve();
        });

        this.socket.on('new_message', (message: Message) => {
          this.handleNewMessage(message);
        });

        this.socket.on('message', (message: Message) => {
          this.handleNewMessage(message);
        });

      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
        // Don't fail on WebSocket error - allow API-only mode
        resolve();
      }
    });
  }

  // CRITICAL FIX: Load conversations safely via API only
  public async loadConversations(userId: string): Promise<Conversation[]> {
    console.log('🌐 Loading conversations from API...');
    
    if (!userId) {
      console.warn('⚠️ No user ID provided');
      this.conversations = [];
      this.emit('conversationsLoaded', []);
      return [];
    }

    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          console.warn('⚠️ Conversations API forbidden/unauthorized:', response.status);
          this.conversations = [];
          this.emit('conversationsLoaded', []);
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Raw conversations response:', data);
      
      // CRITICAL FIX: Handle different response structures safely
      let conversations: any[] = [];
      
      if (data && data.success && Array.isArray(data.conversations)) {
        conversations = data.conversations;
      } else if (data && Array.isArray(data.conversations)) {
        conversations = data.conversations;
      } else if (Array.isArray(data)) {
        conversations = data;
      } else {
        console.warn('⚠️ No conversations found in response');
        conversations = [];
      }
      
      console.log(`📋 Processing ${conversations.length} conversations`);
      
      // FIXED: Safe conversation processing
      this.conversations = conversations.filter((conv: any) => {
        try {
          if (!conv || typeof conv !== 'object') {
            return false;
          }
          
          // CRITICAL FIX: Safe participants handling
          if (!conv.participants) {
            conv.participants = [userId];
          } else if (typeof conv.participants === 'string') {
            try {
              // Parse PostgreSQL array format safely
              conv.participants = conv.participants
                .replace(/[{}]/g, '')
                .split(',')
                .map((p: string) => p.trim())
                .filter((p: string) => p.length > 0);
            } catch (parseError) {
              console.warn('⚠️ Error parsing participants:', parseError);
              conv.participants = [userId];
            }
          } else if (!Array.isArray(conv.participants)) {
            conv.participants = [userId];
          }
          
          // Ensure required fields
          conv.id = conv.id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          conv.lastMessage = conv.lastMessage || '';
          conv.lastMessageTime = conv.lastMessageTime || new Date().toISOString();
          conv.unreadCount = typeof conv.unreadCount === 'number' ? conv.unreadCount : 0;
          conv.projectTitle = conv.projectTitle || 'Conversation';
          
          // SAFE includes check - this was the main error
          try {
            return Array.isArray(conv.participants) && conv.participants.includes(userId);
          } catch (includesError) {
            console.warn('⚠️ Error checking participants:', includesError);
            return false;
          }
          
        } catch (error) {
          console.error('❌ Error processing conversation:', error);
          return false;
        }
      });

      // Sort by last message time
      this.conversations.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      console.log(`✅ Successfully loaded ${this.conversations.length} conversations`);
      this.emit('conversationsLoaded', this.conversations);
      
      return this.conversations;
      
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      
      // CRITICAL: Always set empty array to prevent undefined errors
      this.conversations = [];
      this.emit('conversationsError', error);
      return [];
    }
  }

  // FIXED: Get conversations with safe filtering
  public getConversations(userId?: string): Conversation[] {
    const user = userId || this.currentUser?.id;
    
    if (!user) {
      console.warn('⚠️ No user ID for getting conversations');
      return [];
    }

    // CRITICAL FIX: Ensure conversations is always an array
    if (!Array.isArray(this.conversations)) {
      console.warn('⚠️ Conversations is not an array, initializing as empty');
      this.conversations = [];
      return [];
    }

    // SAFE filtering - this fixes the main console error
    const filteredConversations = this.conversations.filter((conversation: Conversation) => {
      try {
        if (!conversation || typeof conversation !== 'object') {
          return false;
        }

        if (!conversation.participants) {
          return false;
        }

        // Handle different formats safely
        let participants = conversation.participants;
        
        if (typeof participants === 'string') {
          try {
            participants = (participants as any)
              .replace(/[{}]/g, '')
              .split(',')
              .map((p: string) => p.trim())
              .filter((p: string) => p.length > 0);
          } catch (parseError) {
            return false;
          }
        }

        if (!Array.isArray(participants)) {
          return false;
        }

        // SAFE includes check
        return participants.includes(user);
        
      } catch (error) {
        console.error('❌ Error filtering conversation:', error);
        return false;
      }
    });

    return filteredConversations;
  }

  // Send message via API
  public async sendMessage(
    recipientId: string, 
    content: string, 
    senderName?: string, 
    recipientEmail?: string
  ): Promise<any> {
    if (!this.currentUser?.id) {
      throw new Error('No current user - authentication required');
    }

    if (!recipientId || !content) {
      throw new Error('Recipient ID and content are required');
    }

    const messageData = {
      toId: recipientId,
      toName: recipientEmail ? recipientEmail.split('@')[0] : 'User',
      fromName: senderName || this.currentUser.name || 'Anonymous',
      subject: 'New Message',
      message: content,
      messageType: 'direct_message'
    };

    console.log('📤 Sending message via API:', messageData);

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.handleMessageSent(result);
        console.log('✅ Message sent successfully');
        return result;
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ Message send failed:', error);
      throw error;
    }
  }

  // Handle new message
  private handleNewMessage(message: any): void {
    console.log('📨 New message received:', message);
    
    const normalizedMessage: Message = {
      id: message.id,
      senderId: message.senderId || message.sender_id,
      recipientId: message.recipientId || message.recipient_id,
      content: message.content,
      timestamp: message.timestamp || message.created_at || new Date().toISOString(),
      senderName: message.senderName || message.sender_name || 'Unknown'
    };
    
    if (normalizedMessage.id) {
      this.messages.set(normalizedMessage.id, normalizedMessage);
    }
    
    this.updateConversationWithMessage(normalizedMessage);
    this.emit('newMessage', normalizedMessage);
  }

  // Handle message sent
  private handleMessageSent(data: any): void {
    console.log('✅ Message sent confirmation:', data);
    
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
        projectTitle: message.subject || 'New Conversation'
      };
      this.conversations.unshift(conversation);
    } else {
      conversation.lastMessage = message.content || '';
      conversation.lastMessageTime = message.timestamp || new Date().toISOString();
      
      if (recipientId === this.currentUser.id) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }
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
  public on<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off<T = any>(event: string, callback: EventCallback<T>): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit<T = any>(event: string, data: T): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Disconnect
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  // Get status
  public getStatus(): ServiceStatus {
    return {
      isConnected: this.isConnected,
      hasUser: !!this.currentUser,
      hasToken: !!this.authToken,
      conversationsCount: this.conversations.length,
      messagesCount: this.messages.size,
      socketId: this.socket?.id || null
    };
  }

  // Additional methods for compatibility
  public isConnectedToWebSocket(): boolean {
    return this.isConnected;
  }

  public async reconnect(): Promise<boolean> {
    this.disconnect();
    if (this.currentUser?.id) {
      return await this.initialize(this.currentUser.id);
    }
    return false;
  }
}

// Create singleton instance
const messagingService = new MessagingService();

// Auto-initialize (simplified)
if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    const currentUser = messagingService.getCurrentUser();
    if (currentUser && currentUser.id) {
      console.log('🚀 Auto-initializing messaging service');
      try {
        await messagingService.initialize(currentUser.id);
      } catch (error) {
        console.error('❌ Auto-initialization failed:', error);
      }
    } else {
      console.log('⚠️ No user found for auto-initialization');
    }
  });
}

// Exports
export { messagingService };
export default messagingService;