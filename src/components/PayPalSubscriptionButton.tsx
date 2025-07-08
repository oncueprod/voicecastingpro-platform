import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface PayPalSubscriptionButtonProps {
  planId: string;
  userId: string;
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: any) => void;
  className?: string;
  buttonText?: string;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const PayPalSubscriptionButton: React.FC<PayPalSubscriptionButtonProps> = ({
  planId,
  userId,
  onSuccess,
  onError,
  className,
  buttonText = 'Subscribe with PayPal'
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [paypalRendered, setPaypalRendered] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, isTalent } = useAuth();
  
  // Check if PayPal SDK is already loaded
  useEffect(() => {
    const checkPayPalSDK = () => {
      if (window.paypal && window.paypal.Buttons) {
        setSdkReady(true);
        return true;
      }
      return false;
    };
    
    // Check immediately
    if (checkPayPalSDK()) {
      return;
    }
    
    // If not ready, check every 100ms for up to 10 seconds
    const interval = setInterval(() => {
      if (checkPayPalSDK()) {
        clearInterval(interval);
      }
    }, 100);
    
    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!window.paypal || !window.paypal.Buttons) {
        setError('PayPal SDK failed to load. Please refresh the page and try again.');
      }
    }, 10000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);
  
  // Render the PayPal button when SDK is ready
  useEffect(() => {
    if (sdkReady && paypalContainerRef.current && window.paypal && window.paypal.Buttons && !paypalRendered) {
      try {
        // Clear any existing content
        paypalContainerRef.current.innerHTML = '';
        
        window.paypal.Buttons({
          style: {
            shape: 'rect',
            color: 'blue',
            layout: 'vertical',
            label: 'subscribe',
            height: 50
          },
          createSubscription: (data: any, actions: any) => {
            console.log('Creating subscription for plan:', planId);
            setIsProcessing(true);
            setError(null);
            
            return actions.subscription.create({
              'plan_id': planId,
              'application_context': {
                'shipping_preference': 'NO_SHIPPING',
                'user_action': 'SUBSCRIBE_NOW',
                'return_url': window.location.href,
                'cancel_url': window.location.href
              }
            });
          },
          onApprove: (data: any, actions: any) => {
            console.log('Subscription approved:', data);
            setIsProcessing(false);
            
            // Store subscription data
            try {
              localStorage.setItem('user_subscription', JSON.stringify({
                id: data.subscriptionID,
                userId: userId,
                planType: planId.includes('MONTHLY') ? 'monthly' : 'annual',
                status: 'active',
                startDate: new Date().toISOString()
              }));
              
              if (onSuccess) {
                onSuccess(data.subscriptionID);
              }
            } catch (err) {
              console.error('Error storing subscription:', err);
              setError('Subscription created but failed to save locally. Please contact support.');
            }
          },
          onError: (err: any) => {
            console.error('PayPal subscription error:', err);
            setIsProcessing(false);
            const errorMessage = 'Payment failed. Please try again or contact support.';
            setError(errorMessage);
            if (onError) {
              onError(new Error(errorMessage));
            }
          },
          onCancel: () => {
            console.log('Subscription cancelled by user');
            setIsProcessing(false);
            setError('Payment was cancelled. You can try again anytime.');
          }
        }).render(paypalContainerRef.current).then(() => {
          console.log('PayPal button rendered successfully');
          setPaypalRendered(true);
        }).catch((renderError: any) => {
          console.error('PayPal button render error:', renderError);
          setError('Failed to load PayPal button. Please refresh the page and try again.');
        });
        
      } catch (err) {
        console.error('PayPal button setup error:', err);
        setError('Failed to initialize PayPal. Please refresh the page and try again.');
      }
    }
  }, [sdkReady, planId, userId, onSuccess, onError, paypalRendered]);

  // Validation before showing PayPal button
  const canSubscribe = isAuthenticated && isTalent;
  
  if (!canSubscribe) {
    return (
      <div className={className}>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          {!isAuthenticated ? 'Please sign in to subscribe' : 'Only talent accounts can subscribe'}
        </div>
      </div>
    );
  }
  
  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          ❌ {error}
        </div>
      )}
      
      {!sdkReady && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4 text-sm">
          🔄 Loading PayPal...
        </div>
      )}
      
      {sdkReady && !paypalRendered && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 text-sm">
          ⚙️ Initializing PayPal button...
        </div>
      )}
      
      {/* PayPal button container - this will be populated by PayPal SDK */}
      <div 
        ref={paypalContainerRef} 
        className={`${sdkReady && paypalRendered ? 'block' : 'hidden'}`}
        style={{ minHeight: '50px' }}
      >
        {/* PayPal button will be rendered here */}
      </div>
      
      {/* Fallback custom button if PayPal fails to load */}
      {!sdkReady && (
        <motion.button
          onClick={() => window.location.reload()}
          className={`${className || 'w-full bg-[#0070ba] hover:bg-[#003087] text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center'}`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center justify-center space-x-2 w-full">
            <img 
              src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/pp-acceptance-small.png" 
              alt="PayPal" 
              className="h-5 mr-2"
            />
            Reload PayPal
          </div>
        </motion.button>
      )}
      
      {isProcessing && (
        <div className="mt-2 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded text-sm">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
            <span>Processing your subscription...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayPalSubscriptionButton;
