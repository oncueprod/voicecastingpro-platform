require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Add PayPal SDK
const paypal = require('@paypal/checkout-server-sdk');
const payouts = require('@paypal/payouts-sdk');

// PayPal Configuration
const Environment = process.env.PAYPAL_ENVIRONMENT === 'live' 
    ? paypal.core.LiveEnvironment 
    : paypal.core.SandboxEnvironment;

const paypalClient = new paypal.core.PayPalHttpClient(
    new Environment(
        process.env.PAYPAL_CLIENT_ID || 'AXOrnxVTPG4w2eAqaY2KnZKplxouVL3lfU2AWdU-S6U5Waq8CnpUzs9Zdjkkm3I1tdyv4o3XDZPTPLe9',
        process.env.PAYPAL_CLIENT_SECRET || 'EPiihyjJkkLz_NWgpv5ZXU7mdkrBtpXY5zlQVqsogd4IqfPrUUgD-p_mpyheO7WELTU5FVDYBUPimMwR'
    )
);

// Log PayPal environment
console.log(`🔧 PayPal Environment: ${process.env.PAYPAL_ENVIRONMENT || 'sandbox (default)'}`);

// Validate PayPal configuration
if (!process.env.PAYPAL_CLIENT_ID) {
    console.warn('⚠️ Using default PayPal sandbox credentials.');
}
if (!process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_CLIENT_SECRET === 'your-paypal-secret-key') {
    console.warn('⚠️ PayPal Client Secret not properly configured.');
}

// PayPal Webhook Configuration
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

// Create uploads directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const attachmentsDir = path.join(uploadsDir, 'attachments');



// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(attachmentsDir)) {
    fs.mkdirSync(attachmentsDir, { recursive: true });
}

// Configure multer for message attachments
const attachmentStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, attachmentsDir);
    },
    filename: function (req, file, cb) {
        // Create unique filename: timestamp-userId-originalname
        const userId = req.user ? req.user.id : 'unknown';
        const timestamp = Date.now();
        const cleanFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}-${userId}-${cleanFilename}`);
    }
});

const attachmentUpload = multer({
    storage: attachmentStorage,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB max file size
    },
fileFilter: function (req, file, cb) {
    // Allowed file types
    const allowedTypes = /\.(txt|pdf|doc|docx|mp3|wav|aiff|m4a|jpg|jpeg|png)$/i;
    
    if (allowedTypes.test(file.originalname)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only audio, script, and image files are allowed.'));
    }
}
});
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

// Serve attachment files
app.use('/uploads/attachments', express.static(path.join(__dirname, 'uploads/attachments')));

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

// Create Payment Tables for PayPal Integration
async function createPaymentTables() {
    try {
        console.log('Creating payment tables...');
        
  // Create escrow_payments table with enhanced fields
await pool.query(`
    CREATE TABLE IF NOT EXISTS escrow_payments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        talent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        paypal_order_id VARCHAR(255) UNIQUE NOT NULL,
        paypal_capture_id VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending',
        payment_type VARCHAR(20) DEFAULT 'escrow',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        captured_at TIMESTAMP,
        released_at TIMESTAMP,
        refunded_at TIMESTAMP
    )
`);


// Create payment_history table for audit trail
await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER,
        payment_type VARCHAR(20) NOT NULL,
        action VARCHAR(50) NOT NULL,
        amount DECIMAL(10,2),
        status_from VARCHAR(50),
        status_to VARCHAR(50),
        paypal_transaction_id VARCHAR(255),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

               // Add payment columns to existing projects table if they don't exist
        try {
            await pool.query(`
                ALTER TABLE projects 
                ADD COLUMN IF NOT EXISTS payment_protection VARCHAR(50),
                ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2)
            `);
            console.log('✅ Added payment columns to projects table');
        } catch (error) {
            console.log('Payment columns may already exist in projects table');
        }
        console.log('✅ Payment tables created successfully');
    } catch (error) {
        console.error('Error creating payment tables:', error.message);
    }
}

// Initialize payment tables when server starts
createPaymentTables();

// Add PayPal payout tracking columns
async function addPayoutColumns() {
    try {
        console.log('🔄 Adding PayPal payout tracking columns...');
        
        await pool.query(`
            ALTER TABLE escrow_payments 
            ADD COLUMN IF NOT EXISTS paypal_payout_batch_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS paypal_payout_item_id VARCHAR(255)
        `);
        
        console.log('✅ PayPal payout columns added successfully');
    } catch (error) {
        console.log('PayPal payout columns may already exist');
    }
}

addPayoutColumns();


// ADD THIS ENTIRE BLOCK RIGHT HERE
async function updateDatabaseSchema() {
    try {
        // Check if columns already exist
        const checkColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name IN ('attachment_url', 'attachment_filename', 'attachment_size')
        `);
        
        const existingColumns = checkColumns.rows.map(row => row.column_name);
        
        // Add missing columns
        if (!existingColumns.includes('attachment_url')) {
            await pool.query('ALTER TABLE messages ADD COLUMN attachment_url VARCHAR(500)');
            console.log('✅ Added attachment_url column');
        }
        
        if (!existingColumns.includes('attachment_filename')) {
            await pool.query('ALTER TABLE messages ADD COLUMN attachment_filename VARCHAR(255)');
            console.log('✅ Added attachment_filename column');
        }
        
        if (!existingColumns.includes('attachment_size')) {
            await pool.query('ALTER TABLE messages ADD COLUMN attachment_size INTEGER');
            console.log('✅ Added attachment_size column');
        }
        
        console.log('📋 Database schema updated successfully');
    } catch (error) {
        console.error('❌ Database schema update failed:', error);
        // Don't crash the server if schema update fails
    }
}

// Call this after pool connection is established
updateDatabaseSchema();


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
console.log('🔍 About to initialize email with env vars:', {
  EMAIL_USER: process.env.EMAIL_USER || 'MISSING',
  SMTP_HOST: process.env.SMTP_HOST || 'MISSING',
  SMTP_PORT: process.env.SMTP_PORT || 'MISSING'
});
transporter = initializeEmailTransporter();
console.log('🔍 Transporter result:', transporter ? 'SUCCESS' : 'FAILED');

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
        expiration_date TIMESTAMP,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add expiration_date column if it doesn't exist (for existing databases)
    try {
      await client.query(`
        ALTER TABLE projects ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP
      `);
    } catch (error) {
      console.log('Expiration date column may already exist');
    }
    
   // Create or fix messages table
    console.log('🔧 Setting up messages table...');
    
    // First, check if messages table exists and get its structure
    const messagesTableCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'messages' AND table_schema = 'public'
    `);
    
    if (messagesTableCheck.rows.length > 0) {
      console.log('📊 Existing messages table columns:', messagesTableCheck.rows.map(r => r.column_name));
      
      // Check if sender_id column exists
      const hasSenderId = messagesTableCheck.rows.some(row => row.column_name === 'sender_id');
      
      if (!hasSenderId) {
        console.log('🔄 Messages table exists but missing columns, recreating...');
        await client.query('DROP TABLE IF EXISTS messages');
      }
    }
    
    // Create the messages table with correct structure
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP,
        deleted_for_sender BOOLEAN DEFAULT FALSE,
        deleted_for_receiver BOOLEAN DEFAULT FALSE
      )
    `);
    
    // Add delete columns if they don't exist (for existing databases)
    try {
      await client.query(`
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_sender BOOLEAN DEFAULT FALSE
      `);
      await client.query(`
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for_receiver BOOLEAN DEFAULT FALSE
      `);
    } catch (error) {
      console.log('Delete columns may already exist');
    }
    console.log('✅ Messages table created/verified successfully');

   // Create subscriptions table with all required columns
    console.log('🔧 Creating subscriptions table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        paypal_subscription_id VARCHAR(255),
        plan_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
        amount DECIMAL(10,2) NOT NULL DEFAULT 35.00,
        billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
        status VARCHAR(20) DEFAULT 'active',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add missing columns for existing databases (if upgrading)
    try {
      await client.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly'`);
      await client.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paypal_subscription_id VARCHAR(255)`);
      console.log('✅ Subscriptions table structure verified');
    } catch (error) {
      console.log('Subscription columns may already exist - this is normal');
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

    // Add updated_at column to talent_demos if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE talent_demos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added updated_at column to talent_demos table');
    } catch (error) {
      console.log('updated_at column may already exist in talent_demos table');
    }

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

// Account deletion endpoint
app.delete('/api/account/delete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId; // FIXED: Use userId instead of id
    const userType = req.user.accountType; // FIXED: Use accountType
    
    console.log(`🗑️ Starting account deletion for user ${userId} (${userType})`);
    
    // Verify the user exists in the database
    const userCheck = await pool.query('SELECT id, email, first_name, account_type FROM users WHERE id = $1', [userId]);
    
    if (userCheck.rows.length === 0) {
      console.log(`❌ User ${userId} not found in database!`);
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    const dbUser = userCheck.rows[0];
    console.log(`✅ Found user in DB: ID=${dbUser.id}, Email=${dbUser.email}, Type=${dbUser.account_type}`);
    
    // Start transaction for data integrity
    await pool.query('BEGIN');
    
    try {
      // Step 1: Cancel active subscriptions first (for talent accounts)
      if (userType === 'talent') {
        try {
          console.log('🔄 Cancelling subscription before account deletion...');
          const subResult = await pool.query('UPDATE subscriptions SET status = $1, cancelled_at = NOW() WHERE user_id = $2 AND status = $3', 
  ['cancelled', userId, 'active']); 
           console.log(`✅ Subscription cancelled (${subResult.rowCount} rows affected)`);
        } catch (subError) {
          console.warn('⚠️ Subscription cancellation failed:', subError);
          // Continue with deletion even if subscription cancellation fails
        }
      }
      
      // Step 2: Delete related data in correct order (to avoid foreign key issues)
      console.log('🗑️ Deleting related data...');
      
      // Delete messages
      const messagesResult = await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
      console.log(`✅ Deleted ${messagesResult.rowCount || 0} messages`);
      
      // Delete project applications (if table exists)
      try {
        const applicationsResult = await pool.query('DELETE FROM project_applications WHERE user_id = $1', [userId]);
        console.log(`✅ Deleted ${applicationsResult.rowCount || 0} applications`);
      } catch (error) {
        if (!error.message.includes('does not exist')) {
          console.log('❌ Applications delete error:', error.message);
        }
      }
      
      // Delete demos
      const demosResult = await pool.query('DELETE FROM talent_demos WHERE user_id = $1', [userId]);
      console.log(`✅ Deleted ${demosResult.rowCount || 0} demos`);
      
      // Delete projects (if client)
      const projectsResult = await pool.query('DELETE FROM projects WHERE client_id = $1', [userId]);
      console.log(`✅ Deleted ${projectsResult.rowCount || 0} projects`);
      
      // Delete talent profile
      const profileResult = await pool.query('DELETE FROM talent_profiles WHERE user_id = $1', [userId]);
      console.log(`✅ Deleted ${profileResult.rowCount || 0} talent profiles`);
      
      // Delete subscriptions
      const subscriptionResult = await pool.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);
      console.log(`✅ Deleted ${subscriptionResult.rowCount || 0} subscriptions`);
      
      // Step 3: Finally delete the user account
      console.log(`🗑️ Deleting user account...`);
      const userResult = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [userId]);
      console.log(`✅ Deleted user account (${userResult.rowCount || 0} rows)`);
      
      // Commit transaction
      await pool.query('COMMIT');
      
      if (userResult.rowCount === 0) {
        throw new Error(`No user deleted. User ID: ${userId}`);
      }
      
      console.log('🎉 Account deletion completed successfully');
      res.json({ 
        success: true, 
        message: 'Account and all related data deleted successfully',
        deletedItems: {
          messages: messagesResult.rowCount || 0,
          demos: demosResult.rowCount || 0,
          projects: projectsResult.rowCount || 0,
          profiles: profileResult.rowCount || 0,
          subscriptions: subscriptionResult.rowCount || 0
        }
      });
      
    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      console.log(`🔄 Transaction rolled back due to error:`, error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Account deletion failed:', error);
    res.status(500).json({ 
      error: 'Failed to delete account: ' + error.message,
      details: error.code || 'Unknown error'
    });
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
        u.profile_photo,
        u.paypal_email 

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
   const { bio, languages, specialties, hourlyRateMin, hourlyRateMax, experienceYears, equipmentDescription, paypal_email } = req.body;
    
    await pool.query(`
      UPDATE talent_profiles 
      SET bio = $1, languages = $2, specialties = $3, hourly_rate_min = $4, 
          hourly_rate_max = $5, experience_years = $6, equipment_description = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $8
    `, [bio, languages, specialties, hourlyRateMin, hourlyRateMax, experienceYears, equipmentDescription, req.user.userId]);
    
    // Also update PayPal email in users table
if (paypal_email) {
    await pool.query(
        'UPDATE users SET paypal_email = $1 WHERE id = $2',
        [paypal_email, req.user.userId]
    );
}
    
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


// Update demo metadata (title/description)
app.put('/api/talent/demos/:demoId', authenticateToken, async (req, res) => {
  try {
    if (req.user.accountType !== 'talent') {
      return res.status(403).json({ error: 'Only talent accounts can update demos' });
    }

    const { demoId } = req.params;
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    console.log('🔄 Updating demo:', { demoId, title, description });

    // Verify demo ownership and update
    const result = await pool.query(`
      UPDATE talent_demos 
      SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND user_id = $4
      RETURNING id, title, description, filename, duration, created_at
    `, [title, description || '', demoId, req.user.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Demo not found or not owned by user' });
    }

    const updatedDemo = result.rows[0];

    console.log('✅ Demo updated successfully:', updatedDemo.title);

    res.json({ 
      success: true, 
      demo: {
        ...updatedDemo,
        url: `/uploads/demos/${updatedDemo.filename}`
      },
      message: 'Demo updated successfully' 
    });

  } catch (error) {
    console.error('❌ Update demo error:', error);
    res.status(500).json({ error: 'Failed to update demo: ' + error.message });
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

   // DEBUG: First check what subscriptions actually exist for this user
    console.log('🔍 DEBUG: Checking ALL subscriptions for user...');
    const debugResult = await pool.query(`
      SELECT id, user_id, plan_type, status, amount, expires_at, created_at, updated_at
      FROM subscriptions 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.userId]);
    
    console.log('📊 DEBUG: ALL subscriptions for user:', debugResult.rows);
    
    if (debugResult.rows.length === 0) {
      console.log('❌ DEBUG: No subscriptions found at all for user');
      return res.json({ subscription: null });
    }

    // Check the most recent subscription regardless of status
    const latestSubscription = debugResult.rows[0];
    console.log('📊 DEBUG: Latest subscription:', latestSubscription);
    
    // Check if it's active (not expired)
    const now = new Date();
    const expiresAt = new Date(latestSubscription.expires_at);
    const isNotExpired = expiresAt > now;
    
    console.log('📅 DEBUG: Time check:', {
      now: now.toISOString(),
      expires_at: latestSubscription.expires_at,
      is_not_expired: isNotExpired,
      stored_status: latestSubscription.status
    });
    
    // Use the latest subscription if it's not expired and status is active
    if (latestSubscription.status === 'active' && isNotExpired) {
      console.log('✅ Found active, non-expired subscription');
      
      res.json({ 
        subscription: {
          plan_type: latestSubscription.plan_type,
          status: 'active',
          amount: latestSubscription.amount,
          next_billing_date: latestSubscription.expires_at,
          created_at: latestSubscription.created_at
        }
      });
    } else {
      console.log('❌ Subscription exists but either not active or expired');
      console.log(`   Status: ${latestSubscription.status}, Expired: ${!isNotExpired}`);
      
      res.json({ 
        subscription: {
          plan_type: latestSubscription.plan_type,
          status: isNotExpired ? latestSubscription.status : 'expired',
          amount: latestSubscription.amount,
          next_billing_date: latestSubscription.expires_at,
          created_at: latestSubscription.created_at
        }
      });
    }
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
        p.expiration_date,
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
      budgetMin, budgetMax, estimatedDuration, deadline, clientEmail, expiration_date 
    } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO projects (
        client_id, title, description, language, genre, voice_gender,
        budget_min, budget_max, estimated_duration, deadline, client_email, expiration_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      req.user.userId, title, description, language, genre, voiceGender,
      budgetMin, budgetMax, estimatedDuration, deadline, clientEmail, expiration_date
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
    
    console.log('Edit request:', { projectId, userId, title });
    
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
      console.log('Project not found or not authorized');
      return res.status(404).json({ error: 'Project not found or not authorized to edit' });
    }
    
    console.log('Project updated successfully:', result.rows[0].title);
    res.json({ success: true, project: result.rows[0], message: 'Project updated successfully' });
    
  } catch (error) {
    console.error('Edit project error:', error);
    res.status(500).json({ error: 'Failed to update project: ' + error.message });
  }
});

// Delete project
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
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

// Apply to project endpoint
app.post('/api/projects/:id/apply', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const talentId = req.user.userId;
    const { coverLetter, proposedRate, timeline } = req.body;
    
    if (req.user.accountType !== 'talent') {
      return res.status(403).json({ error: 'Only talent accounts can apply to projects' });
    }
    
    // Get project details to find client email
    const projectQuery = 'SELECT * FROM projects WHERE id = $1';
    const project = await pool.query(projectQuery, [projectId]);
    
    if (!project || project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get talent details
    const talentQuery = 'SELECT first_name, last_name, email FROM users WHERE id = $1';
    const talent = await pool.query(talentQuery, [talentId]);
    const talentName = `${talent.rows[0].first_name} ${talent.rows[0].last_name}`;
    
    // Log application (you can add email sending later)
    console.log(`✅ New application for project "${project.rows[0].title}":`, {
      talent: talentName,
      talentEmail: talent.rows[0].email,
      coverLetter,
      proposedRate,
      timeline,
      clientEmail: project.rows[0].client_email
    });
    
// STORE APPLICATION AS FIRST MESSAGE IN CONVERSATION
await pool.query(`
  INSERT INTO messages (project_id, sender_id, receiver_id, message_text)
  VALUES ($1, $2, $3, $4)
`, [
  projectId,
  talentId,
  project.rows[0].client_id,
  `🎯 APPLICATION: ${coverLetter}\n\n💰 Proposed Rate: ${proposedRate || 'Not specified'}\n⏰ Timeline: ${timeline || 'Not specified'}`
]);
    // Send email to client if email service is configured
    if (transporter) {
      try {
       const mailOptions = {
          to: project.rows[0].client_email,
          subject: `New Application for "${project.rows[0].title}" - VoicecastingPro`,
          html: `
            <h3>New Project Application</h3>
            <p>You have received a new application for your project:</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4>"${project.rows[0].title}"</h4>
              <p><strong>Voice Talent:</strong> ${talentName}</p>
              ${proposedRate ? `<p><strong>Proposed Rate:</strong> ${proposedRate}</p>` : ''}
              ${timeline ? `<p><strong>Timeline:</strong> ${timeline}</p>` : ''}
            </div>
            
            <p><strong>Cover Letter:</strong></p>
            <p>${coverLetter ? coverLetter.replace(/\n/g, '<br>') : 'No message provided'}</p>
            
<div style="background: #667eea; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
  <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}?page=messages" 
     style="color: white; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; padding: 12px 24px; border-radius: 8px; background: rgba(255,255,255,0.2);">
    📨 View and Respond on VoicecastingPro
  </a>
</div>

<p><strong>To respond to ${talentName}:</strong></p>
<p>1. <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}?page=signin" style="color: #667eea; text-decoration: none; font-weight: bold;">Click here to sign in to your account</a><br>
2. Click "Messages" in the navigation<br>
3. Find your project "${project.rows[0].title}"<br>
4. Click to open the conversation and reply</p>
            
            <p>Best regards,<br>The VoicecastingPro Team</p>
          `
        };
        
        await sendEmail(mailOptions);
        console.log('📧 Application email sent to client');
      } catch (emailError) {
        console.error('❌ Failed to send application email:', emailError);
        // Continue anyway - don't fail the application
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Application sent successfully' 
    });
    
  } catch (error) {
    console.error('Apply to project error:', error);
    res.status(500).json({ error: 'Failed to send application' });
  }
});

