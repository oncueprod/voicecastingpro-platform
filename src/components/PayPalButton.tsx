import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface PayPalButtonProps {
  amount: string;
  currency?: string;
  onSuccess?: (details: any) => void;
  onError?: (error: any) => void;
  style?: React.CSSProperties;
  className?: string;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const PayPalButton: React.FC<PayPalButtonProps> = ({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  style,
  className
}) => {
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const paypalRef = useRef<HTMLDivElement>(null);
  const isProduction = import.meta.env.PROD;
  
  // Load the PayPal SDK
  useEffect(() => {
    const addPayPalScript = () => {
      const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb';
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}`;
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
  }, [currency]);
  
  // Render the PayPal button
  useEffect(() => {
    if (sdkReady && paypalRef.current && window.paypal) {
      // Clear any existing buttons
      paypalRef.current.innerHTML = '';
      
      // Create the PayPal button
      window.paypal.Buttons({
        createOrder: (data: any, actions: any) => {
          setIsProcessing(true);
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  currency_code: currency,
                  value: amount
                }
              }
            ]
          });
        },
        onApprove: async (data: any, actions: any) => {
          try {
            const details = await actions.order.capture();
            setIsProcessing(false);
            if (onSuccess) {
              onSuccess(details);
            }
          } catch (err) {
            setIsProcessing(false);
            setError('Payment failed. Please try again.');
            if (onError) {
              onError(err);
            }
          }
        },
        onError: (err: any) => {
          setIsProcessing(false);
          setError('Payment failed. Please try again.');
          if (onError) {
            onError(err);
          }
        },
        onCancel: () => {
          setIsProcessing(false);
        }
      }).render(paypalRef.current);
    }
  }, [sdkReady, amount, currency, onSuccess, onError]);
  
  // For development environment, we'll simulate the PayPal button
  const handleSimulatedPayment = () => {
    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      if (onSuccess) {
        onSuccess({
          id: `SIMULATED_ORDER_${Date.now()}`,
          status: 'COMPLETED',
          payer: {
            email_address: 'customer@example.com',
            payer_id: `PAYER_${Date.now()}`
          },
          purchase_units: [
            {
              amount: {
                value: amount,
                currency_code: currency
              }
            }
          ],
          create_time: new Date().toISOString(),
          update_time: new Date().toISOString()
        });
      }
    }, 2000);
  };
  
  return (
    <div className={className}>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Real PayPal button container */}
      <div ref={paypalRef} style={style}></div>
      
      {/* Simulated button for development environment */}
      {(!window.paypal || !isProduction) && (
        <motion.button
          onClick={handleSimulatedPayment}
          disabled={isProcessing}
          className="w-full bg-[#0070ba] hover:bg-[#003087] text-white py-3 rounded-lg transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          whileHover={{ scale: isProcessing ? 1 : 1.02 }}
          whileTap={{ scale: isProcessing ? 1 : 0.98 }}
          style={style}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <span className="font-bold">Pay</span>
              <span>with</span>
              <span className="font-bold">PayPal</span>
            </div>
          )}
        </motion.button>
      )}
    </div>
  );
};

export default PayPalButton;