const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve index.html for all routes (SPA support)
app.get('/', (req, res) => {
    console.log('📱 Frontend served from: /public/index.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test database connection
pool.connect()
    .then(() => console.log('✅ Connected to PostgreSQL database'))
    .catch(err => console.error('❌ Database connection error:', err));

// Gmail SMTP Configuration
const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for 587
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // This MUST be an App Password from Google!
    }
});

// Test Gmail connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Gmail SMTP Configuration Error:', error);
        console.log('🔧 Check your EMAIL_USER and EMAIL_PASS environment variables');
        console.log('📧 EMAIL_PASS must be a 16-digit App Password from Google Account Security settings');
    } else {
        console.log('✅ Gmail SMTP Server ready for sending emails');
    }
});

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/demos';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /audio\/(mp3|wav|ogg|aiff|m4a)/;
        if (allowedTypes.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

// JWT middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// =====================================
// AUTHENTICATION ROUTES
// =====================================

// User Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, accountType } = req.body;

        // Validation
        if (!email || !password || !firstName || !lastName || !accountType) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash, first_name, last_name, account_type, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, email, first_name, last_name, account_type',
            [email, hashedPassword, firstName, lastName, accountType]
        );

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: newUser.rows[0].id, 
                email: newUser.rows[0].email,
                accountType: newUser.rows[0].account_type 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        console.log(`✅ New ${accountType} registered: ${email}`);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: newUser.rows[0].id,
                email: newUser.rows[0].email,
                first_name: newUser.rows[0].first_name,
                last_name: newUser.rows[0].last_name,
                account_type: newUser.rows[0].account_type
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.rows[0].id, 
                email: user.rows[0].email,
                accountType: user.rows[0].account_type 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        console.log(`✅ User logged in: ${email}`);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.rows[0].id,
                email: user.rows[0].email,
                first_name: user.rows[0].first_name,
                last_name: user.rows[0].last_name,
                account_type: user.rows[0].account_type
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

// Password Reset Request
app.post('/api/auth/password-reset-request', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists
        const user = await pool.query('SELECT id, first_name FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            // Don't reveal if email exists or not for security
            return res.json({ message: 'If this email exists, you will receive reset instructions' });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user.rows[0].id, email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        // Send password reset email
        const resetLink = `${process.env.FRONTEND_URL || 'https://voicecastingpro-platform.onrender.com'}/reset-password?token=${resetToken}`;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'VoicecastingPro - Password Reset Request',
            html: `
                <h2>Password Reset Request</h2>
                <p>Hello ${user.rows[0].first_name},</p>
                <p>You requested a password reset for your VoicecastingPro account.</p>
                <p>Click the link below to reset your password:</p>
                <a href="${resetLink}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <p>Best regards,<br>VoicecastingPro Team</p>
            `
        });

        console.log(`📧 Password reset email sent to: ${email}`);
        res.json({ message: 'Password reset instructions sent to your email' });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ error: 'Failed to send password reset email' });
    }
});

// =====================================
// CONTACT FORM ROUTES (FIXED!)
// =====================================

// Contact Form Submission - FIXED VERSION
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validation
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        console.log('📧 Contact form submission:', { name, email, subject });

        // Actually send email via Gmail SMTP
        const emailResult = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER || 'support@voicecastingpro.com', // Send to yourself
            subject: `VoicecastingPro Contact: ${subject}`,
            html: `
                <h3>New Contact Form Submission</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <p><strong>Message:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            `,
            replyTo: email
        });

        console.log('✅ Contact email sent successfully:', emailResult.messageId);

        // Store in database (optional)
        try {
            await pool.query(
                'INSERT INTO contact_submissions (name, email, subject, message, submitted_at) VALUES ($1, $2, $3, $4, NOW())',
                [name, email, subject, message]
            );
        } catch (dbError) {
            console.log('⚠️ Database storage failed (non-critical):', dbError.message);
        }

        res.json({ 
            message: "Message sent successfully", 
            emailSent: true,
            messageId: emailResult.messageId 
        });

    } catch (error) {
        console.error('❌ Contact form error:', error);

        // Specific Gmail error handling
        if (error.code === 'EAUTH') {
            console.error('🔐 Gmail Authentication Failed - Check your App Password!');
            return res.status(500).json({ 
                error: 'Email authentication failed', 
                emailSent: false,
                hint: 'Gmail App Password may be incorrect'
            });
        }

        if (error.code === 'ECONNREFUSED') {
            console.error('🌐 Gmail Connection Refused - Check network/firewall settings');
            return res.status(500).json({ 
                error: 'Cannot connect to Gmail servers', 
                emailSent: false,
                hint: 'Check network connection'
            });
        }

        res.status(500).json({ 
            error: 'Failed to send message', 
            emailSent: false,
            details: error.message 
        });
    }
});

// Gmail Test Endpoint
app.post('/api/contact/test-gmail', async (req, res) => {
    try {
        console.log('🧪 Testing Gmail SMTP connection...');

        // Test SMTP connection
        await transporter.verify();
        console.log('✅ Gmail SMTP connection successful');

        // Send test email
        const testResult = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to yourself
            subject: 'VoicecastingPro Gmail SMTP Test',
            html: `
                <h3>Gmail SMTP Test Successful! ✅</h3>
                <p>This confirms that Gmail SMTP is working properly.</p>
                <p><strong>Test performed:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>From:</strong> ${process.env.EMAIL_USER}</p>
                <p>If you received this email, your Gmail integration is working!</p>
            `
        });

        console.log('✅ Gmail test email sent:', testResult.messageId);

        res.json({
            smtpConnected: true,
            emailSent: true,
            messageId: testResult.messageId,
            message: 'Gmail SMTP test successful'
        });

    } catch (error) {
        console.error('❌ Gmail test failed:', error);

        res.json({
            smtpConnected: false,
            emailSent: false,
            error: error.message,
            authError: error.code === 'EAUTH',
            connectionError: error.code === 'ECONNREFUSED'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'VoicecastingPro Backend',
        database: 'connected',
        gmail: transporter ? 'configured' : 'not configured'
    });
});

// =====================================
// TALENT ROUTES (FIXED COLUMN NAMES)
// =====================================

