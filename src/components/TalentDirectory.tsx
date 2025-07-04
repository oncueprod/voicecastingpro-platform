import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Star, MapPin, Clock, Play, Pause, SlidersHorizontal, ArrowLeft, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { talentService } from '../services/talentService';

interface TalentDirectoryProps {
  searchQuery?: string;
  onTalentSelect?: (talentId: string) => void;
  onBack?: () => void;
}

const TalentDirectory: React.FC<TalentDirectoryProps> = ({ searchQuery = '', onTalentSelect, onBack }) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const { user } = useAuth();
  const [talents, setTalents] = useState<any[]>([]);
  const [userTalentAdded, setUserTalentAdded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Load talent profiles
  useEffect(() => {
    // Get talent profiles from service
    const talentProfiles = talentService.getAllTalentProfiles();
    
    // Filter out duplicates by ID using Map
    const uniqueProfiles = Array.from(
      new Map(talentProfiles.map(profile => [profile.id, profile])).values()
    );
    
    setTalents(uniqueProfiles);
  }, []);

  // Check for search query from Services component
  useEffect(() => {
    const serviceSearchQuery = sessionStorage.getItem('talent_search_query');
    if (serviceSearchQuery) {
      setLocalSearchQuery(serviceSearchQuery);
      // Map service search queries to categories
      const categoryMap: Record<string, string> = {
        'commercial': 'commercial',
        'audiobook': 'audiobook',
        'gaming': 'gaming',
        'podcast': 'commercial', // Podcast falls under commercial
        'ivr': 'elearning', // IVR falls under e-learning
        'multilingual': 'all' // Show all for multilingual
      };
      setSelectedCategory(categoryMap[serviceSearchQuery] || 'all');
      // Clear the session storage
      sessionStorage.removeItem('talent_search_query');
    }
  }, []);

  // Check if any filters are active
  useEffect(() => {
    setHasActiveFilters(
      localSearchQuery !== '' || 
      selectedCategory !== 'all' || 
      selectedLanguage !== 'all'
    );
  }, [localSearchQuery, selectedCategory, selectedLanguage]);

  // Add user's talent profile if they are a talent
  useEffect(() => {
    if (user && user.type === 'talent' && !userTalentAdded) {
      const savedProfile = localStorage.getItem('talent_profile');
      if (savedProfile) {
        try {
          const profileData = JSON.parse(savedProfile);
          
          // Check if user's profile already exists in talent service
          const existingProfile = talents.find(t => t.userId === user.id);
          
          if (!existingProfile) {
            // Create a new talent profile based on user data
            const newProfile = {
              id: `talent_user_${user.id}`,
              userId: user.id,
              name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || user.name,
              title: profileData.specialties || 'Voice Talent',
              location: 'Location not specified',
              rating: 5.0,
              reviews: 0,
              responseTime: '1 hour',
              priceRange: profileData.hourlyRate || '$50-100',
              image: profileData.profilePhoto || user.avatar || 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
              specialties: profileData.specialties ? profileData.specialties.split(',').map((s: string) => s.trim()) : ['Commercial', 'Narration'],
              languages: profileData.languages ? profileData.languages.split(',').map((l: string) => l.trim()) : ['English'],
              badge: 'New Talent',
              bio: profileData.bio || 'Professional voice talent',
              experience: profileData.yearsExperience || '1+ years',
              completedProjects: 0,
              repeatClients: 0,
              equipment: ['Professional Equipment'],
              demos: [],
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            // Add to talent service
            talentService.updateTalentProfile(newProfile.id, newProfile);
            
            // Update local state - but ensure we don't add duplicates
            setTalents(prev => {
              if (!prev.some(p => p.id === newProfile.id)) {
                return [...prev, newProfile];
              }
              return prev;
            });
            
            setUserTalentAdded(true);
          }
        } catch (error) {
          console.error('Failed to parse saved profile:', error);
        }
      }
    }
  }, [user, talents, userTalentAdded]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'audiobook', label: 'Audiobook' },
    { value: 'gaming', label: 'Video Games' },
    { value: 'documentary', label: 'Documentary' },
    { value: 'elearning', label: 'E-Learning' },
  ];

  const languages = [
    { value: 'all', label: 'All Languages' },
    { value: 'english-us', label: 'English (US)' },
    { value: 'english-uk', label: 'English (UK)' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' },
  ];

  const filteredTalents = talents.filter(talent => {
    const matchesSearch = localSearchQuery === '' || 
                         talent.name.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
                         talent.title.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
                         talent.specialties.some((s: string) => s.toLowerCase().includes(localSearchQuery.toLowerCase())) ||
                         talent.languages.some((l: string) => l.toLowerCase().includes(localSearchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || talent.specialties.some((s: string) => s.toLowerCase().includes(selectedCategory.toLowerCase()));
    const matchesLanguage = selectedLanguage === 'all' || 
                           talent.languages.some((lang: string) => lang.toLowerCase().includes(selectedLanguage.replace('-', ' ')));
    
    return matchesSearch && matchesCategory && matchesLanguage;
  });

  const handlePlayPause = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    
    // Clear any existing timer
    if (audioTimerRef.current) {
      clearTimeout(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    
    if (playingIndex === index) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingIndex(null);
    } else {
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      // Create new audio element
      const audio = new Audio();
      
      // Set up event listeners
      audio.addEventListener('ended', () => {
        setPlayingIndex(null);
      });
      
      // In a real app, this would play an actual demo file
      // For demo purposes, we'll use a silent audio file
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      
      // Set volume and play
      audio.volume = 0.8;
      audio.play().catch(err => console.error('Error playing audio:', err));
      
      // Store reference and update state
      audioRef.current = audio;
      setPlayingIndex(index);
      
      // Auto-stop after 30 seconds for demo purposes
      audioTimerRef.current = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setPlayingIndex(null);
        audioTimerRef.current = null;
      }, 30000);
    }
  };

  const handleTalentClick = (talentId: string) => {
    // Stop any playing audio before navigating
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingIndex(null);
    }
    
    // Clear any existing timer
    if (audioTimerRef.current) {
      clearTimeout(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    
    // Scroll to top before navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Small delay to ensure scroll completes before navigation
    setTimeout(() => {
      onTalentSelect?.(talentId);
    }, 100);
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      // Navigate to home page
      window.location.href = '/';
    }
  };

  const clearFilters = () => {
    setLocalSearchQuery('');
    setSelectedCategory('all');
    setSelectedLanguage('all');
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      if (audioTimerRef.current) {
        clearTimeout(audioTimerRef.current);
      }
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.button
          onClick={handleBackClick}
          className="flex items-center space-x-2 text-white/80 hover:text-white mb-8 transition-colors"
          whileHover={{ x: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </motion.button>

        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Voice Talent Directory
          </h1>
          <p className="text-lg text-gray-300">
            Discover and connect with professional voice artists from around the world
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div 
          className="bg-slate-800 rounded-xl shadow-lg border border-gray-700 p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name, specialty, or voice type..."
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              />
              {localSearchQuery && (
                <button 
                  onClick={() => setLocalSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center space-x-2 px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg hover:border-blue-500 transition-colors"
            >
              <SlidersHorizontal className="h-5 w-5 text-gray-400" />
              <span className="text-gray-300">Filters</span>
            </button>
          </div>

          {/* Filters */}
          <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-4 ${showFilters ? 'block' : 'hidden lg:grid'}`}>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              >
                {languages.map(language => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              {hasActiveFilters ? (
                <motion.button 
                  onClick={clearFilters}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all font-medium flex items-center justify-center space-x-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="h-4 w-4" />
                  <span>Clear All Filters</span>
                </motion.button>
              ) : (
                <motion.button 
                  onClick={() => {
                    // Apply filters logic here
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Apply Filters
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <motion.div 
            className="mb-6 flex flex-wrap gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {localSearchQuery && (
              <div className="bg-blue-600/30 text-blue-300 text-sm px-3 py-1 rounded-full border border-blue-600/50 flex items-center">
                <span className="mr-2">Search: {localSearchQuery}</span>
                <button 
                  onClick={() => setLocalSearchQuery('')}
                  className="text-blue-300 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {selectedCategory !== 'all' && (
              <div className="bg-indigo-600/30 text-indigo-300 text-sm px-3 py-1 rounded-full border border-indigo-600/50 flex items-center">
                <span className="mr-2">Category: {categories.find(c => c.value === selectedCategory)?.label}</span>
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className="text-indigo-300 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {selectedLanguage !== 'all' && (
              <div className="bg-purple-600/30 text-purple-300 text-sm px-3 py-1 rounded-full border border-purple-600/50 flex items-center">
                <span className="mr-2">Language: {languages.find(l => l.value === selectedLanguage)?.label}</span>
                <button 
                  onClick={() => setSelectedLanguage('all')}
                  className="text-purple-300 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            <button 
              onClick={clearFilters}
              className="bg-slate-700 text-gray-300 text-sm px-3 py-1 rounded-full border border-gray-600 hover:bg-slate-600 transition-colors flex items-center"
            >
              <span className="mr-2">Clear All</span>
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}

        {/* Results count */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="text-gray-400">
            Showing {filteredTalents.length} voice {filteredTalents.length === 1 ? 'artist' : 'artists'}
            {localSearchQuery && ` for "${localSearchQuery}"`}
          </p>
        </motion.div>

        {/* Talent Grid */}
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredTalents.map((talent, index) => (
            <motion.div
              key={talent.id}
              className="bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group hover:-translate-y-1 border border-gray-700 hover:border-blue-600 cursor-pointer"
              variants={itemVariants}
              onClick={() => handleTalentClick(talent.id)}
            >
              {/* Header with image and badge */}
              <div className="relative">
                <img
                  src={talent.image}
                  alt={talent.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {talent.badge}
                  </span>
                </div>
              </div>

              <div className="p-6">
                {/* Name and title */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {talent.name}
                  </h3>
                  <p className="text-gray-400">{talent.title}</p>
                </div>

                {/* Rating and location */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-white">{talent.rating}</span>
                    <span className="text-gray-500 text-sm">({talent.reviews})</span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-500 text-sm">
                    <MapPin className="h-4 w-4" />
                    <span>{talent.location}</span>
                  </div>
                </div>

                {/* Audio player */}
                <div className="bg-slate-700 rounded-lg p-4 mb-4 border border-gray-600">
                  <div className="flex items-center space-x-3">
                    <motion.button
                      onClick={(e) => handlePlayPause(index, e)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-full hover:shadow-lg hover:shadow-blue-600/20 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {playingIndex === index ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </motion.button>
                    <div className="flex-1">
                      <div className={`flex items-center space-x-1 ${playingIndex === index ? 'playing' : ''}`}>
                        {[...Array(12)].map((_, i) => (
                          <div
                            key={i}
                            className={`waveform-bar ${
                              playingIndex === index ? 'bg-blue-500' : 'bg-gray-600'
                            }`}
                            style={{
                              width: '3px',
                              height: `${Math.random() * 20 + 8}px`,
                              animationDelay: `${i * 0.05}s`
                            }}
                          ></div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Voice Demo - 0:30</div>
                    </div>
                  </div>
                </div>

                {/* Specialties */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {talent.specialties.slice(0, 3).map((specialty: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-blue-900/50 text-blue-400 text-xs font-medium px-2 py-1 rounded-full border border-blue-800/50"
                      >
                        {specialty}
                      </span>
                    ))}
                    {talent.specialties.length > 3 && (
                      <span className="bg-slate-700 text-gray-400 text-xs font-medium px-2 py-1 rounded-full">
                        +{talent.specialties.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Languages */}
                <div className="mb-4">
                  <div className="text-sm text-gray-400">
                    Languages: {talent.languages.join(', ')}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between mb-6 text-sm">
                  <div className="flex items-center space-x-1 text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>{talent.responseTime}</span>
                  </div>
                  <div className="font-semibold text-white">
                    {talent.priceRange}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <motion.button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTalentClick(talent.id);
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    View Profile
                  </motion.button>
                  <motion.button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTalentClick(talent.id);
                    }}
                    className="w-full border border-gray-600 text-gray-300 py-2 rounded-lg hover:border-blue-600 hover:text-blue-400 transition-colors font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Contact Artist
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Load More */}
        {filteredTalents.length > 0 && (
          <motion.div 
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.6 }}
          >
            <motion.button 
              className="bg-slate-800 border border-gray-700 text-gray-300 px-8 py-4 rounded-xl hover:border-blue-600 hover:text-blue-400 transition-colors font-semibold text-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Load More Voice Artists
            </motion.button>
          </motion.div>
        )}

        {/* No results */}
        {filteredTalents.length === 0 && (
          <motion.div 
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-slate-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <Search className="h-12 w-12 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No voice artists found
            </h3>
            <p className="text-gray-400 mb-6">
              Try adjusting your search criteria or browse all available talent.
            </p>
            <motion.button 
              onClick={clearFilters}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Clear Filters
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TalentDirectory;