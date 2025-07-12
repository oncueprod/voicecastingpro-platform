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
    
    console.log('🎯 Using talent ID:', id);

    // FIRST: Check if this is the current user's own talent profile
    const currentUser = getCurrentUserData();
    const currentUserId = currentUser?.id || currentUser?._id;
    
    console.log('👤 Current user ID:', currentUserId);
    console.log('🤔 Is this the user\'s own talent profile?', id === currentUserId);

    // If this is the current user's talent profile, load their REAL data
    if (currentUser && id === currentUserId) {
      console.log('✅ Loading YOUR real talent profile data...');
      
      try {
        // Try to get real talent profile data from various sources
        let realTalentData = null;
        
        // Check for stored talent profile data
        const talentProfileSources = [
          'talentProfile',
          'userTalentProfile', 
          'myTalentProfile',
          'talentData'
        ];
        
        for (const source of talentProfileSources) {
          const stored = localStorage.getItem(source);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.id === id || parsed._id === id) {
                realTalentData = parsed;
                console.log(`✅ Found real talent data in localStorage.${source}:`, parsed);
                break;
              }
            } catch (e) {
              console.log(`❌ Error parsing ${source}:`, e);
            }
          }
        }
        
        // If no dedicated talent profile found, create one from user data
        if (!realTalentData && currentUser) {
          console.log('🔄 Creating real talent profile from user data...');
          realTalentData = {
            id: currentUser.id || currentUser._id,
            name: currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
            title: currentUser.talentTitle || currentUser.profession || 'Professional Voice Talent',
            location: currentUser.location || currentUser.city || 'Remote',
            bio: currentUser.talentBio || currentUser.bio || 'Professional voice talent ready to bring your projects to life.',
            skills: currentUser.talentSkills || currentUser.skills || ['Voice Over', 'Narration'],
            experience: currentUser.experience || '5+ years',
            hourlyRate: currentUser.hourlyRate || currentUser.rate || '$85-175',
            email: currentUser.email,
            phone: currentUser.phone,
            // Add any other talent-specific fields from user data
            languages: currentUser.languages || ['English'],
            samples: currentUser.voiceSamples || currentUser.samples || [],
            portfolio: currentUser.portfolio || []
          };
        }
        
        if (realTalentData) {
          console.log('✅ Using REAL talent profile data:', realTalentData);
          
          // Convert to the expected TalentData format
          const convertedTalent: TalentData = {
            id: realTalentData.id || realTalentData._id || id,
            name: realTalentData.name || 'Your Name',
            title: realTalentData.title || 'Professional Voice Talent',
            location: realTalentData.location || 'Remote',
            rating: realTalentData.rating || 4.9,
            reviewCount: realTalentData.reviewCount || 0,
            hourlyRate: realTalentData.hourlyRate || '$85-175',
            avatar: realTalentData.avatar || realTalentData.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(realTalentData.name || 'You')}&size=200&background=7c3aed&color=fff`,
            coverImage: realTalentData.coverImage || `https://picsum.photos/800/300?random=${id}&blur=1`,
            bio: realTalentData.bio || 'Professional voice talent with expertise in various voice-over projects.',
            skills: realTalentData.skills || ['Voice Over', 'Narration'],
            languages: realTalentData.languages || ['English'],
            experience: realTalentData.experience || '5+ years',
            samples: (realTalentData.samples || realTalentData.voiceSamples || []).map((sample: any, index: number) => ({
              id: sample.id || `sample_${index}`,
              title: sample.title || sample.name || `Sample ${index + 1}`,
              duration: sample.duration || '1:00',
              url: sample.url || sample.audioUrl || '#',
              category: sample.category || sample.type || 'Demo'
            })),
            reviews: realTalentData.reviews || [],
            responseTime: realTalentData.responseTime || '< 2 hours',
            completionRate: realTalentData.completionRate || '100%',
            totalJobs: realTalentData.totalJobs || realTalentData.completedProjects || 0
          };
          
          setTalent(convertedTalent);
          return; // Exit early - we found real data
        }
        
      } catch (error) {
        console.error('❌ Error loading real talent data:', error);
      }
    }

    // For OTHER talents OR if no real talent data found, generate mock data
    console.log('🎭 Generating talent data for ID:', id);

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
        getCurrentUserData()?.id === talent.id || getCurrentUserData()?._id === talent.id ? 'bg-purple-600' : 'bg-green-600'
      }`}>
        {getCurrentUserData()?.id === talent.id || getCurrentUserData()?._id === talent.id ? 
          '🎭 YOUR REAL TALENT PROFILE: ' : 
          '✅ TALENT PROFILE: '} 
        {talent.name} (ID: {talent.id}) | 
        {getCurrentUserData()?.id === talent.id || getCurrentUserData()?._id === talent.id ? 
          'Real Data Loaded' : 'Generated Data'}
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
        <div className="font-bold mb-2">🔍 System Status:</div>
        <div>Talent ID: {talent.id}</div>
        <div>Name: {talent.name}</div>
        
        {getCurrentUserData()?.id === talent.id || getCurrentUserData()?._id === talent.id ? (
          <div className="mt-2 p-2 bg-purple-800 rounded text-xs">
            🎭 YOUR REAL TALENT PROFILE - Real data loaded!
          </div>
        ) : (
          <div className="mt-2 p-2 bg-green-800 rounded text-xs">
            ✅ Other talent - Generated data (working!)
          </div>
        )}
        
        <div className="mt-2 text-gray-400 text-xs">
          • YOUR profile = Real data from localStorage
          <br />
          • Other profiles = Generated unique data
        </div>
      </div>
    </div>
  );
};

export default TalentProfile;