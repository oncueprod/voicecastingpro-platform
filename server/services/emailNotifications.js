import { Resend } from 'resend';
import { pool } from '../db/index.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Track online users (connected via Socket.io)
const onlineUsers = new Set();

export const addOnlineUser = (userId) => {
  onlineUsers.add(userId.toString());
  console.log(`User ${userId} is now online. Online users: ${onlineUsers.size}`);
};

export const removeOnlineUser = (userId) => {
  onlineUsers.delete(userId.toString());
  console.log(`User ${userId} is now offline. Online users: ${onlineUsers.size}`);
};

export const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

// Send message notification email
export const sendMessageNotification = async (messageData) => {
  try {
    const { recipient_id, sender_id, content, conversation_id } = messageData;
    
    // Only send email if recipient is offline
    if (isUserOnline(recipient_id)) {
      console.log(`User ${recipient_id} is online, skipping email notification`);
      return;
    }
    
    // Get recipient and sender details
    const recipientResult = await pool.query(
      'SELECT email, full_name FROM profiles WHERE id = $1',
      [recipient_id]
    );
    
    const senderResult = await pool.query(
      'SELECT full_name FROM profiles WHERE id = $1', 
      [sender_id]
    );
    
    if (recipientResult.rows.length === 0 || senderResult.rows.length === 0) {
      console.error('Could not find user details for notification');
      return;
    }
    
    const recipient = recipientResult.rows[0];
    const sender = senderResult.rows[0];
    
    // Check if user has email notifications enabled
    const prefsResult = await pool.query(
      'SELECT message_email_notifications FROM user_preferences WHERE user_id = $1',
      [recipient_id]
    );
    
    const emailEnabled = prefsResult.rows.length === 0 || prefsResult.rows[0].message_email_notifications;
    
    if (!emailEnabled) {
      console.log(`User ${recipient_id} has message email notifications disabled`);
      return;
    }
    
    // Prevent sending too many emails (max 1 per hour per conversation)
    const recentEmailCheck = await pool.query(
      `SELECT id FROM email_log 
       WHERE recipient_email = $1 AND conversation_id = $2 
       AND sent_at > NOW() - INTERVAL '1 hour'
       ORDER BY sent_at DESC LIMIT 1`,
      [recipient.email, conversation_id]
    );
    
    if (recentEmailCheck.rows.length > 0) {
      console.log(`Recent email already sent to ${recipient.email} for conversation ${conversation_id}`);
      return;
    }
    
    // Truncate content for preview
    const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
    
    // Send email notification
    await resend.emails.send({
      from: 'VoiceCasting Pro <notifications@voicecastingpro.com>',
      to: recipient.email,
      subject: `💬 New message from ${sender.full_name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e40af; margin: 0; font-size: 28px;">VoiceCasting Pro</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Professional Voice Talent Platform</p>
          </div>
          
          <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #1e40af; margin: 0 0 20px 0; font-size: 24px;">💬 You have a new message!</h2>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi ${recipient.full_name},</p>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              <strong>${sender.full_name}</strong> sent you a message:
            </p>
            
            <div style="background: #f8fafc; border-left: 4px solid #1e40af; padding: 20px; margin: 25px 0; border-radius: 6px;">
              <p style="margin: 0; font-style: italic; color: #4b5563; font-size: 15px; line-height: 1.6;">
                "${preview}"
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}?page=messaging" 
                 style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                💬 Reply Now
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                🔔 <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}?page=profile" style="color: #1e40af; text-decoration: none;">Manage notification preferences</a>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © 2025 VoiceCasting Pro. All rights reserved.
            </p>
          </div>
        </div>
      `
    });
    
    // Log the email for rate limiting
    await pool.query(
      `INSERT INTO email_log (recipient_email, sender_id, conversation_id, email_type, sent_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [recipient.email, sender_id, conversation_id, 'message_notification']
    );
    
    console.log(`✅ Message notification sent to ${recipient.email}`);
    
  } catch (error) {
    console.error('❌ Error sending message notification:', error);
  }
};

// Send daily digest of unread messages
export const sendDailyDigest = async () => {
  try {
    console.log('📧 Starting daily digest...');
    
    const usersWithUnread = await pool.query(`
      SELECT 
        p.id, p.email, p.full_name,
        COUNT(m.id) as unread_count,
        STRING_AGG(DISTINCT sender_profiles.full_name, ', ') as sender_names
      FROM profiles p
      JOIN messages m ON m.recipient_id = p.id
      JOIN profiles sender_profiles ON sender_profiles.id = m.sender_id
      JOIN user_preferences up ON up.user_id = p.id
      WHERE m.read_at IS NULL 
        AND m.created_at >= NOW() - INTERVAL '24 hours'
        AND up.daily_digest = true
      GROUP BY p.id, p.email, p.full_name
      HAVING COUNT(m.id) > 0
    `);
    
    for (const user of usersWithUnread.rows) {
      await resend.emails.send({
        from: 'VoiceCasting Pro <notifications@voicecastingpro.com>',
        to: user.email,
        subject: `📬 Daily Summary: ${user.unread_count} unread message(s)`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e40af; margin: 0; font-size: 28px;">VoiceCasting Pro</h1>
              <p style="color: #6b7280; margin: 5px 0 0 0;">Daily Message Summary</p>
            </div>
            
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <h2 style="color: #1e40af; margin: 0 0 20px 0;">📬 Your Daily Summary</h2>
              <p style="font-size: 16px; color: #374151;">Hi ${user.full_name},</p>
              <p style="font-size: 16px; color: #374151;">
                You have <strong>${user.unread_count} unread message(s)</strong> from: ${user.sender_names}
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}?page=messaging" 
                   style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                  📨 View All Messages
                </a>
              </div>
            </div>
          </div>
        `
      });
      
      console.log(`📧 Daily digest sent to ${user.email}`);
    }
    
    console.log(`✅ Daily digest completed. Sent to ${usersWithUnread.rows.length} users.`);
    
  } catch (error) {
    console.error('❌ Error sending daily digest:', error);
  }
};