// Create Talent Profile
app.post('/api/talent/profile', authenticateToken, async (req, res) => {
    try {
        const { bio, languages, specialties, hourlyRateMin, hourlyRateMax, experienceYears, equipmentDescription } = req.body;
        
        if (!bio || !languages || !specialties) {
            return res.status(400).json({ error: 'Bio, languages, and specialties are required' });
        }

        // Check if profile already exists
        const existingProfile = await pool.query('SELECT id FROM talent_profiles WHERE user_id = $1', [req.user.userId]);
        
        if (existingProfile.rows.length > 0) {
            // Update existing profile
            const updatedProfile = await pool.query(
                `UPDATE talent_profiles 
                 SET bio = $1, languages = $2, specialties = $3, hourly_rate_min = $4, 
                     hourly_rate_max = $5, experience_years = $6, equipment_description = $7, updated_at = NOW()
                 WHERE user_id = $8 RETURNING *`,
                [bio, languages, specialties, hourlyRateMin, hourlyRateMax, experienceYears, equipmentDescription, req.user.userId]
            );
            
            console.log(`✅ Talent profile updated for user: ${req.user.email}`);
            res.json({ message: 'Profile updated successfully', profile: updatedProfile.rows[0] });
        } else {
            // Create new profile
            const newProfile = await pool.query(
                `INSERT INTO talent_profiles 
                 (user_id, bio, languages, specialties, hourly_rate_min, hourly_rate_max, experience_years, equipment_description, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
                [req.user.userId, bio, languages, specialties, hourlyRateMin, hourlyRateMax, experienceYears, equipmentDescription]
            );
            
            console.log(`✅ Talent profile created for user: ${req.user.email}`);
            res.json({ message: 'Profile created successfully', profile: newProfile.rows[0] });
        }
    } catch (error) {
        console.error('Talent profile error:', error);
        res.status(500).json({ error: 'Failed to save talent profile' });
    }
});

// Get All Talent (Fixed column names + demo count)
app.get('/api/talent', async (req, res) => {
    try {
        const talent = await pool.query(`
            SELECT 
                u.id, u.first_name, u.last_name, u.email, u.account_type,
                tp.bio, tp.languages, tp.specialties, 
                tp.hourly_rate_min, tp.hourly_rate_max, 
                tp.experience_years, tp.equipment_description,
                tp.rating, tp.completed_projects, tp.demo_count,
                s.subscription_active,
                (SELECT COUNT(*) FROM audio_demos WHERE user_id = u.id) as actual_demo_count
            FROM users u
            JOIN talent_profiles tp ON u.id = tp.user_id
            LEFT JOIN subscriptions s ON u.id = s.user_id
            WHERE u.account_type = 'talent'
            ORDER BY tp.rating DESC, tp.created_at DESC
        `);

        // Update demo_count for profiles that might be out of sync
        for (const t of talent.rows) {
            if (t.demo_count !== t.actual_demo_count) {
                await pool.query(
                    'UPDATE talent_profiles SET demo_count = $1 WHERE user_id = $2',
                    [t.actual_demo_count, t.id]
                );
                t.demo_count = t.actual_demo_count;
            }
        }

        console.log(`📋 Found ${talent.rows.length} talent profiles`);
        res.json({ talent: talent.rows });
    } catch (error) {
        console.error('❌ Failed to fetch talent:', error);
        res.status(500).json({ error: 'Failed to fetch talent profiles' });
    }
});

// =====================================
// DEMO MANAGEMENT ROUTES (NEW!)
// =====================================

// GET /api/talent/:id/demos - Get demos for a specific talent (PUBLIC)
app.get('/api/talent/:id/demos', async (req, res) => {
    try {
        const talentId = parseInt(req.params.id);
        
        if (isNaN(talentId)) {
            return res.status(400).json({ error: 'Invalid talent ID' });
        }

        // Get talent info
        const talent = await pool.query(
            'SELECT id, first_name, last_name, email FROM users WHERE id = $1 AND account_type = $2',
            [talentId, 'talent']
        );
        
        if (talent.rows.length === 0) {
            return res.status(404).json({ error: 'Talent not found' });
        }

        // Get their demos
        const demos = await pool.query(`
            SELECT id, title, description, file_path as url, original_name, created_at, file_size
            FROM audio_demos 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `, [talentId]);

        // Format demos for frontend
        const formattedDemos = demos.rows.map(demo => ({
            id: demo.id,
            title: demo.title || demo.original_name || 'Untitled Demo',
            description: demo.description || 'No description available',
            url: demo.url, // This should be like '/uploads/demos/filename'
            duration: demo.duration || 'Unknown',
            created_at: demo.created_at,
            talent_name: `${talent.rows[0].first_name} ${talent.rows[0].last_name}`,
            talent_email: talent.rows[0].email
        }));

        console.log(`📋 Found ${formattedDemos.length} demos for talent ${talentId}`);

        res.json({
            success: true,
            demos: formattedDemos,
            talent: {
                id: talent.rows[0].id,
                name: `${talent.rows[0].first_name} ${talent.rows[0].last_name}`
            }
        });

    } catch (error) {
        console.error('❌ Get talent demos error:', error);
        res.status(500).json({ error: 'Failed to load demos' });
    }
});

// GET /api/talent/demos - Get current user's demos (AUTHENTICATED)
app.get('/api/talent/demos', authenticateToken, async (req, res) => {
    try {
        if (req.user.accountType !== 'talent') {
            return res.status(403).json({ error: 'Only talent can access demos' });
        }

        const demos = await pool.query(`
            SELECT id, title, description, file_path as url, original_name, created_at, file_size
            FROM audio_demos 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `, [req.user.userId]);

        // Format demos for frontend
        const formattedDemos = demos.rows.map(demo => ({
            id: demo.id,
            title: demo.title || demo.original_name || 'Untitled Demo',
            description: demo.description || 'No description available',
            url: demo.url,
            duration: demo.duration || 'Unknown',
            created_at: demo.created_at,
            file_size: demo.file_size
        }));

        console.log(`📋 Found ${formattedDemos.length} demos for user ${req.user.userId}`);

        res.json({
            success: true,
            demos: formattedDemos
        });

    } catch (error) {
        console.error('❌ Get user demos error:', error);
        res.status(500).json({ error: 'Failed to load your demos' });
    }
});

// POST /api/talent/demos - Upload new demo (AUTHENTICATED) - NEW VERSION
app.post('/api/talent/demos', authenticateToken, upload.single('audioFile'), async (req, res) => {
    try {
        if (req.user.accountType !== 'talent') {
            return res.status(403).json({ error: 'Only talent can upload demos' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Audio file is required' });
        }

        const { title, description } = req.body;

        if (!title || title.trim().length === 0) {
            // Clean up uploaded file
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {}
            return res.status(400).json({ error: 'Demo title is required' });
        }

        // Check demo limit (max 10 demos per user)
        const existingDemos = await pool.query(
            'SELECT COUNT(*) as count FROM audio_demos WHERE user_id = $1',
            [req.user.userId]
        );

        if (parseInt(existingDemos.rows[0].count) >= 10) {
            // Clean up uploaded file
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {}
            return res.status(400).json({ 
                error: 'Maximum 10 demos allowed. Please delete some existing demos first.' 
            });
        }

        // Save demo to database
        const filePath = req.file.path.replace('public', ''); // Remove 'public' prefix for URL
        
        const demo = await pool.query(
            `INSERT INTO audio_demos (user_id, title, description, file_path, file_size, original_name, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
            [req.user.userId, title.trim(), description || '', filePath, req.file.size, req.file.originalname]
        );

        // Update talent profile demo count
        await pool.query(`
            UPDATE talent_profiles 
            SET demo_count = (SELECT COUNT(*) FROM audio_demos WHERE user_id = $1)
            WHERE user_id = $1
        `, [req.user.userId]);

        console.log(`✅ Demo uploaded successfully: "${title}" by user ${req.user.userId}`);

        res.status(201).json({
            success: true,
            message: 'Demo uploaded successfully',
            demo: {
                id: demo.rows[0].id,
                title: demo.rows[0].title,
                description: demo.rows[0].description,
                url: demo.rows[0].file_path,
                file_size: demo.rows[0].file_size,
                original_name: demo.rows[0].original_name
            }
        });

    } catch (error) {
        console.error('❌ Demo upload error:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {}
        }
        
        res.status(500).json({ error: 'Failed to upload demo' });
    }
});

// DELETE /api/talent/demos/:id - Delete demo (AUTHENTICATED)
app.delete('/api/talent/demos/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.accountType !== 'talent') {
            return res.status(403).json({ error: 'Only talent can delete demos' });
        }

        const demoId = parseInt(req.params.id);
        
        if (isNaN(demoId)) {
            return res.status(400).json({ error: 'Invalid demo ID' });
        }

        // Get demo info and verify ownership
        const demo = await pool.query(
            'SELECT * FROM audio_demos WHERE id = $1 AND user_id = $2',
            [demoId, req.user.userId]
        );

        if (demo.rows.length === 0) {
            return res.status(404).json({ error: 'Demo not found or access denied' });
        }

        // Delete the physical file
        const filePath = path.join(__dirname, 'public', demo.rows[0].file_path);
        try {
            fs.unlinkSync(filePath);
            console.log(`🗑️ File deleted: ${filePath}`);
        } catch (fileError) {
            console.error('File deletion error:', fileError);
            // Continue with database deletion even if file deletion fails
        }

        // Delete from database
        await pool.query('DELETE FROM audio_demos WHERE id = $1 AND user_id = $2', [demoId, req.user.userId]);

        // Update talent profile demo count
        await pool.query(`
            UPDATE talent_profiles 
            SET demo_count = (SELECT COUNT(*) FROM audio_demos WHERE user_id = $1)
            WHERE user_id = $1
        `, [req.user.userId]);

        console.log(`✅ Demo deleted successfully: ID ${demoId} by user ${req.user.userId}`);

        res.json({
            success: true,
            message: 'Demo deleted successfully'
        });

    } catch (error) {
        console.error('❌ Demo deletion error:', error);
        res.status(500).json({ error: 'Failed to delete demo' });
    }
});

