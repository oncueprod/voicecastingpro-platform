import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../db/index.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '50000000') // 50MB default
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Get user profile - DEBUG VERSION
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log('=== PROFILE DEBUG ===');
    console.log('JWT userId:', userId);
    console.log('JWT email:', req.user.email);
    
    // Get user profile with detailed logging
    const profileResult = await pool.query(
      `SELECT p.*, u.email as users_email, u.last_login,
              p.email as profiles_email
       FROM profiles p 
       JOIN users u ON p.id = u.id 
       WHERE p.id = $1`,
      [userId]
    );
    
    console.log('Profile query result:', profileResult.rows[0]);
    
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const profile = profileResult.rows[0];
    
    console.log('users table email:', profile.users_email);
    console.log('profiles table email:', profile.profiles_email);
    console.log('Emails match:', profile.users_email === profile.profiles_email);
    
    // If talent, get talent profile
    let talentProfile = null;
    if (profile.user_type === 'talent') {
      const talentResult = await pool.query(
        'SELECT * FROM talent_profiles WHERE user_id = $1',
        [userId]
      );
      
      if (talentResult.rows.length > 0) {
        talentProfile = talentResult.rows[0];
      }
    }
    
    // Get payment methods
    const paymentMethodsResult = await pool.query(
      'SELECT * FROM payment_methods WHERE user_id = $1',
      [userId]
    );
    
    const paymentMethods = paymentMethodsResult.rows;
    
    res.status(200).json({
      profile: {
        id: profile.id,
        email: profile.users_email, // Use email from users table
        name: profile.full_name,
        type: profile.user_type,
        avatar: profile.avatar_url,
        lastLogin: profile.last_login
      },
      talentProfile,
      paymentMethods,
      debug: {
        usersEmail: profile.users_email,
        profilesEmail: profile.profiles_email,
        jwtEmail: req.user.email
      }
    });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error while fetching profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, bio, location, phone, website, languages, hourlyRate, company, industry, paypalEmail } = req.body;
    
    // Update profile
    const profileResult = await pool.query(
      `UPDATE profiles 
       SET full_name = COALESCE($1, full_name),
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [name, userId]
    );
      
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    // If talent, update talent profile
    if (req.user.type === 'talent') {
      // Check if talent profile exists
      const talentCheckResult = await pool.query(
        'SELECT * FROM talent_profiles WHERE user_id = $1',
        [userId]
      );
      
      if (talentCheckResult.rows.length === 0) {
        // Create talent profile if it doesn't exist
        await pool.query(
          'INSERT INTO talent_profiles (user_id) VALUES ($1)',
          [userId]
        );
      }
      
      // Update talent profile
      await pool.query(
        `UPDATE talent_profiles 
         SET bio = COALESCE($1, bio),
             languages = COALESCE($2, languages),
             years_experience = COALESCE($3, years_experience),
             updated_at = NOW() 
         WHERE user_id = $4`,
        [bio, languages ? JSON.parse(languages) : null, hourlyRate, userId]
      );
    }
    
    // Update or create payment method if paypalEmail is provided
    if (paypalEmail) {
      // Check if payment method exists
      const paymentMethodResult = await pool.query(
        'SELECT * FROM payment_methods WHERE user_id = $1 AND paypal_email = $2',
        [userId, paypalEmail]
      );
      
      if (paymentMethodResult.rows.length === 0) {
        // Create payment method
        await pool.query(
          `INSERT INTO payment_methods 
           (user_id, paypal_email) 
           VALUES ($1, $2)`,
          [userId, paypalEmail]
        );
      }
    }
    
    res.status(200).json({
      message: 'Profile updated successfully',
      profile: profileResult.rows[0]
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error while updating profile' });
  }
});

// Upload avatar
router.post('/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.userId;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Get file path
    const filePath = `/uploads/${req.file.filename}`;
    
    // Update profile avatar
    const profileResult = await pool.query(
      `UPDATE profiles 
       SET avatar_url = $1, 
           updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [filePath, userId]
    );
      
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    res.status(200).json({
      message: 'Avatar uploaded successfully',
      avatar: filePath
    });
    
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Server error while uploading avatar' });
  }
});

// Get user payment methods
router.get('/payment-methods', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const paymentMethodsResult = await pool.query(
      'SELECT * FROM payment_methods WHERE user_id = $1',
      [userId]
    );
    
    res.status(200).json({
      paymentMethods: paymentMethodsResult.rows
    });
    
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Server error while fetching payment methods' });
  }
});

// Add payment method
router.post('/payment-methods', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paypalEmail } = req.body;
    
    if (!paypalEmail) {
      return res.status(400).json({ error: 'PayPal email is required' });
    }
    
    // Check if payment method already exists
    const existingResult = await pool.query(
      'SELECT * FROM payment_methods WHERE user_id = $1 AND paypal_email = $2',
      [userId, paypalEmail]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Payment method already exists' });
    }
    
    // Create payment method
    const paymentMethodResult = await pool.query(
      `INSERT INTO payment_methods 
       (user_id, paypal_email) 
       VALUES ($1, $2) 
       RETURNING *`,
      [userId, paypalEmail]
    );
    
    res.status(201).json({
      message: 'Payment method added successfully',
      paymentMethod: paymentMethodResult.rows[0]
    });
    
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ error: 'Server error while adding payment method' });
  }
});

// Get user notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const result = await pool.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    
    // If no preferences exist, create default ones
    if (result.rows.length === 0) {
      const createResult = await pool.query(
        `INSERT INTO user_preferences 
         (user_id, email_notifications, message_email_notifications, daily_digest) 
         VALUES ($1, TRUE, TRUE, FALSE) 
         RETURNING *`,
        [userId]
      );
      
      return res.status(200).json({ 
        preferences: createResult.rows[0] 
      });
    }
    
    res.status(200).json({ 
      preferences: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Server error while fetching preferences' });
  }
});

// Update user notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      email_notifications, 
      message_email_notifications, 
      daily_digest 
    } = req.body;
    
    // Validate input
    if (typeof email_notifications !== 'boolean' ||
        typeof message_email_notifications !== 'boolean' ||
        typeof daily_digest !== 'boolean') {
      return res.status(400).json({ 
        error: 'Invalid preference values. Must be boolean.' 
      });
    }
    
    // If email notifications are disabled, disable all sub-notifications
    const finalMessageNotifications = email_notifications ? message_email_notifications : false;
    const finalDailyDigest = email_notifications ? daily_digest : false;
    
    const result = await pool.query(
      `INSERT INTO user_preferences 
       (user_id, email_notifications, message_email_notifications, daily_digest, updated_at) 
       VALUES ($1, $2, $3, $4, NOW()) 
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         email_notifications = EXCLUDED.email_notifications,
         message_email_notifications = EXCLUDED.message_email_notifications,
         daily_digest = EXCLUDED.daily_digest,
         updated_at = NOW()
       RETURNING *`,
      [userId, email_notifications, finalMessageNotifications, finalDailyDigest]
    );
    
    res.status(200).json({ 
      preferences: result.rows[0],
      message: 'Preferences updated successfully'
    });
    
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Server error while updating preferences' });
  }
});

export default router;