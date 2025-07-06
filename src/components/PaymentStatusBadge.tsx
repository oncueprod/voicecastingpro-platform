import React from 'react';
import { Shield, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface PaymentStatusBadgeProps {
  status: 'pending' | 'funded' | 'released' | 'disputed' | 'refunded';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock className={`${getIconSize()} text-yellow-500`} />;
      case 'funded':
        return <Shield className={`${getIconSize()} text-blue-500`} />;
      case 'released':
        return <CheckCircle className={`${getIconSize()} text-green-500`} />;
      case 'disputed':
        return <AlertCircle className={`${getIconSize()} text-red-500`} />;
      case 'refunded':
        return <RefreshCw className={`${getIconSize()} text-purple-500`} />;
      default:
        return <Clock className={`${getIconSize()} text-gray-500`} />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'pending':
        return 'Deposit Pending';
      case 'funded':
        return 'Deposit Received';
      case 'released':
        return 'Paid Out';
      case 'disputed':
        return 'Payment Disputed';
      case 'refunded':
        return 'Refunded';
      default:
        return 'Unknown Status';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-3 w-3';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-4 w-4';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-sm';
      default:
        return 'text-xs';
    }
  };

  const getPaddingSize = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1';
      case 'lg':
        return 'px-3 py-1.5';
      default:
        return 'px-2.5 py-1';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-900/30 border-yellow-600/50 text-yellow-300';
      case 'funded':
        return 'bg-blue-900/30 border-blue-600/50 text-blue-300';
      case 'released':
        return 'bg-green-900/30 border-green-600/50 text-green-300';
      case 'disputed':
        return 'bg-red-900/30 border-red-600/50 text-red-300';
      case 'refunded':
        return 'bg-purple-900/30 border-purple-600/50 text-purple-300';
      default:
        return 'bg-gray-900/30 border-gray-600/50 text-gray-300';
    }
  };

  return (
    <div className={`inline-flex items-center space-x-1.5 rounded-full border ${getPaddingSize()} ${getStatusColor()}`}>
      {getStatusIcon()}
      {showLabel && <span className={`${getTextSize()} font-medium`}>{getStatusLabel()}</span>}
    </div>
  );
};

export default PaymentStatusBadge;