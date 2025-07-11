// Complete Fixed messagingService.js
// Place this file in: src/services/messagingService.js

import { io } from 'socket.io-client';

class MessagingService {
  constructor() {
    this.socket = null;
    this.conversations = [];
    this.messages = [];
    this.userId = null;
    this.isConnectedFlag = false;
    this.connectionCallbacks = [];
    this.messageCallbacks = [];
    this.conversationCallbacks = [];
  }

  // Enhanced connection method with better error handling
  connect(userId) {
    try {
      this.userId = userId;
      
      if (this.socket && this.socket.connected) {
        console.log('✅ Already connected to messaging service');
        return;
      }

      console.log('🔌 Connecting to WebSocket server...');
      
      // Use the correct WebSocket URL for your deployment
      const wsUrl = window.location.hostname === 'localhost' 
        ? 'ws://localhost:3000' 
        : 'wss://voicecastingpro-platform.onrender.com';
      
      this.socket = io(wsUrl, {
        auth: { userId: userId },
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully with ID:', this.socket.id);
        this.isConnectedFlag = true;
        this.connectionCallbacks.forEach(callback => {
          try {
            callback(true);
          } catch (error) {
            console.error('Error in connection callback:', error);
          }
        });
      });

      this.socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        this.isConnectedFlag = false;
        this.connectionCallbacks.forEach(callback => {
          try {
            callback(false);
          } catch (error) {
            console.error('Error in disconnection callback:', error);
          }
        });
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        this.isConnectedFlag = false;
      });

      // Listen for incoming messages
      this.socket.on('new_message', (message) => {
        console.log('📨 Received new message:', message);
        this.handleNewMessage(message);
      });

      this.socket.on('message', (message) => {
        console.log('📨 Received message:', message);
        this.handleNewMessage(message);
      });

      this.socket.on('message_sent', (message) => {
        console.log('✅ Message sent confirmation:', message);
        this.handleMessageSent(message);
      });

      this.socket.on('conversation_created', (conversation) => {
        console.log('💬 New conversation created:', conversation);
        this.handleNewConversation(conversation);
      });

      this.socket.on('message_error', (error) => {
        console.error('❌ Message error:', error);
      });

