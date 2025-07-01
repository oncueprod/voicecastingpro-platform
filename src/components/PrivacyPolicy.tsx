import React from 'react';
import { Shield, Eye, Database, Lock, UserCheck, Globe, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const PrivacyPolicy: React.FC = () => {
  const sections = [
    {
      icon: Database,
      title: 'Information We Collect',
      content: `We collect information you provide directly to us, such as when you create an account, post projects, or contact us. This includes your name, email address, profile information, and payment details.`
    },
    {
      icon: Eye,
      title: 'How We Use Your Information',
      content: `We use your information to provide, maintain, and improve our services, process transactions, send communications, and ensure platform security. We do not sell your personal information to third parties.`
    },
    {
      icon: Shield,
      title: 'Information Security',
      content: `We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption, secure servers, and regular security audits.`
    },
    {
      icon: Globe,
      title: 'Information Sharing',
      content: `We may share your information with service providers who assist us in operating our platform, but only to the extent necessary and under strict confidentiality agreements. We never sell your data.`
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
            Privacy Policy
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
            At VoiceCastingPro, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
            disclose, and safeguard your information when you use our platform. Please read this policy carefully 
            to understand our practices regarding your personal data.
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
                  <div className="bg-green-900/50 p-3 rounded-xl">
                    <IconComponent className="h-6 w-6 text-green-400" />
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

        {/* Detailed Privacy Information */}
        <motion.div 
          className="bg-slate-800 rounded-2xl p-8 border border-gray-700 space-y-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Types of Data Collected</h2>
            <div className="text-gray-300 leading-relaxed space-y-3">
              <p><strong>Personal Data:</strong> Name, email address, phone number, profile picture, and billing information.</p>
              <p><strong>Usage Data:</strong> Information about how you use our platform, including pages visited, features used, and time spent.</p>
              <p><strong>Device Data:</strong> IP address, browser type, operating system, and device identifiers.</p>
              <p><strong>Communication Data:</strong> Messages sent through our platform and support communications.</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Cookies and Tracking</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to enhance your experience on our platform. 
              These help us remember your preferences, analyze usage patterns, and provide personalized content. 
              You can control cookie settings through your browser preferences.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Data Retention</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We retain your personal information only as long as necessary to provide our services and fulfill 
              the purposes outlined in this policy. Account data is typically retained for the duration of your 
              account plus a reasonable period thereafter for legal and business purposes.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Your Rights</h2>
            <div className="text-gray-300 leading-relaxed space-y-3">
              <p><strong>Access:</strong> You can request access to your personal data we hold.</p>
              <p><strong>Correction:</strong> You can request correction of inaccurate personal data.</p>
              <p><strong>Deletion:</strong> You can request deletion of your personal data, subject to legal requirements.</p>
              <p><strong>Portability:</strong> You can request a copy of your data in a structured, machine-readable format.</p>
              <p><strong>Objection:</strong> You can object to certain processing of your personal data.</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">International Transfers</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place to protect your data in accordance with applicable privacy laws.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Our service is not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children under 13. If you become aware that a child has provided us 
              with personal information, please contact us immediately.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Changes to This Policy</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new policy on this page and updating the "Last updated" date. 
              Your continued use of our service constitutes acceptance of the updated policy.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions about this Privacy Policy or our data practices, please contact us at{' '}
              <a href="mailto:privacy@voicecastingpro.com" className="text-blue-400 hover:text-blue-300">
                privacy@voicecastingpro.com
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

export default PrivacyPolicy;