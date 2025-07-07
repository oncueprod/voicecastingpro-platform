import React, { useState, useEffect } from 'react';
import { Star, MapPin, Clock, DollarSign, Play, Pause, Download, ArrowLeft } from 'lucide-react';
import { talentService } from '../services/talentService';
import { audioService } from '../services/audioService';

interface TalentData {
  id: string;
  name: string;
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
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
    hourlyRate: 75,
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
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  useEffect(() => {
    if (talentId) {
      loadTalentData();
    }
  }, [talentId]);

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
        hourlyRate: parseInt(talentProfile.priceRange.replace(/\D/g, '')),
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
        talentData.portfolio = talentProfile.demos.map((demo: any) => ({
          title: demo.name || 'Demo',
          description: demo.type || 'Voice Demo',
          audioUrl: demo.url || audioService.getSampleAudioUrl(),
          duration: demo.duration || 30
        }));
      } else if (talentProfile.userId) {
        // Try to get demos from audio service
        const demos = audioService.getUserDemos(talentProfile.userId);
        if (demos.length > 0) {
          talentData.portfolio = demos.map(demo => ({
            title: demo.name,
            description: 'Voice Demo',
            audioUrl: demo.url,
            duration: demo.duration
          }));
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
    if (playingAudio === audioUrl) {
      setPlayingAudio(null);
    } else {
      setPlayingAudio(audioUrl);
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
                  ${talent.hourlyRate}/hour
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {talent.responseTime}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Contact Talent
              </button>
              <button className="border border-gray-600 text-gray-300 px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors">
                Save Profile
              </button>
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
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {playingAudio === item.audioUrl ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        {playingAudio === item.audioUrl ? 'Pause' : 'Play'}
                      </button>
                      <button className="flex items-center gap-2 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
      </div>
    </div>
  );
};

export default TalentProfile;