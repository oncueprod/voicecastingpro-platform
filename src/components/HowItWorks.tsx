import React from 'react';
import { Search, MessageCircle, Headphones, CheckCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface HowItWorksProps {
  onPageChange?: (page: string) => void;
}

const HowItWorks: React.FC<HowItWorksProps> = ({ onPageChange }) => {
  const steps = [
    {
      icon: Search,
      title: 'Browse & Search',
      description: 'Explore our curated database of professional voice talent. Filter by language, style, and expertise.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: MessageCircle,
      title: 'Connect & Discuss',
      description: 'Message voice artists directly to discuss your project requirements and get custom quotes.',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: Headphones,
      title: 'Review & Select',
      description: 'Listen to voice samples and demos to find the perfect match for your project.',
      color: 'from-purple-500 to-purple-600',
    },
    {
      icon: CheckCircle,
      title: 'Collaborate & Complete',
      description: 'Work together through our platform with secure payments and project management tools.',
      color: 'from-green-500 to-green-600',
    },
  ];

  const handleBrowseTalent = () => {
    if (onPageChange) {
      onPageChange('talent');
    }
  };

  const handlePostProject = () => {
    if (onPageChange) {
      onPageChange('post-project');
    }
  };

  const handleBackClick = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section className="py-20 bg-slate-800 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-indigo-900/10"></div>
      <div className="absolute top-20 left-20 w-40 h-40 bg-blue-600/10 rounded-full blur-[100px] opacity-30"></div>
      <div className="absolute bottom-20 right-20 w-60 h-60 bg-indigo-600/10 rounded-full blur-[100px] opacity-30"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Back Button */}
        <motion.a
          href="/"
          className="flex items-center space-x-2 text-white/80 hover:text-white mb-8 transition-colors"
          whileHover={{ x: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </motion.a>
        
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How VoiceCastingPro Works
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Getting professional voice over work done has never been easier. 
            Follow these simple steps to bring your project to life.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 mb-12 lg:mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <motion.div
                key={index}
                className="relative"
                variants={itemVariants}
              >
                {/* Connection line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-full w-8 h-0.5 bg-gradient-to-r from-gray-600 to-gray-700 z-0"></div>
                )}
                
                <motion.div 
                  className="bg-slate-700 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-600 hover:-translate-y-2 relative z-10 hover:border-blue-600"
                  whileHover={{ y: -5, boxShadow: "0 0 20px rgba(37, 99, 235, 0.2)" }}
                >
                  {/* Step number */}
                  <div className="absolute -top-4 left-6">
                    <div className="bg-slate-700 border-4 border-slate-800 rounded-full w-8 h-8 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-400">{index + 1}</span>
                    </div>
                  </div>
                  
                  {/* Icon */}
                  <div className={`inline-flex p-4 rounded-xl mb-6 bg-gradient-to-r ${step.color}`}>
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA Section */}
        <motion.div 
          className="mt-12 lg:mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 rounded-2xl p-6 sm:p-8 md:p-12 shadow-2xl border border-gray-600">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-gray-300 text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied clients who have found their perfect voice 
              through VoiceCastingPro. Start your project today!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <motion.button 
                onClick={handleBrowseTalent}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:shadow-lg hover:shadow-blue-600/20 transition-all font-semibold text-base sm:text-lg"
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(37, 99, 235, 0.5)" }}
                whileTap={{ scale: 0.95 }}
              >
                Browse Voice Talent
              </motion.button>
              <motion.button 
                onClick={handlePostProject}
                className="border-2 border-gray-600 text-gray-300 px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:border-blue-600 hover:text-blue-400 transition-colors font-semibold text-base sm:text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Post a Project
              </motion.button>
            </div>
          </div>
        </motion.div>
        
        {/* Back Button (Bottom) */}
        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <motion.a
            href="/"
            className="bg-slate-700 border border-gray-600 text-gray-300 px-8 py-3 rounded-xl hover:border-blue-600 hover:text-blue-400 transition-colors font-medium inline-block"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Back
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;