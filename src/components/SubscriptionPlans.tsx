import React, { useState } from 'react';
import { Check, Shield, CreditCard, Star, HelpCircle, Mic, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import PayPalSubscriptionButton from './PayPalSubscriptionButton';

const SubscriptionPlans: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'none' | 'pending' | 'active' | 'cancelled'>('none');
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const { user } = useAuth();
  const isProduction = import.meta.env.PROD;

  const plans = {
    monthly: {
      price: 35,
      period: 'per month, billed monthly',
      savings: null,
      planId: 'P-MONTHLY-PLAN-ID'
    },
    annual: {
      price: 348,
      period: 'per year, billed annually',
      savings: 'Save $72 per year!',
      planId: 'P-ANNUAL-PLAN-ID'
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

  const handleSubscriptionSuccess = (subId: string) => {
    setSubscriptionId(subId);
    setSubscriptionStatus('active');
    
    // In a real implementation, you would store this in your database
    localStorage.setItem('user_subscription', JSON.stringify({
      id: subId,
      userId: user?.id,
      planType: billingCycle,
      status: 'active',
      startDate: new Date().toISOString()
    }));
    
    alert(`Subscription created successfully! Your ${billingCycle} plan is now active.`);
  };

  const handleSubscriptionError = (error: any) => {
    console.error('Subscription error:', error);
    alert('Failed to create subscription. Please try again.');
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionId) return;
    
    const confirmed = window.confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period.');
    
    if (confirmed) {
      try {
        await paypalEscrowService.cancelSubscription(
          subscriptionId,
          'User requested cancellation'
        );
        
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
  React.useEffect(() => {
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
            href="/"
            className="flex items-center space-x-2 text-white/80 hover:text-white mb-8 transition-colors"
            whileHover={{ x: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </motion.a>
          
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
                Choose Your Subscription Plan
              </h1>
            </div>
            <p className="text-xl text-white/90 max-w-3xl mx-auto mb-8">
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
            
            {/* Sandbox Notice - Only in development */}
            {!isProduction && (
              <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 max-w-2xl mx-auto mb-8 backdrop-blur-sm">
                <p className="text-yellow-300 text-sm">
                  🧪 <strong>Sandbox Mode:</strong> This is a test environment. No real payments will be processed.
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
            className="flex justify-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white/10 rounded-xl p-2 border border-white/20 backdrop-blur-sm">
              <div className="flex space-x-2">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-blue-800'
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all relative ${
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
            className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16"
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
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Monthly Plan
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">
                    ${plans.monthly.price}
                  </span>
                </div>
                <p className="text-white/80 text-sm mb-4">
                  {plans.monthly.period}
                </p>
                <p className="text-blue-300 text-sm font-medium">
                  via PayPal
                </p>
              </div>

              <div className="space-y-4 mb-8">
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
                <div className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold mb-4 text-center">
                  Current Plan
                </div>
              ) : (
                <PayPalSubscriptionButton
                  planId={plans.monthly.planId}
                  userId={user?.id || 'guest'}
                  onSuccess={handleSubscriptionSuccess}
                  onError={handleSubscriptionError}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg transition-all font-semibold mb-4"
                  buttonText="Subscribe with PayPal"
                />
              )}
              
              <p className="text-center text-xs text-white/60">
                Secure payment processing by PayPal
              </p>
            </div>

            {/* Annual Plan */}
            <div className={`bg-white/10 rounded-2xl p-8 border-2 transition-all relative backdrop-blur-sm ${
              billingCycle === 'annual' 
                ? 'border-white/50 shadow-lg shadow-blue-600/20 scale-105' 
                : 'border-white/20'
            }`}>
              {billingCycle === 'annual' && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                    BEST VALUE
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Annual Plan
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-white">
                    ${plans.annual.price}
                  </span>
                </div>
                <p className="text-white/80 text-sm mb-2">
                  {plans.annual.period}
                </p>
                <p className="text-green-400 text-sm font-medium mb-2">
                  {plans.annual.savings}
                </p>
                <p className="text-blue-300 text-sm font-medium">
                  via PayPal
                </p>
              </div>

              <div className="space-y-4 mb-8">
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
                <div className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold mb-4 text-center">
                  Current Plan
                </div>
              ) : (
                <PayPalSubscriptionButton
                  planId={plans.annual.planId}
                  userId={user?.id || 'guest'}
                  onSuccess={handleSubscriptionSuccess}
                  onError={handleSubscriptionError}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg transition-all font-semibold mb-4"
                  buttonText="Subscribe with PayPal"
                />
              )}
              
              <p className="text-center text-xs text-white/60">
                Secure payment processing by PayPal
              </p>
            </div>
          </motion.div>

          {/* PayPal Security Info */}
          <motion.div 
            className="mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
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
            transition={{ duration: 0.6, delay: 0.8 }}
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
            transition={{ duration: 0.6, delay: 1.0 }}
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
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <div className="bg-white/10 rounded-2xl p-8 border border-white/20 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-4">
                Need help with your subscription?
              </h3>
              <p className="text-white/80 mb-6">
                Contact our support team for assistance with billing, plan changes, or any questions.
              </p>
              <motion.a 
                href="/contact-us"
                className="bg-white text-blue-800 px-6 py-3 rounded-lg hover:bg-blue-50 transition-all font-medium inline-block"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Contact Support
              </motion.a>
            </div>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SubscriptionPlans;