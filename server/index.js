import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';
import fs from 'fs';
import jwt from 'jsonwebtoken';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import talentRoutes from './routes/talent.js';
import messageRoutes from './routes/messages.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import contactRoutes from './routes/contact.js';

// Import database
import { initDb } from './db/index.js';

// Import email notification services
import { sendMessageNotification, addOnlineUser, removeOnlineUser } from './services/emailNotifications.js';
import { startScheduler } from './services/scheduler.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize database
initDb();

// FIXED: Enhanced Authentication middleware
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    console.log('✅ User authenticated:', req.user);
    next();
  } catch (error) {
    // Handle session tokens (temporary fallback for development)
    if (token.startsWith('session_')) {
      const parts = token.split('_');
      if (parts.length >= 3) {
        req.user = { 
          id: parts[1], 
          type: 'client',
          sessionToken: true,
          name: req.headers['x-user-name'] || 'Anonymous User'
        };
        console.log('✅ Session token accepted:', req.user);
        next();
      } else {
        console.log('❌ Invalid session token format');
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
    } else {
      console.log('❌ JWT verification failed:', error.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  }
};

// Optional: Flexible auth that allows both authenticated and unauthenticated requests
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.user = decoded;
    } catch (error) {
      if (token.startsWith('session_')) {
        const parts = token.split('_');
        if (parts.length >= 3) {
          req.user = { 
            id: parts[1], 
            type: 'client',
            sessionToken: true,
            name: req.headers['x-user-name'] || 'Anonymous User'
          };
        }
      }
    }
  }
  next();
};

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple debugging
console.log('Project structure check:');
console.log('Server __dirname:', __dirname);
console.log('Looking for dist at:', path.join(__dirname, '../../dist'));
console.log('Root contents:', fs.readdirSync(path.join(__dirname, '../..')));

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// IMPORTANT: Serve static files BEFORE API routes and catch-all
app.use('/uploads', express.static(uploadsDir));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
}

