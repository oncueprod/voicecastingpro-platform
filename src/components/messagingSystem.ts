// components/MessagingSystem.tsx - Complete Fixed Messaging Component
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ArrowLeft,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  BellOff
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
  const [sending, setSending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const [notifications, setNotifications] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize messaging service and load data
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    console.log('🔄 Initializing messaging system for user:', user.id);
    
    const initializeMessaging = async () => {
      try {
        setLoading(true);
        setConnecting(true);
        setSocketStatus('connecting');
        
        // Connect to messaging service
        await messagingService.connect(user.id);
        setSocketStatus('connected');
        setConnecting(false);
        console.log('✅ Connected to messaging service');
        
        // Load conversations
        await loadConversationsFromService();
        
        // Update unread count
        updateUnreadCount();
        
      } catch (error) {
        console.error('❌ Failed to connect messaging service:', error);
        setSocketStatus('error');
        setConnecting(false);
        
        // Still try to load local data
        try {
          await loadConversationsFromService();
        } catch (localError) {
          console.error('❌ Failed to load local conversations:', localError);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeMessaging();

    // Set up event listeners
    const handleMessage = (message: Message) => {
      console.log('📨 Received new message:', message);
      
      setLastActivity(new Date());
      
      if (activeConversation && message.conversationId === activeConversation.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === message.id)) return prev;
          const updated = [...prev, message];
          return updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
        scrollToBottom();
        
        // Mark as read if we're viewing the conversation
        if (message.receiverId === user.id) {
          setTimeout(() => {
            messagingService.markAsRead(message.id);
          }, 1000);
        }
      }
      
      // Show browser notification for new messages
      if (message.receiverId === user.id && notifications && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('New Message - VoiceCasting Pro', {
            body: message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content,
            icon: '/favicon.ico'
          });
        }
      }
      
      // Refresh conversations to update last message
      loadConversationsFromService();
      updateUnreadCount();
    };

    const handleConversationCreated = (conversation: Conversation) => {
      console.log('💬 New conversation created:', conversation);
      setConversations(prev => {
        // Avoid duplicates
        if (prev.find(c => c.id === conversation.id)) return prev;
        return [conversation, ...prev];
      });
    };

    const handleMessageRead = (messageId: string) => {
      console.log('👁️ Message read:', messageId);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
      updateUnreadCount();
    };

    const handleUserTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === activeConversation?.id && data.userId !== user.id) {
        setTypingUsers(prev => new Set([...prev, data.userId]));
        
        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const updated = new Set(prev);
            updated.delete(data.userId);
            return updated;
          });
        }, 3000);
      }
    };

    const handleSocketConnect = () => {
      console.log('🔌 Socket connected');
      setSocketStatus('connected');
      setConnecting(false);
    };

    const handleSocketDisconnect = () => {
      console.log('🔌 Socket disconnected');
      setSocketStatus('connecting');
    };

    const handleSocketError = () => {
      console.log('❌ Socket error');
      setSocketStatus('error');
      setConnecting(false);
    };

    // Set up event listeners
    messagingService.on('message', handleMessage);
    messagingService.on('conversation_created', handleConversationCreated);
    messagingService.on('message_read', handleMessageRead);
    messagingService.on('user_typing', handleUserTyping);
    
    // Monitor WebSocket connection status
    window.addEventListener('socket_connected', handleSocketConnect);
    window.addEventListener('socket_disconnected', handleSocketDisconnect);
    window.addEventListener('socket_error', handleSocketError);

    return () => {
      // Clean up event listeners
      messagingService.off('message', handleMessage);
      messagingService.off('conversation_created', handleConversationCreated);
      messagingService.off('message_read', handleMessageRead);
      messagingService.off('user_typing', handleUserTyping);
      
      window.removeEventListener('socket_connected', handleSocketConnect);
      window.removeEventListener('socket_disconnected', handleSocketDisconnect);
      window.removeEventListener('socket_error', handleSocketError);
      
      // Disconnect messaging service
      messagingService.disconnect();
    };
  }, [user, isAuthenticated, activeConversation, notifications]);

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

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Load conversations from service
  const loadConversationsFromService = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('📂 Loading conversations for user:', user.id);
      
      // Get conversations from messaging service
      const userConversations = messagingService.getConversations(user.id);
      console.log('📂 Loaded conversations:', userConversations.length);
      
      // Sort by last message time
      const sortedConversations = userConversations.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp || a.updatedAt;
        const bTime = b.lastMessage?.timestamp || b.updatedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      
      setConversations(sortedConversations);
      
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      setConversations([]);
    }
  }, [user]);

  // Load messages for conversation
  const loadMessagesFromService = useCallback(async (conversationId: string) => {
    if (!user || !conversationId) return;
    
    try {
      console.log('💬 Loading messages for conversation:', conversationId);
      setLoading(true);
      
      // Get messages from messaging service
      const conversationMessages = messagingService.getMessages(conversationId);
      console.log('💬 Loaded messages:', conversationMessages.length);
      
      // Sort by timestamp
      const sortedMessages = conversationMessages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setMessages(sortedMessages);
      
      // Mark unread messages as read
      const unreadMessages = sortedMessages.filter(m => 
        m.receiverId === user.id && !m.read
      );
      
      unreadMessages.forEach(message => {
        setTimeout(() => {
          messagingService.markAsRead(message.id);
        }, 1000);
      });
      
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update unread count
  const updateUnreadCount = useCallback(() => {
    if (!user) return;
    try {
      const count = messagingService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.warn('⚠️ Error updating unread count:', error);
    }
  }, [user]);

  // Handle typing indicator
  const handleTyping = () => {
    if (activeConversation && user) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send typing event (you can implement this in the messaging service)
      // messagingService.sendTyping(activeConversation.id, user.id);
      
      // Set timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        // messagingService.stopTyping(activeConversation.id, user.id);
      }, 3000);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !user || sending) return;

    const recipientId = activeConversation.participants.find(p => p !== user.id);
    if (!recipientId) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      console.log('📤 Sending message:', { conversationId: activeConversation.id, content: messageContent });
      
      await messagingService.sendMessage(
        activeConversation.id,
        user.id,
        recipientId,
        messageContent,
        'text'
      );

      // Reload conversations and messages
      await Promise.all([
        loadMessagesFromService(activeConversation.id),
        loadConversationsFromService()
      ]);
      
      setLastActivity(new Date());
      console.log('✅ Message sent successfully');
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Restore message text on error
      setNewMessage(messageContent);
      
      // Show error to user
      alert(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Handle file upload
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
      
      // Reload conversations and messages
      await Promise.all([
        loadMessagesFromService(activeConversation.id),
        loadConversationsFromService()
      ]);
      
      setShowAttachmentMenu(false);
      setLastActivity(new Date());
      console.log('✅ Files uploaded successfully');
      
    } catch (error) {
      console.error('❌ File upload failed:', error);
      alert(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  // Retry connection
  const retryConnection = async () => {
    if (!user) return;
    
    setConnecting(true);
    try {
      await messagingService.connect(user.id);
      setSocketStatus('connected');
    } catch (error) {
      console.error('❌ Retry connection failed:', error);
      setSocketStatus('error');
    } finally {
      setConnecting(false);
    }
  };

  // Drag and drop handlers
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

  // Helper functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

  const getUserDisplayName = (userId: string): string => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const foundUser = users.find((u: any) => u.id === userId);
      if (foundUser) return foundUser.name;
    } catch (error) {
      console.warn('⚠️ Error parsing users from localStorage:', error);
    }
    
    return `User ${userId.slice(-4)}`;
  };

  const getConnectionStatusIcon = () => {
    switch (socketStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'error':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return connecting ? (
          <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />
        ) : (
          <Clock className="h-4 w-4 text-yellow-500" />
        );
    }
  };

  const getConnectionStatusText = () => {
    switch (socketStatus) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connection Error';
      default:
        return connecting ? 'Connecting...' : 'Disconnected';
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    try {
      if (!searchQuery) return true;
      
      const otherParticipant = conv.participants.find(p => p !== user?.id);
      const participantName = otherParticipant ? getUserDisplayName(otherParticipant) : '';
      
      return participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
             conv.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    } catch (filterError) {
      console.warn('⚠️ Error filtering conversation:', filterError);
      return true;
    }
  });

  const handleBackClick = () => {
    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  const toggleNotifications = () => {
    setNotifications(!notifications);
    if (notifications && 'Notification' in window) {
      Notification.requestPermission();
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Messaging Center
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-300 text-sm sm:text-base">
                {user.type === 'client' 
                  ? 'Connect with voice talent and discuss your projects securely.' 
                  : 'Communicate with clients and discuss project details securely.'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleNotifications}
                className="text-gray-400 hover:text-white transition-colors"
                title={notifications ? 'Disable notifications' : 'Enable notifications'}
              >
                {notifications ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </button>
              
              <div className="flex items-center gap-2">
                {getConnectionStatusIcon()}
                <span className="text-xs text-gray-400">
                  {getConnectionStatusText()}
                </span>
                {socketStatus === 'error' && (
                  <button
                    onClick={retryConnection}
                    disabled={connecting}
                    className="text-xs text-blue-400 hover:text-blue-300 underline disabled:opacity-50"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
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

          <div className="flex h-full">
            {/* Conversations List - Desktop */}
            <div className="w-1/3 border-r border-gray-700 h-full flex flex-col hidden sm:flex">
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
                    
                    // Get unread count for this conversation
                    const conversationMessages = messagingService.getMessages(conversation.id);
                    const unreadInConversation = conversationMessages.filter(m => 
                      m.receiverId === user.id && !m.read
                    ).length;
                    
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
                            {unreadInConversation > 0 && (
                              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {unreadInConversation}
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
                          <div className="text-right">
                            {conversation.lastMessage && (
                              <span className="text-xs text-gray-500">
                                {formatTime(conversation.lastMessage.timestamp)}
                              </span>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {conversation.lastMessage && formatDate(conversation.lastMessage.timestamp)}
                            </div>
                          </div>
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

            {/* Chat Area - Desktop and Mobile */}
            {activeConversation ? (
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
                        {typingUsers.size > 0 && (
                          <p className="text-xs text-blue-400 italic">
                            typing...
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      className="text-gray-400 hover:text-white sm:hidden"
                      onClick={() => setActiveConversation(null)}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <AnimatePresence>
                    {messages.map((message, index) => {
                      const showDate = index === 0 || 
                        formatDate(message.timestamp) !== formatDate(messages[index - 1].timestamp);
                      
                      return (
                        <React.Fragment key={message.id}>
                          {showDate && (
                            <div className="text-center my-4">
                              <span className="bg-slate-700 text-gray-400 text-xs px-3 py-1 rounded-full">
                                {formatDate(message.timestamp)}
                              </span>
                            </div>
                          )}
                          
                          <motion.div
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
                                    <a
                                      href={message.metadata.fileUrl}
                                      download={message.metadata.fileName}
                                      className="text-white/80 hover:text-white p-1 rounded"
                                    >
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs opacity-75">
                                  {formatTime(message.timestamp)}
                                </span>
                                {message.senderId === user.id && (
                                  <div className="flex items-center space-x-1">
                                    {message.read ? (
                                      <CheckCircle className="h-3 w-3 text-green-400" />
                                    ) : (
                                      <Clock className="h-3 w-3 text-gray-400" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        </React.Fragment>
                      );
                    })}
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
                        disabled={loading}
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      
                      {showAttachmentMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-slate-700 rounded-lg shadow-lg border border-gray-600 p-2 min-w-48 z-10">
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
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      disabled={sending || socketStatus === 'error'}
                      className="flex-1 px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    />
                    <motion.button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending || socketStatus === 'error'}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-2 rounded-lg transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {sending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </motion.button>
                  </div>
                  
                  {/* Security Notice */}
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      🔒 Messages are monitored to prevent off-platform contact sharing for your security
                    </p>
                    {lastActivity && (
                      <p className="text-xs text-gray-500">
                        Last activity: {formatTime(lastActivity)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* No conversation selected */
              <div className="flex-1 flex items-center justify-center">
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
          </div>

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