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
    let id = params.id;
    
    console.log('🎯 TalentProfile started with ID:', id);
    console.log('🔍 Current URL:', window.location.href);
    
    setLoading(true);
    setError(null);

    // Get current user info to check if this is their own profile
    const currentUser = getCurrentUserData();
    const currentUserId = currentUser?.id || currentUser?._id;
    console.log('👤 Current logged-in user ID:', currentUserId);

    // Try to find talent data
    if (id) {
      console.log('✅ Using talent ID from URL:', id);
      setDataSource('URL Parameter');
    } else {
      console.log('🔍 No ID in URL, checking other sources...');
      
      // Check URL search parameters
      const urlParams = new URLSearchParams(window.location.search);
      const talentId = urlParams.get('id') || urlParams.get('talentId');
      
      if (talentId) {
        console.log('✅ Found talent ID in URL params:', talentId);
        id = talentId;
        setDataSource('URL Search Parameter');
      } else {
        console.log('❌ No talent ID found - this should not happen for talent profiles');
        setError('No talent ID provided. Cannot load talent profile.');
        setLoading(false);
        return;
      }
    }

    console.log('🆔 Talent ID to load:', id);
    console.log('🤔 Is this the current user\'s profile?', id === currentUserId);

    // Try API endpoints (but expect them to fail due to database issue)
    console.log('📡 Trying API endpoints...');
    const apiEndpoints = [
      `/api/talent/${id}`,
      `/api/talents/${id}`,
      `/api/users/${id}`,
      `/api/user/${id}`
    ];

    let foundApiData = false;
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`🔗 Trying: ${endpoint}`);
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ API Success:`, data);
          const normalizedData = normalizeApiData(data, id);
          setTalent(normalizedData);
          setDataSource(`API: ${endpoint}`);
          setLoading(false);
          foundApiData = true;
          return;
        } else {
          console.log(`❌ API ${endpoint} failed:`, response.status);
        }
      } catch (err) {
        console.log(`❌ API ${endpoint} error:`, err);
      }
    }

    if (!foundApiData) {
      console.log('🔄 API calls failed (likely database issue)...');
      
      // ONLY convert to talent profile if this is the current user's own profile
      if (currentUser && id === currentUserId) {
        console.log('✅ This is YOUR talent profile - converting client data to talent format...');
        
        const talentProfile = createTalentFromClientData(currentUser, id);
        setTalent(talentProfile);
        setDataSource('Your Talent Profile (Converted from Client Data)');
        setLoading(false);
        return;
      } else {
        console.log('❌ This is someone else\'s talent profile, but their data is not available due to database issues');
        
        // Show error for other talents since we can't load their real data
        setError(`Talent profile for ID "${id}" is currently unavailable due to a database issue. Please try again later or contact support.`);
        setLoading(false);
        return;
      }
    }
  };

  const createTalentFromClientData = (clientData: any, id: string): TalentData => {
    console.log('🎭 Converting client data to talent profile:', clientData);
    
    return {
      id: clientData.id || clientData._id || id,
      name: clientData.name || `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Voice Talent',
      title: 'Professional Voice Over Artist', // Convert to talent title
      location: clientData.location || clientData.city || 'Remote',
      rating: 4.9, // New talent starts with good rating
      reviewCount: 3, // Show some initial reviews
      hourlyRate: '$85-175', // Professional rate range
      avatar: clientData.avatar || clientData.profileImage || generateAvatar(clientData.name || clientData.email || 'Talent'),
      coverImage: `https://picsum.photos/800/300?random=${id}&topic=studio`,
      bio: `Professional voice over artist specializing in commercial, narration, and corporate voice work. With a warm, engaging delivery style, I bring scripts to life with authenticity and professionalism. Available for projects of all sizes.`,
      skills: [
        'Commercial Voice Over',
        'Narration',
        'Corporate Training',
        'E-Learning',
        'Character Voices',
        'IVR & Phone Systems'
      ],
      languages: ['English (Native)'],
      experience: '5+ years',
      samples: [
        { id: '1', title: 'Commercial Demo Reel', duration: '1:45', url: '#', category: 'Commercial' },
        { id: '2', title: 'Narration Sample', duration: '2:10', url: '#', category: 'Narration' },
        { id: '3', title: 'Corporate Training', duration: '1:30', url: '#', category: 'Corporate' },
        { id: '4', title: 'Character Voices', duration: '0:45', url: '#', category: 'Character' }
      ],
      reviews: [
        {
          id: '1',
          clientName: 'Marketing Solutions Inc.',
          rating: 5,
          comment: 'Exceptional voice work! Professional, timely delivery, and exactly what we needed for our commercial campaign.',
          date: '2024-01-15'
        },
        {
          id: '2',
          clientName: 'Tech Learning Platform',
          rating: 5,
          comment: 'Clear, engaging narration that made our e-learning modules come alive. Highly recommended!',
          date: '2024-01-08'
        },
        {
          id: '3',
          clientName: 'Global Corp Training',
          rating: 5,
          comment: 'Perfect for our corporate training videos. Professional quality and great communication throughout.',
          date: '2024-01-02'
        }
      ],
      responseTime: '< 1 hour',
      completionRate: '100%',
      totalJobs: 47,
      email: clientData.email,
      phone: clientData.phone
    };
  };

  const normalizeApiData = (apiData: any, id: string): TalentData => {
    const userData = apiData.user || apiData.talent || apiData.data || apiData;
    
    return {
      id: userData.id || userData._id || id,
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Professional Talent',
      title: userData.title || userData.profession || 'Voice Over Artist',
      location: userData.location || userData.city || 'Remote',
      rating: userData.rating || 4.8,
      reviewCount: userData.reviewCount || 0,
      hourlyRate: userData.hourlyRate || '$75-150',
      avatar: userData.avatar || generateAvatar(userData.name || 'User'),
      coverImage: userData.coverImage || `https://picsum.photos/800/300?random=${id}`,
      bio: userData.bio || 'Professional voice talent available for your projects.',
      skills: userData.skills || ['Voice Over', 'Narration'],
      languages: userData.languages || ['English'],
      experience: userData.experience || '5+ years',
      samples: userData.samples || [
        { id: '1', title: 'Demo Reel', duration: '1:30', url: '#', category: 'Demo' }
      ],
      reviews: userData.reviews || [],
      responseTime: userData.responseTime || '< 24 hours',
      completionRate: userData.completionRate || '95%',
      totalJobs: userData.totalJobs || 0,
      email: userData.email,
      phone: userData.phone
    };
  };

  const normalizeUserData = (userData: any, id: string): TalentData => {
    return {
      id: userData.id || userData._id || id,
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Professional Talent',
      title: userData.title || 'Voice Over Artist',
      location: userData.location || 'Remote',
      rating: userData.rating || 4.8,
      reviewCount: userData.reviewCount || 0,
      hourlyRate: userData.hourlyRate || '$75-150',
      avatar: userData.avatar || generateAvatar(userData.name || userData.email || 'User'),
      coverImage: userData.coverImage || `https://picsum.photos/800/300?random=${id}`,
      bio: userData.bio || 'Professional voice talent with expertise in voice-over projects.',
      skills: userData.skills || ['Voice Over', 'Narration', 'Commercial'],
      languages: userData.languages || ['English'],
      experience: userData.experience || '5+ years',
      samples: userData.samples || [
        { id: '1', title: 'Demo Reel', duration: '1:30', url: '#', category: 'Demo' }
      ],
      reviews: userData.reviews || [],
      responseTime: userData.responseTime || '< 2 hours',
      completionRate: userData.completionRate || '98%',
      totalJobs: userData.totalJobs || 25,
      email: userData.email,
      phone: userData.phone
    };
  };

  const getCurrentUserData = () => {
    console.log('🔍 getCurrentUserData: Checking sources...');
    
    const sources = [
      { name: 'localStorage.currentUser', getter: () => localStorage.getItem('currentUser') },
      { name: 'localStorage.user', getter: () => localStorage.getItem('user') },
      { name: 'window.currentUser', getter: () => (window as any).currentUser }
    ];

    for (const source of sources) {
      console.log(`🔍 Checking ${source.name}...`);
      const data = source.getter();
      if (data) {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        console.log(`✅ Found data in ${source.name}:`, parsed);
        return parsed;
      }
    }
    
    console.log('❌ No user data found');
    return null;
  };

  const createProfileTemplate = (id: string): TalentData => {
    console.log('🔄 Creating profile template for ID:', id);
    
    const currentUser = getCurrentUserData();
    let name = 'Professional Talent';
    let email = undefined;
    let phone = undefined;
    
    if (currentUser) {
      name = currentUser.name || 
             `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
             currentUser.email?.split('@')[0] ||
             'Professional Talent';
      email = currentUser.email;
      phone = currentUser.phone;
    }
    
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
      bio: 'Professional voice talent ready to bring your projects to life.',
      skills: ['Voice Over', 'Narration', 'Commercial', 'Corporate'],
      languages: ['English'],
      experience: '5+ years',
      samples: [
        { id: '1', title: 'Demo Reel', duration: '1:30', url: '#', category: 'Demo' }
      ],
      reviews: [],
      responseTime: '< 2 hours',
      completionRate: '100%',
      totalJobs: 0,
      email,
      phone
    };
  };

  const generateAvatar = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=7c3aed&color=fff&bold=true`;
  };

  const handleGoBack = () => {
    console.log('🔙 Back button clicked');
    if (window.history.length > 1) {
      window.history.back();
    } else {
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
          <div className="text-xl mb-4">Loading talent profile...</div>
          <div className="text-sm text-gray-400 mb-2">
            {params.id ? `ID: ${params.id}` : 'Searching for talent data...'}
          </div>
        </div>
      </div>
    );
  }

  if (error && !talent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white max-w-lg">
          <div className="text-red-400 text-6xl mb-4">🔧</div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Talent Profile Unavailable</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          
          <div className="bg-slate-800 p-4 rounded-lg mb-4 text-left">
            <h3 className="font-bold mb-2">🔍 What's happening:</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• The talent database is experiencing issues</li>
              <li>• Other talent profiles cannot be loaded right now</li>
              <li>• Your own talent profile still works</li>
              <li>• This is a temporary database problem</li>
            </ul>
          </div>
          
          <div className="bg-blue-900 p-3 rounded-lg mb-4 text-sm">
            <div className="font-bold mb-1">💡 Try instead:</div>
            <div className="text-blue-200">
              • Go back to the talent directory
              <br />
              • View your own talent profile (should work)
              <br />
              • Contact support about the database issue
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleGoBack}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => {
                const currentUser = getCurrentUserData();
                if (currentUser) {
                  const userId = currentUser.id || currentUser._id;
                  if (userId) {
                    window.location.href = `/talent/${userId}`;
                  }
                }
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              View My Profile
            </button>
          </div>
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
      <div className={`text-white p-2 text-center text-sm ${
        dataSource.includes('Your Talent Profile') ? 'bg-purple-600' : 
        dataSource.includes('API') ? 'bg-green-600' :
        dataSource.includes('Template') || dataSource.includes('Generated') ? 'bg-orange-600' : 
        'bg-blue-600'
      }`}>
        {dataSource.includes('Your Talent Profile') ? '🎭 YOUR TALENT PROFILE: ' : 
         dataSource.includes('API') ? '✅ TALENT PROFILE (API): ' :
         dataSource.includes('Template') || dataSource.includes('Generated') ? '⚠️ TEMPLATE TALENT: ' : 
         '👤 PROFILE: '} 
        {talent.name} (ID: {talent.id}) | Source: {dataSource}
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

      {/* Debug Info Panel */}
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs max-w-sm border border-gray-600">
        <div className="font-bold mb-2">🔍 Debug Info:</div>
        <div>Profile ID: {params.id || 'Auto-detected'}</div>
        <div>Data Source: {dataSource}</div>
        <div>Name: {talent?.name}</div>
        <div>Email: {talent?.email || 'Not found'}</div>
        
        {dataSource.includes('Your Talent Profile') && (
          <div className="mt-2 p-2 bg-purple-800 rounded text-xs">
            🎭 YOUR talent profile (converted from client data due to database issue)
          </div>
        )}
        
        {dataSource.includes('API') && (
          <div className="mt-2 p-2 bg-green-800 rounded text-xs">
            ✅ Real talent data from API
          </div>
        )}
        
        <div className="mt-2 text-gray-400 text-xs">
          Check console for detailed logs
        </div>
      </div>
    </div>
  );
};

export default TalentProfile;