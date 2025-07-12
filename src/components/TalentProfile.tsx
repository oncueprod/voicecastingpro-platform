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
}

const TalentProfile: React.FC = () => {
  const params = useParams<{ id: string }>();
  const [talent, setTalent] = useState<TalentData | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [dataSource, setDataSource] = useState<string>('Loading...');

  useEffect(() => {
    console.log('🔍 TalentProfile useEffect triggered');
    console.log('🆔 Talent ID from params:', params.id);

    const id = params.id || '1';
    console.log('🎯 Loading talent profile for ID:', id);

    loadTalentProfile(id);
  }, [params.id]);

  const loadTalentProfile = async (id: string) => {
    console.log('🔍 Searching for talent profile data for ID:', id);
    
    try {
      // Step 1: Try API endpoints
      console.log('📡 Trying API endpoints...');
      const apiSuccess = await tryApiEndpoints(id);
      if (apiSuccess) return;

      // Step 2: Try localStorage
      console.log('📦 Checking localStorage...');
      const localSuccess = tryLocalStorage(id);
      if (localSuccess) return;

      // Step 3: Try current user
      console.log('👤 Checking current user...');
      const userSuccess = tryCurrentUser(id);
      if (userSuccess) return;

      // Step 4: Generate mock data
      console.log('🎭 Generating mock talent data...');
      generateMockTalent(id);

    } catch (error) {
      console.error('❌ Error loading talent profile:', error);
      generateMockTalent(id);
    }
  };

  const tryApiEndpoints = async (id: string): Promise<boolean> => {
    const endpoints = [
      `/api/talent/${id}`,
      `/api/talents/${id}`,
      `/api/users/${id}`,
      `/api/user/${id}`
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔗 Trying: ${endpoint}`);
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Found real talent data from ${endpoint}`);
          
          const realTalent = convertApiData(data, id);
          setTalent(realTalent);
          setDataSource(`Real Data (${endpoint})`);
          return true;
        }
      } catch (err) {
        console.log(`❌ ${endpoint} failed:`, err);
      }
    }
    return false;
  };

  const tryLocalStorage = (id: string): boolean => {
    // Check specific talent storage
    const specificKeys = [
      `talentProfile_${id}`,
      `talent_${id}`,
      `profile_${id}`
    ];

    for (const key of specificKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          console.log(`✅ Found talent data in ${key}`);
          
          const realTalent = convertStoredData(data, id);
          setTalent(realTalent);
          setDataSource(`Real Data (${key})`);
          return true;
        } catch (e) {
          console.log(`❌ Error parsing ${key}`);
        }
      }
    }

    // Check general talent lists
    const listKeys = ['talentProfiles', 'allTalents', 'talents'];
    
    for (const key of listKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          let targetTalent = null;
          
          if (Array.isArray(data)) {
            targetTalent = data.find(profile => 
              profile.id === id || profile._id === id
            );
          } else if (data[id]) {
            targetTalent = data[id];
          }
          
          if (targetTalent) {
            console.log(`✅ Found talent data in ${key}`);
            const realTalent = convertStoredData(targetTalent, id);
            setTalent(realTalent);
            setDataSource(`Real Data (${key})`);
            return true;
          }
        } catch (e) {
          console.log(`❌ Error parsing ${key}`);
        }
      }
    }

    return false;
  };

  const tryCurrentUser = (id: string): boolean => {
    const currentUser = getCurrentUserData();
    
    if (currentUser && (currentUser.id === id || currentUser._id === id)) {
      console.log('✅ Using current user data as talent profile');
      const realTalent = convertUserData(currentUser, id);
      setTalent(realTalent);
      setDataSource('Your Real Talent Profile');
      return true;
    }
    
    return false;
  };

  const getCurrentUserData = () => {
    const sources = [
      () => localStorage.getItem('currentUser'),
      () => localStorage.getItem('user'),
      () => (window as any).currentUser
    ];

    for (const source of sources) {
      const data = source();
      if (data) {
        return typeof data === 'string' ? JSON.parse(data) : data;
      }
    }
    return null;
  };

  const convertApiData = (apiData: any, id: string): TalentData => {
    const userData = apiData.user || apiData.talent || apiData.data || apiData;
    
    return {
      id: userData.id || userData._id || id,
      name: userData.name || 'Professional Talent',
      title: userData.title || 'Voice Over Artist',
      location: userData.location || 'Remote',
      rating: userData.rating || 4.8,
      reviewCount: userData.reviewCount || 0,
      hourlyRate: userData.hourlyRate || '$85-175',
      avatar: userData.avatar || generateAvatar(userData.name || 'Talent'),
      coverImage: userData.coverImage || `https://picsum.photos/800/300?random=${id}`,
      bio: userData.bio || 'Professional voice talent.',
      skills: userData.skills || ['Voice Over', 'Narration'],
      languages: userData.languages || ['English'],
      experience: userData.experience || '5+ years',
      samples: userData.samples || [],
      reviews: userData.reviews || [],
      responseTime: userData.responseTime || '< 2 hours',
      completionRate: userData.completionRate || '100%',
      totalJobs: userData.totalJobs || 0
    };
  };

  const convertStoredData = (storedData: any, id: string): TalentData => {
    return {
      id: storedData.id || storedData._id || id,
      name: storedData.name || 'Professional Talent',
      title: storedData.title || 'Voice Over Artist',
      location: storedData.location || 'Remote',
      rating: storedData.rating || 4.8,
      reviewCount: storedData.reviewCount || 0,
      hourlyRate: storedData.hourlyRate || '$85-175',
      avatar: storedData.avatar || generateAvatar(storedData.name || 'Talent'),
      coverImage: storedData.coverImage || `https://picsum.photos/800/300?random=${id}`,
      bio: storedData.bio || 'Professional voice talent.',
      skills: storedData.skills || ['Voice Over', 'Narration'],
      languages: storedData.languages || ['English'],
      experience: storedData.experience || '5+ years',
      samples: storedData.samples || [],
      reviews: storedData.reviews || [],
      responseTime: storedData.responseTime || '< 2 hours',
      completionRate: storedData.completionRate || '100%',
      totalJobs: storedData.totalJobs || 0
    };
  };

  const convertUserData = (userData: any, id: string): TalentData => {
    return {
      id: userData.id || userData._id || id,
      name: userData.name || 'Your Name',
      title: userData.talentTitle || 'Voice Over Artist',
      location: userData.location || 'Remote',
      rating: userData.rating || 4.9,
      reviewCount: userData.reviewCount || 0,
      hourlyRate: userData.hourlyRate || '$85-175',
      avatar: userData.avatar || generateAvatar(userData.name || 'You'),
      coverImage: userData.coverImage || `https://picsum.photos/800/300?random=${id}`,
      bio: userData.talentBio || 'Professional voice talent.',
      skills: userData.talentSkills || ['Voice Over', 'Narration'],
      languages: userData.languages || ['English'],
      experience: userData.experience || '5+ years',
      samples: userData.voiceSamples || [],
      reviews: userData.reviews || [],
      responseTime: userData.responseTime || '< 1 hour',
      completionRate: userData.completionRate || '100%',
      totalJobs: userData.totalJobs || 0
    };
  };

  const generateMockTalent = (id: string) => {
    const names = [
      'Sarah Johnson', 'Michael Chen', 'Emma Rodriguez', 'David Thompson', 'Lisa Parker',
      'James Wilson', 'Maria Garcia', 'Robert Taylor', 'Ashley Brown', 'Christopher Lee'
    ];
    
    const titles = [
      'Professional Voice Over Artist', 'Commercial Voice Talent', 'Narration Specialist',
      'Character Voice Actor', 'Corporate Voice Talent', 'Animation Voice Artist'
    ];

    const locations = [
      'Los Angeles, CA', 'New York, NY', 'Nashville, TN', 'Atlanta, GA', 'Chicago, IL',
      'Austin, TX', 'Seattle, WA', 'Miami, FL', 'Denver, CO', 'Portland, OR'
    ];

    const skillOptions = [
      ['Commercial VO', 'Narration', 'Character Voices'],
      ['Corporate Training', 'E-Learning', 'Commercials'],
      ['Audiobooks', 'Documentary', 'Podcast Intro'],
      ['Animation', 'Video Games', 'Character Voices']
    ];

    const idNum = parseInt(id) || 1;
    const nameIndex = (idNum - 1) % names.length;
    const titleIndex = (idNum - 1) % titles.length;
    const locationIndex = (idNum - 1) % locations.length;
    const skillIndex = (idNum - 1) % skillOptions.length;

    const mockTalent: TalentData = {
      id: id,
      name: names[nameIndex],
      title: titles[titleIndex],
      location: locations[locationIndex],
      rating: 4.2 + (idNum % 8) * 0.1,
      reviewCount: 15 + (idNum * 7) % 100,
      hourlyRate: `$${50 + (idNum * 5) % 100}-${100 + (idNum * 10) % 200}`,
      avatar: generateAvatar(names[nameIndex]),
      coverImage: `https://picsum.photos/800/300?random=${idNum}`,
      bio: `Professional voice over artist with ${3 + (idNum % 8)}+ years of experience. Known for engaging delivery style.`,
      skills: skillOptions[skillIndex],
      languages: ['English (Native)'],
      experience: `${3 + (idNum % 8)}+ years`,
      samples: [
        { id: '1', title: 'Commercial Demo', duration: '0:45', url: '#', category: 'Commercial' },
        { id: '2', title: 'Narration Sample', duration: '1:20', url: '#', category: 'Narration' }
      ],
      reviews: [
        {
          id: '1',
          clientName: 'Production Company',
          rating: 5,
          comment: `Excellent work! ${names[nameIndex]} delivered exactly what we needed.`,
          date: '2024-01-15'
        }
      ],
      responseTime: '< 2 hours',
      completionRate: `${92 + (idNum % 8)}%`,
      totalJobs: 10 + (idNum * 8) % 200
    };

    console.log('✅ Generated mock talent:', mockTalent.name);
    setTalent(mockTalent);
    setDataSource('Mock Data (no real profile found)');
  };

  const generateAvatar = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=7c3aed&color=fff`;
  };

  const handleGoBack = () => {
    try {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      window.location.href = '/';
    }
  };

  const handlePlaySample = (sampleId: string) => {
    if (isPlaying === sampleId) {
      setIsPlaying(null);
    } else {
      setIsPlaying(sampleId);
      setTimeout(() => setIsPlaying(null), 3000);
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

  if (!talent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-xl mb-4">Loading talent profile...</div>
          <div className="text-sm text-gray-400 mb-2">Talent ID: {params.id || 'undefined'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Debug Info Banner */}
      <div className={`text-white p-2 text-center text-sm ${
        dataSource.includes('Real Data') || dataSource.includes('Your Real') ? 'bg-green-600' : 'bg-orange-600'
      }`}>
        {dataSource.includes('Real Data') || dataSource.includes('Your Real') ? 
          '✅ REAL TALENT PROFILE: ' : 
          '⚠️ MOCK TALENT PROFILE: '} 
        {talent.name} (ID: {talent.id}) | {dataSource}
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
        <div className="font-bold mb-2">🔍 Data Source:</div>
        <div>Talent ID: {talent.id}</div>
        <div>Name: {talent.name}</div>
        <div>Source: {dataSource}</div>
        
        {(dataSource.includes('Real Data') || dataSource.includes('Your Real')) ? (
          <div className="mt-2 p-2 bg-green-800 rounded text-xs">
            ✅ REAL TALENT PROFILE
          </div>
        ) : (
          <div className="mt-2 p-2 bg-orange-800 rounded text-xs">
            ⚠️ MOCK PROFILE
          </div>
        )}
      </div>
    </div>
  );
};

export default TalentProfile;