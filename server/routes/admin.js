import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authenticateToken, authorizeAdmin, authorizeSuperAdmin } from '../middleware/auth.js';
import { pool, transaction } from '../db/index.js';
import { triggerDailyDigest } from '../services/scheduler.js';

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

// =================================================================
// ADMIN USER MANAGEMENT ROUTES
// =================================================================

// Get all admin users (Super Admin only)
router.get('/admin-users', authenticateToken, authorizeSuperAdmin, async (req, res) => {
  try {
    const adminResult = await pool.query(
      `SELECT id, username, created_at, last_login, is_active 
       FROM admin_users 
       ORDER BY created_at DESC`
    );
    
    res.status(200).json({ adminUsers: adminResult.rows });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Server error while fetching admin users' });
  }
});

// Create new admin user (Super Admin only)
router.post('/admin-users', authenticateToken, authorizeSuperAdmin, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if username already exists
    const existingResult = await pool.query(
      'SELECT id FROM admin_users WHERE username = $1',
      [username]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create admin user
    const newAdminResult = await pool.query(
      `INSERT INTO admin_users (username, password_hash, created_at, is_active) 
       VALUES ($1, $2, NOW(), TRUE) 
       RETURNING id, username, created_at, is_active`,
      [username, passwordHash]
    );
    
    // Log admin action
    await pool.query(
      `INSERT INTO admin_actions 
       (admin_id, action_type, target_id, target_type) 
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, 'admin_user_created', newAdminResult.rows[0].id, 'admin_user']
    );
    
    res.status(201).json({ 
      message: 'Admin user created successfully',
      adminUser: newAdminResult.rows[0]
    });
    
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ error: 'Server error while creating admin user' });
  }
});

// Update admin user (Super Admin only)
router.put('/admin-users/:id', authenticateToken, authorizeSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, isActive } = req.body;
    
    // Check if admin user exists
    const adminResult = await pool.query(
      'SELECT id FROM admin_users WHERE id = $1',
      [id]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    // Don't allow disabling self
    if (id == req.user.userId && isActive === false) {
      return res.status(400).json({ error: 'Cannot disable your own admin account' });
    }
    
    let updateQuery = 'UPDATE admin_users SET updated_at = NOW()';
    let queryParams = [];
    let paramCount = 1;
    
    // Update username if provided
    if (username) {
      // Check if new username already exists (excluding current user)
      const existingResult = await pool.query(
        'SELECT id FROM admin_users WHERE username = $1 AND id != $2',
        [username, id]
      );
      
      if (existingResult.rows.length > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      updateQuery += `, username = $${paramCount}`;
      queryParams.push(username);
      paramCount++;
    }
    
    // Update password if provided
    if (password) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      updateQuery += `, password_hash = $${paramCount}`;
      queryParams.push(passwordHash);
      paramCount++;
    }
    
    // Update active status if provided
    if (typeof isActive === 'boolean') {
      updateQuery += `, is_active = $${paramCount}`;
      queryParams.push(isActive);
      paramCount++;
    }
    
    updateQuery += ` WHERE id = $${paramCount} RETURNING id, username, created_at, last_login, is_active`;
    queryParams.push(id);
    
    const updatedAdminResult = await pool.query(updateQuery, queryParams);
    
    // Log admin action
    await pool.query(
      `INSERT INTO admin_actions 
       (admin_id, action_type, target_id, target_type) 
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, 'admin_user_updated', id, 'admin_user']
    );
    
    res.status(200).json({ 
      message: 'Admin user updated successfully',
      adminUser: updatedAdminResult.rows[0]
    });
    
  } catch (error) {
    console.error('Update admin user error:', error);
    res.status(500).json({ error: 'Server error while updating admin user' });
  }
});

