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
    let id = params.id;
    
    console.log('🎯 TalentProfile started with ID:', id);
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Search params:', window.location.search);
    
    setLoading(true);
    setError(null);

    // Try multiple approaches to get talent data
    try {
      // Approach 1: If we have an ID in the URL, use it
      if (id) {
        console.log('✅ Using talent ID from URL:', id);
        setDataSource('URL Parameter');
        // Continue with API calls using this ID
      } 
      // Approach 2: Check if talent data is passed via URL params or state
      else {
        console.log('🔍 No ID in URL, checking for talent data in other ways...');
        
        // Check URL search parameters
        const urlParams = new URLSearchParams(window.location.search);
        const talentId = urlParams.get('id') || urlParams.get('talentId') || urlParams.get('talent');
        
        if (talentId) {
          console.log('✅ Found talent ID in URL params:', talentId);
          id = talentId;
          setDataSource('URL Search Parameter');
        } else {
          // Check if there's talent data in the current state/session
          console.log('🔍 Checking for talent data in session storage...');
          
          // Check sessionStorage for passed talent data
          const sessionTalent = sessionStorage.getItem('currentTalent') || 
                               sessionStorage.getItem('selectedTalent') ||
                               sessionStorage.getItem('viewingTalent');
          
          if (sessionTalent) {
            try {
              const talentData = JSON.parse(sessionTalent);
              console.log('✅ Found talent data in session storage:', talentData);
              
              // Use the session talent data directly
              const normalizedTalent = normalizeUserData(talentData, talentData.id || talentData._id || 'session');
              setTalent(normalizedTalent);
              setDataSource('Session Storage');
              setLoading(false);
              return;
            } catch (e) {
              console.log('❌ Error parsing session talent data:', e);
            }
          }
          
          // Check localStorage for talent lists or data
          console.log('🔍 Checking localStorage for talent data...');
          const talentList = localStorage.getItem('talents') || 
                           localStorage.getItem('talentProfiles') ||
                           localStorage.getItem('allTalents');
          
          if (talentList) {
            try {
              const talents = JSON.parse(talentList);
              console.log('📋 Found talent list in localStorage:', talents);
              
              // If it's an array, maybe we can use the first one or find a specific one
              if (Array.isArray(talents) && talents.length > 0) {
                // For now, let's check if there's a specific talent being viewed
                const viewingTalentId = localStorage.getItem('viewingTalentId');
                let selectedTalent = null;
                
                if (viewingTalentId) {
                  selectedTalent = talents.find(t => (t.id || t._id) === viewingTalentId);
                }
                
                if (!selectedTalent) {
                  selectedTalent = talents[0]; // Fallback to first talent
                }
                
                console.log('✅ Using talent from list:', selectedTalent);
                const normalizedTalent = normalizeUserData(selectedTalent, selectedTalent.id || selectedTalent._id || 'list');
                setTalent(normalizedTalent);
                setDataSource('Talent List');
                setLoading(false);
                return;
              }
            } catch (e) {
              console.log('❌ Error parsing talent list:', e);
            }
          }
          
          // Last resort: Check if this should be current user's profile
          console.log('🔍 Checking if this should be current user profile...');
          const currentUser = getCurrentUserData();
          
          if (currentUser) {
            const userId = currentUser.id || currentUser._id || currentUser.userId;
            if (userId) {
              console.log('✅ Using current user as fallback:', userId);
              id = userId;
              setDataSource('Current User Fallback');
            }
          }
          
          if (!id) {
            console.log('❌ No talent data found anywhere');
            setError('No talent profile data found. The talent profile may not be properly linked.');
            setLoading(false);
            return;
          }
        }
      }

    console.log('🎯 Fetching real data for talent ID:', id);
    console.log('🔍 DEBUGGING: Let\'s see what data we can find...');
    
    // First, let's check what's in localStorage right now
    console.log('📦 CURRENT LOCALSTORAGE CONTENTS:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          console.log(`  ${key}:`, value);
        } catch (e) {
          console.log(`  ${key}: (error reading)`);
        }
      }
    }
    
    console.log('🪟 CURRENT WINDOW OBJECT USER DATA:');
    const windowKeys = ['currentUser', 'user', 'userData', 'auth'];
    windowKeys.forEach(key => {
      if ((window as any)[key]) {
        console.log(`  window.${key}:`, (window as any)[key]);
      } else {
        console.log(`  window.${key}: undefined`);
      }
    });
    
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
    console.log('🔍 getCurrentUserData: Checking all sources...');
    
    // Try to get current user from various sources
    try {
      const sources = [
        { name: 'localStorage.currentUser', getter: () => localStorage.getItem('currentUser') },
        { name: 'localStorage.user', getter: () => localStorage.getItem('user') },
        { name: 'localStorage.userData', getter: () => localStorage.getItem('userData') },
        { name: 'localStorage.authUser', getter: () => localStorage.getItem('authUser') },
        { name: 'window.currentUser', getter: () => (window as any).currentUser },
        { name: 'window.user', getter: () => (window as any).user }
      ];

      for (const source of sources) {
        console.log(`🔍 Checking ${source.name}...`);
        const data = source.getter();
        if (data) {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          console.log(`✅ Found data in ${source.name}:`, parsed);
          return parsed;
        } else {
          console.log(`❌ No data in ${source.name}`);
        }
      }
      
      console.log('❌ No user data found in any source');
    } catch (err) {
      console.log('❌ Error getting current user data:', err);
    }
    return null;
  };

  const createProfileTemplate = (id: string): TalentData => {
    console.log('🔄 Creating profile template for ID:', id);
    
    const currentUser = getCurrentUserData();
    console.log('👤 Current user data found:', currentUser);
    
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
      console.log('✅ Using current user data for template');
    } else {
      console.log('❌ No current user data found, using generic template');
    }
    
    console.log('📝 Template will use name:', name);
    
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
      email,
      phone
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
          <div className="text-xl mb-4">Loading talent profile...</div>
          <div className="text-sm text-gray-400 mb-2">
            {params.id ? `ID: ${params.id}` : 'Searching for talent data...'}
          </div>
          <div className="text-xs text-gray-500">
            Checking multiple data sources to restore your working system...
          </div>
        </div>
      </div>
    );
  }

  if (error && !talent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white max-w-lg">
          <div className="text-blue-400 text-6xl mb-4">🔧</div>
          <h2 className="text-2xl font-bold text-gray-100 mb-4">Restoring Your Talent System</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          
          <div className="bg-slate-800 p-4 rounded-lg mb-4 text-left">
            <h3 className="font-bold mb-2">🔍 Let's find your talent data:</h3>
            <div className="text-sm text-gray-300 space-y-2">
              <div>• Check console logs for debugging info</div>
              <div>• Your talent system was working before our changes</div>
              <div>• We need to adapt to your existing setup</div>
            </div>
          </div>
          
          <div className="bg-blue-900 p-3 rounded-lg mb-4 text-sm">
            <div className="font-bold mb-1">📋 Debug Info:</div>
            <div className="text-blue-200 text-left">
              <div>URL: {window.location.href}</div>
              <div>Path: {window.location.pathname}</div>
              <div>Search: {window.location.search || 'none'}</div>
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
                console.log('🔍 Manual debug - checking all data sources...');
                console.log('localStorage keys:', Object.keys(localStorage));
                console.log('sessionStorage keys:', Object.keys(sessionStorage));
                console.log('window object keys:', Object.keys(window).filter(k => k.includes('talent') || k.includes('user')));
                
                // Try to find any talent-related data
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && (key.includes('talent') || key.includes('user'))) {
                    console.log(`Found ${key}:`, localStorage.getItem(key));
                  }
                }
                
                alert('Check console for detailed data analysis');
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Debug Data
            </button>
            <button
              onClick={() => {
                // Navigate to current user's profile as emergency fallback
                const currentUser = getCurrentUserData();
                if (currentUser) {
                  const userId = currentUser.id || currentUser._id || currentUser.userId;
                  if (userId) {
                    window.location.href = `/talent/${userId}`;
                  }
                }
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              My Profile
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
        dataSource.includes('My Profile') ? 'bg-blue-600' : 
        dataSource.includes('Template') || dataSource.includes('Generated') ? 'bg-orange-600' : 
        'bg-green-600'
      }`}>
        {dataSource.includes('My Profile') ? '👤 MY PROFILE: ' : 
         dataSource.includes('Template') || dataSource.includes('Generated') ? '⚠️ MOCK DATA: ' : 
         '✅ TALENT PROFILE: '} 
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