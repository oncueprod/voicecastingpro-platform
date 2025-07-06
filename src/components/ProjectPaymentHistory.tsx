import React from 'react';
import { DollarSign, Clock, CheckCircle, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { EscrowPayment } from '../services/escrowService';
import PaymentStatusBadge from './PaymentStatusBadge';

interface ProjectPaymentHistoryProps {
  payments: EscrowPayment[];
  onSelectPayment?: (payment: EscrowPayment) => void;
}

const ProjectPaymentHistory: React.FC<ProjectPaymentHistoryProps> = ({
  payments,
  onSelectPayment
}) => {
  if (payments.length === 0) {
    return (
      <div className="bg-slate-700 rounded-lg p-6 text-center">
        <DollarSign className="h-10 w-10 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-300">No payment history available</p>
      </div>
    );
  }

  // Sort payments by date (newest first)
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white mb-4">Payment History</h3>
      
      {sortedPayments.map((payment) => (
        <div 
          key={payment.id} 
          className="bg-slate-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => onSelectPayment && onSelectPayment(payment)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <PaymentStatusBadge status={payment.status} showLabel={false} />
              <div>
                <h4 className="text-white font-medium">${payment.amount.toFixed(2)} USD</h4>
                <p className="text-sm text-gray-400">{payment.projectTitle}</p>
              </div>
            </div>
            
            <div className="text-right">
              <PaymentStatusBadge status={payment.status} size="sm" />
              <p className="text-xs text-gray-500 mt-1">
                {new Date(payment.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          {payment.status === 'released' && payment.releasedAt && (
            <div className="mt-2 text-xs text-green-400">
              Released on {new Date(payment.releasedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProjectPaymentHistory;