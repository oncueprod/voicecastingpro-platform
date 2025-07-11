// server.js - Complete Backend Server for VoiceCasting Pro Messaging with Resend
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://voicecastingpro-platform.onrender.com",
      process.env.CORS_ORIGIN
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173", 
    "https://voicecastingpro-platform.onrender.com",
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024 // 50MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'audio/mp3',
      'audio/wav',
      'audio/mpeg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Configure Resend email service
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ Resend email service configured');
} else {
  console.warn('⚠️ Resend email service not configured (missing RESEND_API_KEY)');
}

// In-memory storage (replace with database in production)
const conversations = new Map();
const messages = new Map();
const users = new Map();
const connectedSockets = new Map();

// Helper functions
function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function filterContent(content) {
  // Content filtering to prevent off-platform contact sharing
  const forbiddenPatterns = [
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // Phone numbers
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
    /\b(?:whatsapp|telegram|skype|discord|snapchat|instagram|twitter|facebook)\b/gi, // Social media
    /\b(?:call|text|email)\s+me\b/gi, // Direct contact requests
    /\b(?:my|phone|number|contact)\b/gi // Contact info sharing
  ];

  let filtered = content;
  let isFiltered = false;

  forbiddenPatterns.forEach(pattern => {
    if (pattern.test(filtered)) {
      filtered = filtered.replace(pattern, '[FILTERED]');
      isFiltered = true;
    }
  });

  return { 
    content: filtered, 
    isFiltered, 
    originalContent: isFiltered ? content : undefined 
  };
}

// Helper function to get user email - implement based on your user system
async function getUserEmail(userId) {
  try {
    // Option 1: Demo users from environment variable
    if (process.env.DEMO_USERS) {
      const demoUsers = JSON.parse(process.env.DEMO_USERS);
      if (demoUsers[userId]) {
        return demoUsers[userId];
      }
    }
    
    // Option 2: Database lookup (implement this for production)
    // const user = await db.users.findById(userId);
    // return user?.email;
    
    // Option 3: API endpoint lookup
    // const response = await fetch(`${process.env.USER_API_URL}/users/${userId}`);
    // const user = await response.json();
    // return user.email;
    
    // Option 4: Hardcoded for testing (replace with real implementation)
    const testEmails = {
      'client_123': 'client@example.com',
      'talent_456': 'talent@example.com',
      'user_1752164361991_e4ogp44sg': 'test@example.com' // Your current user
    };
    
    return testEmails[userId];
    
  } catch (error) {
    console.warn('⚠️ Error looking up user email:', error);
    return null;
  }
}

async function sendEmailNotification(recipientId, senderName, messageContent, conversationTitle) {
  if (!resend) {
    console.log('📧 Email notification skipped (Resend not configured)');
    return;
  }

  try {
    // Get recipient email
    const recipientEmail = await getUserEmail(recipientId);
    
    if (!recipientEmail) {
      console.log(`📧 Email notification skipped (no email found for user: ${recipientId})`);
      return;
    }
    
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'VoiceCasting Pro <noreply@resend.dev>',
      to: [recipientEmail],
      subject: `New Message from ${senderName} - VoiceCasting Pro`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">VoiceCasting Pro</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">New Message Received</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <p style="color: #374151; margin-bottom: 10px;"><strong>From:</strong> ${senderName}</p>
              <p style="color: #374151; margin-bottom: 10px;"><strong>Project:</strong> ${conversationTitle || 'Direct Message'}</p>
              <p style="color: #374151; margin-bottom: 15px;"><strong>Message:</strong></p>
              <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; font-style: italic; color: #4b5563;">
                "${messageContent.length > 200 ? messageContent.substring(0, 200) + '...' : messageContent}"
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro.com'}/messages" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                View Message
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
              This is an automated notification from VoiceCasting Pro. 
              <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro.com'}/settings" style="color: #3b82f6;">Manage your notification preferences</a>
            </p>
          </div>
          
          <div style="background: #374151; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
            © 2024 VoiceCasting Pro. All rights reserved.
          </div>
        </div>
      `
    });

    if (error) {
      console.error('❌ Resend email error:', error);
    } else {
      console.log(`✅ Email notification sent via Resend to ${recipientEmail} (ID: ${data.id})`);
    }
  } catch (error) {
    console.error('❌ Failed to send email notification:', error);
  }
}

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'voicecasting-messaging-api',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    connectedClients: connectedSockets.size,
    emailService: resend ? 'resend-configured' : 'not-configured'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'voicecasting-messaging-api',
    version: '1.0.0'
  });
});

app.get('/status', (req, res) => {
  res.json({ 
    status: 'running',
    connectedClients: connectedSockets.size,
    conversations: conversations.size,
    totalMessages: Array.from(messages.values()).reduce((total, msgs) => total + msgs.length, 0),
    uptime: process.uptime(),
    emailService: resend ? 'enabled' : 'disabled'
  });
});

app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'running',
    connectedClients: connectedSockets.size,
    conversations: conversations.size,
    totalMessages: Array.from(messages.values()).reduce((total, msgs) => total + msgs.length, 0)
  });
});

// Basic authentication middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.headers['auth-token'];
  const userId = req.headers['user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'User ID required' });
  }
  
  req.userId = userId;
  next();
}

// File upload endpoint
app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = generateId('file');
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    console.log('📁 File uploaded:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      url: fileUrl
    });

    res.json({
      success: true,
      fileId: fileId,
      id: fileId,
      url: fileUrl,
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Get conversations for user
app.get('/api/conversations', authenticate, (req, res) => {
  try {
    const userId = req.userId;
    const userConversations = Array.from(conversations.values())
      .filter(conv => conv.participants.includes(userId))
      .map(conv => {
        const conversationMessages = messages.get(conv.id) || [];
        const lastMessage = conversationMessages[conversationMessages.length - 1];
        
        return {
          ...conv,
          last_message: lastMessage ? {
            id: lastMessage.id,
            conversation_id: lastMessage.conversationId,
            sender_id: lastMessage.senderId,
            recipient_id: lastMessage.receiverId,
            content: lastMessage.content,
            created_at: lastMessage.timestamp,
            type: lastMessage.type,
            read_at: lastMessage.read ? lastMessage.timestamp : null
          } : null,
          last_message_at: lastMessage?.timestamp || conv.createdAt
        };
      })
      .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

    res.json({
      success: true,
      conversations: userConversations
    });
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.get('/api/messages/conversations', authenticate, (req, res) => {
  // Alias for conversations endpoint
  try {
    const userId = req.userId;
    const userConversations = Array.from(conversations.values())
      .filter(conv => conv.participants.includes(userId));

    res.json({
      success: true,
      conversations: userConversations
    });
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a conversation
app.get('/api/conversations/:conversationId/messages', authenticate, (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userId;
    
    const conversation = conversations.get(conversationId);
    if (!conversation || !conversation.participants.includes(userId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversationMessages = messages.get(conversationId) || [];
    
    res.json({
      success: true,
      messages: conversationMessages.map(msg => ({
        id: msg.id,
        conversation_id: msg.conversationId,
        sender_id: msg.senderId,
        recipient_id: msg.receiverId,
        content: msg.content,
        filtered_content: msg.filteredContent || msg.content,
        is_filtered: msg.isFiltered || false,
        created_at: msg.timestamp,
        type: msg.type,
        metadata: msg.metadata,
        read_at: msg.read ? msg.timestamp : null
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message endpoint
app.post('/api/messages', authenticate, async (req, res) => {
  try {
    const { conversationId, senderId, receiverId, content, type = 'text', metadata } = req.body;
    
    if (!conversationId || !senderId || !receiverId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Filter content
    const filtered = filterContent(content);

    const message = {
      id: generateId('msg'),
      conversationId,
      senderId,
      receiverId,
      content: filtered.content,
      originalContent: filtered.originalContent,
      filteredContent: filtered.content,
      isFiltered: filtered.isFiltered,
      timestamp: new Date(),
      type,
      metadata,
      read: false
    };

    // Add message to storage
    if (!messages.has(conversationId)) {
      messages.set(conversationId, []);
    }
    messages.get(conversationId).push(message);

    // Update conversation
    const conversation = conversations.get(conversationId);
    if (conversation) {
      conversation.updatedAt = new Date();
      conversation.lastMessage = message;
    }

    // Emit to connected clients
    io.to(conversationId).emit('new_message', message);
    
    // Send to specific user if connected
    const receiverSocket = connectedSockets.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('new_message', message);
    }

    // Send email notification
    try {
      const senderName = senderId.includes('client') ? 'Client' : 'Voice Talent';
      await sendEmailNotification(
        receiverId,
        senderName,
        filtered.content,
        conversation?.projectTitle
      );
    } catch (emailError) {
      console.warn('⚠️ Email notification failed:', emailError);
    }

    console.log('✅ Message sent:', message.id);
    res.json({ success: true, message });
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Create conversation endpoint
app.post('/api/conversations', authenticate, (req, res) => {
  try {
    const { participants, projectId, projectTitle } = req.body;
    
    if (!participants || !Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ error: 'At least 2 participants required' });
    }

    // Check if conversation already exists
    const existing = Array.from(conversations.values()).find(conv => {
      return conv.participants.length === participants.length &&
             conv.participants.every(p => participants.includes(p));
    });

    if (existing) {
      return res.json({ success: true, conversation: existing });
    }

    const conversation = {
      id: generateId('conv'),
      participants,
      projectId,
      projectTitle,
      project_id: projectId,
      project_title: projectTitle,
      createdAt: new Date(),
      updatedAt: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    };

    conversations.set(conversation.id, conversation);
    
    // Emit to all participants
    participants.forEach(participantId => {
      const socket = connectedSockets.get(participantId);
      if (socket) {
        io.to(socket).emit('conversation_created', conversation);
      }
    });

    console.log('✅ Conversation created:', conversation.id);
    res.json({ success: true, conversation });
  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Contact talent endpoint (fallback for messaging)
app.post('/api/contact/talent', async (req, res) => {
  try {
    const { conversationId, senderId, receiverId, content, type = 'text', metadata, timestamp } = req.body;
    
    console.log('📨 Contact talent request:', { conversationId, senderId, receiverId });

    // Create conversation if it doesn't exist
    let conversation = conversations.get(conversationId);
    if (!conversation) {
      conversation = {
        id: conversationId || generateId('conv'),
        participants: [senderId, receiverId],
        projectTitle: 'Direct Message',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      conversations.set(conversation.id, conversation);
    }

    // Filter content
    const filtered = filterContent(content);

    const message = {
      id: generateId('msg'),
      conversationId: conversation.id,
      senderId,
      receiverId,
      content: filtered.content,
      originalContent: filtered.originalContent,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      type,
      metadata,
      read: false,
      isFiltered: filtered.isFiltered
    };

    // Add message to storage
    if (!messages.has(conversation.id)) {
      messages.set(conversation.id, []);
    }
    messages.get(conversation.id).push(message);

    // Update conversation
    conversation.updatedAt = new Date();
    conversation.lastMessage = message;

    // Send email notification
    try {
      const senderName = senderId.includes('client') ? 'Client' : 'Voice Talent';
      await sendEmailNotification(
        receiverId,
        senderName,
        filtered.content,
        conversation.projectTitle
      );
    } catch (emailError) {
      console.warn('⚠️ Email notification failed:', emailError);
    }

    console.log('✅ Contact message processed');
    res.json({ 
      success: true, 
      message: 'Message sent successfully',
      messageId: message.id,
      conversationId: conversation.id
    });
  } catch (error) {
    console.error('❌ Error in contact talent:', error);
    res.status(500).json({ error: 'Failed to process contact request' });
  }
});

// Mark message as read
app.post('/api/messages/:messageId/read', authenticate, (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    // Find and update message
    let messageFound = false;
    for (const conversationMessages of messages.values()) {
      const message = conversationMessages.find(m => m.id === messageId && m.receiverId === userId);
      if (message) {
        message.read = true;
        messageFound = true;
        
        // Emit read receipt
        const senderSocket = connectedSockets.get(message.senderId);
        if (senderSocket) {
          io.to(senderSocket).emit('message_read', { messageId });
        }
        break;
      }
    }

    if (!messageFound) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join_user', (userId) => {
    console.log('👤 User joined:', userId);
    connectedSockets.set(userId, socket.id);
    socket.userId = userId;
    
    // Join user to all their conversations
    const userConversations = Array.from(conversations.values())
      .filter(conv => conv.participants.includes(userId));
    
    userConversations.forEach(conv => {
      socket.join(conv.id);
    });
  });

  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
    console.log('💬 Joined conversation:', conversationId);
  });

  socket.on('send_message', async (data, callback) => {
    try {
      const { conversationId, senderId, receiverId, content, type = 'text', metadata } = data;

      // Filter content
      const filtered = filterContent(content);

      const message = {
        id: generateId('msg'),
        conversationId,
        senderId,
        receiverId,
        content: filtered.content,
        originalContent: filtered.originalContent,
        timestamp: new Date(),
        type,
        metadata,
        read: false,
        isFiltered: filtered.isFiltered
      };

      // Add to storage
      if (!messages.has(conversationId)) {
        messages.set(conversationId, []);
      }
      messages.get(conversationId).push(message);

      // Update conversation
      const conversation = conversations.get(conversationId);
      if (conversation) {
        conversation.updatedAt = new Date();
        conversation.lastMessage = message;
      }

      // Emit to conversation room
      io.to(conversationId).emit('new_message', message);
      
      // Send to specific user
      const receiverSocket = connectedSockets.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('new_message', message);
      }

      // Send email notification
      try {
        const senderName = senderId.includes('client') ? 'Client' : 'Voice Talent';
        await sendEmailNotification(
          receiverId,
          senderName,
          filtered.content,
          conversation?.projectTitle
        );
      } catch (emailError) {
        console.warn('⚠️ Email notification failed:', emailError);
      }

      console.log('✅ WebSocket message sent:', message.id);
      if (callback) callback({ success: true, message });
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  });

  socket.on('create_conversation', (data) => {
    try {
      const { participants, projectId, projectTitle } = data;

      const conversation = {
        id: generateId('conv'),
        participants,
        projectId,
        projectTitle,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      conversations.set(conversation.id, conversation);

      // Emit to all participants
      participants.forEach(participantId => {
        const participantSocket = connectedSockets.get(participantId);
        if (participantSocket) {
          io.to(participantSocket).emit('conversation_created', conversation);
        }
      });

      console.log('✅ WebSocket conversation created:', conversation.id);
    } catch (error) {
      console.error('❌ WebSocket conversation error:', error);
    }
  });

  socket.on('mark_read', (data) => {
    try {
      const { messageId } = data;
      
      // Find and update message
      for (const conversationMessages of messages.values()) {
        const message = conversationMessages.find(m => m.id === messageId);
        if (message) {
          message.read = true;
          
          // Emit read receipt
          const senderSocket = connectedSockets.get(message.senderId);
          if (senderSocket) {
            io.to(senderSocket).emit('message_read', { messageId });
          }
          break;
        }
      }
    } catch (error) {
      console.error('❌ Mark read error:', error);
    }
  });

  socket.on('user_typing', (data) => {
    try {
      const { conversationId } = data;
      const userId = socket.userId;
      
      if (userId && conversationId) {
        socket.to(conversationId).emit('user_typing', { userId, conversationId });
      }
    } catch (error) {
      console.error('❌ Typing event error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    
    // Remove from connected sockets
    for (const [userId, socketId] of connectedSockets.entries()) {
      if (socketId === socket.id) {
        connectedSockets.delete(userId);
        console.log('👤 User disconnected:', userId);
        break;
      }
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 VoiceCasting Pro Messaging Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 WebSocket ready for connections`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📧 Email service: ${resend ? 'Resend enabled' : 'Disabled'}`);
});

module.exports = { app, server, io };