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

// UPDATED: Send message notification email (compatible with new messaging system)
export const sendMessageNotification = async (messageData) => {
  try {
    const { 
      recipient_id, 
      sender_id, 
      subject, 
      content, 
      conversation_id,
      recipient_email,
      recipient_name,
      sender_name,
      sender_type,
      project_title,
      metadata 
    } = messageData;
    
    console.log('📧 Processing message notification:', { recipient_id, sender_id, subject: subject?.substring(0, 30) + '...' });
    
    // Skip if Resend is not configured
    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend API key not configured, skipping email notification');
      return false;
    }
    
    // Only send email if recipient is offline
    if (isUserOnline(recipient_id)) {
      console.log(`User ${recipient_id} is online, skipping email notification`);
      return false;
    }
    
    let recipient, sender;
    
    // Use provided data if available, otherwise fetch from database
    if (recipient_email && recipient_name && sender_name) {
      recipient = { email: recipient_email, full_name: recipient_name };
      sender = { full_name: sender_name };
    } else {
      // Fallback to database queries (try both users and profiles tables)
      try {
        // Try users table first
        const recipientResult = await pool.query(
          'SELECT email, name as full_name FROM users WHERE id = $1',
          [recipient_id]
        );
        
        const senderResult = await pool.query(
          'SELECT name as full_name FROM users WHERE id = $1', 
          [sender_id]
        );
        
        if (recipientResult.rows.length > 0 && senderResult.rows.length > 0) {
          recipient = recipientResult.rows[0];
          sender = senderResult.rows[0];
        } else {
          // Fallback to profiles table
          const recipientProfileResult = await pool.query(
            'SELECT email, full_name FROM profiles WHERE id = $1',
            [recipient_id]
          );
          
          const senderProfileResult = await pool.query(
            'SELECT full_name FROM profiles WHERE id = $1', 
            [sender_id]
          );
          
          if (recipientProfileResult.rows.length === 0 || senderProfileResult.rows.length === 0) {
            console.error('Could not find user details for notification');
            return false;
          }
          
          recipient = recipientProfileResult.rows[0];
          sender = senderProfileResult.rows[0];
        }
      } catch (dbError) {
        console.error('Database error fetching user details:', dbError);
        return false;
      }
    }
    
    // Check if user has email notifications enabled
    try {
      const prefsResult = await pool.query(
        'SELECT message_email_notifications FROM user_preferences WHERE user_id = $1',
        [recipient_id]
      );
      
      const emailEnabled = prefsResult.rows.length === 0 || prefsResult.rows[0].message_email_notifications;
      
      if (!emailEnabled) {
        console.log(`User ${recipient_id} has message email notifications disabled`);
        return false;
      }
    } catch (prefsError) {
      console.log('Could not check user preferences, proceeding with email');
    }
    
    // Prevent sending too many emails (max 1 per hour per conversation)
    try {
      const recentEmailCheck = await pool.query(
        `SELECT id FROM email_log 
         WHERE recipient_email = $1 AND conversation_id = $2 
         AND sent_at > NOW() - INTERVAL '1 hour'
         ORDER BY sent_at DESC LIMIT 1`,
        [recipient.email, conversation_id]
      );
      
      if (recentEmailCheck.rows.length > 0) {
        console.log(`Recent email already sent to ${recipient.email} for conversation ${conversation_id}`);
        return false;
      }
    } catch (logError) {
      console.log('Could not check email log, proceeding with send');
    }
    
    // Use subject from messageData or fallback
    const emailSubject = subject || `💬 New message from ${sender.full_name}`;
    const messageContent = content || 'New message received';
    
    // Truncate content for preview
    const preview = messageContent.length > 200 ? messageContent.substring(0, 200) + '...' : messageContent;
    
    // Create enhanced email template
    const emailTemplate = createMessageNotificationTemplate({
      recipient_name: recipient.full_name,
      sender_name: sender.full_name,
      sender_type: sender_type || 'user',
      subject: emailSubject,
      content: messageContent,
      preview: preview,
      project_title: project_title,
      conversation_id: conversation_id,
      metadata: metadata
    });
    
    // Send email notification
    const result = await resend.emails.send({
      from: 'VoiceCasting Pro <notifications@voicecastingpro.com>',
      to: recipient.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html
    });
    
    if (result.error) {
      console.error('❌ Resend API error:', result.error);
      return false;
    }
    
    // Log the email for rate limiting
    try {
      await pool.query(
        `INSERT INTO email_log (recipient_email, sender_id, conversation_id, email_type, sent_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [recipient.email, sender_id, conversation_id, 'message_notification']
      );
    } catch (logError) {
      console.log('Could not log email to database:', logError);
    }
    
    console.log(`✅ Message notification sent to ${recipient.email}:`, result.data?.id);
    return true;
    
  } catch (error) {
    console.error('❌ Error sending message notification:', error);
    return false;
  }
};

// NEW: Send contact form notification (for contact form submissions)
export const sendContactFormNotification = async (formData) => {
  try {
    console.log('📧 Sending contact form notification:', formData.subject);

    if (!process.env.RESEND_API_KEY) {
      console.log('⚠️ Resend API key not configured, skipping contact form email');
      return false;
    }

    const supportEmail = process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL || 'support@voicecastingpro.com';
    const frontendUrl = process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com';

    // Send admin notification
    const adminResult = await resend.emails.send({
      from: 'VoiceCasting Pro <notifications@voicecastingpro.com>',
      to: supportEmail,
      subject: `New Contact Form: ${formData.category} - ${formData.subject}`,
      html: createContactFormAdminTemplate(formData)
    });

    // Send user confirmation
    const userResult = await resend.emails.send({
      from: 'VoiceCasting Pro <notifications@voicecastingpro.com>',
      to: formData.email,
      subject: 'Thank you for contacting VoiceCasting Pro!',
      html: createContactFormUserTemplate(formData, frontendUrl)
    });

    if (adminResult.error || userResult.error) {
      console.error('❌ Contact form email errors:', { admin: adminResult.error, user: userResult.error });
      return false;
    }

    console.log('✅ Contact form emails sent successfully');
    return true;

  } catch (error) {
    console.error('❌ Failed to send contact form emails:', error);
    return false;
  }
};

// Enhanced email template for message notifications
function createMessageNotificationTemplate(data) {
  const subject = data.subject || `New message from ${data.sender_name}`;
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e40af; margin: 0; font-size: 28px;">🎤 VoiceCasting Pro</h1>
        <p style="color: #6b7280; margin: 5px 0 0 0;">Professional Voice Talent Platform</p>
      </div>
      
      <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #1e40af; margin: 0 0 20px 0; font-size: 24px;">💬 You have a new message!</h2>
        
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi ${data.recipient_name},</p>
        
        <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <strong>📋 Subject:</strong> ${data.subject}<br>
          ${data.project_title ? `<strong>📁 Project:</strong> ${data.project_title}<br>` : ''}
          <strong>📅 Received:</strong> ${new Date().toLocaleString()}<br>
          <strong>👤 From:</strong> ${data.sender_name} (${data.sender_type === 'client' ? 'Client' : 'Talent'})
        </div>
        
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          <strong>${data.sender_name}</strong> sent you a message:
        </p>
        
        <div style="background: #f8fafc; border-left: 4px solid #1e40af; padding: 20px; margin: 25px 0; border-radius: 6px;">
          <p style="margin: 0; font-style: italic; color: #4b5563; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">
            "${data.preview || data.content}"
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}/messages${data.conversation_id ? `?conversation=${data.conversation_id}` : ''}" 
             style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
            💬 Reply Now
          </a>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>⚡ Quick Tip:</strong> ${
              data.sender_type === 'client' 
                ? 'Respond promptly to maintain good client relationships and increase your chances of getting hired!'
                : 'Quick responses help build trust and lead to better project outcomes!'
            }
          </p>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            🔔 <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}/settings" style="color: #1e40af; text-decoration: none;">Manage notification preferences</a>
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © 2025 VoiceCasting Pro. All rights reserved.
        </p>
      </div>
    </div>
  `;

  return { subject, html };
}

// Contact form admin template
function createContactFormAdminTemplate(formData) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
        <h1>🎤 VoiceCasting Pro - New Contact Form</h1>
      </div>
      <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
        <div style="background: #fef3c7; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
          <strong>Category:</strong> ${formData.category.toUpperCase()}
        </div>
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; color: #475569;">Contact Information:</div>
          <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 5px;">
            <strong>Name:</strong> ${formData.name}<br>
            <strong>Email:</strong> ${formData.email}
          </div>
        </div>
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; color: #475569;">Subject:</div>
          <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 5px;">${formData.subject}</div>
        </div>
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; color: #475569;">Message:</div>
          <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 5px;">${formData.message.replace(/\n/g, '<br>')}</div>
        </div>
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; color: #475569;">Submitted:</div>
          <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 5px;">${new Date().toLocaleString()}</div>
        </div>
      </div>
    </div>
  `;
}

// Contact form user template
function createContactFormUserTemplate(formData, frontendUrl) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af, #3730a3); color: white; padding: 30px; text-align: center;">
        <h1>🎤 VoiceCasting Pro</h1>
        <p>Thank You for Reaching Out!</p>
      </div>
      <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0;">
        <h2>Hi ${formData.name}! 👋</h2>
        <p>Thank you for contacting VoiceCasting Pro! We've received your message and our team will get back to you within <strong>24 hours</strong>.</p>
        
        <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3>⚡ What happens next?</h3>
          <ul>
            <li>Our support team will review your inquiry</li>
            <li>You'll receive a personalized response within 24 hours</li>
            <li>We'll provide detailed answers and next steps</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${frontendUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px;">Browse Voice Talent</a>
          <a href="${frontendUrl}/help" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px;">Help Center</a>
        </div>
        
        <p><strong>Your Submission:</strong></p>
        <p>Category: ${formData.category}<br>
        Subject: ${formData.subject}<br>
        Submitted: ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;
}

// KEEP YOUR EXISTING DAILY DIGEST FUNCTION
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
                <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}/messages" 
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