import React, { useState, useEffect } from 'react';
import { Upload, FileAudio, DollarSign, Calendar, Globe, Mic, ArrowLeft, X } from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from './ProtectedRoute';

interface PostProjectProps {
  onBack: () => void;
}

const PostProject: React.FC<PostProjectProps> = ({ onBack }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    scriptLength: '',
    voiceStyle: '',
    gender: '',
    age: '',
    language: '',
    budget: '',
    deadline: '',
    projectType: 'one-time',
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'Commercial',
    'Audiobook',
    'Video Games',
    'Documentary',
    'E-Learning',
    'IVR/Phone System',
    'Podcast',
    'Animation',
    'Corporate',
    'Other',
  ];

  const voiceStyles = [
    'Conversational',
    'Professional',
    'Warm & Friendly',
    'Authoritative',
    'Energetic',
    'Calming',
    'Dramatic',
    'Humorous',
    'Sophisticated',
    'Character Voice',
  ];

  const languages = [
    'English (US)',
    'English (UK)',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Mandarin',
    'Japanese',
    'Other',
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter(file => {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'audio/mpeg',
        'audio/wav',
        'audio/mp3'
      ];
      
      if (!validTypes.includes(file.type)) {
        alert(`File ${file.name} is not a supported format. Please upload PDF, DOC, TXT, MP3, or WAV files.`);
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      
      return true;
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || !formData.description || !formData.language) {
      alert('Please fill in all required fields (Title, Category, Description, and Language).');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get user info
      const userId = localStorage.getItem('userId') || localStorage.getItem('user_id') || 'demo_client_' + Date.now();
      const userName = localStorage.getItem('userName') || localStorage.getItem('user_name') || 'Demo Client';
      
      // Create project object in the format BrowseJobs expects
      const newProject = {
        id: 'project_' + Date.now(),
        title: formData.title,
        description: formData.description,
        budget: formData.budget || 'Budget not specified',
        location: 'Remote', // You can add location field to form if needed
        category: formData.category,
        skills: formData.voiceStyle ? [formData.voiceStyle, formData.category] : [formData.category],
        status: 'open',
        clientId: userId,
        clientName: userName,
        deadline: formData.deadline,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        applicants: [],
        viewCount: 0,
        // Additional data from your form
        scriptLength: formData.scriptLength,
        voiceStyle: formData.voiceStyle,
        gender: formData.gender,
        age: formData.age,
        language: formData.language,
        projectType: formData.projectType,
        files: uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
      };
      
      // Save to localStorage (same key that BrowseJobs reads from)
      const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      const updatedProjects = [newProject, ...existingProjects];
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      
      // Dispatch event to update other components
      window.dispatchEvent(new CustomEvent('projectsUpdated', { detail: updatedProjects }));
      
      console.log('Project submitted and saved:', newProject);

      alert('Project posted successfully! Voice talent will start submitting proposals soon.');
      
      // Reset form
      setFormData({
        title: '',
        category: '',
        description: '',
        scriptLength: '',
        voiceStyle: '',
        gender: '',
        age: '',
        language: '',
        budget: '',
        deadline: '',
        projectType: 'one-time',
      });
      setUploadedFiles([]);
      
      // Navigate back to home
      onBack();
      
    } catch (error) {
      alert('Failed to post project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    // Save to localStorage as draft
    const draftData = {
      ...formData,
      files: uploadedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('project_draft', JSON.stringify(draftData));
    alert('Draft saved successfully! You can continue editing later.');
  };

  // Load draft on component mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('project_draft');
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        const shouldLoadDraft = window.confirm(
          'You have a saved draft from ' + new Date(draftData.savedAt).toLocaleDateString() + 
          '. Would you like to continue editing it?'
        );
        
        if (shouldLoadDraft) {
          setFormData(draftData);
          // Note: Files can't be restored from localStorage for security reasons
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <ProtectedRoute requireClient={true}>
      <div className="min-h-screen bg-slate-900 pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

          {/* Header */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Post Your Voice Over Project
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Tell us about your project and connect with professional voice artists who can bring your vision to life.
            </p>
          </motion.div>

          {/* Form */}
          <motion.div 
            className="bg-slate-800 rounded-2xl shadow-lg border border-gray-700 overflow-hidden"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <form onSubmit={handleSubmit}>
              {/* Project Basics */}
              <motion.div 
                className="p-8 border-b border-gray-700"
                variants={itemVariants}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-blue-900/50 p-2 rounded-lg">
                    <Mic className="h-6 w-6 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Project Details</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g., Commercial voice over for tech startup"
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Script Length
                    </label>
                    <select
                      name="scriptLength"
                      value={formData.scriptLength}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    >
                      <option value="">Select length</option>
                      <option value="under-30">Under 30 seconds</option>
                      <option value="30-60">30-60 seconds</option>
                      <option value="1-2-min">1-2 minutes</option>
                      <option value="2-5-min">2-5 minutes</option>
                      <option value="5-15-min">5-15 minutes</option>
                      <option value="15-60-min">15-60 minutes</option>
                      <option value="over-60">Over 60 minutes</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={5}
                      placeholder="Describe your project, including the tone, target audience, and any specific requirements..."
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                      required
                    ></textarea>
                  </div>
                </div>
              </motion.div>

              {/* Voice Requirements */}
              <motion.div 
                className="p-8 border-b border-gray-700"
                variants={itemVariants}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-indigo-900/50 p-2 rounded-lg">
                    <Globe className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Voice Requirements</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Voice Style
                    </label>
                    <select
                      name="voiceStyle"
                      value={formData.voiceStyle}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    >
                      <option value="">Select voice style</option>
                      {voiceStyles.map(style => (
                        <option key={style} value={style}>
                          {style}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Gender Preference
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    >
                      <option value="">No preference</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Age Range
                    </label>
                    <select
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    >
                      <option value="">No preference</option>
                      <option value="young-adult">Young Adult (18-30)</option>
                      <option value="adult">Adult (30-50)</option>
                      <option value="mature">Mature (50+)</option>
                      <option value="child">Child</option>
                      <option value="teen">Teen</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Language *
                    </label>
                    <select
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      required
                    >
                      <option value="">Select language</option>
                      {languages.map(language => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>

              {/* Budget and Timeline */}
              <motion.div 
                className="p-8 border-b border-gray-700"
                variants={itemVariants}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-green-900/50 p-2 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Budget & Timeline</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Budget Range
                    </label>
                    <select
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    >
                      <option value="">Select budget range</option>
                      <option value="under-100">Under $100</option>
                      <option value="100-250">$100 - $250</option>
                      <option value="250-500">$250 - $500</option>
                      <option value="500-1000">$500 - $1,000</option>
                      <option value="1000-2500">$1,000 - $2,500</option>
                      <option value="over-2500">Over $2,500</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Deadline
                    </label>
                    <input
                      type="date"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Type
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="projectType"
                          value="one-time"
                          checked={formData.projectType === 'one-time'}
                          onChange={handleInputChange}
                          className="mr-2 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-gray-300">One-time project</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="projectType"
                          value="ongoing"
                          checked={formData.projectType === 'ongoing'}
                          onChange={handleInputChange}
                          className="mr-2 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="text-gray-300">Ongoing work</span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* File Upload */}
              <motion.div 
                className="p-8 border-b border-gray-700"
                variants={itemVariants}
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="bg-orange-900/50 p-2 rounded-lg">
                    <FileAudio className="h-6 w-6 text-orange-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Additional Materials</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Upload Script or Reference Files
                    </label>
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging 
                          ? 'border-blue-500 bg-blue-500/10' 
                          : 'border-gray-600 hover:border-blue-500'
                      }`}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    >
                      <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-300 mb-2">
                        Drop your files here or{' '}
                        <label className="text-blue-400 hover:text-blue-300 cursor-pointer underline">
                          browse
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.txt,.mp3,.wav"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="hidden"
                          />
                        </label>
                      </p>
                      <p className="text-sm text-gray-500">
                        Supported formats: PDF, DOC, TXT, MP3, WAV (Max 10MB per file)
                      </p>
                    </div>
                  </div>

                  {/* Uploaded Files */}
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-300">Uploaded Files:</h4>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileAudio className="h-5 w-5 text-blue-400" />
                            <div>
                              <p className="text-white text-sm font-medium">{file.name}</p>
                              <p className="text-gray-400 text-xs">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-400 hover:text-red-300 p-1 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Submit */}
              <motion.div 
                className="p-8"
                variants={itemVariants}
              >
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                  <motion.button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-8 py-4 border border-gray-600 text-gray-300 rounded-xl hover:border-blue-500 hover:text-blue-400 transition-colors font-semibold"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Save as Draft
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/20 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: isSubmitting ? 1 : 1.05, boxShadow: isSubmitting ? undefined : "0 0 20px rgba(37, 99, 235, 0.5)" }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Posting Project...</span>
                      </div>
                    ) : (
                      'Post Project'
                    )}
                  </motion.button>
                </div>
                
                <div className="mt-6 p-4 bg-blue-900/30 rounded-lg border border-blue-800/50">
                  <p className="text-sm text-blue-300">
                    <strong>What happens next?</strong> Once you post your project, qualified voice artists will submit proposals. 
                    You can review their profiles, listen to samples, and choose the perfect voice for your project.
                  </p>
                </div>
              </motion.div>
            </form>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default PostProject;