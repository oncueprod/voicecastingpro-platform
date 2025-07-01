import React from 'react';
import { FileText, Shield, Users, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const TermsOfService: React.FC = () => {
  const sections = [
    {
      icon: FileText,
      title: 'Agreement to Terms',
      content: `By accessing and using VoiceCastingPro, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.`
    },
    {
      icon: Users,
      title: 'User Accounts',
      content: `You are responsible for safeguarding the password and for maintaining the confidentiality of your account. You agree not to disclose your password to any third party and to take sole responsibility for activities that occur under your account.`
    },
    {
      icon: Shield,
      title: 'Acceptable Use',
      content: `You may not use our service for any illegal or unauthorized purpose. You must not transmit any worms, viruses, or any code of a destructive nature. A breach of any of these terms will result in immediate termination of your account.`
    },
    {
      icon: AlertCircle,
      title: 'Limitation of Liability',
      content: `VoiceCastingPro shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.`
    }
  ];

  const handleBackClick = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
            Terms of Service
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Last updated: January 1, 2025
          </p>
        </motion.div>

        {/* Introduction */}
        <motion.div 
          className="bg-slate-800 rounded-2xl p-8 mb-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="text-gray-300 leading-relaxed">
            Welcome to VoiceCastingPro. These Terms of Service ("Terms") govern your use of our website and services. 
            By using our platform, you agree to these terms in full. Please read them carefully before using our services.
          </p>
        </motion.div>

        {/* Key Sections */}
        <motion.div 
          className="space-y-8 mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <motion.div
                key={index}
                className="bg-slate-800 rounded-2xl p-8 border border-gray-700"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-900/50 p-3 rounded-xl">
                    <IconComponent className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white mb-4">
                      {section.title}
                    </h2>
                    <p className="text-gray-300 leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Detailed Terms */}
        <motion.div 
          className="bg-slate-800 rounded-2xl p-8 border border-gray-700 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Service Description</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              VoiceCastingPro is a platform that connects voice talent with clients seeking voice over services. 
              We provide tools for project management, communication, and secure payments.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Payment Terms</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Clients pay for services through our secure payment system. Voice talent subscriptions are billed monthly or annually. 
              All payments are processed securely and are non-refundable except as required by law.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Intellectual Property</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Voice talent retains ownership of their voice recordings until payment is received. 
              Upon payment, clients receive the agreed-upon usage rights. Our platform and its content are protected by copyright and other intellectual property laws.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Privacy and Data</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We collect and process personal data in accordance with our Privacy Policy. 
              By using our service, you consent to such processing and warrant that all data provided by you is accurate.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Termination</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Either party may terminate their account at any time. We reserve the right to suspend or terminate accounts 
              that violate these terms. Upon termination, your right to use the service ceases immediately.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. 
              Your continued use of the service constitutes acceptance of the modified terms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@voicecastingpro.com" className="text-blue-400 hover:text-blue-300">
                legal@voicecastingpro.com
              </a>
            </p>
          </div>
        </motion.div>
        
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

export default TermsOfService;