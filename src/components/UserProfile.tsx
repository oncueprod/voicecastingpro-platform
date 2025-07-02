import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, MapPin, Camera, Save, Edit3, DollarSign, Globe, Mic, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import ProtectedRoute from './ProtectedRoute';
import AudioUpload from './AudioUpload';

interface UserProfileProps {
  onBack: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onBack }) => {
  const { user, isClient, isTalent } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: '',
    website: '',
    company: '',
    // Talent specific fields
    voiceTypes: [] as string[],
    languages: '',
    yearsExperience: '',
    hourlyRate: '',
    // Client specific fields
    industry: '',
    projectTypes: [] as string[],
    // PayPal
    paypalEmail: ''
  });

  // Load saved profile data if available
  useEffect(() => {
    const savedProfile = isClient 
      ? localStorage.getItem('client_profile')
      : localStorage.getItem('talent_profile');
    
    if (savedProfile) {
      try {
        const profileData = JSON.parse(savedProfile);
        setFormData(prev => ({
          ...prev,
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          email: profileData.email || user?.email || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          bio: profileData.bio || '',
          website: profileData.website || '',
          company: profileData.company || '',
          languages: profileData.languages || '',
          yearsExperience: profileData.yearsExperience || '',
          hourlyRate: profileData.hourlyRate || '',
          industry: profileData.industry || '',
          paypalEmail: profileData.paypalEmail || ''
        }));
      } catch (error) {
        console.error('Failed to parse saved profile:', error);
      }
    }
  }, [isClient, isTalent, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      console.log('Uploading avatar:', file.name);
      const result = await userAPI.uploadAvatar(file);
      console.log('Upload successful:', result);
      alert('Profile image updated successfully!');
      // You might want to update the user context or reload the page here
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    try {
      await userAPI.changePassword(passwordData.currentPassword, passwordData.newPassword);
      alert('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordChange(false);
    } catch (error) {
      console.error('Password change failed:', error);
      alert('Failed to change password. Please check your current password and try again.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await userAPI.deleteAccount();
      alert('Account deleted successfully. You will be redirected to the home page.');
      // Clear auth data and redirect
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    } catch (error) {
      console.error('Account deletion failed:', error);
      alert('Failed to delete account. Please try again.');
    }
  };

  const handleSave = () => {
    // In production, this would update the user profile via API
    console.log('Saving profile:', formData);
    
    // Save to localStorage for demo
    if (isClient) {
      localStorage.setItem('client_profile', JSON.stringify(formData));
    } else {
      localStorage.setItem('talent_profile', JSON.stringify(formData));
    }
    
    setIsEditing(false);
    // Show success message
    alert('Profile updated successfully!');
  };

  const handleCancel = () => {
    // Reset form data to original values
    const savedProfile = isClient 
      ? localStorage.getItem('client_profile')
      : localStorage.getItem('talent_profile');
    
    if (savedProfile) {
      try {
        const profileData = JSON.parse(savedProfile);
        setFormData(prev => ({
          ...prev,
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          email: profileData.email || user?.email || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          bio: profileData.bio || '',
          website: profileData.website || '',
          company: profileData.company || '',
          languages: profileData.languages || '',
          yearsExperience: profileData.yearsExperience || '',
          hourlyRate: profileData.hourlyRate || '',
          industry: profileData.industry || '',
          paypalEmail: profileData.paypalEmail || ''
        }));
      } catch (error) {
        console.error('Failed to parse saved profile:', error);
      }
    }
    
    setIsEditing(false);
  };

  const handleAudioUploadComplete = () => {
    setShowAudioUpload(false);
    alert('Audio demo uploaded successfully!');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900 pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <motion.a
            href="/"
            className="flex items-center space-x-2 text-white/80 hover:text-white mb-8 transition-colors"
            whileHover={{ x: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </motion.a>

          {/* Profile Header */}
          <motion.div 
            className="bg-slate-800 rounded-2xl p-8 mb-8 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-white">My Profile</h1>
              {!isEditing ? (
                <motion.button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Edit3 className="h-5 w-5" />
                  <span>Edit Profile</span>
                </motion.button>
              ) : (
                <div className="flex space-x-3">
                  <motion.button
                    onClick={handleSave}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Save className="h-5 w-5" />
                    <span>Save Changes</span>
                  </motion.button>
                  <motion.button
                    onClick={handleCancel}
                    className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-red-600 hover:text-red-400 transition-colors font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              )}
            </div>

            {/* Profile Picture and Basic Info */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
              <div className="relative">
                <div className="w-32 h-32 bg-slate-700 rounded-2xl flex items-center justify-center">
                  {user?.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    <User className="h-16 w-16 text-gray-400" />
                  )}
                </div>
                {isEditing && (
                  <>
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <button 
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={isUploading}
                      className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors disabled:opacity-50"
                    >
                      {isUploading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                  </>
                )}
              </div>

              <div className="flex-1">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="Enter your first name"
                      />
                    ) : (
                      <p className="text-white text-lg">{formData.firstName || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="Enter your last name"
                      />
                    ) : (
                      <p className="text-white text-lg">{formData.lastName || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <p className="text-white text-lg flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{formData.email}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Account Type
                    </label>
                    <p className="text-white text-lg">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        isClient ? 'bg-blue-900/50 text-blue-400' : 'bg-green-900/50 text-green-400'
                      }`}>
                        {isClient ? 'Client' : 'Voice Talent'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Profile Details */}
          <motion.div 
            className="bg-slate-800 rounded-2xl p-8 border border-gray-700 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Profile Details</h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="Enter phone number"
                      />
                    ) : (
                      <p className="text-gray-300">{formData.phone || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Location
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="City, Country"
                      />
                    ) : (
                      <p className="text-gray-300">{formData.location || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Website
                    </label>
                    {isEditing ? (
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="https://yourwebsite.com"
                      />
                    ) : (
                      <p className="text-gray-300">{formData.website || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {isClient ? 'Business Information' : 'Professional Information'}
                </h3>
                <div className="space-y-4">
                  {isClient ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Company
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="company"
                            value={formData.company}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                            placeholder="Company name"
                          />
                        ) : (
                          <p className="text-gray-300">{formData.company || 'Not provided'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Industry
                        </label>
                        {isEditing ? (
                          <select
                            name="industry"
                            value={formData.industry}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                          >
                            <option value="">Select industry</option>
                            <option value="technology">Technology</option>
                            <option value="media">Media & Entertainment</option>
                            <option value="education">Education</option>
                            <option value="marketing">Marketing & Advertising</option>
                            <option value="healthcare">Healthcare</option>
                            <option value="finance">Finance & Banking</option>
                            <option value="retail">Retail & E-commerce</option>
                            <option value="gaming">Gaming</option>
                            <option value="nonprofit">Non-profit</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <p className="text-gray-300">{formData.industry || 'Not provided'}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Languages
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="languages"
                            value={formData.languages}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                            placeholder="e.g., English (Native), Spanish (Fluent)"
                          />
                        ) : (
                          <p className="text-gray-300">{formData.languages || 'Not provided'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Years of Experience
                        </label>
                        {isEditing ? (
                          <select
                            name="yearsExperience"
                            value={formData.yearsExperience}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                          >
                            <option value="">Select experience</option>
                            <option value="0-1">0-1 years</option>
                            <option value="2-5">2-5 years</option>
                            <option value="6-10">6-10 years</option>
                            <option value="10+">10+ years</option>
                          </select>
                        ) : (
                          <p className="text-gray-300">{formData.yearsExperience || 'Not provided'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Hourly Rate (USD)
                        </label>
                        {isEditing ? (
                          <select
                            name="hourlyRate"
                            value={formData.hourlyRate}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                          >
                            <option value="">Select rate range</option>
                            <option value="25-50">$25 - $50 per hour</option>
                            <option value="50-75">$50 - $75 per hour</option>
                            <option value="75-100">$75 - $100 per hour</option>
                            <option value="100-150">$100 - $150 per hour</option>
                            <option value="150+">$150+ per hour</option>
                          </select>
                        ) : (
                          <p className="text-gray-300">{formData.hourlyRate || 'Not provided'}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-white mb-4">
                {isClient ? 'About Your Business' : 'Professional Bio'}
              </h3>
              {isEditing ? (
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder={isClient ? 
                    "Tell us about your business and the types of voice over projects you typically work on..." :
                    "Describe your voice over experience, specialties, and what makes you unique..."
                  }
                />
              ) : (
                <p className="text-gray-300 leading-relaxed">
                  {formData.bio || 'No bio provided yet.'}
                </p>
              )}
            </div>
          </motion.div>

          {/* PayPal Integration Section */}
          <motion.div 
            className="bg-slate-800 rounded-2xl p-8 border border-gray-700 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center space-x-3 mb-4">
              <DollarSign className="h-6 w-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Payment Settings</h2>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                PayPal Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="paypalEmail"
                  value={formData.paypalEmail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="your-paypal@email.com"
                />
              ) : (
                <p className="text-gray-300">{formData.paypalEmail || 'Not provided'}</p>
              )}
              <p className="text-sm text-blue-400 mt-2">
                {isClient 
                  ? 'This email will be used for secure escrow payments to voice talent.' 
                  : 'This email will be used to receive payments from clients.'}
              </p>
            </div>

            <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-300 mb-4">Secure PayPal Integration</h3>
              <p className="text-blue-200 mb-4">
                All payments are processed securely through PayPal. {isClient 
                  ? 'You can pay with your PayPal balance, bank account, or any major credit/debit card.' 
                  : 'You will receive payments directly to your PayPal account.'}
              </p>
              <div className="space-y-3 text-blue-200 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>{isClient 
                    ? 'Secure escrow payments protect both parties' 
                    : 'Get paid securely for your voice work'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>{isClient 
                    ? 'Funds are released only when you approve the work' 
                    : 'Funds are released to you when the client approves your work'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Platform fee: 5% of project value</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Security Settings Section */}
          <motion.div 
            className="bg-slate-800 rounded-2xl p-8 border border-gray-700 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <h2 className="text-2xl font-bold text-white">Security Settings</h2>
            </div>

            {/* Password Change Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Change Password</h3>
                <motion.button
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {showPasswordChange ? 'Cancel' : 'Change Password'}
                </motion.button>
              </div>

              {showPasswordChange && (
                <div className="bg-slate-700 rounded-lg p-6 border border-gray-600">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="Enter your current password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="Enter new password (min 6 characters)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="Confirm your new password"
                      />
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <motion.button
                        onClick={handlePasswordChange}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <span>Update Password</span>
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setShowPasswordChange(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-gray-500 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Account Deletion Section */}
            <div className="border-t border-gray-600 pt-8">
              <h3 className="text-lg font-semibold text-white mb-4">Delete Account</h3>
              <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-6">
                <h4 className="text-red-400 font-semibold mb-3">Danger Zone</h4>
                <p className="text-red-200 mb-4">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <div className="space-y-3 text-red-200 text-sm mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span>All profile information will be permanently deleted</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span>All project history and messages will be lost</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span>This action is irreversible</span>
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <motion.button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Delete My Account
                  </motion.button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-red-300 font-medium">
                      Are you absolutely sure? This will permanently delete your account and cannot be undone.
                    </p>
                    <div className="flex space-x-3">
                      <motion.button
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Yes, Delete Forever
                      </motion.button>
                      <motion.button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-gray-500 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Voice Demos Section (Talent Only) */}
          {isTalent && (
            <motion.div 
              className="bg-slate-800 rounded-2xl p-8 border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Music className="h-6 w-6 text-green-400" />
                  <h2 className="text-2xl font-bold text-white">Voice Demos</h2>
                </div>
                
                <motion.button
                  onClick={() => setShowAudioUpload(!showAudioUpload)}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Mic className="h-4 w-4" />
                  <span>{showAudioUpload ? 'Hide Upload' : 'Upload Demo'}</span>
                </motion.button>
              </div>

              {showAudioUpload && (
                <div className="mb-8">
                  <AudioUpload
                    userId={user?.id || 'demo_user'}
                    type="demo"
                    title="Upload Voice Demos"
                    maxFiles={10}
                    onUploadComplete={handleAudioUploadComplete}
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                      
                      <div>
                        <h4 className="text-white font-medium">Commercial Demo</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>45s</span>
                          <span>Commercial</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                      
                      <div>
                        <h4 className="text-white font-medium">Narration Sample</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>60s</span>
                          <span>Narration</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-700 rounded-lg border border-gray-600">
                <p className="text-gray-300 text-sm">
                  <strong>Pro Tip:</strong> Upload multiple demos showcasing different styles and tones to attract a wider range of clients.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default UserProfile;