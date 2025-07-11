// src/services/messagingService.ts
// Complete messaging service that works with your existing backend

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
  private eventHandlers: Partial<MessageEventHandlers> = {};
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private currentUserId: string | null = null;
  private socket: any = null;

  constructor() {
    this.loadFromLocalStorage();
    this.setupCrossTabSync();
  }

  // Fixed connect method - resolves "connect is not a function" error
  async connect(userId: string): Promise<void> {
    this.currentUserId = userId;
    console.log('🔌 Messaging service connected for user:', userId);
    
    // Load user's data from localStorage
    this.loadFromLocalStorage();
    
    // Try to connect WebSocket if available
    this.connectWebSocket();
    
    // Emit connected event for UI
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('socket_connected'));
    }, 100);
    
    console.log('✅ Messaging service initialized');
    console.log(`📊 Loaded ${this.conversations.size} conversations, ${Array.from(this.messages.values()).reduce((total, msgs) => total + msgs.length, 0)} total messages`);
  }

  // Fixed disconnect method
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentUserId = null;
    console.log('📴 Messaging service disconnected');
    window.dispatchEvent(new CustomEvent('socket_disconnected'));
  }

  // Connect WebSocket if available (for real-time features)
  private connectWebSocket(): void {
    try {
      if (typeof window !== 'undefined' && (window as any).io) {
        const io = (window as any).io;
        this.socket = io(window.location.origin, {
          transports: ['websocket', 'polling'],
          timeout: 5000
        });

        this.socket.on('connect', () => {
          console.log('🔌 WebSocket connected for real-time messaging');
        });

        this.socket.on('new_message', (data: any) => {
          console.log('📨 Received real-time message:', data);
          this.handleIncomingMessage(data);
        });

        this.socket.on('disconnect', () => {
          console.log('🔌 WebSocket disconnected');
        });
      }
    } catch (error) {
      console.warn('⚠️ WebSocket not available, using local storage only');
    }
  }

  // Handle incoming real-time messages
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
      this.emit('message', message);
    }
  }

  // Send message using your existing /api/contact/talent endpoint
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
      
      // Send via your existing API
      const success = await this.sendMessageViaAPI(message);
      
      // Always add to local storage (so sender sees message immediately)
      this.addMessage(message);
      this.updateConversationLastMessage(conversationId, message);
      
      // Broadcast to other tabs/windows
      this.broadcastMessage(message);
      
      // Emit event for UI update
      this.emit('message', message);
      
      if (success) {
        console.log('✅ Message sent successfully and stored locally');
        
        // Also add for the receiver in localStorage (since they might be on the same device)
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

  // Send via your working /api/contact/talent endpoint
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
        console.log('✅ Message sent via /api/contact/talent:', data);
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

  // Ensure conversation exists locally
  private ensureConversationExists(conversationId: string, senderId: string, receiverId: string): void {
    if (!this.conversations.has(conversationId)) {
      const conversation: Conversation = {
        id: conversationId,
        participants: [senderId, receiverId],
        projectTitle: 'Direct Message',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.addConversation(conversation);
      console.log('✅ Created new conversation:', conversationId);
    }
  }

  // Add message for specific user (cross-user messaging on same device)
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
          updatedAt: new Date()
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

  // Setup cross-tab synchronization
  private setupCrossTabSync(): void {
    // Listen for storage events (messages from other tabs)
    window.addEventListener('storage', (event) => {
      if (event.key === 'messaging_broadcast') {
        try {
          const broadcastData = JSON.parse(event.newValue || '{}');
          if (broadcastData.type === 'new_message' && broadcastData.message) {
            const message = broadcastData.message;
            // Only process if it's for current user and not already in storage
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

  // Broadcast message to other tabs
  private broadcastMessage(message: Message): void {
    try {
      const broadcastData = {
        type: 'new_message',
        message: message,
        timestamp: Date.now()
      };
      localStorage.setItem('messaging_broadcast', JSON.stringify(broadcastData));
      
      // Clear the broadcast after a short delay
      setTimeout(() => {
        localStorage.removeItem('messaging_broadcast');
      }, 1000);
    } catch (error) {
      console.warn('⚠️ Failed to broadcast message:', error);
    }
  }

  // File upload (simplified for your system)
  async sendFileMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    file: File
  ): Promise<Message> {
    // For now, just send a text message about the file
    // You can enhance this later with actual file upload
    const content = `📎 File shared: ${file.name} (${Math.round(file.size / 1024)}KB)`;
    return await this.sendMessage(conversationId, senderId, receiverId, content, 'file');
  }

  // Create conversation
  async createConversation(
    participants: string[],
    projectId?: string,
    projectTitle?: string
  ): Promise<Conversation> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const conversation: Conversation = {
      id: conversationId,
      participants,
      projectId,
      projectTitle: projectTitle || 'Direct Message',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.addConversation(conversation);
    this.emit('conversation_created', conversation);
    
    console.log('✅ Conversation created:', conversationId);
    return conversation;
  }

  // Public API methods that your components use
  getConversations(userId?: string): Conversation[] {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId) return [];

    return Array.from(this.conversations.values())
      .filter(conv => conv.participants.includes(targetUserId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getMessages(conversationId: string): Message[] {
    return this.messages.get(conversationId) || [];
  }

  markAsRead(messageId: string): void {
    for (const messages of this.messages.values()) {
      const message = messages.find(m => m.id === messageId);
      if (message) {
        message.read = true;
        this.saveToLocalStorage();
        this.emit('message_read', messageId);
        break;
      }
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

  // Event handling methods
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

  // Local storage methods
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
      console.log(`💾 Saved messaging data for user ${this.currentUserId}`);
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
          this.conversations = new Map(parsed.conversations);
        }
        
        if (parsed.messages) {
          this.messages = new Map(parsed.messages);
        }
        
        console.log(`📂 Loaded messaging data for user ${this.currentUserId}`);
        console.log(`📊 Found ${this.conversations.size} conversations, ${Array.from(this.messages.values()).reduce((total, msgs) => total + msgs.length, 0)} messages`);
      } else {
        console.log(`📂 No existing messaging data for user ${this.currentUserId}`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from localStorage:', error);
    }
  }

  clearData(): void {
    if (this.currentUserId) {
      localStorage.removeItem(`messaging_data_${this.currentUserId}`);
    }
    this.conversations.clear();
    this.messages.clear();
    console.log('🗑️ Messaging data cleared');
  }
}

// Create and export singleton instance
export const messagingService = new MessagingService();
export default messagingService;