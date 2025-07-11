// src/services/messagingService.ts
// Complete messaging service with user discovery and enhanced features

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
  unreadCount?: number;
}

export interface User {
  id: string;
  name: string;
  type: 'client' | 'talent';
  email?: string;
  location?: string;
  avatar?: string;
  rating?: number;
  hourlyRate?: number;
  specialties?: string[];
  company?: string;
  bio?: string;
  portfolioUrl?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  status?: 'active' | 'suspended' | 'deleted';
}

interface MessageEventHandlers {
  message: (message: Message) => void;
  conversation_created: (conversation: Conversation) => void;
  message_read: (messageId: string) => void;
  user_typing: (data: { userId: string; conversationId: string }) => void;
  user_online: (data: { userId: string; isOnline: boolean }) => void;
  users_updated: (users: User[]) => void;
}

class MessagingService {
  private eventHandlers: Partial<MessageEventHandlers> = {};
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private users: Map<string, User> = new Map();
  private currentUserId: string | null = null;
  private socket: any = null;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 3;

  constructor() {
    this.loadFromLocalStorage();
    this.setupCrossTabSync();
    this.setupPeriodicSync();
  }

  // ===========================================
  // CONNECTION MANAGEMENT
  // ===========================================

  async connect(userId: string): Promise<void> {
    this.currentUserId = userId;
    console.log('🔌 Messaging service connecting for user:', userId);
    
    try {
      // Load user's data from localStorage
      this.loadFromLocalStorage();
      
      // Load available users for discovery
      await this.loadAvailableUsers();
      
      // Load conversations from server
      await this.loadConversationsFromServer();
      
      // Try to connect WebSocket if available
      this.connectWebSocket();
      
      // Update user online status
      await this.updateOnlineStatus(true);
      
      // Emit connected event for UI
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('socket_connected'));
      }, 100);
      
      console.log('✅ Messaging service initialized');
      console.log(`📊 Loaded ${this.conversations.size} conversations, ${Array.from(this.messages.values()).reduce((total, msgs) => total + msgs.length, 0)} total messages`);
      
    } catch (error) {
      console.error('❌ Failed to connect messaging service:', error);
      // Still try to work with local data
      this.loadFromLocalStorage();
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.currentUserId) {
      this.updateOnlineStatus(false).catch(console.warn);
    }
    
    this.currentUserId = null;
    this.connectionAttempts = 0;
    console.log('📴 Messaging service disconnected');
    window.dispatchEvent(new CustomEvent('socket_disconnected'));
  }

  // ===========================================
  // USER DISCOVERY & MANAGEMENT
  // ===========================================

  async getAvailableUsers(filterType?: 'client' | 'talent', searchQuery?: string): Promise<User[]> {
    try {
      // Try to load fresh data from server
      await this.loadAvailableUsers();
      
      let users = Array.from(this.users.values());
      
      // Exclude current user
      users = users.filter(user => user.id !== this.currentUserId);
      
      // Filter by type
      if (filterType) {
        users = users.filter(user => user.type === filterType);
      }
      
      // Filter by search query
      if (searchQuery) {
        users = this.searchUsers(users, searchQuery);
      }
      
      return users;
      
    } catch (error) {
      console.error('❌ Failed to get available users:', error);
      return [];
    }
  }

  private async loadAvailableUsers(): Promise<void> {
    try {
      const response = await fetch(`${window.location.origin}/api/users/discovery`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-id': this.currentUserId || ''
        }
      });

      if (response.ok) {
        const users: User[] = await response.json();
        
        // Update users map
        users.forEach(user => {
          this.users.set(user.id, {
            ...user,
            lastSeen: user.lastSeen ? new Date(user.lastSeen) : new Date()
          });
        });
        
        // Cache users for offline access
        this.cacheUsers(users);
        
        // Emit event for UI updates
        this.emit('users_updated', users);
        
        console.log(`📥 Loaded ${users.length} available users`);
      } else {
        console.warn('⚠️ Failed to load users from server, using cache');
        this.loadCachedUsers();
      }
    } catch (error) {
      console.error('❌ Error loading users:', error);
      this.loadCachedUsers();
    }
  }

  private loadCachedUsers(): void {
    try {
      const cachedUsers = localStorage.getItem('available_users');
      if (cachedUsers) {
        const users: User[] = JSON.parse(cachedUsers);
        users.forEach(user => {
          this.users.set(user.id, {
            ...user,
            lastSeen: user.lastSeen ? new Date(user.lastSeen) : new Date()
          });
        });
        console.log(`📂 Loaded ${users.length} cached users`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load cached users:', error);
    }
  }

  private cacheUsers(users: User[]): void {
    try {
      localStorage.setItem('available_users', JSON.stringify(users));
      localStorage.setItem('users_cache_timestamp', Date.now().toString());
    } catch (error) {
      console.warn('⚠️ Failed to cache users:', error);
    }
  }

  searchUsers(users: User[], query: string): User[] {
    if (!query.trim()) return users;
    
    const searchTerm = query.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.location?.toLowerCase().includes(searchTerm) ||
      user.specialties?.some(specialty => specialty.toLowerCase().includes(searchTerm)) ||
      user.company?.toLowerCase().includes(searchTerm)
    );
  }

  sortUsers(users: User[], sortBy: 'online' | 'rating' | 'rate' | 'name'): User[] {
    return [...users].sort((a, b) => {
      switch (sortBy) {
        case 'online':
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          return 0;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'rate':
          return (a.hourlyRate || 0) - (b.hourlyRate || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }

  async getUserProfile(userId: string): Promise<User | null> {
    try {
      // Check cache first
      const cachedUser = this.users.get(userId);
      if (cachedUser) return cachedUser;
      
      // Fetch from server
      const response = await fetch(`${window.location.origin}/api/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-id': this.currentUserId || ''
        }
      });

      if (response.ok) {
        const user: User = await response.json();
        user.lastSeen = user.lastSeen ? new Date(user.lastSeen) : new Date();
        this.users.set(user.id, user);
        return user;
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch user profile:', error);
    }

    return null;
  }

  getUserById(userId: string): User | null {
    return this.users.get(userId) || null;
  }

  getUserDisplayName(userId: string): string {
    const user = this.getUserById(userId);
    if (user) return user.name;
    
    // Fallback to localStorage users
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const foundUser = users.find((u: any) => u.id === userId);
      if (foundUser) return foundUser.name;
    } catch (error) {
      console.warn('⚠️ Error parsing users from localStorage:', error);
    }
    
    return `User ${userId.slice(-4)}`;
  }

  // ===========================================
  // CONVERSATION MANAGEMENT
  // ===========================================

  async createConversationWithUser(
    targetUserId: string,
    projectId?: string,
    projectTitle?: string
  ): Promise<Conversation> {
    if (!this.currentUserId) {
      throw new Error('User not connected');
    }

    // Check if conversation already exists
    const existingConversation = this.findConversationBetweenUsers(this.currentUserId, targetUserId);
    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const conversation: Conversation = {
      id: conversationId,
      participants: [this.currentUserId, targetUserId],
      projectId,
      projectTitle: projectTitle || 'Direct Message',
      createdAt: new Date(),
      updatedAt: new Date(),
      unreadCount: 0
    };
    
    this.addConversation(conversation);
    
    // Try to sync with server
    try {
      await this.syncConversationWithServer(conversation);
    } catch (error) {
      console.warn('⚠️ Failed to sync conversation with server:', error);
    }
    
    this.emit('conversation_created', conversation);
    console.log('✅ Conversation created:', conversationId);
    
    return conversation;
  }

  private async syncConversationWithServer(conversation: Conversation): Promise<void> {
    try {
      const response = await fetch(`${window.location.origin}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': this.currentUserId || ''
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          participants: conversation.participants,
          projectId: conversation.projectId,
          projectTitle: conversation.projectTitle
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Conversation synced with server:', result);
      
    } catch (error) {
      console.warn('⚠️ Failed to sync conversation with server:', error);
    }
  }

  private async loadConversationsFromServer(): Promise<void> {
    try {
      const response = await fetch(`${window.location.origin}/api/conversations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-id': this.currentUserId || ''
        }
      });

      if (response.ok) {
        const conversations: Conversation[] = await response.json();
        
        // Update conversations map
        conversations.forEach(conversation => {
          this.conversations.set(conversation.id, {
            ...conversation,
            createdAt: new Date(conversation.createdAt),
            updatedAt: new Date(conversation.updatedAt),
            lastMessage: conversation.lastMessage ? {
              ...conversation.lastMessage,
              timestamp: new Date(conversation.lastMessage.timestamp)
            } : undefined
          });
        });
        
        console.log(`📥 Loaded ${conversations.length} conversations from server`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load conversations from server:', error);
    }
  }

  private findConversationBetweenUsers(userId1: string, userId2: string): Conversation | null {
    for (const conversation of this.conversations.values()) {
      if (conversation.participants.includes(userId1) && conversation.participants.includes(userId2)) {
        return conversation;
      }
    }
    return null;
  }

  // ===========================================
  // MESSAGE MANAGEMENT
  // ===========================================

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
      // Ensure conversation exists
      this.ensureConversationExists(conversationId, senderId, receiverId);
      
      // Send via API
      const success = await this.sendMessageViaAPI(message);
      
      // Always add to local storage (so sender sees message immediately)
      this.addMessage(message);
      this.updateConversationLastMessage(conversationId, message);
      
      // Broadcast to other tabs/windows
      this.broadcastMessage(message);
      
      // Emit event for UI update
      this.emit('message', message);
      
      if (success) {
        console.log('✅ Message sent successfully');
        // Also add for the receiver in localStorage (for same-device messaging)
        this.addMessageForUser(message, receiverId);
      } else {
        console.warn('⚠️ Message stored locally only, server delivery uncertain');
      }
      
      return message;

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Still store locally so UI works
      this.addMessage(message);
      this.updateConversationLastMessage(conversationId, message);
      this.emit('message', message);
      
      throw new Error('Message saved locally, but server delivery failed');
    }
  }

  private async sendMessageViaAPI(message: Message): Promise<boolean> {
    try {
      console.log('🔄 Sending message via /api/contact/talent');
      
      const response = await fetch(`${window.location.origin}/api/contact/talent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': this.currentUserId || ''
        },
        body: JSON.stringify({
          conversationId: message.conversationId,
          senderId: message.senderId,
          receiverId: message.receiverId,
          content: message.content,
          type: message.type,
          timestamp: message.timestamp.toISOString(),
          messageId: message.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Message sent via API:', data);
        return true;
      } else {
        console.warn('⚠️ API returned non-OK status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ API request failed:', error);
      return false;
    }
  }

  async sendFileMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    file: File
  ): Promise<Message> {
    // For now, just send a text message about the file
    // You can enhance this later with actual file upload
    const content = `📎 File shared: ${file.name} (${Math.round(file.size / 1024)}KB)`;
    
    const message = await this.sendMessage(conversationId, senderId, receiverId, content, 'file');
    
    // Add file metadata
    message.metadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
    
    return message;
  }

  // ===========================================
  // WEBSOCKET MANAGEMENT
  // ===========================================

  private connectWebSocket(): void {
    try {
      if (typeof window !== 'undefined' && (window as any).io) {
        const io = (window as any).io;
        this.socket = io(window.location.origin, {
          transports: ['websocket', 'polling'],
          timeout: 5000,
          query: { userId: this.currentUserId }
        });

        this.socket.on('connect', () => {
          console.log('🔌 WebSocket connected');
          this.connectionAttempts = 0;
          window.dispatchEvent(new CustomEvent('socket_connected'));
        });

        this.socket.on('new_message', (data: any) => {
          console.log('📨 Received real-time message:', data);
          this.handleIncomingMessage(data);
        });

        this.socket.on('user_online', (data: any) => {
          console.log('👤 User online status:', data);
          this.handleUserOnlineStatus(data);
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 WebSocket disconnected');
          window.dispatchEvent(new CustomEvent('socket_disconnected'));
          this.attemptReconnection();
        });

        this.socket.on('error', (error: any) => {
          console.error('❌ WebSocket error:', error);
          window.dispatchEvent(new CustomEvent('socket_error'));
        });

        // Join user room for real-time notifications
        this.socket.emit('join_user_room', { userId: this.currentUserId });

      } else {
        console.warn('⚠️ Socket.IO not available, using polling mode');
        this.startPolling();
      }
    } catch (error) {
      console.warn('⚠️ WebSocket initialization failed:', error);
      this.startPolling();
    }
  }

  private attemptReconnection(): void {
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      this.connectionAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, 2000 * this.connectionAttempts);
    } else {
      console.warn('⚠️ Max reconnection attempts reached, switching to polling mode');
      this.startPolling();
    }
  }

  private startPolling(): void {
    // Fallback polling for messages when WebSocket is not available
    const pollInterval = setInterval(async () => {
      if (!this.currentUserId) {
        clearInterval(pollInterval);
        return;
      }
      
      try {
        await this.pollForNewMessages();
      } catch (error) {
        console.warn('⚠️ Polling failed:', error);
      }
    }, 5000); // Poll every 5 seconds
  }

  private async pollForNewMessages(): Promise<void> {
    try {
      const response = await fetch(`${window.location.origin}/api/messages/poll`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-id': this.currentUserId || ''
        }
      });

      if (response.ok) {
        const newMessages = await response.json();
        newMessages.forEach((messageData: any) => {
          this.handleIncomingMessage(messageData);
        });
      }
    } catch (error) {
      console.warn('⚠️ Polling request failed:', error);
    }
  }

  private handleIncomingMessage(data: any): void {
    const message: Message = {
      id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: data.conversationId || data.conversation_id,
      senderId: data.senderId || data.sender_id,
      receiverId: data.receiverId || data.receiver_id,
      content: data.content,
      timestamp: new Date(data.timestamp || Date.now()),
      type: data.type || 'text',
      metadata: data.metadata,
      read: false,
      filtered: data.filtered
    };

    // Only process if it's for current user
    if (message.receiverId === this.currentUserId) {
      this.addMessage(message);
      this.updateConversationLastMessage(message.conversationId, message);
      this.emit('message', message);
    }
  }

  private handleUserOnlineStatus(data: any): void {
    const { userId, isOnline } = data;
    
    // Update user online status
    const user = this.users.get(userId);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.users.set(userId, user);
    }
    
    this.emit('user_online', { userId, isOnline });
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  private ensureConversationExists(conversationId: string, senderId: string, receiverId: string): void {
    if (!this.conversations.has(conversationId)) {
      const conversation: Conversation = {
        id: conversationId,
        participants: [senderId, receiverId],
        projectTitle: 'Direct Message',
        createdAt: new Date(),
        updatedAt: new Date(),
        unreadCount: 0
      };
      
      this.addConversation(conversation);
      console.log('✅ Created new conversation:', conversationId);
    }
  }

  private addMessageForUser(message: Message, userId: string): void {
    const userKey = `messaging_data_${userId}`;
    try {
      const existingData = localStorage.getItem(userKey);
      let userData = {
        conversations: [],
        messages: [],
        timestamp: Date.now(),
        userId: userId
      };

      if (existingData) {
        userData = JSON.parse(existingData);
      }

      // Add conversation if not exists
      const conversations = new Map(userData.conversations);
      if (!conversations.has(message.conversationId)) {
        const conversation: Conversation = {
          id: message.conversationId,
          participants: [message.senderId, message.receiverId],
          projectTitle: 'Direct Message',
          createdAt: new Date(),
          updatedAt: new Date(),
          unreadCount: 0
        };
        conversations.set(message.conversationId, conversation);
      }

      // Add message
      const messages = new Map(userData.messages);
      const conversationMessages = messages.get(message.conversationId) || [];
      
      if (!conversationMessages.find(m => m.id === message.id)) {
        conversationMessages.push(message);
        conversationMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        messages.set(message.conversationId, conversationMessages);
        
        // Update conversation last message
        const conversation = conversations.get(message.conversationId);
        if (conversation) {
          conversation.lastMessage = message;
          conversation.updatedAt = new Date();
          if (conversation.unreadCount !== undefined) {
            conversation.unreadCount++;
          }
          conversations.set(message.conversationId, conversation);
        }
      }

      // Save back to localStorage
      userData.conversations = Array.from(conversations.entries());
      userData.messages = Array.from(messages.entries());
      userData.timestamp = Date.now();
      
      localStorage.setItem(userKey, JSON.stringify(userData));
      
      console.log(`✅ Message added to ${userId}'s local storage`);
    } catch (error) {
      console.warn(`⚠️ Failed to add message for user ${userId}:`, error);
    }
  }

  private setupCrossTabSync(): void {
    window.addEventListener('storage', (event) => {
      if (event.key === 'messaging_broadcast') {
        try {
          const broadcastData = JSON.parse(event.newValue || '{}');
          if (broadcastData.type === 'new_message' && broadcastData.message) {
            const message = broadcastData.message;
            if (message.receiverId === this.currentUserId && !this.getMessages(message.conversationId).find(m => m.id === message.id)) {
              this.handleIncomingMessage(message);
            }
          }
        } catch (error) {
          console.warn('⚠️ Error processing broadcast message:', error);
        }
      }
    });
  }

  private broadcastMessage(message: Message): void {
    try {
      const broadcastData = {
        type: 'new_message',
        message: message,
        timestamp: Date.now()
      };
      localStorage.setItem('messaging_broadcast', JSON.stringify(broadcastData));
      
      setTimeout(() => {
        localStorage.removeItem('messaging_broadcast');
      }, 1000);
    } catch (error) {
      console.warn('⚠️ Failed to broadcast message:', error);
    }
  }

  private setupPeriodicSync(): void {
    // Sync data every 30 seconds
    setInterval(async () => {
      if (this.currentUserId) {
        try {
          await this.loadAvailableUsers();
          await this.loadConversationsFromServer();
        } catch (error) {
          console.warn('⚠️ Periodic sync failed:', error);
        }
      }
    }, 30000);
  }

  private async updateOnlineStatus(isOnline: boolean): Promise<void> {
    if (!this.currentUserId) return;
    
    try {
      const response = await fetch(`${window.location.origin}/api/users/${this.currentUserId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-id': this.currentUserId
        },
        body: JSON.stringify({ isOnline })
      });

      if (response.ok) {
        console.log(`✅ Updated online status: ${isOnline}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to update online status:', error);
    }
  }

  // ===========================================
  // PUBLIC API METHODS
  // ===========================================

  getConversations(userId?: string): Conversation[] {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) return [];

    return Array.from(this.conversations.values())
      .filter(conv => conv.participants.includes(targetUserId))
      .sort((a, b) => {
        const aTime = a.lastMessage?.timestamp || a.updatedAt;
        const bTime = b.lastMessage?.timestamp || b.updatedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
  }

  getMessages(conversationId: string): Message[] {
    return (this.messages.get(conversationId) || []).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  markAsRead(messageId: string): void {
    for (const messages of this.messages.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message && message.receiverId === this.currentUserId) {
        message.read = true;
        this.saveToLocalStorage();
        this.emit('message_read', messageId);
        
        // Also update on server
        this.markMessageAsReadOnServer(messageId).catch(console.warn);
        break;
      }
    }
  }

  private async markMessageAsReadOnServer(messageId: string): Promise<void> {
    try {
      await fetch(`${window.location.origin}/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-id': this.currentUserId || ''
        }
      });
    } catch (error) {
      console.warn('⚠️ Failed to mark message as read on server:', error);
    }
  }

  getUnreadCount(userId?: string): number {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) return 0;

    let count = 0;
    for (const messages of this.messages.values()) {
      count += messages.filter(m => m.receiverId === targetUserId && !m.read).length;
    }
    return count;
  }

  getUnreadCountForConversation(conversationId: string): number {
    if (!this.currentUserId) return 0;
    
    const messages = this.getMessages(conversationId);
    return messages.filter(m => m.receiverId === this.currentUserId && !m.read).length;
  }

  // ===========================================
  // EVENT HANDLING
  // ===========================================

  on<K extends keyof MessageEventHandlers>(event: K, handler: MessageEventHandlers[K]): void {
    this.eventHandlers[event] = handler;
  }

  off<K extends keyof MessageEventHandlers>(event: K): void {
    delete this.eventHandlers[event];
  }

  private emit<K extends keyof MessageEventHandlers>(event: K, ...args: Parameters<MessageEventHandlers[K]>): void {
    const handler = this.eventHandlers[event];
    if (handler) {
      (handler as any)(...args);
    }
  }

  // ===========================================
  // LOCAL STORAGE MANAGEMENT
  // ===========================================

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

  private saveToLocalStorage(): void {
    if (!this.currentUserId) return;
    
    try {
      const data = {
        conversations: Array.from(this.conversations.entries()),
        messages: Array.from(this.messages.entries()),
        timestamp: Date.now(),
        userId: this.currentUserId
      };
      localStorage.setItem(`messaging_data_${this.currentUserId}`, JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ Failed to save to localStorage:', error);
    }
  }

  private loadFromLocalStorage(): void {
    if (!this.currentUserId) return;
    
    try {
      const data = localStorage.getItem(`messaging_data_${this.currentUserId}`);
      if (data) {
        const parsed = JSON.parse(data);
        
        if (parsed.conversations) {
          this.conversations = new Map(parsed.conversations.map(([id, conv]: [string, any]) => [
            id,
            {
              ...conv,
              createdAt: new Date(conv.createdAt),
              updatedAt: new Date(conv.updatedAt),
              lastMessage: conv.lastMessage ? {
                ...conv.lastMessage,
                timestamp: new Date(conv.lastMessage.timestamp)
              } : undefined
            }
          ]));
        }
        
        if (parsed.messages) {
          this.messages = new Map(parsed.messages.map(([id, msgs]: [string, any[]]) => [
            id,
            msgs.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
          ]));
        }
        
        console.log(`📂 Loaded messaging data for user ${this.currentUserId}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from localStorage:', error);
    }
  }

  clearData(): void {
    if (this.currentUserId) {
      localStorage.removeItem(`messaging_data_${this.currentUserId}`);
    }
    localStorage.removeItem('available_users');
    localStorage.removeItem('users_cache_timestamp');
    this.conversations.clear();
    this.messages.clear();
    this.users.clear();
    console.log('🗑️ Messaging data cleared');
  }

  // ===========================================
  // DEVELOPMENT/DEBUG METHODS
  // ===========================================

  getDebugInfo(): any {
    return {
      currentUserId: this.currentUserId,
      conversationsCount: this.conversations.size,
      messagesCount: Array.from(this.messages.values()).reduce((total, msgs) => total + msgs.length, 0),
      usersCount: this.users.size,
      socketConnected: this.socket?.connected || false,
      connectionAttempts: this.connectionAttempts
    };
  }

  // Force refresh all data
  async refreshAll(): Promise<void> {
    if (!this.currentUserId) return;
    
    try {
      await Promise.all([
        this.loadAvailableUsers(),
        this.loadConversationsFromServer()
      ]);
      console.log('🔄 All data refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
    }
  }
}

// Create and export singleton instance
export const messagingService = new MessagingService();
export default messagingService;