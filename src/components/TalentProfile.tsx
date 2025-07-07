import React, { useState, useEffect } from 'react';
import { Star, MapPin, Clock, DollarSign, Play, Pause, Download, ArrowLeft, X, Send, Users, Briefcase, Heart, Plus } from 'lucide-react';
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

// Enhanced favorites and shortlist management
class FavoritesManager {
  // Tier 1: General Favorites
  static addToGeneralFavorites(clientId: string, talentId: string, talentData: any) {
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
      localStorage.setItem('generalFavorites', JSON.stringify(favorites));
    }
  }

  static removeFromGeneralFavorites(clientId: string, talentId: string) {
    const favorites = JSON.parse(localStorage.getItem('generalFavorites') || '{}');
    
    if (favorites[clientId]) {
      favorites[clientId] = favorites[clientId].filter((fav: any) => fav.talentId !== talentId);
      localStorage.setItem('generalFavorites', JSON.stringify(favorites));
    }
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
      localStorage.setItem('projectShortlists', JSON.stringify(shortlists));
    }
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
  // Enhanced user type detection
  const getUserType = () => {
    try {
      const userType = localStorage.getItem('userType') || localStorage.getItem('user_type');
      const userRole = localStorage.getItem('userRole') || localStorage.getItem('user_role');
      const isTalentFlag = localStorage.getItem('isTalent');
      
      const isTalentUser = (userType === 'talent') || 
                          (userRole === 'talent') || 
                          (isTalentFlag === 'true');
      
      return {
        isClient: !isTalentUser,
        isTalent: isTalentUser,
        userId: localStorage.getItem('userId') || 'demo_user_' + Date.now()
      };
    } catch (error) {
      console.log('LocalStorage access error:', error);
      return { isClient: true, isTalent: false, userId: 'demo_user_' + Date.now() };
    }
  };
  
  const { isClient, isTalent, userId } = getUserType();
  
  // Force client mode for testing
  const forceClientMode = true;
  const finalIsClient = forceClientMode || isClient;
  const finalIsTalent = !forceClientMode && isTalent;
  
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [talentStats, setTalentStats] = useState<TalentStats>({ generalFavorites: 0, projectShortlists: 0, activeProjects: [] });
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    budget: '',
    deadline: ''
  });
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (talentId) {
      loadTalentData();
      checkIfSaved();
      loadTalentStats();
      loadUserProjects();
    }
  }, [talentId, userId]);

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

  const loadUserProjects = () => {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const userProjectsList = projects.filter((p: Project) => p.clientId === userId && p.status === 'open');
    setUserProjects(userProjectsList);
  };

  const checkIfSaved = () => {
    if (!talentId || !userId) return;
    const isInFavorites = FavoritesManager.isInGeneralFavorites(userId, talentId);
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
        alert('Audio playback failed. This is a demo - in a real app, audio files would be properly hosted.');
      }
    }
  };

  const handleContactTalent = () => {
    setShowContactModal(true);
  };

  const handleSendMessage = () => {
    if (!talent || !contactForm.subject || !contactForm.message) {
      alert('Please fill in subject and message fields.');
      return;
    }
    
    const messages = JSON.parse(localStorage.getItem('sentMessages') || '[]');
    messages.push({
      id: Date.now(),
      talentId: talent.id,
      talentName: talent.name,
      subject: contactForm.subject,
      message: contactForm.message,
      budget: contactForm.budget,
      deadline: contactForm.deadline,
      sentAt: new Date().toISOString(),
      status: 'sent'
    });
    localStorage.setItem('sentMessages', JSON.stringify(messages));
    
    setContactForm({ subject: '', message: '', budget: '', deadline: '' });
    setShowContactModal(false);
    alert(`Message sent to ${talent.name}! They will respond within ${talent.responseTime}.`);
  };

  // Enhanced save functionality - Tier 1: General Favorites
  const handleSaveProfile = () => {
    if (!talent || !userId) return;
    
    if (!isSaved) {
      FavoritesManager.addToGeneralFavorites(userId, talent.id, talent);
      setIsSaved(true);
      loadTalentStats(); // Refresh stats
      alert(`${talent.name} has been added to your favorites! They'll be notified of your interest.`);
    } else {
      FavoritesManager.removeFromGeneralFavorites(userId, talent.id);
      setIsSaved(false);
      loadTalentStats(); // Refresh stats
      alert(`${talent.name} has been removed from your favorites.`);
    }
  };

  // New functionality - Tier 2: Project Shortlists
  const handleAddToShortlist = (projectId: string) => {
    if (!talent || !userId) return;
    
    FavoritesManager.addToProjectShortlist(projectId, talent.id, talent);
    setShowShortlistModal(false);
    alert(`${talent.name} has been added to your project shortlist! They'll be notified about this opportunity.`);
  };

  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
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
        {finalIsTalent && talentId === userId && (
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
              {!finalIsTalent && (
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
              {finalIsClient ? (
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
                      onClick={() => setShowShortlistModal(true)}
                      className="border border-blue-600 text-blue-400 px-6 py-3 rounded-lg hover:bg-blue-900/20 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Project
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center p-4 bg-slate-700 rounded-lg border border-gray-600">
                  <p className="text-gray-300 text-sm">
                    👤 Viewing as talent - Contact and save features are available to clients
                  </p>
                </div>
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

        {/* Contact Modal - Only for clients */}
        {showContactModal && finalIsClient && (
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

                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="space-y-4">
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

        {/* Project Shortlist Modal - Only for clients */}
        {showShortlistModal && finalIsClient && (
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
