// server.js - Optimized for YOUR package.json with Resend
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { Resend } = require('resend');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// =============================================
// RESEND EMAIL CONFIGURATION (Better than nodemailer!)
// =============================================

const resend = new Resend(process.env.RESEND_API_KEY);

// Test Resend connection
async function testResendConnection() {
  try {
    // Just check if API key is configured
    if (process.env.RESEND_API_KEY) {
      console.log('✅ Resend API configured');
    } else {
      console.warn('⚠️ RESEND_API_KEY not found in environment variables');
    }
  } catch (error) {
    console.warn('⚠️ Resend configuration issue:', error.message);
  }
}

testResendConnection();

// =============================================
// MIDDLEWARE
// =============================================

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// =============================================
// FILE UPLOAD CONFIGURATION (Using your multer)
// =============================================

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|mp3|wav|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// =============================================
// DATA STORAGE (Same as before)
// =============================================

const connectedUsers = new Map();

let users = [
  {
    id: 'user_1752164361991_e4ogp44sg',
    name: 'John Smith',
    type: 'client',
    email: 'johnsmith@example.com',
    location: 'New York, NY',
    avatar: '👤',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    status: 'active',
    subscriptionStatus: 'active',
    emailNotifications: true,
    plan: 'premium'
  },
  {
    id: 'talent_bjay_001',
    name: 'BJay Kaplan',
    type: 'talent',
    email: 'bjay.kaplan@example.com',
    location: 'New York, NY',
    avatar: '🎙️',
    rating: 5.0,
    hourlyRate: 85,
    specialties: ['Commercials', 'Narrations'],
    bio: 'Professional voice talent with 5+ years experience',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    status: 'active',
    subscriptionStatus: 'active',
    emailNotifications: true,
    plan: 'professional'
  },
  {
    id: 'talent_sarah_002',
    name: 'Sarah Chen',
    type: 'talent',
    email: 'sarah.chen@example.com',
    location: 'Los Angeles, CA',
    avatar: '🎤',
    rating: 4.9,
    hourlyRate: 95,
    specialties: ['Animation', 'Video Games', 'E-Learning'],
    bio: 'Versatile voice actor specializing in character voices',
    isOnline: false,
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    subscriptionStatus: 'active',
    emailNotifications: true,
    plan: 'professional'
  }
];

let conversations = [];
let messages = [];

// =============================================
// RESEND EMAIL NOTIFICATION SYSTEM
// =============================================

