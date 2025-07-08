import React, { useState, useEffect } from 'react';
import { Check, Shield, CreditCard, Star, HelpCircle, Mic, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import PayPalSubscriptionButton from './PayPalSubscriptionButton';

interface SubscriptionPlansProps {
  fromSignup?: boolean;
  onBack?: () => void;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ fromSignup = false, onBack }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'none' | 'pending' | 'active' | 'cancelled'>('none');
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const { user } = useAuth();
  const [sdkReady, setSdkReady] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);

  const plans = {
    monthly: {
      price: 35,
      period: 'per month, billed monthly',
      savings: null,
      planId: import.meta.env.VITE_PAYPAL_MONTHLY_PLAN_ID || 'P-MONTHLY-PLAN-ID'
    },
    annual: {
      price: 348, 
      period: 'per year',
      savings: 'Save $72 per year!',
      planId: import.meta.env.VITE_PAYPAL_ANNUAL_PLAN_ID || 'P-ANNUAL-PLAN-ID'
    }
  };

  const features = {
    monthly: [
      'Create professional profile',
      'Apply to unlimited jobs',
      'Upload audio samples',
      'Direct client messaging',
      'Analytics dashboard',
      '24/7 customer support'
    ],
    annual: [
      'Everything in Monthly Plan',
      'Priority customer support',
      'Featured profile listing',
      'Advanced analytics & insights',
      'Early access to new features',
      '2 months free!'
    ]
  };

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

  // Load the PayPal SDK once for the entire page
  useEffect(() => {
    const loadPayPalScript = () => {
      // Check if PayPal is already loaded
      if (window.paypal && window.paypal.Buttons) {
        setSdkReady(true);
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => setSdkReady(true));
        existingScript.addEventListener('error', () => {
          setPaypalError('Failed to load PayPal SDK. Please check your internet connection and try again.');
        });
        return;
      }

      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
      
      if (!clientId || clientId === 'sb') {
        setPaypalError('PayPal Client ID is not configured. Please contact support.');
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription&components=buttons`;
      script.async = true;
      script.onload = () => {
        console.log('PayPal SDK loaded successfully');
        setSdkReady(true);
      };
      script.onerror = () => {
        console.error('Failed to load PayPal SDK');
        setPaypalError('Failed to load PayPal SDK. Please check your internet connection and try again.');
      };
      document.head.appendChild(script);
    };

    loadPayPalScript();
  }, []);

  const handleSubscriptionSuccess = (subId: string) => {
    setSubscriptionId(subId);
    setSubscriptionStatus('active');
    setPaypalError(null);

    // Show different success message if coming from signup flow
    if (fromSignup) {
      alert('Subscription activated successfully! Your talent profile is now fully featured and you can start receiving job opportunities. Welcome to VoiceCastingPro!');
    } else {
      alert(`Subscription created successfully! Your ${billingCycle} plan is now active.`);
    }
    
    // If we came from browse jobs, redirect back there
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const fromBrowseJobs = urlParams.get('fromBrowseJobs');
      
      if (fromBrowseJobs === 'true' && onBack) {
        setTimeout(() => {
          onBack();
        }, 1500);
      }
    }
  };

  const handleSubscriptionError = (error: any) => {
    console.error('Subscription error:', error);
    setPaypalError('Failed to create subscription. Please try again or contact support.');
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionId) return;
    
    const confirmed = window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.');
    
    if (confirmed) {
      try {
        // In a real implementation, this would call your backend to cancel the subscription
        setSubscriptionStatus('cancelled');
        
        // Update local storage
        const subscription = JSON.parse(localStorage.getItem('user_subscription') || '{}');
        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date().toISOString();
        localStorage.setItem('user_subscription', JSON.stringify(subscription));
        
        alert('Your subscription has been cancelled. You will have access until the end of your current billing period.');
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        alert('Failed to cancel subscription. Please try again or contact support.');
      }
    }
  };

  // Check for existing subscription on component mount
  useEffect(() => {
    const savedSubscription = localStorage.getItem('user_subscription');
    if (savedSubscription) {
      try {
        const subscription = JSON.parse(savedSubscription);
        if (subscription.userId === user?.id) {
          setSubscriptionId(subscription.id);
          setSubscriptionStatus(subscription.status);
          setBillingCycle(subscription.planType);
        }
      } catch (error) {
        console.error('Failed to parse subscription data:', error);
      }
    }
  }, [user]);

  // Check if we're coming from the signup flow via URL parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const fromSignupParam = urlParams.get('fromSignup');
      
      if (fromSignupParam === 'true') {
        document.title = 'Complete Your Registration - VoiceCastingPro';
      }
      
      const fromBrowseJobs = urlParams.get('fromBrowseJobs');
      if (fromBrowseJobs === 'true') {
        document.title = 'Subscribe to Submit Proposals - VoiceCastingPro';
      }
    }
  }, []);

  return (
    <ProtectedRoute requireTalent={true}>
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

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Back Button */}
          <motion.a
            onClick={() => onBack ? onBack() : window.history.back()}
            className="flex items-center space-x-2 text-white/80 hover:text-white mb-6 lg:mb-8 transition-colors cursor-pointer"
            whileHover={{ x: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </motion.a>
          
          {/* Header */}
          <motion.div 
            className="text-center mb-10 lg:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {fromSignup && (
              <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3 sm:p-4 max-w-2xl mx-auto mb-6 sm:mb-8 backdrop-blur-sm">
                <p className="text-green-300 text-xs sm:text-sm font-medium">
                  ✅ Your talent profile has been created successfully! Complete your registration by subscribing to a plan.
                </p>
              </div>
            )}

            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm">
                <Mic className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                Choose Your Subscription Plan
              </h1>
            </div>
            <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto mb-6 sm:mb-8">
              Unlock your full potential as a voice talent
            </p>
            
            {/* Subscription Status */}
            {subscriptionStatus !== 'none' && (
              <div className={`${
                subscriptionStatus === 'active' 
                  ? 'bg-green-900/30 border-green-600/50 text-green-300' 
                  : 'bg-yellow-900/30 border-yellow-600/50 text-yellow-300'
              } border rounded-lg p-4 max-w-2xl mx-auto mb-8 backdrop-blur-sm`}>
                <p className="text-sm">
                  {subscriptionStatus === 'active' 
                    ? `✅ You have an active ${billingCycle} subscription. Your premium features are unlocked!` 
                    : '⚠️ Your subscription has been cancelled. You will have access until the end of your current billing period.'}
                </p>
              </div>
            )}
            
            {/* PayPal Error */}
            {paypalError && (
              <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 max-w-2xl mx-auto mb-8 backdrop-blur-sm">
                <p className="text-red-300 text-sm">
                  ❌ <strong>Error:</strong> {paypalError}
                </p>
                <p className="text-red-300 text-xs mt-2">
                  Try refreshing the page or contact support if the problem persists.
                </p>
              </div>
            )}
          </motion.div>

          {/* Subscription Status and Management */}
          {subscriptionStatus !== 'none' && (
            <motion.div 
              className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-white mb-4">Your Subscription</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Subscription Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/80">Plan Type:</span>
                      <span className="text-white font-medium capitalize">{billingCycle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Status:</span>
                      <span className={`font-medium ${
                        subscriptionStatus === 'active' ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {subscriptionStatus === 'active' ? 'Active' : 'Cancelled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Subscription ID:</span>
                      <span className="text-white font-medium">{subscriptionId?.substring(0, 12)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/80">Amount:</span>
                      <span className="text-white font-medium">
                        ${billingCycle === 'monthly' ? plans.monthly.price : plans.annual.price}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Manage Subscription</h3>
                  <p className="text-white/80 mb-4">
                    {subscriptionStatus === 'active' 
                      ? 'You can cancel your subscription at any time. You will continue to have access until the end of your current billing period.'
                      : 'Your subscription has been cancelled. You will have access until the end of your current billing period.'}
                  </p>
                  
                  {subscriptionStatus === 'active' && (
                    <motion.button
                      onClick={handleCancelSubscription}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel Subscription
                    </motion.button>
                  )}
                  
                  {subscriptionStatus === 'cancelled' && (
                    <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
                      <p className="text-blue-300 text-sm">
                        Want to reactivate your subscription? Choose a plan below to subscribe again.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Billing Toggle */}
          <motion.div 
            className="flex justify-center mb-8 lg:mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white/10 rounded-xl p-2 border border-white/20 backdrop-blur-sm">
              <div className="flex space-x-1 sm:space-x-2">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all text-sm sm:text-base ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-blue-800'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all relative text-sm sm:text-base ${
                    billingCycle === 'annual'
                      ? 'bg-white text-blue-800'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Annual (Save 17%)
                  {billingCycle === 'annual' && (
                    <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      Best Value
                    </span>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Subscription Plans */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto mb-10 lg:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {/* Monthly Plan */}
            <div className={`bg-white/10 rounded-2xl p-8 border-2 transition-all backdrop-blur-sm ${
              billingCycle === 'monthly' 
                ? 'border-white/50 shadow-lg shadow-blue-600/20 scale-105' 
                : 'border-white/20'
            }`}>
              <div className="text-center mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                  Monthly Plan
                </h3>
                <div className="mb-4">
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    ${plans.monthly.price}
                  </span>
                </div>
                <p className="text-white/80 text-xs sm:text-sm mb-3 sm:mb-4">
                  {plans.monthly.period}
                </p>
                <p className="text-blue-300 text-xs sm:text-sm font-medium">
                  via PayPal
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {features.monthly.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-white/90 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {subscriptionStatus === 'active' && billingCycle === 'monthly' ? (
                <div className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-lg font-semibold mb-3 sm:mb-4 text-center text-sm sm:text-base">
                  Current Plan
                </div>
              ) : (
                <PayPalSubscriptionButton
                  planId={plans.monthly.planId}
                  userId={user?.id || ''}
                  onSuccess={handleSubscriptionSuccess}
                  onError={handleSubscriptionError}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 sm:py-4 rounded-lg transition-all font-semibold mb-3 sm:mb-4 text-sm sm:text-base"
                  buttonText="Subscribe with PayPal"
                />
              )}
              
              <p className="text-center text-[10px] sm:text-xs text-white/60">
                Secure payment processing by PayPal
              </p>
            </div>

            {/* Annual Plan */}
            <div className={`bg-white/10 rounded-2xl p-8 border-2 transition-all relative backdrop-blur-sm ${
              billingCycle === 'annual' 
                ? 'border-white/50 shadow-lg shadow-blue-600/20 scale-105' 
                : 'border-white/20'
            }`}>
              
              <div className="text-center mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                  For Voice Talent
                </h3>
                <h4 className="text-xl font-bold text-white mb-3 sm:mb-4">
                  Annual Plan
                </h4>
                <div className="mb-4">
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    ${plans.annual.price}
                  </span>
                </div>
                <p className="text-white/80 text-xs sm:text-sm mb-2">
                  {plans.annual.period}
                </p>
                <p className="text-green-400 text-xs sm:text-sm font-medium mb-2">Best Value • Save $72/year</p>
                <p className="text-blue-300 text-xs sm:text-sm font-medium">
                  via PayPal
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {features.annual.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-white/90 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {subscriptionStatus === 'active' && billingCycle === 'annual' ? (
                <div className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-lg font-semibold mb-3 sm:mb-4 text-center text-sm sm:text-base">
                  Current Plan
                </div>
              ) : (
                <PayPalSubscriptionButton
                  planId={plans.annual.planId}
                  userId={user?.id || ''}
                  onSuccess={handleSubscriptionSuccess}
                  onError={handleSubscriptionError}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 sm:py-4 rounded-lg transition-all font-semibold mb-3 sm:mb-4 text-sm sm:text-base"
                  buttonText="Subscribe with PayPal"
                />
              )}
              
              <p className="text-center text-[10px] sm:text-xs text-white/60">
                Secure payment processing by PayPal
              </p>
            </div>
          </motion.div>

          {/* PayPal Security Info */}
          <motion.div 
            className="mb-10 lg:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="bg-white/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-white/20 backdrop-blur-sm">
              <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-6 sm:mb-8">
                Secure PayPal Subscriptions
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <p className="text-white/90 text-xs sm:text-sm">
                      All subscriptions are processed securely through PayPal
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <p className="text-white/90 text-xs sm:text-sm">
                      You can manage, pause, or cancel your subscription anytime in your PayPal account
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <p className="text-white/90 text-xs sm:text-sm">
                      No credit card information is stored on our servers
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <p className="text-white/90 text-xs sm:text-sm">
                      Automatic billing with email notifications before each charge
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                    <p className="text-white/90 text-xs sm:text-sm">
                      30-day money-back guarantee for new subscribers
                    </p>
                  </div>
                </div>
              </div>

              {/* PayPal SDK Status */}
              <div className="mt-4 flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  sdkReady ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm text-gray-400">
                  {sdkReady ? 'PayPal SDK Ready' : 'Loading PayPal SDK...'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Why PayPal */}
          <motion.div 
            className="mb-10 lg:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-6 sm:mb-8">
              Why We Use PayPal
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
              {paypalFeatures.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="bg-white/10 rounded-xl p-5 sm:p-6 border border-white/20 text-center backdrop-blur-sm">
                    <div className="bg-blue-600/50 p-3 rounded-xl w-fit mx-auto mb-4">
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-white/80 text-xs sm:text-sm">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div 
            className="mb-10 lg:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-6 sm:mb-8">
              Frequently Asked Questions
            </h2>
            
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white/10 rounded-xl p-5 sm:p-6 border border-white/20 backdrop-blur-sm">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3 flex items-center space-x-2">
                    <HelpCircle className="h-5 w-5 text-blue-400" />
                    <span>{faq.question}</span>
                  </h3>
                  <p className="text-white/80 leading-relaxed text-sm sm:text-base">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Support CTA */}
          <motion.div 
            className="text-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            {!fromSignup ? (
              <div className="bg-white/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-white/20 backdrop-blur-sm">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                  Need help with your subscription?
                </h3>
                <p className="text-white/80 mb-4 sm:mb-6 text-sm sm:text-base">
                  Contact our support team for assistance with billing, plan changes, or any questions.
                </p>
                <motion.a 
                  href="/contact-us"
                  className="bg-white text-blue-800 px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-50 transition-all font-medium inline-block text-sm sm:text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Contact Support
                </motion.a>
              </div>
            ) : (
              <div className="bg-white/10 rounded-xl sm:rounded-2xl p-6 sm:p-8 border border-white/20 backdrop-blur-sm">
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
                  Ready to Start Your Voice Career?
                </h3>
                <p className="text-white/80 mb-4 sm:mb-6 text-sm sm:text-base">
                  Subscribe now to unlock all premium features and start receiving job opportunities.
                </p>
                <motion.button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="bg-white text-blue-800 px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-50 transition-all font-medium inline-block text-sm sm:text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  View Subscription Options
                </motion.button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SubscriptionPlans;