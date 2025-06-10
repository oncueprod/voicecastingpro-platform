const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Email configuration with voicecastingpros.com
let transporter;

function initializeEmailTransporter() {
  console.log('🔧 Initializing email transporter...');
  
  const requiredEmailVars = ['EMAIL_USER', 'EMAIL_PASS', 'SMTP_HOST', 'SMTP_PORT'];
  const missingVars = requiredEmailVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`❌ Missing email environment variables: ${missingVars.join(', ')}`);
    console.log('📧 Email functionality will be disabled');
    return null;
  }
  
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  };
  
  if (process.env.SMTP_PORT == 587) {
    smtpConfig.requireTLS = true;
  }
  
  console.log('📧 SMTP Configuration:', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    user: smtpConfig.auth.user,
    requireTLS: smtpConfig.requireTLS || false
  });
  
  try {
    transporter = nodemailer.createTransport(smtpConfig);
    
    transporter.verify((error, success) => {
      if (error) {
        console.log('❌ SMTP Configuration Error:', error.message);
        console.log('🔧 Check your email environment variables:');
        console.log('   - SMTP_HOST:', process.env.SMTP_HOST);
        console.log('   - SMTP_PORT:', process.env.SMTP_PORT);
        console.log('   - EMAIL_USER:', process.env.EMAIL_USER);
        console.log('   - EMAIL_PASS: [hidden]');
      } else {
        console.log('✅ SMTP server connection established successfully');
        console.log(`📧 Email service ready: ${process.env.EMAIL_USER}`);
      }
    });
    
    return transporter;
    
  } catch (error) {
    console.log('❌ Failed to create email transporter:', error.message);
    return null;
  }
}

// Initialize email transporter
transporter = initializeEmailTransporter();

// Email sending function
async function sendEmail(mailOptions) {
  if (!transporter) {
    throw new Error('Email service not configured');
  }
  
  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      ...mailOptions
    });
    
    console.log('✅ Email sent successfully:', result.messageId);
    return result;
    
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
}

// Database initialization
async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('client', 'talent')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS talent_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        languages TEXT,
        specialties TEXT,
        hourly_rate_min INTEGER DEFAULT 50,
        hourly_rate_max INTEGER DEFAULT 100,
        experience_years INTEGER DEFAULT 0,
        equipment_description TEXT,
        rating DECIMAL(3,2) DEFAULT 5.0,
        completed_projects INTEGER DEFAULT 0,
        demo_count INTEGER DEFAULT 0,
        subscription_active BOOLEAN DEFAULT FALSE,
        subscription_type VARCHAR(20),
        subscription_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        language VARCHAR(100),
        genre VARCHAR(100),
        voice_gender VARCHAR(20),
        budget_min INTEGER,
        budget_max INTEGER,
        estimated_duration VARCHAR(100),
        deadline DATE,
        client_email VARCHAR(255),
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        amount DECIMAL(10,2) NOT NULL,
        billing_cycle VARCHAR(20) NOT NULL,
        starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    client.release();
    console.log('✅ Database tables initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test email endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    if (!transporter) {
      return res.status(500).json({ error: 'Email service not configured' });
    }
    
    await transporter.verify();
    
    res.json({ 
      success: true, 
      message: 'Email configuration is working',
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.EMAIL_USER
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Email test failed: ' + error.message,
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.EMAIL_USER
      }
    });
  }
});

// Authentication routes

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, accountType } = req.body;
    
    if (!email || !password || !firstName || !lastName || !accountType) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (!['client', 'talent'].includes(accountType)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }
    
    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, account_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, account_type',
      [email, passwordHash, firstName, lastName, accountType]
    );
    
    const user = result.rows[0];
    
    // Create talent profile if talent account
    if (accountType === 'talent') {
      await pool.query(
        'INSERT INTO talent_profiles (user_id) VALUES ($1)',
        [user.id]
      );
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, accountType: user.account_type },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        account_type: user.account_type
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, accountType: user.account_type },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        account_type: user.account_type
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Password reset request
app.post('/api/auth/password-reset-request', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const result = await pool.query('SELECT first_name, last_name FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Don't reveal if email exists or not
      return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent' });
    }
    
    const user = result.rows[0];
    
    // Generate reset token (in production, store this in database with expiration)
    const resetToken = jwt.sign(
      { email: email, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    // Send password reset email
    const resetLink = `${process.env.FRONTEND_URL || 'https://voicecastingpro.onrender.com'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      to: email,
      subject: 'Password Reset - VoicecastingPro',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${user.first_name},</p>
        <p>We received a request to reset your password for your VoicecastingPro account.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <p>Best regards,<br>The VoicecastingPro Team</p>
      `
    };
    
    await sendEmail(mailOptions);
    
    res.json({ success: true, message: 'Password reset instructions sent to your email' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Failed to send password reset email' });
  }
});

// Contact form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const mailOptions = {
      to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
      subject: `Contact Form: ${subject}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Sent from VoicecastingPro contact form</small></p>
      `,
      replyTo: email
    };
    
    await sendEmail(mailOptions);
    
    res.json({ success: true, message: 'Message sent successfully' });
    
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      error: 'Failed to send message: ' + error.message 
    });
  }
});

