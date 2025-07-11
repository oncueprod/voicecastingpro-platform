// server.js - Complete backend server with messaging endpoints
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// =============================================
// MIDDLEWARE
// =============================================

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://voicecastingpro-platform.onrender.com',
    'https://voicecastingpro.netlify.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id']
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =============================================
// MOCK DATA STORAGE (Replace with your database)
// =============================================

// Mock users database
let users = [
  {
    id: 'user_1752164361991_e4ogp44sg', // Your current user ID from logs
    name: 'Current User',
    type: 'client',
    email: 'current@example.com',
    location: 'Your Location',
    avatar: '👤',
    isOnline: true,
    lastSeen: new Date().toISOString()
  },
  {
    id: 'talent_001',
    name: 'BJay Kaplan',
    type: 'talent',
    email: 'bjay@example.com',
    location: 'New York, NY',
    avatar: '🎙️',
    rating: 5.0,
    hourlyRate: 85,
    specialties: ['Commercials', 'Narrations'],
    company: null,
    bio: 'Professional voice talent with 5+ years experience',
    portfolioUrl: 'https://example.com/bjay',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    status: 'active'
  },
  {
    id: 'talent_002',
    name: 'Sarah Chen',
    type: 'talent',
    email: 'sarah@example.com',
    location: 'Los Angeles, CA',
    avatar: '🎤',
    rating: 4.9,
    hourlyRate: 95,
    specialties: ['Animation', 'Video Games', 'E-Learning'],
    company: null,
    bio: 'Versatile voice actor specializing in character voices',
    portfolioUrl: 'https://example.com/sarah',
    isOnline: false,
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'active'
  },
  {
    id: 'talent_003',
    name: 'Mike Rodriguez',
    type: 'talent',
    email: 'mike@example.com',
    location: 'Miami, FL',
    avatar: '🎵',
    rating: 4.8,
    hourlyRate: 75,
    specialties: ['Commercials', 'Radio', 'Podcasts'],
    company: null,
    bio: 'Radio veteran with a warm, engaging voice',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    status: 'active'
  },
  {
    id: 'client_001',
    name: 'Digital Marketing Agency',
    type: 'client',
    email: 'contact@digitalagency.com',
    location: 'Chicago, IL',
    avatar: '🏢',
    company: 'Digital Marketing Agency',
    bio: 'We create engaging commercials and promotional content',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    status: 'active'
  },
  {
    id: 'client_002',
    name: 'Podcast Productions',
    type: 'client',
    email: 'hello@podcastpro.com',
    location: 'Austin, TX',
    avatar: '🎧',
    company: 'Podcast Productions',
    bio: 'Podcast network looking for narrators and hosts',
    isOnline: false,
    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: 'active'
  }
];

// Mock conversations storage
let conversations = [];

// Mock messages storage
let messages = [];

