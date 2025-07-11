import { io, Socket } from 'socket.io-client';
import { fileService, FileAttachment } from './fileService';
import { messageFilterService } from './messageFilterService';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  originalContent?: string; // Store original before filtering
  timestamp: Date;
  type: 'text' | 'file' | 'payment_request' | 'payment_release' | 'escrow_created';
  metadata?: {
    fileId?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    paymentAmount?: number;
    paymentCurrency?: string;
    escrowId?: string;
  };
  read: boolean;
  flagged?: boolean;
  flagReason?: string;
  flaggedBy?: string;
  flaggedAt?: string;
  filtered?: boolean;
  violations?: any[];
}

interface Conversation {
  id: string;
  participants: string[];
  projectId?: string;
  projectTitle?: string;
  lastMessage?: Message;
  createdAt: Date;
  updatedAt: Date;
}

class MessagingService {
  private socket: Socket | null = null;
  private conversations: Conversation[] = [];
  private messages: Message[] = [];
  private listeners: Map<string, Function[]> = new Map();
  private currentUserId: string | null = null;

  constructor() {
    this.loadFromStorage();
  }

  connect(userId: string) {
    // Store current user ID for authentication checks
    this.currentUserId = userId;
    
    // Connect to the WebSocket server using the environment variable
    const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL || 'wss://voicecastingpro.onrender.com';
    console.log('Connecting to WebSocket server:', websocketUrl);
    
    this.socket = io(websocketUrl, {
      auth: { userId }
    });

    // Handle connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected successfully');
      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('socket_connected'));
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('socket_error', { detail: error }));
    });

    this.socket.on('message', (message: Message) => {
      // Verify message is for authenticated user
      if (this.isAuthorizedForMessage(message)) {
        this.addMessage(message);
        this.emit('message', message);
      }
    });

    this.socket.on('conversation_created', (conversation: Conversation) => {
      // Verify user is participant in conversation
      if (this.isAuthorizedForConversation(conversation)) {
        this.addConversation(conversation);
        this.emit('conversation_created', conversation);
      }
    });

    // Simulate real-time with storage events for demo
    window.addEventListener('storage', (e) => {
      if (e.key === 'messages') {
        this.loadFromStorage();
        this.emit('messages_updated', this.messages);
      }
    });
  }

  disconnect() {
    this.currentUserId = null;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private isAuthorizedForMessage(message: Message): boolean {
    if (!this.currentUserId) return false;
    return message.senderId === this.currentUserId || message.receiverId === this.currentUserId;
  }

  private isAuthorizedForConversation(conversation: Conversation): boolean {
    if (!this.currentUserId) return false;
    return conversation.participants.includes(this.currentUserId);
  }

  private validateUserAccess(userId: string): boolean {
    return this.currentUserId === userId;
  }

  async createConversation(
    participantIds: string[], 
    projectId?: string,
    projectTitle?: string
  ): Promise<Conversation> {
    // Verify current user is one of the participants
    if (!this.currentUserId || !participantIds.includes(this.currentUserId)) {
      throw new Error('Unauthorized: You can only create conversations you participate in');
    }

    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participants: participantIds,
      projectId,
      projectTitle,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.addConversation(conversation);
    
    if (this.socket) {
      this.socket.emit('create_conversation', conversation);
    }

    return conversation;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    content: string,
    type: Message['type'] = 'text',
    metadata?: Message['metadata']
  ): Promise<Message> {
    // Verify sender is the authenticated user
    if (!this.validateUserAccess(senderId)) {
      throw new Error('Unauthorized: You can only send messages as yourself');
    }

    // Verify user is participant in conversation
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation || !this.isAuthorizedForConversation(conversation)) {
      throw new Error('Unauthorized: You are not a participant in this conversation');
    }

    // Filter message content for off-platform contact attempts
    const filterResult = messageFilterService.filterMessage(content);
    
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId,
      receiverId,
      content: filterResult.filteredContent,
      originalContent: filterResult.filteredContent !== content ? content : undefined,
      timestamp: new Date(),
      type,
      metadata,
      read: false,
      filtered: filterResult.filteredContent !== content,
      violations: filterResult.violations.length > 0 ? filterResult.violations : undefined
    };

    // Auto-flag messages with violations
    if (filterResult.requiresReview || filterResult.violations.some(v => v.severity === 'high')) {
      message.flagged = true;
      message.flagReason = 'Automatic: Off-platform contact attempt detected';
      message.flaggedAt = new Date().toISOString();
    }

    // Block message if it contains high-severity violations and action is block
    if (!filterResult.isAllowed) {
      throw new Error('Message blocked: Contains prohibited content. Please keep all communication within the platform.');
    }

    this.addMessage(message);

    // Update conversation's last message
    if (conversation) {
      conversation.lastMessage = message;
      conversation.updatedAt = new Date();
      this.saveToStorage();
    }

    if (this.socket) {
      this.socket.emit('send_message', message);
    }

    return message;
  }

  async sendFileMessage(
    conversationId: string,
    senderId: string,
    receiverId: string,
    file: File
  ): Promise<Message> {
    // Verify sender is the authenticated user
    if (!this.validateUserAccess(senderId)) {
      throw new Error('Unauthorized: You can only send files as yourself');
    }

    try {
      // Upload file first
      const attachment = await fileService.uploadFile(file, senderId, conversationId);
      
      // Create message with file metadata
      const content = `📎 Shared file: ${file.name}`;
      const metadata = {
        fileId: attachment.id,
        fileName: attachment.name,
        fileType: attachment.type,
        fileSize: attachment.size
      };

      return await this.sendMessage(
        conversationId,
        senderId,
        receiverId,
        content,
        'file',
        metadata
      );
    } catch (error) {
      throw new Error(`Failed to send file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendPaymentRequest(
    conversationId: string,
    senderId: string,
    receiverId: string,
    amount: number,
    currency: string = 'USD',
    description: string
  ): Promise<Message> {
    // Verify sender is the authenticated user
    if (!this.validateUserAccess(senderId)) {
      throw new Error('Unauthorized: You can only send payment requests as yourself');
    }

    const content = `💰 Payment request: ${currency} $${amount} - ${description}`;
    const metadata = {
      paymentAmount: amount,
      paymentCurrency: currency
    };

    return await this.sendMessage(
      conversationId,
      senderId,
      receiverId,
      content,
      'payment_request',
      metadata
    );
  }

  async sendEscrowNotification(
    conversationId: string,
    senderId: string,
    receiverId: string,
    escrowId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<Message> {
    // Verify sender is the authenticated user
    if (!this.validateUserAccess(senderId)) {
      throw new Error('Unauthorized: You can only send escrow notifications as yourself');
    }

    const content = `🔒 Escrow payment created: ${currency} $${amount} - Funds secured and ready for project start`;
    const metadata = {
      escrowId,
      paymentAmount: amount,
      paymentCurrency: currency
    };

    return await this.sendMessage(
      conversationId,
      senderId,
      receiverId,
      content,
      'escrow_created',
      metadata
    );
  }

  getConversations(userId: string): Conversation[] {
    // Verify user is requesting their own conversations
    if (!this.validateUserAccess(userId)) {
      return []; // Return empty array for unauthorized access
    }

    return this.conversations
      .filter(c => c.participants.includes(userId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getMessages(conversationId: string): Message[] {
    // Verify user has access to this conversation
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation || !this.isAuthorizedForConversation(conversation)) {
      return []; // Return empty array for unauthorized access
    }

    return this.messages
      .filter(m => m.conversationId === conversationId)
      .filter(m => this.isAuthorizedForMessage(m)) // Double-check message authorization
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  markAsRead(messageId: string): void {
    const message = this.messages.find(m => m.id === messageId);
    if (message && this.isAuthorizedForMessage(message)) {
      message.read = true;
      this.saveToStorage();
    }
  }

  getUnreadCount(userId: string): number {
    // Verify user is requesting their own unread count
    if (!this.validateUserAccess(userId)) {
      return 0;
    }

    return this.messages.filter(m => 
      m.receiverId === userId && 
      !m.read && 
      this.isAuthorizedForMessage(m)
    ).length;
  }

  findConversation(participantIds: string[], projectId?: string): Conversation | null {
    // Verify current user is one of the participants
    if (!this.currentUserId || !participantIds.includes(this.currentUserId)) {
      return null;
    }

    return this.conversations.find(c => 
      c.participants.length === participantIds.length &&
      participantIds.every(id => c.participants.includes(id)) &&
      c.projectId === projectId
    ) || null;
  }

  // Admin functions - require special authorization
  getFlaggedMessages(): Message[] {
    // In production, this would require admin authentication
    return this.messages.filter(m => m.flagged || m.violations?.length);
  }

  flagMessage(messageId: string, reason: string, adminId: string): void {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.flagged = true;
      message.flagReason = reason;
      message.flaggedBy = adminId;
      message.flaggedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  deleteMessage(messageId: string): boolean {
    const messageIndex = this.messages.findIndex(m => m.id === messageId);
    if (messageIndex >= 0) {
      this.messages.splice(messageIndex, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  private addConversation(conversation: Conversation) {
    const existingIndex = this.conversations.findIndex(c => c.id === conversation.id);
    if (existingIndex >= 0) {
      this.conversations[existingIndex] = conversation;
    } else {
      this.conversations.push(conversation);
    }
    this.saveToStorage();
  }

  private addMessage(message: Message) {
    const existingIndex = this.messages.findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
      this.messages[existingIndex] = message;
    } else {
      this.messages.push(message);
    }
    this.saveToStorage();
  }

  private saveToStorage() {
    localStorage.setItem('conversations', JSON.stringify(this.conversations));
    localStorage.setItem('messages', JSON.stringify(this.messages));
  }

  private loadFromStorage() {
    try {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const messages = JSON.parse(localStorage.getItem('messages') || '[]');
      
      this.conversations = conversations.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
        lastMessage: c.lastMessage ? {
          ...c.lastMessage,
          timestamp: new Date(c.lastMessage.timestamp)
        } : undefined
      }));
      
      this.messages = messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load messaging data:', error);
      this.conversations = [];
      this.messages = [];
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const messagingService = new MessagingService();
export type { Message, Conversation };