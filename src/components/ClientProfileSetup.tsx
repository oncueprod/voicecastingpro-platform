import React, { useState } from 'react';
import { ArrowLeft, Upload, X, Save, User, Mail, Globe, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface ClientProfileSetupProps {
  onBack: () => void;
  onComplete: () => void;
}

const ClientProfileSetup: React.FC<ClientProfileSetupProps> = ({ onBack, onComplete }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    password: '',
    profilePhoto: null as File | null,
    company: '',
    industry: '',
    website: '',
    paypalEmail: ''
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validateForm = () => {
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
    if (!formData.paypalEmail.trim()) {
      alert('Please enter your PayPal email address for escrow payments');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, this would save to your backend
      const profileData = {
        ...formData,
        profilePhoto: profilePhotoPreview,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('client_profile', JSON.stringify(profileData));
      
      alert('Profile created successfully! Welcome to VoiceCastingPro!');
      onComplete();
      
    } catch (error) {
      alert('Failed to create profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const industries = [
    { value: 'technology', label: 'Technology' },
    { value: 'media', label: 'Media & Entertainment' },
    { value: 'education', label: 'Education' },
    { value: 'marketing', label: 'Marketing & Advertising' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance & Banking' },
    { value: 'retail', label: 'Retail & E-commerce' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'nonprofit', label: 'Non-profit' },
    { value: 'other', label: 'Other' }
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

        <motion.div
          className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Client Profile</h1>
          <p className="text-white/80 mb-8">Set up your profile to start hiring voice talent for your projects.</p>

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
                  required
                />
              </div>
            </div>

            {/* Profile Photo */}
            <div>
              <label className="block text-white font-medium mb-2">
                Profile Photo (Optional)
              </label>
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
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
                  <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors">
                    Choose File
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-white/60 text-sm mt-2">
                    Upload a professional headshot (JPG, PNG, GIF - max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Company and Industry */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-medium mb-2">
                  Company (Optional)
                </label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 backdrop-blur-sm"
                  placeholder="Your company name"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">
                  Industry (Optional)
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white backdrop-blur-sm"
                >
                  <option value="" className="bg-slate-800">Select your industry</option>
                  {industries.map(industry => (
                    <option key={industry.value} value={industry.value} className="bg-slate-800">
                      {industry.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="block text-white font-medium mb-2">
                Website (Optional)
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-white placeholder-white/60 backdrop-blur-sm"
                placeholder="https://yourwebsite.com"
              />
            </div>

            {/* PayPal Email */}
            <div>
              <label className="block text-white font-medium mb-2">
                PayPal Email for Escrow Payments *
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
                <strong>Important:</strong> Enter the email address associated with your PayPal account. This will be used for secure escrow payments to voice talent.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-white text-blue-800 py-4 rounded-lg hover:bg-blue-50 transition-all font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientProfileSetup;