import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Heart, Star, MapPin, Play, Download, Share2, Clock, Award, Mic } from 'lucide-react';

interface TalentData {
  id: string;
  name: string;
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  hourlyRate: string;
  avatar: string;
  coverImage: string;
  bio: string;
  skills: string[];
  languages: string[];
  experience: string;
  samples: {
    id: string;
    title: string;
    duration: string;
    url: string;
    category: string;
  }[];
  reviews: {
    id: string;
    clientName: string;
    rating: number;
    comment: string;
    date: string;
  }[];
  responseTime: string;
  completionRate: string;
  totalJobs: number;
}

const TalentProfile: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);

  // FETCH REAL DATA FROM YOUR API
  useEffect(() => {
    const fetchTalentData = async () => {
      if (!id) {
        setError('No talent ID provided');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching talent data for ID:', id);
        
        // Replace with your actual API endpoint
        const response = await fetch(`/api/talent/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch talent data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Talent data received:', data);
        
        // Transform API data to match TalentData interface
        const talentData: TalentData = {
          id: data.id || id,
          name: data.name || data.full_name || 'Unknown Talent',
          title: data.title || data.profession || 'Voice Over Artist',
          location: data.location || data.city || 'Location not specified',
          rating: data.rating || data.average_rating || 4.5,
          reviewCount: data.reviewCount || data.review_count || 0,
          hourlyRate: data.hourlyRate || data.rate || '$50-100',
          avatar: data.avatar || data.profile_image || '/api/placeholder/150/150',
          coverImage: data.coverImage || data.cover_image || '/api/placeholder/800/300',
          bio: data.bio || data.description || 'Professional voice over artist.',
          skills: data.skills || data.specialties || ['Voice Over', 'Narration'],
          languages: data.languages || ['English'],
          experience: data.experience || data.years_experience || '5+ years',
          samples: data.samples || data.voice_samples || [],
          reviews: data.reviews || [],
          responseTime: data.responseTime || data.response_time || '< 24 hours',
          completionRate: data.completionRate || data.completion_rate || '95%',
          totalJobs: data.totalJobs || data.completed_jobs || 0
        };
        
        setTalent(talentData);
        setLoading(false);
        
      } catch (err) {
        console.error('❌ Error fetching talent data:', err);
        
        // Fallback to basic data if API fails
        const fallbackTalent: TalentData = {
          id: id,
          name: `Talent ${id}`,
          title: 'Voice Over Artist',
          location: 'Location not available',
          rating: 4.5,
          reviewCount: 0,
          hourlyRate: '$50-100',
          avatar: '/api/placeholder/150/150',
          coverImage: '/api/placeholder/800/300',
          bio: `Profile for talent ID: ${id}. Full profile data is being loaded.`,
          skills: ['Voice Over'],
          languages: ['English'],
          experience: 'Experience info loading...',
          samples: [],
          reviews: [],
          responseTime: '< 24 hours',
          completionRate: '95%',
          totalJobs: 0
        };
        
        setTalent(fallbackTalent);
        setError(`Could not load full profile data. Showing basic info for talent ${id}.`);
        setLoading(false);
      }
    };

    fetchTalentData();
  }, [id]);

  const handlePlaySample = (sampleId: string) => {
    if (isPlaying === sampleId) {
      setIsPlaying(null);
    } else {
      setIsPlaying(sampleId);
      // In real app, would play audio file
      setTimeout(() => setIsPlaying(null), 3000); // Auto stop after 3 seconds for demo
    }
  };

  const handleSendMessage = () => {
    setShowMessageForm(true);
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading talent profile for ID: {id}...</div>
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Talent Not Found</h2>
          <p className="text-gray-400 mb-4">Could not find talent with ID: {id}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Show error message if any */}
      {error && (
        <div className="bg-yellow-600 text-white p-3 text-center">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="relative">
        <div 
          className="h-64 bg-gradient-to-r from-blue-600 to-purple-600 bg-cover bg-center"
          style={{ backgroundImage: `url(${talent.coverImage})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        </div>
        
        <div className="absolute top-6 left-6">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-lg transition-all backdrop-blur-sm"
          >
            ← Back
          </button>
        </div>

        <div className="absolute top-6 right-6 flex gap-3">
          <button
            onClick={handleLike}
            className={`p-3 rounded-full transition-all backdrop-blur-sm ${
              isLiked 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-black bg-opacity-50 hover:bg-opacity-70'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button className="p-3 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full transition-all backdrop-blur-sm">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="container mx-auto px-6 -mt-20 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column */}
          <div className="lg:w-1/3">
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
              <div className="text-center mb-6">
                <img
                  src={talent.avatar}
                  alt={talent.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
                />
                <h1 className="text-2xl font-bold mb-1">{talent.name}</h1>
                <p className="text-blue-400 mb-2">{talent.title}</p>
                <div className="flex items-center justify-center gap-1 mb-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-400 text-sm">{talent.location}</span>
                </div>
                <div className="flex items-center justify-center gap-1 mb-4">
                  {renderStars(talent.rating)}
                  <span className="text-sm text-gray-400 ml-1">
                    {talent.rating} ({talent.reviewCount} reviews)
                  </span>
                </div>
                <div className="text-xl font-bold text-green-400 mb-4">
                  {talent.hourlyRate}/hour
                </div>
              </div>

              <button
                onClick={handleSendMessage}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors mb-3 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Send Message
              </button>

              <div className="grid grid-cols-3 gap-4 text-center border-t border-slate-700 pt-4">
                <div>
                  <div className="text-lg font-bold">{talent.totalJobs}</div>
                  <div className="text-xs text-gray-400">Jobs Done</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{talent.completionRate}</div>
                  <div className="text-xs text-gray-400">Success Rate</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{talent.responseTime}</div>
                  <div className="text-xs text-gray-400">Response</div>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl mt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-400" />
                Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {talent.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-600 bg-opacity-20 text-blue-400 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl mt-6">
              <h3 className="text-lg font-semibold mb-4">Languages</h3>
              <div className="space-y-2">
                {talent.languages.map((language, index) => (
                  <div key={index} className="text-sm text-gray-300">
                    {language}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:w-2/3">
            {/* About */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-gray-300 leading-relaxed">{talent.bio}</p>
              <div className="mt-4 text-sm text-gray-400">
                <strong>Experience:</strong> {talent.experience}
              </div>
              <div className="mt-2 text-sm text-gray-400">
                <strong>Talent ID:</strong> {talent.id}
              </div>
            </div>

            {/* Voice Samples */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-blue-400" />
                Voice Samples
              </h2>
              {talent.samples && talent.samples.length > 0 ? (
                <div className="grid gap-4">
                  {talent.samples.map((sample) => (
                    <div
                      key={sample.id}
                      className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handlePlaySample(sample.id)}
                          className={`p-3 rounded-full transition-all ${
                            isPlaying === sample.id 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-600 hover:bg-slate-500 text-gray-300'
                          }`}
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <div>
                          <h4 className="font-medium">{sample.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {sample.duration}
                            </span>
                            <span>{sample.category}</span>
                          </div>
                        </div>
                      </div>
                      <button className="p-2 text-gray-400 hover:text-white transition-colors">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  No voice samples available for this talent yet.
                </div>
              )}
            </div>

            {/* Reviews */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Reviews</h2>
              {talent.reviews && talent.reviews.length > 0 ? (
                <div className="space-y-4">
                  {talent.reviews.map((review) => (
                    <div key={review.id} className="border-b border-slate-700 pb-4 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{review.clientName}</h4>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{review.comment}</p>
                      <span className="text-xs text-gray-400">{review.date}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  No reviews available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message Form Modal */}
      {showMessageForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Send Message to {talent.name}</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Subject"
                className="w-full p-3 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <textarea
                placeholder="Your message..."
                rows={4}
                className="w-full p-3 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
              ></textarea>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowMessageForm(false)}
                  className="flex-1 py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowMessageForm(false);
                    // Handle message sending logic here
                  }}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TalentProfile;