// MessagingSystem.tsx - COMPLETE WORKING FILE
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { messagingService, User, Message, Conversation } from '../services/messagingService';

interface MessagingSystemProps {
  currentUser?: User;
  onClose?: () => void;
}

const MessagingSystem: React.FC<MessagingSystemProps> = ({ currentUser, onClose }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const activeUser = currentUser || user;

  useEffect(() => {
    const initializeMessaging = async () => {
      try {
        console.log('🔄 Initializing MessagingSystem component');
        
        if (activeUser) {
          messagingService.setCurrentUser(activeUser);
        }
        
        const serviceUser = messagingService.getCurrentUser();
        if (!serviceUser) {
          setError('No user logged in');
          setLoading(false);
          return;
        }
        
        console.log('👤 User found:', serviceUser.id);
        
        await messagingService.initialize(serviceUser.id);
        
        const convs = await messagingService.loadConversations(serviceUser.id);
        setConversations(convs);
        
        setLoading(false);
        console.log('✅ MessagingSystem initialized successfully');
        
      } catch (err) {
        console.error('❌ Failed to initialize messaging:', err);
        setError('Failed to initialize messaging system');
        setLoading(false);
      }
    };

    initializeMessaging();

    const handleConversationsLoaded = (convs: Conversation[]) => {
      setConversations(convs);
    };

    messagingService.on('conversationsLoaded', handleConversationsLoaded);

    return () => {
      messagingService.off('conversationsLoaded', handleConversationsLoaded);
    };
  }, [activeUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || sending) return;

    const serviceUser = messagingService.getCurrentUser();
    if (!serviceUser) {
      setError('No user logged in');
      return;
    }

    const recipientId = selectedConversation.participants.find(p => p !== serviceUser.id);
    if (!recipientId) {
      setError('No recipient found');
      return;
    }

    setSending(true);
    setError(null);

    try {
      console.log('📤 Sending message to:', recipientId);
      
      await messagingService.sendMessage(recipientId, newMessage.trim(), serviceUser.name);
      
      const newMsg: Message = {
        id: `temp_${Date.now()}`,
        senderId: serviceUser.id,
        recipientId: recipientId,
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        senderName: serviceUser.name
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      
      console.log('✅ Message sent successfully');
      
    } catch (err) {
      console.error('❌ Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading messaging system...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow-lg">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      className="bg-white rounded-lg shadow-lg h-96 flex overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
            {onClose && (
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl transition-colors"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <motion.div 
              className="p-4 text-center text-gray-500 h-full flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div>
                <div className="text-4xl mb-2">💬</div>
                <p>No conversations yet</p>
                <p className="text-sm mt-2">Start messaging with talents or clients!</p>
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {conversations.map((conversation, index) => (
                <motion.button
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setMessages([]);
                    setError(null);
                  }}
                  className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-100 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-100 border-blue-200' : ''
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {conversation.projectTitle || 'Conversation'}
                      </div>
                      <div className="text-sm text-gray-500 truncate">
                        {conversation.lastMessage || 'No messages yet'}
                      </div>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <motion.span 
                        className="bg-blue-600 text-white text-xs rounded-full px-2 py-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500 }}
                      >
                        {conversation.unreadCount}
                      </motion.span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(conversation.lastMessageTime).toLocaleString()}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <motion.div 
              className="p-4 border-b border-gray-200 bg-white"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="font-semibold text-gray-900">
                {selectedConversation.projectTitle || 'Conversation'}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedConversation.participants.length} participants
              </p>
            </motion.div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <motion.div 
                  className="text-center text-gray-500 mt-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-4xl mb-2">💬</div>
                  <p>No messages in this conversation yet</p>
                  <p className="text-sm mt-2">Send a message to get started!</p>
                </motion.div>
              ) : (
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      className={`flex ${
                        message.senderId === messagingService.getCurrentUser()?.id 
                          ? 'justify-end' 
                          : 'justify-start'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === messagingService.getCurrentUser()?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderId === messagingService.getCurrentUser()?.id 
                            ? 'text-blue-100' 
                            : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Message Input */}
            <motion.form 
              onSubmit={handleSendMessage} 
              className="p-4 border-t border-gray-200 bg-gray-50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {error && (
                <motion.div 
                  className="mb-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  {error}
                </motion.div>
              )}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={sending}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                />
                <motion.button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: sending ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {sending ? 'Sending...' : 'Send'}
                </motion.button>
              </div>
            </motion.form>
          </>
        ) : (
          <motion.div 
            className="flex-1 flex items-center justify-center text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <p>Select a conversation to start messaging</p>
              <p className="text-sm mt-2">Choose from the list on the left</p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default MessagingSystem;