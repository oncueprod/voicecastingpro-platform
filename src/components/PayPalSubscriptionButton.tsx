import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { paypalEscrowService } from '../services/paypalService';

interface PayPalSubscriptionButtonProps {
  planId: string;
  userId: string;
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: any) => void;
  className?: string;
  buttonText?: string;
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
  const isProduction = import.meta.env.PROD;
  
  const handleSubscribe = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Create a subscription
      const { id, approvalUrl } = await paypalEscrowService.createSubscription(
        planId,
        userId,
        `${window.location.origin}/subscription/success`,
        `${window.location.origin}/subscription/cancel`
      );
      
      if (isProduction) {
        // In production, redirect to PayPal approval URL
        window.location.href = approvalUrl;
      } else {
        // In development, simulate the approval
        console.log('Subscription created:', { id, approvalUrl });
        
        // Simulate user approval
        await new Promise(resolve => setTimeout(resolve, 2000));
        await paypalEscrowService.activateSubscription(id);
        
        setIsProcessing(false);
        
        if (onSuccess) {
          onSuccess(id);
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
      
      <motion.button
        onClick={handleSubscribe}
        disabled={isProcessing}
        className={`${className || 'w-full bg-[#0070ba] hover:bg-[#003087] text-white py-3 rounded-lg transition-colors font-medium'} disabled:opacity-70 disabled:cursor-not-allowed`}
        whileHover={{ scale: isProcessing ? 1 : 1.02 }}
        whileTap={{ scale: isProcessing ? 1 : 0.98 }}
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Processing...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            {buttonText}
          </div>
        )}
      </motion.button>
    </div>
  );
};

export default PayPalSubscriptionButton;