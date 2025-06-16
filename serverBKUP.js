const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();

// Create uploads directories if they don't exist
const demosDir = path.join(__dirname, 'uploads', 'demos');
const profilesDir = path.join(__dirname, 'uploads', 'profiles');

if (!fs.existsSync(demosDir)) {
  fs.mkdirSync(demosDir, { recursive: true });
  console.log('✅ Created uploads/demos directory');
}

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
  console.log('✅ Created uploads/profiles directory');
}

// Configure multer for demo uploads
const demoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, demosDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'demo-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

const uploadDemo = multer({ 
  storage: demoStorage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aiff', 'audio/m4a', 'audio/x-m4a'];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

// Configure multer for profile photo uploads
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profilesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'profile-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, JPG, PNG, GIF) are allowed!'));
    }
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files with proper headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'public, max-age=31536000');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Email configuration
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
        console.log('🔧 Check your email environment variables');
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
    
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Create tables with profile_photo column
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('client', 'talent')),
        profile_photo VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add profile_photo column if it doesn't exist (for existing databases)
    try {
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(255)
      `);
    } catch (error) {
      console.log('Profile photo column may already exist');
    }
    
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
    
    // Create subscriptions table with proper structure
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
    
    // Ensure status column exists and has proper structure
    console.log('🔧 Checking subscriptions table structure...');
    
    // Check if subscriptions table exists and get its structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' AND table_schema = 'public'
    `);
    
    console.log('📊 Current subscriptions table structure:', tableInfo.rows);
    
    // Add missing columns if needed
    const existingColumns = tableInfo.rows.map(row => row.column_name);
    
    if (!existingColumns.includes('status')) {
      console.log('➕ Adding missing status column...');
      await client.query(`
        ALTER TABLE subscriptions ADD COLUMN status VARCHAR(20) DEFAULT 'active'
      `);
      console.log('✅ Added status column to subscriptions table');
    }
    
    if (!existingColumns.includes('plan_type')) {
      console.log('➕ Adding missing plan_type column...');
      await client.query(`
        ALTER TABLE subscriptions ADD COLUMN plan_type VARCHAR(20) NOT NULL DEFAULT 'monthly'
      `);
      console.log('✅ Added plan_type column to subscriptions table');
    }
    
    if (!existingColumns.includes('amount')) {
      console.log('➕ Adding missing amount column...');
      await client.query(`
        ALTER TABLE subscriptions ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 35.00
      `);
      console.log('✅ Added amount column to subscriptions table');
    }
    
    if (!existingColumns.includes('expires_at')) {
      console.log('➕ Adding missing expires_at column...');
      await client.query(`
        ALTER TABLE subscriptions ADD COLUMN expires_at TIMESTAMP
      `);
      console.log('✅ Added expires_at column to subscriptions table');
    }
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS talent_demos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        filename VARCHAR(255) NOT NULL,
        file_size INTEGER,
        duration VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Final verification of subscriptions table
    const finalTableInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    console.log('✅ Final subscriptions table structure:', finalTableInfo.rows);

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

// Profile photo upload endpoint
app.post('/api/auth/upload-profile-photo', authenticateToken, uploadProfile.single('profilePhoto'), async (req, res) => {
  try {
    console.log('📸 Profile photo upload request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = req.file.filename;
    const userId = req.user.userId;

    console.log('📸 Uploading profile photo:', {
      userId: userId,
      filename: filename,
      size: req.file.size
    });

    // Update user profile photo in database
    await pool.query('UPDATE users SET profile_photo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [filename, userId]);

    console.log('✅ Profile photo saved to database');

    res.json({ 
      success: true, 
      filename: filename,
      message: 'Profile photo uploaded successfully' 
    });

  } catch (error) {
    console.error('❌ Profile photo upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile photo: ' + error.message });
  }
});

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
    
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, account_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, account_type, profile_photo',
      [email, passwordHash, firstName, lastName, accountType]
    );
    
    const user = result.rows[0];
    
    if (accountType === 'talent') {
      await pool.query(
        'INSERT INTO talent_profiles (user_id) VALUES ($1)',
        [user.id]
      );
    }
    
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
        account_type: user.account_type,
        profile_photo: user.profile_photo
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
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
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
        account_type: user.account_type,
        profile_photo: user.profile_photo
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
    
    const result = await pool.query('SELECT first_name, last_name FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent' });
    }
    
    const user = result.rows[0];
    
    const resetToken = jwt.sign(
      { email: email, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
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

// Password reset completion
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid token purpose' });
    }
    
    const email = decoded.email;
    
    const userResult = await pool.query('SELECT id, first_name FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [passwordHash, email]
    );
    
    try {
      const mailOptions = {
        to: email,
        subject: 'Password Reset Successful - VoicecastingPro',
        html: `
          <h2>Password Reset Successful</h2>
          <p>Hi ${user.first_name},</p>
          <p>Your password has been successfully reset for your VoicecastingPro account.</p>
          <p>You can now sign in with your new password.</p>
          <p>If you didn't make this change, please contact us immediately.</p>
          <p>Best regards,<br>The VoicecastingPro Team</p>
        `
      };
      
      if (transporter) {
        await sendEmail(mailOptions);
      }
    } catch (emailError) {
      console.error('Failed to send password reset confirmation email:', emailError);
    }
    
    res.json({ 
      success: true, 
      message: 'Password reset successful! You can now sign in with your new password.' 
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

// Update user basic information
app.put('/api/auth/update-profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    
    await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [firstName, lastName, req.user.userId]
    );
    
    res.json({ success: true, message: 'Profile updated successfully' });
    
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get current user's talent profile
app.get('/api/talent/profile/me', authenticateToken, async (req, res) => {
  try {
    if (req.user.accountType !== 'talent') {
      return res.status(403).json({ error: 'Only talent accounts can access this endpoint' });
    }

    const result = await pool.query(`
      SELECT 
        tp.*,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_photo
      FROM talent_profiles tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.user_id = $1
    `, [req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Talent profile not found' });
    }

    res.json({ profile: result.rows[0] });

  } catch (error) {
    console.error('Get talent profile error:', error);
    res.status(500).json({ error: 'Failed to fetch talent profile' });
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

// Get talent demos (current user)
app.get('/api/talent/demos', authenticateToken, async (req, res) => {
  try {
    if (req.user.accountType !== 'talent') {
      return res.status(403).json({ error: 'Only talent accounts can access demos' });
    }

    const result = await pool.query(`
      SELECT id, title, description, filename, duration, created_at
      FROM talent_demos 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [req.user.userId]);

    const demos = result.rows.map(demo => ({
      ...demo,
      url: `/uploads/demos/${demo.filename}`
    }));

    res.json({ demos });

  } catch (error) {
    console.error('Get demos error:', error);
    res.status(500).json({ error: 'Failed to fetch demos' });
  }
});

// Get specific talent's demos (for Browse Talent page)
app.get('/api/talent/:talentId/demos', async (req, res) => {
  try {
    const { talentId } = req.params;

    const result = await pool.query(`
      SELECT 
        td.id, td.title, td.description, td.filename, td.duration, td.created_at,
        u.email as talent_email
      FROM talent_demos td
      JOIN users u ON td.user_id = u.id
      WHERE td.user_id = $1 
      ORDER BY td.created_at DESC
    `, [talentId]);

    const demos = result.rows.map(demo => ({
      ...demo,
      url: `/uploads/demos/${demo.filename}`
    }));

    res.json({ demos });

  } catch (error) {
    console.error('Get talent demos error:', error);
    res.status(500).json({ error: 'Failed to fetch talent demos' });
  }
});

// Upload new demo
app.post('/api/talent/demos', authenticateToken, uploadDemo.single('audioFile'), async (req, res) => {
  try {
    if (req.user.accountType !== 'talent') {
      return res.status(403).json({ error: 'Only talent accounts can upload demos' });
    }

    const { title, description } = req.body;
    const audioFile = req.file;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    console.log('📁 Demo upload:', {
      title,
      filename: audioFile.filename,
      size: audioFile.size
    });

    const result = await pool.query(`
      INSERT INTO talent_demos (user_id, title, description, filename, file_size, duration)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      req.user.userId, 
      title, 
      description || '', 
      audioFile.filename, 
      audioFile.size,
      '0:00'
    ]);

    // Update demo count
    await pool.query(`
      UPDATE talent_profiles 
      SET demo_count = (
        SELECT COUNT(*) FROM talent_demos WHERE user_id = $1
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [req.user.userId]);

    res.json({ 
      success: true, 
      demo: {
        id: result.rows[0].id,
        title,
        description: description || '',
        filename: audioFile.filename,
        url: `/uploads/demos/${audioFile.filename}`,
        created_at: new Date().toISOString()
      },
      message: 'Demo uploaded successfully' 
    });

  } catch (error) {
    console.error('Upload demo error:', error);
    res.status(500).json({ error: 'Failed to upload demo: ' + error.message });
  }
});

// Delete demo with file cleanup
app.delete('/api/talent/demos/:demoId', authenticateToken, async (req, res) => {
  try {
    if (req.user.accountType !== 'talent') {
      return res.status(403).json({ error: 'Only talent accounts can delete demos' });
    }

    const { demoId } = req.params;

    const demoResult = await pool.query(
      'SELECT filename FROM talent_demos WHERE id = $1 AND user_id = $2',
      [demoId, req.user.userId]
    );

    if (demoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Demo not found or not owned by user' });
    }

    const demo = demoResult.rows[0];

    // Delete file from filesystem
    const filePath = path.join(demosDir, demo.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ Deleted file:', filePath);
    }

    await pool.query('DELETE FROM talent_demos WHERE id = $1', [demoId]);

    // Update demo count
    await pool.query(`
      UPDATE talent_profiles 
      SET demo_count = (
        SELECT COUNT(*) FROM talent_demos WHERE user_id = $1
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
    `, [req.user.userId]);

    res.json({ success: true, message: 'Demo deleted successfully' });

  } catch (error) {
    console.error('Delete demo error:', error);
    res.status(500).json({ error: 'Failed to delete demo' });
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

// FIXED: Get subscription status with better error handling
app.get('/api/subscriptions/status', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Checking subscription status for user:', req.user.userId);
    
    if (req.user.accountType !== 'talent') {
      return res.status(403).json({ error: 'Only talent accounts can check subscription status' });
    }

    // First, check if subscriptions table exists and has the required columns
    const tableCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'subscriptions' AND table_schema = 'public'
    `);
    
    console.log('📊 Available columns in subscriptions table:', tableCheck.rows.map(r => r.column_name));
    
    const availableColumns = tableCheck.rows.map(row => row.column_name);
    const requiredColumns = ['plan_type', 'status', 'amount', 'expires_at', 'created_at'];
    const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.error('❌ Missing columns in subscriptions table:', missingColumns);
      return res.status(500).json({ 
        error: 'Database structure issue: missing columns in subscriptions table',
        missingColumns: missingColumns
      });
    }

    // Try to get subscription with only available columns
    let query, params;
    
    if (availableColumns.includes('status')) {
      // Full query if status column exists
      query = `
        SELECT plan_type, status, amount, expires_at, created_at
        FROM subscriptions 
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      params = [req.user.userId];
    } else {
      // Fallback query without status filter
      console.log('⚠️ Status column not found, querying without status filter');
      query = `
        SELECT plan_type, amount, expires_at, created_at
        FROM subscriptions 
        WHERE user_id = $1
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      params = [req.user.userId];
    }

    console.log('🔍 Executing query:', query);
    const result = await pool.query(query, params);

    console.log('📊 Subscription query result:', result.rows);

    if (result.rows.length === 0) {
      console.log('❌ No subscription found for user');
      return res.json({ subscription: null });
    }

    const subscription = result.rows[0];
    
    // Calculate status based on expiration date if no status column
    let status = subscription.status || 'active';
    if (subscription.expires_at) {
      const now = new Date();
      const expiresAt = new Date(subscription.expires_at);
      const isActive = expiresAt > now;
      status = isActive ? 'active' : 'expired';
    }
    
    console.log('📅 Subscription details:', {
      plan_type: subscription.plan_type,
      expires_at: subscription.expires_at,
      calculated_status: status
    });
    
    res.json({ 
      subscription: {
        plan_type: subscription.plan_type,
        status: status,
        amount: subscription.amount,
        next_billing_date: subscription.expires_at,
        created_at: subscription.created_at
      }
    });

  } catch (error) {
    console.error('❌ Get subscription status error:', error);
    
    // Provide detailed error information for debugging
    const errorDetails = {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    };
    
    console.error('🔍 Detailed error info:', errorDetails);
    
    res.status(500).json({ 
      error: 'Failed to fetch subscription status',
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    });
  }
});

// Cancel subscription
app.post('/api/subscriptions/cancel', authenticateToken, async (req, res) => {
  try {
    if (req.user.accountType !== 'talent') {
      return res.status(403).json({ error: 'Only talent accounts can cancel subscriptions' });
    }

    await pool.query(`
      UPDATE subscriptions 
      SET status = 'cancelled'
      WHERE user_id = $1 AND status = 'active'
    `, [req.user.userId]);

    await pool.query(`
      UPDATE talent_profiles 
      SET subscription_active = false
      WHERE user_id = $1
    `, [req.user.userId]);

    res.json({ success: true, message: 'Subscription cancelled successfully' });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Get talent profiles (with profile photos)
app.get('/api/talent', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.account_type,
        u.profile_photo,
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

// Update/Edit project
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;
    const { 
      title, description, language, genre, voiceGender, 
      budgetMin, budgetMax, estimatedDuration, deadline, clientEmail 
    } = req.body;
    
    console.log('✏️ Edit request:', { projectId, userId, title });
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    // Only allow clients to edit their own projects
    const result = await pool.query(`
      UPDATE projects SET 
        title = $1, description = $2, language = $3, genre = $4, 
        voice_gender = $5, budget_min = $6, budget_max = $7, 
        estimated_duration = $8, deadline = $9, client_email = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 AND client_id = $12
      RETURNING *
    `, [
      title, description, language, genre, voiceGender,
      budgetMin, budgetMax, estimatedDuration, deadline, clientEmail,
      projectId, userId
    ]);
    
    if (result.rows.length === 0) {
      console.log('❌ Project not found or not authorized');
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;
    
    console.log('🗑️ Delete request:', { projectId, userId, accountType: req.user.accountType });
    
    // Only allow clients to delete their own projects
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND client_id = $2 RETURNING *',
      [projectId, userId]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Project not found or not authorized');
      return res.status(404).json({ error: 'Project not found or not authorized to delete' });
    }
    
    console.log('✅ Project deleted successfully:', result.rows[0].title);
    res.json({ success: true, message: 'Project deleted successfully' });
    
  } catch (error) {
    console.error('❌ Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project: ' + error.message });
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
    
    const expiresAt = new Date();
    if (planType === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }
    
    // Cancel any existing active subscriptions
    await pool.query(`
      UPDATE subscriptions 
      SET status = 'cancelled'
      WHERE user_id = $1 AND status = 'active'
    `, [req.user.userId]);
    
    // Create new subscription
    await pool.query(`
      INSERT INTO subscriptions (user_id, plan_type, amount, billing_cycle, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.user.userId, planType, amount, billingCycle, expiresAt]);
    
    // Update talent profile
    await pool.query(`
      UPDATE talent_profiles 
      SET subscription_active = true, subscription_type = $1, subscription_expires_at = $2
      WHERE user_id = $3
    `, [planType, expiresAt, req.user.userId]);
    
    console.log('✅ Subscription created successfully for user:', req.user.userId);
    
    res.json({ success: true, message: 'Subscription created successfully' });
    
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return next();
  }
  
  const indexPath = path.join(__dirname, 'public', 'index.html');
  console.log(`📄 SPA Request: ${req.method} ${req.path}`);
  
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ index.html not found at: ${indexPath}`);
    return res.status(404).send(`File not found: ${indexPath}`);
  }
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).send('Error loading page');
    } else {
      console.log(`✅ Successfully served: ${req.path}`);
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  const port = process.env.PORT || 3000;
  
  console.log(`🚀 VoicecastingPro backend running on port ${port}`);
  console.log(`📧 Email configured: ${transporter ? 'Yes' : 'No'}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Uploads directories: ${demosDir}, ${profilesDir}`);
  
  await initializeDatabase();
  
  app.listen(port, () => {
    console.log(`✅ Server is listening on port ${port}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
