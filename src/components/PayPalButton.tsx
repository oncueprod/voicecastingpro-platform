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
  
  return (
    <div className={className}>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* PayPal button container */}
      <div ref={paypalRef} style={style}></div>
      
      {/* Loading indicator */}
      {!sdkReady && (
        <div className="flex items-center justify-center space-x-2 p-3 bg-gray-100 border border-gray-300 rounded">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading PayPal...</span>
        </div>
      )}
    </div>
  );
};

export default PayPalButton;