// =====================================
// PROJECT ROUTES
// =====================================

// Create Project
app.post('/api/projects', authenticateToken, async (req, res) => {
    try {
        const { title, description, language, genre, voiceGender, budgetMin, budgetMax, estimatedDuration, deadline, clientEmail } = req.body;

        if (!title || !description || !deadline) {
            return res.status(400).json({ error: 'Title, description, and deadline are required' });
        }

        const newProject = await pool.query(
            `INSERT INTO projects 
             (client_id, title, description, language, genre, voice_gender, budget_min, budget_max, 
              estimated_duration, deadline, client_email, status, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'open', NOW()) RETURNING *`,
            [req.user.userId, title, description, language, genre, voiceGender, budgetMin, budgetMax, 
             estimatedDuration, deadline, clientEmail]
        );

        console.log(`✅ New project created: "${title}" by ${req.user.email}`);
        res.status(201).json({ message: 'Project created successfully', project: newProject.rows[0] });
    } catch (error) {
        console.error('Project creation error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Get All Projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await pool.query(`
            SELECT 
                p.*, 
                u.first_name as client_first_name, 
                u.last_name as client_last_name
            FROM projects p
            JOIN users u ON p.client_id = u.id
            WHERE p.status = 'open'
            ORDER BY p.created_at DESC
        `);

        console.log(`📋 Found ${projects.rows.length} projects`);
        res.json({ projects: projects.rows });
    } catch (error) {
        console.error('❌ Failed to fetch projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// =====================================
// SUBSCRIPTION ROUTES
// =====================================

// Create Subscription
app.post('/api/subscriptions/create', authenticateToken, async (req, res) => {
    try {
        const { planType } = req.body; // 'monthly' or 'annual'

        if (!planType || !['monthly', 'annual'].includes(planType)) {
            return res.status(400).json({ error: 'Invalid plan type' });
        }

        const price = planType === 'monthly' ? 35 : 348;
        const interval = planType === 'monthly' ? 'month' : 'year';

        // In a real app, you'd process payment with PayPal/Stripe here
        // For demo, we'll just create the subscription record

        const subscription = await pool.query(
            `INSERT INTO subscriptions 
             (user_id, plan_type, price, interval, subscription_active, created_at, next_billing_date)
             VALUES ($1, $2, $3, $4, true, NOW(), NOW() + INTERVAL '1 ${interval}') 
             ON CONFLICT (user_id) DO UPDATE SET
             plan_type = $2, price = $3, interval = $4, subscription_active = true, 
             next_billing_date = NOW() + INTERVAL '1 ${interval}', updated_at = NOW()
             RETURNING *`,
            [req.user.userId, planType, price, interval]
        );

        console.log(`✅ Subscription created: ${planType} for ${req.user.email}`);
        res.json({ message: 'Subscription created successfully', subscription: subscription.rows[0] });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

// =====================================
// LEGACY AUDIO DEMO UPLOAD ROUTE (KEEP FOR BACKWARD COMPATIBILITY)
// =====================================

// Upload Audio Demo (Legacy route - keep for backward compatibility)
app.post('/api/talent/upload-demo', authenticateToken, upload.single('audioDemo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const { description } = req.body;
        const filePath = `/uploads/demos/${req.file.filename}`;
        const fileSize = req.file.size;

        // Save demo info to database
        const demo = await pool.query(
            `INSERT INTO audio_demos (user_id, title, file_path, file_size, original_name, description, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
            [req.user.userId, req.file.originalname, filePath, fileSize, req.file.originalname, description || '']
        );

        // Update talent profile demo count
        await pool.query(`
            UPDATE talent_profiles 
            SET demo_count = (SELECT COUNT(*) FROM audio_demos WHERE user_id = $1)
            WHERE user_id = $1
        `, [req.user.userId]);

        console.log(`✅ Audio demo uploaded: ${req.file.originalname} by ${req.user.email}`);
        res.json({ message: 'Demo uploaded successfully', demo: demo.rows[0] });
    } catch (error) {
        console.error('Demo upload error:', error);
        res.status(500).json({ error: 'Failed to upload demo' });
    }
});

// =====================================
// DATABASE INITIALIZATION (UPDATED)
// =====================================

// Initialize database tables
async function initializeDatabase() {
    try {
        // Create tables if they don't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('client', 'talent')),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS talent_profiles (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                bio TEXT NOT NULL,
                languages VARCHAR(500) NOT NULL,
                specialties VARCHAR(500) NOT NULL,
                hourly_rate_min INTEGER DEFAULT 50,
                hourly_rate_max INTEGER DEFAULT 200,
                experience_years INTEGER DEFAULT 0,
                equipment_description TEXT,
                rating DECIMAL(3,2) DEFAULT 5.0,
                completed_projects INTEGER DEFAULT 0,
                demo_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                language VARCHAR(50),
                genre VARCHAR(50),
                voice_gender VARCHAR(20),
                budget_min INTEGER,
                budget_max INTEGER,
                estimated_duration VARCHAR(50),
                deadline DATE NOT NULL,
                client_email VARCHAR(255),
                status VARCHAR(20) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                plan_type VARCHAR(20) NOT NULL,
                price INTEGER NOT NULL,
                interval VARCHAR(10) NOT NULL,
                subscription_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                next_billing_date TIMESTAMP,
                UNIQUE(user_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS audio_demos (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255),
                file_path VARCHAR(500) NOT NULL,
                file_size INTEGER,
                original_name VARCHAR(255),
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS contact_submissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                submitted_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Add demo_count column to talent_profiles if it doesn't exist
        try {
            await pool.query(`
                ALTER TABLE talent_profiles ADD COLUMN demo_count INTEGER DEFAULT 0;
            `);
            console.log('✅ Added demo_count column to talent_profiles');
        } catch (error) {
            // Column might already exist, ignore error
            console.log('⚠️ demo_count column already exists or error adding it:', error.message);
        }

        // Add title column to audio_demos if it doesn't exist
        try {
            await pool.query(`
                ALTER TABLE audio_demos ADD COLUMN title VARCHAR(255);
            `);
            console.log('✅ Added title column to audio_demos');
        } catch (error) {
            // Column might already exist, ignore error
            console.log('⚠️ title column already exists or error adding it:', error.message);
        }

        // Update existing demo counts
        await pool.query(`
            UPDATE talent_profiles 
            SET demo_count = (
                SELECT COUNT(*) FROM audio_demos WHERE user_id = talent_profiles.user_id
            ) 
            WHERE demo_count IS NULL OR demo_count = 0
        `);

        console.log('✅ Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

// Initialize database on startup
initializeDatabase();

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 VoicecastingPro backend running on port ${PORT}`);
    console.log(`📧 Gmail SMTP configured: ${process.env.EMAIL_USER ? 'Yes' : 'No'}`);
    console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;