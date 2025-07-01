import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool, transaction } from '../db/index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000') // 50MB default
  }
});

// Filter message content for off-platform contact
const filterMessageContent = async (content) => {
  try {
    // Get active filters from database
    const filtersResult = await pool.query(
      'SELECT * FROM content_filters WHERE is_active = TRUE'
    );
    
    const filters = filtersResult.rows;
    let filteredContent = content;
    let isFiltered = false;
    
    // Apply each filter
    for (const filter of filters) {
      const regex = new RegExp(filter.pattern, 'gi');
      if (regex.test(filteredContent)) {
        filteredContent = filteredContent.replace(regex, filter.replacement);
        isFiltered = true;
      }
    }
    
    return {
      originalContent: content,
      filteredContent,
      isFiltered
    };
  } catch (error) {
    console.error('Message filtering error:', error);
    return {
      originalContent: content,
      filteredContent: content,
      isFiltered: false
    };
  }
};

// Get conversations for user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get conversations where user is a participant
    const conversationsResult = await pool.query(
      `SELECT c.*, 
              (SELECT row_to_json(m) 
               FROM messages m 
               WHERE m.conversation_id = c.id 
               ORDER BY m.created_at DESC 
               LIMIT 1) as last_message 
       FROM conversations c 
       WHERE $1 = ANY(c.participants) 
       ORDER BY c.last_message_at DESC`,
      [userId]
    );
    
    // Get unread message counts
    const unreadCountsResult = await pool.query(
      `SELECT conversation_id, COUNT(*) as unread_count 
       FROM messages 
       WHERE recipient_id = $1 AND read_at IS NULL 
       GROUP BY conversation_id`,
      [userId]
    );
    
    // Create a map of conversation ID to unread count
    const unreadCounts = {};
    unreadCountsResult.rows.forEach(row => {
      unreadCounts[row.conversation_id] = parseInt(row.unread_count);
    });
    
    // Add unread count to each conversation
    const conversations = conversationsResult.rows.map(conversation => ({
      ...conversation,
      unreadCount: unreadCounts[conversation.id] || 0
    }));
    
    res.status(200).json({ conversations });
    
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Server error while fetching conversations' });
  }
});

// Create conversation
router.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recipientId, projectId, projectTitle } = req.body;
    
    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }
    
    // Check if conversation already exists
    const existingResult = await pool.query(
      `SELECT * FROM conversations 
       WHERE participants @> ARRAY[$1, $2]::uuid[] 
       AND participants <@ ARRAY[$1, $2]::uuid[]
       AND (project_id = $3 OR project_id IS NULL AND $3 IS NULL)`,
      [userId, recipientId, projectId]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(200).json({ conversation: existingResult.rows[0] });
    }
    
    // Create conversation
    const conversationResult = await pool.query(
      `INSERT INTO conversations 
       (participants, project_id, project_title) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [
        [userId, recipientId],
        projectId,
        projectTitle
      ]
    );
    
    res.status(201).json({ conversation: conversationResult.rows[0] });
    
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Server error while creating conversation' });
  }
});

// Get messages for conversation
router.get('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const conversationId = req.params.id;
    
    // Check if user is participant in conversation
    const conversationResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1',
      [conversationId]
    );
    
    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const conversation = conversationResult.rows[0];
    
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }
    
    // Get messages
    const messagesResult = await pool.query(
      `SELECT m.*, 
              (SELECT json_agg(json_build_object(
                'id', fa.id,
                'file_name', fa.file_name,
                'file_path', fa.file_path,
                'file_type', fa.file_type,
                'file_size', fa.file_size,
                'content_type', fa.content_type
              )) 
               FROM message_attachments ma 
               JOIN file_attachments fa ON ma.file_attachment_id = fa.id 
               WHERE ma.message_id = m.id) as attachments 
       FROM messages m 
       WHERE m.conversation_id = $1 
       ORDER BY m.created_at ASC`,
      [conversationId]
    );
    
    // Mark messages as read
    await pool.query(
      `UPDATE messages 
       SET read_at = NOW() 
       WHERE conversation_id = $1 AND recipient_id = $2 AND read_at IS NULL`,
      [conversationId, userId]
    );
    
    res.status(200).json({ messages: messagesResult.rows });
    
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error while fetching messages' });
  }
});

// Send message
router.post('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const conversationId = req.params.id;
    const { content, type = 'text', metadata } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Check if user is participant in conversation
    const conversationResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1',
      [conversationId]
    );
    
    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const conversation = conversationResult.rows[0];
    
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }
    
    // Get recipient ID (the other participant)
    const recipientId = conversation.participants.find(id => id !== userId);
    
    // Filter message content
    const { filteredContent, isFiltered } = await filterMessageContent(content);
    
    // Create message
    const messageResult = await pool.query(
      `INSERT INTO messages 
       (conversation_id, sender_id, recipient_id, content, filtered_content, is_filtered, type, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        conversationId,
        userId,
        recipientId,
        content,
        isFiltered ? filteredContent : null,
        isFiltered,
        type,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
    
    const message = messageResult.rows[0];
    
    // Update conversation last message timestamp
    await pool.query(
      `UPDATE conversations 
       SET last_message_at = NOW() 
       WHERE id = $1`,
      [conversationId]
    );
    
    res.status(201).json({ message });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Server error while sending message' });
  }
});

