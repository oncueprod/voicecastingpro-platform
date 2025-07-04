import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Upload, X, Play, Pause, Save, User, Mail, Globe, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { talentService } from '../services/talentService';

interface TalentProfileSetupProps {
  onBack: () => void;
  onComplete: () => void;
}

const TalentProfileSetup: React.FC<TalentProfileSetupProps> = ({ onBack, onComplete }) => {
  const { user, updateUserAvatar } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    password: '',
    profilePhoto: null as File | null,
    bio: '',
    languages: '',
    specialties: '',
    hourlyRate: '',
    paypalEmail: ''
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(user?.avatar || null);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing profile data if available
  useEffect(() => {
    const savedProfile = localStorage.getItem('talent_profile');
    if (savedProfile) {
      try {
        const profileData = JSON.parse(savedProfile);
        setFormData(prev => ({
          ...prev,
          firstName: profileData.firstName || '',
          lastName: profileData.lastName || '',
          email: profileData.email || user?.email || '',
          bio: profileData.bio || '',
          languages: profileData.languages || '',
          specialties: profileData.specialties || '',
          hourlyRate: profileData.hourlyRate || '',
          paypalEmail: profileData.paypalEmail || ''
        }));
        
        if (profileData.profilePhoto) {
          setProfilePhotoPreview(profileData.profilePhoto);
        }
      } catch (error) {
        console.error('Failed to parse saved profile:', error);
      }
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        alert('Please upload a JPG, PNG, or GIF image');
        return;
      }

      setFormData(prev => ({ ...prev, profilePhoto: file }));
      
      const reader = new FileReader();
      reader.onload = () => setProfilePhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 50MB.`);
        continue;
      }
      
      if (!['audio/mpeg', 'audio/wav', 'audio/mp3'].includes(file.type)) {
        alert(`File ${file.name} is not a supported audio format. Please upload MP3 or WAV files.`);
        continue;
      }
    }
    
    const validFiles = files.filter(file => 
      file.size <= 50 * 1024 * 1024 && 
      ['audio/mpeg', 'audio/wav', 'audio/mp3'].includes(file.type)
    );
    
    setAudioFiles(prev => [...prev, ...validFiles]);
  };

  const removeAudioFile = (index: number) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index));
    if (playingIndex === index) {
      setPlayingIndex(null);
    }
  };

  const togglePlayAudio = (index: number) => {
    if (playingIndex === index) {
      setPlayingIndex(null);
    } else {
      setPlayingIndex(index);
      // In a real app, you'd play the actual audio file here
      setTimeout(() => setPlayingIndex(null), 3000); // Simulate 3-second playback
    }
  };

  const validateStep1 = () => {
    if (!formData.firstName.trim()) {
      alert('Please enter your first name');
      return false;
    }
    if (!formData.lastName.trim()) {
      alert('Please enter your last name');
      return false;
    }
    if (!formData.email.trim()) {
      alert('Please enter your email address');
      return false;
    }
    if (!formData.bio.trim()) {
      alert('Please enter your professional bio');
      return false;
    }
    if (!formData.languages.trim()) {
      alert('Please enter your languages');
      return false;
    }
    if (!formData.specialties.trim()) {
      alert('Please enter your specialties');
      return false;
    }
    if (!formData.hourlyRate) {
      alert('Please select your hourly rate range');
      return false;
    }
    if (!formData.paypalEmail.trim()) {
      alert('Please enter your PayPal email address');
      return false;
    }
    return true;
  };

  const handleContinue = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Save profile data
      const profileData = {
        ...formData,
        audioFiles: audioFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
        profilePhoto: profilePhotoPreview,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('talent_profile', JSON.stringify(profileData));
      
      // Update user avatar in auth context
      if (profilePhotoPreview) {
        updateUserAvatar(profilePhotoPreview);
      }
      
      // Create or update talent profile in talent service
      if (user) {
        const talentProfile = {
          id: `talent_user_${user.id}`,
          userId: user.id,
          name: `${formData.firstName} ${formData.lastName}`,
          title: formData.specialties || 'Voice Talent',
          location: 'Location not specified',
          rating: 5.0,
          reviews: 0,
          responseTime: '1 hour',
          priceRange: formData.hourlyRate || '$50-100',
          image: profilePhotoPreview || user.avatar || 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
          specialties: formData.specialties.split(',').map(s => s.trim()),
          languages: formData.languages.split(',').map(l => l.trim()),
          badge: 'New Talent',
          bio: formData.bio,
          experience: '1+ years',
          completedProjects: 0,
          repeatClients: 0,
          equipment: ['Professional Equipment'],
          demos: [],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Check if profile already exists
        const existingProfile = talentService.getTalentProfile(talentProfile.id);
        if (existingProfile) {
          talentService.updateTalentProfile(talentProfile.id, talentProfile);
        } else {
          talentService.updateTalentProfile(talentProfile.id, talentProfile);
        }
      }
      
      alert('Profile created successfully! Welcome to VoiceCastingPro!');
      onComplete();
      
    } catch (error) {
      alert('Failed to create profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hourlyRates = [
    { value: '25-50', label: '$25 - $50 per hour' },
    { value: '50-75', label: '$50 - $75 per hour' },
    { value: '75-100', label: '$75 - $100 per hour' },
    { value: '100-150', label: '$100 - $150 per hour' },
    { value: '150+', label: '$150+ per hour' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/80 hover:text-white mb-8 transition-colors"
          whileHover={{ x: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </motion.button>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-600'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-white/80">
            <span>Create Profile</span>
            <span>Upload Demos</span>
          </div>
        </div>

        {currentStep === 1 && (
          <motion.div
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-white mb-2">Create Your Profile</h1>
            <p className="text-white/80 mb-8">Build your professional voice talent profile to showcase your skills and experience.</p>

            <div className="space-y-6">
              {/* Name Fields */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 backdrop-blur-sm"
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 backdrop-blur-sm"
                    placeholder="Enter your last name"
                    required
                  />
                </div>
              </div>

              {/* Email and Password */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 backdrop-blur-sm"
                    placeholder="your@email.com"
                    required
                    readOnly={!!user?.email}
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 backdrop-blur-sm"
                    placeholder="Create a secure password"
                    required={!user}
                    disabled={!!user}
                  />
                  {user && (
                    <p className="text-white/60 text-xs mt-1">
                      Password not required - you're already signed in
                    </p>
                  )}
                </div>
              </div>

              {/* Profile Photo */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Profile Photo (Optional)
                </label>
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border border-white/20 overflow-hidden">
                    {profilePhotoPreview ? (
                      <img 
                        src={profilePhotoPreview} 
                        alt="Profile preview" 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-12 w-12 text-white/60" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      ref={fileInputRef}
                    />
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                    >
                      Choose File
                    </button>
                    <p className="text-white/60 text-sm mt-2">
                      Upload a professional headshot (JPG, PNG, GIF - max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Professional Bio */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Professional Bio *
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 backdrop-blur-sm"
                  placeholder="Tell clients about your experience, expertise, and what makes you unique as a voice talent..."
                  required
                />
              </div>

              {/* Languages and Specialties */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">
                    Languages *
                  </label>
                  <input
                    type="text"
                    name="languages"
                    value={formData.languages}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 backdrop-blur-sm"
                    placeholder="e.g., English (Native), Spanish (Fluent)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">
                    Specialties *
                  </label>
                  <input
                    type="text"
                    name="specialties"
                    value={formData.specialties}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 backdrop-blur-sm"
                    placeholder="e.g., Commercial, Narration, Character"
                    required
                  />
                </div>
              </div>

              {/* Hourly Rate */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Hourly Rate Range *
                </label>
                <select
                  name="hourlyRate"
                  value={formData.hourlyRate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white backdrop-blur-sm"
                  required
                >
                  <option value="">Select your rate range</option>
                  {hourlyRates.map(rate => (
                    <option key={rate.value} value={rate.value} className="bg-slate-800">
                      {rate.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* PayPal Email */}
              <div>
                <label className="block text-white font-medium mb-2">
                  PayPal Email for Payments *
                </label>
                <input
                  type="email"
                  name="paypalEmail"
                  value={formData.paypalEmail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 backdrop-blur-sm"
                  placeholder="your-paypal@email.com"
                  required
                />
                <p className="text-yellow-300 text-sm mt-2">
                  <strong>Important:</strong> Enter the email address associated with your PayPal account. This is where you'll receive payments from clients.
                </p>
              </div>

              {/* Continue Button */}
              <div className="pt-6">
                <motion.button
                  onClick={handleContinue}
                  className="w-full bg-white text-blue-800 py-4 rounded-lg hover:bg-blue-50 transition-all font-semibold text-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue to Demo Upload
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-white mb-2">Upload Your Voice Demos</h1>
            <p className="text-white/80 mb-8">Showcase your voice with professional demo reels that highlight your range and expertise.</p>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center mb-8 hover:border-white/50 transition-colors">
              <Upload className="h-12 w-12 text-white/60 mx-auto mb-4" />
              <p className="text-white mb-2">
                Drop your audio files here or{' '}
                <label className="text-blue-300 hover:text-blue-200 cursor-pointer underline">
                  browse
                  <input
                    type="file"
                    multiple
                    accept="audio/mp3,audio/wav,audio/mpeg"
                    onChange={handleAudioUpload}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-white/60 text-sm">
                Supported formats: MP3, WAV (Max 50MB per file)
              </p>
            </div>

            {/* Uploaded Files */}
            {audioFiles.length > 0 && (
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold text-white">Your Demo Reels ({audioFiles.length})</h3>
                {audioFiles.map((file, index) => (
                  <div key={index} className="bg-white/10 rounded-lg p-4 border border-white/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <motion.button
                          onClick={() => togglePlayAudio(index)}
                          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {playingIndex === index ? (
                            <Pause className="h-5 w-5" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </motion.button>
                        
                        <div>
                          <h4 className="text-white font-medium">{file.name}</h4>
                          <p className="text-white/60 text-sm">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => removeAudioFile(index)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <motion.button
                onClick={() => setCurrentStep(1)}
                className="flex-1 border border-white/30 text-white py-4 rounded-lg hover:border-white hover:bg-white/10 transition-colors font-semibold text-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Back to Profile
              </motion.button>
              
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-white text-blue-800 py-4 rounded-lg hover:bg-blue-50 transition-all font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800"></div>
                    <span>Creating Profile...</span>
                  </div>
                ) : (
                  'Complete Profile Setup'
                )}
              </motion.button>
            </div>

            {/* Skip Option */}
            <div className="text-center mt-6">
              <button
                onClick={handleSubmit}
                className="text-white/60 hover:text-white text-sm underline"
              >
                Skip demo upload for now (you can add them later)
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TalentProfileSetup;