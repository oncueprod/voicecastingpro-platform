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
  Filter,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  originalContent?: string;
  timestamp: Date;
  type: 'text' | 'file';
  fileAttachment?: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  };
  isFiltered: boolean;
  flaggedContent?: string[];
}

interface Conversation {
  id: string;
  participants: {
    id: string;
    name: string;
    type: 'client' | 'talent';
  }[];
  lastMessage?: Message;
  unreadCount: number;
  projectTitle?: string;
}

interface MessagingSystemProps {
  onClose?: () => void;
  initialConversationId?: string;
}

const MessagingSystem: React.FC<MessagingSystemProps> = ({ onClose, initialConversationId }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Content filtering patterns
  const filterPatterns = [
    // Email patterns
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL REMOVED]' },
    // Phone patterns
    { pattern: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, replacement: '[PHONE REMOVED]' },
    // Social media patterns
    { pattern: /(?:instagram|insta|ig|twitter|facebook|fb|linkedin|skype|discord|whatsapp)[\s:@]*[a-zA-Z0-9._]+/gi, replacement: '[SOCIAL MEDIA REMOVED]' },
    // Website patterns
    { pattern: /(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g, replacement: '[WEBSITE REMOVED]' },
    // Contact solicitation
    { pattern: /contact\s+me\s+(?:at|on|via|through)/gi, replacement: '[CONTACT INFO REMOVED]' }
  ];

  useEffect(() => {
    loadConversations();
    if (initialConversationId) {
      const conversation = conversations.find(c => c.id === initialConversationId);
      if (conversation) {
        setActiveConversation(conversation);
        loadMessages(conversation.id);
      }
    }
  }, [initialConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = () => {
    // Generate mock conversations based on user type
    let mockConversations: Conversation[] = [];
    
    if (user?.type === 'client') {
      mockConversations = [
        {
          id: 'conv_1',
          participants: [
            { id: user.id, name: user.name, type: 'client' },
            { id: 'talent_1', name: 'Sarah Mitchell', type: 'talent' }
          ],
          unreadCount: 2,
          projectTitle: 'Commercial Voice Over',
          lastMessage: {
            id: 'msg_1',
            senderId: 'talent_1',
            senderName: 'Sarah Mitchell',
            content: 'I can definitely help with your commercial project!',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            type: 'text',
            isFiltered: false
          }
        },
        {
          id: 'conv_2',
          participants: [
            { id: user.id, name: user.name, type: 'client' },
            { id: 'talent_2', name: 'Marcus Johnson', type: 'talent' }
          ],
          unreadCount: 0,
          projectTitle: 'E-Learning Narration',
          lastMessage: {
            id: 'msg_2',
            senderId: user.id,
            senderName: user.name,
            content: 'Thank you for the samples, they sound great!',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
            type: 'text',
            isFiltered: false
          }
        }
      ];
    } else if (user?.type === 'talent') {
      mockConversations = [
        {
          id: 'conv_3',
          participants: [
            { id: user.id, name: user.name, type: 'talent' },
            { id: 'client_1', name: 'TechFlow Inc.', type: 'client' }
          ],
          unreadCount: 1,
          projectTitle: 'Tech Product Launch',
          lastMessage: {
            id: 'msg_3',
            senderId: 'client_1',
            senderName: 'TechFlow Inc.',
            content: 'Your voice is exactly what we need for our product launch!',
            timestamp: new Date(Date.now() - 1000 * 60 * 15),
            type: 'text',
            isFiltered: false
          }
        },
        {
          id: 'conv_4',
          participants: [
            { id: user.id, name: user.name, type: 'talent' },
            { id: 'client_2', name: 'EduCorp Learning', type: 'client' }
          ],
          unreadCount: 0,
          projectTitle: 'Educational Series',
          lastMessage: {
            id: 'msg_4',
            senderId: user.id,
            senderName: user.name,
            content: 'I\'ve attached the completed audio files for your review.',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
            type: 'text',
            isFiltered: false
          }
        }
      ];
    }
    
    setConversations(mockConversations);
  };

  const loadMessages = (conversationId: string) => {
    // Generate mock messages based on conversation
    const mockMessages: Message[] = [];
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) return;
    
    const otherParticipant = conversation.participants.find(p => p.id !== user?.id);
    if (!otherParticipant) return;
    
    // Add some mock messages
    if (conversationId === 'conv_1' || conversationId === 'conv_3') {
      mockMessages.push(
        {
          id: 'msg_1_1',
          senderId: user?.type === 'client' ? user.id : otherParticipant.id,
          senderName: user?.type === 'client' ? user.name : otherParticipant.name,
          content: 'Hi there! I\'m looking for a professional voice over for our new tech product launch.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
          type: 'text',
          isFiltered: false
        },
        {
          id: 'msg_1_2',
          senderId: user?.type === 'talent' ? user.id : otherParticipant.id,
          senderName: user?.type === 'talent' ? user.name : otherParticipant.name,
          content: 'Hello! Thank you for reaching out. I\'d be happy to help with your project. Could you tell me more about what you\'re looking for?',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23),
          type: 'text',
          isFiltered: false
        },
        {
          id: 'msg_1_3',
          senderId: user?.type === 'client' ? user.id : otherParticipant.id,
          senderName: user?.type === 'client' ? user.name : otherParticipant.name,
          content: 'We need a 30-second commercial for our new app launch. The tone should be energetic and professional.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22),
          type: 'text',
          isFiltered: false
        },
        {
          id: 'msg_1_4',
          senderId: user?.type === 'talent' ? user.id : otherParticipant.id,
          senderName: user?.type === 'talent' ? user.name : otherParticipant.name,
          content: 'Perfect! I have experience with tech commercials. Here\'s a sample of my work.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          type: 'file',
          fileAttachment: {
            id: 'file_1',
            name: 'commercial_sample.mp3',
            type: 'audio/mpeg',
            size: 2048000,
            url: '#'
          },
          isFiltered: false
        }
      );
    } else if (conversationId === 'conv_2' || conversationId === 'conv_4') {
      mockMessages.push(
        {
          id: 'msg_2_1',
          senderId: user?.type === 'client' ? user.id : otherParticipant.id,
          senderName: user?.type === 'client' ? user.name : otherParticipant.name,
          content: 'Hello! We\'re looking for a narrator for our educational series on science.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
          type: 'text',
          isFiltered: false
        },
        {
          id: 'msg_2_2',
          senderId: user?.type === 'talent' ? user.id : otherParticipant.id,
          senderName: user?.type === 'talent' ? user.name : otherParticipant.name,
          content: 'Hi there! I\'d love to work on your educational series. I have experience with science narration and can provide a clear, engaging delivery.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 47),
          type: 'text',
          isFiltered: false
        },
        {
          id: 'msg_2_3',
          senderId: user?.type === 'client' ? user.id : otherParticipant.id,
          senderName: user?.type === 'client' ? user.name : otherParticipant.name,
          content: 'Great! Here\'s the script for the first episode. Could you provide a short sample reading?',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 46),
          type: 'file',
          fileAttachment: {
            id: 'file_2',
            name: 'science_script_ep1.pdf',
            type: 'application/pdf',
            size: 1024000,
            url: '#'
          },
          isFiltered: false
        },
        {
          id: 'msg_2_4',
          senderId: user?.type === 'talent' ? user.id : otherParticipant.id,
          senderName: user?.type === 'talent' ? user.name : otherParticipant.name,
          content: 'Here\'s my sample reading of the first paragraph. Let me know what you think!',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
          type: 'file',
          fileAttachment: {
            id: 'file_3',
            name: 'science_sample.mp3',
            type: 'audio/mpeg',
            size: 3072000,
            url: '#'
          },
          isFiltered: false
        },
        {
          id: 'msg_2_5',
          senderId: user?.type === 'client' ? user.id : otherParticipant.id,
          senderName: user?.type === 'client' ? user.name : otherParticipant.name,
          content: 'This sounds perfect! I\'d like to hire you for the entire series. Let\'s discuss the details and payment.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
          type: 'text',
          isFiltered: false
        }
      );
    }
    
    setMessages(mockMessages);
  };

  const filterMessage = (content: string): { filtered: string; flagged: string[] } => {
    let filtered = content;
    const flagged: string[] = [];

    filterPatterns.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        flagged.push(...matches);
        filtered = filtered.replace(pattern, replacement);
      }
    });

    return { filtered, flagged };
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !activeConversation || !user) return;

    const { filtered, flagged } = filterMessage(newMessage);
    const isFiltered = flagged.length > 0;

    const message: Message = {
      id: `msg_${Date.now()}`,
      senderId: user.id,
      senderName: user.name,
      content: isFiltered ? filtered : newMessage,
      originalContent: isFiltered ? newMessage : undefined,
      timestamp: new Date(),
      type: 'text',
      isFiltered,
      flaggedContent: flagged.length > 0 ? flagged : undefined
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Show warning if content was filtered
    if (isFiltered) {
      alert('Your message contained contact information that was automatically removed to keep communication secure on our platform.');
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || !activeConversation || !user) return;

    Array.from(files).forEach(file => {
      // Validate file type
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
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 50MB.`);
        return;
      }

      // Create file message
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random()}`,
        senderId: user.id,
        senderName: user.name,
        content: `📎 Shared file: ${file.name}`,
        timestamp: new Date(),
        type: 'file',
        fileAttachment: {
          id: `file_${Date.now()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file)
        },
        isFiltered: false
      };

      setMessages(prev => [...prev, message]);
    });

    setShowAttachmentMenu(false);
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

  const filteredConversations = conversations.filter(conv =>
    searchQuery === '' || 
    conv.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    conv.projectTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBackClick = () => {
    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  if (!user) {
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
          className="flex items-center space-x-2 text-white/80 hover:text-white mb-8 transition-colors"
          whileHover={{ x: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </motion.button>
        
        <div className="bg-slate-800 rounded-xl p-6 border border-gray-700 mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Messaging Center</h1>
          <p className="text-gray-300">
            {user.type === 'client' 
              ? 'Connect with voice talent and discuss your projects securely.' 
              : 'Communicate with clients and discuss project details securely.'}
          </p>
        </div>
        
        <div 
          className="h-[600px] bg-slate-800 rounded-xl border border-gray-700 overflow-hidden relative"
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
          <div className="w-1/3 border-r border-gray-700 h-full flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Messages</h3>
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
                  const otherParticipant = conversation.participants.find(p => p.id !== user.id);
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
                        <div className="bg-blue-600 rounded-full p-2 relative">
                          <User className="h-4 w-4 text-white" />
                          {conversation.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {conversation.unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {otherParticipant?.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {conversation.projectTitle}
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
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col h-full">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-600 rounded-full p-2">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {activeConversation.participants.find(p => p.id !== user.id)?.name}
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
                          {message.isFiltered && (
                            <div className="flex items-center space-x-1 mb-1">
                              <AlertTriangle className="h-3 w-3 text-yellow-400" />
                              <span className="text-xs text-yellow-400">Content filtered</span>
                            </div>
                          )}
                          
                          <p className="text-sm">{message.content}</p>
                          
                          {message.fileAttachment && (
                            <div className="mt-2 p-3 bg-black/20 rounded-lg border border-white/20">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  {getFileIcon(message.fileAttachment.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{message.fileAttachment.name}</p>
                                  <p className="text-xs opacity-75">
                                    {formatFileSize(message.fileAttachment.size)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = message.fileAttachment!.url;
                                    link.download = message.fileAttachment!.name;
                                    link.click();
                                  }}
                                  className="text-white/80 hover:text-white p-1 rounded"
                                >
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
              </>
            ) : (
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