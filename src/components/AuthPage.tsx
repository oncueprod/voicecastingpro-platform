import React, { useState } from 'react';
import { ArrowLeft, Mail, Lock, User, Mic, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface AuthPageProps {
  type: 'signin' | 'signup';
  onBack: () => void;
  onSuccess: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ type, onBack, onSuccess }) => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleUserTypeChange = (userType: 'client' | 'talent') => {
    setFormData(prev => ({
      ...prev,
      userType
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

    if (type === 'signup') {
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
      if (type === 'signin') {
        await signIn(formData.email, formData.password, formData.userType);
      } else {
        await signUp(formData.email, formData.password, formData.name, formData.userType);
      }
      onSuccess();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-40 h-40 bg-white/5 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute bottom-20 right-10 w-60 h-60 bg-white/5 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-400/5 rounded-full blur-[120px] opacity-30"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Back Button */}
          <motion.button
            onClick={onBack}
            className="flex items-center space-x-2 text-white/80 hover:text-white mb-8 transition-colors"
            whileHover={{ x: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Home</span>
          </motion.button>

          {showForgotPassword ? (
            // Forgot Password Form
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-center mb-8">
                <div className="bg-blue-600/50 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
                  <Lock className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Reset Your Password
                </h2>
                <p className="text-blue-100 mt-2">
                  Enter your email address and we'll send you a link to reset your password
                </p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {resetSuccess ? (
                <div className="bg-green-500/20 border border-green-400 text-green-100 px-4 py-3 rounded-lg mb-6">
                  <p className="font-medium">Password reset email sent!</p>
                  <p className="text-sm mt-1">Please check your email for instructions to reset your password.</p>
                  <motion.button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetSuccess(false);
                      setResetEmail('');
                    }}
                    className="mt-4 w-full bg-white text-blue-800 py-3 rounded-lg transition-all duration-300 font-semibold hover:bg-blue-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Return to Sign In
                  </motion.button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200 backdrop-blur-sm"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-white text-blue-800 py-3 rounded-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800 mr-2"></div>
                        Sending Reset Link...
                      </div>
                    ) : (
                      'Send Reset Link'
                    )}
                  </motion.button>

                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex items-center justify-center space-x-2 text-white hover:text-blue-200 font-medium mx-auto"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : type === 'signup' ? (
            // Signup Form
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-center mb-8">
                <div className="bg-blue-600/50 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center backdrop-blur-sm">
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
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.userType === 'client'
                        ? 'border-white bg-white/20'
                        : 'border-white/30 hover:border-white/50'
                    }`}>
                      <input
                        type="radio"
                        name="userType"
                        value="client"
                        checked={formData.userType === 'client'}
                        onChange={() => handleUserTypeChange('client')}
                        className="sr-only"
                      />
                      <User className="h-8 w-8 text-white mb-2" />
                      <span className="text-white font-medium">Client</span>
                      <span className="text-blue-200 text-xs text-center">Hiring Voice Talent</span>
                    </label>
                    <label className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.userType === 'talent'
                        ? 'border-white bg-white/20'
                        : 'border-white/30 hover:border-white/50'
                    }`}>
                      <input
                        type="radio"
                        name="userType"
                        value="talent"
                        checked={formData.userType === 'talent'}
                        onChange={() => handleUserTypeChange('talent')}
                        className="sr-only"
                      />
                      <Mic className="h-8 w-8 text-white mb-2" />
                      <span className="text-white font-medium">Voice Talent</span>
                      <span className="text-blue-200 text-xs text-center">Professional Artist</span>
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
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200 backdrop-blur-sm"
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
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200 backdrop-blur-sm"
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
                      className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200 backdrop-blur-sm"
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
                      className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200 backdrop-blur-sm"
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
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-white text-blue-800 py-3 rounded-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800 mr-2"></div>
                      Creating Account...
                    </div>
                  ) : (
                    'Create Account'
                  )}
                </motion.button>
              </form>

              {/* Sign In Link */}
              <div className="mt-6 text-center">
                <p className="text-blue-100">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onBack()}
                    className="text-white hover:text-blue-200 font-medium underline"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </div>
          ) : (
            // Sign In Form
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="text-center mb-8">
                <div className="bg-blue-600/50 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center backdrop-blur-sm">
                  <Mic className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Welcome Back
                </h2>
                <p className="text-blue-100 mt-2">
                  Sign in to access your account
                </p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* User Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    I am a:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.userType === 'client'
                        ? 'border-white bg-white/20'
                        : 'border-white/30 hover:border-white/50'
                    }`}>
                      <input
                        type="radio"
                        name="userType"
                        value="client"
                        checked={formData.userType === 'client'}
                        onChange={() => handleUserTypeChange('client')}
                        className="sr-only"
                      />
                      <User className="h-5 w-5 text-white mr-2" />
                      <span className="text-sm font-medium text-white">Client</span>
                    </label>
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.userType === 'talent'
                        ? 'border-white bg-white/20'
                        : 'border-white/30 hover:border-white/50'
                    }`}>
                      <input
                        type="radio"
                        name="userType"
                        value="talent"
                        checked={formData.userType === 'talent'}
                        onChange={() => handleUserTypeChange('talent')}
                        className="sr-only"
                      />
                      <Mic className="h-5 w-5 text-white mr-2" />
                      <span className="text-sm font-medium text-white">Voice Talent</span>
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

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200 backdrop-blur-sm"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-blue-200 backdrop-blur-sm"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-blue-200 hover:text-white font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-white text-blue-800 py-3 rounded-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800 mr-2"></div>
                      Signing In...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </motion.button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-blue-100">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => onBack()}
                    className="text-white hover:text-blue-200 font-medium underline"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;