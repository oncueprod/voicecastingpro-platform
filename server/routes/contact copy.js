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

    const { data, error } = await resend.emails.send({
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

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ success: false, error: 'Failed to send email' });
    }

    console.log('Email sent successfully:', data);
    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

export default router;