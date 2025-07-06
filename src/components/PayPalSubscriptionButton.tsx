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
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, isTalent } = useAuth();
  
  // Load the PayPal SDK
  useEffect(() => {
    const addPayPalScript = () => {
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb';
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
      script.async = true;
      script.onload = () => {
        setSdkReady(true);
      };
      script.onerror = () => {
        setError('Failed to load PayPal SDK. Please try again later.');
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
  }, []);
  
  // Render the PayPal button
  useEffect(() => {
    if (sdkReady && paypalContainerRef.current && window.paypal) {
      // Clear any existing buttons
      paypalContainerRef.current.innerHTML = '';
      
      window.paypal.Buttons({
        style: {
          shape: 'rect',
          color: 'blue',
          layout: 'vertical',
          label: 'subscribe'
        },
        createSubscription: (data: any, actions: any) => {
          setIsProcessing(true);
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
          
          return actions.order?.capture();
        },
        onError: (err: any) => {
          console.error('PayPal error:', err);
          setIsProcessing(false);
          setError('An error occurred with PayPal. Please try again.');
          if (onError) {
            onError(err);
          }
        },
        onCancel: () => {
          console.log('Subscription cancelled');
          setIsProcessing(false);
        }
      }).render(paypalContainerRef.current);
    }
  }, [sdkReady, planId, userId, onSuccess, onError]);

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      setError("You must be signed in to subscribe");
      if (onError) onError(new Error("You must be signed in to subscribe"));
      return;
    }
    
    if (!isTalent) {
      setError("Only talent accounts can subscribe to plans");
      if (onError) onError(new Error("Only talent accounts can subscribe to plans"));
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // This will trigger the PayPal button click programmatically
      if (paypalContainerRef.current) {
        const paypalButton = paypalContainerRef.current.querySelector('[data-funding-source="paypal"]');
        if (paypalButton) {
          (paypalButton as HTMLElement).click();
        } else {
          throw new Error('PayPal button not found');
        }
      }
    } catch (err) {
      setIsProcessing(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create subscription';
      setError(errorMessage);
      
      if (onError) {
        onError(err);
      }
    }
  };
  
  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Hidden PayPal button container */}
      <div ref={paypalContainerRef} className="hidden"></div>
      
      {/* Custom button that will trigger the PayPal flow */}
      <motion.button
        onClick={handleSubscribe}
        disabled={isProcessing || !sdkReady}
        className={`${className || 'w-full bg-[#0070ba] hover:bg-[#003087] text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center'} disabled:opacity-70 disabled:cursor-not-allowed`}
        whileHover={{ scale: isProcessing ? 1 : 1.02 }}
        whileTap={{ scale: isProcessing ? 1 : 0.98 }}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Processing...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2 w-full">
            <img 
              src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/pp-acceptance-small.png" 
              alt="PayPal" 
              className="h-5 mr-2"
            />
            {buttonText}
          </div>
        )}
      </motion.button>
    </div>
  );
};

export default PayPalSubscriptionButton;