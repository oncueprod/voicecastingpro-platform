import React, { useState, useEffect } from 'react';
import { Star, MapPin, Clock, DollarSign, Play, Pause, Download, ArrowLeft, X, Send, Users, Briefcase, Heart, Plus, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { talentService } from '../services/talentService';
import { audioService } from '../services/audioService';

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

// Enhanced favorites and shortlist management
class FavoritesManager {
  // Helper function to clean up old demo data and optimize storage
  static cleanupDemoData() {
    try {
      console.log('Starting comprehensive storage cleanup...');
      
      // Clean up favorites
      const favorites = JSON.parse(localStorage.getItem('generalFavorites') || '{}');
      const cleanedFavorites = {};
      
      Object.keys(favorites).forEach(clientId => {
        if (!clientId.startsWith('demo_user_') && !clientId.startsWith('demo_')) {
          // Keep only recent favorites (last 50 per user to prevent bloat)
          const userFavorites = favorites[clientId];
          if (userFavorites && userFavorites.length > 0) {
            cleanedFavorites[clientId] = userFavorites.slice(-50);
          }
        }
      });
      
      // Clean up notifications - keep only recent ones
      const notifications = JSON.parse(localStorage.getItem('talentNotifications') || '{}');
      const cleanedNotifications = {};
      
      Object.keys(notifications).forEach(talentId => {
        if (!talentId.startsWith('demo_user_') && !talentId.startsWith('demo_')) {
          // Keep only last 20 notifications per talent
          const talentNotifications = notifications[talentId];
          if (talentNotifications && talentNotifications.length > 0) {
            cleanedNotifications[talentId] = talentNotifications.slice(-20);
          }
        }
      });
      
      // Clean up messages - keep only recent ones
      const messages = JSON.parse(localStorage.getItem('messages') || '[]');
      const cleanedMessages = messages.filter((msg: any) => 
        !msg.fromId?.startsWith('demo_user_') && 
        !msg.fromId?.startsWith('demo_') &&
        !msg.toId?.startsWith('demo_user_') && 
        !msg.toId?.startsWith('demo_')
      ).slice(-100); // Keep last 100 messages
      
      // Clean up sent messages
      const sentMessages = JSON.parse(localStorage.getItem('sentMessages') || '[]');
      const cleanedSentMessages = sentMessages.filter((msg: any) => 
        !msg.talentId?.startsWith('demo_user_') && 
        !msg.talentId?.startsWith('demo_') &&
        !msg.clientId?.startsWith('demo_user_') && 
        !msg.clientId?.startsWith('demo_')
      ).slice(-100); // Keep last 100 sent messages
      
      // Clean up project shortlists
      const shortlists = JSON.parse(localStorage.getItem('projectShortlists') || '{}');
      const cleanedShortlists = {};
      
      Object.keys(shortlists).forEach(projectId => {
        if (!projectId.startsWith('demo_project_')) {
          const projectShortlist = shortlists[projectId];
          if (projectShortlist && projectShortlist.length > 0) {
            // Remove demo users from shortlists
            const filtered = projectShortlist.filter((talent: any) => 
              !talent.talentId?.startsWith('demo_user_') && 
              !talent.talentId?.startsWith('demo_')
            );
            if (filtered.length > 0) {
              cleanedShortlists[projectId] = filtered.slice(-50); // Keep last 50 per project
            }
          }
        }
      });
      
      // Update all cleaned data
      localStorage.setItem('generalFavorites', JSON.stringify(cleanedFavorites));
      localStorage.setItem('talentNotifications', JSON.stringify(cleanedNotifications));
      localStorage.setItem('messages', JSON.stringify(cleanedMessages));
      localStorage.setItem('sentMessages', JSON.stringify(cleanedSentMessages));
      localStorage.setItem('projectShortlists', JSON.stringify(cleanedShortlists));
      
      console.log('Comprehensive cleanup completed:', {
        favorites: Object.keys(cleanedFavorites).length,
        notifications: Object.keys(cleanedNotifications).length,
        messages: cleanedMessages.length,
        sentMessages: cleanedSentMessages.length,
        shortlists: Object.keys(cleanedShortlists).length
      });
      
      return true;
    } catch (error) {
      console.error('Error during comprehensive cleanup:', error);
      return false;
    }
  }

  // Check current localStorage usage
  static getStorageInfo() {
    try {
      const total = 10 * 1024 * 1024; // 10MB typical limit
      let used = 0;
      
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }
      
      const percentage = (used / total) * 100;
      
      console.log('LocalStorage usage:', {
        used: `${(used / 1024 / 1024).toFixed(2)}MB`,
        total: `${(total / 1024 / 1024).toFixed(2)}MB`,
        percentage: `${percentage.toFixed(1)}%`
      });
      
      return { used, total, percentage };
    } catch (error) {
      console.error('Error checking storage:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  // Manual cleanup function for UI
  static performManualCleanup() {
    console.log('Manual cleanup requested...');
    this.getStorageInfo();
    
    if (this.cleanupDemoData()) {
      console.log('Manual cleanup completed successfully');
      this.getStorageInfo();
      return true;
    }
    
    console.log('Manual cleanup failed');
    return false;
  }
  static emergencyCleanup() {
    try {
      console.log('Performing emergency storage cleanup...');
      
      // Keep only the most essential data
      const favorites = JSON.parse(localStorage.getItem('generalFavorites') || '{}');
      const emergencyFavorites = {};
      
      Object.keys(favorites).forEach(clientId => {
        if (!clientId.startsWith('demo_user_') && !clientId.startsWith('demo_')) {
          // Keep only last 10 favorites per user
          const userFavorites = favorites[clientId];
          if (userFavorites && userFavorites.length > 0) {
            emergencyFavorites[clientId] = userFavorites.slice(-10);
          }
        }
      });
      
      // Keep only last 10 notifications per talent
      const notifications = JSON.parse(localStorage.getItem('talentNotifications') || '{}');
      const emergencyNotifications = {};
      
      Object.keys(notifications).forEach(talentId => {
        if (!talentId.startsWith('demo_user_') && !talentId.startsWith('demo_')) {
          const talentNotifications = notifications[talentId];
          if (talentNotifications && talentNotifications.length > 0) {
            emergencyNotifications[talentId] = talentNotifications.slice(-10);
          }
        }
      });
      
      // Keep only last 20 messages
      const messages = JSON.parse(localStorage.getItem('messages') || '[]');
      const emergencyMessages = messages.filter((msg: any) => 
        !msg.fromId?.startsWith('demo_user_') && 
        !msg.fromId?.startsWith('demo_') &&
        !msg.toId?.startsWith('demo_user_') && 
        !msg.toId?.startsWith('demo_')
      ).slice(-20);
      
      // Keep only last 20 sent messages
      const sentMessages = JSON.parse(localStorage.getItem('sentMessages') || '[]');
      const emergencySentMessages = sentMessages.filter((msg: any) => 
        !msg.talentId?.startsWith('demo_user_') && 
        !msg.talentId?.startsWith('demo_') &&
        !msg.clientId?.startsWith('demo_user_') && 
        !msg.clientId?.startsWith('demo_')
      ).slice(-20);
      
      // Update with minimal data
      localStorage.setItem('generalFavorites', JSON.stringify(emergencyFavorites));
      localStorage.setItem('talentNotifications', JSON.stringify(emergencyNotifications));
      localStorage.setItem('messages', JSON.stringify(emergencyMessages));
      localStorage.setItem('sentMessages', JSON.stringify(emergencySentMessages));
      
      console.log('Emergency cleanup completed');
      return true;
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return false;
    }
  }

  // Helper function to safely set localStorage with error handling
  static safeSetItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.log('localStorage quota exceeded, attempting standard cleanup...');
      if (this.cleanupDemoData()) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.log('Still failed after standard cleanup, trying emergency cleanup...');
          if (this.emergencyCleanup()) {
            try {
              localStorage.setItem(key, value);
              return true;
            } catch (emergencyError) {
              console.error('Failed even after emergency cleanup:', emergencyError);
              return false;
            }
          }
        }
      }
      return false;
    }
  }

  // Helper function to create talent notifications
  static createTalentNotification(talentId: string, type: 'favorite' | 'shortlist' | 'message', clientData: any, projectData?: any, messageData?: any) {
    console.log('Creating talent notification:', { talentId, type, clientData, projectData, messageData });
    const notifications = JSON.parse(localStorage.getItem('talentNotifications') || '{}');
    console.log('Current notifications:', notifications);
    
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
    
    if (this.safeSetItem('talentNotifications', JSON.stringify(notifications))) {
      console.log('Updated notifications:', notifications);
    } else {
      console.error('Failed to save notification due to storage quota');
    }
  }

  // Tier 1: General Favorites
  static addToGeneralFavorites(clientId: string, talentId: string, talentData: any, clientName?: string) {
    console.log('Adding to general favorites:', { clientId, talentId, clientName });
    const favorites = JSON.parse(localStorage.getItem('generalFavorites') || '{}');
    console.log('Current favorites:', favorites);
    
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
        console.log('Updated favorites:', favorites);
        
        // Create notification for talent with provided client name
        this.createTalentNotification(talentId, 'favorite', {
          clientId,
          clientName: clientName || 'Anonymous Client'
        });
        console.log('Created notification for talent');
        return true;
      } else {
        console.error('Failed to save favorite due to storage quota');
        return false;
      }
    } else {
      console.log('Talent already in favorites');
      return true;
    }
  }

  static removeFromGeneralFavorites(clientId: string, talentId: string) {
    console.log('Removing from general favorites:', { clientId, talentId });
    const favorites = JSON.parse(localStorage.getItem('generalFavorites') || '{}');
    
    if (favorites[clientId]) {
      favorites[clientId] = favorites[clientId].filter((fav: any) => fav.talentId !== talentId);
      
      if (this.safeSetItem('generalFavorites', JSON.stringify(favorites))) {
        console.log('Updated favorites after removal:', favorites);
        return true;
      } else {
        console.error('Failed to remove favorite due to storage quota');
        return false;
      }
    }
    return true;
  }

  static isInGeneralFavorites(clientId: string, talentId: string): boolean {
    const favorites = JSON.parse(localStorage.getItem('generalFavorites') || '{}');
    const result = favorites[clientId]?.some((fav: any) => fav.talentId === talentId) || false;
    console.log('Checking if in favorites:', { clientId, talentId, result, favorites: favorites[clientId] });
    return result;
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

  // Tier 2: Project Shortlists
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
        status: 'shortlisted' // shortlisted, invited, applied, hired
      });
      
      if (this.safeSetItem('projectShortlists', JSON.stringify(shortlists))) {
        // Create notification for talent
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
      } else {
        console.error('Failed to add to project shortlist due to storage quota');
        return false;
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

  // Get talent notifications
  static getTalentNotifications(talentId: string) {
    const notifications = JSON.parse(localStorage.getItem('talentNotifications') || '{}');
    const talentNotifications = notifications[talentId] || [];
    
    // Sort by date (newest first)
    return talentNotifications.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Mark notifications as read
  static markNotificationsAsRead(talentId: string, notificationIds: string[]) {
    const notifications = JSON.parse(localStorage.getItem('talentNotifications') || '{}');
    
    if (notifications[talentId]) {
      notifications[talentId] = notifications[talentId].map((notification: any) => {
        if (notificationIds.includes(notification.id)) {
          return { ...notification, read: true };
        }
        return notification;
      });
      
      if (this.safeSetItem('talentNotifications', JSON.stringify(notifications))) {
        console.log('Notifications marked as read');
      } else {
        console.error('Failed to mark notifications as read due to storage quota');
      }
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

const TalentProfile: React.FC<TalentProfileProps> = ({ talentId, onClose }) => {
  // Use proper authentication context
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

  // Helper function to check if user can perform client actions
  const canPerformClientActions = () => {
    return isAuthenticated && isClient && user?.id;
  };

  useEffect(() => {
    if (talentId) {
      loadTalentData();
      checkIfSaved();
      loadTalentStats();
      loadTalentNotifications();
      loadUserProjects();
    }
    
    // Add debug info to window for troubleshooting
    (window as any).debugAuth = () => {
      const authToken = getAuthToken();
      console.log('🔍 Auth Debug Info:');
      console.log('User:', user);
      console.log('Is Authenticated:', isAuthenticated);
      console.log('Is Client:', isClient);
      console.log('Is Talent:', isTalent);
      console.log('Auth Token:', authToken ? `${authToken.substring(0, 20)}...` : 'No token found');
      console.log('LocalStorage keys:', Object.keys(localStorage));
      
      // Check all possible token keys
      console.log('Token variations:');
      console.log('authToken:', localStorage.getItem('authToken') ? 'Found' : 'Not found');
      console.log('token:', localStorage.getItem('token') ? 'Found' : 'Not found');
      console.log('accessToken:', localStorage.getItem('accessToken') ? 'Found' : 'Not found');
      console.log('jwt:', localStorage.getItem('jwt') ? 'Found' : 'Not found');
      
      return { user, isAuthenticated, isClient, isTalent, hasToken: !!authToken };
    };
  }, [talentId, user?.id]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    };
  }, [audioElement]);

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
    loadTalentNotifications(); // Refresh notifications
  };

  const loadUserProjects = () => {
    if (!canPerformClientActions()) return;
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const userProjectsList = projects.filter((p: Project) => p.clientId === user.id && p.status === 'open');
    setUserProjects(userProjectsList);
  };

  const checkIfSaved = () => {
    if (!talentId || !canPerformClientActions()) {
      console.log('Cannot check saved status - missing talentId or not authenticated client');
      return;
    }
    console.log('Checking if talent is saved for user:', user.id, 'talent:', talentId);
    const isInFavorites = FavoritesManager.isInGeneralFavorites(user.id, talentId);
    console.log('Is in favorites:', isInFavorites);
    setIsSaved(isInFavorites);
  };

  const loadTalentData = () => {
    if (!talentId) return;

    // First try to get talent from the talent service
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
      
      // Add portfolio items
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
          console.log('Audio playback failed, using sample audio');
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
        console.log('Audio playback failed - this is a demo environment');
      }
    }
  };

  const handleContactTalent = () => {
    // Robust authentication check
    if (!isAuthenticated) {
      console.log('Please sign in as a client to contact talent');
      return;
    }
    if (!isClient) {
      console.log('Only clients can contact talent');
      return;
    }
    if (!user?.id) {
      console.log('Authentication error - please try signing in again');
      return;
    }
    setShowContactModal(true);
  };

  // Helper function to get auth token from localStorage
  const getAuthToken = () => {
    // Try different possible token storage keys
    return localStorage.getItem('authToken') || 
           localStorage.getItem('token') || 
           localStorage.getItem('accessToken') || 
           localStorage.getItem('jwt');
  };

  const handleSendMessage = async () => {
    console.log('handleSendMessage called');
    if (!canPerformClientActions()) {
      console.log('Cannot perform client actions - authentication required');
      setShowContactModal(false);
      return;
    }
    
    if (!talent || !contactForm.subject || !contactForm.message) {
      console.log('Missing required fields:', { talent: !!talent, subject: contactForm.subject, message: contactForm.message });
      return;
    }
    
    console.log('Sending message from:', user.id, 'to:', talent.id);
    
    const authToken = getAuthToken();
    console.log('Using auth token:', authToken ? 'Token found' : 'No token found');
    
    const messageData = {
      toId: talent.id,
      toName: talent.name,
      subject: contactForm.subject,
      message: contactForm.message,
      budget: contactForm.budget,
      deadline: contactForm.deadline
    };
    
    try {
      // Send message to backend API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(messageData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message || 'Unknown error'}`);
      }
      
      const result = await response.json();
      console.log('✅ Message sent successfully:', result);
      
      // Clear form and close modal
      setContactForm({ subject: '', message: '', budget: '', deadline: '' });
      setShowContactModal(false);
      
      console.log('✅ Message sent and email notification triggered');
      alert(`Message sent successfully to ${talent.name}! They will receive an email notification and can respond in their messaging center.`);
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Show specific error message
      if (error.message.includes('401')) {
        alert('Authentication failed. Please sign in again.');
      } else if (error.message.includes('403')) {
        alert('Permission denied. Please make sure you are signed in as a client.');
      } else if (error.message.includes('404')) {
        alert('Messaging service not found. Please contact support.');
      } else {
        alert(`Failed to send message: ${error.message}`);
      }
    }
  };

  // Backend API call for creating talent notifications
  const createTalentNotification = async (talentId: string, type: string, data: any) => {
    const authToken = getAuthToken();
    
    try {
      const response = await fetch('/api/notifications/talent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          talentId,
          type,
          ...data
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Talent notification created:', result);
      } else {
        console.log('Notification API not available');
      }
      
    } catch (error) {
      console.error('❌ Failed to create talent notification:', error);
    }
  };

  // Enhanced save functionality - Tier 1: General Favorites
  const handleSaveProfile = async () => {
    console.log('handleSaveProfile called');
    if (!talent) {
      console.log('No talent data available');
      return;
    }
    
    if (!isAuthenticated) {
      console.log('User not authenticated');
      return;
    }
    
    if (!isClient) {
      console.log('User is not a client');
      return;
    }
    
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }
    
    console.log('Current state:', { isSaved, userId: user.id, talentId: talent.id, userName: user.name });
    
    const authToken = getAuthToken();
    
    try {
      if (!isSaved) {
        console.log('Adding to favorites...');
        
        // Try API first, fallback to localStorage
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
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Added to favorites via API:', result);
          } else {
            throw new Error('API endpoint not available');
          }
        } catch (apiError) {
          console.log('API not available, using localStorage fallback');
          // Fallback to localStorage
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
            localStorage.setItem('userFavorites', JSON.stringify(favorites));
            console.log('✅ Added to favorites via localStorage');
          }
        }
        
        setIsSaved(true);
        loadTalentStats(); // Refresh stats
        console.log(`✅ ${talent.name} has been added to your favorites`);
        
      } else {
        console.log('Removing from favorites...');
        
        // Try API first, fallback to localStorage
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
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Removed from favorites via API:', result);
          } else {
            throw new Error('API endpoint not available');
          }
        } catch (apiError) {
          console.log('API not available, using localStorage fallback');
          // Fallback to localStorage
          const favorites = JSON.parse(localStorage.getItem('userFavorites') || '[]');
          const updatedFavorites = favorites.filter(fav => fav.talentId !== talent.id);
          localStorage.setItem('userFavorites', JSON.stringify(updatedFavorites));
          console.log('✅ Removed from favorites via localStorage');
        }
        
        setIsSaved(false);
        loadTalentStats(); // Refresh stats
        console.log(`✅ ${talent.name} has been removed from your favorites`);
      }
      
    } catch (error) {
      console.error('❌ Failed to update favorites:', error);
      alert('Failed to update favorites. Please try again.');
    }
  };

  // New functionality - Tier 2: Project Shortlists
  const handleAddToShortlist = (projectId: string) => {
    if (!talent || !canPerformClientActions()) {
      console.log('You must be signed in as a client to add talent to project shortlists');
      setShowShortlistModal(false);
      return;
    }
    
    const success = FavoritesManager.addToProjectShortlist(projectId, talent.id, talent);
    if (success) {
      setShowShortlistModal(false);
      loadTalentStats(); // Refresh stats
      loadTalentNotifications(); // Refresh notifications
      console.log(`${talent.name} has been added to your project shortlist`);
    } else {
      console.error('Failed to add to project shortlist - storage quota exceeded');
      setShowShortlistModal(false);
    }
  };

  const handleAddToProjectClick = () => {
    if (!isAuthenticated) {
      console.log('Please sign in as a client to add talent to projects');
      return;
    }
    if (!isClient) {
      console.log('Only clients can add talent to projects');
      return;
    }
    if (!user?.id) {
      console.log('Authentication error - please try signing in again');
      return;
    }
    
    // Load fresh user projects
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

  // Handle sign-in navigation
  const handleSignInRedirect = () => {
    // Try common navigation methods - customize based on your routing system
    
    // Option 1: If using React Router
    // navigate('/signin');
    
    // Option 2: If using Next.js router
    // router.push('/signin');
    
    // Option 3: If using a custom page change handler
    // onPageChange('signin');
    
    // Option 4: Direct window navigation (fallback)
    window.location.href = '/signin';
    
    // If none of the above work, you can uncomment this line and customize:
    // console.log('Please sign in to continue - redirecting to sign-in page');
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
        {isTalent && talentId === user?.id && (
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
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Contact Talent
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
                    {talentId === user?.id 
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

            {/* Market Appeal - New Section */}
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

        {/* Contact Modal - Only renders for authenticated clients */}
        {showContactModal && canPerformClientActions() && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Contact {talent?.name}</h2>
                  <button 
                    onClick={() => setShowContactModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  if (!contactForm.subject || !contactForm.message) {
                    console.log('Subject and message are required');
                    return;
                  }
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
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                    >
                      <Send className="h-4 w-4" />
                      Send Message
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowContactModal(false)}
                      className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Project Shortlist Modal - Only renders for authenticated clients */}
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
