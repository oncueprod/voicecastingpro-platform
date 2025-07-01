import React, { useState, useEffect } from 'react';
import { DollarSign, Shield, Clock, CheckCircle, AlertTriangle, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { paypalEscrowService, PayPalEscrowPayment } from '../services/paypalService';
import { useAuth } from '../contexts/AuthContext';

interface PaymentEscrowProps {
  projectId: string;
  talentId: string;
  amount: number;
  description: string;
  onPaymentComplete?: (payment: PayPalEscrowPayment) => void;
}

const PaymentEscrow: React.FC<PaymentEscrowProps> = ({
  projectId,
  talentId,
  amount,
  description,
  onPaymentComplete
}) => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PayPalEscrowPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [talentPayPalEmail, setTalentPayPalEmail] = useState('');

  useEffect(() => {
    if (user) {
      loadPayments();
    }
  }, [user]);

  const loadPayments = () => {
    if (!user) return;
    const userPayments = paypalEscrowService.getEscrowPayments(user.id, user.type);
    setPayments(userPayments.filter(p => p.projectId === projectId));
  };

  const createPayment = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const payment = await paypalEscrowService.createEscrowPayment(
        amount,
        'USD',
        user.id,
        talentId,
        projectId,
        description
      );

      // In a real implementation, you would redirect to PayPal here
      // For demo purposes, we'll simulate the payment flow
      const approvalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${payment.id}`;
      
      // Simulate user approval and capture
      setTimeout(async () => {
        await paypalEscrowService.capturePayment(payment.id);
        loadPayments();
        onPaymentComplete?.(payment);
        setShowPaymentForm(false);
      }, 2000);

      // In production, redirect to PayPal
      window.open(approvalUrl, '_blank');
      
    } catch (error) {
      alert('Payment creation failed');
    } finally {
      setLoading(false);
    }
  };

  const releasePayment = async (paymentId: string) => {
    if (!talentPayPalEmail) {
      alert('Please enter talent PayPal email');
      return;
    }

    setLoading(true);
    try {
      await paypalEscrowService.releasePayment(paymentId, talentPayPalEmail);
      loadPayments();
      alert('Payment released successfully!');
    } catch (error) {
      alert('Payment release failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: PayPalEscrowPayment['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'held':
        return <Shield className="h-5 w-5 text-blue-500" />;
      case 'released':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disputed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: PayPalEscrowPayment['status']) => {
    switch (status) {
      case 'pending':
        return 'Awaiting Payment';
      case 'held':
        return 'Funds Secured in Escrow';
      case 'released':
        return 'Payment Released';
      case 'disputed':
        return 'Under Dispute';
      default:
        return 'Unknown Status';
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-green-900/50 p-3 rounded-xl">
              <Shield className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Secure Escrow Payment</h3>
              <p className="text-gray-400">Protected by PayPal</p>
            </div>
          </div>
          
          {user.type === 'client' && payments.length === 0 && (
            <motion.button
              onClick={() => setShowPaymentForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create Escrow Payment
            </motion.button>
          )}
        </div>

        {/* Payment Form */}
        {showPaymentForm && (
          <motion.div
            className="bg-slate-700 rounded-lg p-6 mb-6 border border-gray-600"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <h4 className="text-lg font-semibold text-white mb-4">Create Escrow Payment</h4>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount (USD)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={amount}
                    readOnly
                    className="w-full pl-10 pr-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project ID
                </label>
                <input
                  type="text"
                  value={projectId}
                  readOnly
                  className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                readOnly
                rows={3}
                className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white"
              />
            </div>

            <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
              <h5 className="text-blue-300 font-medium mb-2">How Escrow Works:</h5>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• Your payment is held securely by PayPal</li>
                <li>• Funds are released only when you approve the work</li>
                <li>• Both parties are protected throughout the process</li>
                <li>• 5% platform fee is deducted from the final payment</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <motion.button
                onClick={createPayment}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Pay with PayPal</span>
                  </div>
                )}
              </motion.button>
              
              <motion.button
                onClick={() => setShowPaymentForm(false)}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-400 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Payment Status */}
        {payments.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Payment Status</h4>
            
            {payments.map((payment) => (
              <div key={payment.id} className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(payment.status)}
                    <div>
                      <p className="text-white font-medium">${payment.amount} USD</p>
                      <p className="text-sm text-gray-400">{getStatusText(payment.status)}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      Created: {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                    {payment.releasedAt && (
                      <p className="text-sm text-green-400">
                        Released: {new Date(payment.releasedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Release Payment (Client Only) */}
                {user.type === 'client' && payment.status === 'held' && (
                  <div className="border-t border-gray-600 pt-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="email"
                        placeholder="Talent's PayPal email"
                        value={talentPayPalEmail}
                        onChange={(e) => setTalentPayPalEmail(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                      />
                      <motion.button
                        onClick={() => releasePayment(payment.id)}
                        disabled={loading || !talentPayPalEmail}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Release Payment
                      </motion.button>
                    </div>
                    <p className="text-xs text-gray-400">
                      Only release payment when you're satisfied with the delivered work
                    </p>
                  </div>
                )}

                {/* Payment Info for Talent */}
                {user.type === 'talent' && payment.status === 'held' && (
                  <div className="border-t border-gray-600 pt-4">
                    <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
                      <p className="text-blue-300 text-sm">
                        Payment is secured in escrow. It will be released to you once the client approves your work.
                        You'll receive ${(payment.amount * 0.95).toFixed(2)} after our 5% platform fee.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentEscrow;