// ============================================================================
// UPDATED emailService.ts - Replace your current file with this version
// ============================================================================

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  fromAddress: string;
  supportEmail: string;
}

class EmailService {
  private config: EmailConfig;

  constructor() {
    // NEW: Simplified constructor - no config needed since we use backend API
    this.config = {} as EmailConfig;
  }

  // NEW: Updated sendContactForm method that actually calls your backend API
  async sendContactForm(formData: ContactFormData): Promise<boolean> {
    try {
      console.log('📧 Sending contact form to API:', formData);

      // Make API call to your backend
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to send email');
      }

      const result = await response.json();
      console.log('✅ Contact form sent successfully:', result);
      
      return result.success;
    } catch (error) {
      console.error('Failed to send contact form:', error);
      return false;
    }
  }

  // Keep the rest of your methods unchanged (they're not used anyway)
  private createAdminNotificationEmail(formData: ContactFormData): EmailTemplate {
    const subject = `New Contact Form Submission: ${formData.category} - ${formData.subject}`;
    
    // Create attachment list HTML if there are attachments
    let attachmentsHtml = '';
    let attachmentsText = '';
    
    if (formData.attachments && formData.attachments.length > 0) {
      attachmentsHtml = `
        <div class="field">
          <div class="label">📎 Attachments:</div>
          <div class="value">
            <ul style="margin: 0; padding-left: 20px;">
              ${formData.attachments.map(file => `
                <li>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) - ${file.type}</li>
              `).join('')}
            </ul>
          </div>
        </div>
      `;
      
      attachmentsText = `
Attachments:
${formData.attachments.map(file => `- ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB) - ${file.type}`).join('\n')}
      `;
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e40af, #3730a3); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .footer { background: #64748b; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #475569; }
          .value { background: white; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 5px; }
          .priority { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🎤 VoiceCastingPro</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">New Contact Form Submission</p>
          </div>
          
          <div class="content">
            <div class="priority">
              <strong>📋 Category:</strong> ${formData.category.toUpperCase()}
            </div>
            
            <div class="field">
              <div class="label">👤 Contact Information:</div>
              <div class="value">
                <strong>Name:</strong> ${formData.name}<br>
                <strong>Email:</strong> <a href="mailto:${formData.email}">${formData.email}</a>
              </div>
            </div>
            
            <div class="field">
              <div class="label">📝 Subject:</div>
              <div class="value">${formData.subject}</div>
            </div>
            
            <div class="field">
              <div class="label">💬 Message:</div>
              <div class="value">${formData.message.replace(/\n/g, '<br>')}</div>
            </div>
            
            ${attachmentsHtml}
            
            <div class="field">
              <div class="label">⏰ Submitted:</div>
              <div class="value">${new Date().toLocaleString()}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>This email was automatically generated from the VoiceCastingPro contact form.</p>
            <p>Please respond to the customer within 24 hours for optimal service.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
New Contact Form Submission - VoiceCastingPro

Category: ${formData.category.toUpperCase()}
Name: ${formData.name}
Email: ${formData.email}
Subject: ${formData.subject}

Message:
${formData.message}

${attachmentsText}

Submitted: ${new Date().toLocaleString()}

Please respond to the customer within 24 hours.
    `;

    return { subject, html, text };
  }

  private createUserConfirmationEmail(formData: ContactFormData): EmailTemplate {
    const subject = `Thank you for contacting VoiceCastingPro - We'll be in touch soon!`;
    
    // Ensure we have a valid support email
    const supportEmail = this.config.supportEmail || 'support@voicecastingpro.com';
    
    // Create attachment list HTML if there are attachments
    let attachmentsHtml = '';
    
    if (formData.attachments && formData.attachments.length > 0) {
      attachmentsHtml = `
        <div class="summary">
          <h4 style="margin-top: 0; color: #475569;">📎 Attachments:</h4>
          <ul style="margin: 10px 0;">
            ${formData.attachments.map(file => `
              <li>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</li>
            `).join('')}
          </ul>
        </div>
      `;
    }
    
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || 'https://voicecastingpro.com';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You for Contacting Us</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e40af, #3730a3); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
          .footer { background: #64748b; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
          .highlight { background: #dbeafe; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
          .summary { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🎤 VoiceCastingPro</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Thank You for Reaching Out!</p>
          </div>
          
          <div class="content">
            <h2 style="color: #1e40af; margin-top: 0;">Hi ${formData.name}! 👋</h2>
            
            <p>Thank you for contacting VoiceCastingPro! We've received your message and our team will get back to you within <strong>24 hours</strong>.</p>
            
            <div class="highlight">
              <h3 style="margin-top: 0; color: #1e40af;">⚡ What happens next?</h3>
              <ul style="margin: 10px 0;">
                <li>Our support team will review your inquiry</li>
                <li>You'll receive a personalized response within 24 hours</li>
                <li>We'll provide detailed answers and next steps</li>
                <li>If needed, we'll schedule a call to discuss your project</li>
              </ul>
            </div>
            
            <div class="summary">
              <h4 style="margin-top: 0; color: #475569;">📋 Your Submission Summary:</h4>
              <p><strong>Category:</strong> ${formData.category}</p>
              <p><strong>Subject:</strong> ${formData.subject}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            ${attachmentsHtml}
            
            <p>While you wait, feel free to explore our platform:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${frontendUrl}" class="button">Browse Voice Talent</a>
              <a href="${frontendUrl}/help-center" class="button" style="background: #059669;">Visit Help Center</a>
            </div>
            
            <p>If you have any urgent questions, you can also reach us at:</p>
            <ul>
              <li>📧 Email: <a href="mailto:${supportEmail}">${supportEmail}</a></li>
            </ul>
          </div>
          
          <div class="footer">
            <p><strong>VoiceCastingPro Team</strong></p>
            <p>Connecting voices with opportunities worldwide</p>
            <p style="font-size: 12px; opacity: 0.8; margin-top: 15px;">
              This is an automated confirmation email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Thank you for contacting VoiceCastingPro!

Hi ${formData.name},

We've received your message and our team will get back to you within 24 hours.

Your Submission Summary:
- Category: ${formData.category}
- Subject: ${formData.subject}
- Submitted: ${new Date().toLocaleString()}

${formData.attachments && formData.attachments.length > 0 ? 
`Attachments:
${formData.attachments.map(file => `- ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`).join('\n')}
` : ''}

What happens next?
- Our support team will review your inquiry
- You'll receive a personalized response within 24 hours
- We'll provide detailed answers and next steps
- If needed, we'll schedule a call to discuss your project

Contact Information:
- Email: ${supportEmail}

Thank you for choosing VoiceCastingPro!

The VoiceCastingPro Team
Connecting voices with opportunities worldwide
    `;

    return { subject, html, text };
  }

  // Get sent emails for admin dashboard
  getSentEmails(): any[] {
    try {
      return JSON.parse(localStorage.getItem('sent_emails') || '[]');
    } catch {
      return [];
    }
  }

  // Clear sent emails (for testing)
  clearSentEmails(): void {
    localStorage.removeItem('sent_emails');
  }
}

export const emailService = new EmailService();
export type { ContactFormData };

// ============================================================================
// WHAT CHANGED:
// ============================================================================
// 
// OLD constructor:
// constructor() {
//   this.config = {
//     smtpHost: import.meta.env.VITE_SMTP_HOST || 'mail.voicecastingpro.com',
//     smtpPort: parseInt(import.meta.env.VITE_SMTP_PORT || '587'),
//     // ... lots of environment variables
//   };
// }
//
// NEW constructor:
// constructor() {
//   this.config = {} as EmailConfig;
// }
//
// ============================================================================
//
// OLD sendContactForm method (FAKE - just stored in localStorage):
// async sendContactForm(formData: ContactFormData): Promise<boolean> {
//   try {
//     // ... creates email templates ...
//     
//     // Store email in localStorage for demo (in production, this would be sent via SMTP)
//     const sentEmails = JSON.parse(localStorage.getItem('sent_emails') || '[]');
//     sentEmails.push({...});
//     localStorage.setItem('sent_emails', JSON.stringify(sentEmails));
//     
//     return true; // Always returned true, never sent real emails!
//   }
// }
//
// NEW sendContactForm method (REAL - calls your backend API):
// async sendContactForm(formData: ContactFormData): Promise<boolean> {
//   try {
//     const response = await fetch('/api/contact', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(formData)
//     });
//     
//     const result = await response.json();
//     return result.success;
//   }
// }
//
// ============================================================================