// PRODUCTION FIX: Add missing authentication endpoints
app.get('/api/auth/verify', authenticateUser, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user,
    message: 'Token is valid',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auth/refresh', (req, res) => {
  const { userId, userName, userType } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    // Generate new JWT token
    const token = jwt.sign(
      { 
        id: userId, 
        name: userName || 'Anonymous User', 
        type: userType || 'client' 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('✅ Token refreshed for user:', userId);

    res.json({ 
      token: token,
      expiresIn: '24h',
      user: { id: userId, name: userName, type: userType }
    });

  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// PRODUCTION FIX: Enhanced messaging endpoint
app.post('/api/messages/send', authenticateUser, async (req, res) => {
  try {
    console.log('📥 Received message request:', req.body);
    console.log('👤 Authenticated user:', req.user);

    // Validate required fields
    const { subject, message, toId, toName } = req.body;
    
    if (!subject || !message || !toId) {
      return res.status(400).json({ 
        error: 'Missing required fields: subject, message, toId' 
      });
    }

    // Get database connection
    const { pool } = await import('./db/index.js');
    const client = await pool.connect();

    try {
      // Create message object
      const messageData = {
        fromId: req.user.id,
        fromName: req.body.fromName || req.user.name || 'Anonymous Client',
        fromType: 'client',
        toId: toId,
        toName: toName,
        toType: 'talent',
        subject: subject,
        message: message,
        budget: req.body.budget || '',
        deadline: req.body.deadline || '',
        messageType: req.body.messageType || 'project_inquiry',
        platform: req.body.platform || 'voicecastingpro',
        timestamp: new Date().toISOString(),
        status: 'sent',
        read: false
      };

      // Store message in database
      const messageResult = await client.query(
        `INSERT INTO messages 
         (sender_id, recipient_id, subject, content, message_type, budget, deadline, created_at, read_status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [
          messageData.fromId,
          messageData.toId,
          messageData.subject,
          messageData.message,
          messageData.messageType,
          messageData.budget,
          messageData.deadline,
          messageData.timestamp,
          false
        ]
      );

      const savedMessage = messageResult.rows[0];

      // Find or create conversation
      let conversationResult = await client.query(
        `SELECT * FROM conversations 
         WHERE $1 = ANY(participants) AND $2 = ANY(participants)`,
        [messageData.fromId, messageData.toId]
      );

      let conversation;
      if (conversationResult.rows.length === 0) {
        // Create new conversation
        const newConvResult = await client.query(
          `INSERT INTO conversations 
           (participants, last_message, last_message_time, project_title) 
           VALUES ($1, $2, $3, $4) 
           RETURNING *`,
          [
            [messageData.fromId, messageData.toId],
            messageData.subject,
            messageData.timestamp,
            messageData.subject
          ]
        );
        conversation = newConvResult.rows[0];
      } else {
        // Update existing conversation
        conversation = conversationResult.rows[0];
        await client.query(
          `UPDATE conversations 
           SET last_message = $1, last_message_time = $2 
           WHERE id = $3`,
          [messageData.subject, messageData.timestamp, conversation.id]
        );
      }

      // Send real-time notification via Socket.IO
      io.to(`user:${messageData.toId}`).emit('new_message', {
        id: savedMessage.id,
        senderId: messageData.fromId,
        senderName: messageData.fromName,
        subject: messageData.subject,
        content: messageData.message,
        timestamp: messageData.timestamp,
        conversationId: conversation.id
      });

      // Send email notification
      try {
        await sendMessageNotification({
          recipient_id: messageData.toId,
          sender_id: messageData.fromId,
          sender_name: messageData.fromName,
          subject: messageData.subject,
          content: messageData.message,
          budget: messageData.budget,
          deadline: messageData.deadline,
          conversation_id: conversation.id
        });
        console.log('✅ Email notification sent');
      } catch (emailError) {
        console.error('⚠️ Email notification failed:', emailError);
        // Don't fail the request if email fails
      }

      console.log('✅ Message saved successfully:', savedMessage.id);

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        messageId: savedMessage.id,
        conversationId: conversation.id,
        timestamp: messageData.timestamp,
        emailSent: true
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Error processing message:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PRODUCTION FIX: Public contact endpoint (backup for unauthenticated users)
app.post('/api/contact/talent', optionalAuth, async (req, res) => {
  try {
    console.log('📥 Received contact form:', req.body);

    const { subject, message, fromName, toName, toId } = req.body;
    
    if (!subject || !message || !fromName) {
      return res.status(400).json({ 
        error: 'Missing required fields: subject, message, fromName' 
      });
    }

    const messageData = {
      fromName: fromName,
      toName: toName || 'VoiceCastingPro Talent',
      toId: toId || 'admin',
      subject: subject,
      message: message,
      budget: req.body.budget || '',
      deadline: req.body.deadline || '',
      timestamp: new Date().toISOString(),
      type: 'contact_form'
    };

    // Send email notification
    try {
      await sendMessageNotification({
        recipient_id: messageData.toId,
        sender_name: messageData.fromName,
        subject: messageData.subject,
        content: messageData.message,
        budget: messageData.budget,
        deadline: messageData.deadline
      });
      console.log('✅ Contact form email sent');
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      return res.status(500).json({ error: 'Failed to send email notification' });
    }

    console.log('✅ Contact form processed:', messageData);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      timestamp: messageData.timestamp,
      emailSent: true
    });

  } catch (error) {
    console.error('❌ Error processing contact form:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// API routes (existing)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/talent', talentRoutes);
app.use('/api/messages', messageRoutes); // Keep existing routes
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
// app.use('/api/upload', uploadRoutes);
app.use('/api/contact', contactRoutes);

// PRODUCTION FIX: Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const { pool } = await import('./db/index.js');
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      endpoints: {
        messages: '/api/messages',
        messageSend: '/api/messages/send',
        contact: '/api/contact/talent',
        authVerify: '/api/auth/verify',
        authRefresh: '/api/auth/refresh'
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// IMPORTANT: Catch-all route MUST be LAST
// Handle SPA routing in production - this MUST come after all static file serving
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Only redirect if it's not an API call or static file
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(__dirname, '../../dist/index.html'));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  });
}

// Socket.IO connection handling with email notifications
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Authenticate user
  const userId = socket.handshake.auth.userId;
  if (userId) {
    socket.join(`user:${userId}`);
    addOnlineUser(userId); // Track user as online
    console.log(`User ${userId} authenticated and joined their room`);
  }
  
  // Handle messaging
  socket.on('send_message', async (message) => {
    try {
      // Store message in database
      const { pool } = await import('./db/index.js');
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          `INSERT INTO messages 
           (conversation_id, sender_id, recipient_id, content, type, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           RETURNING *`,
          [
            message.conversationId,
            message.senderId,
            message.receiverId,
            message.content,
            message.type,
            message.metadata
          ]
        );
        
        const newMessage = result.rows[0];
        
        // Broadcast to recipient
        socket.to(`user:${message.receiverId}`).emit('message', newMessage);
        
        // Also send back to sender for confirmation
        socket.emit('message_sent', newMessage);
        
        // Send email notification if recipient is offline
        await sendMessageNotification({
          recipient_id: message.receiverId,
          sender_id: message.senderId,
          content: message.content,
          conversation_id: message.conversationId
        });
        
        console.log(`✅ Message processed and notification sent if needed`);
        
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message_error', { error: error.message });
    }
  });
  
  // Handle conversation creation
  socket.on('create_conversation', async (conversation) => {
    try {
      // Store conversation in database
      const { pool } = await import('./db/index.js');
      const client = await pool.connect();
      
      try {
        const result = await client.query(
          `INSERT INTO conversations 
           (participants, project_id, project_title) 
           VALUES ($1, $2, $3) 
           RETURNING *`,
          [
            conversation.participants,
            conversation.projectId,
            conversation.projectTitle
          ]
        );
        
        const newConversation = result.rows[0];
        
        // Notify all participants
        conversation.participants.forEach(participantId => {
          io.to(`user:${participantId}`).emit('conversation_created', newConversation);
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      socket.emit('conversation_error', { error: error.message });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    if (userId) {
      removeOnlineUser(userId); // Track user as offline
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('✅ Production messaging endpoints configured:');
  console.log('   POST /api/messages/send (authenticated)');
  console.log('   POST /api/contact/talent (public)');
  console.log('   GET  /api/auth/verify');
  console.log('   POST /api/auth/refresh');
  console.log('   GET  /api/health');
  
  // Start email scheduler
  startScheduler();
  console.log('📧 Email notification system initialized');
});

export default app;