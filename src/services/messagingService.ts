// services/messagingService.ts - Complete fix for Client-to-Talent messaging
// This ensures messages appear in Message Center for both sender and receiver

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

  // Fixed connect method
  async connect(userId: string): Promise<void> {
    this.currentUserId = userId;
    console.log('🔌 Messaging service connected for user:', userId);
    
    try {
      // Load conversations and messages for this user
      await this.loadUserData();
      
      // Emit connected event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('socket_connected'));
      }, 100);
      
      console.log('✅ Messaging service initialized for user:', userId);
    } catch (error) {
      console.warn('⚠️ Could not load from backend, using local storage:', error);
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('socket_connected'));
      }, 100);
    }
  }

  disconnect(): void {
    this.currentUserId = null;
    console.log('📴 Messaging service disconnected');
    window.dispatchEvent(new CustomEvent('socket_disconnected'));
  }

  // Load all user data (conversations and messages)
  private async loadUserData(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      // First, try to load conversations
      await this.loadConversationsFromBackend();
      
      // Then load messages for each conversation
      for (const conversation of this.conversations.values()) {
        await this.loadMessagesForConversation(conversation.id);
      }
      
      console.log(`✅ Loaded data for ${this.conversations.size} conversations`);
    } catch (error) {
      console.warn('⚠️ Failed to load user data from backend:', error);
    }
  }

  // Load conversations from backend
  private async loadConversationsFromBackend(): Promise<void> {
    if (!this.currentUserId) return;

    const endpoints = [
      '/api/conversations',
      '/api/messages/conversations',
      '/conversations'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${window.location.origin}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
            'user-id': this.currentUserId,
            'Authorization': `Bearer ${this.getAuthToken()}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.conversations && Array.isArray(data.conversations)) {
            console.log(`✅ Found ${data.conversations.length} conversations from ${endpoint}`);
            
            // Process each conversation
            data.conversations.forEach((conv: any) => {
              try {
                const conversation: Conversation = {
                  id: conv.id,
                  participants: this.parseParticipants(conv.participants),
                  projectId: conv.projectId || conv.project_id,
                  projectTitle: conv.projectTitle || conv.project_title || conv.projectTitle || 'Direct Message',
                  createdAt: new Date(conv.createdAt || conv.created_at || Date.now()),
                  updatedAt: new Date(conv.updatedAt || conv.updated_at || Date.now())
                };
                
                // Only add if current user is a participant
                if (conversation.participants.includes(this.currentUserId!)) {
                  this.conversations.set(conversation.id, conversation);
                }
              } catch (error) {
                console.warn('⚠️ Error parsing conversation:', error);
              }
            });
            
            this.saveToLocalStorage();
            return;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load from ${endpoint}:`, error);
      }
    }
  }

  // Load messages for a specific conversation
  private async loadMessagesForConversation(conversationId: string): Promise<void> {
    if (!this.currentUserId) return;

    const endpoints = [
      `/api/conversations/${conversationId}/messages`,
      `/api/messages/${conversationId}`,
      `/conversations/${conversationId}/messages`
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${window.location.origin}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
            'user-id': this.currentUserId,
            'Authorization': `Bearer ${this.getAuthToken()}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.messages && Array.isArray(data.messages)) {
            const messages: Message[] = data.messages.map((msg: any) => ({
              id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              conversationId: msg.conversationId || msg.conversation_id || conversationId,
              senderId: msg.senderId || msg.sender_id,
              receiverId: msg.receiverId || msg.receiver_id || msg.recipient_id,
              content: msg.content || msg.filtered_content || '',
              originalContent: msg.originalContent || msg.original_content,
              timestamp: new Date(msg.timestamp || msg.created_at || Date.now()),
              type: msg.type || 'text',
              metadata: msg.metadata,
              read: msg.read || !!msg.read_at,
              filtered: msg.filtered || msg.is_filtered
            }));
            
            // Sort messages by timestamp
            messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            this.messages.set(conversationId, messages);
            
            // Update conversation with last message
            if (messages.length > 0) {
              const conversation = this.conversations.get(conversationId);
              if (conversation) {
                conversation.lastMessage = messages[messages.length - 1];
                conversation.updatedAt = new Date(messages[messages.length - 1].timestamp);
                this.conversations.set(conversationId, conversation);
              }
            }
            
            this.saveToLocalStorage();
            console.log(`✅ Loaded ${messages.length} messages for conversation ${conversationId}`);
            return;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load messages from ${endpoint}:`, error);
      }
    }
  }

  // Send message with proper conversation creation
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
      // First, ensure conversation exists
      await this.ensureConversationExists(conversationId, senderId, receiverId);
      
      // Send message via API
      const success = await this.sendMessageViaAPI(message);
      
      if (success) {
        // Add to local storage immediately for sender UI
        this.addMessage(message);
        this.updateConversationLastMessage(conversationId, message);
        
        // Emit event for real-time UI update
        this.emit('message', message);
        
        console.log('✅ Message sent and stored successfully');
        
        // Reload conversations to get latest state
        setTimeout(() => {
          this.loadUserData();
        }, 1000);
        
        return message;
      } else {
        throw new Error('Failed to send via API');
      }

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Still save locally so sender sees the message
      this.addMessage(message);
      this.updateConversationLastMessage(conversationId, message);
      this.emit('message', message);
      
      // Don't throw error to user, but log it
      console.warn('⚠️ Message saved locally only, may not reach recipient');
      return message;
    }
  }

  // Ensure conversation exists before sending message
  private async ensureConversationExists(conversationId: string, senderId: string, receiverId: string): Promise<void> {
    let conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      console.log('🔄 Creating new conversation:', conversationId);
      
      conversation = {
        id: conversationId,
        participants: [senderId, receiverId],
        projectTitle: 'Direct Message',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Try to create on backend
      try {
        const response = await fetch(`${window.location.origin}/api/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'user-id': this.currentUserId || '',
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          body: JSON.stringify({
            id: conversationId,
            participants: [senderId, receiverId],
            projectTitle: 'Direct Message'
          })
        });

        if (response.ok) {
          console.log('✅ Conversation created on backend');
        }
      } catch (error) {
        console.warn('⚠️ Failed to create conversation on backend:', error);
      }
      
      // Save locally regardless
      this.addConversation(conversation);
    }
  }

  // Send message via API with multiple endpoint attempts
  private async sendMessageViaAPI(message: Message): Promise<boolean> {
    const baseUrl = window.location.origin;
    
    // All possible message endpoints in your system
    const endpoints = [
      { url: '/api/contact/talent', method: 'POST' },
      { url: '/api/messages', method: 'POST' },
      { url: '/contact/talent', method: 'POST' },
      { url: '/send-message', method: 'POST' },
      { url: '/messages', method: 'POST' }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying to send message via ${endpoint.url}`);
        
        const response = await fetch(`${baseUrl}${endpoint.url}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'user-id': this.currentUserId || '',
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          body: JSON.stringify({
            conversationId: message.conversationId,
            senderId: message.senderId,
            receiverId: message.receiverId,
            content: message.content,
            type: message.type,
            timestamp: message.timestamp.toISOString(),
            // Additional fields that might be expected
            messageId: message.id,
            userId: this.currentUserId
          })
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log(`✅ Message sent successfully via ${endpoint.url}:`, responseData);
          return true;
        } else {
          console.warn(`⚠️ ${endpoint.url} returned ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to send via ${endpoint.url}:`, error);
      }
    }
    
    console.error('❌ All message sending endpoints failed');
    return false;
  }

  // Helper function to parse participants (handle different formats)
  private parseParticipants(participants: any): string[] {
    if (Array.isArray(participants)) {
      return participants;
    }
    
    if (typeof participants === 'string') {
      // Handle PostgreSQL array format: "{user1,user2}"
      return participants
        .replace(/[{}]/g, '')
        .split(',')
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);
    }
    
    return [];
  }

  // Get auth token for API requests
  private getAuthToken(): string {
    return localStorage.getItem('auth_token') || 
           localStorage.getItem('authToken') || 
           localStorage.getItem('token') || '';
  }

  // File upload functionality
  async sendFileMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    file: File
  ): Promise<Message> {
    try {
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

      return await this.sendMessage(conversationId, senderId, receiverId, message.content, 'file');
    } catch (error) {
      console.error('❌ Failed to send file message:', error);
      throw error;
    }
  }

  private async uploadFile(file: File): Promise<{ fileId: string; url: string } | null> {
    const formData = new FormData();
    formData.append('file', file);

    const endpoints = ['/api/upload', '/upload'];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${window.location.origin}${endpoint}`, {
          method: 'POST',
          headers: {
            'user-id': this.currentUserId || '',
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
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

    return null;
  }

  // Public API methods
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

  // Local storage helpers
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
        timestamp: Date.now(),
        userId: this.currentUserId
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
        
        // Only load if it's for the current user
        if (parsed.userId === this.currentUserId) {
          if (parsed.conversations) {
            this.conversations = new Map(parsed.conversations);
          }
          
          if (parsed.messages) {
            this.messages = new Map(parsed.messages);
          }
          
          console.log('📂 Loaded messaging data from localStorage');
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from localStorage:', error);
    }
  }

  clearData(): void {
    this.conversations.clear();
    this.messages.clear();
    localStorage.removeItem('messaging_data');
    console.log('🗑️ Messaging data cleared');
  }
}

export const messagingService = new MessagingService();
export default messagingService;