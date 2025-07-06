import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, Clock, AlertCircle, FileText, MessageSquare, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { escrowService, EscrowPayment } from '../services/escrowService';
import AudioUpload from './AudioUpload';
import PaymentStatusBadge from './PaymentStatusBadge';

interface ProjectDeliverySystemProps {
  projectId: string;
  talentId: string;
  clientId: string;
  onDeliveryComplete?: () => void;
}

const ProjectDeliverySystem: React.FC<ProjectDeliverySystemProps> = ({
  projectId,
  talentId,
  clientId,
  onDeliveryComplete
}) => {
  const { user } = useAuth();
  const [deliveryStatus, setDeliveryStatus] = useState<'not_started' | 'in_progress' | 'delivered' | 'approved' | 'revision_requested'>('not_started');
  const [payments, setPayments] = useState<EscrowPayment[]>([]);
  const [activePayment, setActivePayment] = useState<EscrowPayment | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isTalent, setIsTalent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  useEffect(() => {
    if (user) {
      setIsClient(user.id === clientId);
      setIsTalent(user.id === talentId);
      loadPayments();
      
      // In a real app, we would load the delivery status from the backend
      // For now, we'll simulate it based on the payment status
      const storedStatus = localStorage.getItem(`project_${projectId}_delivery_status`);
      if (storedStatus) {
        setDeliveryStatus(storedStatus as any);
      }
    }
  }, [user, clientId, talentId, projectId]);

  const loadPayments = async () => {
    setIsLoading(true);
    try {
      const projectPayments = escrowService.getProjectEscrows(projectId);
      setPayments(projectPayments);
      
      // Set the most recent active payment as the active one
      const fundedPayments = projectPayments.filter(p => p.status === 'funded');
      if (fundedPayments.length > 0) {
        setActivePayment(fundedPayments[0]);
        
        // If there's a funded payment, the project is at least in progress
        if (deliveryStatus === 'not_started') {
          setDeliveryStatus('in_progress');
          localStorage.setItem(`project_${projectId}_delivery_status`, 'in_progress');
        }
      } else {
        const releasedPayments = projectPayments.filter(p => p.status === 'released');
        if (releasedPayments.length > 0) {
          setActivePayment(releasedPayments[0]);
          
          // If there's a released payment, the project is approved
          if (deliveryStatus !== 'approved') {
            setDeliveryStatus('approved');
            localStorage.setItem(`project_${projectId}_delivery_status`, 'approved');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelivery = () => {
    // In a real app, this would upload the files to the server
    // For now, we'll just update the local state
    setDeliveryStatus('delivered');
    localStorage.setItem(`project_${projectId}_delivery_status`, 'delivered');
    
    // Store delivery notes
    localStorage.setItem(`project_${projectId}_delivery_notes`, deliveryNotes);
    
    if (onDeliveryComplete) {
      onDeliveryComplete();
    }
  };

  const handleApprove = () => {
    // In a real app, this would trigger the payment release
    // For now, we'll just update the local state
    setDeliveryStatus('approved');
    localStorage.setItem(`project_${projectId}_delivery_status`, 'approved');
  };

  const handleRequestRevision = () => {
    // In a real app, this would send a revision request to the talent
    // For now, we'll just update the local state
    setDeliveryStatus('revision_requested');
    localStorage.setItem(`project_${projectId}_delivery_status`, 'revision_requested');
    
    // Store revision notes
    localStorage.setItem(`project_${projectId}_revision_notes`, revisionNotes);
    
    // Hide the revision form
    setShowRevisionForm(false);
  };

  const handleAudioUploadComplete = () => {
    // This would be called when the audio upload is complete
    // For now, we'll just show a success message
    alert('Audio files uploaded successfully! Click "Mark as Delivered" when you\'re ready to submit.');
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
          <div className="bg-blue-900/50 p-3 rounded-xl">
            <FileText className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Project Delivery</h3>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Status:</span>
              {deliveryStatus === 'not_started' && (
                <span className="text-yellow-400">Not Started</span>
              )}
              {deliveryStatus === 'in_progress' && (
                <span className="text-blue-400">In Progress</span>
              )}
              {deliveryStatus === 'delivered' && (
                <span className="text-green-400">Delivered</span>
              )}
              {deliveryStatus === 'approved' && (
                <span className="text-green-400">Approved</span>
              )}
              {deliveryStatus === 'revision_requested' && (
                <span className="text-orange-400">Revision Requested</span>
              )}
            </div>
          </div>
        </div>
        
        {activePayment && (
          <div>
            <PaymentStatusBadge status={activePayment.status} />
          </div>
        )}
      </div>

      {/* Payment Required Warning */}
      {!activePayment && deliveryStatus === 'not_started' && (
        <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <h4 className="text-lg font-semibold text-yellow-300">Payment Required</h4>
          </div>
          <p className="text-yellow-200 mb-4">
            {isClient 
              ? 'Please create an escrow payment to start this project. This protects both you and the talent.' 
              : 'Waiting for the client to create an escrow payment before starting work.'}
          </p>
          
          {isClient && (
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-yellow-400" />
              <p className="text-yellow-200 text-sm">
                Creating a secure escrow payment protects both parties and enables work to begin.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Delivery System - Talent View */}
      {isTalent && (
        <div className="space-y-6">
          {/* Work in Progress */}
          {(deliveryStatus === 'in_progress' || deliveryStatus === 'revision_requested') && (
            <div className="bg-slate-700 rounded-lg p-6 border border-gray-600">
              <h4 className="text-lg font-semibold text-white mb-4">
                {deliveryStatus === 'revision_requested' ? 'Revision Requested' : 'Work in Progress'}
              </h4>
              
              {deliveryStatus === 'revision_requested' && (
                <div className="bg-orange-900/30 border border-orange-600/50 rounded-lg p-4 mb-4">
                  <h5 className="text-orange-300 font-medium mb-2">Revision Notes from Client:</h5>
                  <p className="text-orange-200 text-sm">
                    {localStorage.getItem(`project_${projectId}_revision_notes`) || 'No specific notes provided.'}
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowUploader(!showUploader)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>{showUploader ? 'Hide Uploader' : 'Upload Audio Files'}</span>
                  </button>
                  
                  <div className="text-sm text-gray-400">
                    {activePayment ? (
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-blue-400" />
                        <span>Escrow Funded: ${activePayment.amount.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                        <span>Awaiting Payment</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {showUploader && user && (
                  <div className="mt-4">
                    <AudioUpload
                      userId={user.id}
                      projectId={projectId}
                      type="project_delivery"
                      maxFiles={5}
                      title="Upload Project Files"
                      onUploadComplete={handleAudioUploadComplete}
                    />
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-600">
                  <h5 className="text-white font-medium mb-3">Delivery Notes</h5>
                  <textarea
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                    placeholder="Add notes about your delivery (optional)..."
                  />
                  
                  <div className="flex justify-end mt-4">
                    <motion.button
                      onClick={handleDelivery}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center space-x-2"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>Mark as Delivered</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Delivered Status */}
          {deliveryStatus === 'delivered' && (
            <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <h4 className="text-xl font-semibold text-green-300">Delivery Complete</h4>
              </div>
              
              <p className="text-green-200 mb-4">
                Your work has been delivered successfully! The client will review your submission and release the payment.
              </p>
              
              <div className="bg-green-800/30 rounded-lg p-4">
                <h5 className="text-green-300 font-medium mb-2">Your Delivery Notes:</h5>
                <p className="text-green-200 text-sm">
                  {localStorage.getItem(`project_${projectId}_delivery_notes`) || 'No notes provided.'}
                </p>
              </div>
              
              <div className="mt-4 flex items-center space-x-2 text-green-200 text-sm">
                <Clock className="h-4 w-4" />
                <span>Delivered on {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          )}
          
          {/* Approved Status */}
          {deliveryStatus === 'approved' && (
            <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <h4 className="text-xl font-semibold text-green-300">Project Approved</h4>
              </div>
              
              <p className="text-green-200 mb-4">
                Congratulations! The client has approved your work and released the payment.
              </p>
              
              {activePayment && activePayment.status === 'released' ? (
                <div className="bg-green-800/30 rounded-lg p-4">
                  <h5 className="text-green-300 font-medium mb-2">Payment Details:</h5>
                  <div className="space-y-2 text-green-200 text-sm">
                    <div className="flex justify-between">
                      <span>Project Amount:</span>
                      <span>${activePayment.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Fee (5%):</span>
                      <span>-${activePayment.platformFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>You Received:</span>
                      <span>${activePayment.talentReceives.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-blue-300">
                    <Clock className="h-4 w-4" />
                    <p className="text-sm">Payment is being processed and will be sent to your account soon.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delivery System - Client View */}
      {isClient && (
        <div className="space-y-6">
          {/* Work in Progress */}
          {deliveryStatus === 'in_progress' && (
            <div className="bg-slate-700 rounded-lg p-6 border border-gray-600">
              <h4 className="text-lg font-semibold text-white mb-4">Work in Progress</h4>
              
              <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  <h5 className="text-blue-300 font-medium">Talent is Working on Your Project</h5>
                </div>
                <p className="text-blue-200 text-sm">
                  The talent is currently working on your project. You'll be notified when they deliver the completed work.
                </p>
              </div>
              
              <div className="mt-4 flex items-center space-x-2 text-gray-400 text-sm">
                <MessageSquare className="h-4 w-4" />
                <span>You can message the talent if you have any questions or updates.</span>
              </div>
            </div>
          )}
          
          {/* Delivered Status */}
          {deliveryStatus === 'delivered' && (
            <div className="bg-slate-700 rounded-lg p-6 border border-gray-600">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <h4 className="text-xl font-semibold text-white">Work Delivered</h4>
              </div>
              
              <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 mb-6">
                <h5 className="text-green-300 font-medium mb-2">Delivery Notes from Talent:</h5>
                <p className="text-green-200 text-sm">
                  {localStorage.getItem(`project_${projectId}_delivery_notes`) || 'No notes provided.'}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-600 rounded-lg p-4">
                  <h5 className="text-white font-medium mb-3">Review the Delivered Work</h5>
                  <p className="text-gray-300 text-sm mb-4">
                    Please review the audio files and decide if the work meets your requirements.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <motion.button
                      onClick={handleApprove}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>Approve & Release Payment</span>
                    </motion.button>
                    
                    <motion.button
                      onClick={() => setShowRevisionForm(true)}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Clock className="h-5 w-5" />
                      <span>Request Revision</span>
                    </motion.button>
                  </div>
                </div>
                
                {showRevisionForm && (
                  <div className="bg-slate-600 rounded-lg p-4">
                    <h5 className="text-white font-medium mb-3">Request Revision</h5>
                    <textarea
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-500 border border-gray-500 rounded-lg text-white placeholder-gray-400"
                      placeholder="Describe what changes you need..."
                      required
                    />
                    
                    <div className="flex justify-end mt-4 space-x-3">
                      <button
                        onClick={() => setShowRevisionForm(false)}
                        className="px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                      <motion.button
                        onClick={handleRequestRevision}
                        disabled={!revisionNotes.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Send Revision Request
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Revision Requested */}
          {deliveryStatus === 'revision_requested' && (
            <div className="bg-orange-900/30 border border-orange-600/50 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Clock className="h-6 w-6 text-orange-400" />
                <h4 className="text-xl font-semibold text-orange-300">Revision Requested</h4>
              </div>
              
              <p className="text-orange-200 mb-4">
                You've requested revisions to the delivered work. The talent is working on implementing your feedback.
              </p>
              
              <div className="bg-orange-800/30 rounded-lg p-4">
                <h5 className="text-orange-300 font-medium mb-2">Your Revision Notes:</h5>
                <p className="text-orange-200 text-sm">
                  {localStorage.getItem(`project_${projectId}_revision_notes`) || 'No notes provided.'}
                </p>
              </div>
            </div>
          )}
          
          {/* Approved Status */}
          {deliveryStatus === 'approved' && (
            <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-400" />
                <h4 className="text-xl font-semibold text-green-300">Project Completed</h4>
              </div>
              
              <p className="text-green-200 mb-4">
                You've approved the work and the payment has been released to the talent. Thank you for using our platform!
              </p>
              
              {activePayment && activePayment.status === 'released' ? (
                <div className="bg-green-800/30 rounded-lg p-4">
                  <h5 className="text-green-300 font-medium mb-2">Payment Details:</h5>
                  <div className="space-y-2 text-green-200 text-sm">
                    <div className="flex justify-between">
                      <span>Payment Amount:</span>
                      <span>${activePayment.amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Released On:</span>
                      <span>{activePayment.releasedAt ? new Date(activePayment.releasedAt).toLocaleDateString() : 'Processing'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-blue-300">
                    <Clock className="h-4 w-4" />
                    <p className="text-sm">Payment release is being processed.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Auto-Release Notice */}
      {activePayment && activePayment.status === 'funded' && deliveryStatus === 'delivered' && (
        <div className="mt-6 bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Clock className="h-5 w-5 text-blue-400" />
            <h5 className="text-blue-300 font-medium">Automatic Payment Protection</h5>
          </div>
          <p className="text-blue-200 text-sm">
            {isClient 
              ? 'If you don\'t take action, payment will be automatically released 14 days after delivery.' 
              : 'If the client doesn\'t respond, payment will be automatically released to you in 14 days.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectDeliverySystem;