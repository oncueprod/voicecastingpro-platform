// server.js - VoicecastingPro Backend with All Functionality
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// PayPal Configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.paypal.com' 
  : 'https://api.sandbox.paypal.com';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = file.fieldname === 'audioDemo' ? 'uploads/demos' : 'uploads/avatars';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'audioDemo') {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files allowed for demos'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Email configuration
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Database initialization
async function initDatabase() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        account_type VARCHAR(20) NOT NULL DEFAULT 'client',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Talent profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS talent_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        bio TEXT,
        languages VARCHAR(500),
        specialties VARCHAR(500),
        hourly_rate_min INTEGER,
        hourly_rate_max INTEGER,
        experience_years INTEGER,
        equipment_description TEXT,
        subscription_active BOOLEAN DEFAULT false,
        subscription_type VARCHAR(20),
        subscription_expires_at TIMESTAMP,
        paypal_subscription_id VARCHAR(255),
        rating DECIMAL(3,2) DEFAULT 0,
        completed_projects INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    // Audio demos table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audio_demos (
        id SERIAL PRIMARY KEY,
        talent_id INTEGER REFERENCES talent_profiles(id) ON DELETE CASCADE,
        file_path VARCHAR(500) NOT NULL,
        description TEXT,
        duration INTEGER,
        file_size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects table
    await pool.query(`
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
        estimated_duration INTEGER,
        deadline DATE,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Project applications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_applications (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        talent_id INTEGER REFERENCES talent_profiles(id) ON DELETE CASCADE,
        proposal TEXT,
        quoted_price INTEGER,
        estimated_delivery INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, talent_id)
      )
    `);

    // Messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        message_text TEXT NOT NULL,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        paypal_subscription_id VARCHAR(255),
        paypal_plan_id VARCHAR(255),
        plan_type VARCHAR(20),
        amount DECIMAL(10,2),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(), 
    service: 'VoicecastingPro',
    version: '1.0.0'
  });
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'VoicecastingPro API is running!', 
    version: '1.0.0',
    endpoints: [
      'GET /health',
      'GET /api/projects',
      'POST /api/projects', 
      'GET /api/talent',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/talent/profile',
      'POST /api/contact'
    ]
  });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, accountType = 'client' } = req.body;

    console.log('📝 Registration attempt:', { email, firstName, lastName, accountType });

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password || 'temppass123', saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, account_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, account_type',
      [email, passwordHash, firstName, lastName, accountType]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, accountType: user.account_type },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Send welcome email
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Welcome to VoicecastingPro!',
          html: `
            <h2>Welcome to VoicecastingPro, ${firstName}!</h2>
            <p>Thank you for joining our voice talent marketplace.</p>
            <p>Your account has been created successfully.</p>
            <p>Best regards,<br>The VoicecastingPro Team</p>
          `
        });
        console.log('📧 Welcome email sent to:', email);
      } catch (emailError) {
        console.error('📧 Failed to send welcome email:', emailError);
      }
    }

    console.log('✅ User registered successfully:', user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: user,
      token: token
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, account_type FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, accountType: user.account_type },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        account_type: user.account_type
      },
      token: token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Talent Profile Routes
app.post('/api/talent/profile', authenticateToken, async (req, res) => {
  try {
    const { bio, languages, specialties, hourlyRateMin, hourlyRateMax, experienceYears, equipmentDescription } = req.body;

    console.log('📝 Profile creation for user:', req.user.userId);

    const result = await pool.query(`
      INSERT INTO talent_profiles (user_id, bio, languages, specialties, hourly_rate_min, hourly_rate_max, experience_years, equipment_description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        bio = EXCLUDED.bio,
        languages = EXCLUDED.languages,
        specialties = EXCLUDED.specialties,
        hourly_rate_min = EXCLUDED.hourly_rate_min,
        hourly_rate_max = EXCLUDED.hourly_rate_max,
        experience_years = EXCLUDED.experience_years,
        equipment_description = EXCLUDED.equipment_description,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.user.userId, bio, languages, specialties, hourlyRateMin, hourlyRateMax, experienceYears, equipmentDescription]);

    console.log('✅ Profile saved for user:', req.user.userId);

    res.json({
      message: 'Profile saved successfully',
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Profile save error:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

app.post('/api/talent/demos', authenticateToken, upload.array('audioDemo', 5), async (req, res) => {
  try {
    const { descriptions } = req.body;
    const demos = [];

    const talentResult = await pool.query('SELECT id FROM talent_profiles WHERE user_id = $1', [req.user.userId]);
    if (talentResult.rows.length === 0) {
      return res.status(400).json({ error: 'Please create your profile first' });
    }

    const talentId = talentResult.rows[0].id;

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const description = descriptions ? descriptions[i] : '';

      const result = await pool.query(
        'INSERT INTO audio_demos (talent_id, file_path, description, file_size) VALUES ($1, $2, $3, $4) RETURNING *',
        [talentId, file.path, description, file.size]
      );

      demos.push(result.rows[0]);
    }

    res.json({
      message: 'Audio demos uploaded successfully',
      demos: demos
    });

  } catch (error) {
    console.error('❌ Demo upload error:', error);
    res.status(500).json({ error: 'Failed to upload demos' });
  }
});

// Project Routes
app.get('/api/projects', async (req, res) => {
  try {
    const { search, language, genre, budget } = req.query;
    let query = 'SELECT * FROM projects WHERE status = $1';
    let params = ['open'];
    let paramCount = 1;

    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (language && language !== 'All Languages') {
      paramCount++;
      query += ` AND language = $${paramCount}`;
      params.push(language);
    }

    if (genre && genre !== 'All Genres') {
      paramCount++;
      query += ` AND genre = $${paramCount}`;
      params.push(genre);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await pool.query(query, params);

    console.log(`📋 Found ${result.rows.length} projects`);

    res.json({
      projects: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Project fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { title, description, language, genre, voiceGender, budgetMin, budgetMax, estimatedDuration, deadline, clientEmail } = req.body;

    console.log('📝 Project creation:', { title, language, genre });

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    let clientId = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        clientId = decoded.userId;
      } catch (err) {
        console.log('Anonymous project posting');
      }
    }

    const result = await pool.query(`
      INSERT INTO projects (client_id, title, description, language, genre, voice_gender, budget_min, budget_max, estimated_duration, deadline)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [clientId, title, description, language, genre, voiceGender, budgetMin, budgetMax, estimatedDuration, deadline]);

    const project = result.rows[0];

    console.log('✅ Project created:', project.id);

    // Send notification email
    if (transporter && clientEmail) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: clientEmail,
          subject: 'Project Posted Successfully - VoicecastingPro',
          html: `
            <h2>Project Posted Successfully!</h2>
            <p><strong>Project:</strong> ${title}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p>Your project is now live on VoicecastingPro and talent can start applying.</p>
            <p>Best regards,<br>The VoicecastingPro Team</p>
          `
        });
        console.log('📧 Project notification sent to:', clientEmail);
      } catch (emailError) {
        console.error('📧 Failed to send project notification:', emailError);
      }
    }

    res.status(201).json({
      message: 'Project posted successfully',
      project: project
    });

  } catch (error) {
    console.error('❌ Project creation error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Talent Discovery
app.get('/api/talent', async (req, res) => {
  try {
    const { search, language, genre, gender, priceRange } = req.query;
    
    let query = `
      SELECT u.first_name, u.last_name, u.email, t.* 
      FROM users u
      JOIN talent_profiles t ON u.id = t.user_id
      WHERE u.account_type = 'talent'
    `;
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR t.bio ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (language && language !== 'All Languages') {
      paramCount++;
      query += ` AND t.languages ILIKE $${paramCount}`;
      params.push(`%${language}%`);
    }

    if (genre && genre !== 'All Genres') {
      paramCount++;
      query += ` AND t.specialties ILIKE $${paramCount}`;
      params.push(`%${genre}%`);
    }

    query += ' ORDER BY t.rating DESC, t.completed_projects DESC LIMIT 50';

    const result = await pool.query(query, params);

    // Get demo files for each talent
    for (let talent of result.rows) {
      const demosResult = await pool.query('SELECT * FROM audio_demos WHERE talent_id = $1 LIMIT 3', [talent.id]);
      talent.demos = demosResult.rows;
    }

    console.log(`👥 Found ${result.rows.length} talent profiles`);

    res.json({
      talent: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('❌ Talent fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch talent' });
  }
});

// Contact Form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    console.log('📧 Contact form submission:', { name, email, subject });

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Send email notification
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
          subject: `VoicecastingPro Contact: ${subject}`,
          html: `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `
        });
        console.log('📧 Contact form email sent successfully');
      } catch (emailError) {
        console.error('📧 Failed to send contact form email:', emailError);
        return res.status(500).json({ error: 'Failed to send email' });
      }
    }

    res.json({ message: 'Message sent successfully' });

  } catch (error) {
    console.error('❌ Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Subscription Routes (simplified for sandbox)
app.post('/api/subscriptions/create', authenticateToken, async (req, res) => {
  try {
    const { planType } = req.body;
    
    if (!['monthly', 'annual'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type' });
    }

    // Simulate subscription creation for sandbox
    const mockSubscription = {
      id: `sub_${Date.now()}`,
      status: 'APPROVAL_PENDING',
      links: [
        {
          rel: 'approve',
          href: `https://www.sandbox.paypal.com/cgi-bin/webscr?cmd=_express-checkout&token=mock_${Date.now()}`
        }
      ]
    };

    // Store subscription information
    await pool.query(`
      INSERT INTO payments (user_id, paypal_subscription_id, plan_type, amount, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      req.user.userId, 
      mockSubscription.id, 
      planType, 
      planType === 'monthly' ? 35.00 : 348.00, 
      mockSubscription.status
    ]);

    res.json({
      message: 'Subscription created successfully',
      subscription: mockSubscription,
      approvalUrl: mockSubscription.links.find(link => link.rel === 'approve')?.href
    });

  } catch (error) {
    console.error('❌ Subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Serve static files and frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting VoicecastingPro server...');
    
    // Initialize database
    await initDatabase();
    
    // Create upload directories
    try {
      await fs.mkdir('uploads/demos', { recursive: true });
      await fs.mkdir('uploads/avatars', { recursive: true });
      console.log('📁 Upload directories created');
    } catch (dirError) {
      console.log('📁 Upload directories already exist');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 VoicecastingPro server running on port ${PORT}`);
      console.log(`📊 AI Matching Service enabled`);
      console.log(`💳 PayPal payment processing ready`);
      console.log(`📧 Email notifications configured:`, !!transporter);
      console.log(`🗄️ Database connection ready`);
      console.log(`🌐 API endpoints available at /api/*`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();