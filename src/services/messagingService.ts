// messagingService.ts - Complete TypeScript Version for PostgreSQL Backend
// Fixes all console errors and provides type safety

import { Socket, io } from 'socket.io-client';

// Type definitions
interface User {
  id: string;
  name: string;
  type: 'client' | 'talent' | 'admin';
  email?: string;
}

interface Message {
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

interface Conversation {
  id: string;
  participants: string[];
  participantNames?: string[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  projectTitle?: string;
  messageCount?: number;
}

interface MessageData {
  toId: string;
  toName?: string;
  fromName?: string;
  subject: string;
  message: string;
  messageType?: string;
  budget?: string;
  deadline?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface ConversationsResponse {
  success: boolean;
  conversations: Conversation[];
  count: number;
  error?: string;
}

interface MessageSendResponse {
  success: boolean;
  messageId: string;
  conversationId: string;
  timestamp: string;
  emailSent?: boolean;
  message?: Message;
}

interface ServiceStatus {
  isConnected: boolean;
  hasUser: boolean;
  hasToken: boolean;
  conversationsCount: number;
  messagesCount: number;
  socketId: string | null;
}

interface AuthHeaders {
  'Content-Type': string;
  'Accept': string;
  'Authorization'?: string;
  'user-id'?: string;
  'x-user-name'?: string;
}

// Event listener types
type EventCallback<T = any> = (data: T) => void;
type EventMap = Map<string, EventCallback[]>;

// Socket event types
interface SocketMessage {
  senderId: string;
  receiverId: string;
  content: string;
  senderName?: string;
  timestamp: string;
}

interface SocketMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

class MessagingService {
  private socket: Socket | null = null;
  private conversations: Conversation[] = [];
  private messages: Map<string, Message> = new Map();
  private currentUser: User | null = null;
  private listeners: EventMap = new Map();
  private isConnected: boolean = false;
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;
  private readonly baseURL: string = '';
  private authToken: string | null = null;

  constructor() {
    // Get auth token from localStorage (multiple possible keys)
    this.authToken = this.getStoredToken();
    this.currentUser = this.getCurrentUser();
    
    console.log('🔧 MessagingService initialized', {
      hasToken: !!this.authToken,
      hasUser: !!this.currentUser
    });
  }

  // ENHANCED: Get stored token from various possible locations
  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    return localStorage.getItem('authToken') || 
           localStorage.getItem('token') || 
           localStorage.getItem('accessToken') ||
           sessionStorage.getItem('authToken') ||
           sessionStorage.getItem('token') ||
           null;
  }

