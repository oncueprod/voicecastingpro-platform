// server.js - VoicecastingPro Backend for Render.com with PostgreSQL
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
const PORT = process.env.PORT || 10000;

// Environment validation
function validateEnvironment() {
    const required = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        console.log('📝 Required environment variables:');
        console.log('   DATABASE_URL - Your PostgreSQL connection string from Render');
        console.log('   JWT_SECRET - A secure random string for JWT tokens');
        console.log('   EMAIL_USER - Gmail address for notifications (optional)');
        console.log('   EMAIL_PASS - Gmail app password (optional)');
        console.log('   PAYPAL_CLIENT_ID - PayPal client ID (optional)');
        console.log('   PAYPAL_CLIENT_SECRET - PayPal client secret (optional)');
        process.exit(1);
    }
}

// Validate environment on startup
validateEnvironment();

// PayPal Configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.paypal.com' 
  : 'https://api.sandbox.paypal.com';

// Database connection with error handling
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err);
});

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL, /\.render\.com$/] 
        : ['http://localhost:3000', 'http://localhost:10000'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// File upload configuration for Render
const storage = multer.memoryStorage(); // Use memory storage for Render

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
    
    // Verify email configuration
    transporter.verify((error, success) => {
        if (error) {
            console.log('⚠️ Email configuration error:', error.message);
        } else {
            console.log('✅ Email service ready');
        }
    });
} else {
    console.log('⚠️ Email not configured - EMAIL_USER and EMAIL_PASS not set');
}

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log('JWT verification error:', err.message);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Database initialization with proper error handling
async function initDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Initializing database tables...');
        
        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                account_type VARCHAR(20) NOT NULL DEFAULT 'client',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Talent profiles table
        await client.query(`
            CREATE TABLE IF NOT EXISTS talent_profiles (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                bio TEXT,
                languages VARCHAR(500),
                specialties VARCHAR(500),
                hourly_rate_min INTEGER DEFAULT 100,
                hourly_rate_max INTEGER DEFAULT 300,
                experience_years INTEGER DEFAULT 0,
                equipment_description TEXT,
                subscription_active BOOLEAN DEFAULT false,
                subscription_type VARCHAR(20),
                subscription_expires_at TIMESTAMP,
                paypal_subscription_id VARCHAR(255),
                rating DECIMAL(3,2) DEFAULT 5.0,
                completed_projects INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        `);

        // Audio demos table
        await client.query(`
            CREATE TABLE IF NOT EXISTS audio_demos (
                id SERIAL PRIMARY KEY,
                talent_id INTEGER REFERENCES talent_profiles(id) ON DELETE CASCADE,
                file_data BYTEA,
                file_name VARCHAR(255),
                description TEXT,
                duration INTEGER,
                file_size INTEGER,
                mime_type VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Projects table
        await client.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                client_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                language VARCHAR(100),
                genre VARCHAR(100),
                voice_gender VARCHAR(20),
                budget_min INTEGER,
                budget_max INTEGER,
                estimated_duration VARCHAR(100),
                deadline DATE,
                status VARCHAR(20) DEFAULT 'open',
                client_email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Project applications table
        await client.query(`
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
        await client.query(`
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
        await client.query(`
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

        // Contact submissions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(500) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes for better performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_talent_profiles_user_id ON talent_profiles(user_id);
            CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
            CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
        `);

        console.log('✅ Database tables initialized successfully');
        
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Utility function for error responses
const handleError = (res, error, message = 'An error occurred') => {
    console.error('❌', message + ':', error);
    res.status(500).json({ 
        error: message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Test database connection
        const result = await pool.query('SELECT NOW()');
        
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(), 
            service: 'VoicecastingPro',
            version: '1.0.0',
            database: 'Connected',
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            service: 'VoicecastingPro',
            database: 'Disconnected',
            error: error.message
        });
    }
});

// API info endpoint
app.get('/api', (req, res) => {
    res.json({ 
        message: 'VoicecastingPro API is running!', 
        version: '1.0.0',
        endpoints: [
            'GET /health - Health check',
            'GET /api/projects - List projects',
            'POST /api/projects - Create project', 
            'GET /api/talent - List talent',
            'POST /api/auth/register - Register user',
            'POST /api/auth/login - Login user',
            'POST /api/talent/profile - Create/update talent profile',
            'POST /api/contact - Contact form'
        ]
    });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { email, password, firstName, lastName, accountType = 'client' } = req.body;

        console.log('📝 Registration attempt:', { email, firstName, lastName, accountType });

        // Validation
        if (!email || !firstName || !lastName) {
            return res.status(400).json({ error: 'Email, first name, and last name are required' });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if user exists
        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await client.query(
            'INSERT INTO users (email, password_hash, first_name, last_name, account_type) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, account_type',
            [email.toLowerCase(), passwordHash, firstName, lastName, accountType]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                accountType: user.account_type 
            },
            process.env.JWT_SECRET,
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
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #667eea;">Welcome to VoicecastingPro, ${firstName}!</h2>
                            <p>Thank you for joining our voice talent marketplace.</p>
                            <p>Your ${accountType} account has been created successfully.</p>
                            <p>You can now start ${accountType === 'client' ? 'posting projects and hiring voice talent' : 'browsing projects and building your voice career'}.</p>
                            <p>Best regards,<br>The VoicecastingPro Team</p>
                        </div>
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
        handleError(res, error, 'Registration failed');
    } finally {
        client.release();
    }
});

app.post('/api/auth/login', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await client.query(
            'SELECT id, email, password_hash, first_name, last_name, account_type FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                accountType: user.account_type 
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ User logged in:', user.email);

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
        handleError(res, error, 'Login failed');
    } finally {
        client.release();
    }
});

// Talent Profile Routes
app.post('/api/talent/profile', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { 
            bio, 
            languages, 
            specialties, 
            hourlyRateMin = 100, 
            hourlyRateMax = 300, 
            experienceYears = 0, 
            equipmentDescription 
        } = req.body;

        console.log('📝 Profile creation for user:', req.user.userId);

        const result = await client.query(`
            INSERT INTO talent_profiles (
                user_id, bio, languages, specialties, hourly_rate_min, 
                hourly_rate_max, experience_years, equipment_description
            )
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
        `, [
            req.user.userId, 
            bio, 
            languages, 
            specialties, 
            hourlyRateMin, 
            hourlyRateMax, 
            experienceYears, 
            equipmentDescription
        ]);

        console.log('✅ Profile saved for user:', req.user.userId);

        res.json({
            message: 'Profile saved successfully',
            profile: result.rows[0]
        });

    } catch (error) {
        handleError(res, error, 'Failed to save profile');
    } finally {
        client.release();
    }
});

app.post('/api/talent/demos', authenticateToken, upload.array('audioDemo', 5), async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { descriptions } = req.body;
        const demos = [];

        const talentResult = await client.query('SELECT id FROM talent_profiles WHERE user_id = $1', [req.user.userId]);
        if (talentResult.rows.length === 0) {
            return res.status(400).json({ error: 'Please create your profile first' });
        }

        const talentId = talentResult.rows[0].id;

        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            const description = descriptions ? descriptions[i] : '';

            const result = await client.query(
                'INSERT INTO audio_demos (talent_id, file_data, file_name, description, file_size, mime_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, file_name, description, file_size, created_at',
                [talentId, file.buffer, file.originalname, description, file.size, file.mimetype]
            );

            demos.push(result.rows[0]);
        }

        res.json({
            message: 'Audio demos uploaded successfully',
            demos: demos
        });

    } catch (error) {
        handleError(res, error, 'Failed to upload demos');
    } finally {
        client.release();
    }
});

// Project Routes
app.get('/api/projects', async (req, res) => {
    const client = await pool.connect();
    
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

        const result = await client.query(query, params);

        console.log(`📋 Found ${result.rows.length} projects`);

        res.json({
            projects: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        handleError(res, error, 'Failed to fetch projects');
    } finally {
        client.release();
    }
});

app.post('/api/projects', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { 
            title, 
            description, 
            language, 
            genre, 
            voiceGender, 
            budgetMin, 
            budgetMax, 
            estimatedDuration, 
            deadline, 
            clientEmail 
        } = req.body;

        console.log('📝 Project creation:', { title, language, genre });

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        if (!clientEmail) {
            return res.status(400).json({ error: 'Client email is required' });
        }

        let clientId = null;
        if (req.headers.authorization) {
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                clientId = decoded.userId;
            } catch (err) {
                console.log('Anonymous project posting');
            }
        }

        const result = await client.query(`
            INSERT INTO projects (
                client_id, title, description, language, genre, voice_gender, 
                budget_min, budget_max, estimated_duration, deadline, client_email
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [
            clientId, title, description, language, genre, voiceGender, 
            budgetMin, budgetMax, estimatedDuration, deadline, clientEmail
        ]);

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
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #667eea;">Project Posted Successfully!</h2>
                            <p><strong>Project:</strong> ${title}</p>
                            <p><strong>Description:</strong> ${description}</p>
                            <p><strong>Budget:</strong> $${budgetMin || 0} - $${budgetMax || 0}</p>
                            <p><strong>Language:</strong> ${language || 'Any'}</p>
                            <p>Your project is now live on VoicecastingPro and talent can start applying.</p>
                            <p>You will receive notifications when voice talent apply to your project.</p>
                            <p>Best regards,<br>The VoicecastingPro Team</p>
                        </div>
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
        handleError(res, error, 'Failed to create project');
    } finally {
        client.release();
    }
});

// Talent Discovery
app.get('/api/talent', async (req, res) => {
    const client = await pool.connect();
    
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

        const result = await client.query(query, params);

        // Get demo files for each talent (just metadata, not the actual files)
        for (let talent of result.rows) {
            const demosResult = await client.query(
                'SELECT id, file_name, description, file_size, created_at FROM audio_demos WHERE talent_id = $1 LIMIT 3', 
                [talent.id]
            );
            talent.demos = demosResult.rows;
        }

        console.log(`👥 Found ${result.rows.length} talent profiles`);

        res.json({
            talent: result.rows,
            count: result.rows.length
        });

    } catch (error) {
        handleError(res, error, 'Failed to fetch talent');
    } finally {
        client.release();
    }
});

// Contact Form
app.post('/api/contact', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { name, email, subject, message } = req.body;

        console.log('📧 Contact form submission:', { name, email, subject });

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Store contact submission
        await client.query(
            'INSERT INTO contact_submissions (name, email, subject, message) VALUES ($1, $2, $3, $4)',
            [name, email, subject, message]
        );

        // Send email notification
        if (transporter) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
                    subject: `VoicecastingPro Contact: ${subject}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h3 style="color: #667eea;">New Contact Form Submission</h3>
                            <p><strong>Name:</strong> ${name}</p>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Subject:</strong> ${subject}</p>
                            <p><strong>Message:</strong></p>
                            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
                                ${message.replace(/\n/g, '<br>')}
                            </div>
                            <p style="margin-top: 20px; font-size: 12px; color: #666;">
                                Submitted at: ${new Date().toISOString()}
                            </p>
                        </div>
                    `
                });
                console.log('📧 Contact form email sent successfully');
            } catch (emailError) {
                console.error('📧 Failed to send contact form email:', emailError);
                // Don't return error to user - form submission was still saved
            }
        }

        res.json({ message: 'Message sent successfully' });

    } catch (error) {
        handleError(res, error, 'Failed to send message');
    } finally {
        client.release();
    }
});

// Subscription Routes (simplified for demo)
app.post('/api/subscriptions/create', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { planType } = req.body;
        
        if (!['monthly', 'annual'].includes(planType)) {
            return res.status(400).json({ error: 'Invalid plan type' });
        }

        // Simulate subscription creation for demo
        const mockSubscription = {
            id: `sub_${Date.now()}`,
            status: 'ACTIVE',
            plan_type: planType,
            amount: planType === 'monthly' ? 35.00 : 348.00
        };

        // Store subscription information
        await client.query(`
            INSERT INTO payments (user_id, paypal_subscription_id, plan_type, amount, status)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            req.user.userId, 
            mockSubscription.id, 
            planType, 
            mockSubscription.amount, 
            mockSubscription.status
        ]);

        // Update talent profile subscription status
        await client.query(`
            UPDATE talent_profiles 
            SET subscription_active = true, 
                subscription_type = $1,
                subscription_expires_at = $2
            WHERE user_id = $3
        `, [
            planType,
            new Date(Date.now() + (planType === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000),
            req.user.userId
        ]);

        console.log('✅ Subscription created for user:', req.user.userId);

        res.json({
            message: 'Subscription created successfully',
            subscription: mockSubscription
        });

    } catch (error) {
        handleError(res, error, 'Failed to create subscription');
    } finally {
        client.release();
    }
});

// Serve audio demo files
app.get('/api/demos/:id', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        
        const result = await client.query(
            'SELECT file_data, file_name, mime_type FROM audio_demos WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Demo not found' });
        }
        
        const demo = result.rows[0];
        
        res.set({
            'Content-Type': demo.mime_type,
            'Content-Disposition': `inline; filename="${demo.file_name}"`
        });
        
        res.send(demo.file_data);
        
    } catch (error) {
        handleError(res, error, 'Failed to serve demo file');
    } finally {
        client.release();
    }
});

// Serve static files and frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received, shutting down gracefully');
    
    try {
        await pool.end();
        console.log('✅ Database pool closed');
    } catch (error) {
        console.error('❌ Error closing database pool:', error);
    }
    
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        console.log('🚀 Starting VoicecastingPro server...');
        console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
        
        // Initialize database
        await initDatabase();
        
        // Start server
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 VoicecastingPro server running on port ${PORT}`);
            console.log(`📊 Health check available at: ${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${PORT}/health`);
            console.log(`💳 PayPal payment processing: ${PAYPAL_CLIENT_ID ? 'Configured' : 'Not configured'}`);
            console.log(`📧 Email notifications: ${transporter ? 'Enabled' : 'Disabled'}`);
            console.log(`🗄️ Database: Connected to PostgreSQL`);
            console.log(`🌐 API endpoints available at: /api/*`);
            console.log(`📱 Frontend served from: /public/index.html`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();