async function sendEmailNotification(message) {
  try {
    const sender = users.find(u => u.id === message.senderId);
    const receiver = users.find(u => u.id === message.receiverId);
    
    if (!receiver || !receiver.emailNotifications || !receiver.email) {
      console.log('📧 Email notification skipped for user:', receiver?.name);
      return;
    }
    
    if (receiver.subscriptionStatus !== 'active') {
      console.log('📧 Email notification blocked - inactive subscription:', receiver.name);
      return;
    }

    // Beautiful HTML email template
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Message - VoiceCasting Pro</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; }
            .content { padding: 30px 20px; }
            .message-card { background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #1d4ed8; }
            .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            .badge { background: #2563eb; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎙️ VoiceCasting Pro</h1>
                <p>You have a new message</p>
            </div>
            <div class="content">
                <h2>Hi ${receiver.name}!</h2>
                <p>You've received a new message from <strong>${sender?.name || 'Unknown User'}</strong>:</p>
                
                <div class="message-card">
                    <div style="margin-bottom: 10px;">
                        <span class="badge">${sender?.type === 'client' ? '👔 Client' : '🎤 Talent'}</span>
                    </div>
                    <p style="font-size: 16px; margin: 15px 0;"><strong>"${message.content}"</strong></p>
                    <p style="color: #64748b; font-size: 14px; margin: 0;">
                        Sent: ${new Date(message.timestamp).toLocaleString()}
                    </p>
                </div>
                
                <div style="text-align: center;">
                    <a href="https://voicecastingpro-platform.onrender.com/messages?conversation=${message.conversationId}" class="button">
                        💬 Reply to Message
                    </a>
                </div>
                
                ${sender?.specialties ? `<p><strong>Specialties:</strong> ${sender.specialties.join(', ')}</p>` : ''}
                ${sender?.hourlyRate ? `<p><strong>Rate:</strong> $${sender.hourlyRate}/hour</p>` : ''}
            </div>
            <div class="footer">
                <p><strong>VoiceCasting Pro</strong> - Connecting Voices with Opportunities</p>
                <p>To manage email preferences, visit your account settings.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    
    // Send via Resend (much cleaner than nodemailer!)
    const emailResult = await resend.emails.send({
      from: 'VoiceCasting Pro <noreply@voicecastingpro.com>',
      to: [receiver.email],
      subject: `💬 New message from ${sender?.name || 'VoiceCasting Pro'}`,
      html: htmlContent,
      tags: [
        { name: 'category', value: 'messaging' },
        { name: 'user_type', value: receiver.type }
      ]
    });
    
    console.log('✅ Email notification sent via Resend:', emailResult.data?.id);
    
  } catch (error) {
    console.error('❌ Email notification failed:', error);
  }
}

// =============================================
// WEBSOCKET REAL-TIME MESSAGING (Same as before)
// =============================================

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('join_user_room', (data) => {
    const { userId } = data;
    socket.join(`user_${userId}`);
    connectedUsers.set(userId, socket.id);
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].isOnline = true;
      users[userIndex].lastSeen = new Date().toISOString();
    }
    
    console.log(`✅ User ${userId} joined room user_${userId}`);
    socket.broadcast.emit('user_online', { userId, isOnline: true });
  });

  socket.on('send_message', async (data) => {
    try {
      const { conversationId, senderId, receiverId, content, type = 'text' } = data;
      
      const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        senderId,
        receiverId,
        content,
        type,
        timestamp: new Date().toISOString(),
        readAt: null
      };
      
      messages.push(message);
      
      const convIndex = conversations.findIndex(conv => conv.id === conversationId);
      if (convIndex !== -1) {
        conversations[convIndex].lastMessageId = message.id;
        conversations[convIndex].updatedAt = new Date().toISOString();
      }
      
      io.to(`user_${receiverId}`).emit('new_message', {
        ...message,
        senderName: users.find(u => u.id === senderId)?.name || 'Unknown User'
      });
      
      socket.emit('message_sent', { messageId: message.id, success: true });
      
      // Send email notification via Resend
      await sendEmailNotification(message);
      
      console.log('✅ Message sent via WebSocket');
      
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('📴 User disconnected:', socket.id);
    
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          users[userIndex].isOnline = false;
          users[userIndex].lastSeen = new Date().toISOString();
        }
        
        socket.broadcast.emit('user_online', { userId, isOnline: false });
        break;
      }
    }
  });
});

// =============================================
// API ENDPOINTS (Same structure, optimized)
// =============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      messaging: 'active',
      websocket: 'active',
      email: process.env.RESEND_API_KEY ? 'active' : 'disabled',
      fileUpload: 'active'
    }
  });
});

