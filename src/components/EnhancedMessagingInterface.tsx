import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  User, 
  X, 
  Download,
  Shield,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Music,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { messagingService, Message, Conversation } from '../services/messagingService';
import { fileService, FileAttachment } from '../services/fileService';
import { escrowService, EscrowPayment } from '../services/escrowService';
import { useAuth } from '../contexts/AuthContext';

interface EnhancedMessagingInterfaceProps {
  conversationId?: string;
  recipientId?: string;
  projectId?: string;
  projectTitle?: string;
  onClose?: () => void;
}

const EnhancedMessagingInterface: React.FC<EnhancedMessagingInterfaceProps> = ({
  conversationId: initialConversationId,
  recipientId,
  projectId,
  projectTitle,
  onClose
}) => {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEscrowForm, setShowEscrowForm] = useState(false);
  const [escrowAmount, setEscrowAmount] = useState('');
  const [escrowDescription, setEscrowDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [authError, setAuthError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication check - block access if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setAuthError('You must be signed in to use messaging');
      return;
    }

    // Additional check for user type
    if (user.type !== 'client' && user.type !== 'talent') {
      setAuthError('Invalid user type for messaging');
      return;
    }

    setAuthError('');
  }, [isAuthenticated, user]);

  useEffect(() => {
    // Only proceed if user is authenticated
    if (!isAuthenticated || !user || authError) return;

    messagingService.connect(user.id);
    loadConversations();

    const handleMessage = (message: Message) => {
      // Verify message is for authenticated user
      if (message.receiverId !== user.id && message.senderId !== user.id) {
        return; // Ignore messages not for this user
      }

      if (activeConversation && message.conversationId === activeConversation.id) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
      loadConversations();
    };

    const handleConversationCreated = (conversation: Conversation) => {
      // Verify user is participant in conversation
      if (!conversation.participants.includes(user.id)) {
        return; // Ignore conversations user is not part of
      }

      setConversations(prev => [conversation, ...prev]);
      setActiveConversation(conversation);
    };

    messagingService.on('message', handleMessage);
    messagingService.on('conversation_created', handleConversationCreated);

    return () => {
      messagingService.off('message', handleMessage);
      messagingService.off('conversation_created', handleConversationCreated);
      messagingService.disconnect();
    };
  }, [user, activeConversation, isAuthenticated, authError]);

  useEffect(() => {
    if (!isAuthenticated || !user || authError) return;

    if (initialConversationId) {
      const conversation = conversations.find(c => c.id === initialConversationId);
      if (conversation && conversation.participants.includes(user.id)) {
        setActiveConversation(conversation);
        loadMessages(conversation.id);
      }
    } else if (recipientId && user) {
      const existingConversation = messagingService.findConversation([user.id, recipientId], projectId);
      if (existingConversation) {
        setActiveConversation(existingConversation);
        loadMessages(existingConversation.id);
      } else {
        createNewConversation();
      }
    }
  }, [initialConversationId, recipientId, conversations, user, projectId, isAuthenticated, authError]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = () => {
    if (!isAuthenticated || !user) return;
    const userConversations = messagingService.getConversations(user.id);
    setConversations(userConversations);
  };

  const loadMessages = (conversationId: string) => {
    if (!isAuthenticated || !user) return;
    
    const conversationMessages = messagingService.getMessages(conversationId);
    // Filter messages to only show those involving the authenticated user
    const userMessages = conversationMessages.filter(m => 
      m.senderId === user.id || m.receiverId === user.id
    );
    setMessages(userMessages);
    
    userMessages
      .filter(m => m.receiverId === user.id && !m.read)
      .forEach(m => messagingService.markAsRead(m.id));
  };

  const createNewConversation = async () => {
    if (!isAuthenticated || !user || !recipientId) return;
    
    try {
      const conversation = await messagingService.createConversation(
        [user.id, recipientId], 
        projectId,
        projectTitle
      );
      setActiveConversation(conversation);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      setAuthError('Failed to create conversation. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !isAuthenticated || !user) return;

    const recipientId = activeConversation.participants.find(p => p !== user.id);
    if (!recipientId) return;

    try {
      await messagingService.sendMessage(
        activeConversation.id,
        user.id,
        recipientId,
        newMessage,
        'text'
      );

      setNewMessage('');
      loadMessages(activeConversation.id);
      loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!activeConversation || !isAuthenticated || !user) return;

    const recipientId = activeConversation.participants.find(p => p !== user.id);
    if (!recipientId) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await messagingService.sendFileMessage(
          activeConversation.id,
          user.id,
          recipientId,
          file
        );
      }
      loadMessages(activeConversation.id);
      loadConversations();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const createEscrow = async () => {
    if (!escrowAmount || !activeConversation || !isAuthenticated || !user) return;

    // Only clients can create escrow payments
    if (user.type !== 'client') {
      alert('Only clients can create escrow payments');
      return;
    }

    const recipientId = activeConversation.participants.find(p => p !== user.id);
    if (!recipientId) return;

    try {
      const escrow = await escrowService.createEscrowPayment(
        parseFloat(escrowAmount),
        'USD',
        user.id,
        recipientId,
        activeConversation.projectId || `project_${Date.now()}`,
        activeConversation.projectTitle || 'Voice Over Project',
        escrowDescription || `Payment for ${activeConversation.projectTitle || 'voice over work'}`
      );

      // Send escrow notification message
      await messagingService.sendEscrowNotification(
        activeConversation.id,
        user.id,
        recipientId,
        escrow.id,
        parseFloat(escrowAmount)
      );

      setEscrowAmount('');
      setEscrowDescription('');
      setShowEscrowForm(false);
      loadMessages(activeConversation.id);
      loadConversations();

      alert('Escrow payment created! Please complete the PayPal payment to fund the escrow.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create escrow');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0 && isAuthenticated && user) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isAuthenticated && user) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'file':
        return <Paperclip className="h-4 w-4" />;
      case 'payment_request':
        return <DollarSign className="h-4 w-4" />;
      case 'escrow_created':
        return <Shield className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const renderFilePreview = (message: Message) => {
    if (message.type !== 'file' || !message.metadata?.fileId) return null;

    const file = fileService.getFileById(message.metadata.fileId);
    if (!file) return null;

    const isImage = fileService.isImage(file.type);
    const isAudio = fileService.isAudio(file.type);

    return (
      <div className="mt-2 p-3 bg-slate-700 rounded-lg border border-gray-600">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {isImage ? (
              <ImageIcon className="h-5 w-5 text-blue-400" />
            ) : isAudio ? (
              <Music className="h-5 w-5 text-green-400" />
            ) : (
              <FileText className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            <p className="text-xs text-gray-400">
              {fileService.formatFileSize(file.size)} • {file.type}
            </p>
          </div>
          <motion.button
            onClick={() => {
              const link = document.createElement('a');
              link.href = file.url;
              link.download = file.name;
              link.click();
            }}
            className="text-blue-400 hover:text-blue-300 p-1 rounded"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Download className="h-4 w-4" />
          </motion.button>
        </div>
        
        {isImage && (
          <div className="mt-2">
            <img 
              src={file.url} 
              alt={file.name}
              className="max-w-full h-auto rounded-lg max-h-48 object-cover"
            />
          </div>
        )}
        
        {isAudio && (
          <div className="mt-2">
            <audio controls className="w-full">
              <source src={file.url} type={file.type} />
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>
    );
  };

  // Show authentication error if not logged in
  if (!isAuthenticated || !user || authError) {
    return (
      <div className="flex h-96 bg-slate-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="bg-red-900/50 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Lock className="h-10 w-10 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Authentication Required</h3>
            <p className="text-gray-300 mb-6">
              {authError || 'Please sign in to access messaging features'}
            </p>
            {onClose && (
              <motion.button
                onClick={onClose}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex h-96 bg-slate-800 rounded-xl border border-gray-700 overflow-hidden relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-600/20 border-2 border-dashed border-blue-400 z-50 flex items-center justify-center">
          <div className="text-center">
            <Paperclip className="h-12 w-12 text-blue-400 mx-auto mb-2" />
            <p className="text-blue-400 font-medium">Drop files here to upload</p>
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Messages</h3>
          <p className="text-xs text-gray-400">Signed in as {user.name}</p>
        </div>
        
        <div className="overflow-y-auto h-full">
          {conversations.map((conversation) => {
            const otherParticipant = conversation.participants.find(p => p !== user.id);
            return (
              <motion.div
                key={conversation.id}
                className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-slate-700 transition-colors ${
                  activeConversation?.id === conversation.id ? 'bg-slate-700' : ''
                }`}
                onClick={() => {
                  setActiveConversation(conversation);
                  loadMessages(conversation.id);
                }}
                whileHover={{ backgroundColor: 'rgba(51, 65, 85, 0.8)' }}
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 rounded-full p-2">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {conversation.projectTitle || `User ${otherParticipant?.slice(-4)}`}
                    </p>
                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-400 truncate">
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <span className="text-xs text-gray-500">
                      {formatTime(conversation.lastMessage.timestamp)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-600 rounded-full p-2">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    {activeConversation.projectTitle || `User ${activeConversation.participants.find(p => p !== user.id)?.slice(-4)}`}
                  </p>
                  <p className="text-sm text-gray-400">
                    {activeConversation.projectId ? `Project: ${activeConversation.projectId.slice(-6)}` : 'Direct Message'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {user.type === 'client' && (
                  <motion.button
                    onClick={() => setShowEscrowForm(!showEscrowForm)}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Create Escrow Payment"
                  >
                    <Shield className="h-4 w-4" />
                  </motion.button>
                )}
                
                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Upload File"
                >
                  <Paperclip className="h-4 w-4" />
                </motion.button>
                
                {onClose && (
                  <motion.button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Escrow Form */}
            <AnimatePresence>
              {showEscrowForm && user.type === 'client' && (
                <motion.div
                  className="p-4 bg-slate-700 border-b border-gray-600"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <div className="space-y-3">
                    <h4 className="text-white font-medium flex items-center space-x-2">
                      <Shield className="h-4 w-4 text-green-400" />
                      <span>Create Secure Escrow Payment</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        placeholder="Amount ($)"
                        value={escrowAmount}
                        onChange={(e) => setEscrowAmount(e.target.value)}
                        className="px-3 py-2 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                        step="0.01"
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={escrowDescription}
                        onChange={(e) => setEscrowDescription(e.target.value)}
                        className="px-3 py-2 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <motion.button
                        onClick={createEscrow}
                        disabled={!escrowAmount}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Create Escrow
                      </motion.button>
                      <p className="text-xs text-gray-400">
                        Funds will be held securely until project completion
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === user.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {getMessageIcon(message.type)}
                        {message.type !== 'text' && (
                          <span className="text-sm font-medium">
                            {message.type === 'file' ? 'File Shared' :
                             message.type === 'payment_request' ? 'Payment Request' :
                             message.type === 'escrow_created' ? 'Escrow Created' : ''}
                          </span>
                        )}
                        {message.filtered && (
                          <AlertCircle className="h-3 w-3 text-yellow-400" title="Message was filtered for off-platform contact" />
                        )}
                      </div>
                      
                      <p className="text-sm">{message.content}</p>
                      
                      {renderFilePreview(message)}
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs opacity-75">
                          {formatTime(message.timestamp)}
                        </span>
                        {message.senderId === user.id && (
                          <span className="text-xs opacity-75">
                            {message.read ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700">
              {uploading && (
                <div className="mb-3 flex items-center space-x-2 text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  <span className="text-sm">Uploading files...</span>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <motion.button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-2 rounded-lg transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Send className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedMessagingInterface;