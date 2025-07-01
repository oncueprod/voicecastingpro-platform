import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  CreditCard,
  ExternalLink,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { escrowService, EscrowPayment } from '../services/escrowService';
import { messagingService } from '../services/messagingService';
import { useAuth } from '../contexts/AuthContext';
import PayPalButton from './PayPalButton';

interface EscrowPaymentManagerProps {
  projectId?: string;
  talentId?: string;
  onEscrowCreated?: (escrow: EscrowPayment) => void;
}

const EscrowPaymentManager: React.FC<EscrowPaymentManagerProps> = ({
  projectId,
  talentId,
  onEscrowCreated
}) => {
  const { user } = useAuth();
  const [escrows, setEscrows] = useState<EscrowPayment[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    projectTitle: ''
  });
  const [loading, setLoading] = useState(false);
  const [talentPayPalEmail, setTalentPayPalEmail] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [activeEscrowId, setActiveEscrowId] = useState<string | null>(null);
  const isProduction = import.meta.env.PROD;

  useEffect(() => {
    if (user) {
      loadEscrows();
    }
  }, [user, projectId]);

  const loadEscrows = () => {
    if (!user) return;
    
    let userEscrows: EscrowPayment[];
    if (projectId) {
      userEscrows = escrowService.getProjectEscrows(projectId);
    } else {
      userEscrows = escrowService.getEscrowPayments(user.id, user.type);
    }
    
    setEscrows(userEscrows);
  };

  const createEscrow = async () => {
    if (!user || !talentId || !formData.amount) return;

    setLoading(true);
    try {
      const escrow = await escrowService.createEscrowPayment(
        parseFloat(formData.amount),
        'USD',
        user.id,
        talentId,
        projectId || `project_${Date.now()}`,
        formData.projectTitle || 'Voice Over Project',
        formData.description || 'Voice over work payment'
      );

      setActiveEscrowId(escrow.id);
      
      // Don't automatically fund the escrow - wait for PayPal payment
      loadEscrows();
      onEscrowCreated?.(escrow);
      
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create escrow');
      setShowCreateForm(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (details: any) => {
    if (!activeEscrowId || !user) return;
    
    setPaymentSuccess(true);
    
    try {
      // Fund the escrow
      await escrowService.fundEscrow(activeEscrowId);
      loadEscrows();
      
      // Send notification to talent
      const conversations = messagingService.getConversations(user.id);
      const conversation = conversations.find(c => c.participants.includes(talentId || ''));
      
      if (conversation) {
        const recipientId = conversation.participants.find(p => p !== user.id);
        if (recipientId) {
          await messagingService.sendEscrowNotification(
            conversation.id,
            user.id,
            recipientId,
            activeEscrowId,
            parseFloat(formData.amount)
          );
        }
      }
      
      // Reset form
      setFormData({ amount: '', description: '', projectTitle: '' });
      setShowCreateForm(false);
      setActiveEscrowId(null);
      
      alert('Payment successful! Escrow has been funded and talent has been notified.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to process payment');
    }
  };

  const releaseEscrow = async (escrowId: string) => {
    if (!talentPayPalEmail) {
      alert('Please enter the talent\'s PayPal email address');
      return;
    }

    setLoading(true);
    try {
      await escrowService.releaseEscrow(escrowId, talentPayPalEmail);
      loadEscrows();
      setTalentPayPalEmail('');
      alert('Payment released successfully! The talent will receive the funds in their PayPal account.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to release payment');
    } finally {
      setLoading(false);
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
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: EscrowPayment['status']) => {
    switch (status) {
      case 'pending':
        return 'Awaiting Payment';
      case 'funded':
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
              <h3 className="text-xl font-bold text-white">Secure Escrow Payments</h3>
              <p className="text-gray-400">Protected by PayPal</p>
            </div>
          </div>
          
          {user.type === 'client' && (
            <motion.button
              onClick={() => setShowCreateForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Create Escrow Payment
            </motion.button>
          )}
        </div>

        {/* Create Escrow Form */}
        {showCreateForm && (
          <motion.div
            className="bg-slate-700 rounded-lg p-6 mb-6 border border-gray-600"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <h4 className="text-lg font-semibold text-white mb-4">Create Secure Escrow Payment</h4>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount (USD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
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
                  value={formData.projectTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectTitle: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Voice Over Project"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the work to be completed..."
              />
            </div>

            {formData.amount && (
              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
                <h5 className="text-blue-300 font-medium mb-2">Payment Breakdown:</h5>
                <div className="space-y-1 text-blue-200 text-sm">
                  <div className="flex justify-between">
                    <span>Project Amount:</span>
                    <span>${formData.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee (5%):</span>
                    <span>${(parseFloat(formData.amount || '0') * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-blue-600/30 pt-1">
                    <span>Talent Receives:</span>
                    <span>${(parseFloat(formData.amount || '0') * 0.95).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <motion.button
                onClick={createEscrow}
                disabled={loading || !formData.amount}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium disabled:opacity-50 flex items-center justify-center space-x-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    <span>Create Escrow</span>
                  </>
                )}
              </motion.button>
              
              <motion.button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-blue-600 hover:text-blue-400 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
        
        {/* PayPal Payment Form */}
        {activeEscrowId && !paymentSuccess && (
          <motion.div
            className="bg-slate-700 rounded-lg p-6 mb-6 border border-gray-600"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
          >
            <h4 className="text-lg font-semibold text-white mb-4">Complete Payment with PayPal</h4>
            <p className="text-gray-300 mb-6">
              Your escrow has been created. Please complete the payment to fund the escrow.
            </p>
            
            <PayPalButton
              amount={formData.amount}
              currency="USD"
              onSuccess={handlePaymentSuccess}
              onError={(error) => {
                console.error('PayPal error:', error);
                alert('Payment failed. Please try again.');
              }}
              className="mb-4"
            />
            
            <p className="text-sm text-gray-400 text-center">
              {isProduction ? 
                'You will be redirected to PayPal to complete your payment securely.' :
                'This is a sandbox environment. No real payments will be processed.'}
            </p>
          </motion.div>
        )}

        {/* Escrow List */}
        {escrows.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Escrow Payments</h4>
            
            {escrows.map((escrow) => (
              <div key={escrow.id} className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(escrow.status)}
                    <div>
                      <p className="text-white font-medium">${escrow.amount} USD</p>
                      <p className="text-sm text-gray-400">{getStatusText(escrow.status)}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      Created: {escrow.createdAt.toLocaleDateString()}
                    </p>
                    {escrow.releasedAt && (
                      <p className="text-sm text-green-400">
                        Released: {escrow.releasedAt.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-white font-medium">{escrow.projectTitle}</p>
                  <p className="text-sm text-gray-400">{escrow.description}</p>
                </div>

                {/* Release Payment (Client Only) */}
                {user.type === 'client' && escrow.status === 'funded' && (
                  <div className="border-t border-gray-600 pt-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="email"
                        placeholder="Talent's PayPal email"
                        value={talentPayPalEmail}
                        onChange={(e) => setTalentPayPalEmail(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <motion.button
                        onClick={() => releaseEscrow(escrow.id)}
                        disabled={loading || !talentPayPalEmail}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
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
                {user.type === 'talent' && escrow.status === 'funded' && (
                  <div className="border-t border-gray-600 pt-4">
                    <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
                      <p className="text-blue-300 text-sm">
                        💰 Payment is secured in escrow! You'll receive ${escrow.talentReceives.toFixed(2)} 
                        once the client approves your work. Platform fee: ${escrow.platformFee.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Pending Payment Info */}
                {escrow.status === 'pending' && (
                  <div className="border-t border-gray-600 pt-4">
                    <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3">
                      <p className="text-yellow-300 text-sm">
                        ⏳ Waiting for PayPal payment to complete. 
                        {user.type === 'client' && ' Please complete your payment to fund this escrow.'}
                      </p>
                      
                      {user.type === 'client' && (
                        <div className="mt-3">
                          <PayPalButton
                            amount={escrow.amount.toString()}
                            currency="USD"
                            onSuccess={async (details) => {
                              try {
                                await escrowService.fundEscrow(escrow.id);
                                loadEscrows();
                                alert('Payment successful! Escrow has been funded.');
                              } catch (error) {
                                alert('Failed to fund escrow. Please try again.');
                              }
                            }}
                            onError={(error) => {
                              console.error('PayPal error:', error);
                              alert('Payment failed. Please try again.');
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {escrows.length === 0 && (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-white mb-2">No Escrow Payments</h4>
            <p className="text-gray-400">
              {user.type === 'client' 
                ? 'Create an escrow payment to securely fund your project'
                : 'Escrow payments from clients will appear here'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EscrowPaymentManager;