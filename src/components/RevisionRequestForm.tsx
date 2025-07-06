import React, { useState } from 'react';
import { Clock, Send, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface RevisionRequestFormProps {
  projectId: string;
  onSubmit: (notes: string) => void;
  onCancel: () => void;
  initialRevisions?: number;
  maxFreeRevisions?: number;
}

const RevisionRequestForm: React.FC<RevisionRequestFormProps> = ({
  projectId,
  onSubmit,
  onCancel,
  initialRevisions = 0,
  maxFreeRevisions = 2
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const revisionsRemaining = Math.max(0, maxFreeRevisions - initialRevisions);
  const isPaidRevision = revisionsRemaining <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notes.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // In a real app, this would submit to the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSubmit(notes);
    } catch (error) {
      console.error('Failed to submit revision request:', error);
      alert('Failed to submit revision request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="bg-slate-700 rounded-lg p-6 border border-gray-600"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-white">Request Revision</h4>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Revision Status */}
      <div className={`rounded-lg p-3 mb-4 ${
        isPaidRevision 
          ? 'bg-yellow-900/30 border border-yellow-600/50' 
          : 'bg-blue-900/30 border border-blue-600/50'
      }`}>
        <div className="flex items-center space-x-2">
          <Clock className={`h-4 w-4 ${isPaidRevision ? 'text-yellow-400' : 'text-blue-400'}`} />
          <p className={`text-sm ${isPaidRevision ? 'text-yellow-300' : 'text-blue-300'}`}>
            {isPaidRevision 
              ? 'You have used all free revisions. This will be a paid revision.' 
              : `You have ${revisionsRemaining} free ${revisionsRemaining === 1 ? 'revision' : 'revisions'} remaining.`}
          </p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Revision Notes *
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400"
            placeholder="Please describe the changes you need in detail..."
            required
          />
        </div>
        
        {isPaidRevision && (
          <div className="bg-slate-600 rounded-lg p-4 mb-4">
            <h5 className="text-white font-medium mb-2">Paid Revision</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Revision Fee:</span>
                <span className="text-white">$25.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Platform Fee (5%):</span>
                <span className="text-white">$1.25</span>
              </div>
              <div className="border-t border-gray-500 my-2 pt-2 flex justify-between font-medium">
                <span className="text-gray-300">Total:</span>
                <span className="text-white">$26.25</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            disabled={isSubmitting || !notes.trim()}
            className={`${
              isPaidRevision 
                ? 'bg-yellow-600 hover:bg-yellow-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center space-x-2`}
            whileHover={{ scale: isSubmitting ? 1 : 1.05 }}
            whileTap={{ scale: isSubmitting ? 1 : 0.95 }}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>{isPaidRevision ? 'Submit & Pay' : 'Submit Request'}</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default RevisionRequestForm;