// Create subscription
app.post('/api/subscriptions/create', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Processing subscription creation for user:', req.user.userId);
    console.log('📝 Request body:', req.body);
    
    const { planType, subscriptionID, orderID } = req.body;
    
    if (!planType || !['monthly', 'annual'].includes(planType)) {
      console.error('❌ Invalid plan type:', planType);
      return res.status(400).json({ error: 'Invalid plan type' });
    }
    
    const amount = planType === 'monthly' ? 35.00 : 348.00;
    const billingCycle = planType === 'monthly' ? 'monthly' : 'annual';
    
    // Create expiration date more safely
    const expiresAt = new Date();
    if (planType === 'monthly') {
      expiresAt.setDate(expiresAt.getDate() + 30); // Add 30 days
    } else {
      expiresAt.setDate(expiresAt.getDate() + 365); // Add 365 days
    }
    
    console.log('💳 Subscription details:', { planType, amount, billingCycle, expiresAt });
  console.log('🔄 Creating/updating subscription...');
    
    // Cancel existing active subscriptions first
    await pool.query(`
        UPDATE subscriptions 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND status = 'active'
    `, [req.user.userId]);
    
    // Create new subscription
    const insertResult = await pool.query(`
        INSERT INTO subscriptions (user_id, plan_type, amount, billing_cycle, expires_at, paypal_subscription_id, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING id
    `, [req.user.userId, planType, amount, billingCycle, expiresAt, subscriptionID]);
  console.log('✅ Subscription created with ID:', insertResult.rows[0].id);
    
    // Ensure talent profile exists before updating
    console.log('🔄 Ensuring talent profile exists...');
    await pool.query(`
      INSERT INTO talent_profiles (user_id) 
      VALUES ($1) 
      ON CONFLICT (user_id) DO NOTHING
    `, [req.user.userId]);
    
    // Update talent profile
    console.log('🔄 Updating talent profile...');
    const updateResult = await pool.query(`
      UPDATE talent_profiles 
      SET subscription_active = true, subscription_type = $1, subscription_expires_at = $2, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3
    `, [planType, expiresAt, req.user.userId]);
    console.log(`✅ Updated ${updateResult.rowCount} talent profiles`);
    
    console.log('🎉 Subscription created successfully for user:', req.user.userId);
    
    res.json({ 
      success: true, 
      message: 'Subscription created successfully',
      subscriptionId: insertResult.rows[0].id,
      expiresAt: expiresAt
    });
    
  } catch (error) {
    console.error('❌ Create subscription error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    res.status(500).json({ 
      error: 'Failed to create subscription: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// Get messages for a project
// Get conversations for the current user
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userType = req.user.accountType;
    
    let query, params;
    
    if (userType === 'client') {
      // For clients: get all unique talent they're talking to per project
      query = `
        SELECT DISTINCT
          p.id as project_id,
          p.title as project_title,
          m.sender_id as talent_id,
          u.first_name || ' ' || u.last_name as talent_name,
          u.profile_photo as talent_photo,
          tp.specialties as talent_specialties,
          MAX(m.created_at) as last_message_time,
          COUNT(CASE WHEN m.read_at IS NULL AND m.receiver_id = $1 THEN 1 END) as unread_count,
          (
            SELECT message_text 
            FROM messages m2 
            WHERE m2.project_id = p.id AND (m2.sender_id = m.sender_id OR m2.receiver_id = m.sender_id)
            ORDER BY m2.created_at DESC 
            LIMIT 1
          ) as last_message
        FROM messages m
        JOIN projects p ON m.project_id = p.id
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN talent_profiles tp ON u.id = tp.user_id
        WHERE p.client_id = $1 AND m.sender_id != $1
        GROUP BY p.id, p.title, m.sender_id, u.first_name, u.last_name, u.profile_photo, tp.specialties
        ORDER BY last_message_time DESC
      `;
      params = [userId];
    } else {
      // For talent: get all clients they're talking to per project
      query = `
        SELECT DISTINCT
          p.id as project_id,
          p.title as project_title,
          p.client_id,
          u.first_name || ' ' || u.last_name as client_name,
          u.profile_photo as client_photo,
          MAX(m.created_at) as last_message_time,
          COUNT(CASE WHEN m.read_at IS NULL AND m.receiver_id = $1 THEN 1 END) as unread_count,
          (
            SELECT message_text 
            FROM messages m2 
            WHERE m2.project_id = p.id AND (m2.sender_id = $1 OR m2.receiver_id = $1)
            ORDER BY m2.created_at DESC 
            LIMIT 1
          ) as last_message
        FROM messages m
        JOIN projects p ON m.project_id = p.id
        JOIN users u ON p.client_id = u.id
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
        GROUP BY p.id, p.title, p.client_id, u.first_name, u.last_name, u.profile_photo
        ORDER BY last_message_time DESC
      `;
      params = [userId];
    }
    
    const result = await pool.query(query, params);
    
    res.json({ conversations: result.rows });
    
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages for a specific conversation (project + participant pair)
app.get('/api/conversations/:projectId/:participantId/messages', authenticateToken, async (req, res) => {
  try {
    const { projectId, participantId } = req.params;
    const userId = req.user.userId;
    
    // Verify user has access to this conversation
    const accessCheck = await pool.query(`
      SELECT p.client_id 
      FROM projects p 
      WHERE p.id = $1 AND (
        p.client_id = $2 OR 
        EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.project_id = $1 AND (m.sender_id = $2 OR m.receiver_id = $2)
        )
      )
    `, [projectId, userId]);
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }
    
  // Get messages between the current user and the specific participant for this project
    // Exclude messages that have been deleted by the current user
    const result = await pool.query(`
      SELECT 
        m.*,
        u.first_name || ' ' || u.last_name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.project_id = $1 
        AND (
          (m.sender_id = $2 AND m.receiver_id = $3) OR 
          (m.sender_id = $3 AND m.receiver_id = $2)
        )
        AND (
          (m.sender_id = $2 AND m.deleted_for_sender = FALSE) OR
          (m.receiver_id = $2 AND m.deleted_for_receiver = FALSE)
        )
      ORDER BY m.created_at ASC
    `, [projectId, userId, participantId]);
    
    // Mark messages as read
    await pool.query(`
      UPDATE messages 
      SET read_at = CURRENT_TIMESTAMP 
      WHERE project_id = $1 AND receiver_id = $2 AND sender_id = $3 AND read_at IS NULL
    `, [projectId, userId, participantId]);
    
    res.json({ messages: result.rows });
    
  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation messages' });
  }
});

// Send a message in a specific conversation with optional attachment
app.post('/api/conversations/:projectId/:participantId/messages', authenticateToken, attachmentUpload.single('attachment'), async (req, res) => {
  try {
    const { projectId, participantId } = req.params;
    const senderId = req.user.userId;
    const { message } = req.body;
    const file = req.file;

    console.log('📨 Send message request:', { projectId, participantId, senderId, hasFile: !!file });
    
    // Must have either message or attachment
    if (!message && !file) {
      return res.status(400).json({ error: 'Message text or attachment is required' });
    }
    
    // Verify the project exists and user has access
    const projectCheck = await pool.query(`
      SELECT client_id FROM projects WHERE id = $1
    `, [projectId]);
    
    if (projectCheck.rows.length === 0) {
      if (file) fs.unlink(file.path).catch(console.error);
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Verify user has access to this conversation
    const accessCheck = await pool.query(`
      SELECT 1 FROM projects p 
      WHERE p.id = $1 AND (
        p.client_id = $2 OR 
        EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.project_id = $1 AND (m.sender_id = $2 OR m.receiver_id = $2)
        )
      )
    `, [projectId, senderId]);
    
    if (accessCheck.rows.length === 0) {
      if (file) fs.unlink(file.path).catch(console.error);
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }

    // Prepare attachment data
    let attachmentUrl = null;
    let attachmentFilename = null;
    let attachmentSize = null;

    if (file) {
      attachmentUrl = `/uploads/attachments/${file.filename}`;
      attachmentFilename = file.originalname;
      attachmentSize = file.size;
      console.log('📎 File uploaded:', { filename: file.filename, originalname: file.originalname, size: file.size });
    }
    
    // Insert the message
    const result = await pool.query(`
      INSERT INTO messages (project_id, sender_id, receiver_id, message_text, attachment_url, attachment_filename, attachment_size)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at
    `, [projectId, senderId, participantId, message || '', attachmentUrl, attachmentFilename, attachmentSize]);
    
    // Get sender name for response
    const senderResult = await pool.query(`
      SELECT first_name || ' ' || last_name as sender_name 
      FROM users WHERE id = $1
    `, [senderId]);
    
    // Send email notification if email service is configured
    if (transporter) {
      try {
        const receiverResult = await pool.query(`
          SELECT email, first_name FROM users WHERE id = $1
        `, [participantId]);
        
        const projectResult = await pool.query(`
          SELECT title FROM projects WHERE id = $1
        `, [projectId]);
        
        if (receiverResult.rows.length > 0 && projectResult.rows.length > 0) {
          const receiver = receiverResult.rows[0];
          const project = projectResult.rows[0];
          const senderName = senderResult.rows[0].sender_name;
          
          const attachmentInfo = file ? `\n\n📎 Attachment: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : '';
          
          const mailOptions = {
            to: receiver.email,
            subject: `New Message: "${project.title}" - VoicecastingPro`,
            html: `
              <h3>New Message on VoicecastingPro</h3>
              <p>Hi ${receiver.first_name},</p>
              <p>You have received a new message about the project:</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4>"${project.title}"</h4>
                <p><strong>From:</strong> ${senderName}</p>
              </div>
              
              <p><strong>Message:</strong></p>
              <p>${(message || '(Attachment only)').replace(/\n/g, '<br>')}</p>
              ${attachmentInfo ? `<p><strong>📎 Attachment:</strong> ${file.originalname}</p>` : ''}
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}?page=messages" 
                   style="background: #667eea; color: white; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; padding: 15px 30px; border-radius: 8px; margin: 10px;">
                  📨 Reply on VoicecastingPro
                </a>
                <br>
                <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}?page=signin" 
                   style="background: #28a745; color: white; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; padding: 12px 24px; border-radius: 8px; margin: 10px;">
                  🔐 Sign In First
                </a>
              </div>
              
              <p>Best regards,<br>The VoicecastingPro Team</p>
            `
          };
          
          await sendEmail(mailOptions);
          console.log('📧 Message notification email sent');
        }
      } catch (emailError) {
        console.error('❌ Failed to send message notification email:', emailError);
        // Continue anyway - don't fail the message sending
      }
    }
    
    res.json({ 
      success: true, 
      message: {
        id: result.rows[0].id,
        sender_name: senderResult.rows[0].sender_name,
        message_text: message || '',
        attachment_url: attachmentUrl,
        attachment_filename: attachmentFilename,
        attachment_size: attachmentSize,
        created_at: result.rows[0].created_at
      }
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path).catch(console.error);
    }
    
    res.status(500).json({ error: 'Failed to send message' });
  }
});// Send a message in a project conversation
app.post('/api/projects/:projectId/messages', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const senderId = req.user.userId;
    const { message, receiverId } = req.body;
    
    if (!message || !receiverId) {
      return res.status(400).json({ error: 'Message and receiver ID are required' });
    }
    
    // Verify the project exists and user has access
    const projectCheck = await pool.query(`
      SELECT client_id FROM projects WHERE id = $1
    `, [projectId]);
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Verify user has access to this conversation
    const accessCheck = await pool.query(`
      SELECT 1 FROM projects p 
      WHERE p.id = $1 AND (
        p.client_id = $2 OR 
        EXISTS (
          SELECT 1 FROM messages m 
          WHERE m.project_id = $1 AND (m.sender_id = $2 OR m.receiver_id = $2)
        )
      )
    `, [projectId, senderId]);
    
    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this conversation' });
    }
    
    // Insert the message
    const result = await pool.query(`
      INSERT INTO messages (project_id, sender_id, receiver_id, message_text)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `, [projectId, senderId, receiverId, message]);
    
    // Get sender name for response
    const senderResult = await pool.query(`
      SELECT first_name || ' ' || last_name as sender_name 
      FROM users WHERE id = $1
    `, [senderId]);
    
    // Send email notification if email service is configured
    if (transporter) {
      try {
        const receiverResult = await pool.query(`
          SELECT email, first_name FROM users WHERE id = $1
        `, [receiverId]);
        
        const projectResult = await pool.query(`
          SELECT title FROM projects WHERE id = $1
        `, [projectId]);
        
        if (receiverResult.rows.length > 0 && projectResult.rows.length > 0) {
          const receiver = receiverResult.rows[0];
          const project = projectResult.rows[0];
          const senderName = senderResult.rows[0].sender_name;
          
          const mailOptions = {
            to: receiver.email,
            subject: `New Message: "${project.title}" - VoicecastingPro`,
            html: `
              <h3>New Message on VoicecastingPro</h3>
              <p>Hi ${receiver.first_name},</p>
              <p>You have received a new message about the project:</p>
              
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4>"${project.title}"</h4>
                <p><strong>From:</strong> ${senderName}</p>
              </div>
              
              <p><strong>Message:</strong></p>
              <p>${message.replace(/\n/g, '<br>')}</p>
              
         <div style="text-align: center; margin: 20px 0;">
  <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}?page=messages" 
     style="background: #667eea; color: white; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; padding: 15px 30px; border-radius: 8px; margin: 10px;">
    📨 Reply on VoicecastingPro
  </a>
  <br>
  <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}?page=signin" 
     style="background: #28a745; color: white; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; padding: 12px 24px; border-radius: 8px; margin: 10px;">
    🔐 Sign In First
  </a>
</div>

<p style="text-align: center; color: #666; font-size: 14px;">
  <strong>New to VoicecastingPro?</strong> 
  <a href="${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}?page=client-signup" style="color: #667eea;">Create a free account</a>
</p>
              
              <p>Best regards,<br>The VoicecastingPro Team</p>
            `
          };
          
          await sendEmail(mailOptions);
          console.log('📧 Message notification email sent');
        }
      } catch (emailError) {
        console.error('❌ Failed to send message notification email:', emailError);
        // Continue anyway - don't fail the message sending
      }
    }
    
    res.json({ 
      success: true, 
      message: {
        id: result.rows[0].id,
        sender_name: senderResult.rows[0].sender_name,
        message_text: message,
        created_at: result.rows[0].created_at
      }
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Delete a message (soft delete - hide from user's view)
app.delete('/api/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;
    
    // First, verify the message exists and get its details
    const messageCheck = await pool.query(`
      SELECT sender_id, receiver_id, project_id, message_text
      FROM messages 
      WHERE id = $1
    `, [messageId]);
    
    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    const message = messageCheck.rows[0];
    
    // Verify user has access to this message (either sender or receiver)
    if (message.sender_id !== userId && message.receiver_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }
    
    // Determine which column to update based on user's role in this message
    let updateColumn;
    if (message.sender_id === userId) {
      updateColumn = 'deleted_for_sender = TRUE';
    } else {
      updateColumn = 'deleted_for_receiver = TRUE';
    }
    
    // Soft delete the message for this user
    await pool.query(`
      UPDATE messages 
      SET ${updateColumn}
      WHERE id = $1
    `, [messageId]);
    
    console.log(`✅ Message ${messageId} deleted for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: 'Message deleted successfully' 
    });
    
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Get messages for a conversation  
app.get('/api/conversations/:projectId/:participantId/messages', authenticateToken, async (req, res) => {
  try {
    const { projectId, participantId } = req.params;
    const userId = req.user.userId;

    console.log('📖 Get messages request:', { projectId, participantId, userId });

    // Get messages for this conversation
    const result = await pool.query(`
      SELECT 
        m.*,
        u.first_name || ' ' || u.last_name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.project_id = $1 
      AND (
        (m.sender_id = $2 AND m.receiver_id = $3) OR 
        (m.sender_id = $3 AND m.receiver_id = $2)
      )
      AND (
        (m.sender_id = $2 AND m.deleted_for_sender IS NOT TRUE) OR
        (m.receiver_id = $2 AND m.deleted_for_receiver IS NOT TRUE)
      )
      ORDER BY m.created_at ASC
    `, [projectId, userId, participantId]);

    const messages = result.rows;

    console.log(`📨 Found ${messages.length} messages`);
    res.json({ messages });

  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ error: 'Failed to load messages: ' + error.message });
  }
});


