import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateToken, authorizeAdmin, authorizeSuperAdmin } from '../middleware/auth.js';
import { pool, transaction } from '../db/index.js';

const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Get admin user
    const adminResult = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1 AND is_active = TRUE',
      [username]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const admin = adminResult.rows[0];
    
    // Check password
    const passwordValid = await bcrypt.compare(password, admin.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: admin.id,
        username: admin.username,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login = NOW() WHERE id = $1',
      [admin.id]
    );
    
    // Create admin session
    const sessionResult = await pool.query(
      `INSERT INTO admin_sessions 
       (admin_user_id, session_token, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '24 hours') 
       RETURNING *`,
      [admin.id, token]
    );
    
    res.status(200).json({
      admin: {
        id: admin.id,
        username: admin.username,
        lastLogin: admin.last_login
      },
      token,
      expiresAt: sessionResult.rows[0].expires_at
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error during admin login' });
  }
});

// Get all users
router.get('/users', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const usersResult = await pool.query(
      `SELECT u.id, u.email, u.created_at, u.last_login, 
              p.full_name, p.avatar_url, p.user_type,
              (SELECT COUNT(*) FROM messages WHERE sender_id = u.id) as message_count,
              (SELECT COUNT(*) FROM escrow_transactions WHERE client_id = u.id) as client_transactions,
              (SELECT COUNT(*) FROM escrow_transactions WHERE talent_id = u.id) as talent_transactions
       FROM users u
       JOIN profiles p ON u.id = p.id
       ORDER BY u.created_at DESC`
    );
    
    res.status(200).json({ users: usersResult.rows });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error while fetching users' });
  }
});

// Suspend user
router.put('/users/:id/suspend', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Suspension reason is required' });
    }
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log admin action
    await pool.query(
      `INSERT INTO admin_actions 
       (admin_id, action_type, target_id, target_type, reason) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'user_suspended', id, 'user', reason]
    );
    
    // Update user status
    await pool.query(
      `UPDATE profiles 
       SET status = 'suspended', 
           suspension_reason = $1, 
           updated_at = NOW() 
       WHERE id = $2`,
      [reason, id]
    );
    
    res.status(200).json({ message: 'User suspended successfully' });
    
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Server error while suspending user' });
  }
});

// Activate user
router.put('/users/:id/activate', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log admin action
    await pool.query(
      `INSERT INTO admin_actions 
       (admin_id, action_type, target_id, target_type) 
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, 'user_activated', id, 'user']
    );
    
    // Update user status
    await pool.query(
      `UPDATE profiles 
       SET status = 'active', 
           suspension_reason = NULL, 
           updated_at = NOW() 
       WHERE id = $1`,
      [id]
    );
    
    res.status(200).json({ message: 'User activated successfully' });
    
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Server error while activating user' });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, authorizeSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Log admin action
    await pool.query(
      `INSERT INTO admin_actions 
       (admin_id, action_type, target_id, target_type) 
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, 'user_deleted', id, 'user']
    );
    
    // Delete user (cascade will delete related records)
    await pool.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    
    res.status(200).json({ message: 'User deleted successfully' });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error while deleting user' });
  }
});

// Get flagged messages
router.get('/messages/flagged', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const messagesResult = await pool.query(
      `SELECT m.*, 
              u_sender.email as sender_email, 
              p_sender.full_name as sender_name,
              u_recipient.email as recipient_email,
              p_recipient.full_name as recipient_name
       FROM messages m
       JOIN users u_sender ON m.sender_id = u_sender.id
       JOIN profiles p_sender ON m.sender_id = p_sender.id
       JOIN users u_recipient ON m.recipient_id = u_recipient.id
       JOIN profiles p_recipient ON m.recipient_id = p_recipient.id
       WHERE m.is_filtered = TRUE
       ORDER BY m.created_at DESC`
    );
    
    res.status(200).json({ messages: messagesResult.rows });
    
  } catch (error) {
    console.error('Get flagged messages error:', error);
    res.status(500).json({ error: 'Server error while fetching flagged messages' });
  }
});

// Flag message
router.put('/messages/:id/flag', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Flag reason is required' });
    }
    
    // Check if message exists
    const messageResult = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [id]
    );
    
    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Log admin action
    await pool.query(
      `INSERT INTO admin_actions 
       (admin_id, action_type, target_id, target_type, reason) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'message_flagged', id, 'message', reason]
    );
    
    // Update message
    const updatedMessageResult = await pool.query(
      `UPDATE messages 
       SET is_filtered = TRUE, 
           flag_reason = $1, 
           flagged_by = $2, 
           flagged_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [reason, req.user.userId, id]
    );
    
    res.status(200).json({ message: updatedMessageResult.rows[0] });
    
  } catch (error) {
    console.error('Flag message error:', error);
    res.status(500).json({ error: 'Server error while flagging message' });
  }
});

// Delete message
router.delete('/messages/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if message exists
    const messageResult = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [id]
    );
    
    if (messageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Log admin action
    await pool.query(
      `INSERT INTO admin_actions 
       (admin_id, action_type, target_id, target_type) 
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, 'message_deleted', id, 'message']
    );
    
    // Delete message
    await pool.query(
      'DELETE FROM messages WHERE id = $1',
      [id]
    );
    
    res.status(200).json({ message: 'Message deleted successfully' });
    
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Server error while deleting message' });
  }
});

// Get system stats
router.get('/stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Get user stats
    const userStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN p.user_type = 'client' THEN 1 END) as clients,
        COUNT(CASE WHEN p.user_type = 'talent' THEN 1 END) as talents,
        COUNT(CASE WHEN p.status = 'suspended' THEN 1 END) as suspended
      FROM users u
      JOIN profiles p ON u.id = p.id
    `);
    
    // Get message stats
    const messageStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN is_filtered = TRUE THEN 1 END) as filtered_messages
      FROM messages
    `);
    
    // Get escrow stats
    const escrowStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_escrows,
        SUM(amount) as total_volume,
        COUNT(CASE WHEN status = 'funded' THEN 1 END) as funded_escrows,
        COUNT(CASE WHEN status = 'released' THEN 1 END) as released_escrows
      FROM escrow_transactions
    `);
    
    // Get subscription stats
    const subscriptionStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN plan_type = 'monthly' THEN 1 END) as monthly_plans,
        COUNT(CASE WHEN plan_type = 'annual' THEN 1 END) as annual_plans
      FROM subscriptions
    `);
    
    res.status(200).json({
      users: userStatsResult.rows[0],
      messages: messageStatsResult.rows[0],
      escrows: escrowStatsResult.rows[0],
      subscriptions: subscriptionStatsResult.rows[0]
    });
    
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ error: 'Server error while fetching system stats' });
  }
});

export default router;