// =============================================
// HEALTH CHECK ENDPOINTS
// =============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'VoiceCasting Pro API'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online',
    version: '1.0.0',
    endpoints: {
      messaging: 'active',
      users: 'active',
      conversations: 'active'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/status', (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// =============================================
// USER DISCOVERY & MANAGEMENT ENDPOINTS
// =============================================

// GET /api/users/discovery - Get available users for messaging
app.get('/api/users/discovery', (req, res) => {
  try {
    const currentUserId = req.headers['user-id'];
    const userType = req.query.type; // 'client' or 'talent'
    
    console.log('🔍 Discovery request from user:', currentUserId, 'for type:', userType);
    
    // Filter out current user and inactive users
    let availableUsers = users.filter(user => 
      user.id !== currentUserId && 
      user.status === 'active'
    );
    
    // Filter by type if specified
    if (userType && ['client', 'talent'].includes(userType)) {
      availableUsers = availableUsers.filter(user => user.type === userType);
    }
    
    // Update last seen for online users
    availableUsers = availableUsers.map(user => ({
      ...user,
      lastSeen: user.isOnline ? new Date().toISOString() : user.lastSeen
    }));
    
    console.log(`✅ Returning ${availableUsers.length} users for discovery`);
    res.json(availableUsers);
    
  } catch (error) {
    console.error('❌ Error in /api/users/discovery:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:userId - Get specific user profile
app.get('/api/users/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('👤 Profile request for user:', userId);
    
    const user = users.find(u => u.id === userId && u.status === 'active');
    
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ Returning user profile:', user.name);
    res.json(user);
    
  } catch (error) {
    console.error('❌ Error in /api/users/:userId:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/users/:userId/status - Update user online status
app.put('/api/users/:userId/status', (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.headers['user-id'];
    const { isOnline } = req.body;
    
    if (userId !== currentUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    console.log(`📱 Updating online status for ${userId}:`, isOnline);
    
    // Update user status in mock database
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].isOnline = isOnline;
      users[userIndex].lastSeen = new Date().toISOString();
    }
    
    console.log('✅ Online status updated');
    res.json({ 
      success: true,
      userId,
      isOnline,
      lastSeen: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in /api/users/:userId/status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// =============================================
// CONVERSATION MANAGEMENT ENDPOINTS
// =============================================

// POST /api/conversations - Create new conversation
app.post('/api/conversations', (req, res) => {
  try {
    const currentUserId = req.headers['user-id'];
    const { conversationId, participants, projectId, projectTitle } = req.body;
    
    console.log('💬 Creating conversation:', conversationId, 'between:', participants);
    
    // Validate participants
    if (!participants || participants.length !== 2) {
      return res.status(400).json({ error: 'Invalid participants' });
    }
    
    if (!participants.includes(currentUserId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check if conversation already exists
    const existingConv = conversations.find(conv => 
      conv.participants.includes(participants[0]) && 
      conv.participants.includes(participants[1])
    );
    
    if (existingConv) {
      console.log('✅ Conversation already exists:', existingConv.id);
      return res.json({ 
        success: true, 
        conversation: existingConv,
        message: 'Conversation already exists'
      });
    }
    
    // Create new conversation
    const conversation = {
      id: conversationId,
      participants,
      projectId,
      projectTitle: projectTitle || 'Direct Message',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageId: null
    };
    
    conversations.push(conversation);
    
    console.log('✅ Conversation created:', conversationId);
    res.json({ 
      success: true, 
      conversation,
      message: 'Conversation created successfully'
    });
    
  } catch (error) {
    console.error('❌ Error in /api/conversations:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/conversations - Get user's conversations
app.get('/api/conversations', (req, res) => {
  try {
    const currentUserId = req.headers['user-id'];
    
    console.log('📋 Loading conversations for user:', currentUserId);
    
    // Find conversations where user is a participant
    const userConversations = conversations
      .filter(conv => conv.participants.includes(currentUserId))
      .map(conv => {
        // Get last message for this conversation
        const lastMessage = messages
          .filter(msg => msg.conversationId === conv.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
        // Get unread count
        const unreadCount = messages
          .filter(msg => 
            msg.conversationId === conv.id && 
            msg.receiverId === currentUserId && 
            !msg.readAt
          ).length;
        
        return {
          ...conv,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content,
            timestamp: lastMessage.timestamp,
            senderId: lastMessage.senderId
          } : null,
          unreadCount
        };
      })
      .sort((a, b) => {
        const aTime = a.lastMessage?.timestamp || a.updatedAt;
        const bTime = b.lastMessage?.timestamp || b.updatedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    
    console.log(`✅ Returning ${userConversations.length} conversations`);
    res.json(userConversations);
    
  } catch (error) {
    console.error('❌ Error in /api/conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// =============================================
// MESSAGE MANAGEMENT ENDPOINTS
// =============================================

// POST /api/contact/talent - Send message (enhanced)
app.post('/api/contact/talent', (req, res) => {
  try {
    const currentUserId = req.headers['user-id'];
    const { 
      conversationId, 
      senderId, 
      receiverId, 
      content, 
      type = 'text',
      timestamp,
      messageId 
    } = req.body;
    
    console.log('📤 Contact talent message:', messageId, 'from:', senderId, 'to:', receiverId);
    
    // Validate sender
    if (senderId !== currentUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Create message object
    const message = {
      id: messageId,
      conversationId,
      senderId,
      receiverId,
      content,
      type,
      timestamp: timestamp || new Date().toISOString(),
      readAt: null,
      createdAt: new Date().toISOString()
    };
    
    // Store the message
    messages.push(message);
    
    // Update conversation last message
    const convIndex = conversations.findIndex(conv => conv.id === conversationId);
    if (convIndex !== -1) {
      conversations[convIndex].lastMessageId = messageId;
      conversations[convIndex].updatedAt = new Date().toISOString();
    }
    
    console.log('✅ Message stored:', messageId);
    
    res.json({ 
      success: true, 
      messageId,
      message: 'Message sent successfully',
      timestamp: message.timestamp
    });
    
  } catch (error) {
    console.error('❌ Error in /api/contact/talent:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/poll - Polling endpoint for new messages
app.get('/api/messages/poll', (req, res) => {
  try {
    const currentUserId = req.headers['user-id'];
    const lastPoll = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60000);
    
    // Find new messages for this user since last poll
    const newMessages = messages.filter(msg => 
      msg.receiverId === currentUserId && 
      new Date(msg.timestamp) > lastPoll &&
      !msg.readAt
    );
    
    res.json(newMessages);
    
  } catch (error) {
    console.error('❌ Error in /api/messages/poll:', error);
    res.status(500).json({ error: 'Failed to poll messages' });
  }
});

// PUT /api/messages/:messageId/read - Mark message as read
app.put('/api/messages/:messageId/read', (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.headers['user-id'];
    
    console.log(`👁️ Marking message ${messageId} as read for user ${currentUserId}`);
    
    // Find and update message
    const messageIndex = messages.findIndex(msg => 
      msg.id === messageId && msg.receiverId === currentUserId
    );
    
    if (messageIndex !== -1) {
      messages[messageIndex].readAt = new Date().toISOString();
      console.log('✅ Message marked as read');
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Error in /api/messages/:messageId/read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// GET /api/conversations/:conversationId/messages - Get messages for conversation
app.get('/api/conversations/:conversationId/messages', (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.headers['user-id'];
    
    // Verify user is participant in conversation
    const conversation = conversations.find(conv => 
      conv.id === conversationId && conv.participants.includes(currentUserId)
    );
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    // Get messages for this conversation
    const conversationMessages = messages
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    res.json(conversationMessages);
    
  } catch (error) {
    console.error('❌ Error in /api/conversations/:conversationId/messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// =============================================
// ERROR HANDLING MIDDLEWARE
// =============================================

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path);
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message
  });
});

// =============================================
// SERVER STARTUP
// =============================================

server.listen(PORT, () => {
  console.log('🚀 Server started on port', PORT);
  console.log('✅ Messaging API endpoints active:');
  console.log('   - GET  /api/users/discovery');
  console.log('   - GET  /api/users/:userId');
  console.log('   - PUT  /api/users/:userId/status');
  console.log('   - POST /api/conversations');
  console.log('   - GET  /api/conversations');
  console.log('   - POST /api/contact/talent');
  console.log('   - GET  /api/messages/poll');
  console.log('   - PUT  /api/messages/:messageId/read');
  console.log('   - GET  /health');
  console.log('   - GET  /api/status');
  console.log(`📡 Server running at: ${PORT === 5000 ? 'http://localhost:5000' : `https://voicecastingpro-platform.onrender.com`}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;