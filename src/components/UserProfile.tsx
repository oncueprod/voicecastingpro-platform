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

// Image compression helper
const compressImage = (file: File, maxWidth: number = 300, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Storage quota checker
const checkStorageQuota = (): { available: boolean; usage: number; limit: number } => {
  let usage = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      usage += localStorage.getItem(key)?.length || 0;
    }
  }
  
  const limit = 5 * 1024 * 1024; // 5MB typical limit
  return {
    available: usage < limit * 0.9, // 90% threshold
    usage,
    limit
  };
};

const UserProfile: React.FC<UserProfileProps> = ({ onBack }) => {
  const { user, isClient, isTalent, updateUserAvatar } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    bio: '',
    website: '',
    company: '',
    specialties: '',
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
          email: user?.email || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          bio: profileData.bio || '',
          website: profileData.website || '',
          company: profileData.company || '',
          specialties: profileData.specialties || '',
          languages: profileData.languages || '',
          yearsExperience: profileData.yearsExperience || '',
          hourlyRate: profileData.hourlyRate || '',
          industry: profileData.industry || '',
          paypalEmail: profileData.paypalEmail || ''
        }));
        
        if (profileData.profilePhoto) {
          setProfileImage(profileData.profilePhoto);
        } else if (user?.avatar) {
          setProfileImage(user.avatar);
        }
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Check file size
        if (file.size > 5 * 1024 * 1024) {
          alert('Image is too large. Please choose an image smaller than 5MB.');
          return;
        }
        
        // Compress the image
        const compressedImage = await compressImage(file);
        setProfileImage(compressedImage);
        
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try a different image.');
      }
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSave = () => {
    try {
      console.log('Saving profile:', formData);
      
      // Check storage quota before saving
      const quota = checkStorageQuota();
      if (!quota.available) {
        alert(`Storage quota exceeded (${Math.round(quota.usage / 1024)}KB used). Please clear browser data or use a smaller profile image.`);
        return;
      }
      
      const profileData = {
        ...formData,
        profilePhoto: profileImage
      };
      
      // Try to estimate size before saving
      const dataSize = JSON.stringify(profileData).length;
      if (dataSize > 1024 * 1024) { // 1MB
        alert('Profile data is too large. Please use a smaller profile image.');
        return;
      }
      
      // Save to localStorage for demo
      if (isClient) {
        localStorage.setItem('client_profile', JSON.stringify(profileData));
        console.log('Client profile saved successfully');
      } else {
        localStorage.setItem('talent_profile', JSON.stringify(profileData));
        
        // Also update talent profile in talent service if user is talent
        if (user && isTalent) {
          const talentId = `talent_user_${user.id}`;
          const existingProfile = talentService.getTalentProfile(talentId);
          
          if (existingProfile) {
            talentService.updateTalentProfile(talentId, {
              ...existingProfile,
              name: `${formData.firstName} ${formData.lastName}`,
              title: formData.specialties || 'Voice Talent',
              bio: formData.bio,
              image: profileImage || existingProfile.image,
              languages: formData.languages ? formData.languages.split(',').map(l => l.trim()) : existingProfile.languages,
              specialties: formData.specialties ? formData.specialties.split(',').map(s => s.trim()) : existingProfile.specialties,
              priceRange: formData.hourlyRate || existingProfile.priceRange,
              updatedAt: new Date()
            });
          } else {
            // Create new talent profile
            const newProfile = {
              id: talentId,
              userId: user.id,
              name: `${formData.firstName} ${formData.lastName}`,
              title: formData.specialties || 'Voice Talent',
              location: formData.location || 'Location not specified',
              rating: 5.0,
              reviews: 0,
              responseTime: '1 hour',
              priceRange: formData.hourlyRate || '$50-100',
              image: profileImage || user.avatar || 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
              specialties: formData.specialties ? formData.specialties.split(',').map(s => s.trim()) : ['Commercial', 'Narration'],
              languages: formData.languages ? formData.languages.split(',').map(l => l.trim()) : ['English'],
              badge: 'New Talent',
              bio: formData.bio || 'Professional voice talent',
              experience: formData.yearsExperience || '1+ years',
              completedProjects: 0,
              repeatClients: 0,
              equipment: ['Professional Equipment'],
              demos: [],
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            talentService.updateTalentProfile(newProfile.id, newProfile);
          }
        }
        console.log('Talent profile saved successfully');
      }
      
      // Update avatar in auth context
      if (profileImage) {
        updateUserAvatar(profileImage);
      }
      
      setIsEditing(false);
      alert('Profile updated successfully!');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      
      if (error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded! Please:\n1. Clear browser data, or\n2. Use a smaller profile image, or\n3. Contact support for help.');
      } else {
        alert('Failed to save profile. Please try again.');
      }
    }
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
          email: user?.email || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          bio: profileData.bio || '',
          website: profileData.website || '',
          company: profileData.company || '',
          specialties: profileData.specialties || '',
          languages: profileData.languages || '',
          yearsExperience: profileData.yearsExperience || '',
          hourlyRate: profileData.hourlyRate || '',
          industry: profileData.industry || '',
          paypalEmail: profileData.paypalEmail || ''
        }));
        
        if (profileData.profilePhoto) {
          setProfileImage(profileData.profilePhoto);
        } else if (user?.avatar) {
          setProfileImage(user.avatar);
        }
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

          {/* Storage Warning */}
          {(() => {
            const quota = checkStorageQuota();
            if (!quota.available) {
              return (
                <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-6">
                  <p className="text-yellow-300 text-sm">
                    ⚠️ <strong>Storage Warning:</strong> Browser storage is nearly full ({Math.round(quota.usage / 1024)}KB used). 
                    Clear browser data or use smaller images to avoid save issues.
                  </p>
                </div>
              );
            }
            return null;
          })()}

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
                      <span>{user?.email}</span>
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

          {/* Rest of the component remains the same... */}
          {/* (Profile Details, PayPal Integration, Voice Demos sections) */}
          
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