// PayPal Webhook Handler
app.post('/api/payments/webhook/paypal', express.raw({type: 'application/json'}), async (req, res) => {
    try {
        const webhookBody = req.body;
        
        // Parse webhook safely
        let webhookEvent;
        try {
            webhookEvent = JSON.parse(webhookBody.toString());
        } catch (parseError) {
            console.error('❌ Invalid webhook JSON:', parseError);
            return res.status(400).send('Invalid JSON');
        }
        
        console.log('🔔 PayPal webhook received:', webhookEvent.event_type);

        // Verify webhook signature in production
        if (process.env.NODE_ENV === 'production' && process.env.PAYPAL_WEBHOOK_ID) {
            // Add signature verification here if needed
            console.log('🔒 Webhook signature verification enabled');
        }


        // Handle different webhook events
        switch (webhookEvent.event_type) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                await handlePaymentCaptured(webhookEvent);
                break;
                
            case 'PAYMENT.CAPTURE.DENIED':
                await handlePaymentDenied(webhookEvent);
                break;
                
            case 'PAYMENT.CAPTURE.REFUNDED':
                await handlePaymentRefunded(webhookEvent);
                break;
                
            default:
                console.log('🔔 Unhandled webhook event:', webhookEvent.event_type);
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).send('Webhook processing failed');
    }
});

// Webhook event handlers
async function handlePaymentCaptured(webhookEvent) {
    try {
        const captureId = webhookEvent.resource.id;
        const amount = webhookEvent.resource.amount.value;
        
        // Update payment status based on capture ID
        await pool.query(`
            UPDATE escrow_payments 
            SET status = 'held', captured_at = NOW()
            WHERE paypal_capture_id = $1
        `, [captureId]);

        console.log('✅ Payment capture confirmed via webhook:', captureId);
    } catch (error) {
        console.error('❌ Error handling payment captured webhook:', error);
    }
}

async function handlePaymentDenied(webhookEvent) {
    try {
        const captureId = webhookEvent.resource.id;
        
        await pool.query(`
            UPDATE escrow_payments 
            SET status = 'failed'
            WHERE paypal_capture_id = $1
        `, [captureId]);

        console.log('❌ Payment denied via webhook:', captureId);
    } catch (error) {
        console.error('❌ Error handling payment denied webhook:', error);
    }
}

async function handlePaymentRefunded(webhookEvent) {
    try {
        const refundId = webhookEvent.resource.id;
        const captureId = webhookEvent.resource.links.find(link => 
            link.rel === 'up'
        )?.href.split('/').pop();
        
        await pool.query(`
            UPDATE escrow_payments 
            SET status = 'refunded', refunded_at = NOW()
            WHERE paypal_capture_id = $1
        `, [captureId]);

        console.log('💰 Payment refunded via webhook:', refundId);
    } catch (error) {
        console.error('❌ Error handling payment refunded webhook:', error);
    }
}


// SPA fallback
app.get('*', (req, res, next) => {  if (req.path.startsWith('/api/') || req.path === '/health') {
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

// Create PayPal Order for Escrow Payment
app.post('/api/payments/paypal/create-order', authenticateToken, async (req, res) => {
    try {
        const { projectId, amount, currency = 'USD', paymentType = 'escrow' } = req.body;
        
        if (!projectId || !amount) {
            return res.status(400).json({ error: 'Project ID and amount are required' });
        }

        // Validate amount
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Check PayPal client configuration
        if (!paypalClient) {
            return res.status(500).json({ error: 'PayPal service not configured' });
        }

        // Verify project exists and user is the client
        const projectResult = await pool.query(
            'SELECT * FROM projects WHERE id = $1 AND client_id = $2',
            [projectId, req.user.userId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found or unauthorized' });
        }

        const project = projectResult.rows[0];

        // Create PayPal order
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer("return=representation");
        request.requestBody({
            intent: 'CAPTURE',
            application_context: {
                brand_name: 'VoicecastingPro',
                landing_page: 'NO_PREFERENCE',
                user_action: 'PAY_NOW',
                return_url: `${process.env.FRONTEND_URL}/payment-success`,
                cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`
            },
            purchase_units: [{
                reference_id: `PROJECT_${projectId}`,
                description: `Escrow payment for project: ${project.title}`,
                amount: {
                    currency_code: currency.toUpperCase(),
                    value: parseFloat(amount).toFixed(2)
                },
                payee: {
                    merchant_id: process.env.PAYPAL_MERCHANT_ID
                }
            }]
        });

        const paypalResponse = await paypalClient.execute(request);
        const orderId = paypalResponse.result.id;

        // Store pending payment in database
        await pool.query(`
            INSERT INTO escrow_payments 
            (project_id, client_id, paypal_order_id, amount, currency, status, payment_type, description)
            VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
        `, [
            projectId, 
            req.user.userId, 
            orderId, 
            amount, 
            currency.toUpperCase(), 
            paymentType,
            `Escrow payment for project: ${project.title}`
        ]);

        console.log('✅ PayPal order created:', orderId);

        res.json({
            success: true,
            orderId: orderId,
            approvalUrl: paypalResponse.result.links.find(link => link.rel === 'approve')?.href
        });

    } catch (error) {
        console.error('❌ PayPal order creation error:', error);
        res.status(500).json({ error: 'Failed to create PayPal order: ' + error.message });
    }
});

// Capture PayPal Payment (Step 4 - ADD THIS)
app.post('/api/payments/paypal/capture/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        // Get payment details from database
        const paymentResult = await pool.query(
            'SELECT * FROM escrow_payments WHERE paypal_order_id = $1 AND client_id = $2',
            [orderId, req.user.userId]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found or unauthorized' });
        }

        const payment = paymentResult.rows[0];
        
        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'Payment already processed' });
        }
        // Capture the PayPal payment
        const request = new paypal.orders.OrdersCaptureRequest(orderId);
        request.requestBody({});

        const captureResponse = await paypalClient.execute(request);
        const captureResult = captureResponse.result;

        if (captureResult.status !== 'COMPLETED') {
            throw new Error('Payment capture failed');
        }

        const captureId = captureResult.purchase_units[0].payments.captures[0].id;

        // Update payment status in database
        await pool.query(`
            UPDATE escrow_payments 
            SET status = 'held', paypal_capture_id = $1, captured_at = NOW()
            WHERE paypal_order_id = $2
        `, [captureId, orderId]);

        // Update project with payment protection
        await pool.query(`
            UPDATE projects 
            SET payment_protection = 'escrow', payment_amount = $1 
            WHERE id = $2
        `, [payment.amount, payment.project_id]);

        console.log('✅ PayPal payment captured successfully:', captureId);

        res.json({
            success: true,
            message: 'Payment captured and held in escrow',
            captureId: captureId,
            status: 'held'
        });

    } catch (error) {
        console.error('❌ PayPal capture error:', error);
        res.status(500).json({ error: 'Failed to capture payment: ' + error.message });
    }
});


// PayPal Escrow Payment Processing
app.post('/api/payments/escrow/process', authenticateToken, async (req, res) => {
    try {
        const { projectId, paypalOrderId, amount, talentName, clientId, clientEmail } = req.body;
        
        console.log('Processing escrow payment:', { projectId, paypalOrderId, amount });
        
        // Verify PayPal payment
        const request = new paypal.orders.OrdersGetRequest(paypalOrderId);
        const paypalResponse = await paypalClient.execute(request);
        
        if (paypalResponse.result.status !== 'COMPLETED') {
            return res.status(400).json({ error: 'Payment not completed' });
        }
        
        // Store escrow payment in database (PostgreSQL)
        const escrowQuery = `
            INSERT INTO escrow_payments 
            (project_id, client_id, paypal_order_id, amount, status, talent_name, created_at)
            VALUES ($1, $2, $3, $4, 'held', $5, NOW())
            RETURNING id
        `;
        
        const escrowResult = await pool.query(escrowQuery, [projectId, clientId, paypalOrderId, amount, talentName]);
        
        // Update project with payment protection
        await pool.query(
            'UPDATE projects SET payment_protection = $1, payment_amount = $2 WHERE id = $3',
            ['escrow', amount, projectId]
        );
        
        console.log('✅ Escrow payment processed successfully');
        
        res.json({ 
            success: true, 
            message: 'Escrow payment processed successfully',
            escrowId: paypalOrderId 
        });
        
    } catch (error) {
        console.error('Escrow payment processing error:', error);
        res.status(500).json({ error: 'Failed to process escrow payment: ' + error.message });
    }
});

// Get Comprehensive Payment Status
app.get('/api/projects/:projectId/payment-status', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        // Get project payment info
        const projectResult = await pool.query(
            'SELECT payment_protection, payment_amount, status FROM projects WHERE id = $1',
            [projectId]
        );

        if (projectResult.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const project = projectResult.rows[0];
        
        // Get escrow payments
        const escrowResult = await pool.query(`
            SELECT * FROM escrow_payments 
            WHERE project_id = $1 
            ORDER BY created_at DESC
        `, [projectId]);
        

        // Calculate payment summary (escrow only)
        const escrowPayments = escrowResult.rows;
        
        const totalEscrowAmount = escrowPayments
            .filter(p => ['held', 'released'].includes(p.status))
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        res.json({
            hasPaymentProtection: !!project.payment_protection,
            paymentType: project.payment_protection,
            projectStatus: project.status,
            summary: {
                totalProtected: totalEscrowAmount,
                escrowAmount: totalEscrowAmount,
                paidAmount: totalEscrowAmount
            },
            escrow: {
                payments: escrowPayments,
                currentStatus: escrowPayments[0]?.status || null
            }
        });

    } catch (error) {
        console.error('❌ Payment status error:', error);
        res.status(500).json({ error: 'Failed to get payment status: ' + error.message });
    }
});

// Get Payment History
app.get('/api/payments/history/:projectId', authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        
        // Verify access to project
        const accessCheck = await pool.query(`
            SELECT 1 FROM projects p 
            WHERE p.id = $1 AND (
                p.client_id = $2 OR 
                EXISTS (
                    SELECT 1 FROM escrow_payments ep WHERE ep.project_id = $1 AND ep.talent_id = $2
                )
            )
        `, [projectId, req.user.userId]);

        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied to payment history' });
        }

        // Get payment history
      const historyResult = await pool.query(`
            SELECT 
                ph.*,
                u.first_name || ' ' || u.last_name as created_by_name
            FROM payment_history ph
            LEFT JOIN users u ON ph.created_by = u.id
            WHERE ph.payment_id IN (
                SELECT id FROM escrow_payments WHERE project_id = $1
            )
            ORDER BY ph.created_at DESC
        `, [projectId]);

        res.json({
            success: true,
            history: historyResult.rows
        });

    } catch (error) {
        console.error('❌ Payment history error:', error);
        res.status(500).json({ error: 'Failed to get payment history: ' + error.message });
    }
});

// Release Escrow Payment to Talent
app.post('/api/payments/escrow/release', authenticateToken, async (req, res) => {
  try {
    const { projectId, talentId } = req.body;
    
    if (req.user.accountType !== 'client') {
      return res.status(403).json({ error: 'Only clients can release escrow payments' });
    }

    // Get escrow payment WITH talent PayPal email
    const escrowResult = await pool.query(`
      SELECT ep.*, p.title as project_title, u.email as talent_email, u.first_name, u.last_name, u.paypal_email
      FROM escrow_payments ep
      JOIN projects p ON ep.project_id = p.id
      LEFT JOIN users u ON ep.talent_id = u.id OR ep.talent_id IS NULL
      WHERE ep.project_id = $1 AND ep.client_id = $2 AND ep.status = 'held'
    `, [projectId, req.user.userId]);

    if (escrowResult.rows.length === 0) {
      return res.status(404).json({ error: 'No held escrow payment found for this project' });
    }

    const escrow = escrowResult.rows[0];

    // If talentId provided but not set, update it and get fresh talent data
    if (talentId && !escrow.talent_id) {
      await pool.query('UPDATE escrow_payments SET talent_id = $1 WHERE id = $2', [talentId, escrow.id]);
      
      // Get talent PayPal email
      const talentResult = await pool.query('SELECT paypal_email, first_name, last_name, email FROM users WHERE id = $1', [talentId]);
      if (talentResult.rows.length > 0) {
        const talent = talentResult.rows[0];
        escrow.paypal_email = talent.paypal_email;
        escrow.first_name = talent.first_name;
        escrow.last_name = talent.last_name;
        escrow.talent_email = talent.email;
      }
    }

    // Check if talent has PayPal email
    if (!escrow.paypal_email) {
      return res.status(400).json({ 
        error: 'PayPal email not found',
        message: 'Cannot release payment: Talent has not provided a PayPal email address' 
      });
    }

    console.log('💰 Attempting PayPal payout to:', escrow.paypal_email);

    // Create PayPal payout
    const payoutRequest = new payouts.payouts.PayoutsPostRequest();
    payoutRequest.requestBody({
      sender_batch_header: {
        sender_batch_id: `ESCROW_${escrow.id}_${Date.now()}`,
        email_subject: 'VoicecastingPro - Payment Released',
        email_message: `Payment for project: ${escrow.project_title}`
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: {
          value: parseFloat(escrow.amount).toFixed(2),
          currency: escrow.currency || 'USD'
        },
        receiver: escrow.paypal_email,
        note: `VoicecastingPro escrow release for project: ${escrow.project_title}`,
        sender_item_id: `PROJECT_${projectId}_${escrow.id}`
      }]
    });

    // Execute PayPal payout
    const payoutResponse = await paypalClient.execute(payoutRequest);
    const payoutBatchId = payoutResponse.result.batch_header.payout_batch_id;
    const payoutItemId = payoutResponse.result.items[0].payout_item_id;

    console.log('✅ PayPal payout successful:', payoutBatchId);

    // Only mark as released if PayPal payout succeeded
    await pool.query(`
      UPDATE escrow_payments 
      SET status = 'released', released_at = NOW(), paypal_payout_batch_id = $1, paypal_payout_item_id = $2
      WHERE id = $3
    `, [payoutBatchId, payoutItemId, escrow.id]);

    // Update project status
    await pool.query('UPDATE projects SET status = $1 WHERE id = $2', ['completed', projectId]);

    // Log the release
    await pool.query(`
      INSERT INTO payment_history 
      (payment_id, payment_type, action, amount, status_from, status_to, created_by, notes, paypal_transaction_id)
      VALUES ($1, 'escrow', 'released', $2, 'held', 'released', $3, $4, $5)
    `, [
      escrow.id, 
      escrow.amount, 
      req.user.userId, 
      `Payment released to talent via PayPal payout: ${payoutBatchId}`,
      payoutBatchId
    ]);

    // Send notification email to talent
    if (transporter && escrow.talent_email) {
      try {
        const mailOptions = {
          to: escrow.talent_email,
          subject: 'Payment Released - VoicecastingPro',
          html: `
            <h3>🎉 Payment Released!</h3>
            <p>Hi ${escrow.first_name},</p>
            <p>Great news! The client has approved your work and released the escrow payment.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4>Project: "${escrow.project_title}"</h4>
              <p><strong>Amount Released:</strong> $${parseFloat(escrow.amount).toFixed(2)} ${escrow.currency || 'USD'}</p>
              <p><strong>PayPal Account:</strong> ${escrow.paypal_email}</p>
            </div>
            
            <p>The funds have been sent to your PayPal account and should appear within a few minutes to 24 hours.</p>
            <p>Transaction ID: ${payoutBatchId}</p>
            <p>Thank you for your excellent work!</p>
            
            <p>Best regards,<br>The VoicecastingPro Team</p>
          `
        };
        
        await sendEmail(mailOptions);
        console.log('📧 Payment release notification sent to talent');
      } catch (emailError) {
        console.error('❌ Failed to send release notification:', emailError);
      }
    }

    res.json({ 
      success: true, 
      message: 'Payment released successfully to talent',
      amount: escrow.amount,
      currency: escrow.currency || 'USD',
      paypalEmail: escrow.paypal_email,
      payoutBatchId: payoutBatchId
    });

  } catch (error) {
    console.error('❌ Escrow release error:', error);
    
    // Check for specific PayPal errors
    if (error.message?.includes('RECEIVER_UNREGISTERED')) {
      return res.status(400).json({ 
        error: 'PayPal account not found',
        message: 'The talent\'s PayPal account is not registered or invalid' 
      });
    } else if (error.message?.includes('INSUFFICIENT_FUNDS')) {
      return res.status(400).json({ 
        error: 'Insufficient funds',
        message: 'Not enough funds in escrow account to complete payout' 
      });
    }
    
    res.status(500).json({ error: 'Failed to release escrow payment: ' + error.message });
  }
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

// Add comprehensive environment check
function validateEnvironment() {
    console.log('🔍 Validating environment variables...');
    
    const required = {
        'DATABASE_URL': process.env.DATABASE_URL,
        'JWT_SECRET': process.env.JWT_SECRET
    };
    
    const paypal = {
        'PAYPAL_CLIENT_ID': process.env.PAYPAL_CLIENT_ID,
        'PAYPAL_CLIENT_SECRET': process.env.PAYPAL_CLIENT_SECRET
    };
    
    // Check required vars
    const missing = Object.entries(required)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        process.exit(1);
    }
    
    // Check PayPal vars (warn but don't exit)
    const missingPayPal = Object.entries(paypal)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
    
    if (missingPayPal.length > 0) {
        console.warn('⚠️ Missing PayPal environment variables:', missingPayPal.join(', '));
        console.warn('⚠️ Using default credentials - payments may not work properly');
    }
    
    console.log('✅ Environment validation complete');
}


// Validate environment before starting server
validateEnvironment();

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
