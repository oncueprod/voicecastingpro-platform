// messagingService.ts - COMPLETE WORKING FILE
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
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  projectTitle?: string;
}

class MessagingService {
  private conversations: Conversation[] = [];
  private currentUser: User | null = null;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    console.log('🔧 MessagingService initialized');
    this.currentUser = this.getCurrentUser();
  }

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const userData = localStorage.getItem('currentUser') || localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        console.log('📱 Current user loaded:', user.id);
        return user;
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
    }
    return null;
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
    
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (this.currentUser?.id) {
      headers['user-id'] = this.currentUser.id;
      headers['x-user-name'] = this.currentUser.name || 'Anonymous';
    }
    
    return headers;
  }

  async initialize(userId?: string): Promise<boolean> {
    console.log('🔄 Initializing messaging system...');
    
    try {
      await this.loadConversations(userId || this.currentUser?.id || '');
      console.log('✅ Messaging system initialized');
      return true;
    } catch (error) {
      console.error('❌ Init failed:', error);
      return false;
    }
  }

  async loadConversations(userId: string): Promise<Conversation[]> {
    console.log('🌐 Loading conversations...');
    
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
          lastMessage: conv.lastMessage || '',
          lastMessageTime: conv.lastMessageTime || new Date().toISOString(),
          unreadCount: Number(conv.unreadCount) || 0,
          projectTitle: conv.projectTitle || 'Conversation'
        };
      }).filter((conv: Conversation) => {
        try {
          return Array.isArray(conv.participants) && conv.participants.includes(userId);
        } catch {
          return false;
        }
      });

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

  async sendMessage(recipientId: string, content: string, senderName?: string): Promise<any> {
    if (!this.currentUser?.id) {
      throw new Error('No current user');
    }

    const messageData = {
      toId: recipientId,
      fromName: senderName || this.currentUser.name || 'Anonymous',
      subject: 'New Message',
      message: content,
      messageType: 'direct_message'
    };

    console.log('📤 Sending message:', messageData);

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Message sent:', result);
      return result;
    } catch (error) {
      console.error('❌ Send failed:', error);
      throw error;
    }
  }

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

  getStatus() {
    return {
      isConnected: true,
      hasUser: !!this.currentUser,
      conversationsCount: this.conversations.length
    };
  }
}

const messagingService = new MessagingService();

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