// Upload file attachment
router.post('/conversations/:id/attachments', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const conversationId = req.params.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Check if user is participant in conversation
    const conversationResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1',
      [conversationId]
    );
    
    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const conversation = conversationResult.rows[0];
    
    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }
    
    // Get recipient ID (the other participant)
    const recipientId = conversation.participants.find(id => id !== userId);
    
    // Create file attachment and message in a transaction
    const result = await transaction(async (client) => {
      // Create file attachment
      const fileResult = await client.query(
        `INSERT INTO file_attachments 
         (user_id, file_name, file_path, file_type, file_size, content_type) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          userId,
          req.file.originalname,
          `/uploads/${req.file.filename}`,
          path.extname(req.file.originalname).substring(1),
          req.file.size,
          req.file.mimetype
        ]
      );
      
      const file = fileResult.rows[0];
      
      // Create message
      const messageResult = await client.query(
        `INSERT INTO messages 
         (conversation_id, sender_id, recipient_id, content, type, metadata) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          conversationId,
          userId,
          recipientId,
          `Shared file: ${req.file.originalname}`,
          'file',
          JSON.stringify({
            fileId: file.id,
            fileName: file.file_name,
            fileType: file.file_type,
            fileSize: file.file_size
          })
        ]
      );
      
      const message = messageResult.rows[0];
      
      // Create message attachment
      await client.query(
        `INSERT INTO message_attachments 
         (message_id, file_attachment_id) 
         VALUES ($1, $2)`,
        [message.id, file.id]
      );
      
      // Update conversation last message timestamp
      await client.query(
        `UPDATE conversations 
         SET last_message_at = NOW() 
         WHERE id = $1`,
        [conversationId]
      );
      
      return { message, file };
    });
    
    res.status(201).json({
      message: result.message,
      file: result.file
    });
    
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ error: 'Server error while uploading attachment' });
  }
});

// Mark message as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const messageId = req.params.id;
    
    // Check if message exists and user is recipient
    const messageResult = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );
    
    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const message = messageResult.rows[0];
    
    if (message.recipient_id !== userId) {
      return res.status(403).json({ error: 'You are not the recipient of this message' });
    }
    
    // Mark message as read
    const updatedMessageResult = await pool.query(
      `UPDATE messages 
       SET read_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [messageId]
    );
    
    res.status(200).json({ message: updatedMessageResult.rows[0] });
    
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ error: 'Server error while marking message as read' });
  }
});

export default router;