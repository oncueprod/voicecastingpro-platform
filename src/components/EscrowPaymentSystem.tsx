import React, { useState, useEffect } from 'react';
import { Shield, Clock, CheckCircle, AlertTriangle, DollarSign, ArrowRight, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { escrowService, EscrowPayment } from '../services/escrowService';

interface EscrowPaymentSystemProps {
  projectId: string;
  talentId: string;
  clientId: string;
  projectTitle: string;
  amount?: number;
  onPaymentComplete?: (payment: EscrowPayment) => void;
}

const EscrowPaymentSystem: React.FC<EscrowPaymentSystemProps> = ({
  projectId,
  talentId,
  clientId,
  projectTitle,
  amount: initialAmount,
  onPaymentComplete
}) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState(initialAmount || 0);
  const [description, setDescription] = useState(`Payment for project: ${projectTitle}`);
  const [isCreating, setIsCreating] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [talentPayPalEmail, setTalentPayPalEmail] = useState('');
  const [payments, setPayments] = useState<EscrowPayment[]>([]);
  const [activePayment, setActivePayment] = useState<EscrowPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isTalent, setIsTalent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setIsClient(user.id === clientId);
      setIsTalent(user.id === talentId);
      loadPayments();
    }
  }, [user, clientId, talentId, projectId]);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const projectPayments = escrowService.getProjectEscrows(projectId);
      setPayments(projectPayments);
      
      // Set the most recent active payment as the active one
      const activePayments = projectPayments.filter(p => 
        p.status === 'pending' || p.status === 'funded'
      );
      
      if (activePayments.length > 0) {
        setActivePayment(activePayments[0]);
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEscrow = async () => {
    if (!user || !isClient) {
      setError('Only clients can create escrow payments');
      return;
    }

    if (amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsCreating(true);

    try {
      const payment = await escrowService.createEscrowPayment(
        amount,
        'USD',
        clientId,
        talentId,
        projectId,
        projectTitle,
        description
      );

      setPayments(prev => [payment, ...prev]);
      setActivePayment(payment);
      setShowForm(false);
      setSuccess('Escrow payment created successfully! Funds will be held securely until you approve the completed work.');
      
      if (onPaymentComplete) {
        onPaymentComplete(payment);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create escrow payment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFundEscrow = async (escrowId: string) => {
    if (!user || !isClient) {
      setError('Only clients can fund escrow payments');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsCreating(true);

    try {
      await escrowService.fundEscrow(escrowId);
      
      // Refresh payments
      loadPayments();
      setSuccess('Escrow payment funded successfully! The funds are now securely held until you approve the completed work.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fund escrow payment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReleaseEscrow = async (escrowId: string) => {
    if (!user || !isClient) {
      setError('Only clients can release escrow payments');
      return;
    }

    if (!talentPayPalEmail) {
      setError('Please enter the talent\'s PayPal email address');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsReleasing(true);

    try {
      await escrowService.releaseEscrow(escrowId, talentPayPalEmail);
      
      // Refresh payments
      loadPayments();
      setSuccess('Payment released successfully! The funds have been sent to the talent\'s PayPal account.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to release escrow payment');
    } finally {
      setIsReleasing(false);
    }
  };

  const getStatusLabel = (status: EscrowPayment['status']) => {
    switch (status) {
      case 'pending':
        return 'Awaiting Payment';
      case 'funded':
        return 'Funds Secured in Escrow';
      case 'released':
        return 'Payment Released';
      case 'disputed':
        return 'Under Dispute';
      case 'refunded':
        return 'Refunded';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusIcon = (status: EscrowPayment['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'funded':
        return <Shield className="h-5 w-5 text-blue-500" />;
      case 'released':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disputed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'refunded':
        return <RefreshCw className="h-5 w-5 text-purple-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-gray-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-green-900/50 p-3 rounded-xl">
            <Shield className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">SecurePay Escrow</h3>
            <p className="text-gray-400">Protected by TalentPay</p>
          </div>
        </div>
        
        {isClient && !activePayment && !showForm && (
          <motion.button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Create Escrow Payment
          </motion.button>
        )}
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-6 flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 mb-6 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          <p className="text-green-300">{success}</p>
        </div>
      )}

      {/* Payment Creation Form */}
      {showForm && isClient && (
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
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Title
              </label>
              <input
                type="text"
                value={projectTitle}
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
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
              placeholder="Describe what this payment is for..."
            />
          </div>

          {/* Fee Calculation */}
          <div className="bg-slate-600 rounded-lg p-4 mb-6">
            <h5 className="text-white font-medium mb-3">Payment Breakdown</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Payment Amount:</span>
                <span className="text-white">${amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Platform Fee (5%):</span>
                <span className="text-white">-${(amount * 0.05).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-500 my-2 pt-2 flex justify-between font-medium">
                <span className="text-gray-300">Talent Receives:</span>
                <span className="text-green-400">${(amount * 0.95).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
            <h5 className="text-blue-300 font-medium mb-2">How SecurePay Works:</h5>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Your payment is held securely until you approve the work</li>
              <li>• Funds are only released when you're satisfied with the delivery</li>
              <li>• Both parties are protected throughout the process</li>
              <li>• 5% platform fee is deducted from the final payment to talent</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <motion.button
              onClick={handleCreateEscrow}
              disabled={isCreating || amount <= 0}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium disabled:opacity-50"
              whileHover={{ scale: isCreating ? 1 : 1.02 }}
              whileTap={{ scale: isCreating ? 1 : 0.98 }}
            >
              {isCreating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Create Secure Payment</span>
                </div>
              )}
            </motion.button>
            
            <motion.button
              onClick={() => setShowForm(false)}
              className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-400 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Active Payment Status */}
      {activePayment && (
        <div className="bg-slate-700 rounded-lg p-6 mb-6 border border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(activePayment.status)}
              <div>
                <h4 className="text-lg font-semibold text-white">${activePayment.amount.toFixed(2)} USD</h4>
                <p className="text-sm text-gray-400">{getStatusLabel(activePayment.status)}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-400">
                Created: {new Date(activePayment.createdAt).toLocaleDateString()}
              </p>
              {activePayment.releasedAt && (
                <p className="text-sm text-green-400">
                  Released: {new Date(activePayment.releasedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="bg-slate-600 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Project:</span>
                <span className="text-white ml-2">{activePayment.projectTitle}</span>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <span className={`ml-2 ${
                  activePayment.status === 'funded' ? 'text-blue-400' : 
                  activePayment.status === 'released' ? 'text-green-400' : 
                  activePayment.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {getStatusLabel(activePayment.status)}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Platform Fee:</span>
                <span className="text-white ml-2">${activePayment.platformFee.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-400">Talent Receives:</span>
                <span className="text-green-400 ml-2">${activePayment.talentReceives.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Actions */}
          {isClient && activePayment.status === 'pending' && (
            <div className="border-t border-gray-600 pt-4">
              <motion.button
                onClick={() => handleFundEscrow(activePayment.id)}
                disabled={isCreating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                whileHover={{ scale: isCreating ? 1 : 1.02 }}
                whileTap={{ scale: isCreating ? 1 : 0.98 }}
              >
                {isCreating ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <DollarSign className="h-5 w-5" />
                    <span>Fund Escrow Payment</span>
                  </>
                )}
              </motion.button>
              <p className="text-xs text-gray-400 mt-2 text-center">
                This will securely hold your payment until you approve the completed work
              </p>
            </div>
          )}

          {/* Release Payment (Client Only) */}
          {isClient && activePayment.status === 'funded' && (
            <div className="border-t border-gray-600 pt-4">
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-3">
                <input
                  type="email"
                  placeholder="Talent's PayPal email"
                  value={talentPayPalEmail}
                  onChange={(e) => setTalentPayPalEmail(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                />
                <motion.button
                  onClick={() => handleReleaseEscrow(activePayment.id)}
                  disabled={isReleasing || !talentPayPalEmail}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors sm:whitespace-nowrap"
                  whileHover={{ scale: isReleasing ? 1 : 1.05 }}
                  whileTap={{ scale: isReleasing ? 1 : 0.95 }}
                >
                  {isReleasing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Releasing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Release Payment</span>
                    </div>
                  )}
                </motion.button>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Only release payment when you're satisfied with the delivered work
              </p>
            </div>
          )}

          {/* Payment Info for Talent */}
          {isTalent && activePayment.status === 'funded' && (
            <div className="border-t border-gray-600 pt-4">
              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
                <p className="text-blue-300 text-sm">
                  Payment is secured in escrow. It will be released to you once the client approves your work.
                  You'll receive ${activePayment.talentReceives.toFixed(2)} after our 5% platform fee.
                </p>
              </div>
            </div>
          )}

          {/* Payment Released Info */}
          {activePayment.status === 'released' && (
            <div className="border-t border-gray-600 pt-4">
              <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3">
                <p className="text-green-300 text-sm">
                  Payment has been released successfully! The funds have been sent to the talent's PayPal account.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      {payments.length > 1 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-white">Payment History</h4>
          
          {payments
            .filter(p => p.id !== activePayment?.id)
            .map((payment) => (
              <div key={payment.id} className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(payment.status)}
                    <div>
                      <h5 className="text-white font-medium">${payment.amount.toFixed(2)} USD</h5>
                      <p className="text-sm text-gray-400">{getStatusLabel(payment.status)}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* No Payments Yet */}
      {payments.length === 0 && !showForm && (
        <div className="bg-slate-700 rounded-lg p-6 text-center">
          <p className="text-gray-300 mb-4">No payments have been created for this project yet.</p>
          {isClient && (
            <motion.button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create Escrow Payment
            </motion.button>
          )}
          {isTalent && (
            <p className="text-gray-400 text-sm">
              The client hasn't created an escrow payment yet. You'll be notified when they do.
            </p>
          )}
        </div>
      )}

      {/* How It Works */}
      <div className="mt-6 bg-slate-700 rounded-lg p-6 border border-gray-600">
        <h4 className="text-lg font-semibold text-white mb-4">How SecurePay Works</h4>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="bg-slate-600 rounded-full p-2 mt-1">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <h5 className="text-white font-medium">Client Creates Escrow</h5>
              <p className="text-sm text-gray-400">Client funds are securely held in escrow before work begins</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-slate-600 rounded-full p-2 mt-1">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <h5 className="text-white font-medium">Talent Completes Work</h5>
              <p className="text-sm text-gray-400">Talent delivers the completed voice over work</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-slate-600 rounded-full p-2 mt-1">
              <span className="text-white text-xs font-bold">3</span>
            </div>
            <div>
              <h5 className="text-white font-medium">Client Approves & Releases</h5>
              <p className="text-sm text-gray-400">Client approves the work and releases the payment to talent</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="bg-slate-600 rounded-full p-2 mt-1">
              <span className="text-white text-xs font-bold">4</span>
            </div>
            <div>
              <h5 className="text-white font-medium">Automatic Protection</h5>
              <p className="text-sm text-gray-400">If client doesn't respond, payment auto-releases after 14 days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EscrowPaymentSystem;