// Talent contact
app.post('/api/contact/talent', authenticateToken, async (req, res) => {
  try {
    const { talentName, talentEmail, clientName, clientEmail, subject, message, budget } = req.body;
    
    if (!talentName || !talentEmail || !subject || !message) {
      return res.status(400).json({ error: 'Required fields missing' });
    }
    
    const mailOptions = {
      to: talentEmail,
      subject: `Project Inquiry: ${subject}`,
      html: `
        <h3>New Project Inquiry from VoicecastingPro</h3>
        <p>Hi ${talentName},</p>
        <p>You have received a new project inquiry through VoicecastingPro:</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${clientName} (${clientEmail})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          ${budget ? `<p><strong>Budget:</strong> ${budget}</p>` : ''}
        </div>
        
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        
        <p>You can respond directly to this email to get in touch with ${clientName}.</p>
        
        <p>Best regards,<br>The VoicecastingPro Team</p>
      `,
      replyTo: clientEmail
    };
    
    await sendEmail(mailOptions);
    
    res.json({ success: true, message: 'Message sent to talent successfully' });
    
  } catch (error) {
    console.error('Talent contact error:', error);
    res.status(500).json({ error: 'Failed to send message to talent' });
  }
});

// Get talent profiles
app.get('/api/talent', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.account_type,
        tp.bio,
        tp.languages,
        tp.specialties,
        tp.hourly_rate_min,
        tp.hourly_rate_max,
        tp.experience_years,
        tp.rating,
        tp.completed_projects,
        tp.demo_count,
        tp.subscription_active
      FROM users u
      LEFT JOIN talent_profiles tp ON u.id = tp.user_id
      WHERE u.account_type = 'talent' AND tp.bio IS NOT NULL
      ORDER BY tp.rating DESC, tp.completed_projects DESC
    `);
    
    res.json({ talent: result.rows });
    
  } catch (error) {
    console.error('Get talent error:', error);
    res.status(500).json({ error: 'Failed to fetch talent profiles' });
  }
});

// Update talent profile
app.post('/api/talent/profile', authenticateToken, async (req, res) => {
  try {
    const { bio, languages, specialties, hourlyRateMin, hourlyRateMax, experienceYears, equipmentDescription } = req.body;
    
    await pool.query(`
      UPDATE talent_profiles 
      SET bio = $1, languages = $2, specialties = $3, hourly_rate_min = $4, 
          hourly_rate_max = $5, experience_years = $6, equipment_description = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $8
    `, [bio, languages, specialties, hourlyRateMin, hourlyRateMax, experienceYears, equipmentDescription, req.user.userId]);
    
    res.json({ success: true, message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get projects
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        u.first_name as client_first_name,
        u.last_name as client_last_name
      FROM projects p
      JOIN users u ON p.client_id = u.id
      WHERE p.status = 'open'
      ORDER BY p.created_at DESC
    `);
    
    res.json({ projects: result.rows });
    
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Create project
app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { 
      title, description, language, genre, voiceGender, 
      budgetMin, budgetMax, estimatedDuration, deadline, clientEmail 
    } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO projects (
        client_id, title, description, language, genre, voice_gender,
        budget_min, budget_max, estimated_duration, deadline, client_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      req.user.userId, title, description, language, genre, voiceGender,
      budgetMin, budgetMax, estimatedDuration, deadline, clientEmail
    ]);
    
    res.json({ success: true, projectId: result.rows[0].id });
    
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Create subscription
app.post('/api/subscriptions/create', authenticateToken, async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!['monthly', 'annual'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }
    
    const amount = planType === 'monthly' ? 35 : 348;
    const billingCycle = planType === 'monthly' ? 'monthly' : 'annual';
    
    // Create subscription record
    const expiresAt = new Date();
    if (planType === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }
    
    await pool.query(`
      INSERT INTO subscriptions (user_id, plan_type, amount, billing_cycle, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.user.userId, planType, amount, billingCycle, expiresAt]);
    
    // Update talent profile subscription status
    await pool.query(`
      UPDATE talent_profiles 
      SET subscription_active = true, subscription_type = $1, subscription_expires_at = $2
      WHERE user_id = $3
    `, [planType, expiresAt, req.user.userId]);
    
    res.json({ success: true, message: 'Subscription created successfully' });
    
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Serve static files (your frontend)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
async function startServer() {
  const port = process.env.PORT || 3000;
  
  console.log(`🚀 VoicecastingPro backend running on port ${port}`);
  console.log(`📧 Email configured: ${transporter ? 'Yes' : 'No'}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize database
  await initializeDatabase();
  
  app.listen(port, () => {
    console.log(`✅ Server is listening on port ${port}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});