import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Mic, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'signin' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    userType: 'client' as 'client' | 'talent'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();

  // Update activeTab when defaultTab changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        userType: 'client'
      });
      setError('');
      setIsLoading(false);
      setShowPassword(false);
      setShowConfirmPassword(false);
      setShowForgotPassword(false);
      setResetEmail('');
      setResetSuccess(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleUserTypeChange = (type: 'client' | 'talent') => {
    setFormData(prev => ({
      ...prev,
      userType: type
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!formData.password) {
      setError('Password is required');
      return false;
    }

    if (activeTab === 'signup') {
      if (!formData.name.trim()) {
        setError('Full name is required');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (activeTab === 'signin') {
        await signIn(formData.email, formData.password, formData.userType);
      } else {
        await signUp(formData.email, formData.password, formData.name, formData.userType);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-20 p-2 rounded-full hover:bg-gray-100"
          type="button"
          aria-label="Close modal"
        >
          <X className="h-6 w-6" />
        </button>

        {activeTab === 'signup' ? (
          // Signup Form
          <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="bg-blue-600 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Mic className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Join VoiceCastingPro
              </h2>
              <p className="text-blue-100">
                Create your account and start your journey
              </p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Type Selection */}
              <div>
                <label className="block text-white font-medium mb-3">
                  I am a:
                </label>
                <div className="flex space-x-4">
                  <label className={`flex items-center cursor-pointer ${
                    formData.userType === 'client' ? 'text-white' : 'text-blue-200'
                  }`}>
                    <input
                      type="radio"
                      name="userType"
                      value="client"
                      checked={formData.userType === 'client'}
                      onChange={() => handleUserTypeChange('client')}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Client (Hiring Voice Talent)</span>
                  </label>
                  <label className={`flex items-center cursor-pointer ${
                    formData.userType === 'talent' ? 'text-white' : 'text-blue-200'
                  }`}>
                    <input
                      type="radio"
                      name="userType"
                      value="talent"
                      checked={formData.userType === 'talent'}
                      onChange={() => handleUserTypeChange('talent')}
                      className="mr-2 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Voice Talent</span>
                  </label>
                </div>
                
                {/* Dynamic text display */}
                <div className="mt-3 text-center">
                  <p className="text-sm text-blue-200">
                    I am a <span className="font-medium text-white">
                      {formData.userType === 'client' ? 'Client' : 'Voice Talent'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-blue-200 text-xs mt-1">
                  Must be at least 6 characters long
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-blue-100">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className="text-white hover:text-blue-200 font-medium underline"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>
        ) : showForgotPassword ? (
          // Forgot Password Form
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-full w-16 h-16 mx-auto mb-4">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Reset Your Password
              </h2>
              <p className="text-gray-600 mt-2">
                Enter your email address and we'll send you a link to reset your password
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {resetSuccess ? (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-6">
                <p className="font-medium">Password reset email sent!</p>
                <p className="text-sm mt-1">Please check your email for instructions to reset your password.</p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSuccess(false);
                    setResetEmail('');
                  }}
                  className="mt-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending Reset Link...
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex items-center justify-center space-x-2 text-blue-600 hover:text-blue-700 font-medium mx-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          // Sign In Form
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-full w-16 h-16 mx-auto mb-4">
                <Mic className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome Back
              </h2>
              <p className="text-gray-600 mt-2">
                Sign in to access your account
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I am a:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.userType === 'client'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="userType"
                      value="client"
                      checked={formData.userType === 'client'}
                      onChange={() => handleUserTypeChange('client')}
                      className="sr-only"
                    />
                    <User className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium">Client</span>
                  </label>
                  <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.userType === 'talent'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="userType"
                      value="talent"
                      checked={formData.userType === 'talent'}
                      onChange={() => handleUserTypeChange('talent')}
                      className="sr-only"
                    />
                    <Mic className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium">Voice Talent</span>
                  </label>
                </div>
                
                {/* Dynamic text display */}
                <div className="mt-3 text-center">
                  <p className="text-sm text-gray-600">
                    I am a <span className="font-medium text-blue-600">
                      {formData.userType === 'client' ? 'Client' : 'Voice Talent'}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;