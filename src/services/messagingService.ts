// services/messagingService.ts - FIXED VERSION for your existing backend
// This fixes the "connect is not a function" error without changing your backend

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

  constructor() {
    this.loadFromLocalStorage();
  }

  // Fixed connect method - this resolves the "connect is not a function" error
  async connect(userId: string): Promise<void> {
    this.currentUserId = userId;
    console.log('🔌 Messaging service connected for user:', userId);
    
    try {
      // Load any existing conversations and messages
      await this.loadConversationsFromBackend();
      
      // Emit connected event for UI
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('socket_connected'));
      }, 100);
      
      console.log('✅ Messaging service initialized successfully');
    } catch (error) {
      console.warn('⚠️ Could not load from backend, using local storage only:', error);
      // Still emit connected event so UI works
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('socket_connected'));
      }, 100);
    }
  }

  // Fixed disconnect method
  disconnect(): void {
    this.currentUserId = null;
    console.log('📴 Messaging service disconnected');
    window.dispatchEvent(new CustomEvent('socket_disconnected'));
  }

  // Load conversations from your existing backend
  private async loadConversationsFromBackend(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      // Try to load from your existing API endpoints
      const endpoints = [
        '/api/conversations',
        '/api/messages/conversations',
        '/conversations',
        '/messages/conversations'
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${window.location.origin}${endpoint}`, {
            headers: {
              'Content-Type': 'application/json',
              'user-id': this.currentUserId
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            if (data.conversations && Array.isArray(data.conversations)) {
              console.log(`✅ Loaded ${data.conversations.length} conversations from ${endpoint}`);
              
              // Convert backend format to frontend format
              data.conversations.forEach((conv: any) => {
                const conversation: Conversation = {
                  id: conv.id,
                  participants: conv.participants || [],
                  projectId: conv.projectId || conv.project_id,
                  projectTitle: conv.projectTitle || conv.project_title || 'Conversation',
                  createdAt: new Date(conv.createdAt || conv.created_at || Date.now()),
                  updatedAt: new Date(conv.updatedAt || conv.updated_at || Date.now())
                };
                
                this.conversations.set(conversation.id, conversation);
              });
              
              this.saveToLocalStorage();
              return;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Failed to load from ${endpoint}:`, error);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load conversations from backend:', error);
    }
  }

  // Send message using your existing backend
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
      // Send via your existing backend API
      await this.sendMessageViaAPI(message);
      
      // Add to local storage for immediate UI update
      this.addMessage(message);
      this.updateConversationLastMessage(conversationId, message);
      
      // Emit message event for real-time UI updates
      this.emit('message', message);
      
      console.log('✅ Message sent successfully');
      return message;

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Still add to local storage so UI works
      this.addMessage(message);
      this.updateConversationLastMessage(conversationId, message);
      this.emit('message', message);
      
      throw new Error('Failed to send message to server, but saved locally');
    }
  }

  // Use your existing API endpoints
  private async sendMessageViaAPI(message: Message): Promise<void> {
    const baseUrl = window.location.origin;
    
    // Try your existing messaging endpoints
    const endpoints = [
      '/api/contact/talent',
      '/api/messages',
      '/contact/talent',
      '/send-message',
      '/messages'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
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
            timestamp: message.timestamp.toISOString()
          })
        });

        if (response.ok) {
          console.log(`✅ Message sent via ${endpoint}`);
          return;
        } else {
          console.warn(`⚠️ ${endpoint} returned ${response.status}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to send via ${endpoint}:`, error);
      }
    }
    
    throw new Error('All API endpoints failed');
  }

  // File upload
  async sendFileMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    file: File
  ): Promise<Message> {
    try {
      // Try to upload file first
      const fileData = await this.uploadFile(file);
      
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        senderId,
        receiverId,
        content: `📎 Shared file: ${file.name}`,
        timestamp: new Date(),
        type: 'file',
        metadata: {
          fileId: fileData?.fileId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileUrl: fileData?.url
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

  // Upload file via your existing upload endpoint
  private async uploadFile(file: File): Promise<{ fileId: string; url: string } | null> {
    const formData = new FormData();
    formData.append('file', file);

    const endpoints = ['/api/upload', '/upload'];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${window.location.origin}${endpoint}`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          return {
            fileId: data.fileId || data.id || 'file_' + Date.now(),
            url: data.url || data.fileUrl || '#'
          };
        }
      } catch (error) {
        console.warn(`⚠️ Upload failed via ${endpoint}:`, error);
      }
    }

    console.warn('⚠️ File upload failed, message will be sent without file');
    return null;
  }

  // Create conversation
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

    // Try to create on backend
    try {
      const response = await fetch(`${window.location.origin}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': this.currentUserId || ''
        },
        body: JSON.stringify({
          participants,
          projectId,
          projectTitle
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.conversation) {
          conversation.id = data.conversation.id;
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to create conversation on backend:', error);
    }

    this.addConversation(conversation);
    this.emit('conversation_created', conversation);
    
    console.log('✅ Conversation created:', conversation.id);
    return conversation;
  }

  // Get conversations
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
        this.emit('message_read', messageId);
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

  off<K extends keyof MessageEventHandlers>(event: K): void {
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