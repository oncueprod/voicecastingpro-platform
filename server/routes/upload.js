import express from 'express';
import multer from 'multer';
// import ImageKit from 'imagekit';  // COMMENTED OUT
import jwt from 'jsonwebtoken';
import { pool } from '../db/index.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize ImageKit - COMMENTED OUT
// const imagekit = new ImageKit({
//   publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
//   privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
//   urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
// });

// Configure multer for memory storage (no local files)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Audio Upload Endpoint (for voice demos) - IMAGEKIT REMOVED
router.post('/audio', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    console.log('Audio upload started...', req.file ? 'File received' : 'No file');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { type = 'demo', title, description, category } = req.body;
    const userId = req.user.userId;

    console.log('ImageKit upload disabled - returning mock response');

    // IMAGEKIT UPLOAD COMMENTED OUT
    // const uploadResponse = await imagekit.upload({
    //   file: req.file.buffer,
    //   fileName: `audio_${userId}_${Date.now()}_${req.file.originalname}`,
    //   folder: `/audio/${type}`,
    //   tags: ['audio', type, `user-${userId}`, category || 'uncategorized'],
    //   customMetadata: {
    //     userId: userId.toString(),
    //     type,
    //     title: title || '',
    //     description: description || '',
    //     category: category || '',
    //     originalName: req.file.originalname,
    //     uploadedAt: new Date().toISOString()
    //   }
    // });

    console.log('Mock upload successful');

    // Return mock success response (ImageKit disabled)
    res.json({
      success: true,
      message: 'Audio upload simulated successfully! (ImageKit disabled)',
      file: {
        id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: req.file.originalname,
        url: `/uploads/mock_${req.file.originalname}`, // Mock URL
        size: req.file.size,
        uploadedAt: new Date(),
        userId,
        type
      },
      note: 'ImageKit integration has been disabled. This is a mock response.'
    });

  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process audio file',
      details: error.message 
    });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Upload route is working!',
    imagekit: {
      configured: false,
      status: 'Disabled - ImageKit integration removed'
    }
  });
});

export default router;