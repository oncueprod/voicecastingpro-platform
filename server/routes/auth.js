import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { pool, transaction } from '../db/index.js';

dotenv.config();

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, type } = req.body;
    
    if (!email || !password || !name || !type) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    if (type !== 'client' && type !== 'talent') {
      return res.status(400).json({ error: 'User type must be either client or talent' });
    }
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
      
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user and profile in a transaction
    const result = await transaction(async (client) => {
      // Create user
      const userResult = await client.query(
        'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
        [email.toLowerCase(), hashedPassword]
      );
      
      const userId = userResult.rows[0].id;
      
      // Create profile
      const profileResult = await client.query(
        'INSERT INTO profiles (id, email, full_name, user_type) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, email.toLowerCase(), name, type]
      );
      
      // Create talent profile if user is talent
      if (type === 'talent') {
        await client.query(
          'INSERT INTO talent_profiles (user_id) VALUES ($1)',
          [userId]
        );
      }
      
      return {
        user: userResult.rows[0],
        profile: profileResult.rows[0]
      };
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: result.user.id,
        email: result.user.email,
        type
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return user data and token
    res.status(201).json({
      user: {
        id: result.user.id,
        email: result.user.email,
        name,
        type,
        createdAt: result.user.created_at
      },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Get user
    const userResult = await pool.query(
      'SELECT u.*, p.full_name, p.user_type, p.avatar_url FROM users u JOIN profiles p ON u.id = p.id WHERE u.email = $1',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Check password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user type matches
    if (userType && user.user_type !== userType) {
      return res.status(403).json({ 
        error: `This account is registered as a ${user.user_type}. Please select the correct account type.`
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        type: user.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update last login
    // await pool.query(
    //  'UPDATE users SET last_login = NOW() WHERE id = $1',
    //  [user.id]
    // );
    
    // Return user data and token
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        type: user.user_type,
        avatar: user.avatar_url,
        lastLogin: new Date()
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Reset password request
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      // Don't reveal that the user doesn't exist
      return res.status(200).json({ message: 'If an account with this email exists, a password reset link has been sent' });
    }
    
    // Generate reset token
    const resetToken = jwt.sign(
      { userId: userResult.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Store reset token in database
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2',
      [resetToken, userResult.rows[0].id]
    );
    
    // In a real implementation, send an email with the reset link
    // For now, just log it
    console.log(`Password reset link: ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`);
    
    res.status(200).json({ message: 'If an account with this email exists, a password reset link has been sent' });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user profile
    const profileResult = await pool.query(
      'SELECT p.*, u.email FROM profiles p JOIN users u ON p.id = u.id WHERE p.id = $1',
      [decoded.userId]
    );
      
    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const profile = profileResult.rows[0];
    
    // Return user data
    res.status(200).json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        type: profile.user_type,
        avatar: profile.avatar_url
      }
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;