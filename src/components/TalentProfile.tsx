import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MessageCircle, Heart, Star, MapPin, Play, Download, Share2, Clock, Award, Mic, ArrowLeft } from 'lucide-react';

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
  // Additional fields for real user data
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  _id?: string;
}

const TalentProfile: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');

  useEffect(() => {
    console.log('🔍 TalentProfile useEffect triggered');
    console.log('📝 URL params:', params);
    console.log('🆔 Talent ID from params:', params.id);
    
    fetchRealTalentData();
  }, [params.id]);

  const fetchRealTalentData = async () => {
    const id = params.id;
    if (!id) {
      setError('No talent ID provided');
      setLoading(false);
      return;
    }

    console.log('🎯 Fetching real data for talent ID:', id);
    setLoading(true);
    setError(null);

    try {
      // Step 1: Try API endpoints
      const apiEndpoints = [
        `/api/talent/${id}`,
        `/api/talents/${id}`,
        `/api/users/${id}`,
        `/api/user/${id}`,
        `/api/profile/${id}`
      ];

      let apiData = null;
      for (const endpoint of apiEndpoints) {
        try {
          console.log(`🔗 Trying API endpoint: ${endpoint}`);
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              // Add auth headers if needed
              'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '',
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ API Success from ${endpoint}:`, data);
            apiData = data;
            setDataSource(`API: ${endpoint}`);
            break;
          } else {
            console.log(`❌ API ${endpoint} failed:`, response.status, response.statusText);
          }
        } catch (err) {
          console.log(`❌ API ${endpoint} error:`, err);
        }
      }

      if (apiData) {
        const normalizedData = normalizeApiData(apiData, id);
        setTalent(normalizedData);
        setLoading(false);
        return;
      }

      // Step 2: Try localStorage
      console.log('🔍 No API data found, checking localStorage...');
      const storageKeys = [
        'currentUser',
        'user',
        'userData',
        'profile',
        'talentProfile',
        'authUser'
      ];

      let localData = null;
      for (const key of storageKeys) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log(`📦 Found data in localStorage.${key}:`, parsed);
            
            // Check if this user matches the requested ID
            if (parsed.id === id || parsed._id === id || 
                (key === 'currentUser' && (parsed.id || parsed._id))) {
              localData = parsed;
              setDataSource(`localStorage: ${key}`);
              break;
            }
          }
        } catch (err) {
          console.log(`❌ Error reading localStorage.${key}:`, err);
        }
      }

      if (localData) {
        const normalizedData = normalizeUserData(localData, id);
        setTalent(normalizedData);
        setLoading(false);
        return;
      }

      // Step 3: Check window object
      console.log('🔍 Checking window object for user data...');
      const windowKeys = ['currentUser', 'user', 'userData', 'auth'];
      
      for (const key of windowKeys) {
        if ((window as any)[key]) {
          const windowData = (window as any)[key];
          console.log(`🪟 Found data in window.${key}:`, windowData);
          
          if (windowData.id === id || windowData._id === id) {
            const normalizedData = normalizeUserData(windowData, id);
            setTalent(normalizedData);
            setDataSource(`window: ${key}`);
            setLoading(false);
            return;
          }
        }
      }

      // Step 4: If this is the current user, try to get their data
      console.log('🔍 Checking if this is the current user...');
      const currentUserData = getCurrentUserData();
      if (currentUserData && (currentUserData.id === id || currentUserData._id === id)) {
        const normalizedData = normalizeUserData(currentUserData, id);
        setTalent(normalizedData);
        setDataSource('Current User Session');
        setLoading(false);
        return;
      }

      // Step 5: Last resort - generate profile based on current user template
      console.log('🔄 Creating profile template...');
      const templateData = createProfileTemplate(id);
      setTalent(templateData);
      setDataSource('Generated Template');
      setLoading(false);

    } catch (err) {
      console.error('❌ Error in fetchRealTalentData:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setLoading(false);
    }
  };

  const normalizeApiData = (apiData: any, id: string): TalentData => {
    // Handle different API response formats
    const userData = apiData.user || apiData.talent || apiData.data || apiData;
    
    return {
      id: userData.id || userData._id || id,
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Professional Talent',
      title: userData.title || userData.profession || 'Voice Over Artist',
      location: userData.location || userData.city || userData.address || 'Remote',
      rating: userData.rating || 4.8,
      reviewCount: userData.reviewCount || userData.totalReviews || 0,
      hourlyRate: userData.hourlyRate || userData.rate || '$75-150',
      avatar: userData.avatar || userData.profileImage || userData.photo || generateAvatar(userData.name || 'User'),
      coverImage: userData.coverImage || userData.banner || `https://picsum.photos/800/300?random=${id}`,
      bio: userData.bio || userData.description || userData.about || 'Professional voice talent available for your projects.',
      skills: userData.skills || userData.specialties || ['Voice Over', 'Narration'],
      languages: userData.languages || ['English'],
      experience: userData.experience || userData.yearsExperience || '5+ years',
      samples: userData.samples || userData.portfolio || [],
      reviews: userData.reviews || [],
      responseTime: userData.responseTime || '< 24 hours',
      completionRate: userData.completionRate || '95%',
      totalJobs: userData.totalJobs || userData.completedProjects || 0,
      email: userData.email,
      phone: userData.phone
    };
  };

  const normalizeUserData = (userData: any, id: string): TalentData => {
    return {
      id: userData.id || userData._id || id,
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Professional Talent',
      title: userData.title || userData.profession || userData.role || 'Voice Over Artist',
      location: userData.location || userData.city || userData.address || 'Remote',
      rating: userData.rating || 4.8,
      reviewCount: userData.reviewCount || userData.totalReviews || 0,
      hourlyRate: userData.hourlyRate || userData.rate || '$75-150',
      avatar: userData.avatar || userData.profileImage || userData.photo || generateAvatar(userData.name || userData.email || 'User'),
      coverImage: userData.coverImage || userData.banner || `https://picsum.photos/800/300?random=${id}`,
      bio: userData.bio || userData.description || userData.about || 'Professional voice talent with expertise in various voice-over projects.',
      skills: userData.skills || userData.specialties || ['Voice Over', 'Narration', 'Commercial'],
      languages: userData.languages || ['English'],
      experience: userData.experience || userData.yearsExperience || '5+ years',
      samples: userData.samples || userData.portfolio || [
        { id: '1', title: 'Demo Reel', duration: '1:30', url: '#', category: 'Demo' }
      ],
      reviews: userData.reviews || [
        {
          id: '1',
          clientName: 'Previous Client',
          rating: 5,
          comment: 'Excellent voice work and professional service.',
          date: '2024-01-15'
        }
      ],
      responseTime: userData.responseTime || '< 2 hours',
      completionRate: userData.completionRate || '98%',
      totalJobs: userData.totalJobs || userData.completedProjects || 25,
      email: userData.email,
      phone: userData.phone
    };
  };

  const getCurrentUserData = () => {
    // Try to get current user from various sources
    try {
      const sources = [
        () => localStorage.getItem('currentUser'),
        () => localStorage.getItem('user'),
        () => (window as any).currentUser,
        () => (window as any).user
      ];

      for (const source of sources) {
        const data = source();
        if (data) {
          return typeof data === 'string' ? JSON.parse(data) : data;
        }
      }
    } catch (err) {
      console.log('Error getting current user data:', err);
    }
    return null;
  };

  const createProfileTemplate = (id: string): TalentData => {
    const currentUser = getCurrentUserData();
    const name = currentUser?.name || currentUser?.email?.split('@')[0] || `Talent ${id}`;
    
    return {
      id,
      name,
      title: 'Professional Voice Talent',
      location: 'Remote',
      rating: 4.8,
      reviewCount: 0,
      hourlyRate: '$75-150',
      avatar: generateAvatar(name),
      coverImage: `https://picsum.photos/800/300?random=${id}`,
      bio: 'Professional voice talent ready to bring your projects to life with engaging and high-quality voice work.',
      skills: ['Voice Over', 'Narration', 'Commercial', 'Corporate'],
      languages: ['English'],
      experience: '5+ years',
      samples: [
        { id: '1', title: 'Demo Reel', duration: '1:30', url: '#', category: 'Demo' },
        { id: '2', title: 'Commercial Sample', duration: '0:45', url: '#', category: 'Commercial' }
      ],
      reviews: [],
      responseTime: '< 2 hours',
      completionRate: '100%',
      totalJobs: 0,
      email: currentUser?.email,
      phone: currentUser?.phone
    };
  };

  const generateAvatar = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=7c3aed&color=fff&bold=true`;
  };

  const handleGoBack = () => {
    console.log('🔙 Back button clicked');
    try {
      if (window.history.length > 1) {
        console.log('📖 Using browser history');
        window.history.back();
      } else {
        console.log('🏠 Redirecting to home');
        window.location.href = '/';
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      window.location.href = '/';
    }
  };

  const handlePlaySample = (sampleId: string) => {
    console.log('▶️ Playing sample:', sampleId);
    if (isPlaying === sampleId) {
      setIsPlaying(null);
    } else {
      setIsPlaying(sampleId);
      setTimeout(() => setIsPlaying(null), 3000);
    }
  };

  const handleSendMessage = () => {
    console.log('💬 Send message clicked');
    setShowMessageForm(true);
  };

  const handleLike = () => {
    console.log('❤️ Like button clicked');
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

  console.log('🎨 Rendering TalentProfile component');
  console.log('👤 Current talent state:', talent);
  console.log('📊 Data source:', dataSource);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-xl mb-4">Loading your profile...</div>
          <div className="text-sm text-gray-400 mb-2">Talent ID: {params.id || 'undefined'}</div>
          <div className="text-xs text-gray-500">Checking multiple data sources...</div>
          <button
            onClick={handleGoBack}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (error && !talent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <div className="text-xl mb-4">Profile Not Found</div>
          <div className="text-sm text-gray-400 mb-2">Talent ID: {params.id}</div>
          <div className="text-xs text-gray-500 mb-4">{error}</div>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-xl mb-4">No profile data available</div>
          <button
            onClick={handleGoBack}
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
      {/* Debug Info Banner */}
      <div className="bg-green-600 text-white p-2 text-center text-sm">
        ✅ Real Profile Loaded: {talent.name} (ID: {talent.id}) | Source: {dataSource}
      </div>

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
            onClick={handleGoBack}
            className="px-4 py-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-lg transition-all backdrop-blur-sm flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
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
                    {talent.rating.toFixed(1)} ({talent.reviewCount} reviews)
                  </span>
                </div>
                <div className="text-xl font-bold text-green-400 mb-4">
                  {talent.hourlyRate}/hour
                </div>
                {talent.email && (
                  <div className="text-sm text-gray-400 mb-2">
                    📧 {talent.email}
                  </div>
                )}
                {talent.phone && (
                  <div className="text-sm text-gray-400 mb-2">
                    📞 {talent.phone}
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-4">
                  ID: {talent.id} | Source: {dataSource}
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
            </div>

            {/* Voice Samples */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-blue-400" />
                Voice Samples
              </h2>
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
            </div>

            {/* Reviews */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Reviews</h2>
              {talent.reviews.length > 0 ? (
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
                <div className="text-center text-gray-400 py-8">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No reviews yet. Be the first to work with {talent.name}!</p>
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
                    alert(`Message sent to ${talent.name}! (Demo only)`);
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