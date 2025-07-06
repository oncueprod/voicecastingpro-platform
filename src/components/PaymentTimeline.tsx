import React from 'react';
import { CheckCircle, Clock, DollarSign, Shield, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { EscrowPayment } from '../services/escrowService';

interface PaymentTimelineProps {
  payment: EscrowPayment;
}

const PaymentTimeline: React.FC<PaymentTimelineProps> = ({ payment }) => {
  const steps = [
    {
      id: 'created',
      label: 'Payment Created',
      description: 'Escrow payment created',
      icon: DollarSign,
      date: payment.createdAt,
      completed: true
    },
    {
      id: 'funded',
      label: 'Funds Secured',
      description: 'Payment held in escrow',
      icon: Shield,
      date: payment.fundedAt,
      completed: payment.status !== 'pending'
    },
    {
      id: 'released',
      label: 'Payment Released',
      description: 'Funds sent to talent',
      icon: CheckCircle,
      date: payment.releasedAt,
      completed: payment.status === 'released'
    }
  ];

  return (
    <div className="py-4">
      <h4 className="text-lg font-semibold text-white mb-6">Payment Timeline</h4>
      
      <div className="relative">
        {/* Vertical line connecting steps */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-600"></div>
        
        {/* Timeline steps */}
        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              <div className="flex items-start">
                <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${
                  step.completed 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-gray-400'
                }`}>
                  <step.icon className="h-5 w-5" />
                </div>
                
                <div className="ml-4 flex-1">
                  <h5 className={`font-medium ${step.completed ? 'text-white' : 'text-gray-400'}`}>
                    {step.label}
                  </h5>
                  
                  <p className="text-sm text-gray-400 mt-1">
                    {step.description}
                  </p>
                  
                  {step.date ? (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(step.date).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      {step.completed ? 'Completed' : 'Pending'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {/* Auto-release indicator */}
          {payment.status === 'funded' && (
            <div className="relative">
              <div className="flex items-start">
                <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-yellow-600/50 text-yellow-300">
                  <Clock className="h-5 w-5" />
                </div>
                
                <div className="ml-4 flex-1">
                  <h5 className="font-medium text-yellow-300">
                    Auto-Release Scheduled
                  </h5>
                  
                  <p className="text-sm text-gray-400 mt-1">
                    Payment will auto-release in 14 days if not approved
                  </p>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {/* Calculate 14 days from funded date */}
                    {payment.fundedAt ? 
                      new Date(new Date(payment.fundedAt).getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString() : 
                      'Date pending'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Dispute indicator if applicable */}
          {payment.status === 'disputed' && (
            <div className="relative">
              <div className="flex items-start">
                <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-red-600/50 text-red-300">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                
                <div className="ml-4 flex-1">
                  <h5 className="font-medium text-red-300">
                    Payment Disputed
                  </h5>
                  
                  <p className="text-sm text-gray-400 mt-1">
                    This payment is under review by our support team
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentTimeline;