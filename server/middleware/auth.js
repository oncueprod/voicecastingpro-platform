import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token is required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const authorizeAdmin = (req, res, next) => {
  // First authenticate the token
  authenticateToken(req, res, () => {
    // Check if user has admin role
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

export const authorizeSuperAdmin = (req, res, next) => {
  // First authenticate the token
  authenticateToken(req, res, () => {
    // Check if user has super admin role
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    next();
  });
};