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

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    const audioDir = path.join(uploadsDir, 'audio');
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    cb(null, audioDir);
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
    // Accept audio files only
    if (!file.originalname.match(/\.(mp3|wav|ogg|m4a)$/)) {
      return cb(new Error('Only audio files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Get all talent profiles
router.get('/', async (req, res) => {
  try {
    const { category, language, search } = req.query;
    
    let query = `
      SELECT tp.*, p.full_name as name, p.avatar_url, p.user_type,
             (SELECT COUNT(*) FROM audio_demos WHERE user_id = tp.user_id) as demo_count,
             (SELECT ARRAY_AGG(category) FROM voice_actor_categories WHERE voice_actor_id = tp.user_id) as categories
      FROM talent_profiles tp
      JOIN profiles p ON tp.user_id = p.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    // Add search filter
    if (search) {
      queryParams.push(`%${search}%`);
      query += ` AND (p.full_name ILIKE $${queryParams.length} OR tp.bio ILIKE $${queryParams.length})`;
    }
    
    // Add category filter
    if (category && category !== 'all') {
      queryParams.push(category);
      query += ` AND EXISTS (
        SELECT 1 FROM voice_actor_categories
        WHERE voice_actor_id = tp.user_id AND category = $${queryParams.length}
      )`;
    }
    
    // Add language filter
    if (language && language !== 'all') {
      queryParams.push(`%${language}%`);
      query += ` AND tp.languages @> ARRAY[$${queryParams.length}]`;
    }
    
    query += ' ORDER BY p.full_name';
    
    const result = await pool.query(query, queryParams);
    
    res.status(200).json({ talents: result.rows });
    
  } catch (error) {
    console.error('Get talent profiles error:', error);
    res.status(500).json({ error: 'Server error while fetching talent profiles' });
  }
});

// Get talent profile by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get talent profile
    const talentResult = await pool.query(
      `SELECT tp.*, p.full_name as name, p.avatar_url, p.user_type, u.email,
              (SELECT ARRAY_AGG(category) FROM voice_actor_categories WHERE voice_actor_id = tp.user_id) as categories
       FROM talent_profiles tp
       JOIN profiles p ON tp.user_id = p.id
       JOIN users u ON tp.user_id = u.id
       WHERE tp.user_id = $1`,
      [id]
    );
      
    if (talentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Talent profile not found' });
    }
    
    const talent = talentResult.rows[0];
    
    // Get audio demos
    const demosResult = await pool.query(
      `SELECT * FROM audio_demos WHERE user_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    
    const demos = demosResult.rows;
    
    res.status(200).json({
      talent,
      demos
    });
    
  } catch (error) {
    console.error('Get talent profile error:', error);
    res.status(500).json({ error: 'Server error while fetching talent profile' });
  }
});

// Update talent profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bio, languages, voiceTypes, yearsExperience, portfolioUrl } = req.body;
    
    // Verify user is talent
    if (req.user.type !== 'talent') {
      return res.status(403).json({ error: 'Only talent can update talent profiles' });
    }
    
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
    const talentResult = await pool.query(
      `UPDATE talent_profiles 
       SET bio = COALESCE($1, bio),
           languages = COALESCE($2, languages),
           voice_types = COALESCE($3, voice_types),
           years_experience = COALESCE($4, years_experience),
           portfolio_url = COALESCE($5, portfolio_url),
           updated_at = NOW() 
       WHERE user_id = $6 
       RETURNING *`,
      [
        bio,
        languages ? JSON.parse(languages) : null,
        voiceTypes ? JSON.parse(voiceTypes) : null,
        yearsExperience,
        portfolioUrl,
        userId
      ]
    );
    
    res.status(200).json({
      message: 'Talent profile updated successfully',
      profile: talentResult.rows[0]
    });
    
  } catch (error) {
    console.error('Update talent profile error:', error);
    res.status(500).json({ error: 'Server error while updating talent profile' });
  }
});

// Upload audio demo
router.post('/demos', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Verify user is talent
    if (req.user.type !== 'talent') {
      return res.status(403).json({ error: 'Only talent can upload demos' });
    }
    
    // Create audio demo
    const demoResult = await pool.query(
      `INSERT INTO audio_demos 
       (user_id, title, description, file_path, file_size) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        userId,
        title,
        description,
        `/uploads/audio/${req.file.filename}`,
        req.file.size
      ]
    );
    
    res.status(201).json({
      message: 'Audio demo uploaded successfully',
      demo: demoResult.rows[0]
    });
    
  } catch (error) {
    console.error('Upload audio demo error:', error);
    res.status(500).json({ error: 'Server error while uploading audio demo' });
  }
});

// Delete audio demo
router.delete('/demos/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const demoId = req.params.id;
    
    // Verify user is talent
    if (req.user.type !== 'talent') {
      return res.status(403).json({ error: 'Only talent can delete demos' });
    }
    
    // Get demo
    const demoResult = await pool.query(
      'SELECT * FROM audio_demos WHERE id = $1',
      [demoId]
    );
    
    if (demoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Audio demo not found' });
    }
    
    const demo = demoResult.rows[0];
    
    // Verify user owns the demo
    if (demo.user_id !== userId) {
      return res.status(403).json({ error: 'You do not own this audio demo' });
    }
    
    // Delete demo
    await pool.query(
      'DELETE FROM audio_demos WHERE id = $1',
      [demoId]
    );
    
    // Delete file
    const filePath = path.join(__dirname, '..', '..', demo.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    res.status(200).json({
      message: 'Audio demo deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete audio demo error:', error);
    res.status(500).json({ error: 'Server error while deleting audio demo' });
  }
});

// Add voice category
router.post('/categories', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category } = req.body;
    
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    
    // Verify user is talent
    if (req.user.type !== 'talent') {
      return res.status(403).json({ error: 'Only talent can add categories' });
    }
    
    // Check if category already exists
    const existingResult = await pool.query(
      'SELECT * FROM voice_actor_categories WHERE voice_actor_id = $1 AND category = $2',
      [userId, category]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Category already exists' });
    }
    
    // Add category
    const categoryResult = await pool.query(
      `INSERT INTO voice_actor_categories 
       (voice_actor_id, category) 
       VALUES ($1, $2) 
       RETURNING *`,
      [userId, category]
    );
    
    res.status(201).json({
      message: 'Category added successfully',
      category: categoryResult.rows[0]
    });
    
  } catch (error) {
    console.error('Add category error:', error);
    res.status(500).json({ error: 'Server error while adding category' });
  }
});

// Remove voice category
router.delete('/categories/:category', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { category } = req.params;
    
    // Verify user is talent
    if (req.user.type !== 'talent') {
      return res.status(403).json({ error: 'Only talent can remove categories' });
    }
    
    // Remove category
    await pool.query(
      'DELETE FROM voice_actor_categories WHERE voice_actor_id = $1 AND category = $2',
      [userId, category]
    );
    
    res.status(200).json({
      message: 'Category removed successfully'
    });
    
  } catch (error) {
    console.error('Remove category error:', error);
    res.status(500).json({ error: 'Server error while removing category' });
  }
});

export default router;