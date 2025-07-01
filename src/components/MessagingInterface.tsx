import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, DollarSign, CheckCircle, Clock, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { messagingService, Message, Conversation } from '../services/messagingService';
import { useAuth } from '../contexts/AuthContext';
import AudioUpload from './AudioUpload';

interface MessagingInterfaceProps {
  conversationId?: string;
  recipientId?: string;
  projectId?: string;
  onClose?: () => void;
}

const MessagingInterface: React.FC<MessagingInterfaceProps> = ({
  conversationId: initialConversationId,
  recipientId,
  projectId,
  onClose
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showPaymentRequest, setShowPaymentRequest] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showAudioUpload, setShowAudioUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    messagingService.connect(user.id);
    loadConversations();

    const handleMessage = (message: Message) => {
      if (activeConversation && message.conversationId === activeConversation.id) {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      }
      loadConversations(); // Refresh to update last message
    };

    const handleConversationCreated = (conversation: Conversation) => {
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
  }, [user, activeConversation]);

  useEffect(() => {
    if (initialConversationId) {
      const conversation = conversations.find(c => c.id === initialConversationId);
      if (conversation) {
        setActiveConversation(conversation);
        loadMessages(conversation.id);
      }
    } else if (recipientId && user) {
      // Find or create conversation
      const existingConversation = messagingService.findConversation([user.id, recipientId], projectId);
      if (existingConversation) {
        setActiveConversation(existingConversation);
        loadMessages(existingConversation.id);
      } else {
        createNewConversation();
      }
    }
  }, [initialConversationId, recipientId, conversations, user, projectId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = () => {
    if (!user) return;
    const userConversations = messagingService.getConversations(user.id);
    setConversations(userConversations);
  };

  const loadMessages = (conversationId: string) => {
    const conversationMessages = messagingService.getMessages(conversationId);
    setMessages(conversationMessages);
    
    // Mark messages as read
    conversationMessages
      .filter(m => m.receiverId === user?.id && !m.read)
      .forEach(m => messagingService.markAsRead(m.id));
  };

  const createNewConversation = async () => {
    if (!user || !recipientId) return;
    
    const conversation = await messagingService.createConversation([user.id, recipientId], projectId);
    setActiveConversation(conversation);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !user) return;

    const recipientId = activeConversation.participants.find(p => p !== user.id);
    if (!recipientId) return;

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
  };

  const sendPaymentRequest = async () => {
    if (!paymentAmount || !activeConversation || !user) return;

    const recipientId = activeConversation.participants.find(p => p !== user.id);
    if (!recipientId) return;

    await messagingService.sendMessage(
      activeConversation.id,
      user.id,
      recipientId,
      `Payment request for $${paymentAmount}`,
      'payment_request',
      { paymentAmount: parseFloat(paymentAmount), paymentCurrency: 'USD' }
    );

    setPaymentAmount('');
    setShowPaymentRequest(false);
    loadMessages(activeConversation.id);
    loadConversations();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'payment_request':
        return <DollarSign className="h-4 w-4" />;
      case 'payment_release':
        return <CheckCircle className="h-4 w-4" />;
      case 'audio':
        return <Paperclip className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-96 bg-slate-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Messages</h3>
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
                      User {otherParticipant?.slice(-4)}
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
                    User {activeConversation.participants.find(p => p !== user.id)?.slice(-4)}
                  </p>
                  <p className="text-sm text-gray-400">
                    {activeConversation.projectId ? `Project: ${activeConversation.projectId.slice(-6)}` : 'Direct Message'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={() => setShowPaymentRequest(!showPaymentRequest)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <DollarSign className="h-4 w-4" />
                </motion.button>
                
                <motion.button
                  onClick={() => setShowAudioUpload(!showAudioUpload)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Paperclip className="h-4 w-4" />
                </motion.button>
                
                {onClose && (
                  <motion.button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    ×
                  </motion.button>
                )}
              </div>
            </div>

            {/* Payment Request Form */}
            <AnimatePresence>
              {showPaymentRequest && (
                <motion.div
                  className="p-4 bg-slate-700 border-b border-gray-600"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      placeholder="Amount ($)"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <motion.button
                      onClick={sendPaymentRequest}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Request
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Audio Upload */}
            <AnimatePresence>
              {showAudioUpload && (
                <motion.div
                  className="p-4 bg-slate-700 border-b border-gray-600"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <AudioUpload
                    userId={user.id}
                    projectId={activeConversation.projectId}
                    type="project_delivery"
                    maxFiles={3}
                    title="Share Audio File"
                    onUploadComplete={(file) => {
                      const recipientId = activeConversation.participants.find(p => p !== user.id);
                      if (recipientId) {
                        messagingService.sendMessage(
                          activeConversation.id,
                          user.id,
                          recipientId,
                          `Shared audio file: ${file.name}`,
                          'audio',
                          { audioFileId: file.id, fileName: file.name }
                        );
                        loadMessages(activeConversation.id);
                        loadConversations();
                      }
                      setShowAudioUpload(false);
                    }}
                  />
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
                        <span className="text-sm font-medium">
                          {message.type === 'payment_request' ? 'Payment Request' :
                           message.type === 'payment_release' ? 'Payment Released' :
                           message.type === 'audio' ? 'Audio File' : ''}
                        </span>
                      </div>
                      
                      <p className="text-sm">{message.content}</p>
                      
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

export default MessagingInterface;