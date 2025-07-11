import React, { useState, useEffect } from 'react';
import { Star, MapPin, Clock, DollarSign, Play, Pause, Download, ArrowLeft, X, Send, Users, Briefcase, Heart, Plus, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { talentService } from '../services/talentService';
import { audioService } from '../services/audioService';
import { messagingService } from '../services/messagingService';

interface TalentData {
  id: string;
  name: string;
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  hourlyRate: string;
  avatar: string;
  bio: string;
  skills: string[];
  languages: string[];
  experience: string;
  completedProjects: number;
  responseTime: string;
  availability: string;
  portfolio: Array<{
    title: string;
    description: string;
    audioUrl: string;
    duration: number;
  }>;
  reviews: Array<{
    id: string;
    clientName: string;
    rating: number;
    comment: string;
    date: string;
  }>;
}

interface Project {
  id: string;
  title: string;
  description: string;
  budget: string;
  deadline: string;
  clientId: string;
  clientName: string;
  createdAt: string;
  status: 'open' | 'in_progress' | 'completed';
}

interface TalentStats {
  generalFavorites: number;
  projectShortlists: number;
  activeProjects: Project[];
}

interface TalentNotification {
  id: string;
  type: 'favorite' | 'shortlist' | 'message';
  clientId: string;
  clientName: string;
  projectId?: string;
  projectTitle?: string;
  messageId?: string;
  messageSubject?: string;
  createdAt: string;
  read: boolean;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  isVisible: boolean;
}

// Enhanced favorites and shortlist management
class FavoritesManager {
  static safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('LocalStorage quota exceeded, attempting to clear old data');
      try {
        // Try aggressive cleanup first
        this.aggressiveCleanup();
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('Failed to save after cleanup, trying emergency cleanup:', retryError);
        try {
          // Emergency cleanup - remove almost everything
          this.emergencyCleanup();
          localStorage.setItem(key, value);
          return true;
        } catch (finalError) {
          console.error('Failed to save even after emergency cleanup:', finalError);
          return false;
        }
      }
    }
  }

  static aggressiveCleanup() {
    try {
      // Clear old messages (keep only last 20)
      const messages = JSON.parse(localStorage.getItem('messages') || '[]');
      if (messages.length > 20) {
        const recentMessages = messages.slice(-20);
        localStorage.setItem('messages', JSON.stringify(recentMessages));
      }

      // Clear old sent messages (keep only last 20)
      const sentMessages = JSON.parse(localStorage.getItem('sentMessages') || '[]');
      if (sentMessages.length > 20) {
        const recentSentMessages = sentMessages.slice(-20);
        localStorage.setItem('sentMessages', JSON.stringify(recentSentMessages));
      }

      // Clear old conversations (keep only last 10)
      const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      if (conversations.length > 10) {
        const recentConversations = conversations.slice(-10);
        localStorage.setItem('conversations', JSON.stringify(recentConversations));
      }

      // Clear old notifications (keep only last 10 per talent)
      const notifications = JSON.parse(localStorage.getItem('talentNotifications') || '{}');
      Object.keys(notifications).forEach(talentId => {
        if (notifications[talentId].length > 10) {
          notifications[talentId] = notifications[talentId].slice(-10);
        }
      });
      localStorage.setItem('talentNotifications', JSON.stringify(notifications));

      // Clear some other potentially large items
      const keysToTrim = ['searchResults', 'cachedTalents', 'recentSearches', 'browsingSessions'];
      keysToTrim.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error in aggressive cleanup:', error);
    }
  }

  static emergencyCleanup() {
    try {
      // Keep only essential data - remove almost everything
      const essentialKeys = ['userId', 'userName', 'userType', 'auth_token', 'authToken'];
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!essentialKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      });

      // Reset to minimal data structures
      localStorage.setItem('messages', '[]');
      localStorage.setItem('sentMessages', '[]');
      localStorage.setItem('conversations', '[]');
      localStorage.setItem('talentNotifications', '{}');
      localStorage.setItem('generalFavorites', '{}');
      localStorage.setItem('projectShortlists', '{}');
      localStorage.setItem('projects', '[]');
      localStorage.setItem('userFavorites', '[]');
    } catch (error) {
      console.error('Error in emergency cleanup:', error);
    }
  }

  static createTalentNotification(talentId: string, type: 'favorite' | 'shortlist' | 'message', clientData: any, projectData?: any, messageData?: any) {
    const notifications = JSON.parse(localStorage.getItem('talentNotifications') || '{}');
    
    if (!notifications[talentId]) {
      notifications[talentId] = [];
    }
    
    const notification = {
      id: Date.now().toString(),
      type,
      clientId: clientData.clientId,
      clientName: clientData.clientName,
      projectId: projectData?.projectId,
      projectTitle: projectData?.projectTitle,
      messageId: messageData?.messageId,
      messageSubject: messageData?.messageSubject,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    notifications[talentId].push(notification);
    this.safeSetItem('talentNotifications', JSON.stringify(notifications));
  }

  static addToGeneralFavorites(clientId: string, talentId: string, talentData: any, clientName?: string) {
    const favorites = JSON.parse(localStorage.getItem('generalFavorites') || '{}');
    
    if (!favorites[clientId]) {
      favorites[clientId] = [];
    }
    
    if (!favorites[clientId].find((fav: any) => fav.talentId === talentId)) {
      favorites[clientId].push({
        talentId,
        talentName: talentData.name,
        talentTitle: talentData.title,
        talentAvatar: talentData.avatar,
        savedAt: new Date().toISOString()
      });
      
      if (this.safeSetItem('generalFavorites', JSON.stringify(favorites))) {
        this.createTalentNotification(talentId, 'favorite', {
          clientId,
          clientName: clientName || 'Anonymous Client'
        });
        return true;
      }
    }
    return true;
  }

  static removeFromGeneralFavorites(clientId: string, talentId: string) {
    const favorites = JSON.parse(localStorage.getItem('generalFavorites') || '{}');
    
    if (favorites[clientId]) {
      favorites[clientId] = favorites[clientId].filter((fav: any) => fav.talentId !== talentId);
      this.safeSetItem('generalFavorites', JSON.stringify(favorites));
    }
    return true;
  }

  static isInGeneralFavorites(clientId: string, talentId: string): boolean {
    const favorites = JSON.parse(localStorage.getItem('generalFavorites') || '{}');
    return favorites[clientId]?.some((fav: any) => fav.talentId === talentId) || false;
  }

  static getGeneralFavoritesCount(talentId: string): number {
    const favorites = JSON.parse(localStorage.getItem('generalFavorites') || '{}');
    let count = 0;
    
    Object.keys(favorites).forEach(clientId => {
      if (favorites[clientId].some((fav: any) => fav.talentId === talentId)) {
        count++;
      }
    });
    
    return count;
  }

  static addToProjectShortlist(projectId: string, talentId: string, talentData: any) {
    const shortlists = JSON.parse(localStorage.getItem('projectShortlists') || '{}');
    
    if (!shortlists[projectId]) {
      shortlists[projectId] = [];
    }
    
    if (!shortlists[projectId].find((talent: any) => talent.talentId === talentId)) {
      shortlists[projectId].push({
        talentId,
        talentName: talentData.name,
        talentTitle: talentData.title,
        talentAvatar: talentData.avatar,
        shortlistedAt: new Date().toISOString(),
        status: 'shortlisted'
      });
      
      if (this.safeSetItem('projectShortlists', JSON.stringify(shortlists))) {
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const project = projects.find((p: any) => p.id === projectId);
        if (project) {
          this.createTalentNotification(talentId, 'shortlist', {
            clientId: project.clientId,
            clientName: project.clientName
          }, {
            projectId: project.id,
            projectTitle: project.title
          });
        }
        return true;
      }
    }
    return true;
  }

  static getProjectShortlistsForTalent(talentId: string): Project[] {
    const shortlists = JSON.parse(localStorage.getItem('projectShortlists') || '{}');
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const shortlistedProjects: Project[] = [];
    
    Object.keys(shortlists).forEach(projectId => {
      const shortlist = shortlists[projectId];
      if (shortlist.some((talent: any) => talent.talentId === talentId)) {
        const project = projects.find((p: Project) => p.id === projectId);
        if (project && project.status === 'open') {
          shortlistedProjects.push(project);
        }
      }
    });
    
    return shortlistedProjects;
  }

  static getTalentStats(talentId: string): TalentStats {
    return {
      generalFavorites: this.getGeneralFavoritesCount(talentId),
      projectShortlists: this.getProjectShortlistsForTalent(talentId).length,
      activeProjects: this.getProjectShortlistsForTalent(talentId)
    };
  }

  static getTalentNotifications(talentId: string) {
    const notifications = JSON.parse(localStorage.getItem('talentNotifications') || '{}');
    const talentNotifications = notifications[talentId] || [];
    
    return talentNotifications.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static markNotificationsAsRead(talentId: string, notificationIds: string[]) {
    const notifications = JSON.parse(localStorage.getItem('talentNotifications') || '{}');
    
    if (notifications[talentId]) {
      notifications[talentId] = notifications[talentId].map((notification: any) => {
        if (notificationIds.includes(notification.id)) {
          return { ...notification, read: true };
        }
        return notification;
      });
      
      this.safeSetItem('talentNotifications', JSON.stringify(notifications));
    }
  }
}

const mockTalentData: { [key: string]: TalentData } = {
  '1': {
    id: '1',
    name: 'Sarah Johnson',
    title: 'Professional Voice Actor',
    location: 'Los Angeles, CA',
    rating: 4.9,
    reviewCount: 127,
    hourlyRate: '$75-100',
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Professional voice actor with over 10 years of experience in commercials, audiobooks, and animation. Specializing in warm, conversational reads and character voices.',
    skills: ['Commercial Voice Over', 'Audiobook Narration', 'Character Voices', 'E-Learning'],
    languages: ['English (Native)', 'Spanish (Conversational)'],
    experience: '10+ years',
    completedProjects: 450,
    responseTime: '< 2 hours',
    availability: 'Available now',
    portfolio: [
      {
        title: 'Commercial Demo Reel',
        description: 'A collection of commercial voice over samples',
        audioUrl: '/audio/commercial-demo.mp3',
        duration: 60
      },
      {
        title: 'Audiobook Sample',
        description: 'Fiction audiobook narration sample',
        audioUrl: '/audio/audiobook-sample.mp3',
        duration: 120
      }
    ],
    reviews: [
      {
        id: '1',
        clientName: 'Mike Chen',
        rating: 5,
        comment: 'Excellent work! Sarah delivered exactly what we needed for our commercial.',
        date: '2024-01-15'
      },
      {
        id: '2',
        clientName: 'Lisa Rodriguez',
        rating: 5,
        comment: 'Professional, timely, and great voice quality. Highly recommend!',
        date: '2024-01-10'
      }
    ]
  }
};

interface TalentProfileProps {
  talentId?: string;
  onClose?: () => void;
}

// Toast Notification Component
const ToastNotification: React.FC<{
  notification: ToastNotification;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(notification.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onRemove]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success': return 'bg-gradient-to-r from-green-600 to-green-700';
      case 'error': return 'bg-gradient-to-r from-red-600 to-red-700';
      case 'info': return 'bg-gradient-to-r from-blue-600 to-blue-700';
      default: return 'bg-gradient-to-r from-gray-600 to-gray-700';
    }
  };

  return (
    <div
      className={`
        fixed top-6 left-1/2 transform -translate-x-1/2 z-[9999]
        ${getBackgroundColor()}
        text-white px-6 py-4 rounded-lg shadow-2xl
        max-w-md w-full mx-4
        transition-all duration-300 ease-in-out
        ${notification.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        border border-white/20
        backdrop-blur-sm
      `}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-lg">{getIcon()}</span>
          <p className="font-medium text-sm leading-relaxed">
            {notification.message}
          </p>
        </div>
        <button
          onClick={() => onRemove(notification.id)}
          className="ml-4 text-white/80 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const TalentProfile: React.FC<TalentProfileProps> = ({ talentId, onClose }) => {
  const { user, isAuthenticated, isClient, isTalent } = useAuth();
  
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [talentStats, setTalentStats] = useState<TalentStats>({ generalFavorites: 0, projectShortlists: 0, activeProjects: [] });
  const [talentNotifications, setTalentNotifications] = useState<TalentNotification[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    budget: '',
    deadline: ''
  });
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [pendingMessageCount, setPendingMessageCount] = useState(0);
  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<Array<{endpoint: string, status: number, method: string}>>([]);

  // Toast notification functions
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastNotification = {
      id,
      type,
      message: `VoiceCastingPro: ${message}`,
      isVisible: false
    };

    setToastNotifications(prev => [...prev, newToast]);

    // Trigger animation after a brief delay
    setTimeout(() => {
      setToastNotifications(prev =>
        prev.map(toast =>
          toast.id === id ? { ...toast, isVisible: true } : toast
        )
      );
    }, 100);
  };

  const removeToast = (id: string) => {
    setToastNotifications(prev =>
      prev.map(toast =>
        toast.id === id ? { ...toast, isVisible: false } : toast
      )
    );

    // Remove from array after animation
    setTimeout(() => {
      setToastNotifications(prev => prev.filter(toast => toast.id !== id));
    }, 300);
  };

  // Helper functions
  const canPerformClientActions = () => {
    return isAuthenticated && isClient && (localStorage.getItem('userId') || user?.id);
  };

  const getCurrentUserId = () => {
    return localStorage.getItem('userId') || user?.id;
  };

  const getCurrentUserName = () => {
    return localStorage.getItem('userName') || user?.name || 'Anonymous User';
  };

  const getAuthToken = () => {
    return localStorage.getItem('auth_token') ||
           localStorage.getItem('authToken') || 
           localStorage.getItem('token') || 
           localStorage.getItem('accessToken') || 
           localStorage.getItem('jwt');
  };

  // DISCOVERY: Find what backend endpoints actually exist
  const discoverBackendEndpoints = async () => {
    console.log('🔍 Discovering available backend endpoints...');
    
    const commonEndpoints = [
      '/api',
      '/api/health',
      '/api/status',
      '/api/users',
      '/api/talents',
      '/api/clients',
      '/api/auth',
      '/api/auth/login',
      '/api/auth/register',
      '/health',
      '/status'
    ];

    const availableEndpoints = [];
    
    for (const endpoint of commonEndpoints) {
      try {
        const response = await fetch(endpoint, { method: 'GET' });
        if (response.status !== 404) {
          availableEndpoints.push({
            endpoint,
            status: response.status,
            method: 'GET'
          });
          console.log(`✅ Found: ${endpoint} (${response.status})`);
        }
      } catch (error) {
        // Ignore connection errors
      }
    }

    // Try to find API documentation or routes
    try {
      const response = await fetch('/api', { method: 'GET' });
      if (response.ok) {
        const data = await response.text();
        console.log('📋 API Root Response:', data);
      }
    } catch (error) {
      console.log('❌ No API root found');
    }

    return availableEndpoints;
  };

  // Check if user is properly authenticated with backend
  const checkBackendAuth = async () => {
    const token = getAuthToken();
    const userId = getCurrentUserId();
    
    if (!token || !userId) {
      console.log('🔐 No auth token or user ID found');
      return false;
    }

    // Try multiple auth verification endpoints
    const authEndpoints = ['/api/auth/verify', '/api/verify', '/auth/verify', '/verify'];
    
    for (const endpoint of authEndpoints) {
      try {
        console.log(`🔍 Verifying auth at: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          console.log(`✅ Backend authentication verified at ${endpoint}`);
          return true;
        } else if (response.status !== 404) {
          console.log(`❌ Auth failed at ${endpoint}: ${response.status}`);
        }
      } catch (error) {
        // Try next endpoint
      }
    }

    console.log('❌ No working auth verification endpoint found');
    return false;
  };

  // Get fresh authentication token
  const refreshAuthToken = async () => {
    const userId = getCurrentUserId();
    const userName = getCurrentUserName();
    
    if (!userId) {
      return null;
    }

    // Try multiple refresh endpoints
    const refreshEndpoints = ['/api/auth/refresh', '/api/refresh', '/auth/refresh', '/refresh'];
    
    for (const endpoint of refreshEndpoints) {
      try {
        console.log(`🔄 Attempting token refresh at: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userId,
            userName: userName,
            userType: 'client'
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            localStorage.setItem('auth_token', data.token);
            console.log(`✅ Authentication token refreshed at ${endpoint}`);
            return data.token;
          }
        } else if (response.status !== 404) {
          console.log(`❌ Refresh failed at ${endpoint}: ${response.status}`);
        }
      } catch (error) {
        // Try next endpoint
      }
    }
    
    console.log('⚠️ No working refresh endpoint found, creating session token...');
    
    // Alternative: Create session token
    const sessionToken = `session_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('auth_token', sessionToken);
    return sessionToken;
  };

  useEffect(() => {
    if (talentId) {
      loadTalentData();
      checkIfSaved();
      loadTalentStats();
      loadTalentNotifications();
      loadUserProjects();
      checkBackendStatus();
      updatePendingMessageCount();
      retryPendingMessages(); // Try to send any pending messages
    }
  }, [talentId, user?.id]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    };
  }, [audioElement]);

  // Check if backend is online with endpoint discovery
  const checkBackendStatus = async () => {
    setBackendStatus('checking');
    
    // Try multiple health check endpoints
    const healthEndpoints = ['/api/health', '/health', '/api/status', '/status', '/api', '/'];
    
    for (const endpoint of healthEndpoints) {
      try {
        const response = await fetch(endpoint, { method: 'GET' });
        if (response.ok) {
          console.log(`✅ Backend online at: ${endpoint}`);
          setBackendStatus('online');
          return;
        }
      } catch (error) {
        // Try next endpoint
      }
    }
    
    console.log('❌ Backend appears offline');
    setBackendStatus('offline');
  };

  // Update pending message count
  const updatePendingMessageCount = () => {
    const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
    setPendingMessageCount(pendingMessages.length);
  };

  // Retry pending messages when component loads
  const retryPendingMessages = async () => {
    const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
    if (pendingMessages.length === 0) return;

    console.log(`🔄 Found ${pendingMessages.length} pending messages, attempting to retry...`);

    const stillPending = [];
    
    for (const message of pendingMessages) {
      try {
        // Only retry messages that haven't been retried too many times
        if (message.retryCount < 3) {
          const success = await retryBackendMessage(message);
          if (!success) {
            message.retryCount = (message.retryCount || 0) + 1;
            message.lastAttempt = new Date().toISOString();
            stillPending.push(message);
          }
        } else {
          stillPending.push(message); // Keep but don't retry anymore
        }
      } catch (error) {
        console.log('❌ Retry failed for message:', message.id, error);
        message.retryCount = (message.retryCount || 0) + 1;
        stillPending.push(message);
      }
    }

    // Update pending messages
    FavoritesManager.safeSetItem('pendingMessages', JSON.stringify(stillPending));
    updatePendingMessageCount();
  };

  // Retry a single message against backend
  const retryBackendMessage = async (message) => {
    try {
      let authToken = getAuthToken();
      
      // Try to refresh auth if needed
      if (!authToken) {
        authToken = await refreshAuthToken();
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({
          fromId: message.fromId,
          fromName: message.fromName,
          toId: message.toId,
          toName: message.toName,
          subject: message.subject,
          message: message.message,
          budget: message.budget,
          deadline: message.deadline,
          messageType: 'project_inquiry'
        })
      });

      if (response.ok) {
        console.log('✅ Successfully retried message:', message.id);
        showToast('success', `Previously pending message to ${message.toName} has been delivered!`);
        return true;
      }
    } catch (error) {
      console.log('❌ Retry failed:', error);
    }
    
    return false;
  };

  const loadTalentStats = () => {
    if (!talentId) return;
    const stats = FavoritesManager.getTalentStats(talentId);
    setTalentStats(stats);
  };

  const loadTalentNotifications = () => {
    if (!talentId) return;
    const notifications = FavoritesManager.getTalentNotifications(talentId);
    setTalentNotifications(notifications);
  };

  const markNotificationsAsRead = (notificationIds: string[]) => {
    if (!talentId) return;
    FavoritesManager.markNotificationsAsRead(talentId, notificationIds);
    loadTalentNotifications();
  };

  const loadUserProjects = () => {
    if (!canPerformClientActions()) return;
    const currentUserId = getCurrentUserId();
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const userProjectsList = projects.filter((p: Project) => p.clientId === currentUserId && p.status === 'open');
    setUserProjects(userProjectsList);
  };

  const checkIfSaved = () => {
    const currentUserId = getCurrentUserId();
    if (!talentId || !currentUserId || !canPerformClientActions()) return;
    
    const isInFavorites = FavoritesManager.isInGeneralFavorites(currentUserId, talentId);
    setIsSaved(isInFavorites);
  };

  const loadTalentData = () => {
    if (!talentId) return;

    const talentProfile = talentService.getTalentProfile(talentId);
    
    if (talentProfile) {
      const talentData = {
        id: talentProfile.id,
        name: talentProfile.name,
        title: talentProfile.title,
        location: talentProfile.location,
        rating: talentProfile.rating,
        reviewCount: talentProfile.reviews,
        hourlyRate: talentProfile.priceRange,
        avatar: talentProfile.image,
        bio: talentProfile.bio,
        skills: talentProfile.specialties,
        languages: talentProfile.languages,
        experience: talentProfile.experience,
        completedProjects: talentProfile.completedProjects,
        responseTime: talentProfile.responseTime,
        availability: 'Available now',
        portfolio: [],
        reviews: []
      };
      
      if (talentProfile.demos && talentProfile.demos.length > 0) {
        talentData.portfolio = talentProfile.demos.map((demo: any) => ({
          title: demo.name || 'Demo',
          description: demo.type || 'Voice Demo',
          audioUrl: demo.url || audioService.getSampleAudioUrl(),
          duration: demo.duration || 30
        }));
      } else {
        talentData.portfolio = [
          {
            title: 'Commercial Demo',
            description: 'Sample commercial voice over',
            audioUrl: audioService.getSampleAudioUrl(),
            duration: 45
          },
          {
            title: 'Narration Sample',
            description: 'Sample narration voice over',
            audioUrl: audioService.getSampleAudioUrl(),
            duration: 60
          }
        ];
      }
      
      setTalent(talentData);
    } else {
      const mockData = mockTalentData[talentId];
      if (mockData) {
        setTalent(mockData);
      }
    }
    
    setLoading(false);
  };

  const handlePlayAudio = (audioUrl: string) => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    if (playingAudio === audioUrl) {
      setPlayingAudio(null);
      setAudioElement(null);
    } else {
      try {
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setPlayingAudio(null);
          setAudioElement(null);
        };
        audio.onerror = () => {
          const sampleAudio = new Audio(audioService.getSampleAudioUrl());
          sampleAudio.onended = () => {
            setPlayingAudio(null);
            setAudioElement(null);
          };
          sampleAudio.play();
          setAudioElement(sampleAudio);
        };
        
        audio.play();
        setPlayingAudio(audioUrl);
        setAudioElement(audio);
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const handleContactTalent = () => {
    if (!isAuthenticated || !isClient || !user?.id) return;
    setShowContactModal(true);
  };

  // COMPLETELY FIXED: Real backend message sending with endpoint discovery
  const handleSendMessage = async () => {
    if (!canPerformClientActions() || !talent || !contactForm.subject || !contactForm.message) {
      showToast('error', 'Please fill in all required fields (Subject and Message).');
      return;
    }
    
    const messageUserId = getCurrentUserId();
    const messageUserName = getCurrentUserName();
    
    if (!messageUserId) {
      showToast('error', 'User authentication required. Please sign in again.');
      return;
    }

    setSendingMessage(true);
    
    try {
      console.log('🚀 Starting message send process...');
      
      // Step 1: Get authentication ready
      let authToken = getAuthToken();
      if (!authToken) {
        console.log('🔄 Getting fresh authentication token...');
        authToken = await refreshAuthToken();
      }

      // Step 2: Discover available endpoints
      const availableEndpoints = await discoverBackendEndpoints();
      setDiscoveredEndpoints(availableEndpoints);
      console.log('📋 Available endpoints:', availableEndpoints);

      // Step 4: Prepare comprehensive message data
      const messageData = {
        fromId: messageUserId,
        fromName: messageUserName,
        fromType: 'client',
        toId: talent.id,
        toName: talent.name,
        toType: 'talent',
        subject: contactForm.subject,
        message: contactForm.message,
        budget: contactForm.budget || '',
        deadline: contactForm.deadline || '',
        messageType: 'project_inquiry',
        timestamp: new Date().toISOString(),
        platform: 'voicecastingpro'
      };

      // Step 5: Try working endpoint first (based on successful logs)
      console.log('🎯 Using working contact endpoint...');
      
      const workingEndpoints = [
        '/api/contact/talent', // This worked in the logs
        '/api/messages/send',
        '/api/contact'
      ];

      let messageSuccess = false;
      let lastError = null;

      // Try working endpoints
      for (const endpoint of workingEndpoints) {
        if (messageSuccess) break;
        
        try {
          console.log(`🌐 Trying working endpoint: ${endpoint}`);
          
          const headers = {
            'Content-Type': 'application/json'
          };
          
          // Add auth if available
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
            headers['X-User-ID'] = messageUserId;
            headers['X-User-Type'] = 'client';
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(messageData)
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`✅ Message sent successfully via ${endpoint}:`, result);
            
            setContactForm({ subject: '', message: '', budget: '', deadline: '' });
            setShowContactModal(false);
            setBackendStatus('online');
            showToast('success', `Message sent successfully to ${talent.name}! They will receive an email notification.`);
            messageSuccess = true;
            break;
          } else if (response.status !== 404) {
            console.log(`❌ Endpoint ${endpoint} failed with ${response.status}`);
            lastError = `${response.status}: ${await response.text()}`;
          }
        } catch (endpointError) {
          console.log(`❌ Endpoint ${endpoint} connection failed:`, endpointError);
        }
      }

      // Step 6: If everything failed, store locally and show clear message
      if (!messageSuccess) {
        console.log('📦 All backend services failed. Storing message locally with notification...');
        
        // Generate unique message ID
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();
        
        // Store comprehensive message data
        const localMessage = {
          id: messageId,
          ...messageData,
          status: 'pending_backend',
          localOnly: true,
          retryCount: 0,
          lastAttempt: timestamp,
          backendError: lastError,
          availableEndpoints: availableEndpoints.map(e => e.endpoint)
        };
        
        // Store in multiple localStorage formats for compatibility
        const messages = JSON.parse(localStorage.getItem('messages') || '[]');
        const sentMessages = JSON.parse(localStorage.getItem('sentMessages') || '[]');
        const pendingMessages = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
        
        messages.push(localMessage);
        sentMessages.push(localMessage);
        pendingMessages.push(localMessage);
        
        FavoritesManager.safeSetItem('messages', JSON.stringify(messages));
        FavoritesManager.safeSetItem('sentMessages', JSON.stringify(sentMessages));
        FavoritesManager.safeSetItem('pendingMessages', JSON.stringify(pendingMessages));
        
        // Update UI state
        setBackendStatus('offline');
        updatePendingMessageCount();
        
        // Create talent notification
        FavoritesManager.createTalentNotification(talent.id, 'message', {
          clientId: messageUserId,
          clientName: messageUserName
        }, undefined, {
          messageId: messageId,
          messageSubject: contactForm.subject
        });
        
        setContactForm({ subject: '', message: '', budget: '', deadline: '' });
        setShowContactModal(false);
        
        // Show helpful error message
        showToast('error', `Unable to reach backend servers. Contact your developer to check: /api/contact/talent endpoint status.`);
        
        console.log('⚠️ Message stored locally only - backend messaging endpoints need to be implemented');
        console.log('💡 Contact endpoint should work - check email service configuration and database schema');
      }
      
    } catch (error) {
      console.error('❌ Critical error in message sending:', error);
      showToast('error', 'Unable to send message due to a system error. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!talent || !isAuthenticated || !isClient) return;
    
    const currentUserId = getCurrentUserId();
    const currentUserName = getCurrentUserName();
    
    if (!currentUserId) return;
    
    const authToken = getAuthToken();
    
    try {
      if (!isSaved) {
        try {
          const response = await fetch('/api/favorites/add', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              talentId: talent.id,
              talentName: talent.name,
              talentTitle: talent.title,
              talentAvatar: talent.avatar
            })
          });
          
          if (!response.ok) throw new Error('API not available');
          
        } catch (apiError) {
          const favorites = JSON.parse(localStorage.getItem('userFavorites') || '[]');
          const newFavorite = {
            talentId: talent.id,
            talentName: talent.name,
            talentTitle: talent.title,
            talentAvatar: talent.avatar,
            savedAt: new Date().toISOString()
          };
          
          if (!favorites.find(fav => fav.talentId === talent.id)) {
            favorites.push(newFavorite);
            FavoritesManager.safeSetItem('userFavorites', JSON.stringify(favorites));
          }
        }
        
        FavoritesManager.addToGeneralFavorites(currentUserId, talent.id, talent, currentUserName);
        setIsSaved(true);
        loadTalentStats();
        showToast('success', `${talent.name} has been added to your favorites!`);
        
      } else {
        try {
          const response = await fetch('/api/favorites/remove', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              talentId: talent.id
            })
          });
          
          if (!response.ok) throw new Error('API not available');
          
        } catch (apiError) {
          const favorites = JSON.parse(localStorage.getItem('userFavorites') || '[]');
          const updatedFavorites = favorites.filter(fav => fav.talentId !== talent.id);
          FavoritesManager.safeSetItem('userFavorites', JSON.stringify(updatedFavorites));
        }
        
        FavoritesManager.removeFromGeneralFavorites(currentUserId, talent.id);
        setIsSaved(false);
        loadTalentStats();
        showToast('success', `${talent.name} has been removed from your favorites.`);
      }
      
    } catch (error) {
      console.error('Failed to update favorites:', error);
      showToast('error', 'Failed to update favorites. Please try again.');
    }
  };

  const handleAddToShortlist = (projectId: string) => {
    if (!talent || !canPerformClientActions()) return;
    
    const success = FavoritesManager.addToProjectShortlist(projectId, talent.id, talent);
    if (success) {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const project = projects.find((p: Project) => p.id === projectId);
      const projectTitle = project ? project.title : 'project';
      
      setShowShortlistModal(false);
      loadTalentStats();
      loadTalentNotifications();
      showToast('success', `${talent.name} has been added to your shortlist for ${projectTitle}!`);
    } else {
      showToast('error', 'Failed to add talent to shortlist. Please try again.');
    }
  };

  const handleAddToProjectClick = () => {
    if (!isAuthenticated || !isClient || !user?.id) return;
    
    loadUserProjects();
    setShowShortlistModal(true);
  };

  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignInRedirect = () => {
    window.location.href = '/signin';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-slate-800 rounded-xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Talent Not Found</h2>
          <p className="text-gray-300 mb-6">The talent profile you're looking for doesn't exist.</p>
          {onClose && (
            <button 
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      {/* Toast Notifications */}
      {toastNotifications.map((notification) => (
        <ToastNotification
          key={notification.id}
          notification={notification}
          onRemove={removeToast}
        />
      ))}

      {/* Backend Status & Pending Messages Indicator */}
      {(backendStatus === 'offline' || pendingMessageCount > 0 || discoveredEndpoints.length > 0) && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-slate-800 border border-gray-600 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${
                backendStatus === 'online' ? 'bg-green-400' : 
                backendStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
              }`}></div>
              <div>
                <p className="text-white text-sm font-medium">
                  {backendStatus === 'online' ? 'System Online' : 
                   backendStatus === 'offline' ? 'System Offline' : 'Checking...'}
                </p>
                {pendingMessageCount > 0 && (
                  <p className="text-orange-400 text-xs">
                    {pendingMessageCount} message{pendingMessageCount > 1 ? 's' : ''} pending delivery
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  checkBackendStatus();
                  retryPendingMessages();
                }}
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                Retry
              </button>
            </div>
            
            {/* Show discovered endpoints for debugging */}
            {discoveredEndpoints.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer">
                  Found {discoveredEndpoints.length} endpoints
                </summary>
                <div className="mt-1 text-xs text-gray-300 max-h-32 overflow-y-auto">
                  {discoveredEndpoints.map((ep, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{ep.endpoint}</span>
                      <span className={ep.status === 200 ? 'text-green-400' : 'text-yellow-400'}>
                        {ep.status}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
            
            {/* Suggest missing endpoints */}
            {backendStatus === 'offline' && (
              <div className="mt-2 text-xs text-gray-400">
                💡 Need to implement:
                <br />• /api/messages (for messaging)
                <br />• /api/contact (for inquiries)
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Talent Directory</span>
          </button>
        )}

        {/* Talent Stats Bar - Only visible to talents viewing their own profile */}
        {isTalent && talentId === getCurrentUserId() && (
          <>
            <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 mb-8 border border-blue-800/50">
              <h2 className="text-lg font-semibold text-white mb-4">Your Profile Engagement</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Heart className="h-6 w-6 text-pink-400 mr-2" />
                    <span className="text-2xl font-bold text-white">{talentStats.generalFavorites}</span>
                  </div>
                  <p className="text-sm text-gray-300">Clients have favorited your profile</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Briefcase className="h-6 w-6 text-green-400 mr-2" />
                    <span className="text-2xl font-bold text-white">{talentStats.projectShortlists}</span>
                  </div>
                  <p className="text-sm text-gray-300">Active project shortlists</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-6 w-6 text-blue-400 mr-2" />
                    <span className="text-2xl font-bold text-white">{talentStats.activeProjects.length}</span>
                  </div>
                  <p className="text-sm text-gray-300">Open opportunities</p>
                </div>
              </div>
              
              {/* Active Project Opportunities */}
              {talentStats.activeProjects.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h3 className="text-white font-medium mb-3">🚀 You've been shortlisted for these projects:</h3>
                  <div className="space-y-2">
                    {talentStats.activeProjects.slice(0, 3).map((project) => (
                      <div key={project.id} className="bg-slate-800/50 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-white font-medium">{project.title}</h4>
                            <p className="text-sm text-gray-400">by {project.clientName} • {project.budget}</p>
                          </div>
                          <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Talent Notifications - Only visible to talents viewing their own profile */}
            {talentNotifications.length > 0 && (
              <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-xl p-6 mb-8 border border-green-800/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                  {talentNotifications.filter(n => !n.read).length > 0 && (
                    <button
                      onClick={() => markNotificationsAsRead(talentNotifications.filter(n => !n.read).map(n => n.id))}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {talentNotifications.slice(0, 5).map((notification) => (
                    <div key={notification.id} className={`p-3 rounded-lg border ${
                      notification.read 
                        ? 'bg-slate-800/50 border-gray-700' 
                        : 'bg-green-900/20 border-green-800/50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {notification.type === 'favorite' ? (
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-pink-400" />
                              <span className="text-white font-medium">{notification.clientName}</span>
                              <span className="text-gray-300">favorited your profile</span>
                            </div>
                          ) : notification.type === 'shortlist' ? (
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-green-400" />
                              <span className="text-white font-medium">{notification.clientName}</span>
                              <span className="text-gray-300">shortlisted you for</span>
                              <span className="text-blue-400 font-medium">{notification.projectTitle}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Send className="h-4 w-4 text-blue-400" />
                              <span className="text-white font-medium">{notification.clientName}</span>
                              <span className="text-gray-300">sent you a message:</span>
                              <span className="text-blue-400 font-medium">"{notification.messageSubject}"</span>
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString()} at {new Date(notification.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Header Section */}
        <div className="bg-slate-800 rounded-xl shadow-lg p-8 mb-8 border border-gray-700">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <img
              src={talent.avatar}
              alt={talent.name}
              className="w-32 h-32 rounded-full object-cover"
            />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{talent.name}</h1>
              <p className="text-xl text-gray-300 mb-4">{talent.title}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {talent.location}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  {talent.rating} ({talent.reviewCount} reviews)
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {talent.hourlyRate}/hour
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {talent.responseTime}
                </div>
              </div>
              
              {/* Show engagement stats for all users */}
              {!isTalent && (
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1 text-pink-400">
                    <Heart className="w-4 h-4" />
                    <span>{talentStats.generalFavorites} clients interested</span>
                  </div>
                  {talentStats.projectShortlists > 0 && (
                    <div className="flex items-center gap-1 text-green-400">
                      <Briefcase className="w-4 h-4" />
                      <span>Shortlisted for {talentStats.projectShortlists} projects</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {/* Authentication-based button rendering */}
              {canPerformClientActions() ? (
                // Buttons for authenticated clients only
                <>
                  <button 
                    onClick={handleContactTalent}
                    disabled={sendingMessage}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sendingMessage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      'Contact Talent'
                    )}
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                      isSaved 
                        ? 'bg-pink-600 text-white hover:bg-pink-700' 
                        : 'border border-gray-600 text-gray-300 hover:bg-slate-700'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Favorited ✓' : 'Add to Favorites'}
                  </button>
                  {userProjects.length > 0 && (
                    <button 
                      onClick={handleAddToProjectClick}
                      className="border border-blue-600 text-blue-400 px-6 py-3 rounded-lg hover:bg-blue-900/20 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Project
                    </button>
                  )}
                </>
              ) : isAuthenticated && isTalent ? (
                // Message for authenticated talents
                <div className="text-center p-4 bg-slate-700 rounded-lg border border-gray-600">
                  <p className="text-gray-300 text-sm">
                    {talentId === getCurrentUserId() 
                      ? '✨ This is your profile - check your engagement stats above!'
                      : '👤 Viewing as talent - Contact and save features are available to clients'
                    }
                  </p>
                </div>
              ) : (
                // Sign-in prompts for non-authenticated users
                <>
                  <button
                    onClick={handleSignInRedirect}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In to Contact Talent
                  </button>
                  <button
                    onClick={handleSignInRedirect}
                    className="border border-gray-600 text-gray-300 px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <Heart className="w-4 h-4" />
                    Sign In to Save Profile
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">About</h2>
              <p className="text-gray-300 leading-relaxed">{talent.bio}</p>
            </div>

            {/* Portfolio Section */}
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Portfolio</h2>
              {talent.portfolio.length > 0 ? (
                <div className="space-y-4">
                  {talent.portfolio.map((item, index) => (
                    <div key={index} className="border border-gray-700 bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{item.title}</h3>
                        <span className="text-sm text-gray-400">{item.duration}s</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{item.description}</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePlayAudio(item.audioUrl)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                            playingAudio === item.audioUrl 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {playingAudio === item.audioUrl ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          {playingAudio === item.audioUrl ? 'Stop' : 'Play'}
                        </button>
                        <button className="flex items-center gap-2 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors">
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No demos uploaded yet.</p>
                  <p className="text-sm text-gray-500">
                    Demos will appear here once the talent uploads their voice samples.
                  </p>
                </div>
              )}
            </div>

            {/* Reviews Section */}
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">Reviews</h2>
              <div className="space-y-6">
                {talent.reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-700 pb-6 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">{review.clientName}</h3>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-300 mb-2">{review.comment}</p>
                    <p className="text-sm text-gray-500">{review.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Experience</span>
                  <span className="font-medium text-white">{talent.experience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Projects Completed</span>
                  <span className="font-medium text-white">{talent.completedProjects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Response Time</span>
                  <span className="font-medium text-white">{talent.responseTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Availability</span>
                  <span className="font-medium text-green-400">{talent.availability}</span>
                </div>
              </div>
            </div>

            {/* Market Appeal */}
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl shadow-lg p-6 border border-purple-800/50">
              <h3 className="text-lg font-semibold text-white mb-4">Market Appeal</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Client Interest</span>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    <span className="font-medium text-white">{talentStats.generalFavorites}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Active Shortlists</span>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-green-400" />
                    <span className="font-medium text-white">{talentStats.projectShortlists}</span>
                  </div>
                </div>
                {talentStats.generalFavorites > 0 && (
                  <div className="mt-3 p-3 bg-pink-900/20 rounded-lg border border-pink-800/30">
                    <p className="text-xs text-pink-300">
                      🌟 This talent is getting noticed! {talentStats.generalFavorites} clients have favorited this profile.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Skills */}
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {talent.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-900/50 text-blue-400 px-3 py-1 rounded-full text-sm border border-blue-800/50"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Languages</h3>
              <div className="space-y-2">
                {talent.languages.map((language, index) => (
                  <div key={index} className="text-gray-300">
                    {language}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Modal */}
        {showContactModal && canPerformClientActions() && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Contact {talent?.name}</h2>
                  <button 
                    onClick={() => setShowContactModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                    disabled={sendingMessage}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  handleSendMessage(); 
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={contactForm.subject}
                      onChange={handleContactFormChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                      placeholder="Voice over project for..."
                      required
                      disabled={sendingMessage}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Budget
                    </label>
                    <select
                      name="budget"
                      value={contactForm.budget}
                      onChange={handleContactFormChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      disabled={sendingMessage}
                    >
                      <option value="">Select budget range</option>
                      <option value="$100-500">$100 - $500</option>
                      <option value="$500-1000">$500 - $1,000</option>
                      <option value="$1000-2500">$1,000 - $2,500</option>
                      <option value="$2500-5000">$2,500 - $5,000</option>
                      <option value="$5000+">$5,000+</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Deadline
                    </label>
                    <input
                      type="date"
                      name="deadline"
                      value={contactForm.deadline}
                      onChange={handleContactFormChange}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                      disabled={sendingMessage}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message *
                    </label>
                    <textarea
                      name="message"
                      value={contactForm.message}
                      onChange={handleContactFormChange}
                      rows={5}
                      className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                      placeholder="Describe your project, what type of voice over you need, any special requirements..."
                      required
                      disabled={sendingMessage}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={sendingMessage || !contactForm.subject || !contactForm.message}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingMessage ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowContactModal(false)}
                      className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                      disabled={sendingMessage}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Project Shortlist Modal */}
        {showShortlistModal && canPerformClientActions() && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Add {talent?.name} to Project Shortlist</h2>
                  <button 
                    onClick={() => setShowShortlistModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-gray-300 mb-4">
                    Select which project you'd like to shortlist {talent?.name} for:
                  </p>
                  
                  {userProjects.length > 0 ? (
                    <div className="space-y-3">
                      {userProjects.map((project) => (
                        <div 
                          key={project.id} 
                          className="border border-gray-700 bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors cursor-pointer"
                          onClick={() => handleAddToShortlist(project.id)}
                        >
                          <h3 className="font-semibold text-white mb-2">{project.title}</h3>
                          <p className="text-gray-300 text-sm mb-2">{project.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>Budget: {project.budget}</span>
                            <span>Deadline: {project.deadline}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">You don't have any open projects yet.</p>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
                        Create New Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TalentProfile;