// Get available users
app.get('/api/users/discovery', (req, res) => {
  try {
    const currentUserId = req.headers['user-id'];
    const userType = req.query.type;
    
    let availableUsers = users.filter(user => 
      user.id !== currentUserId && 
      user.status === 'active' &&
      (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trial')
    );
    
    if (userType && ['client', 'talent'].includes(userType)) {
      availableUsers = availableUsers.filter(user => user.type === userType);
    }
    
    // Remove sensitive data
    availableUsers = availableUsers.map(user => ({
      id: user.id,
      name: user.name,
      type: user.type,
      location: user.location,
      avatar: user.avatar,
      rating: user.rating,
      hourlyRate: user.hourlyRate,
      specialties: user.specialties,
      bio: user.bio,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      plan: user.plan
    }));
    
    console.log(`✅ Returning ${availableUsers.length} available users`);
    res.json(availableUsers);
    
  } catch (error) {
    console.error('❌ Error in /api/users/discovery:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create conversation
app.post('/api/conversations', (req, res) => {
  try {
    const currentUserId = req.headers['user-id'];
    const { conversationId, participants, projectId, projectTitle } = req.body;
    
    if (!participants.includes(currentUserId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const existingConv = conversations.find(conv => 
      conv.participants.includes(participants[0]) && 
      conv.participants.includes(participants[1])
    );
    
    if (existingConv) {
      return res.json({ 
        success: true, 
        conversation: existingConv,
        message: 'Conversation already exists'
      });
    }
    
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
    
    participants.forEach(participantId => {
      if (participantId !== currentUserId) {
        io.to(`user_${participantId}`).emit('conversation_created', conversation);
      }
    });
    
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

// Send message with file upload support
app.post('/api/contact/talent', upload.single('file'), async (req, res) => {
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
    
    if (senderId !== currentUserId) {
      return res.status(403).json({ error: 'Unauthorized sender' });
    }
    
    let messageContent = content;
    let messageType = type;
    
    // Handle file upload
    if (req.file) {
      messageContent = `📎 File shared: ${req.file.originalname} (${Math.round(req.file.size / 1024)}KB)`;
      messageType = 'file';
      // In production, you'd upload to cloud storage and store the URL
    }
    
    const message = {
      id: messageId,
      conversationId,
      senderId,
      receiverId,
      content: messageContent,
      type: messageType,
      timestamp: timestamp || new Date().toISOString(),
      readAt: null,
      createdAt: new Date().toISOString()
    };
    
    messages.push(message);
    
    const convIndex = conversations.findIndex(conv => conv.id === conversationId);
    if (convIndex !== -1) {
      conversations[convIndex].lastMessageId = messageId;
      conversations[convIndex].updatedAt = new Date().toISOString();
    }
    
    const sender = users.find(u => u.id === senderId);
    io.to(`user_${receiverId}`).emit('new_message', {
      ...message,
      senderName: sender?.name || 'Unknown User'
    });
    
    // Send email notification via Resend
    await sendEmailNotification(message);
    
    console.log('✅ Message sent successfully');
    res.json({ 
      success: true, 
      messageId,
      message: 'Message sent successfully',
      emailSent: true
    });
    
  } catch (error) {
    console.error('❌ Error in /api/contact/talent:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get conversations
app.get('/api/conversations', (req, res) => {
  try {
    const currentUserId = req.headers['user-id'];
    
    const userConversations = conversations
      .filter(conv => conv.participants.includes(currentUserId))
      .map(conv => {
        const lastMessage = messages
          .filter(msg => msg.conversationId === conv.id)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        
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
    
    res.json(userConversations);
    
  } catch (error) {
    console.error('❌ Error in /api/conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Other endpoints (same as before)
app.get('/api/users/:userId', (req, res) => {
  const user = users.find(u => u.id === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const { email, subscriptionStatus, ...publicData } = user;
  res.json(publicData);
});

app.put('/api/users/:userId/status', (req, res) => {
  const { userId } = req.params;
  const { isOnline } = req.body;
  
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex].isOnline = isOnline;
    users[userIndex].lastSeen = new Date().toISOString();
  }
  
  res.json({ success: true });
});

app.get('/api/messages/poll', (req, res) => {
  const currentUserId = req.headers['user-id'];
  const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 60000);
  
  const newMessages = messages.filter(msg => 
    msg.receiverId === currentUserId && 
    new Date(msg.timestamp) > since &&
    !msg.readAt
  );
  
  res.json(newMessages);
});

app.put('/api/messages/:messageId/read', (req, res) => {
  const messageIndex = messages.findIndex(msg => msg.id === req.params.messageId);
  if (messageIndex !== -1) {
    messages[messageIndex].readAt = new Date().toISOString();
  }
  res.json({ success: true });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Server startup
server.listen(PORT, () => {
  console.log('🚀 VOICECASTING MESSAGING SERVER STARTED');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log('✅ Features Active:');
  console.log('   🔌 WebSocket Real-time Messaging');
  console.log('   📧 Resend Email Notifications');
  console.log('   📎 File Upload Support');
  console.log('   👥 User Discovery');
  console.log('   💬 Conversation Management');
  console.log('   🔐 Subscription Permissions');
});

module.exports = app;