      this.socket.on('conversation_error', (error) => {
        console.error('❌ Conversation error:', error);
      });

    } catch (error) {
      console.error('❌ Error connecting to messaging service:', error);
      this.isConnectedFlag = false;
    }
  }

  // Fixed getConversations method with proper error handling
  async getConversations() {
    try {
      console.log('🌐 Loading conversations from backend...');
      
      const authToken = this.getAuthToken();
      if (!authToken) {
        console.log('❌ No auth token available');
        return { conversations: [], count: 0 };
      }

      const response = await fetch('/api/messages/conversations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Conversations loaded:', data);
        
        // FIXED: Handle undefined participants properly
        const safeConversations = (data.conversations || []).map(conv => ({
          ...conv,
          id: conv.id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          participants: this.safeParticipantsArray(conv.participants),
          participantNames: Array.isArray(conv.participantNames) ? conv.participantNames : [],
          messages: Array.isArray(conv.messages) ? conv.messages : [],
          lastMessage: conv.lastMessage || '',
          lastMessageTime: conv.lastMessageTime || conv.created_at || new Date().toISOString(),
          unreadCount: conv.unreadCount || 0,
          projectTitle: conv.projectTitle || 'Conversation'
        }));
        
        this.conversations = safeConversations;
        return { conversations: safeConversations, count: safeConversations.length };
      } else {
        console.warn('⚠️ Backend conversations API not available:', response.status);
        
        // Fallback to localStorage
        const localConversations = this.getLocalConversations();
        return { conversations: localConversations, count: localConversations.length };
      }
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      
      // Fallback to localStorage
      const localConversations = this.getLocalConversations();
      return { conversations: localConversations, count: localConversations.length };
    }
  }

  // Helper method to safely handle participants array
  safeParticipantsArray(participants) {
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

  // Get conversations from localStorage as fallback
  getLocalConversations() {
    try {
      const stored = localStorage.getItem('conversations');
      if (stored) {
        const conversations = JSON.parse(stored);
        return conversations.map(conv => ({
          ...conv,
          participants: this.safeParticipantsArray(conv.participants),
          participantNames: Array.isArray(conv.participantNames) ? conv.participantNames : [],
          messages: Array.isArray(conv.messages) ? conv.messages : []
        }));
      }
    } catch (error) {
      console.error('Error loading local conversations:', error);
    }
    return [];
  }

  // Fixed findConversation method
  findConversation(participants) {
    if (!Array.isArray(participants) || participants.length < 2) {
      console.warn('⚠️ Invalid participants for findConversation:', participants);
      return null;
    }

    return this.conversations.find(conv => {
      // FIXED: Ensure conv.participants is always an array
      const convParticipants = this.safeParticipantsArray(conv.participants);
      
      // Check if all participants match (bidirectional)
      return participants.length === convParticipants.length &&
             participants.every(p => convParticipants.includes(p)) &&
             convParticipants.every(p => participants.includes(p));
    });
  }

  // Enhanced conversation creation
  async createConversation(participants, projectId = null, projectTitle = null) {
    try {
      if (!Array.isArray(participants) || participants.length < 2) {
        throw new Error('Invalid participants array');
      }

      // Check if conversation already exists
      const existingConv = this.findConversation(participants);
      if (existingConv) {
        console.log('✅ Conversation already exists:', existingConv.id);
        return existingConv;
      }

      const conversationData = {
        participants: participants,
        projectId: projectId,
        projectTitle: projectTitle || 'New Conversation'
      };

      // Try REST API first
      const authToken = this.getAuthToken();
      if (authToken) {
        try {
          const response = await fetch('/api/conversations', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(conversationData)
          });

          if (response.ok) {
            const conversation = await response.json();
            console.log('✅ Conversation created via API:', conversation);
            
            const safeConversation = {
              ...conversation,
              participants: this.safeParticipantsArray(conversation.participants),
              participantNames: Array.isArray(conversation.participantNames) ? conversation.participantNames : [],
              messages: Array.isArray(conversation.messages) ? conversation.messages : []
            };
            
            this.conversations.push(safeConversation);
            return safeConversation;
          }
        } catch (apiError) {
          console.warn('⚠️ API conversation creation failed:', apiError);
        }
      }

      // Try WebSocket
      if (this.socket && this.isConnectedFlag) {
        this.socket.emit('create_conversation', conversationData);
      }

      // Fallback: Create local conversation
      const localConversation = {
        id: `local_conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        participants: participants,
        participantNames: [],
        lastMessage: projectTitle || 'New conversation',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        projectTitle: projectTitle || 'New Conversation',
        messages: []
      };

      this.conversations.push(localConversation);
      this.saveLocalConversations();
      
      console.log('✅ Local conversation created:', localConversation);
      return localConversation;

    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      return null;
    }
  }

  // Enhanced message sending
  async sendMessage(conversationId, senderId, receiverId, content, type = 'text') {
    try {
      const messageData = {
        conversationId,
        senderId,
        receiverId,
        content,
        type,
        timestamp: new Date().toISOString()
      };

      let success = false;

      // Try REST API first
      const authToken = this.getAuthToken();
      if (authToken) {
        try {
          const response = await fetch('/api/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              conversationId,
              toId: receiverId,
              subject: type === 'text' ? 'Message' : 'File',
              message: content,
              messageType: type
            })
          });

          if (response.ok) {
            console.log('✅ Message sent via API');
            success = true;
          }
        } catch (apiError) {
          console.warn('⚠️ API message sending failed:', apiError);
        }
      }

      // Try WebSocket as backup
      if (!success && this.socket && this.isConnectedFlag) {
        this.socket.emit('send_message', messageData);
        console.log('📤 Message sent via WebSocket');
        success = true;
      }

      // Local fallback
      if (!success) {
        this.handleLocalMessage(messageData);
        success = true;
      }

      return success;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      return false;
    }
  }

  // Handle local message storage
  handleLocalMessage(messageData) {
    try {
      // Add to local messages
      const localMessage = {
        id: `local_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...messageData,
        status: 'local'
      };

      this.messages.push(localMessage);
      
      // Update conversation
      const conversation = this.conversations.find(conv => conv.id === messageData.conversationId);
      if (conversation) {
        conversation.lastMessage = messageData.content;
        conversation.lastMessageTime = messageData.timestamp;
        
        if (!conversation.messages) {
          conversation.messages = [];
        }
        conversation.messages.push(localMessage);
        
        this.saveLocalConversations();
      }

      console.log('📦 Message stored locally:', localMessage);
    } catch (error) {
      console.error('❌ Error handling local message:', error);
    }
  }

  // Get messages for a specific conversation
  async getConversationMessages(conversationId) {
    try {
      const authToken = this.getAuthToken();
      if (!authToken) {
        return this.getLocalConversationMessages(conversationId);
      }

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        console.warn('⚠️ Failed to load conversation messages:', response.status);
        return this.getLocalConversationMessages(conversationId);
      }
    } catch (error) {
      console.error('❌ Error loading conversation messages:', error);
      return this.getLocalConversationMessages(conversationId);
    }
  }

  // Get local conversation messages
  getLocalConversationMessages(conversationId) {
    const conversation = this.conversations.find(conv => conv.id === conversationId);
    if (conversation && conversation.messages) {
      return { messages: conversation.messages, count: conversation.messages.length };
    }
    return { messages: [], count: 0 };
  }

  // Get all messages for the user
  async getAllMessages() {
    try {
      const authToken = this.getAuthToken();
      if (!authToken) {
        return { messages: this.messages, count: this.messages.length };
      }

      const response = await fetch('/api/messages', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.messages = data.messages || [];
        return data;
      } else {
        console.warn('⚠️ Failed to load messages:', response.status);
        return { messages: this.messages, count: this.messages.length };
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      return { messages: this.messages, count: this.messages.length };
    }
  }

  // Handle incoming messages
  handleNewMessage(message) {
    try {
      // Ensure message has required properties
      const safeMessage = {
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        senderId: message.senderId || message.sender_id,
        content: message.content || message.message,
        timestamp: message.timestamp || message.created_at || new Date().toISOString(),
        type: message.type || 'text',
        conversationId: message.conversationId || message.conversation_id,
        ...message
      };

      // Add to messages array
      this.messages.push(safeMessage);

      // Update conversation
      const conversation = this.conversations.find(conv => conv.id === safeMessage.conversationId);
      if (conversation) {
        conversation.lastMessage = safeMessage.content || safeMessage.subject;
        conversation.lastMessageTime = safeMessage.timestamp;
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        
        if (!conversation.messages) {
          conversation.messages = [];
        }
        conversation.messages.push(safeMessage);
        
        this.saveLocalConversations();
      }

      // Trigger UI updates
      this.notifyMessageReceived(safeMessage);
    } catch (error) {
      console.error('❌ Error handling new message:', error);
    }
  }

  // Handle message sent confirmation
  handleMessageSent(message) {
    try {
      console.log('✅ Message sent successfully:', message);
      this.notifyMessageSent(message);
    } catch (error) {
      console.error('❌ Error handling message sent:', error);
    }
  }

  // Handle new conversations
  handleNewConversation(conversation) {
    try {
      // Ensure proper data structure
      const safeConversation = {
        ...conversation,
        id: conversation.id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        participants: this.safeParticipantsArray(conversation.participants),
        participantNames: Array.isArray(conversation.participantNames) ? conversation.participantNames : [],
        messages: Array.isArray(conversation.messages) ? conversation.messages : [],
        lastMessage: conversation.lastMessage || '',
        lastMessageTime: conversation.lastMessageTime || new Date().toISOString(),
        unreadCount: conversation.unreadCount || 0,
        projectTitle: conversation.projectTitle || 'Conversation'
      };

      // Check if conversation already exists
      const existingIndex = this.conversations.findIndex(conv => conv.id === safeConversation.id);
      if (existingIndex >= 0) {
        this.conversations[existingIndex] = safeConversation;
      } else {
        this.conversations.push(safeConversation);
      }
      
      this.saveLocalConversations();
      this.notifyConversationCreated(safeConversation);
    } catch (error) {
      console.error('❌ Error handling new conversation:', error);
    }
  }

  // Save conversations to localStorage
  saveLocalConversations() {
    try {
      localStorage.setItem('conversations', JSON.stringify(this.conversations));
    } catch (error) {
      console.error('Error saving local conversations:', error);
    }
  }

  // Notification methods (override these in your UI)
  notifyMessageReceived(message) {
    console.log('📨 New message received:', message);
    this.messageCallbacks.forEach(callback => {
      try {
        callback('received', message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }

  notifyMessageSent(message) {
    console.log('📤 Message sent:', message);
    this.messageCallbacks.forEach(callback => {
      try {
        callback('sent', message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }

  notifyConversationCreated(conversation) {
    console.log('💬 New conversation created:', conversation);
    this.conversationCallbacks.forEach(callback => {
      try {
        callback('created', conversation);
      } catch (error) {
        console.error('Error in conversation callback:', error);
      }
    });
  }

  // Event listeners
  onMessage(callback) {
    this.messageCallbacks.push(callback);
  }

  onConversation(callback) {
    this.conversationCallbacks.push(callback);
  }

  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback);
  }

  // Helper methods
  getAuthToken() {
    return localStorage.getItem('auth_token') ||
           localStorage.getItem('authToken') || 
           localStorage.getItem('token') || 
           localStorage.getItem('accessToken') || 
           localStorage.getItem('jwt');
  }

  isConnected() {
    return this.socket && this.socket.connected && this.isConnectedFlag;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnectedFlag = false;
    }
  }

  // Clear all data
  clearData() {
    this.conversations = [];
    this.messages = [];
    try {
      localStorage.removeItem('conversations');
    } catch (error) {
      console.error('Error clearing conversations:', error);
    }
  }

  // Mark conversation as read
  markConversationAsRead(conversationId) {
    const conversation = this.conversations.find(conv => conv.id === conversationId);
    if (conversation) {
      conversation.unreadCount = 0;
      this.saveLocalConversations();
    }
  }

  // Get unread message count
  getUnreadCount() {
    return this.conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
  }
}

// Export singleton instance
const messagingService = new MessagingService();

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('messaging')) {
    console.error('Messaging service error:', event.reason);
    event.preventDefault();
  }
});

export default messagingService;