  // ENHANCED: Get current user with better error handling
  public getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    try {
      // Try multiple possible storage keys
      const userData = localStorage.getItem('currentUser') || 
                      localStorage.getItem('user') ||
                      localStorage.getItem('userData') ||
                      sessionStorage.getItem('currentUser') ||
                      sessionStorage.getItem('user');
      
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
            console.log('📱 User extracted from JWT:', { id: payload.id, name: payload.name });
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
      
      // Try session token format
      if (this.authToken && this.authToken.startsWith('session_')) {
        const parts = this.authToken.split('_');
        if (parts.length >= 3) {
          return {
            id: parts[1],
            type: (parts[2] as 'client' | 'talent') || 'client',
            name: 'Session User'
          };
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

  // ENHANCED: Get proper auth headers for your PostgreSQL backend
  private getAuthHeaders(): AuthHeaders {
    const headers: AuthHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Add JWT authorization header
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    // Add user-id header for compatibility with your backend
    if (this.currentUser?.id) {
      headers['user-id'] = this.currentUser.id;
      headers['x-user-name'] = this.currentUser.name || 'Anonymous';
    }
    
    return headers;
  }

  // ENHANCED: Initialize messaging system with your PostgreSQL backend
  public async initialize(userId?: string): Promise<boolean> {
    const user = userId || this.currentUser?.id;
    
    if (!user) {
      console.warn('⚠️ No user ID provided for messaging initialization');
      return false;
    }

    console.log(`🔄 Initializing messaging system for user: ${user}`);
    
    try {
      // Test API connectivity first
      await this.testApiConnectivity();
      
      // Connect to WebSocket
      await this.connectWebSocket();
      
      // Load conversations from PostgreSQL
      await this.loadConversations(user);
      
      console.log('✅ Messaging system initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize messaging:', error);
      return false;
    }
  }

  // Test API connectivity
  private async testApiConnectivity(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/health`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API connectivity confirmed:', data.status);
        return true;
      } else {
        console.warn('⚠️ API health check failed:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ API connectivity test failed:', (error as Error).message);
      return false;
    }
  }

  // ENHANCED: Connect to WebSocket with your Socket.io setup
  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to WebSocket server...');
        
        // Disconnect existing connection
        if (this.socket) {
          this.socket.disconnect();
        }

        this.socket = io(this.baseURL || '/', {
          transports: ['websocket', 'polling'],
          auth: {
            userId: this.currentUser?.id,
            token: this.authToken
          },
          timeout: 10000,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
          console.log(`✅ WebSocket connected: ${this.socket?.id}`);
          this.isConnected = true;
          this.retryCount = 0;
          
          // Join user room for targeted notifications
          if (this.currentUser?.id) {
            this.socket?.emit('join_user', this.currentUser.id);
          }
          
          resolve();
        });

        this.socket.on('disconnect', (reason: string) => {
          console.log(`🔌 WebSocket disconnected: ${reason}`);
          this.isConnected = false;
          
          // Auto-reconnect on server disconnect
          if (reason === 'io server disconnect') {
            this.handleReconnection();
          }
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('❌ WebSocket connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        // Listen for incoming messages
        this.socket.on('new_message', (message: Message) => {
          this.handleNewMessage(message);
        });

        this.socket.on('message', (message: Message) => {
          this.handleNewMessage(message);
        });

        this.socket.on('message_sent', (data: SocketMessageResponse) => {
          this.handleMessageSent(data);
        });

        this.socket.on('message_error', (error: { error: string }) => {
          console.error('❌ WebSocket message error:', error);
          this.emit('messageError', error);
        });

      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
        reject(error);
      }
    });
  }

  // Handle WebSocket reconnection
  private handleReconnection(): void {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`🔄 Attempting WebSocket reconnection ${this.retryCount}/${this.maxRetries}...`);
      
      setTimeout(() => {
        this.connectWebSocket().catch((error: Error) => {
          console.error('❌ Reconnection failed:', error);
          if (this.retryCount >= this.maxRetries) {
            this.emit('connectionFailed', null);
          }
        });
      }, 2000 * this.retryCount);
    } else {
      console.error('❌ Max WebSocket reconnection attempts reached');
      this.emit('connectionFailed', null);
    }
  }

  // CRITICAL FIX: Load conversations from PostgreSQL with safe error handling
  public async loadConversations(userId: string): Promise<Conversation[]> {
    console.log('🌐 Loading conversations from PostgreSQL backend...');
    console.log(`📂 Loading conversations for user: ${userId}`);
    
    if (!userId) {
      console.warn('⚠️ No user ID provided for loading conversations');
      this.conversations = [];
      this.emit('conversationsLoaded', []);
      return [];
    }

    try {
      const response = await fetch(`${this.baseURL}/api/messages/conversations`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.warn('⚠️ Backend conversations API forbidden: 403');
          this.conversations = [];
          this.emit('conversationsLoaded', []);
          return [];
        }
        if (response.status === 401) {
          console.warn('⚠️ Backend conversations API unauthorized: 401');
          this.emit('authenticationRequired', null);
          this.conversations = [];
          return [];
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ConversationsResponse = await response.json();
      console.log('📊 Raw conversations response:', data);
      
      // CRITICAL FIX: Handle different PostgreSQL response structures safely
      let conversations: Conversation[] = [];
      
      if (data && data.success && Array.isArray(data.conversations)) {
        conversations = data.conversations;
      } else if (data && Array.isArray((data as any).conversations)) {
        conversations = (data as any).conversations;
      } else if (Array.isArray(data)) {
        conversations = data as Conversation[];
      } else {
        console.warn('⚠️ Unexpected conversations response structure:', data);
        conversations = [];
      }
      
      console.log(`📋 Processing ${conversations.length} raw conversations`);
      
      // FIXED: Ensure each conversation has proper participants array
      this.conversations = conversations.filter((conv: any) => {
        try {
          if (!conv || typeof conv !== 'object') {
            console.warn('⚠️ Invalid conversation object:', conv);
            return false;
          }
          
          // Ensure participants is always an array
          if (!conv.participants) {
            console.warn('⚠️ Conversation missing participants:', conv.id);
            conv.participants = [userId];
          } else if (typeof conv.participants === 'string') {
            try {
              // Parse PostgreSQL array string format: "{user1,user2}" -> ["user1", "user2"]
              conv.participants = conv.participants
                .replace(/[{}]/g, '')
                .split(',')
                .map((p: string) => p.trim())
                .filter((p: string) => p.length > 0);
              
              console.log(`🔧 Parsed participants for conversation ${conv.id}:`, conv.participants);
            } catch (parseError) {
              console.warn('⚠️ Error parsing participants string:', parseError, conv.participants);
              conv.participants = [userId];
            }
          } else if (!Array.isArray(conv.participants)) {
            console.warn('⚠️ Participants is not array:', conv.participants);
            conv.participants = [userId];
          }
          
          // Ensure all required fields exist
          if (!conv.id) {
            conv.id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
          if (!conv.lastMessage) {
            conv.lastMessage = '';
          }
          if (!conv.lastMessageTime) {
            conv.lastMessageTime = new Date().toISOString();
          }
          if (typeof conv.unreadCount !== 'number') {
            conv.unreadCount = 0;
          }
          if (!conv.projectTitle) {
            conv.projectTitle = 'Conversation';
          }
          
          // SAFE includes check with comprehensive error handling
          try {
            const isParticipant = conv.participants.includes(userId);
            if (isParticipant) {
              console.log(`✅ User ${userId} is participant in conversation ${conv.id}`);
            }
            return isParticipant;
          } catch (includesError) {
            console.warn('⚠️ Error checking participant inclusion:', includesError, conv);
            return false;
          }
          
        } catch (processingError) {
          console.error('❌ Error processing conversation:', processingError, conv);
          return false;
        }
      });

      // Sort conversations by last message time
      this.conversations.sort((a, b) => {
        const timeA = new Date(a.lastMessageTime);
        const timeB = new Date(b.lastMessageTime);
        return timeB.getTime() - timeA.getTime();
      });

      console.log(`✅ Successfully loaded ${this.conversations.length} conversations for user ${userId}`);
      this.emit('conversationsLoaded', this.conversations);
      
      return this.conversations;
      
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      
      // CRITICAL: Always set to empty array to prevent undefined errors
      this.conversations = [];
      this.emit('conversationsError', error);
      return [];
    }
  }

  // FIXED: Get conversations with SAFE filtering
  public getConversations(userId?: string): Conversation[] {
    const user = userId || this.currentUser?.id;
    
    if (!user) {
      console.warn('⚠️ No user ID for getting conversations');
      return [];
    }

    // CRITICAL FIX: Ensure conversations is always an array
    if (!Array.isArray(this.conversations)) {
      console.warn('⚠️ Conversations is not an array, initializing as empty array');
      this.conversations = [];
      return [];
    }

    console.log(`🔍 Filtering ${this.conversations.length} conversations for user ${user}`);

    // SAFE filtering with comprehensive error handling
    const filteredConversations = this.conversations.filter((conversation: Conversation) => {
      try {
        // Multiple safety checks
        if (!conversation || typeof conversation !== 'object') {
          console.warn('⚠️ Invalid conversation object:', conversation);
          return false;
        }

        if (!conversation.participants) {
          console.warn('⚠️ Conversation missing participants:', conversation.id);
          return false;
        }

        // Handle different participant formats
        let participants = conversation.participants;
        
        if (typeof participants === 'string') {
          try {
            participants = (participants as any)
              .replace(/[{}]/g, '')
              .split(',')
              .map((p: string) => p.trim())
              .filter((p: string) => p.length > 0);
          } catch (parseError) {
            console.warn('⚠️ Error re-parsing participants:', parseError);
            return false;
          }
        }

        if (!Array.isArray(participants)) {
          console.warn('⚠️ Participants not array after processing:', participants);
          return false;
        }

        // SAFE includes check
        const isParticipant = participants.includes(user);
        return isParticipant;
        
      } catch (error) {
        console.error('❌ Error filtering conversation:', error, conversation);
        return false;
      }
    });

    console.log(`✅ Filtered to ${filteredConversations.length} conversations for user ${user}`);
    return filteredConversations;
  }

  // ENHANCED: Send message using your PostgreSQL API
  public async sendMessage(
    recipientId: string, 
    content: string, 
    senderName?: string, 
    recipientEmail?: string
  ): Promise<MessageSendResponse> {
    if (!this.currentUser?.id) {
      throw new Error('No current user - authentication required');
    }

    if (!recipientId || !content) {
      throw new Error('Recipient ID and content are required');
    }

    const messageData: MessageData = {
      toId: recipientId,
      toName: recipientEmail ? recipientEmail.split('@')[0] : 'User',
      fromName: senderName || this.currentUser.name || 'Anonymous',
      subject: 'New Message',
      message: content,
      messageType: 'direct_message',
      budget: '',
      deadline: ''
    };

    console.log('📤 Sending message via PostgreSQL API:', {
      toId: messageData.toId,
      fromName: messageData.fromName,
      contentLength: content.length
    });

    try {
      const response = await fetch(`${this.baseURL}/api/messages/send`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(messageData)
      });

      console.log('📡 Message send response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Message send failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }

      const result: MessageSendResponse = await response.json();
      console.log('📨 Message send result:', result);
      
      if (result.success) {
        this.handleMessageSent(result);
        console.log('✅ Message sent successfully via API');
        return result;
      } else {
        throw new Error(result.error || 'Failed to send message - unknown error');
      }
    } catch (error) {
      console.error('❌ Message send failed:', error);
      throw error;
    }
  }

  // ENHANCED: Send message via WebSocket as fallback
  public async sendMessageViaWebSocket(
    recipientId: string, 
    content: string, 
    senderName?: string
  ): Promise<SocketMessageResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      if (!this.currentUser?.id) {
        reject(new Error('No current user'));
        return;
      }

      const messageData: SocketMessage = {
        senderId: this.currentUser.id,
        receiverId: recipientId,
        content: content,
        senderName: senderName || this.currentUser.name || 'Anonymous',
        timestamp: new Date().toISOString()
      };

      console.log('📤 Sending message via WebSocket:', messageData);

      // Set up timeout
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket message send timeout'));
      }, 10000);

      // Listen for response
      const onMessageSent = (response: SocketMessageResponse) => {
        clearTimeout(timeout);
        this.socket?.off('message_sent', onMessageSent);
        this.socket?.off('message_error', onMessageError);
        resolve(response);
      };

      const onMessageError = (error: { error: string }) => {
        clearTimeout(timeout);
        this.socket?.off('message_sent', onMessageSent);
        this.socket?.off('message_error', onMessageError);
        reject(new Error(error.error || 'WebSocket message error'));
      };

      this.socket.once('message_sent', onMessageSent);
      this.socket.once('message_error', onMessageError);

      // Send the message
      this.socket.emit('send_message', messageData);
    });
  }

  // ENHANCED: Main send method with fallback options
  public async sendMessageWithFallback(
    recipientId: string, 
    content: string, 
    senderName?: string, 
    recipientEmail?: string
  ): Promise<MessageSendResponse | SocketMessageResponse> {
    try {
      // Try PostgreSQL API first
      return await this.sendMessage(recipientId, content, senderName, recipientEmail);
    } catch (apiError) {
      console.warn('⚠️ API send failed, trying WebSocket fallback:', (apiError as Error).message);
      
      try {
        // Fallback to WebSocket
        if (this.socket && this.isConnected) {
          return await this.sendMessageViaWebSocket(recipientId, content, senderName);
        } else {
          throw new Error('WebSocket not available for fallback');
        }
      } catch (wsError) {
        console.error('❌ All message send methods failed');
        throw new Error(`API failed: ${(apiError as Error).message}, WebSocket failed: ${(wsError as Error).message}`);
      }
    }
  }

  // Handle new incoming message
  private handleNewMessage(message: any): void {
    console.log('📨 New message received:', {
      id: message.id,
      senderId: message.senderId || message.sender_id,
      content: message.content?.substring(0, 50) + '...'
    });
    
    // Normalize message format
    const normalizedMessage: Message = {
      id: message.id,
      senderId: message.senderId || message.sender_id,
      recipientId: message.recipientId || message.recipient_id,
      content: message.content,
      timestamp: message.timestamp || message.created_at || new Date().toISOString(),
      senderName: message.senderName || message.sender_name || 'Unknown'
    };
    
    // Add to messages map
    if (normalizedMessage.id) {
      this.messages.set(normalizedMessage.id, normalizedMessage);
    }
    
    // Update conversations
    this.updateConversationWithMessage(normalizedMessage);
    
    // Emit to listeners
    this.emit('newMessage', normalizedMessage);
  }

  // Handle message sent confirmation
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
      console.warn('⚠️ Message missing sender or recipient IDs');
      return;
    }
    
    const conversationId = message.conversationId || 
                          this.generateConversationId(senderId, recipientId);
    
    // Find existing conversation
    let conversation = this.conversations.find(conv => conv.id === conversationId);
    
    if (!conversation) {
      // Create new conversation structure
      conversation = {
        id: conversationId,
        participants: [senderId, recipientId].filter(Boolean),
        lastMessage: message.content || '',
        lastMessageTime: message.timestamp || new Date().toISOString(),
        unreadCount: (recipientId === this.currentUser.id) ? 1 : 0,
        projectTitle: message.subject || 'New Conversation',
        messageCount: 1
      };
      this.conversations.unshift(conversation);
      console.log('✨ New conversation created:', conversationId);
    } else {
      // Update existing conversation
      conversation.lastMessage = message.content || '';
      conversation.lastMessageTime = message.timestamp || new Date().toISOString();
      
      if (recipientId === this.currentUser.id) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }
      
      conversation.messageCount = (conversation.messageCount || 0) + 1;
      console.log('🔄 Conversation updated:', conversationId);
    }
    
    // Sort conversations by last message time
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

  // Get messages for a conversation
  public async getConversationMessages(conversationId: string): Promise<{ messages: Message[]; count: number }> {
    try {
      console.log('📨 Loading messages for conversation:', conversationId);
      
      const response = await fetch(`${this.baseURL}/api/conversations/${conversationId}/messages`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Store messages in local map
      if (data.messages && Array.isArray(data.messages)) {
        data.messages.forEach((msg: Message) => {
          this.messages.set(msg.id, msg);
        });
      }
      
      console.log(`✅ Loaded ${data.messages?.length || 0} messages for conversation`);
      return data;
    } catch (error) {
      console.error('❌ Failed to get conversation messages:', error);
      throw error;
    }
  }

  // Mark message as read
  public markAsRead(messageId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark_read', {
        messageId: messageId,
        userId: this.currentUser?.id
      });
    }
    
    // Update local message
    const message = this.messages.get(messageId);
    if (message) {
      message.read = true;
      this.messages.set(messageId, message);
    }
  }

  // ENHANCED: Event listener management
  public on<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    console.log(`📡 Event listener added for: ${event}`);
  }

  public off<T = any>(event: string, callback: EventCallback<T>): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
        console.log(`📡 Event listener removed for: ${event}`);
      }
    }
  }

  private emit<T = any>(event: string, data: T): void {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)!;
      console.log(`📡 Emitting event: ${event} to ${callbacks.length} listeners`);
      
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Disconnect WebSocket
  public disconnect(): void {
    console.log('🔌 Disconnecting messaging service...');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.conversations = [];
    this.messages.clear();
    
    console.log('🔌 Messaging service disconnected');
  }

  // Get connection status
  public isConnectedToWebSocket(): boolean {
    return this.socket !== null && this.isConnected;
  }

  // Reconnect manually
  public async reconnect(): Promise<boolean> {
    console.log('🔄 Manual reconnection requested');
    this.disconnect();
    
    if (this.currentUser?.id) {
      return await this.initialize(this.currentUser.id);
    } else {
      console.warn('⚠️ Cannot reconnect without user');
      return false;
    }
  }

  // Get service status
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
}

// Create and export singleton instance
const messagingService = new MessagingService();

// Auto-initialize if user is available (for browser environments)
if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    const currentUser = messagingService.getCurrentUser();
    if (currentUser && currentUser.id) {
      console.log('🚀 Auto-initializing messaging service for user:', currentUser.id);
      try {
        await messagingService.initialize(currentUser.id);
        console.log('✅ Auto-initialization completed');
      } catch (error) {
        console.error('❌ Auto-initialization failed:', error);
      }
    } else {
      console.log('⚠️ No user found for auto-initialization');
    }
  });
  
  // Expose to window for debugging (TypeScript-safe)
  (window as any).messagingService = messagingService;
}

// Export both default and named exports for compatibility
export default messagingService;
export { messagingService }; // Named export for existing imports
export type { User, Message, Conversation, MessageData, ServiceStatus };