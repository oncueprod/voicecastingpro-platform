import express from 'express';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message, category, attachments } = req.body;
    
    console.log('Received contact form submission:', { name, email, subject, category });

    // Email to admin/support
    const { data: adminData, error: adminError } = await resend.emails.send({
      from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`,
      to: [process.env.SUPPORT_EMAIL || process.env.SMTP_USER],
      subject: `New Contact Form: ${category} - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af, #3730a3); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🎤 VoiceCastingPro</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">New Contact Form Submission</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin-bottom: 20px;">
              <strong>📋 Category:</strong> ${category.toUpperCase()}
            </div>
            
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; color: #475569;">👤 Contact Information:</div>
              <div style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 5px;">
                <strong>Name:</strong> ${name}<br>
                <strong>Email:</strong> <a href="mailto:${email}">${email}</a>
              </div>
            </div>
            
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; color: #475569;">📝 Subject:</div>
              <div style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 5px;">${subject}</div>
            </div>
            
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; color: #475569;">💬 Message:</div>
              <div style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 5px;">${message.replace(/\n/g, '<br>')}</div>
            </div>
            
            ${attachments && attachments.length > 0 ? `
              <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; color: #475569;">📎 Attachments:</div>
                <div style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 5px;">
                  <ul style="margin: 0; padding-left: 20px;">
                    ${attachments.map(file => `
                      <li>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) - ${file.type}</li>
                    `).join('')}
                  </ul>
                </div>
              </div>
            ` : ''}
            
            <div style="margin-bottom: 15px;">
              <div style="font-weight: bold; color: #475569;">⏰ Submitted:</div>
              <div style="background: white; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 5px;">${new Date().toLocaleString()}</div>
            </div>
          </div>
          
          <div style="background: #64748b; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
            <p>This email was automatically generated from the VoiceCastingPro contact form.</p>
            <p>Please respond to the customer within 24 hours for optimal service.</p>
          </div>
        </div>
      `
    });

    if (adminError) {
      console.error('Admin email error:', adminError);
      return res.status(500).json({ success: false, error: 'Failed to send admin notification' });
    }

    console.log('Admin email sent successfully:', adminData);

    // Confirmation email to user
    const { data: userData, error: userError } = await resend.emails.send({
      from: `${process.env.MAIL_FROM_NAME} <${process.env.MAIL_FROM_ADDRESS}>`,
      to: [email],
      subject: `Thank you for contacting VoiceCastingPro - We'll be in touch soon!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af, #3730a3); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🎤 VoiceCastingPro</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Thank You for Reaching Out!</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e40af; margin-top: 0;">Hi ${name}! 👋</h2>
            
            <p>Thank you for contacting VoiceCastingPro! We've received your message and our team will get back to you within <strong>24 hours</strong>.</p>
            
            <div style="background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">⚡ What happens next?</h3>
              <ul style="margin: 10px 0;">
                <li>Our support team will review your inquiry</li>
                <li>You'll receive a personalized response within 24 hours</li>
                <li>We'll provide detailed answers and next steps</li>
                <li>If needed, we'll schedule a call to discuss your project</li>
              </ul>
            </div>
            
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #475569;">📋 Your Submission Summary:</h4>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            ${attachments && attachments.length > 0 ? `
              <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #475569;">📎 Attachments:</h4>
                <ul style="margin: 10px 0;">
                  ${attachments.map(file => `
                    <li>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
            
            <p>If you have any urgent questions, you can also reach us at:</p>
            <ul>
              <li>📧 Email: <a href="mailto:${process.env.SUPPORT_EMAIL || process.env.SMTP_USER}">${process.env.SUPPORT_EMAIL || process.env.SMTP_USER}</a></li>
            </ul>
          </div>
          
          <div style="background: #64748b; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p><strong>VoiceCastingPro Team</strong></p>
            <p>Connecting voices with opportunities worldwide</p>
            <p style="font-size: 12px; opacity: 0.8; margin-top: 15px;">
              This is an automated confirmation email. Please do not reply to this message.
            </p>
          </div>
        </div>
      `
    });

    if (userError) {
      console.error('User confirmation email error:', userError);
      // We still return success since the admin notification was sent
      return res.status(200).json({ 
        success: true, 
        message: 'Admin notification sent, but user confirmation failed',
        warning: userError.message
      });
    }

    console.log('User confirmation email sent successfully:', userData);
    res.status(200).json({ success: true, message: 'Emails sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send email' });
  }
});

export default router;