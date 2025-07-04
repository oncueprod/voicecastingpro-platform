import express from 'express';
import bcrypt from 'bcrypt';
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

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user profile
    const profileResult = await pool.query(
      `SELECT p.*, u.email
       FROM profiles p 
       JOIN users u ON p.id = u.id 
       WHERE p.id = $1`,
      [userId]
    );
      
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const profile = profileResult.rows[0];
    
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
    // const paymentMethodsResult = await pool.query(
    // 'SELECT * FROM payment_methods WHERE user_id = $1',
    // [userId]
    // );
    
    // const paymentMethods = paymentMethodsResult.rows;
    const paymentMethods = []; // Empty array for now
    
    res.status(200).json({
      profile: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        type: profile.user_type,
        avatar: profile.avatar_url,
        lastLogin: null
      },
      talentProfile,
      paymentMethods: []
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
    // if (paypalEmail) {
      // Check if payment method exists
     // const paymentMethodResult = await pool.query(
      //  'SELECT * FROM payment_methods WHERE user_id = $1 AND paypal_email = $2',
      //  [userId, paypalEmail]
    //  );
      
    //  if (paymentMethodResult.rows.length === 0) {
        // Create payment method
      //  await pool.query(
       //   `INSERT INTO payment_methods 
        //   (user_id, paypal_email) 
       //    VALUES ($1, $2)`,
       //   [userId, paypalEmail]
      //  );
     // }
   // }
    
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

// Change password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    // Get current password from database
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password in database
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedNewPassword, userId]
    );
    
    res.status(200).json({
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error while changing password' });
  }
});

// Delete account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user info for logging
    const userResult = await pool.query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete user (cascading deletes will handle related data)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    console.log(`User account deleted: ${userResult.rows[0].email} (ID: ${userId})`);
    
    res.status(200).json({
      message: 'Account deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Server error while deleting account' });
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

export default router;