import React from 'react';
import { Globe, Clock, Shield, Check, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface WhyChooseProps {
  onAuthClick: (type: 'signin' | 'signup') => void;
  onPageChange?: (page: string) => void;
}

const WhyChoose: React.FC<WhyChooseProps> = ({ onAuthClick, onPageChange }) => {
  const features = [
    {
      icon: Globe,
      title: 'Global Talent Pool',
      description: 'Access thousands of professional voice artists from around the world, speaking multiple languages and dialects.',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Clock,
      title: 'Fast Turnaround',
      description: 'Get your project complete in as little as 24 hours with our network of professional voice talent.',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Your projects and payments are protected with enterprise-grade security and our satisfaction guarantee.',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  const plans = [
    {
      name: 'Clients',
      price: 'FREE',
      description: 'Perfect for hiring voice talent',
      features: [
        'Post unlimited jobs',
        'Browse talent profiles',
        'Direct messaging',
        'Secure payments',
      ],
      buttonText: 'Sign Up Free',
      buttonStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-600/20',
      popular: false,
    },
    {
      name: 'Talent Monthly',
      price: '$35',
      period: 'Per month, billed monthly',
      description: '',
      features: [
        'Create professional profile',
        'Apply to unlimited jobs',
        'Upload audio samples',
        'Direct client messaging',
        'Analytics dashboard',
      ],
      buttonText: 'Subscribe Now',
      buttonStyle: 'border-2 border-gray-600 text-gray-300 hover:border-blue-600 hover:text-blue-400',
      popular: false,
    },
    {
      name: 'Talent Annual',
      price: '$348',
      period: 'Per year, billed annually',
      description: 'Save $72 per year!',
      features: [
        'Everything in Monthly',
        'Priority support',
        'Featured profile listing',
        'Advanced analytics',
        '2 months free!',
      ],
      buttonText: 'Subscribe Now',
      buttonStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-600/20',
      popular: true,
      badge: 'BEST VALUE',
    },
  ];

  const handleAuthClick = (type: 'signin' | 'signup') => {
    // Scroll to top before showing auth modal
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onAuthClick(type);
    }, 100);
  };

  const handlePageChange = (page: string) => {
    if (onPageChange) {
      // Scroll to top before navigation
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        onPageChange(page);
      }, 100);
    }
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
    <section className="py-20 bg-slate-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-20 left-10 w-40 h-40 bg-blue-600/10 rounded-full blur-[100px] opacity-30"></div>
      <div className="absolute bottom-20 right-10 w-60 h-60 bg-indigo-600/10 rounded-full blur-[100px] opacity-30"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Why Choose Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Why Choose VoiceCastingPro?
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            We make it easy to find, hire, and work with professional voice talent
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 mb-20"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={index}
                className="bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-700 hover:border-blue-600 hover:-translate-y-2"
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                <div className={`inline-flex p-4 rounded-xl mb-6 bg-gradient-to-r ${feature.color}`}>
                  <IconComponent className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Pricing Section */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Choose the plan that works best for you
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div 
          className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              className={`relative bg-slate-800 rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-2 border ${
                plan.popular
                  ? 'border-blue-600 shadow-lg shadow-blue-600/20 scale-105'
                  : 'border-gray-700 hover:border-blue-600'
              }`}
              variants={itemVariants}
              whileHover={{ y: -5 }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}
              
              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-white">
                      {plan.price}
                    </span>
                  </div>
                  {plan.period && (
                    <p className="text-gray-400 text-sm mb-2">
                      {plan.period}
                    </p>
                  )}
                  {plan.description && (
                    <p className={`text-sm font-medium ${
                      plan.popular ? 'text-blue-400' : 'text-gray-400'
                    }`}>
                      {plan.description}
                    </p>
                  )}
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-3">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                        plan.popular ? 'bg-blue-600' : 'bg-gray-600'
                      }`}>
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-gray-300 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <motion.button 
                  onClick={() => handleAuthClick('signup')}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${plan.buttonStyle}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {plan.buttonText}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-8 md:p-12 shadow-2xl border border-gray-700">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied clients and talented voice artists on VoiceCastingPro today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button 
                onClick={() => handleAuthClick('signup')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:shadow-lg hover:shadow-blue-600/20 transition-all font-semibold text-lg"
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(37, 99, 235, 0.5)" }}
                whileTap={{ scale: 0.95 }}
              >
                Start Free Today
              </motion.button>
              <motion.button 
                onClick={() => handlePageChange('talent')}
                className="border-2 border-gray-600 text-gray-300 px-8 py-4 rounded-xl hover:border-blue-600 hover:text-blue-400 transition-colors font-semibold text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Browse Talent
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyChoose;