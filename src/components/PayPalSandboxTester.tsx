import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, CheckCircle, AlertCircle, RefreshCw, DollarSign, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface PayPalSandboxTesterProps {
  onBack: () => void;
}

const PayPalSandboxTester: React.FC<PayPalSandboxTesterProps> = ({ onBack }) => {
  const [paypalConfig, setPaypalConfig] = useState({
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb',
    clientSecret: '**********', // Never display the actual secret
    environment: import.meta.env.VITE_PAYPAL_ENVIRONMENT || 'sandbox',
    escrowEmail: import.meta.env.VITE_PAYPAL_ESCROW_EMAIL || 'escrow@voicecastingpro.com'
  });
  
  const [testMode, setTestMode] = useState<'order' | 'subscription' | 'escrow'>('order');
  const [amount, setAmount] = useState('99.99');
  const [currency, setCurrency] = useState('USD');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Simulate loading the PayPal SDK
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  
  useEffect(() => {
    // Simulate loading the PayPal SDK
    const loadPayPalScript = async () => {
      try {
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb';
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        script.async = true;
        script.onload = () => {
          setSdkReady(true);
          console.log('PayPal SDK loaded successfully');
        };
        script.onerror = () => {
          setSdkError('Failed to load PayPal SDK. Check your client ID and internet connection.');
          console.error('Failed to load PayPal SDK');
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error loading PayPal SDK:', error);
        setSdkError('Error initializing PayPal SDK');
      }
    };
    
    loadPayPalScript();
    
    // Cleanup
    return () => {
      const script = document.querySelector('script[src*="paypal.com/sdk/js"]');
      if (script) {
        document.body.removeChild(script);
      }
    };
  }, []);
  
  const handleCreateTransaction = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }
    
    setPaymentStatus('processing');
    setErrorMessage('');
    
    try {
      // Simulate API call to create a transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a mock transaction ID
      const mockTransactionId = `PAYPAL_${testMode.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      setTransactionId(mockTransactionId);
      
      setPaymentStatus('success');
    } catch (error) {
      setPaymentStatus('error');
      setErrorMessage('Failed to create transaction. Please check your configuration and try again.');
    }
  };
  
  const handleCapturePayment = async () => {
    if (!transactionId) {
      setErrorMessage('No transaction to capture');
      return;
    }
    
    setPaymentStatus('processing');
    
    try {
      // Simulate API call to capture the payment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPaymentStatus('success');
    } catch (error) {
      setPaymentStatus('error');
      setErrorMessage('Failed to capture payment. Please try again.');
    }
  };
  
  const resetTest = () => {
    setPaymentStatus('idle');
    setErrorMessage('');
    setTransactionId('');
  };
  
  const renderTestUI = () => {
    switch (testMode) {
      case 'order':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Test PayPal Order API</h3>
            <p className="text-gray-300">
              Create and capture one-time payments using PayPal's Order API.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="99.99"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>
            </div>
            
            {paymentStatus === 'idle' && (
              <motion.button
                onClick={handleCreateTransaction}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create Order
              </motion.button>
            )}
            
            {paymentStatus === 'processing' && (
              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <p className="text-blue-300">Processing your request...</p>
              </div>
            )}
            
            {paymentStatus === 'success' && transactionId && (
              <div className="space-y-4">
                <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <p className="text-green-300 font-medium">Order created successfully!</p>
                  </div>
                  <p className="text-green-300 text-sm">Transaction ID: {transactionId}</p>
                </div>
                
                <div className="bg-slate-700 rounded-lg p-6 border border-gray-600">
                  <h4 className="text-lg font-medium text-white mb-4">Simulate PayPal Checkout</h4>
                  <p className="text-gray-300 mb-4">
                    In a real implementation, the user would be redirected to PayPal at this point.
                    For testing purposes, we'll simulate the approval process.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <motion.button
                      onClick={handleCapturePayment}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Simulate Approval & Capture
                    </motion.button>
                    
                    <motion.button
                      onClick={resetTest}
                      className="flex-1 border border-gray-600 text-gray-300 py-3 rounded-lg hover:border-red-600 hover:text-red-400 transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel & Reset
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case 'subscription':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Test PayPal Subscription API</h3>
            <p className="text-gray-300">
              Create and manage recurring payments using PayPal's Subscription API.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="35.00"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>
            </div>
            
            {paymentStatus === 'idle' && (
              <motion.button
                onClick={handleCreateTransaction}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create Subscription
              </motion.button>
            )}
            
            {paymentStatus === 'processing' && (
              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <p className="text-blue-300">Processing your request...</p>
              </div>
            )}
            
            {paymentStatus === 'success' && transactionId && (
              <div className="space-y-4">
                <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <p className="text-green-300 font-medium">Subscription created successfully!</p>
                  </div>
                  <p className="text-green-300 text-sm">Subscription ID: {transactionId}</p>
                </div>
                
                <div className="bg-slate-700 rounded-lg p-6 border border-gray-600">
                  <h4 className="text-lg font-medium text-white mb-4">Simulate PayPal Subscription Approval</h4>
                  <p className="text-gray-300 mb-4">
                    In a real implementation, the user would be redirected to PayPal to approve the subscription.
                    For testing purposes, we'll simulate the approval process.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <motion.button
                      onClick={handleCapturePayment}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Simulate Approval
                    </motion.button>
                    
                    <motion.button
                      onClick={resetTest}
                      className="flex-1 border border-gray-600 text-gray-300 py-3 rounded-lg hover:border-red-600 hover:text-red-400 transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel & Reset
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case 'escrow':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Test PayPal Escrow Payments</h3>
            <p className="text-gray-300">
              Simulate the escrow payment flow for voice talent projects.
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="250.00"
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="AUD">AUD - Australian Dollar</option>
                </select>
              </div>
            </div>
            
            <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <Shield className="h-5 w-5 text-blue-400" />
                <p className="text-blue-300 font-medium">Escrow Payment Flow</p>
              </div>
              <p className="text-blue-300 text-sm">
                1. Client creates escrow payment<br />
                2. Funds are held securely by PayPal<br />
                3. Talent delivers the work<br />
                4. Client approves and releases payment
              </p>
            </div>
            
            {paymentStatus === 'idle' && (
              <motion.button
                onClick={handleCreateTransaction}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create Escrow Payment
              </motion.button>
            )}
            
            {paymentStatus === 'processing' && (
              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <p className="text-blue-300">Processing your request...</p>
              </div>
            )}
            
            {paymentStatus === 'success' && transactionId && (
              <div className="space-y-4">
                <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <p className="text-green-300 font-medium">Escrow payment created successfully!</p>
                  </div>
                  <p className="text-green-300 text-sm">Escrow ID: {transactionId}</p>
                </div>
                
                <div className="bg-slate-700 rounded-lg p-6 border border-gray-600">
                  <h4 className="text-lg font-medium text-white mb-4">Simulate Escrow Flow</h4>
                  <p className="text-gray-300 mb-4">
                    In a real implementation, the client would fund the escrow via PayPal, then release the payment after approving the work.
                  </p>
                  
                  <div className="space-y-4">
                    <motion.button
                      onClick={handleCapturePayment}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Simulate Fund Escrow
                    </motion.button>
                    
                    <motion.button
                      onClick={resetTest}
                      className="w-full border border-gray-600 text-gray-300 py-3 rounded-lg hover:border-blue-600 hover:text-blue-400 transition-colors font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Simulate Release Payment
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
    }
  };
  
  return (
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
          <span>Back to Dashboard</span>
        </motion.button>
        
        {/* Header */}
        <motion.div 
          className="bg-slate-800 rounded-2xl p-8 mb-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-blue-900/50 p-3 rounded-xl">
              <CreditCard className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">PayPal Sandbox Tester</h1>
          </div>
          <p className="text-gray-300">
            Test PayPal integration in sandbox mode without leaving the Bolt preview environment.
          </p>
          
          {/* PayPal SDK Status */}
          <div className="mt-4 flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${sdkReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm text-gray-400">
              {sdkReady ? 'PayPal SDK Ready' : 'Loading PayPal SDK...'}
            </span>
          </div>
          
          {sdkError && (
            <div className="mt-2 bg-red-900/30 border border-red-600/50 rounded-lg p-3 text-sm">
              <p className="text-red-300">{sdkError}</p>
            </div>
          )}
        </motion.div>
        
        {/* Test Mode Selector */}
        <motion.div 
          className="bg-slate-800 rounded-2xl p-8 mb-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">Select Test Mode</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <motion.button
              onClick={() => setTestMode('order')}
              className={`p-4 rounded-xl border transition-colors ${
                testMode === 'order' 
                  ? 'bg-blue-900/30 border-blue-600 text-white' 
                  : 'border-gray-600 text-gray-300 hover:border-blue-600 hover:text-blue-400'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-center">
                <DollarSign className={`h-8 w-8 mx-auto mb-2 ${testMode === 'order' ? 'text-blue-400' : 'text-gray-400'}`} />
                <h3 className="font-medium">One-Time Payment</h3>
                <p className="text-xs mt-1 opacity-80">Test PayPal Order API</p>
              </div>
            </motion.button>
            
            <motion.button
              onClick={() => setTestMode('subscription')}
              className={`p-4 rounded-xl border transition-colors ${
                testMode === 'subscription' 
                  ? 'bg-blue-900/30 border-blue-600 text-white' 
                  : 'border-gray-600 text-gray-300 hover:border-blue-600 hover:text-blue-400'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-center">
                <RefreshCw className={`h-8 w-8 mx-auto mb-2 ${testMode === 'subscription' ? 'text-blue-400' : 'text-gray-400'}`} />
                <h3 className="font-medium">Subscription</h3>
                <p className="text-xs mt-1 opacity-80">Test PayPal Subscription API</p>
              </div>
            </motion.button>
            
            <motion.button
              onClick={() => setTestMode('escrow')}
              className={`p-4 rounded-xl border transition-colors ${
                testMode === 'escrow' 
                  ? 'bg-blue-900/30 border-blue-600 text-white' 
                  : 'border-gray-600 text-gray-300 hover:border-blue-600 hover:text-blue-400'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-center">
                <Shield className={`h-8 w-8 mx-auto mb-2 ${testMode === 'escrow' ? 'text-blue-400' : 'text-gray-400'}`} />
                <h3 className="font-medium">Escrow Payment</h3>
                <p className="text-xs mt-1 opacity-80">Test Secure Escrow Flow</p>
              </div>
            </motion.button>
          </div>
        </motion.div>
        
        {/* Configuration */}
        <motion.div 
          className="bg-slate-800 rounded-2xl p-8 mb-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">PayPal Configuration</h2>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Environment
              </label>
              <select
                value={paypalConfig.environment}
                onChange={(e) => setPaypalConfig(prev => ({ ...prev, environment: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                disabled={!showAdvanced}
              >
                <option value="sandbox">Sandbox (Testing)</option>
                <option value="live" disabled>Live (Production)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={paypalConfig.clientId}
                onChange={(e) => setPaypalConfig(prev => ({ ...prev, clientId: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="Your PayPal Client ID"
                disabled={!showAdvanced}
              />
              <p className="text-sm text-gray-500 mt-1">
                {paypalConfig.clientId 
                  ? 'Client ID is configured' 
                  : 'Add your PayPal Client ID to .env file as VITE_PAYPAL_CLIENT_ID'}
              </p>
            </div>
            
            {showAdvanced && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={paypalConfig.clientSecret}
                    onChange={(e) => setPaypalConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="Your PayPal Client Secret"
                    disabled
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Add your PayPal Client Secret to .env file as VITE_PAYPAL_CLIENT_SECRET
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Escrow Email
                  </label>
                  <input
                    type="email"
                    value={paypalConfig.escrowEmail}
                    onChange={(e) => setPaypalConfig(prev => ({ ...prev, escrowEmail: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="escrow@voicecastingpro.com"
                  />
                </div>
              </>
            )}
          </div>
        </motion.div>
        
        {/* Test Interface */}
        <motion.div 
          className="bg-slate-800 rounded-2xl p-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {renderTestUI()}
          
          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 bg-red-900/30 border border-red-600/50 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300">{errorMessage}</p>
            </div>
          )}
          
          <div className="text-center">
            <p className="text-gray-300 mb-4">No payment history available</p>
          </div>
          
          {/* PayPal Client ID Status */}
          <div className="mt-4 bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
            <h4 className="text-lg font-medium text-white mb-3">PayPal Client ID Status</h4>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${paypalConfig.clientId && paypalConfig.clientId !== 'sb' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className="text-sm text-gray-300">
                {paypalConfig.clientId && paypalConfig.clientId !== 'sb' 
                  ? 'Custom PayPal Client ID detected' 
                  : 'Using PayPal Sandbox default client ID (sb)'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {paypalConfig.clientId && paypalConfig.clientId !== 'sb'
                ? 'Your custom PayPal Client ID is configured correctly.'
                : 'For full functionality, add your PayPal Client ID to the .env file as VITE_PAYPAL_CLIENT_ID'}
            </p>
          </div>
        </motion.div>
        
        {/* Documentation */}
        <motion.div 
          className="bg-slate-800 rounded-2xl p-8 mt-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h2 className="text-xl font-bold text-white mb-4">PayPal Integration Guide</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Setting Up Your Environment</h3>
              <div className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                <p className="text-gray-300 text-sm mb-2">Add these variables to your <code className="bg-slate-800 px-2 py-1 rounded">.env</code> file:</p>
                <pre className="bg-slate-800 p-3 rounded text-gray-300 text-sm overflow-x-auto">
                  <code>
                    VITE_PAYPAL_CLIENT_ID=your_paypal_client_id_here
                    VITE_PAYPAL_CLIENT_SECRET=your_paypal_client_secret_here
                    VITE_PAYPAL_ENVIRONMENT=sandbox
                    VITE_PAYPAL_ESCROW_EMAIL=escrow@voicecastingpro.com
                    VITE_PAYPAL_MONTHLY_PLAN_ID=P-MONTHLY-PLAN-ID
                    VITE_PAYPAL_ANNUAL_PLAN_ID=P-ANNUAL-PLAN-ID
                  </code>
                </pre>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Frontend Implementation</h3>
              <div className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                <p className="text-gray-300 text-sm mb-2">Load the PayPal JavaScript SDK:</p>
                <pre className="bg-slate-800 p-3 rounded text-gray-300 text-sm overflow-x-auto">
                  <code>
                    {`// Add this to your component\n`}
                    {`useEffect(() => {\n`}
                    {`  const script = document.createElement('script');\n`}
                    {`  script.src = \`https://www.paypal.com/sdk/js?client-id=\${import.meta.env.VITE_PAYPAL_CLIENT_ID}&currency=USD&intent=subscription\`;\n`}
                    {`  script.async = true;\n`}
                    {`  document.body.appendChild(script);\n`}
                    {`}, []);`}
                  </code>
                </pre>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Backend Implementation</h3>
              <div className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                <p className="text-gray-300 text-sm mb-2">Create a secure backend endpoint for PayPal operations:</p>
                <pre className="bg-slate-800 p-3 rounded text-gray-300 text-sm overflow-x-auto">
                  <code>
                    {`// Example Node.js endpoint for creating an order\n`}
                    {`app.post('/api/create-paypal-order', async (req, res) => {\n`}
                    {`  try {\n`}
                    {`    const { amount, currency = 'USD' } = req.body;\n`}
                    {`    const response = await fetch(\`\${PAYPAL_API}/v2/checkout/orders\`, {\n`}
                    {`      method: 'POST',\n`}
                    {`      headers: {\n`}
                    {`        'Content-Type': 'application/json',\n`}
                    {`        Authorization: \`Bearer \${accessToken}\`,\n`}
                    {`      },\n`}
                    {`      body: JSON.stringify({\n`}
                    {`        intent: 'CAPTURE',\n`}
                    {`        purchase_units: [{\n`}
                    {`          amount: {\n`}
                    {`            currency_code: currency,\n`}
                    {`            value: amount,\n`}
                    {`          },\n`}
                    {`        }],\n`}
                    {`      }),\n`}
                    {`    });\n`}
                    {`    const data = await response.json();\n`}
                    {`    res.json(data);\n`}
                    {`  } catch (error) {\n`}
                    {`    res.status(500).json({ error: error.message });\n`}
                    {`  }\n`}
                    {`});`}
                  </code>
                </pre>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Subscription Implementation</h3>
              <div className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                <p className="text-gray-300 text-sm mb-2">Example code for implementing PayPal subscriptions:</p>
                <pre className="bg-slate-800 p-3 rounded text-gray-300 text-sm overflow-x-auto">
                  <code>
                    {`// Create a PayPal subscription button\n`}
                    {`window.paypal.Buttons({\n`}
                    {`  style: {\n`}
                    {`    shape: 'rect',\n`}
                    {`    color: 'blue',\n`}
                    {`    layout: 'vertical',\n`}
                    {`    label: 'subscribe'\n`}
                    {`  },\n`}
                    {`  createSubscription: (data, actions) => {\n`}
                    {`    return actions.subscription.create({\n`}
                    {`      'plan_id': 'P-PLAN-ID-FROM-PAYPAL',\n`}
                    {`      'application_context': {\n`}
                    {`        'shipping_preference': 'NO_SHIPPING',\n`}
                    {`        'user_action': 'SUBSCRIBE_NOW'\n`}
                    {`      }\n`}
                    {`    });\n`}
                    {`  },\n`}
                    {`  onApprove: (data, actions) => {\n`}
                    {`    console.log('Subscription approved:', data.subscriptionID);\n`}
                    {`    // Handle successful subscription\n`}
                    {`    return actions.order.capture();\n`}
                    {`  }\n`}
                    {`}).render('#paypal-button-container');`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PayPalSandboxTester;