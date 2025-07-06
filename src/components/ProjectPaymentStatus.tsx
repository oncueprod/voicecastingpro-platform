import React from 'react';
import { Shield, Clock, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { EscrowPayment } from '../services/escrowService';

interface ProjectPaymentStatusProps {
  payment: EscrowPayment;
  isClient: boolean;
  onViewDetails?: () => void;
}

const ProjectPaymentStatus: React.FC<ProjectPaymentStatusProps> = ({
  payment,
  isClient,
  onViewDetails
}) => {
  const getStatusIcon = () => {
    switch (payment.status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'funded':
        return <Shield className="h-5 w-5 text-blue-500" />;
      case 'released':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disputed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusLabel = () => {
    switch (payment.status) {
      case 'pending':
        return 'Deposit Pending';
      case 'funded':
        return 'Deposit Received';
      case 'released':
        return 'Paid Out';
      case 'disputed':
        return 'Payment Disputed';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusDescription = () => {
    switch (payment.status) {
      case 'pending':
        return isClient 
          ? 'Please complete payment to start the project' 
          : 'Waiting for client to fund the escrow';
      case 'funded':
        return isClient 
          ? 'Funds are securely held while work is in progress' 
          : 'Funds are secured in escrow for your work';
      case 'released':
        return isClient 
          ? 'Payment has been released to the talent' 
          : 'Payment has been sent to your account';
      case 'disputed':
        return 'This payment is currently under dispute resolution';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (payment.status) {
      case 'pending':
        return 'bg-yellow-900/30 border-yellow-600/50 text-yellow-300';
      case 'funded':
        return 'bg-blue-900/30 border-blue-600/50 text-blue-300';
      case 'released':
        return 'bg-green-900/30 border-green-600/50 text-green-300';
      case 'disputed':
        return 'bg-red-900/30 border-red-600/50 text-red-300';
      default:
        return 'bg-gray-900/30 border-gray-600/50 text-gray-300';
    }
  };

  return (
    <div className={`rounded-lg p-4 border ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h4 className="font-medium">{getStatusLabel()}</h4>
            <p className="text-sm opacity-90">${payment.amount.toFixed(2)} USD</p>
          </div>
        </div>
        
        {onViewDetails && (
          <motion.button
            onClick={onViewDetails}
            className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View Details
          </motion.button>
        )}
      </div>
      
      <p className="text-sm opacity-80">{getStatusDescription()}</p>
      
      {payment.status === 'funded' && (
        <div className="mt-2 text-xs opacity-70">
          {isClient 
            ? 'Release payment when you approve the completed work' 
            : 'Payment will be released when client approves your work'}
        </div>
      )}
    </div>
  );
};

export default ProjectPaymentStatus;