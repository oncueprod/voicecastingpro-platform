import React, { useState, useEffect } from 'react';
import { Check, Shield, CreditCard, Star, HelpCircle, Mic, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import PayPalSubscriptionButton from './PayPalSubscriptionButton';

interface PublicSubscriptionPlansProps {
  onAuthClick: (type: 'signin' | 'signup') => void;
  onPageChange?: (page: string) => void;
}

const PublicSubscriptionPlans: React.FC<PublicSubscriptionPlansProps> = ({ onAuthClick, onPageChange }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const isProduction = import.meta.env.PROD;
  const { isAuthenticated, user } = useAuth();
  const [sdkReady, setSdkReady] = useState(false);

  // Load the PayPal SDK
  useEffect(() => {
    if (isAuthenticated && user?.type === 'talent') {
      const addPayPalScript = () => {
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb';
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
        script.async = true;
        script.onload = () => {
          setSdkReady(true);
        };
        document.body.appendChild(script);
      };

      if (window.paypal) {
        setSdkReady(true);
      } else {
        addPayPalScript();
      }
      
      // Cleanup
      return () => {
        const script = document.querySelector('script[src*="paypal.com/sdk/js"]');
        if (script) {
          document.body.removeChild(script);
        }
      };
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    // If user is already authenticated and is talent, redirect to subscription page
    if (isAuthenticated && user?.type === 'talent') {
      onPageChange?.('subscription-plans');
    }
  }, [isAuthenticated, user, onPageChange]);

  const handleSubscriptionClick = (planId: string) => {
    if (isAuthenticated && user?.type === 'talent') {
      // If already signed in as talent, redirect to subscription page
      onPageChange?.('subscription-plans');
    } else if (isAuthenticated && user?.type === 'client') {
      // If signed in as client, prompt to create a talent account
      alert('You need a talent account to subscribe. Please sign up as a voice talent.');
    } else {
      // If not signed in, show sign up modal
      handleAuthClick('signup');
    }
  };

  const handleAuthClick = (type: 'signin' | 'signup') => {
    // Scroll to top before showing auth modal
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onAuthClick(type);
    }, 100);
  };

  const handleBackClick = () => {
    // Navigate back to previous page
    window.history.back();
  };

  const plans = [
    {
      id: 'client',
      title: 'For Clients - Always Free',
      subtitle: 'Free Forever',
      price: '$0',
      period: 'No hidden fees, ever',
      features: [
        'Post unlimited projects',
        'Browse all voice talent',
        'Direct messaging',
        'Secure escrow payments',
        'Project management tools',
        'Basic support',
        'Quality guarantee'
      ],
      buttonText: 'Start Posting Projects',
      buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
      bgColor: 'bg-slate-800/50',
      borderColor: 'border-slate-600',
      popular: false
    },
    {
      id: 'monthly',
      title: 'For Voice Talent',
      subtitle: 'Monthly Plan',
      price: '$35',
      period: 'per month via PayPal',
      features: [
        'Unlimited project applications',
        'Featured profile placement',
        'Direct client contact',
        'Audio demo hosting',
        'Analytics dashboard',
        'PayPal payment processing',
        'Priority customer support',
        'Advanced portfolio tools'
      ],
      buttonText: 'Start Monthly Plan',
      buttonStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
      bgColor: 'bg-slate-800/50',
      borderColor: 'border-slate-600',
      popular: false
    },
    {
      id: 'annual',
      title: 'Annual Plan',
      subtitle: 'Best Value • Save $72/year',
      price: '$348',
      period: 'per year',
      subPeriod: 'billed annually via PayPal',
      features: [
        'Everything in Monthly Plan',
        'Priority customer support',
        'Featured profile listing',
        'Early access to new features'
      ],
      buttonText: 'Start Annual Plan',
      buttonStyle: 'bg-green-600 hover:bg-green-700 text-white',
      bgColor: 'bg-slate-800/80',
      borderColor: 'border-blue-500',
      popular: true,
      badge: 'Best Value • Save $72/year'
    }
  ];

  const faqs = [
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes, you can cancel your subscription at any time through your PayPal account or by contacting our support team. No cancellation fees.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'We offer a 30-day money-back guarantee for all new subscriptions. Contact us if you\'re not satisfied within the first 30 days.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'Through PayPal, you can pay with your PayPal balance, bank account, or any major credit/debit card (Visa, MasterCard, American Express, Discover).'
    },
    {
      question: 'Can I switch between plans?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Contact our support team and we\'ll help you make the change with prorated billing.'
    },
    {
      question: 'When will I be charged?',
      answer: 'You\'ll be charged immediately upon subscription, then automatically on the same date each month/year. PayPal will send you email notifications before each charge.'
    },
    {
      question: 'Is my payment information secure?',
      answer: 'Absolutely. All payments are processed through PayPal\'s secure servers. We never store your credit card or banking information on our servers.'
    }
  ];

  const paypalFeatures = [
    {
      icon: Shield,
      title: 'Secure & Trusted',
      description: 'PayPal\'s industry-leading security protects your payment information with advanced encryption.'
    },
    {
      icon: CreditCard,
      title: 'Easy Management',
      description: 'Manage your subscription directly in PayPal - pause, cancel, or update payment methods anytime.'
    },
    {
      icon: Star,
      title: 'Multiple Payment Options',
      description: 'Pay with your PayPal balance, bank account, or any major credit/debit card.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 pt-24 pb-20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-40 h-40 bg-white/5 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute bottom-20 right-10 w-60 h-60 bg-white/5 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-400/5 rounded-full blur-[120px] opacity-30"></div>
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
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
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm">
              <Mic className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Voice Talent Subscription Plans
            </h1>
          </div>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
            Choose the perfect plan to unlock your voice talent potential
          </p>
          
          {/* Sandbox Notice - Only in development */}
          {!isProduction && (
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 max-w-2xl mx-auto mb-8 backdrop-blur-sm">
              <p className="text-yellow-300 text-sm">
                🧪 <strong>Sandbox Mode:</strong> This is a test environment. No real payments will be processed.
              </p>
            </div>
          )}

          {/* Sign Up CTA */}
          {!isAuthenticated ? (
            <div className="bg-white/10 border border-white/20 rounded-lg p-6 max-w-2xl mx-auto backdrop-blur-sm">
              <p className="text-white/90 mb-4">
                <strong>Ready to get started?</strong> Sign up as a voice talent to access these subscription plans.
              </p>
              <motion.button 
                onClick={() => handleAuthClick('signup')}
                className="bg-white text-blue-800 px-6 py-3 rounded-lg hover:bg-blue-50 transition-all font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign Up as Voice Talent
              </motion.button>
            </div>
          ) : user?.type === 'client' ? (
            <div className="bg-white/10 border border-white/20 rounded-lg p-6 max-w-2xl mx-auto backdrop-blur-sm">
              <p className="text-white/90 mb-4">
                <strong>You're signed in as a client.</strong> These subscription plans are for voice talent accounts.
              </p>
              <motion.button 
                onClick={() => handleAuthClick('signup')}
                className="bg-white text-blue-800 px-6 py-3 rounded-lg hover:bg-blue-50 transition-all font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Create a Voice Talent Account
              </motion.button>
            </div>
          ) : null}
        </motion.div>

        {/* Subscription Plans */}
        <motion.div 
          className="grid lg:grid-cols-3 gap-8 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              className={`${plan.bgColor} rounded-2xl p-8 border-2 ${plan.borderColor} transition-all duration-300 hover:scale-105 relative backdrop-blur-sm ${
                plan.popular ? 'shadow-2xl shadow-blue-500/20' : ''
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
              whileHover={{ y: -5 }}
            >
              
              <div className="text-center mb-8">
                <h3 className="text-lg font-semibold text-white/80 mb-2">
                  {plan.id === 'annual' ? 'For Voice Talent' : plan.title}
                </h3>
                <h4 className="text-xl font-bold text-white mb-4">
                  {plan.id === 'annual' ? 'Annual Plan' : plan.subtitle}
                </h4>
                
                <div className="mb-4">
                  <span className="text-5xl font-bold text-white">
                    {plan.price}
                  </span>
                </div>
                
                <p className="text-white/80 text-sm mb-2">
                  {plan.period}
                </p>
                {plan.subPeriod && (
                  <p className="text-white/60 text-xs">
                    {plan.subPeriod}
                  </p>
                )}
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-white/90 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <motion.button 
                onClick={() => handleSubscriptionClick(plan.id)}
                className={`w-full py-3 rounded-lg font-medium ${plan.buttonStyle}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {plan.buttonText}
              </motion.button>
            </motion.div>
          ))}
        </motion.div>

        {/* PayPal Security Info */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="bg-white/10 rounded-2xl p-8 border border-white/20 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              Secure PayPal Subscriptions
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <p className="text-white/90 text-sm">
                    All subscriptions are processed securely through PayPal
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <p className="text-white/90 text-sm">
                    You can manage, pause, or cancel your subscription anytime in your PayPal account
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <p className="text-white/90 text-sm">
                    No credit card information is stored on our servers
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <p className="text-white/90 text-sm">
                    Automatic billing with email notifications before each charge
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  <p className="text-white/90 text-sm">
                    30-day money-back guarantee for new subscribers
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Why PayPal */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Why We Use PayPal
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {paypalFeatures.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="bg-white/10 rounded-xl p-6 border border-white/20 text-center backdrop-blur-sm">
                  <div className="bg-blue-600/50 p-3 rounded-xl w-fit mx-auto mb-4">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-white/80 text-sm">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white/10 rounded-xl p-6 border border-white/20 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5 text-blue-400" />
                  <span>{faq.question}</span>
                </h3>
                <p className="text-white/80 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Support CTA */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <div className="bg-white/10 rounded-2xl p-8 border border-white/20 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-4">
              Ready to Start Your Voice Career?
            </h3>
            <p className="text-white/80 mb-6">
              Join thousands of voice professionals who trust VoiceCastingPro for their career growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isAuthenticated ? (
                <>
                  <motion.button 
                    onClick={() => handleAuthClick('signup')}
                    className="bg-white text-blue-800 px-8 py-3 rounded-lg hover:bg-blue-50 transition-all font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign Up as Voice Talent
                  </motion.button>
                  <motion.button 
                    onClick={() => handleAuthClick('signin')}
                    className="border border-white/30 text-white px-8 py-3 rounded-lg hover:border-white hover:bg-white/10 transition-colors font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Already Have an Account?
                  </motion.button>
                </>
              ) : user?.type === 'talent' ? (
                <PayPalSubscriptionButton
                  planId={billingCycle === 'monthly' ? 'P-MONTHLY-PLAN-ID' : 'P-ANNUAL-PLAN-ID'}
                  userId={user.id}
                  className="bg-white text-blue-800 px-8 py-3 rounded-lg hover:bg-blue-50 transition-all font-medium"
                  buttonText="Subscribe Now"
                />
              ) : (
                <motion.button 
                  onClick={() => handleAuthClick('signup')}
                  className="bg-white text-blue-800 px-8 py-3 rounded-lg hover:bg-blue-50 transition-all font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Create a Voice Talent Account
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PublicSubscriptionPlans;