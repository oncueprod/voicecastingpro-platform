// MessagingSystem.tsx - COMPLETE VERSION WITH FILE UPLOADS
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { messagingService, User, Message, Conversation } from '../services/messagingService';

interface MessagingSystemProps {
  currentUser?: User;
  onClose?: () => void;
  isOpen?: boolean;
  talentId?: string;
  initialMessage?: string;
}

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  data?: string;
}

const MessagingSystem: React.FC<MessagingSystemProps> = ({ 
  currentUser, 
  onClose, 
  isOpen = true,
  talentId,
  initialMessage 
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState(initialMessage || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newConversationMode, setNewConversationMode] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeUser = currentUser || user;

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize messaging system
  useEffect(() => {
    const initializeMessaging = async () => {
      try {
        console.log('🔄 Initializing full-featured MessagingSystem');
        
        if (activeUser) {
          messagingService.setCurrentUser(activeUser);
        }
        
        const serviceUser = messagingService.getCurrentUser();
        if (!serviceUser) {
          setError('Please log in to access messaging');
          setLoading(false);
          return;
        }
        
        console.log('👤 User authenticated:', serviceUser.id);
        
        // Initialize messaging service
        await messagingService.initialize(serviceUser.id);
        
        // Load conversations
        const convs = await messagingService.loadConversations(serviceUser.id);
        setConversations(convs);
        
        // Load available users for new conversations
        await loadAvailableUsers();
        
        // If talentId provided, create/find conversation
        if (talentId && convs.length === 0) {
          await createConversationWithTalent(talentId);
        }
        
        setLoading(false);
        console.log('✅ Full messaging system initialized');
        
      } catch (err) {
        console.error('❌ Failed to initialize messaging:', err);
        setError('Failed to load messaging system. Please refresh and try again.');
        setLoading(false);
      }
    };

    if (isOpen) {
      initializeMessaging();
    }

    // Event listeners
    const handleConversationsLoaded = (convs: Conversation[]) => {
      setConversations(convs);
    };

    const handleNewMessage = (message: Message) => {
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages(prev => [...prev, message]);
      }
    };

    messagingService.on('conversationsLoaded', handleConversationsLoaded);
    messagingService.on('newMessage', handleNewMessage);

    return () => {
      messagingService.off('conversationsLoaded', handleConversationsLoaded);
      messagingService.off('newMessage', handleNewMessage);
    };
  }, [activeUser, isOpen, talentId]);

  // Load available users
  const loadAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users.filter((u: User) => u.id !== activeUser?.id));
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // Create conversation with specific talent
  const createConversationWithTalent = async (talentId: string) => {
    const talent = availableUsers.find(u => u.id === talentId);
    if (talent && activeUser) {
      const newConv: Conversation = {
        id: `conv_${activeUser.id}_${talentId}`,
        participants: [activeUser.id, talentId],
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        projectTitle: `Conversation with ${talent.name}`
      };
      
      setConversations(prev => [newConv, ...prev]);
      setSelectedConversation(newConv);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: FileAttachment = {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          data: e.target?.result as string
        };
        
        setAttachments(prev => [...prev, attachment]);
      };
      
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle emoji selection
  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  // Common emojis
  const commonEmojis = ['😀', '😍', '🤔', '👍', '❤️', '😂', '😎', '🔥', '💯', '🎉', '👏', '💪'];

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // Send message with attachments
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && attachments.length === 0) || !selectedConversation || sending) return;

    const serviceUser = messagingService.getCurrentUser();
    if (!serviceUser) {
      setError('Please log in to send messages');
      return;
    }

    const recipientId = selectedConversation.participants.find(p => p !== serviceUser.id);
    if (!recipientId) {
      setError('No recipient found in this conversation');
      return;
    }

    setSending(true);
    setError(null);

    try {
      console.log('📤 Sending message with attachments:', attachments.length);
      
      // Prepare message content
      let messageContent = newMessage.trim();
      
      // Add attachment info to message
      if (attachments.length > 0) {
        const attachmentText = attachments.map(att => `📎 ${att.name} (${formatFileSize(att.size)})`).join('\n');
        messageContent = messageContent ? `${messageContent}\n\n${attachmentText}` : attachmentText;
      }
      
      // Send via messaging service
      await messagingService.sendMessage(recipientId, messageContent, serviceUser.name);
      
      // Create local message for immediate UI update
      const newMsg: Message = {
        id: `temp_${Date.now()}`,
        senderId: serviceUser.id,
        recipientId: recipientId,
        content: messageContent,
        timestamp: new Date().toISOString(),
        senderName: serviceUser.name
      };
      
      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      setAttachments([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      console.log('✅ Message sent successfully');
      
    } catch (err) {
      console.error('❌ Failed to send message:', err);
      setError('Failed to send message. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  };

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv =>
    conv.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter available users for new conversation
  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  if (loading) {
    return (
      <motion.div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="bg-white rounded-lg p-8 shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading messaging system...</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (error && !conversations.length) {
    return (
      <motion.div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="bg-white rounded-lg p-8 shadow-2xl max-w-md"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <p className="text-red-600 mb-6">{error}</p>
            <div className="space-x-4">
              <button 
                onClick={() => window.location.reload()} 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Reload Page
              </button>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <motion.div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[80vh] flex overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Conversations Sidebar */}
        <div className="w-1/3 border-r border-gray-200 bg-gray-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Messages</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setNewConversationMode(!newConversationMode)}
                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                  title="New Conversation"
                >
                  ➕
                </button>
                {onClose && (
                  <button 
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 p-2 transition-colors"
                    title="Close"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            {/* Search */}
            <input
              type="text"
              placeholder={newConversationMode ? "Search users..." : "Search conversations..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Conversations/Users List */}
          <div className="flex-1 overflow-y-auto">
            {newConversationMode ? (
              // Available Users
              <div className="p-2">
                <h3 className="text-sm font-semibold text-gray-600 px-2 py-1">Start New Conversation</h3>
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => {
                      createConversationWithTalent(user.id);
                      setNewConversationMode(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500 capitalize">{user.type}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              // Conversations
              filteredConversations.length === 0 ? (
                <motion.div 
                  className="p-8 text-center text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="text-4xl mb-4">💬</div>
                  <p className="mb-2">No conversations yet</p>
                  <p className="text-sm">Click ➕ to start a new conversation</p>
                </motion.div>
              ) : (
                filteredConversations.map((conversation, index) => (
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
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 truncate">
                          {conversation.projectTitle || 'Conversation'}
                        </div>
                        <div className="text-sm text-gray-500 truncate mt-1">
                          {conversation.lastMessage || 'No messages yet'}
                        </div>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 ml-2">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(conversation.lastMessageTime).toLocaleString()}
                    </div>
                  </motion.button>
                ))
              )
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {selectedConversation.projectTitle || 'Conversation'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedConversation.participants.length} participants
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-gray-400 hover:text-gray-600 p-2" title="Call">
                      📞
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 p-2" title="Video Call">
                      📹
                    </button>
                    <button className="text-gray-400 hover:text-gray-600 p-2" title="Settings">
                      ⚙️
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <motion.div 
                    className="text-center text-gray-500 mt-16"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-lg mb-2">Start the conversation!</p>
                    <p className="text-sm">Send a message to begin chatting</p>
                  </motion.div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      className={`flex ${
                        message.senderId === messagingService.getCurrentUser()?.id 
                          ? 'justify-end' 
                          : 'justify-start'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div
                        className={`max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                          message.senderId === messagingService.getCurrentUser()?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className={`text-xs mt-2 ${
                          message.senderId === messagingService.getCurrentUser()?.id 
                            ? 'text-blue-100' 
                            : 'text-gray-500'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                {/* Error Display */}
                {error && (
                  <motion.div 
                    className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachments.map(attachment => (
                      <div key={attachment.id} className="flex items-center bg-gray-100 rounded-lg p-2">
                        <span className="text-sm truncate max-w-32">
                          📎 {attachment.name}
                        </span>
                        <button
                          onClick={() => removeAttachment(attachment.id)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Input Form */}
                <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                  {/* Emoji Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      😀
                    </button>
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <motion.div 
                        className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        {commonEmojis.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => addEmoji(emoji)}
                            className="p-1 hover:bg-gray-100 rounded text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* File Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Attach File"
                  >
                    📎
                  </button>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  />

                  {/* Message Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextareaChange}
                    placeholder="Type your message..."
                    disabled={sending}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none min-h-[44px] max-h-[120px]"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />

                  {/* Send Button */}
                  <motion.button
                    type="submit"
                    disabled={(!newMessage.trim() && attachments.length === 0) || sending}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    whileHover={{ scale: sending ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {sending ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      '➤'
                    )}
                  </motion.button>
                </form>

                <p className="text-xs text-gray-400 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (
            <motion.div 
              className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <div className="text-6xl mb-6">💬</div>
                <h3 className="text-xl font-semibold mb-2">Welcome to Messages</h3>
                <p className="mb-4">Select a conversation to start messaging</p>
                <button
                  onClick={() => setNewConversationMode(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start New Conversation
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MessagingSystem;