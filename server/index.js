import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import pg from 'pg';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import talentRoutes from './routes/talent.js';
import messageRoutes from './routes/messages.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';

// Import database
import { initDb } from './db/index.js';

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

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/talent', talentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Authenticate user
  const userId = socket.handshake.auth.userId;
  if (userId) {
    socket.join(`user:${userId}`);
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
    console.log('User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;