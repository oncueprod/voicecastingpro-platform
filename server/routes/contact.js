import express from 'express';
import { Resend } from 'resend';

const router = express.Router();

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    console.log('=== Contact Form Debug ===');
    console.log('Form data:', { name, email, subject, message });

    // Send email to admin (you)
    const { data: adminData, error: adminError } = await resend.emails.send({
      from: `Contact Form <noreply@voicecastingpro.com>`,
      to: [process.env.TO_EMAIL],
      subject: subject || 'New Contact Form Submission',
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `
    });

    if (adminError) {
      console.error('Admin email error:', adminError);
      return res.status(500).json({ success: false, error: 'Failed to send admin notification' });
    }

    console.log('Admin email sent successfully:', adminData);

    // Send confirmation email to the person who submitted the form
    const { data: confirmData, error: confirmError } = await resend.emails.send({
      from: `VoiceCastingPro Support <noreply@voicecastingpro.com>`,
      to: [email],
      subject: 'Thank you for contacting VoiceCastingPro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Thank you for contacting us!</h2>
          
          <p>Hi ${name},</p>
          
          <p>We've received your message and wanted to confirm that it reached us successfully. Our team will review your inquiry and respond within 24 hours.</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #475569; margin-top: 0;">Your Message Summary:</h3>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong> ${message}</p>
          </div>
          
          <p>If you have any urgent questions, you can also email us directly at <a href="mailto:support@voicecastingpro.com">support@voicecastingpro.com</a>.</p>
          
          <p>Thank you for choosing VoiceCastingPro!</p>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; color: #64748b; font-size: 12px;">
            <p>This is an automated confirmation email. Please do not reply to this email.</p>
            <p>VoiceCastingPro Team</p>
          </div>
        </div>
      `
    });

    if (confirmError) {
      console.error('Confirmation email error:', confirmError);
      // Don't fail the whole request if confirmation email fails
      console.log('Admin email sent, but confirmation email failed');
    } else {
      console.log('Confirmation email sent successfully:', confirmData);
    }

    res.status(200).json({ success: true, message: 'Message sent successfully and confirmation email delivered' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

export default router;