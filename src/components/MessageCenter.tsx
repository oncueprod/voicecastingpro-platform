// src/components/MessageCenter.tsx - COMPLETE MESSAGE CENTER COMPONENT (TypeScript)
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  Search, 
  ArrowLeft, 
  Users, 
  MessageCircle, 
  Star, 
  MapPin, 
  Clock,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

// TypeScript interfaces
interface CurrentUser {
  id: string;
  name: string;
  type: 'client' | 'talent';
}

interface AvailableUser {
  id: string;
  name: string;
  type: 'client' | 'talent';
  location?: string;
  avatar?: string;
  rating?: number;
  hourlyRate?: number;
  specialties?: string[];
  bio?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  plan?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'image' | 'audio';
  senderName?: string;
}

interface Conversation {
  id: string;
  participants: string[];
  projectTitle?: string;
  lastMessage?: {
    id: string;
    content: string;
    timestamp: Date;
    senderId: string;
  };
  createdAt: Date;
  updatedAt: Date;
  unreadCount?: number;
}

const MessageCenter: React.FC = () => {
  // IMPORTANT: Replace this with your actual user ID
  const [currentUser] = useState<CurrentUser>({
    id: 'user_1752164361991_e4ogp44sg', 
    name: 'Current User',
    type: 'client'
  });
  
  const [view, setView] = useState<'conversations' | 'discover'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    console.log('🚀 Message Center initializing...');
    initializeMessageCenter();
    return () => cleanup();
  }, []);

  const initializeMessageCenter = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('1. Testing API endpoints...');
      await testApiEndpoints();
      
      console.log('2. Loading conversations...');
      await loadConversations();
      
      console.log('3. Loading available users...');
      await loadAvailableUsers();
      
      console.log('4. Setting up WebSocket...');
      setupWebSocket();
      
      setConnected(true);
      console.log('✅ Message Center initialized successfully');
      
    } catch (error) {
      console.error('❌ Message Center initialization failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize');
    } finally {
      setLoading(false);
    }
  };

  const testApiEndpoints = async (): Promise<void> => {
    const endpoints = [
      '/api/health',
      '/api/users/discovery', 
      '/api/conversations'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { 'user-id': currentUser.id }
        });
        
        console.log(`${endpoint}: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`${endpoint} returned ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ ${endpoint} failed:`, error);
        throw new Error(`API endpoint ${endpoint} is not working`);
      }
    }
  };

  const loadConversations = async (): Promise<void> => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.status}`);
      }

      const conversationsData = await response.json();
      console.log('📋 Loaded conversations:', conversationsData.length);
      
      setConversations(conversationsData.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        lastMessage: conv.lastMessage ? {
          ...conv.lastMessage,
          timestamp: new Date(conv.lastMessage.timestamp)
        } : undefined
      })));

    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      setConversations([]);
    }
  };

  const loadAvailableUsers = async (): Promise<void> => {
    try {
      const response = await fetch('/api/users/discovery', {
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.status}`);
      }

      const users = await response.json();
      console.log('👥 Loaded available users:', users.length);
      
      setAvailableUsers(users.map((user: any) => ({
        ...user,
        lastSeen: user.lastSeen ? new Date(user.lastSeen) : new Date()
      })));

    } catch (error) {
      console.error('❌ Failed to load users:', error);
      setAvailableUsers([]);
    }
  };

  const setupWebSocket = (): void => {
    try {
      if (typeof window !== 'undefined' && (window as any).io) {
        console.log('🔌 Connecting WebSocket...');
        
        socketRef.current = (window as any).io(window.location.origin, {
          transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
          console.log('✅ WebSocket connected');
          socketRef.current.emit('join_user_room', { userId: currentUser.id });
        });

        socketRef.current.on('new_message', (messageData: any) => {
          console.log('📨 Received real-time message:', messageData);
          handleIncomingMessage(messageData);
        });

        socketRef.current.on('disconnect', () => {
          console.log('📴 WebSocket disconnected');
        });

      } else {
        console.warn('⚠️ Socket.IO not available, using polling mode');
      }
    } catch (error) {
      console.warn('⚠️ WebSocket setup failed:', error);
    }
  };

  const handleIncomingMessage = (messageData: any): void => {
    const message: Message = {
      ...messageData,
      timestamp: new Date(messageData.timestamp)
    };

    if (activeConversation && message.conversationId === activeConversation.id) {
      setMessages(prev => {
        const exists = prev.find(m => m.id === message.id);
        if (exists) return prev;
        
        const updated = [...prev, message];
        return updated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      });
    }

    loadConversations();
  };

  const startConversation = async (targetUser: AvailableUser): Promise<void> => {
    try {
      setLoading(true);
      console.log('💬 Starting conversation with:', targetUser.name);

      const existingConv = conversations.find(conv => 
        conv.participants.includes(targetUser.id)
      );

      if (existingConv) {
        setActiveConversation(existingConv);
        await loadMessages(existingConv.id);
        setView('conversations');
        return;
      }

      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        },
        body: JSON.stringify({
          conversationId,
          participants: [currentUser.id, targetUser.id],
          projectTitle: `Conversation with ${targetUser.name}`
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status}`);
      }

      const result = await response.json();
      const newConversation: Conversation = {
        ...result.conversation,
        createdAt: new Date(result.conversation.createdAt),
        updatedAt: new Date(result.conversation.updatedAt)
      };

      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      setMessages([]);
      setView('conversations');

      console.log('✅ Conversation created successfully');

    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      setError(`Failed to start conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (): Promise<void> => {
    if (!newMessage.trim() || !activeConversation) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const receiverId = activeConversation.participants.find(p => p !== currentUser.id);
    
    if (!receiverId) return;

    const tempMessage: Message = {
      id: messageId,
      conversationId: activeConversation.id,
      senderId: currentUser.id,
      receiverId,
      content: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          conversationId: activeConversation.id,
          senderId: currentUser.id,
          receiverId,
          content: tempMessage.content,
          type: 'text'
        });
      }

      const response = await fetch('/api/contact/talent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          senderId: currentUser.id,
          receiverId,
          content: tempMessage.content,
          type: 'text',
          timestamp: tempMessage.timestamp.toISOString(),
          messageId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      console.log('✅ Message sent successfully');
      
      setTimeout(() => {
        loadConversations();
      }, 500);

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      setError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadMessages = async (conversationId: string): Promise<void> => {
    try {
      setMessages([]);
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
    }
  };

  const selectConversation = (conversation: Conversation): void => {
    setActiveConversation(conversation);
    loadMessages(conversation.id);
  };

  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cleanup = (): void => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getUserById = (userId: string): AvailableUser => {
    return availableUsers.find(user => user.id === userId) || { 
      id: userId,
      name: `User ${userId.slice(-4)}`, 
      avatar: '👤',
      type: 'client'
    };
  };

  const filteredUsers = availableUsers.filter(user => {
    if (!searchQuery) return true;
    return user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Loading state
  if (loading && conversations.length === 0 && availableUsers.length === 0) {
    return (
      <div className="h-96 bg-slate-800 rounded-xl border border-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white">Loading Message Center...</p>
          <p className="text-gray-400 text-sm">Testing API endpoints and loading data</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-96 bg-slate-800 rounded-xl border border-gray-700 flex items-center justify-center">
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Message Center Error</h3>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              initializeMessageCenter();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-slate-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700 p-4 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Message Center</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 text-sm">Disconnected</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setView('conversations')}
                className={`p-2 rounded ${view === 'conversations' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('discover')}
                className={`p-2 rounded ${view === 'discover' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Users className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-700 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder={view === 'discover' ? 'Search users...' : 'Search conversations...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {view === 'conversations' ? (
              /* Conversations List */
              conversations.length > 0 ? (
                conversations.map((conversation) => {
                  const otherUser = getUserById(conversation.participants.find(p => p !== currentUser.id) || '');
                  
                  return (
                    <div
                      key={conversation.id}
                      className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-slate-700 ${
                        activeConversation?.id === conversation.id ? 'bg-slate-700' : ''
                      }`}
                      onClick={() => selectConversation(conversation)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 rounded-full p-2 text-sm">
                          {otherUser.avatar || '👤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{otherUser.name}</p>
                          <p className="text-xs text-gray-400 truncate">{conversation.projectTitle}</p>
                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-400 truncate">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                        {conversation.unreadCount && conversation.unreadCount > 0 && (
                          <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <MessageCircle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">No conversations yet</p>
                    <button
                      onClick={() => setView('discover')}
                      className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                    >
                      Find users to message
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* User Discovery */
              filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div key={user.id} className="p-3 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="bg-blue-600 rounded-full p-2 text-sm">
                            {user.avatar || '👤'}
                          </div>
                          {user.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium truncate">{user.name}</p>
                            {user.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs text-gray-400">{user.rating}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <MapPin className="h-3 w-3" />
                            <span>{user.location}</span>
                          </div>
                          {user.specialties && (
                            <p className="text-xs text-gray-500 truncate">
                              {user.specialties.slice(0, 2).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => startConversation(user)}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Message
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <Users className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">No users found</p>
                    <p className="text-gray-500 text-sm">Check your search or try again</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Chat Area */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                {(() => {
                  const otherUser = getUserById(activeConversation.participants.find(p => p !== currentUser.id) || '');
                  return (
                    <>
                      <div className="bg-blue-600 rounded-full p-2">
                        {otherUser.avatar || '👤'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{otherUser.name}</p>
                        <p className="text-sm text-gray-400">
                          {otherUser.isOnline ? 'Online now' : `Last seen ${formatLastSeen(otherUser.lastSeen || new Date())}`}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === currentUser.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">Start your conversation</p>
                    <p className="text-gray-500 text-sm">Send a message to begin</p>
                  </div>
                </div>
              )}
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
                  className="flex-1 px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-2 rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Select a conversation to start messaging</p>
              <p className="text-sm text-gray-500">
                Found {availableUsers.length} users available to message
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageCenter;
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  User, 
  Search, 
  ArrowLeft, 
  Users, 
  MessageCircle, 
  Star, 
  MapPin, 
  Clock,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

const MessageCenter = () => {
  // IMPORTANT: Replace this with your actual user ID
  const [currentUser] = useState({
    id: 'user_1752164361991_e4ogp44sg', 
    name: 'Current User',
    type: 'client'
  });
  
  const [view, setView] = useState('conversations');
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    console.log('🚀 Message Center initializing...');
    initializeMessageCenter();
    return () => cleanup();
  }, []);

  const initializeMessageCenter = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('1. Testing API endpoints...');
      await testApiEndpoints();
      
      console.log('2. Loading conversations...');
      await loadConversations();
      
      console.log('3. Loading available users...');
      await loadAvailableUsers();
      
      console.log('4. Setting up WebSocket...');
      setupWebSocket();
      
      setConnected(true);
      console.log('✅ Message Center initialized successfully');
      
    } catch (error) {
      console.error('❌ Message Center initialization failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const testApiEndpoints = async () => {
    const endpoints = [
      '/api/health',
      '/api/users/discovery', 
      '/api/conversations'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { 'user-id': currentUser.id }
        });
        
        console.log(`${endpoint}: ${response.status}`);
        
        if (!response.ok) {
          throw new Error(`${endpoint} returned ${response.status}`);
        }
      } catch (error) {
        console.error(`❌ ${endpoint} failed:`, error);
        throw new Error(`API endpoint ${endpoint} is not working`);
      }
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load conversations: ${response.status}`);
      }

      const conversationsData = await response.json();
      console.log('📋 Loaded conversations:', conversationsData.length);
      
      setConversations(conversationsData.map(conv => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        lastMessage: conv.lastMessage ? {
          ...conv.lastMessage,
          timestamp: new Date(conv.lastMessage.timestamp)
        } : null
      })));

    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      setConversations([]);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users/discovery', {
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.status}`);
      }

      const users = await response.json();
      console.log('👥 Loaded available users:', users.length);
      
      setAvailableUsers(users.map(user => ({
        ...user,
        lastSeen: user.lastSeen ? new Date(user.lastSeen) : new Date()
      })));

    } catch (error) {
      console.error('❌ Failed to load users:', error);
      setAvailableUsers([]);
    }
  };

  const setupWebSocket = () => {
    try {
      if (typeof window !== 'undefined' && window.io) {
        console.log('🔌 Connecting WebSocket...');
        
        socketRef.current = window.io(window.location.origin, {
          transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
          console.log('✅ WebSocket connected');
          socketRef.current.emit('join_user_room', { userId: currentUser.id });
        });

        socketRef.current.on('new_message', (messageData) => {
          console.log('📨 Received real-time message:', messageData);
          handleIncomingMessage(messageData);
        });

        socketRef.current.on('disconnect', () => {
          console.log('📴 WebSocket disconnected');
        });

      } else {
        console.warn('⚠️ Socket.IO not available, using polling mode');
      }
    } catch (error) {
      console.warn('⚠️ WebSocket setup failed:', error);
    }
  };

  const handleIncomingMessage = (messageData) => {
    const message = {
      ...messageData,
      timestamp: new Date(messageData.timestamp)
    };

    if (activeConversation && message.conversationId === activeConversation.id) {
      setMessages(prev => {
        const exists = prev.find(m => m.id === message.id);
        if (exists) return prev;
        
        const updated = [...prev, message];
        return updated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      });
    }

    loadConversations();
  };

  const startConversation = async (targetUser) => {
    try {
      setLoading(true);
      console.log('💬 Starting conversation with:', targetUser.name);

      const existingConv = conversations.find(conv => 
        conv.participants.includes(targetUser.id)
      );

      if (existingConv) {
        setActiveConversation(existingConv);
        await loadMessages(existingConv.id);
        setView('conversations');
        return;
      }

      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        },
        body: JSON.stringify({
          conversationId,
          participants: [currentUser.id, targetUser.id],
          projectTitle: `Conversation with ${targetUser.name}`
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status}`);
      }

      const result = await response.json();
      const newConversation = {
        ...result.conversation,
        createdAt: new Date(result.conversation.createdAt),
        updatedAt: new Date(result.conversation.updatedAt)
      };

      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);
      setMessages([]);
      setView('conversations');

      console.log('✅ Conversation created successfully');

    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      setError(`Failed to start conversation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const receiverId = activeConversation.participants.find(p => p !== currentUser.id);
    
    const tempMessage = {
      id: messageId,
      conversationId: activeConversation.id,
      senderId: currentUser.id,
      receiverId,
      content: newMessage.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom();

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          conversationId: activeConversation.id,
          senderId: currentUser.id,
          receiverId,
          content: tempMessage.content,
          type: 'text'
        });
      }

      const response = await fetch('/api/contact/talent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          senderId: currentUser.id,
          receiverId,
          content: tempMessage.content,
          type: 'text',
          timestamp: tempMessage.timestamp.toISOString(),
          messageId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }

      console.log('✅ Message sent successfully');
      
      setTimeout(() => {
        loadConversations();
      }, 500);

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      setError(`Failed to send message: ${error.message}`);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setMessages([]);
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
    }
  };

  const selectConversation = (conversation) => {
    setActiveConversation(conversation);
    loadMessages(conversation.id);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const cleanup = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getUserById = (userId) => {
    return availableUsers.find(user => user.id === userId) || { 
      name: `User ${userId.slice(-4)}`, 
      avatar: '👤' 
    };
  };

  const filteredUsers = availableUsers.filter(user => {
    if (!searchQuery) return true;
    return user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Loading state
  if (loading && conversations.length === 0 && availableUsers.length === 0) {
    return (
      <div className="h-96 bg-slate-800 rounded-xl border border-gray-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white">Loading Message Center...</p>
          <p className="text-gray-400 text-sm">Testing API endpoints and loading data</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-96 bg-slate-800 rounded-xl border border-gray-700 flex items-center justify-center">
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Message Center Error</h3>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              initializeMessageCenter();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-slate-800 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700 p-4 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Message Center</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <Wifi className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 text-sm">Disconnected</span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => setView('conversations')}
                className={`p-2 rounded ${view === 'conversations' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('discover')}
                className={`p-2 rounded ${view === 'discover' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <Users className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-700 flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder={view === 'discover' ? 'Search users...' : 'Search conversations...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {view === 'conversations' ? (
              /* Conversations List */
              conversations.length > 0 ? (
                conversations.map((conversation) => {
                  const otherUser = getUserById(conversation.participants.find(p => p !== currentUser.id));
                  
                  return (
                    <div
                      key={conversation.id}
                      className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-slate-700 ${
                        activeConversation?.id === conversation.id ? 'bg-slate-700' : ''
                      }`}
                      onClick={() => selectConversation(conversation)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 rounded-full p-2 text-sm">
                          {otherUser.avatar || '👤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{otherUser.name}</p>
                          <p className="text-xs text-gray-400 truncate">{conversation.projectTitle}</p>
                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-400 truncate">
                              {conversation.lastMessage.content}
                            </p>
                          )}
                        </div>
                        {conversation.unreadCount > 0 && (
                          <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <MessageCircle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">No conversations yet</p>
                    <button
                      onClick={() => setView('discover')}
                      className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                    >
                      Find users to message
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* User Discovery */
              filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <div key={user.id} className="p-3 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="bg-blue-600 rounded-full p-2 text-sm">
                            {user.avatar || '👤'}
                          </div>
                          {user.isOnline && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium truncate">{user.name}</p>
                            {user.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs text-gray-400">{user.rating}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <MapPin className="h-3 w-3" />
                            <span>{user.location}</span>
                          </div>
                          {user.specialties && (
                            <p className="text-xs text-gray-500 truncate">
                              {user.specialties.slice(0, 2).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => startConversation(user)}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Message
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <Users className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">No users found</p>
                    <p className="text-gray-500 text-sm">Check your search or try again</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Chat Area */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                {(() => {
                  const otherUser = getUserById(activeConversation.participants.find(p => p !== currentUser.id));
                  return (
                    <>
                      <div className="bg-blue-600 rounded-full p-2">
                        {otherUser.avatar || '👤'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{otherUser.name}</p>
                        <p className="text-sm text-gray-400">
                          {otherUser.isOnline ? 'Online now' : `Last seen ${formatLastSeen(otherUser.lastSeen)}`}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === currentUser.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">Start your conversation</p>
                    <p className="text-gray-500 text-sm">Send a message to begin</p>
                  </div>
                </div>
              )}
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
                  className="flex-1 px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-2 rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">Select a conversation to start messaging</p>
              <p className="text-sm text-gray-500">
                Found {availableUsers.length} users available to message
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageCenter;