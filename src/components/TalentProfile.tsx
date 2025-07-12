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

  useEffect(() => {
    console.log('🔍 TalentProfile useEffect triggered');
    console.log('📝 URL params:', params);
    console.log('🆔 Talent ID from params:', params.id);

    const id = params.id || '1'; // Default to '1' if no ID
    
    console.log('🎯 Loading talent profile for ID:', id);

    // STEP 1: Try to find REAL talent profile data for this ID (ANY talent, not just current user)
    loadRealTalentProfile(id);
  }, [params.id]);

  const loadRealTalentProfile = async (id: string) => {
    console.log('🔍 Searching for REAL talent profile data for ID:', id);
    
    try {
      // STEP 1: Try database/API first (even though it's broken, we should try)
      console.log('📡 Trying API endpoints for real talent data...');
      const apiEndpoints = [
        `/api/talent/${id}`,
        `/api/talents/${id}`,
        `/api/users/${id}`,
        `/api/user/${id}`
      ];

      for (const endpoint of apiEndpoints) {
        try {
          console.log(`🔗 Trying: ${endpoint}`);
          const response = await fetch(endpoint);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Found REAL talent data from API ${endpoint}:`, data);
            
            // Convert API data to talent format
            const realTalent = convertApiDataToTalent(data, id);
            setTalent(realTalent);
            setDataSource(`Real Talent Data (${endpoint})`);
            return; // Found real data, exit
          }
        } catch (err) {
          console.log(`❌ API ${endpoint} failed:`, err);
        }
      }
      
      console.log('❌ No API data found (expected due to database issue)');
      
      // STEP 2: Check localStorage for any stored talent profiles
      console.log('📦 Checking localStorage for real talent profiles...');
      
      // Check for specific talent profile data
      const talentStorageKeys = [
        `talentProfile_${id}`,
        `talent_${id}`,
        `userProfile_${id}`,
        `profile_${id}`
      ];
      
      for (const key of talentStorageKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const talentData = JSON.parse(stored);
            console.log(`✅ Found REAL talent data in localStorage.${key}:`, talentData);
            
            const realTalent = convertStoredDataToTalent(talentData, id);
            setTalent(realTalent);
            setDataSource(`Real Talent Data (localStorage.${key})`);
            return; // Found real data, exit
          } catch (e) {
            console.log(`❌ Error parsing ${key}:`, e);
          }
        }
      }
      
      // STEP 3: Check for general talent profiles storage
      console.log('📋 Checking for talent profiles list...');
      const generalStorageKeys = [
        'talentProfiles',
        'allTalents',
        'talents',
        'userProfiles',
        'profiles'
      ];
      
      for (const key of generalStorageKeys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const profilesData = JSON.parse(stored);
            console.log(`📋 Found profiles data in localStorage.${key}:`, profilesData);
            
            // Look for this specific talent ID in the list
            let targetTalent = null;
            
            if (Array.isArray(profilesData)) {
              targetTalent = profilesData.find(profile => 
                profile.id === id || profile._id === id || profile.userId === id
              );
            } else if (profilesData[id]) {
              targetTalent = profilesData[id];
            }
            
            if (targetTalent) {
              console.log(`✅ Found REAL talent data for ID ${id} in ${key}:`, targetTalent);
              const realTalent = convertStoredDataToTalent(targetTalent, id);
              setTalent(realTalent);
              setDataSource(`Real Talent Data (${key})`);
              return; // Found real data, exit
            }
          } catch (e) {
            console.log(`❌ Error parsing ${key}:`, e);
          }
        }
      }
      
      // STEP 4: Check sessionStorage
      console.log('💾 Checking sessionStorage for talent data...');
      const sessionKeys = [
        `talentProfile_${id}`,
        `currentTalent_${id}`,
        'selectedTalent',
        'viewingTalent'
      ];
      
      for (const key of sessionKeys) {
        const stored = sessionStorage.getItem(key);
        if (stored) {
          try {
            const talentData = JSON.parse(stored);
            if (talentData.id === id || talentData._id === id) {
              console.log(`✅ Found REAL talent data in sessionStorage.${key}:`, talentData);
              const realTalent = convertStoredDataToTalent(talentData, id);
              setTalent(realTalent);
              setDataSource(`Real Talent Data (sessionStorage.${key})`);
              return; // Found real data, exit
            }
          } catch (e) {
            console.log(`❌ Error parsing sessionStorage ${key}:`, e);
          }
        }
      }
      
      // STEP 5: Check if this is the current user's talent profile
      console.log('👤 Checking if this is current user\'s talent profile...');
      const currentUser = getCurrentUserData();
      if (currentUser && (currentUser.id === id || currentUser._id === id)) {
        console.log('✅ This is the current user\'s talent profile - using their data');
        const realTalent = convertUserDataToTalent(currentUser, id);
        setTalent(realTalent);
        setDataSource('Your Real Talent Profile (from user data)');
        return; // Found real data, exit
      }
      
      // STEP 6: No real data found - generate mock data
      console.log('❌ No REAL talent data found for ID:', id);
      console.log('🎭 Generating mock talent data as fallback...');
      generateMockTalentProfile(id);
      
    } catch (error) {
      console.error('❌ Error in loadRealTalentProfile:', error);
      // Fallback to mock data on error
      generateMockTalentProfile(id);
    }
  };

  const convertApiDataToTalent = (apiData: any, id: string): TalentData => {
    const userData = apiData.user || apiData.talent || apiData.data || apiData;
    
    return {
      id: userData.id || userData._id || id,
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Professional Talent',
      title: userData.title || userData.profession || 'Voice Over Artist',
      location: userData.location || userData.city || 'Remote',
      rating: userData.rating || 4.8,
      reviewCount: userData.reviewCount || 0,
      hourlyRate: userData.hourlyRate || '$85-175',
      avatar: userData.avatar || userData.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'Talent')}&size=200&background=7c3aed&color=fff`,
      coverImage: userData.coverImage || `https://picsum.photos/800/300?random=${id}`,
      bio: userData.bio || 'Professional voice talent available for your projects.',
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

  const convertStoredDataToTalent = (storedData: any, id: string): TalentData => {
    return {
      id: storedData.id || storedData._id || id,
      name: storedData.name || `${storedData.firstName || ''} ${storedData.lastName || ''}`.trim() || 'Professional Talent',
      title: storedData.title || storedData.profession || 'Voice Over Artist',
      location: storedData.location || storedData.city || 'Remote',
      rating: storedData.rating || 4.8,
      reviewCount: storedData.reviewCount || 0,
      hourlyRate: storedData.hourlyRate || storedData.rate || '$85-175',
      avatar: storedData.avatar || storedData.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(storedData.name || 'Talent')}&size=200&background=7c3aed&color=fff`,
      coverImage: storedData.coverImage || `https://picsum.photos/800/300?random=${id}`,
      bio: storedData.bio || storedData.description || 'Professional voice talent.',
      skills: storedData.skills || ['Voice Over', 'Narration'],
      languages: storedData.languages || ['English'],
      experience: storedData.experience || '5+ years',
      samples: storedData.samples || storedData.voiceSamples || [],
      reviews: storedData.reviews || [],
      responseTime: storedData.responseTime || '< 2 hours',
      completionRate: storedData.completionRate || '100%',
      totalJobs: storedData.totalJobs || 0
    };
  };

  const convertUserDataToTalent = (userData: any, id: string): TalentData => {
    return {
      id: userData.id || userData._id || id,
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Professional Talent',
      title: userData.talentTitle || userData.profession || 'Voice Over Artist',
      location: userData.location || userData.city || 'Remote',
      rating: userData.rating || 4.9,
      reviewCount: userData.reviewCount || 0,
      hourlyRate: userData.hourlyRate || userData.rate || '$85-175',
      avatar: userData.avatar || userData.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || userData.email || 'You')}&size=200&background=7c3aed&color=fff`,
      coverImage: userData.coverImage || `https://picsum.photos/800/300?random=${id}`,
      bio: userData.talentBio || userData.bio || 'Professional voice talent.',
      skills: userData.talentSkills || userData.skills || ['Voice Over', 'Narration'],
      languages: userData.languages || ['English'],
      experience: userData.experience || '5+ years',
      samples: userData.voiceSamples || userData.samples || [],
      reviews: userData.reviews || [],
      responseTime: userData.responseTime || '< 1 hour',
      completionRate: userData.completionRate || '100%',
      totalJobs: userData.totalJobs || 0
    };
  };

  const generateMockTalentProfile = (id: string) => {
    // Generate different talent data based on ID (ORIGINAL WORKING APPROACH)
    try {
      const talentNames = [
        'Sarah Johnson', 'Michael Chen', 'Emma Rodriguez', 'David Thompson', 'Lisa Parker',
        'James Wilson', 'Maria Garcia', 'Robert Taylor', 'Ashley Brown', 'Christopher Lee',
        'Jennifer Davis', 'Matthew Miller', 'Amanda Wilson', 'Kevin Anderson', 'Rachel Thomas'
      ];
      
      const titles = [
        'Professional Voice Over Artist', 'Commercial Voice Talent', 'Narration Specialist',
        'Character Voice Actor', 'Corporate Voice Talent', 'Animation Voice Artist',
        'Documentary Narrator', 'Radio Voice Professional', 'Audiobook Narrator', 'IVR Specialist',
        'E-Learning Specialist', 'Podcast Host', 'Video Game Voice Actor', 'Promo Voice Artist', 'Singing Voice Talent'
      ];

      const locations = [
        'Los Angeles, CA', 'New York, NY', 'Nashville, TN', 'Atlanta, GA', 'Chicago, IL',
        'Austin, TX', 'Seattle, WA', 'Miami, FL', 'Denver, CO', 'Portland, OR',
        'Boston, MA', 'Dallas, TX', 'Phoenix, AZ', 'San Francisco, CA', 'Orlando, FL'
      ];

      const skillSets = [
        ['Commercial VO', 'Narration', 'Character Voices', 'IVR/Phone Systems'],
        ['Corporate Training', 'E-Learning', 'Commercials', 'Explainer Videos'],
        ['Audiobooks', 'Documentary', 'Podcast Intro', 'Educational Content'],
        ['Animation', 'Video Games', 'Character Voices', 'Cartoon Voice'],
        ['Radio Imaging', 'Commercials', 'Station IDs', 'Promos'],
        ['Medical Narration', 'Technical Training', 'Corporate Videos', 'Web Content'],
        ['Children\'s Content', 'Educational Videos', 'Animation', 'Character Work'],
        ['News Reading', 'Documentary', 'Corporate Presentations', 'Training Videos']
      ];

      const bioTemplates = [
        'Professional voice over artist with {years}+ years of experience specializing in {specialty}. Known for warm and engaging delivery style.',
        'Experienced voice talent with a {style} approach to {specialty}. Dedicated to bringing scripts to life with authenticity.',
        'Versatile voice actor specializing in {specialty} with {years}+ years in the industry. Professional and reliable.',
        'Award-winning voice talent known for {style} delivery in {specialty}. Committed to excellence in every project.',
        'Dynamic voice artist with expertise in {specialty}. {years}+ years of experience with major brands and productions.'
      ];

      // Use ID to consistently generate the same data
      const idNum = parseInt(id) || 1;
      console.log('🔢 ID number:', idNum);
      
      const nameIndex = (idNum - 1) % talentNames.length;
      const titleIndex = (idNum - 1) % titles.length;
      const locationIndex = (idNum - 1) % locations.length;
      const skillIndex = (idNum - 1) % skillSets.length;
      const bioIndex = (idNum - 1) % bioTemplates.length;

      console.log('📊 Indexes - name:', nameIndex, 'title:', titleIndex, 'location:', locationIndex);

      const years = 3 + (idNum % 8);
      const specialty = titles[titleIndex].toLowerCase();
      const styles = ['professional and clear', 'warm and conversational', 'dynamic and energetic', 'sophisticated and trustworthy', 'friendly and approachable'];
      const style = styles[idNum % styles.length];

      const generatedTalent: TalentData = {
        id: id,
        name: talentNames[nameIndex],
        title: titles[titleIndex],
        location: locations[locationIndex],
        rating: 4.2 + (idNum % 8) * 0.1,
        reviewCount: 15 + (idNum * 7) % 100,
        hourlyRate: `${50 + (idNum * 5) % 100}-${100 + (idNum * 10) % 200}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(talentNames[nameIndex])}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
        coverImage: `https://picsum.photos/800/300?random=${idNum}`,
        bio: bioTemplates[bioIndex]
          .replace('{years}', years.toString())
          .replace('{specialty}', specialty)
          .replace('{style}', style),
        skills: skillSets[skillIndex],
        languages: idNum % 3 === 0 ? ['English (Native)', 'Spanish (Conversational)'] : ['English (Native)'],
        experience: `${years}+ years`,
        samples: [
          { id: '1', title: 'Commercial Demo', duration: '0:45', url: '#', category: 'Commercial' },
          { id: '2', title: 'Narration Sample', duration: '1:20', url: '#', category: 'Narration' },
          { id: '3', title: 'Character Voice', duration: '0:30', url: '#', category: 'Character' },
          { id: '4', title: 'Corporate Training', duration: '1:05', url: '#', category: 'Corporate' }
        ],
        reviews: [
          {
            id: '1',
            clientName: 'Production Company LLC',
            rating: 5,
            comment: `Excellent work! ${talentNames[nameIndex]} delivered exactly what we needed with professional quality and quick turnaround.`,
            date: '2024-01-15'
          },
          {
            id: '2',
            clientName: 'Marketing Solutions Inc',
            rating: 5,
            comment: 'Outstanding voice talent. Perfect delivery and great communication throughout the project. Highly recommended!',
            date: '2024-01-10'
          },
          {
            id: '3',
            clientName: 'Corporate Training Co',
            rating: 4,
            comment: 'Professional quality voice work. Easy to work with and delivered on time. Will definitely hire again.',
            date: '2024-01-05'
          }
        ],
        responseTime: ['< 1 hour', '< 2 hours', '< 4 hours', '< 8 hours', '< 24 hours'][idNum % 5],
        completionRate: `${92 + (idNum % 8)}%`,
        totalJobs: 10 + (idNum * 8) % 200
      };

      console.log('✅ Generated mock talent data for', talentNames[nameIndex], ':', generatedTalent);
      setTalent(generatedTalent);
      setDataSource('Generated Mock Data (no real profile found)');
      
    } catch (error) {
      console.error('❌ Error generating talent data:', error);
      
      // Fallback basic talent
      const fallbackTalent: TalentData = {
        id: id,
        name: `Talent ${id}`,
        title: 'Voice Over Artist',
        location: 'Remote',
        rating: 4.5,
        reviewCount: 25,
        hourlyRate: '$75-150',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback',
        coverImage: 'https://picsum.photos/800/300?random=1',
        bio: 'Professional voice over artist available for your projects.',
        skills: ['Voice Over', 'Narration'],
        languages: ['English'],
        experience: '5+ years',
        samples: [
          { id: '1', title: 'Demo Sample', duration: '1:00', url: '#', category: 'Demo' }
        ],
        reviews: [
          {
            id: '1',
            clientName: 'Client',
            rating: 5,
            comment: 'Great work!',
            date: '2024-01-01'
          }
        ],
        responseTime: '< 24 hours',
        completionRate: '95%',
        totalJobs: 50
      };
      
      console.log('🔄 Using fallback talent data:', fallbackTalent);
      setTalent(fallbackTalent);
      setDataSource('Fallback Mock Data (error occurred)');
    }
  };

    // Generate different talent data based on ID (ORIGINAL WORKING APPROACH)
    try {
      const talentNames = [
        'Sarah Johnson', 'Michael Chen', 'Emma Rodriguez', 'David Thompson', 'Lisa Parker',
        'James Wilson', 'Maria Garcia', 'Robert Taylor', 'Ashley Brown', 'Christopher Lee',
        'Jennifer Davis', 'Matthew Miller', 'Amanda Wilson', 'Kevin Anderson', 'Rachel Thomas'
      ];
      
      const titles = [
        'Professional Voice Over Artist', 'Commercial Voice Talent', 'Narration Specialist',
        'Character Voice Actor', 'Corporate Voice Talent', 'Animation Voice Artist',
        'Documentary Narrator', 'Radio Voice Professional', 'Audiobook Narrator', 'IVR Specialist',
        'E-Learning Specialist', 'Podcast Host', 'Video Game Voice Actor', 'Promo Voice Artist', 'Singing Voice Talent'
      ];

      const locations = [
        'Los Angeles, CA', 'New York, NY', 'Nashville, TN', 'Atlanta, GA', 'Chicago, IL',
        'Austin, TX', 'Seattle, WA', 'Miami, FL', 'Denver, CO', 'Portland, OR',
        'Boston, MA', 'Dallas, TX', 'Phoenix, AZ', 'San Francisco, CA', 'Orlando, FL'
      ];

      const skillSets = [
        ['Commercial VO', 'Narration', 'Character Voices', 'IVR/Phone Systems'],
        ['Corporate Training', 'E-Learning', 'Commercials', 'Explainer Videos'],
        ['Audiobooks', 'Documentary', 'Podcast Intro', 'Educational Content'],
        ['Animation', 'Video Games', 'Character Voices', 'Cartoon Voice'],
        ['Radio Imaging', 'Commercials', 'Station IDs', 'Promos'],
        ['Medical Narration', 'Technical Training', 'Corporate Videos', 'Web Content'],
        ['Children\'s Content', 'Educational Videos', 'Animation', 'Character Work'],
        ['News Reading', 'Documentary', 'Corporate Presentations', 'Training Videos']
      ];

      const bioTemplates = [
        'Professional voice over artist with {years}+ years of experience specializing in {specialty}. Known for warm and engaging delivery style.',
        'Experienced voice talent with a {style} approach to {specialty}. Dedicated to bringing scripts to life with authenticity.',
        'Versatile voice actor specializing in {specialty} with {years}+ years in the industry. Professional and reliable.',
        'Award-winning voice talent known for {style} delivery in {specialty}. Committed to excellence in every project.',
        'Dynamic voice artist with expertise in {specialty}. {years}+ years of experience with major brands and productions.'
      ];

      // Use ID to consistently generate the same data
      const idNum = parseInt(id) || 1;
      console.log('🔢 ID number:', idNum);
      
      const nameIndex = (idNum - 1) % talentNames.length;
      const titleIndex = (idNum - 1) % titles.length;
      const locationIndex = (idNum - 1) % locations.length;
      const skillIndex = (idNum - 1) % skillSets.length;
      const bioIndex = (idNum - 1) % bioTemplates.length;

      console.log('📊 Indexes - name:', nameIndex, 'title:', titleIndex, 'location:', locationIndex);

      const years = 3 + (idNum % 8);
      const specialty = titles[titleIndex].toLowerCase();
      const styles = ['professional and clear', 'warm and conversational', 'dynamic and energetic', 'sophisticated and trustworthy', 'friendly and approachable'];
      const style = styles[idNum % styles.length];

      const generatedTalent: TalentData = {
        id: id,
        name: talentNames[nameIndex],
        title: titles[titleIndex],
        location: locations[locationIndex],
        rating: 4.2 + (idNum % 8) * 0.1,
        reviewCount: 15 + (idNum * 7) % 100,
        hourlyRate: `${50 + (idNum * 5) % 100}-${100 + (idNum * 10) % 200}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(talentNames[nameIndex])}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
        coverImage: `https://picsum.photos/800/300?random=${idNum}`,
        bio: bioTemplates[bioIndex]
          .replace('{years}', years.toString())
          .replace('{specialty}', specialty)
          .replace('{style}', style),
        skills: skillSets[skillIndex],
        languages: idNum % 3 === 0 ? ['English (Native)', 'Spanish (Conversational)'] : ['English (Native)'],
        experience: `${years}+ years`,
        samples: [
          { id: '1', title: 'Commercial Demo', duration: '0:45', url: '#', category: 'Commercial' },
          { id: '2', title: 'Narration Sample', duration: '1:20', url: '#', category: 'Narration' },
          { id: '3', title: 'Character Voice', duration: '0:30', url: '#', category: 'Character' },
          { id: '4', title: 'Corporate Training', duration: '1:05', url: '#', category: 'Corporate' }
        ],
        reviews: [
          {
            id: '1',
            clientName: 'Production Company LLC',
            rating: 5,
            comment: `Excellent work! ${talentNames[nameIndex]} delivered exactly what we needed with professional quality and quick turnaround.`,
            date: '2024-01-15'
          },
          {
            id: '2',
            clientName: 'Marketing Solutions Inc',
            rating: 5,
            comment: 'Outstanding voice talent. Perfect delivery and great communication throughout the project. Highly recommended!',
            date: '2024-01-10'
          },
          {
            id: '3',
            clientName: 'Corporate Training Co',
            rating: 4,
            comment: 'Professional quality voice work. Easy to work with and delivered on time. Will definitely hire again.',
            date: '2024-01-05'
          }
        ],
        responseTime: ['< 1 hour', '< 2 hours', '< 4 hours', '< 8 hours', '< 24 hours'][idNum % 5],
        completionRate: `${92 + (idNum % 8)}%`,
        totalJobs: 10 + (idNum * 8) % 200
      };

      console.log('✅ Generated talent data for', talentNames[nameIndex], ':', generatedTalent);
      setTalent(generatedTalent);
      
    } catch (error) {
      console.error('❌ Error generating talent data:', error);
      
      // Fallback basic talent
      const fallbackTalent: TalentData = {
        id: id,
        name: `Talent ${id}`,
        title: 'Voice Over Artist',
        location: 'Remote',
        rating: 4.5,
        reviewCount: 25,
        hourlyRate: '$75-150',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback',
        coverImage: 'https://picsum.photos/800/300?random=1',
        bio: 'Professional voice over artist available for your projects.',
        skills: ['Voice Over', 'Narration'],
        languages: ['English'],
        experience: '5+ years',
        samples: [
          { id: '1', title: 'Demo Sample', duration: '1:00', url: '#', category: 'Demo' }
        ],
        reviews: [
          {
            id: '1',
            clientName: 'Client',
            rating: 5,
            comment: 'Great work!',
            date: '2024-01-01'
          }
        ],
        responseTime: '< 24 hours',
        completionRate: '95%',
        totalJobs: 50
      };
      
      console.log('🔄 Using fallback talent data:', fallbackTalent);
      setTalent(fallbackTalent);
    }
  }, [params.id]);

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

  if (!talent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-xl mb-4">Loading talent profile...</div>
          <div className="text-sm text-gray-400 mb-2">Talent ID: {params.id || 'undefined'}</div>
          <div className="text-xs text-gray-500 mb-4">
            Checking for real talent data in multiple sources...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Debug Info Banner */}
      <div className={`text-white p-2 text-center text-sm ${
        dataSource.includes('Real Talent Data') || dataSource.includes('Your Real Talent Profile') ? 'bg-green-600' : 'bg-orange-600'
      }`}>
        {dataSource.includes('Real Talent Data') || dataSource.includes('Your Real Talent Profile') ? 
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
                <div className="text-sm text-gray-400 mb-4">
                  Talent ID: {talent.id}
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
        <div className="font-bold mb-2">🔍 Data Source Analysis:</div>
        <div>Talent ID: {talent.id}</div>
        <div>Name: {talent.name}</div>
        <div>Source: {dataSource}</div>
        
        {(dataSource.includes('Real Talent Data') || dataSource.includes('Your Real Talent Profile')) ? (
          <div className="mt-2 p-2 bg-green-800 rounded text-xs">
            ✅ REAL TALENT PROFILE - Actual data from storage/database
          </div>
        ) : (
          <div className="mt-2 p-2 bg-orange-800 rounded text-xs">
            ⚠️ MOCK PROFILE - No real data found for this talent ID
          </div>
        )}
        
        <div className="mt-2 text-gray-400 text-xs">
          System checks:
          <br />
          • API endpoints (broken DB)
          <br />
          • localStorage talent data
          <br />
          • sessionStorage
          <br />
          • User profile data
          <br />
          • Generates mock if none found
        </div>
      </div>
    </div>
  );
};

export default TalentProfile;