// Delete admin user (Super Admin only)
router.delete('/admin-users/:id', authenticateToken, authorizeSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if admin user exists
    const adminResult = await pool.query(
      'SELECT id, username FROM admin_users WHERE id = $1',
      [id]
    );
    
    if (adminResult.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    // Don't allow deletion of self
    if (id == req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }
    
    // Log admin action before deletion
    await pool.query(
      `INSERT INTO admin_actions 
       (admin_id, action_type, target_id, target_type, reason) 
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.userId, 'admin_user_deleted', id, 'admin_user', `Deleted admin user: ${adminResult.rows[0].username}`]
    );
    
    // Delete admin sessions first
    await pool.query('DELETE FROM admin_sessions WHERE admin_user_id = $1', [id]);
    
    // Delete admin user
    await pool.query('DELETE FROM admin_users WHERE id = $1', [id]);
    
    res.status(200).json({ message: 'Admin user deleted successfully' });
    
  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({ error: 'Server error while deleting admin user' });
  }
});

// Get admin actions log (Super Admin only)
router.get('/admin-actions', authenticateToken, authorizeSuperAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const actionsResult = await pool.query(
      `SELECT aa.*, au.username as admin_username
       FROM admin_actions aa
       LEFT JOIN admin_users au ON aa.admin_id = au.id
       ORDER BY aa.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.status(200).json({ actions: actionsResult.rows });
  } catch (error) {
    console.error('Get admin actions error:', error);
    res.status(500).json({ error: 'Server error while fetching admin actions' });
  }
});

// =================================================================
// EMAIL NOTIFICATION MANAGEMENT
// =================================================================

// Manual trigger for daily digest (for testing)
router.post('/trigger-digest', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    console.log(`📧 Admin ${req.user.username} manually triggered daily digest`);
    
    await triggerDailyDigest();
    
    // Log admin action
    await pool.query(
      `INSERT INTO admin_actions 
       (admin_id, action_type, target_type, reason) 
       VALUES ($1, $2, $3, $4)`,
      [req.user.userId, 'daily_digest_triggered', 'system', 'Manual trigger by admin']
    );
    
    res.status(200).json({ 
      message: 'Daily digest triggered successfully',
      timestamp: new Date().toISOString(),
      triggeredBy: req.user.username
    });
    
  } catch (error) {
    console.error('Admin digest trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger daily digest' });
  }
});

// Get email notification stats
router.get('/email-stats', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // Get email notification stats
    const emailStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_emails_sent,
        COUNT(CASE WHEN email_type = 'message_notification' THEN 1 END) as message_notifications,
        COUNT(CASE WHEN email_type = 'daily_digest' THEN 1 END) as daily_digests,
        COUNT(CASE WHEN sent_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
        COUNT(CASE WHEN sent_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days
      FROM email_log
    `);
    
    // Get user preference stats
    const preferenceStatsResult = await pool.query(`
      SELECT
        COUNT(*) as total_users_with_preferences,
        COUNT(CASE WHEN email_notifications = TRUE THEN 1 END) as email_enabled,
        COUNT(CASE WHEN message_email_notifications = TRUE THEN 1 END) as message_notifications_enabled,
        COUNT(CASE WHEN daily_digest = TRUE THEN 1 END) as daily_digest_enabled
      FROM user_preferences
    `);
    
    res.status(200).json({
      emailStats: emailStatsResult.rows[0],
      preferenceStats: preferenceStatsResult.rows[0]
    });
    
  } catch (error) {
    console.error('Get email stats error:', error);
    res.status(500).json({ error: 'Server error while fetching email stats' });
  }
});

// Get recent email log
router.get('/email-log', authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const emailLogResult = await pool.query(
      `SELECT el.*, p.full_name as recipient_name
       FROM email_log el
       LEFT JOIN profiles p ON p.email = el.recipient_email
       ORDER BY el.sent_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    res.status(200).json({ emailLog: emailLogResult.rows });
    
  } catch (error) {
    console.error('Get email log error:', error);
    res.status(500).json({ error: 'Server error while fetching email log' });
  }
});

export default router;