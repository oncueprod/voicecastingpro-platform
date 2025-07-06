import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, User, Mail, Phone, MapPin, Camera, Save, Edit3, DollarSign, Globe, Mic, Music, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import AudioUpload from './AudioUpload';
import { audioService } from '../services/audioService';
import { talentService } from '../services/talentService';

interface UserProfileProps {
  onBack: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onBack }) => {
  const { user, isClient, isTalent, updateUserAvatar } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '', // Fixed: Changed from user?.email || '' to ''
    phone: user?.phone || '',
    location: user?.location || '',
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
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatar || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [audioUploadError, setAudioUploadError] = useState<string>(''); // Fixed: Added missing state

  // Fixed: Added useEffect to load profile data from API
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const response = await fetch('/api/users/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const profile = data.profile;
          
          setFormData(prev => ({
            ...prev,
            firstName: profile.name?.split(' ')[0] || '',
            lastName: profile.name?.split(' ').slice(1).join(' ') || '',
            email: profile.email || '',
            phone: profile.phone || '',
            location: profile.location || '',
            bio: profile.bio || '',
            website: profile.website || '',
            company: profile.company || '',
            languages: profile.languages || '',
            yearsExperience: profile.yearsExperience || '',
            hourlyRate: profile.hourlyRate || '',
            industry: profile.industry || '',
            paypalEmail: profile.paypalEmail || ''
          }));
          
          if (profile.avatar) {
            setProfileImage(profile.avatar);
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    console.log('Saving profile:', formData);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please log in again');
        return;
      }

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          bio: formData.bio,
          location: formData.location,
          phone: formData.phone,
          website: formData.website,
          company: formData.company,
          languages: formData.languages,
          hourlyRate: formData.hourlyRate,
          industry: formData.industry,
          paypalEmail: formData.paypalEmail
        })
      });

      if (response.ok) {
        alert('Profile updated successfully!');
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        alert(`Failed to update profile: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      alert('Failed to update profile. Please try again.');
    }
  }; // Fixed: Added missing closing brace

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataUrl = reader.result as string;
        setProfileImage(imageDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Fixed: Replaced entire handleCancel function to use API instead of localStorage
  const handleCancel = async () => {
    // Re-fetch profile data from API to reset form
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/users/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const profile = data.profile;
        
        setFormData(prev => ({
          ...prev,
          firstName: profile.name?.split(' ')[0] || '',
          lastName: profile.name?.split(' ').slice(1).join(' ') || '',
          email: profile.email || '',
          phone: profile.phone || '',
          location: profile.location || '',
          bio: profile.bio || '',
          website: profile.website || '',
          company: profile.company || '',
          languages: profile.languages || '',
          yearsExperience: profile.yearsExperience || '',
          hourlyRate: profile.hourlyRate || '',
          industry: profile.industry || '',
          paypalEmail: profile.paypalEmail || ''
        }));
        
        if (profile.avatar) {
          setProfileImage(profile.avatar);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
    
    setIsEditing(false);
  };

  const handleAudioUploadComplete = () => {
    setShowAudioUpload(false);
    alert('Audio demo uploaded successfully!');
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) {
      return;
    }
    
    // Check if we're already at the maximum
    const maxFiles = 5;
    if (audioFiles.length >= maxFiles) {
      setAudioUploadError(`Maximum ${maxFiles} audio files allowed. Please remove some files first.`);
      return;
    }
    
    // Check if adding these would exceed the maximum
    if (audioFiles.length + files.length > maxFiles) {
      setAudioUploadError(`You can only add ${maxFiles - audioFiles.length} more files to stay within the limit of ${maxFiles}.`);
      // Only take as many files as we can add
      files.splice(maxFiles - audioFiles.length);
    }
    
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        setAudioUploadError(`File ${file.name} is too large. Maximum size is 50MB.`);
        continue;
      }
      
      if (!['audio/mpeg', 'audio/wav', 'audio/mp3'].includes(file.type)) {
        setAudioUploadError(`File ${file.name} is not a supported audio format. Please upload MP3 or WAV files.`);
        continue;
      }
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-900 pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <motion.button
            onClick={onBack}
            className="flex items-center space-x-2 text-white/80 hover:text-white mb-6 lg:mb-8 transition-colors"
            whileHover={{ x: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </motion.button>

          {/* Profile Header */}
          <motion.div 
            className="bg-slate-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 border border-gray-700"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">My Profile</h1>
              {!isEditing ? (
                <motion.button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors font-medium text-sm sm:text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Edit3 className="h-5 w-5" />
                  <span>Edit Profile</span>
                </motion.button>
              ) : (
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <motion.button
                    onClick={handleSave}
                    className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors font-medium text-sm sm:text-base"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Save className="h-5 w-5" />
                    <span>Save Changes</span>
                  </motion.button>
                  <motion.button
                    onClick={handleCancel}
                    className="px-4 sm:px-6 py-2 sm:py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-red-600 hover:text-red-400 transition-colors font-medium text-sm sm:text-base"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                </div>
              )}
            </div>

            {/* Profile Picture and Basic Info */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
              <div className="relative mx-auto lg:mx-0">
                <div className="w-32 h-32 bg-slate-700 rounded-2xl flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt={user?.name || "Profile"}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : user?.avatar ? (
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
                  <label className="absolute -bottom-2 -right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors cursor-pointer">
                    <Camera className="h-4 w-4" />
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </div>

              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
            className="bg-slate-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-700 mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Profile Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Contact Information</h3>
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
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
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
                          Specialties
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            name="specialties"
                            value={formData.specialties}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                            placeholder="e.g., Commercial, Narration, Character"
                          />
                        ) : (
                          <p className="text-gray-300">{formData.specialties || 'Not provided'}</p>
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
              <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">
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
            className="bg-slate-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-700 mb-6 sm:mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="flex items-center space-x-3 mb-3 sm:mb-4">
              <DollarSign className="h-6 w-6 text-blue-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-white">Payment Settings</h2>
            </div>
            
            <div className="mb-4 sm:mb-6">
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

            <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-blue-300 mb-3 sm:mb-4">Secure PayPal Integration</h3>
              <p className="text-blue-200 mb-3 sm:mb-4 text-sm sm:text-base">
                All payments are processed securely through PayPal. {isClient 
                  ? 'You can pay with your PayPal balance, bank account, or any major credit/debit card.' 
                  : 'You will receive payments directly to your PayPal account.'}
              </p>
              <div className="space-y-2 sm:space-y-3 text-blue-200 text-xs sm:text-sm">
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
              </div>
            </div>
          </motion.div>

          {/* Voice Demos Section (Talent Only) */}
          {isTalent && (
            <motion.div
              className="bg-slate-800 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-3">
                <div className="flex items-center space-x-3">
                  <Music className="h-6 w-6 text-green-400" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Voice Demos</h2>
                </div>
                
                <motion.button
                  onClick={() => setShowAudioUpload(!showAudioUpload)}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Mic className="h-4 w-4" />
                  <span>{showAudioUpload ? 'Hide Upload' : 'Upload Demo'}</span>
                </motion.button>
              </div>

              {showAudioUpload && user?.id && (
                <AudioUpload
                  userId={user.id}
                  type="demo"
                  title="Upload Demo Reels"
                  maxFiles={5}
                  onUploadComplete={(file) => {
                    // Refresh the audio files list
                    setAudioFiles(audioService.getUserDemos(user.id));
                  }}
                />
              )}

              <div className="space-y-3 sm:space-y-4">
                {/* Demo samples */}
                {user?.id && (
                  <>
                    {/* Get user demos */}
                    {(() => {
                      // Use the state variable if it has data, otherwise fetch from service
                      const userDemos = audioFiles.length > 0 ? audioFiles : audioService.getUserDemos(user.id);
                      
                      // Update state if needed
                      if (audioFiles.length === 0 && userDemos.length > 0) {
                        setAudioFiles(userDemos);
                      }
                      
                      if (userDemos.length > 0) {
                        return userDemos.map((demo, index) => (
                          <div key={index} className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <button
                                  className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
                                >
                                  <Mic className="h-5 w-5" />
                                </button>
                                
                                <div>
                                  <h4 className="text-white font-medium">{demo.name}</h4>
                                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                                    <span>{Math.floor(demo.duration)}s</span>
                                    <span>Demo</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ));
                      }
                      
                      // If no demos, show default samples
                      return (
                        <>
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
                        </>
                      );
                    })()}
                  </>
                )}
              </div>

              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-slate-700 rounded-lg border border-gray-600">
                <p className="text-gray-300 text-xs sm:text-sm">
                  <strong>Pro Tip:</strong> Upload multiple demos showcasing different styles and tones to attract a wider range of clients.
                </p>
              </div>
            </motion.div>
          )}

          {/* Hidden file input for profile image */}
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*" 
            className="hidden" 
            onChange={handleImageUpload}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default UserProfile;