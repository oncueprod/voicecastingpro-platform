import React, { useState, useEffect } from 'react';
import { Mail, MessageCircle, Send, CheckCircle, AlertCircle, ArrowLeft, Paperclip, X, Download, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { emailService, ContactFormData } from '../services/emailService';

interface ContactUsProps {
  onPageChange?: (page: string) => void;
}

const ContactUs: React.FC<ContactUsProps> = ({ onPageChange }) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous error when user starts typing
    if (submitStatus === 'error') {
      setSubmitStatus('idle');
      setErrorMessage('');
    }
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setErrorMessage('Please enter your full name');
      return false;
    }
    
    if (!formData.email.trim()) {
      setErrorMessage('Please enter your email address');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Please enter a valid email address');
      return false;
    }
    
    if (!formData.subject.trim()) {
      setErrorMessage('Please enter a subject');
      return false;
    }
    
    if (!formData.message.trim()) {
      setErrorMessage('Please enter your message');
      return false;
    }
    
    if (formData.message.trim().length < 10) {
      setErrorMessage('Please provide a more detailed message (at least 10 characters)');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // In a real implementation, you would upload attachments to a server
      // and include their references in the email
      const attachmentInfo = attachments.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));
      
      console.log('Sending contact form with data:', {
        ...formData,
        attachments: attachmentInfo
      });
      
      const success = await emailService.sendContactForm({
        ...formData,
        attachments: attachmentInfo
      });
      
      if (success) {
        setSubmitStatus('success');
        // Reset form after successful submission
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: '',
          category: 'general'
        });
        setAttachments([]);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage('Failed to send your message. Please try again or contact us directly.');
      console.error('Contact form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackClick = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  const handleHelpCenterClick = () => {
    // Use the onPageChange prop to navigate to the help center
    if (onPageChange) {
      onPageChange('help-center');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Validate file size (limit to 10MB per file)
      const validFiles = newFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          return false;
        }
        return true;
      });
      
      setAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      
      // Validate file size (limit to 10MB per file)
      const validFiles = newFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          return false;
        }
        return true;
      });
      
      setAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const contactMethods = [
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Get help via email within 24 hours',
      contact: 'support@voicecastingpro.com',
      color: 'from-blue-500 to-blue-600',
      link: 'mailto:support@voicecastingpro.com'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.button
          onClick={handleBackClick}
          className="flex items-center space-x-2 text-white/80 hover:text-white mb-8 transition-colors"
          whileHover={{ x: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </motion.button>
        
        {/* Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Contact Us
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Have questions or need support? We're here to help you succeed on VoiceCastingPro
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div 
            className="bg-slate-800 rounded-2xl p-8 border border-gray-700"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">
              Send us a Message
            </h2>
            
            {/* Success Message */}
            {submitStatus === 'success' && (
              <motion.div 
                className="bg-green-500/20 border border-green-400 text-green-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Message sent successfully!</p>
                  <p className="text-sm">We'll get back to you within 24 hours.</p>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {submitStatus === 'error' && (
              <motion.div 
                className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded-lg mb-6 flex items-center space-x-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="general">General Inquiry</option>
                  <option value="technical">Technical Support</option>
                  <option value="billing">Billing & Payments</option>
                  <option value="account">Account Issues</option>
                  <option value="partnership">Partnership</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="Brief description of your inquiry"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  placeholder="Please provide details about your inquiry..."
                  required
                ></textarea>
              </div>

              {/* File Attachment Section */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Attachments (Optional)
                </label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-blue-500'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Paperclip className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-300 mb-2">
                    Drop files here or{' '}
                    <label className="text-blue-400 hover:text-blue-300 cursor-pointer">
                      browse
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">
                    Max 10MB per file. Supported formats: PDF, DOC, JPG, PNG, MP3, WAV
                  </p>
                </div>
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-300">
                    {attachments.length} {attachments.length === 1 ? 'file' : 'files'} attached
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-700 p-2 rounded-lg">
                        <div className="flex items-center space-x-2 overflow-hidden">
                          <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-white truncate">{file.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">({formatFileSize(file.size)})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-gray-400 hover:text-red-400 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-semibold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Sending Message...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>Send Message</span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Email Info */}
            <div className="mt-6 p-4 bg-blue-900/30 rounded-lg border border-blue-600/50">
              <p className="text-blue-300 text-sm">
                <strong>📧 Email Confirmation:</strong> You'll receive an automatic confirmation email 
                after submitting this form, and our team will respond within 24 hours.
              </p>
            </div>
          </motion.div>

          {/* Contact Information */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Contact Methods */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Get in Touch
              </h2>
              <div className="space-y-4">
                {contactMethods.map((method, index) => {
                  const IconComponent = method.icon;
                  return (
                    <div key={index} className="bg-slate-800 rounded-xl p-6 border border-gray-700 hover:border-blue-600 transition-colors">
                      <div className="flex items-start space-x-4">
                        <div className={`p-3 rounded-lg bg-gradient-to-r ${method.color}`}>
                          <IconComponent className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {method.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-2">
                            {method.description}
                          </p>
                          {method.link ? (
                            <a 
                              href={method.link} 
                              className="text-blue-400 font-medium hover:text-blue-300 transition-colors"
                            >
                              {method.contact}
                            </a>
                          ) : (
                            <p className="text-blue-400 font-medium">
                              {method.contact}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Help Center Link */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-indigo-900/50 p-3 rounded-lg">
                  <HelpCircle className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  Need Quick Answers?
                </h3>
              </div>
              <p className="text-gray-300 mb-6">
                Our Help Center has answers to frequently asked questions and detailed guides to help you get the most out of VoiceCastingPro.
              </p>
              <motion.button 
                onClick={handleHelpCenterClick}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-indigo-600/20 transition-all font-medium inline-flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <HelpCircle className="h-5 w-5" />
                <span>Browse Help Center</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
        
        {/* Back Button (Bottom) */}
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <motion.button
            onClick={handleBackClick}
            className="bg-slate-800 border border-gray-700 text-gray-300 px-8 py-3 rounded-xl hover:border-blue-600 hover:text-blue-400 transition-colors font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Back
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactUs;