import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminService } from '../services/adminService';

interface AdminLoginProps {
  onSuccess: () => void;
  onClose: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    // Initialize admin system and ensure default admin exists
    initializeAdminSystem();
  }, []);

  const initializeAdminSystem = () => {
    try {
      // Reset admin system to ensure default admin account exists
      adminService.resetAdminSystem();
      
      const admins = adminService.getAdmins();
      setDebugInfo(`Admin system initialized with ${admins.length} admin(s)`);
      console.log('🔍 Admin system initialized:', admins);
    } catch (error) {
      setDebugInfo('Error initializing admin system');
      console.error('❌ Admin system initialization error:', error);
    }
  };

  const checkAdminSystem = () => {
    try {
      const admins = adminService.getAdmins();
      setDebugInfo(`Found ${admins.length} admin(s) in system`);
      console.log('🔍 Admin system check:', admins);
    } catch (error) {
      setDebugInfo('Error checking admin system');
      console.error('❌ Admin system error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 Attempting admin login with:', formData.email);
      const admin = await adminService.authenticateAdmin(formData.email, formData.password);
      console.log('✅ Admin login successful:', admin);
      onSuccess();
    } catch (err) {
      console.error('❌ Admin login failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSystem = () => {
    if (window.confirm('Reset admin system? This will recreate the default admin account.')) {
      adminService.resetAdminSystem();
      setError('');
      setFormData({
        email: '',
        password: ''
      });
      checkAdminSystem();
      alert('Admin system reset! You can now login with the default credentials.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="bg-red-900/50 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Shield className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              SuperAdmin Access
            </h2>
            <p className="text-gray-400">
              Restricted area - Authorized personnel only
            </p>
            {debugInfo && (
              <p className="text-xs text-blue-400 mt-2">
                {debugInfo}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="Enter admin email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <motion.button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Authenticating...
                  </div>
                ) : (
                  'Access Admin Panel'
                )}
              </motion.button>
              
              <motion.button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-red-600 hover:text-red-400 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <motion.button
              onClick={handleResetSystem}
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm mx-auto bg-blue-900/20 px-4 py-2 rounded-lg border border-blue-800/30"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset Admin System</span>
            </motion.button>
            <p className="text-xs text-gray-500 mt-1">
              Use this if login isn't working
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;