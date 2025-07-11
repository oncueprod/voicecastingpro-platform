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
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = window.location.origin;
    this.loadFromStorage();
  }

  connect(userId: string) {
    // Store current user ID for authentication checks
    this.currentUserId = userId;
    
    // Connect to the WebSocket server using the environment variable
    const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL || 
                        import.meta.env.VITE_BACKEND_URL || 
                        'wss://voicecastingpro-platform.onrender.com';
    
    console.log('🔌 Connecting to WebSocket server:', websocketUrl);
    
    this.socket = io(websocketUrl, {
      auth: { userId },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    // Handle connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully with ID:', this.socket?.id);
      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('socket_connected'));
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
      // Dispatch custom event for components to listen to
      window.dispatchEvent(new CustomEvent('socket_error', { detail: error }));
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    this.socket.on('message', (message: Message) => {
      console.log('📨 Received WebSocket message:', message);
      
      // Verify message is for authenticated user
      if (this.isAuthorizedForMessage(message)) {
        this.addMessage(message);
        this.emit('message', message);
      }
    });

    this.socket.on('conversation_created', (conversation: Conversation) => {
      console.log('💬 Received WebSocket conversation created:', conversation);
      
      // Verify user is participant in conversation
      if (this.isAuthorizedForConversation(conversation)) {
        this.addConversation(conversation);
        this.emit('conversation_created', conversation);
      }
    });

    // Load initial data from backend
    this.loadConversationsFromBackend();

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
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private isAuthorizedForMessage(message: Message): boolean {
    if (!this.currentUserId) return false;
    return message.senderId === this.currentUserId || message.receiverId === this.currentUserId;
  }

  // FIXED: Added safety check for participants array
  private isAuthorizedForConversation(conversation: Conversation): boolean {
    if (!this.currentUserId) return false;
    // FIXED: Ensure participants is an array before calling includes
    const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
    return participants.includes(this.currentUserId);
  }

  private validateUserAccess(userId: string): boolean {
    return this.currentUserId === userId;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token') ||
           localStorage.getItem('authToken') || 
           localStorage.getItem('token') || 
           localStorage.getItem('accessToken') || 
           localStorage.getItem('jwt');
  }

  // FIXED: Load conversations from backend API with better error handling
  private async loadConversationsFromBackend() {
    if (!this.currentUserId) return;

    try {
      const authToken = this.getAuthToken();
      if (!authToken) {
        console.log('⚠️ No auth token found, skipping backend load');
        return;
      }

      console.log('🌐 Loading conversations from backend...');
      
      const response = await fetch(`${this.apiBaseUrl}/api/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend conversations loaded:', data.conversations?.length || 0);
        
        if (data.conversations && Array.isArray(data.conversations)) {
          const backendConversations: Conversation[] = data.conversations.map((conv: any) => ({
            id: conv.id,
            // FIXED: Ensure participants is always an array
            participants: this.safeParticipantsArray(conv.participants),
            projectId: conv.project_id,
            projectTitle: conv.project_title,
            lastMessage: conv.last_message ? {
              id: conv.last_message.id,
              conversationId: conv.last_message.conversation_id,
              senderId: conv.last_message.sender_id,
              receiverId: conv.last_message.recipient_id,
              content: conv.last_message.filtered_content || conv.last_message.content,
              originalContent: conv.last_message.is_filtered ? conv.last_message.content : undefined,
              timestamp: new Date(conv.last_message.created_at),
              type: conv.last_message.type || 'text',
              read: !!conv.last_message.read_at,
              filtered: !!conv.last_message.is_filtered
            } : undefined,
            createdAt: new Date(conv.created_at),
            updatedAt: new Date(conv.last_message_at || conv.created_at)
          }));

          // Merge with local conversations
          this.mergeBackendConversations(backendConversations);
        }
      } else {
        console.log('⚠️ Backend conversations API not available:', response.status);
      }
    } catch (error) {
      console.log('⚠️ Failed to load conversations from backend:', error);
    }
  }

  // FIXED: Added helper method to safely handle participants
  private safeParticipantsArray(participants: any): string[] {
    if (Array.isArray(participants)) {
      return participants;
    }
    
    if (typeof participants === 'string') {
      // Handle PostgreSQL array format: {user1,user2}
      return participants
        .replace(/[{}]/g, '')
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    }
    
    return [];
  }

  // FIXED: Load messages from backend API
  private async loadMessagesFromBackend(conversationId: string): Promise<Message[]> {
    if (!this.currentUserId) return [];

    try {
      const authToken = this.getAuthToken();
      if (!authToken) {
        console.log('⚠️ No auth token found, skipping backend load');
        return [];
      }

      console.log('🌐 Loading messages from backend for conversation:', conversationId);
      
      const response = await fetch(`${this.apiBaseUrl}/api/messages/conversations/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend messages loaded:', data.messages?.length || 0);
        
        if (data.messages && Array.isArray(data.messages)) {
          const backendMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            conversationId: msg.conversation_id,
            senderId: msg.sender_id,
            receiverId: msg.recipient_id,
            content: msg.filtered_content || msg.content,
            originalContent: msg.is_filtered ? msg.content : undefined,
            timestamp: new Date(msg.created_at),
            type: msg.type || 'text',
            metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
            read: !!msg.read_at,
            filtered: !!msg.is_filtered
          }));

          return backendMessages;
        }
      } else {
        console.log('⚠️ Backend messages API not available:', response.status);
      }
    } catch (error) {
      console.log('⚠️ Failed to load messages from backend:', error);
    }

    return [];
  }

  private mergeBackendConversations(backendConversations: Conversation[]) {
    const merged = [...this.conversations];
    
    backendConversations.forEach(backendConv => {
      const existingIndex = merged.findIndex(c => c.id === backendConv.id);
      if (existingIndex >= 0) {
        // Update existing conversation
        merged[existingIndex] = backendConv;
      } else {
        // Add new conversation
        merged.push(backendConv);
      }
    });

    this.conversations = merged.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    this.saveToStorage();
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

    console.log('💬 Creating conversation:', { participantIds, projectId, projectTitle });

    // Try backend API first
    try {
      const authToken = this.getAuthToken();
      if (authToken) {
        const response = await fetch(`${this.apiBaseUrl}/api/messages/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            recipientId: participantIds.find(id => id !== this.currentUserId),
            projectId,
            projectTitle
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Conversation created via backend:', data.conversation);
          
          const backendConversation: Conversation = {
            id: data.conversation.id,
            // FIXED: Ensure participants is always an array
            participants: this.safeParticipantsArray(data.conversation.participants),
            projectId: data.conversation.project_id,
            projectTitle: data.conversation.project_title,
            createdAt: new Date(data.conversation.created_at),
            updatedAt: new Date(data.conversation.created_at)
          };

          this.addConversation(backendConversation);
          
          if (this.socket) {
            this.socket.emit('create_conversation', backendConversation);
          }

          return backendConversation;
        }
      }
    } catch (error) {
      console.log('⚠️ Backend conversation creation failed, using fallback:', error);
    }

    // Fallback to local creation
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

    console.log('✅ Conversation created locally:', conversation);
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

    console.log('📤 Sending message:', { conversationId, content: content.substring(0, 50) + '...' });

    // Try backend API first
    try {
      const authToken = this.getAuthToken();
      if (authToken) {
        const response = await fetch(`${this.apiBaseUrl}/api/messages/conversations/${conversationId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            content,
            type,
            metadata
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Message sent via backend:', data.message);
          
          const backendMessage: Message = {
            id: data.message.id,
            conversationId: data.message.conversation_id,
            senderId: data.message.sender_id,
            receiverId: data.message.recipient_id,
            content: data.message.filtered_content || data.message.content,
            originalContent: data.message.is_filtered ? data.message.content : undefined,
            timestamp: new Date(data.message.created_at),
            type: data.message.type || 'text',
            metadata: data.message.metadata ? JSON.parse(data.message.metadata) : undefined,
            read: false,
            filtered: !!data.message.is_filtered
          };

          this.addMessage(backendMessage);

          // Update conversation's last message
          if (conversation) {
            conversation.lastMessage = backendMessage;
            conversation.updatedAt = new Date();
            this.saveToStorage();
          }

          if (this.socket) {
            this.socket.emit('send_message', backendMessage);
          }

          return backendMessage;
        }
      }
    } catch (error) {
      console.log('⚠️ Backend message sending failed, using fallback:', error);
    }

    // Fallback to local message creation with filtering
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

    console.log('✅ Message sent locally:', message);
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

    console.log('📎 Sending file message:', file.name);

    try {
      // Try backend API first for file upload
      const authToken = this.getAuthToken();
      if (authToken) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.apiBaseUrl}/api/messages/conversations/${conversationId}/attachments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ File uploaded via backend:', data);
          
          const backendMessage: Message = {
            id: data.message.id,
            conversationId: data.message.conversation_id,
            senderId: data.message.sender_id,
            receiverId: data.message.recipient_id,
            content: data.message.content,
            timestamp: new Date(data.message.created_at),
            type: 'file',
            metadata: {
              fileId: data.file.id,
              fileName: data.file.file_name,
              fileType: data.file.file_type,
              fileSize: data.file.file_size
            },
            read: false
          };

          this.addMessage(backendMessage);
          return backendMessage;
        }
      }
    } catch (error) {
      console.log('⚠️ Backend file upload failed, using fallback:', error);
    }

    // Fallback to local file handling
    try {
      // Upload file using fileService
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

  // FIXED: Added safety check for participants array
  getConversations(userId: string): Conversation[] {
    // Verify user is requesting their own conversations
    if (!this.validateUserAccess(userId)) {
      return []; // Return empty array for unauthorized access
    }

    return this.conversations
      .filter(c => {
        // FIXED: Ensure participants is an array before calling includes
        const participants = Array.isArray(c.participants) ? c.participants : [];
        return participants.includes(userId);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    // Verify user has access to this conversation
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation || !this.isAuthorizedForConversation(conversation)) {
      return []; // Return empty array for unauthorized access
    }

    // Try to load messages from backend first
    const backendMessages = await this.loadMessagesFromBackend(conversationId);
    
    // Merge with local messages
    let allMessages = [...this.messages.filter(m => m.conversationId === conversationId)];
    
    backendMessages.forEach(backendMsg => {
      const existingIndex = allMessages.findIndex(m => m.id === backendMsg.id);
      if (existingIndex >= 0) {
        allMessages[existingIndex] = backendMsg;
      } else {
        allMessages.push(backendMsg);
      }
    });

    // Filter to only messages the user is authorized to see
    allMessages = allMessages.filter(m => this.isAuthorizedForMessage(m));
    
    // Sort by timestamp
    allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Update local messages array
    this.messages = this.messages.filter(m => m.conversationId !== conversationId).concat(allMessages);
    this.saveToStorage();

    return allMessages;
  }

  markAsRead(messageId: string): void {
    const message = this.messages.find(m => m.id === messageId);
    if (message && this.isAuthorizedForMessage(message)) {
      message.read = true;
      this.saveToStorage();

      // Try to mark as read on backend too
      const authToken = this.getAuthToken();
      if (authToken) {
        fetch(`${this.apiBaseUrl}/api/messages/${messageId}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }).catch(error => {
          console.log('⚠️ Failed to mark message as read on backend:', error);
        });
      }
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

  // FIXED: Added safety check for participants array
  findConversation(participantIds: string[], projectId?: string): Conversation | null {
    // Verify current user is one of the participants
    if (!this.currentUserId || !participantIds.includes(this.currentUserId)) {
      return null;
    }

    return this.conversations.find(c => {
      // FIXED: Ensure participants is an array before calling includes and every
      const participants = Array.isArray(c.participants) ? c.participants : [];
      return participants.length === participantIds.length &&
             participantIds.every(id => participants.includes(id)) &&
             c.projectId === projectId;
    }) || null;
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
    try {
      const conversationsData = this.conversations.map(c => ({
        ...c,
        // FIXED: Ensure participants is always an array when saving
        participants: Array.isArray(c.participants) ? c.participants : [],
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lastMessage: c.lastMessage ? {
          ...c.lastMessage,
          timestamp: c.lastMessage.timestamp.toISOString()
        } : undefined
      }));

      const messagesData = this.messages.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString()
      }));

      localStorage.setItem('conversations', JSON.stringify(conversationsData));
      localStorage.setItem('messages', JSON.stringify(messagesData));
    } catch (error) {
      console.error('Failed to save messaging data to storage:', error);
    }
  }

  private loadFromStorage() {
    try {
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      const messages = JSON.parse(localStorage.getItem('messages') || '[]');
      
      this.conversations = conversations.map((c: any) => ({
        ...c,
        // FIXED: Ensure participants is always an array when loading
        participants: this.safeParticipantsArray(c.participants),
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