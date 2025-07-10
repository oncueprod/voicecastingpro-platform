import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  X, 
  Download,
  Image as ImageIcon,
  FileText,
  Music,
  AlertTriangle,
  User,
  Search,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { messagingService, Message, Conversation } from '../services/messagingService';

interface MessagingSystemProps {
  onClose?: () => void;
  initialConversationId?: string;
}

const MessagingSystem: React.FC<MessagingSystemProps> = ({ onClose, initialConversationId }) => {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize messaging service and load data
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    console.log('🔄 Initializing messaging system for user:', user.id);
    
    // Connect to messaging service
    messagingService.connect(user.id);
    loadConversationsFromService();

    // Listen for real-time message updates
    const handleMessage = (message: Message) => {
      console.log('📨 Received new message:', message);
      if (activeConversation && message.conversationId === activeConversation.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }
      // Refresh conversations to update last message
      loadConversationsFromService();
    };

    const handleConversationCreated = (conversation: Conversation) => {
      console.log('💬 New conversation created:', conversation);
      setConversations(prev => {
        // Avoid duplicates
        if (prev.find(c => c.id === conversation.id)) return prev;
        return [conversation, ...prev];
      });
    };

    // Set up event listeners
    messagingService.on('message', handleMessage);
    messagingService.on('conversation_created', handleConversationCreated);
    
    // Monitor WebSocket connection status
    const handleConnect = () => setSocketStatus('connected');
    const handleConnectError = () => setSocketStatus('error');
    
    window.addEventListener('socket_connected', handleConnect);
    window.addEventListener('socket_error', handleConnectError);

    return () => {
      messagingService.off('message', handleMessage);
      messagingService.off('conversation_created', handleConversationCreated);
      window.removeEventListener('socket_connected', handleConnect);
      window.removeEventListener('socket_error', handleConnectError);
      messagingService.disconnect();
    };
  }, [user, isAuthenticated, activeConversation]);

  // Load initial conversation if specified
  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const conversation = conversations.find(c => c.id === initialConversationId);
      if (conversation) {
        setActiveConversation(conversation);
        loadMessagesFromService(conversation.id);
      }
    }
  }, [initialConversationId, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations from messaging service (real data, not mock)
  const loadConversationsFromService = async () => {
    if (!user) return;
    
    try {
      console.log('📂 Loading conversations for user:', user.id);
      setLoading(true);
      
      // Get conversations from messaging service
      const userConversations = messagingService.getConversations(user.id);
      console.log('📂 Loaded conversations:', userConversations.length);
      
      // Try to also fetch from backend API
      try {
        const authToken = localStorage.getItem('auth_token') || 
                         localStorage.getItem('authToken') || 
                         localStorage.getItem('token');
        
        if (authToken) {
          const response = await fetch('/api/messages/conversations', {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('🌐 Backend conversations:', data.conversations?.length || 0);
            
            // Merge backend conversations with local ones
            if (data.conversations && Array.isArray(data.conversations)) {
              const mergedConversations = [...userConversations];
              
              data.conversations.forEach((backendConv: any) => {
                const exists = mergedConversations.find(c => c.id === backendConv.id);
                if (!exists) {
                  // Convert backend format to frontend format
                  const conversation: Conversation = {
                    id: backendConv.id,
                    participants: backendConv.participants || [],
                    projectId: backendConv.project_id,
                    projectTitle: backendConv.project_title,
                    lastMessage: backendConv.last_message ? {
                      id: backendConv.last_message.id,
                      conversationId: backendConv.last_message.conversation_id,
                      senderId: backendConv.last_message.sender_id,
                      receiverId: backendConv.last_message.recipient_id,
                      content: backendConv.last_message.content,
                      timestamp: new Date(backendConv.last_message.created_at),
                      type: backendConv.last_message.type || 'text',
                      read: !!backendConv.last_message.read_at
                    } : undefined,
                    createdAt: new Date(backendConv.created_at),
                    updatedAt: new Date(backendConv.last_message_at || backendConv.created_at)
                  };
                  mergedConversations.push(conversation);
                }
              });
              
              setConversations(mergedConversations);
              return;
            }
          }
        }
      } catch (apiError) {
        console.log('⚠️ Backend API not available, using local data only');
      }
      
      setConversations(userConversations);
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load messages from messaging service (real data, not mock)
  const loadMessagesFromService = async (conversationId: string) => {
    if (!user) return;
    
    try {
      console.log('💬 Loading messages for conversation:', conversationId);
      setLoading(true);
      
      // Get messages from messaging service
      const conversationMessages = messagingService.getMessages(conversationId);
      console.log('💬 Loaded local messages:', conversationMessages.length);
      
      // Try to also fetch from backend API
      try {
        const authToken = localStorage.getItem('auth_token') || 
                         localStorage.getItem('authToken') || 
                         localStorage.getItem('token');
        
        if (authToken) {
          const response = await fetch(`/api/messages/conversations/${conversationId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('🌐 Backend messages:', data.messages?.length || 0);
            
            if (data.messages && Array.isArray(data.messages)) {
              const backendMessages: Message[] = data.messages.map((msg: any) => ({
                id: msg.id,
                conversationId: msg.conversation_id,
                senderId: msg.sender_id,
                receiverId: msg.recipient_id,
                content: msg.filtered_content || msg.content,
                originalContent: msg.is_filtered ? msg.content : undefined,
                timestamp: new Date(msg.created_at),
                type: msg.type || 'text',
                metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
                read: !!msg.read_at,
                filtered: !!msg.is_filtered
              }));
              
              // Merge with local messages, avoid duplicates
              const mergedMessages = [...conversationMessages];
              backendMessages.forEach(backendMsg => {
                const exists = mergedMessages.find(m => m.id === backendMsg.id);
                if (!exists) {
                  mergedMessages.push(backendMsg);
                }
              });
              
              // Sort by timestamp
              mergedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              
              setMessages(mergedMessages);
              
              // Mark messages as read
              conversationMessages
                .filter(m => m.receiverId === user.id && !m.read)
                .forEach(m => messagingService.markAsRead(m.id));
              
              return;
            }
          }
        }
      } catch (apiError) {
        console.log('⚠️ Backend API not available, using local data only');
      }
      
      setMessages(conversationMessages);
      
      // Mark messages as read
      conversationMessages
        .filter(m => m.receiverId === user.id && !m.read)
        .forEach(m => messagingService.markAsRead(m.id));
        
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !user) return;

    const recipientId = activeConversation.participants.find(p => p !== user.id);
    if (!recipientId) return;

    try {
      console.log('📤 Sending message:', { conversationId: activeConversation.id, content: newMessage });
      
      await messagingService.sendMessage(
        activeConversation.id,
        user.id,
        recipientId,
        newMessage,
        'text'
      );

      setNewMessage('');
      loadMessagesFromService(activeConversation.id);
      loadConversationsFromService();
      
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      alert(error instanceof Error ? error.message : 'Failed to send message');
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !activeConversation || !user) return;

    const recipientId = activeConversation.participants.find(p => p !== user.id);
    if (!recipientId) return;

    try {
      setLoading(true);
      console.log('📎 Uploading files:', files.length);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type and size
        const allowedTypes = [
          'text/plain',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/png',
          'image/jpeg',
          'image/jpg',
          'audio/mp3',
          'audio/wav',
          'audio/mpeg'
        ];

        if (!allowedTypes.includes(file.type)) {
          alert(`File type ${file.type} is not supported. Please upload TXT, PDF, DOCX, PNG, JPG, MP3, or WAV files.`);
          continue;
        }

        if (file.size > 50 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 50MB.`);
          continue;
        }
        
        await messagingService.sendFileMessage(
          activeConversation.id,
          user.id,
          recipientId,
          file
        );
      }
      
      loadMessagesFromService(activeConversation.id);
      loadConversationsFromService();
      setShowAttachmentMenu(false);
      
      console.log('✅ Files uploaded successfully');
    } catch (error) {
      console.error('❌ File upload failed:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-400" />;
    if (type.startsWith('audio/')) return <Music className="h-5 w-5 text-green-400" />;
    return <FileText className="h-5 w-5 text-gray-400" />;
  };

  // Get user name for display
  const getUserDisplayName = (userId: string): string => {
    // Try to get from stored user data
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const foundUser = users.find((u: any) => u.id === userId);
    if (foundUser) return foundUser.name;
    
    // Fallback to user ID suffix
    return `User ${userId.slice(-4)}`;
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const otherParticipant = conv.participants.find(p => p !== user?.id);
    const participantName = otherParticipant ? getUserDisplayName(otherParticipant) : '';
    
    return participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           conv.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleBackClick = () => {
    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  if (!user || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-96 bg-slate-800 rounded-xl border border-gray-700 items-center justify-center">
            <div className="text-center p-8">
              <p className="text-gray-400 mb-4">Please sign in to access messaging</p>
              <motion.button
                onClick={handleBackClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Back to Home
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.button
          onClick={handleBackClick}
          className="flex items-center space-x-2 text-white/80 hover:text-white mb-6 lg:mb-8 transition-colors"
          whileHover={{ x: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </motion.button>
        
        <div className="bg-slate-800 rounded-xl p-6 border border-gray-700 mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Messaging Center</h1>
          <p className="text-gray-300 text-sm sm:text-base">
            {user.type === 'client' 
              ? 'Connect with voice talent and discuss your projects securely.' 
              : 'Communicate with clients and discuss project details securely.'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${
              socketStatus === 'connected' ? 'bg-green-500' : 
              socketStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-xs text-gray-400">
              {socketStatus === 'connected' ? 'Connected' : 
               socketStatus === 'error' ? 'Connection Error' : 'Connecting...'}
            </span>
          </div>
        </div>
        
        <div 
          className="h-[500px] sm:h-[600px] bg-slate-800 rounded-xl border border-gray-700 overflow-hidden relative"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center">
              <div className="bg-slate-800 rounded-lg p-4 flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <span className="text-white">Loading...</span>
              </div>
            </div>
          )}

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
          <div className="w-1/3 border-r border-gray-700 h-full flex flex-col hidden sm:flex">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Messages</h3>
                <span className="text-sm text-gray-400">
                  {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 text-sm"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => {
                  const otherParticipant = conversation.participants.find(p => p !== user.id);
                  const participantName = otherParticipant ? getUserDisplayName(otherParticipant) : 'Unknown User';
                  const unreadCount = messagingService.getUnreadCount(user.id);
                  
                  return (
                    <motion.div
                      key={conversation.id}
                      className={`p-4 border-b border-gray-700 cursor-pointer hover:bg-slate-700 transition-colors ${
                        activeConversation?.id === conversation.id ? 'bg-slate-700' : ''
                      }`}
                      onClick={() => {
                        setActiveConversation(conversation);
                        loadMessagesFromService(conversation.id);
                      }}
                      whileHover={{ backgroundColor: 'rgba(51, 65, 85, 0.8)' }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 rounded-full p-2 relative">
                          <User className="h-4 w-4 text-white" />
                          {unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {participantName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {conversation.projectTitle || 'Direct Message'}
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
                })
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <p className="text-gray-400 mb-2">
                      {searchQuery ? 'No conversations found' : 'No conversations yet'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.type === 'client' 
                        ? 'Start by browsing voice talent and contacting them' 
                        : 'Conversations with clients will appear here'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Conversations List */}
          <div className="sm:hidden w-full h-full flex flex-col">
            {!activeConversation ? (
              <>
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Messages</h3>
                    <span className="text-sm text-gray-400">
                      {filteredConversations.length}
                    </span>
                  </div>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.length > 0 ? (
                    filteredConversations.map((conversation) => {
                      const otherParticipant = conversation.participants.find(p => p !== user.id);
                      const participantName = otherParticipant ? getUserDisplayName(otherParticipant) : 'Unknown User';
                      
                      return (
                        <motion.div
                          key={conversation.id}
                          className="p-4 border-b border-gray-700 cursor-pointer hover:bg-slate-700 transition-colors"
                          onClick={() => {
                            setActiveConversation(conversation);
                            loadMessagesFromService(conversation.id);
                          }}
                          whileHover={{ backgroundColor: 'rgba(51, 65, 85, 0.8)' }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-blue-600 rounded-full p-2">
                              <User className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">
                                {participantName}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {conversation.projectTitle || 'Direct Message'}
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
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-6">
                        <p className="text-gray-400 mb-2">No conversations found</p>
                        <p className="text-sm text-gray-500">
                          {user.type === 'client' 
                            ? 'Start by browsing voice talent and contacting them' 
                            : 'Conversations with clients will appear here'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Chat Area for Mobile
              <div className="flex-1 flex flex-col h-full">
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-600 rounded-full p-2">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {getUserDisplayName(activeConversation.participants.find(p => p !== user.id) || '')}
                        </p>
                        <p className="text-sm text-gray-400">
                          {activeConversation.projectTitle || 'Direct Message'}
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      className="text-gray-400 hover:text-white"
                      onClick={() => setActiveConversation(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  </div>
                </div>

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
                          {message.filtered && (
                            <div className="flex items-center space-x-1 mb-1">
                              <AlertTriangle className="h-3 w-3 text-yellow-400" />
                              <span className="text-xs text-yellow-400">Content filtered</span>
                            </div>
                          )}
                          
                          <p className="text-sm">{message.content}</p>
                          
                          {message.metadata?.fileId && (
                            <div className="mt-2 p-3 bg-black/20 rounded-lg border border-white/20">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  {getFileIcon(message.metadata.fileType || '')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{message.metadata.fileName}</p>
                                  <p className="text-xs opacity-75">
                                    {formatFileSize(message.metadata.fileSize || 0)}
                                  </p>
                                </div>
                                <button className="text-white/80 hover:text-white p-1 rounded">
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs opacity-75">
                              {formatTime(message.timestamp)}
                            </span>
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
                    <div className="relative">
                      <button
                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      
                      {showAttachmentMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-slate-700 rounded-lg shadow-lg border border-gray-600 p-2 min-w-48">
                          <label className="block px-3 py-2 text-sm text-gray-300 hover:bg-slate-600 rounded cursor-pointer">
                            📄 Document (PDF, DOC, TXT)
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.txt"
                              onChange={(e) => handleFileUpload(e.target.files)}
                              className="hidden"
                            />
                          </label>
                          <label className="block px-3 py-2 text-sm text-gray-300 hover:bg-slate-600 rounded cursor-pointer">
                            🖼️ Image (PNG, JPG)
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              onChange={(e) => handleFileUpload(e.target.files)}
                              className="hidden"
                            />
                          </label>
                          <label className="block px-3 py-2 text-sm text-gray-300 hover:bg-slate-600 rounded cursor-pointer">
                            🎵 Audio (MP3, WAV)
                            <input
                              type="file"
                              accept="audio/mp3,audio/wav,audio/mpeg"
                              onChange={(e) => handleFileUpload(e.target.files)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                    
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
                  
                  {/* Security Notice */}
                  <p className="text-xs text-gray-500 mt-2">
                    🔒 Messages are monitored to prevent off-platform contact sharing for your security
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Chat Area */}
          {activeConversation && (
            <div className="flex-1 flex-col h-full hidden sm:flex">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 rounded-full p-2">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {getUserDisplayName(activeConversation.participants.find(p => p !== user.id) || '')}
                    </p>
                    <p className="text-sm text-gray-400">
                      {activeConversation.projectTitle || 'Direct Message'}
                    </p>
                  </div>
                </div>
              </div>

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
                        {message.filtered && (
                          <div className="flex items-center space-x-1 mb-1">
                            <AlertTriangle className="h-3 w-3 text-yellow-400" />
                            <span className="text-xs text-yellow-400">Content filtered</span>
                          </div>
                        )}
                        
                        <p className="text-sm">{message.content}</p>
                        
                        {message.metadata?.fileId && (
                          <div className="mt-2 p-3 bg-black/20 rounded-lg border border-white/20">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                {getFileIcon(message.metadata.fileType || '')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{message.metadata.fileName}</p>
                                <p className="text-xs opacity-75">
                                  {formatFileSize(message.metadata.fileSize || 0)}
                                </p>
                              </div>
                              <button className="text-white/80 hover:text-white p-1 rounded">
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs opacity-75">
                            {formatTime(message.timestamp)}
                          </span>
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
                  <div className="relative">
                    <button
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    
                    {showAttachmentMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-slate-700 rounded-lg shadow-lg border border-gray-600 p-2 min-w-48">
                        <label className="block px-3 py-2 text-sm text-gray-300 hover:bg-slate-600 rounded cursor-pointer">
                          📄 Document (PDF, DOC, TXT)
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="hidden"
                          />
                        </label>
                        <label className="block px-3 py-2 text-sm text-gray-300 hover:bg-slate-600 rounded cursor-pointer">
                          🖼️ Image (PNG, JPG)
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="hidden"
                          />
                        </label>
                        <label className="block px-3 py-2 text-sm text-gray-300 hover:bg-slate-600 rounded cursor-pointer">
                          🎵 Audio (MP3, WAV)
                          <input
                            type="file"
                            accept="audio/mp3,audio/wav,audio/mpeg"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  
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
                
                {/* Security Notice */}
                <p className="text-xs text-gray-500 mt-2">
                  🔒 Messages are monitored to prevent off-platform contact sharing for your security
                </p>
              </div>
            </div>
          )}

          {/* No conversation selected (Desktop) */}
          {!activeConversation && (
            <div className="flex-1 flex items-center justify-center hidden sm:flex">
              <div className="text-center">
                <User className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">Select a conversation to start messaging</p>
                <p className="text-sm text-gray-500">
                  {user.type === 'client' 
                    ? 'Or browse voice talent to start a new conversation' 
                    : 'Conversations with clients will appear here'}
                </p>
              </div>
            </div>
          )}

          {/* Hidden file input for drag & drop */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp3,.wav"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default MessagingSystem;