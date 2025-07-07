import React, { useState, useEffect } from 'react';
import { Star, MapPin, Clock, DollarSign, Play, Pause, Download, ArrowLeft, X, Send } from 'lucide-react'; // ✅ Added ArrowLeft
import { talentService } from '../services/talentService';
import { audioService } from '../services/audioService';

interface TalentData {
  id: string;
  name: string;
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  hourlyRate: string; // Changed from number to string to handle ranges
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
  const { user, isClient, isTalent } = useAuth(); // Add useAuth hook
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    budget: '',
    deadline: ''
  });
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Check if current user is viewing their own profile
  const isOwnProfile = isTalent && talentId === `talent_user_${user?.id}`;

  useEffect(() => {
    if (talentId) {
      loadTalentData();
      checkIfSaved();
    }
  }, [talentId]);

  // Debug logging to verify profile detection
  useEffect(() => {
    console.log('🔍 Profile Detection Debug:');
    console.log('- Current user:', user);
    console.log('- Is talent:', isTalent);
    console.log('- Is client:', isClient);
    console.log('- Viewing talent ID:', talentId);
    console.log('- Expected own talent ID:', `talent_user_${user?.id}`);
    console.log('- Is own profile:', isOwnProfile);
  }, [user, talentId, isOwnProfile]);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    };
  }, [audioElement]);

  const checkIfSaved = () => {
    if (!talentId) return;
    
    const savedTalents = JSON.parse(localStorage.getItem('savedTalents') || '[]');
    const isAlreadySaved = savedTalents.some((saved: any) => saved.id === talentId);
    setIsSaved(isAlreadySaved);
  };

  const loadTalentData = () => {
    if (!talentId) return;

    // First try to get talent from the talent service
    const talentProfile = talentService.getTalentProfile(talentId);
    
    if (talentProfile) {
      // Convert talent profile to the format expected by this component
      const talentData = {
        id: talentProfile.id,
        name: talentProfile.name,
        title: talentProfile.title,
        location: talentProfile.location,
        rating: talentProfile.rating,
        reviewCount: talentProfile.reviews,
        hourlyRate: talentProfile.priceRange, // Use priceRange instead of parsing number
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
      
      // Add portfolio items based on demos
      if (talentProfile.demos && talentProfile.demos.length > 0) {
        console.log('Loading demos from talent profile:', talentProfile.demos);
        talentData.portfolio = talentProfile.demos.map((demo: any) => ({
          title: demo.name || 'Demo',
          description: demo.type || 'Voice Demo',
          audioUrl: demo.url || audioService.getSampleAudioUrl(),
          duration: demo.duration || 30
        }));
      } else if (talentProfile.userId) {
        // Try to get demos from audio service
        console.log('Loading demos from audio service for user:', talentProfile.userId);
        const demos = audioService.getUserDemos(talentProfile.userId);
        console.log('Found demos from audio service:', demos);
        if (demos.length > 0) {
          talentData.portfolio = demos.map(demo => ({
            title: demo.name,
            description: demo.type || 'Voice Demo',
            audioUrl: demo.url,
            duration: demo.duration
          }));
        } else {
          // Add default sample demos if no demos found
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
      }
      
      setTalent(talentData);
    } else {
      // Fallback to mock data
      const mockData = mockTalentData[talentId];
      if (mockData) {
        setTalent(mockData);
      }
    }
    
    setLoading(false);
  };

  const handlePlayAudio = (audioUrl: string) => {
    // Stop any currently playing audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    if (playingAudio === audioUrl) {
      // If clicking the same audio, stop it
      setPlayingAudio(null);
      setAudioElement(null);
    } else {
      // Play new audio
      try {
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setPlayingAudio(null);
          setAudioElement(null);
        };
        audio.onerror = () => {
          console.log('Audio playback failed, using sample audio');
          // Fallback to sample audio if the URL doesn't work
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
    
    // In a real app, this would send the message via API
    console.log('Sending message to:', talent.name, contactForm);
    
    // Save message to localStorage for demo
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
    
    // Reset form and close modal
    setContactForm({ subject: '', message: '', budget: '', deadline: '' });
    setShowContactModal(false);
    alert(`Message sent to ${talent.name}! They will respond within ${talent.responseTime}.`);
  };

  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContactForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = () => {
    if (!talent) return;
    
    setIsSaved(!isSaved);
    
    // Save to localStorage for demo
    const savedTalents = JSON.parse(localStorage.getItem('savedTalents') || '[]');
    
    if (!isSaved) {
      // Add to saved talents
      if (!savedTalents.find((saved: any) => saved.id === talent.id)) {
        savedTalents.push({
          id: talent.id,
          name: talent.name,
          title: talent.title,
          avatar: talent.avatar,
          rating: talent.rating,
          savedAt: new Date().toISOString()
        });
        localStorage.setItem('savedTalents', JSON.stringify(savedTalents));
        alert(`${talent.name} has been saved to your favorites!`);
      }
    } else {
      // Remove from saved talents
      const filteredTalents = savedTalents.filter((saved: any) => saved.id !== talent.id);
      localStorage.setItem('savedTalents', JSON.stringify(filteredTalents));
      alert(`${talent.name} has been removed from your favorites.`);
    }
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
        
        {/* Header Section */}
        <div className="bg-slate-800 rounded-xl shadow-lg p-8 mb-8 border border-gray-700">
          {/* Own Profile Indicator */}
          {isOwnProfile && (
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-600/50 rounded-lg">
              <p className="text-blue-300 text-sm font-medium">
                👤 This is your talent profile - showing how clients will see you
              </p>
            </div>
          )}
          
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
            </div>
            <div className="flex flex-col gap-3">
              {isOwnProfile ? (
                // Buttons for viewing own profile
                <>
                  <button 
                    onClick={() => {
                      // Navigate to edit profile or show edit mode
                      alert('Edit Profile functionality - would open profile editor');
                    }}
                    className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit3 className="h-5 w-5" />
                    <span>Edit Profile</span>
                  </button>
                  <button 
                    onClick={() => {
                      alert('This shows how your profile appears to clients');
                    }}
                    className="border border-gray-600 text-gray-300 px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Preview for Clients
                  </button>
                </>
              ) : (
                // Buttons for viewing other profiles
                <>
                  <button 
                    onClick={handleContactTalent}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isTalent ? 'Connect with Talent' : 'Contact Talent'}
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className={`px-6 py-3 rounded-lg transition-colors ${
                      isSaved 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'border border-gray-600 text-gray-300 hover:bg-slate-700'
                    }`}
                  >
                    {isSaved ? 'Saved ✓' : 'Save Profile'}
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

        {/* Contact Modal - Only show if not viewing own profile */}
        {showContactModal && !isOwnProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {isTalent ? `Connect with ${talent?.name}` : `Contact ${talent?.name}`}
                  </h2>
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
                      placeholder={isTalent ? "Collaboration opportunity..." : "Voice over project for..."}
                      required
                    />
                  </div>

                  {isClient && (
                    <>
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
                    </>
                  )}

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
                      placeholder={
                        isTalent 
                          ? "Hi! I'm interested in connecting about potential collaboration opportunities..."
                          : "Describe your project, what type of voice over you need, any special requirements..."
                      }
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
      </div>
    </div>
  );
};

export default TalentProfile;