// TalentDirectory.tsx - REAL TALENTS ONLY - NO MOCK DATA - FIXED NAVIGATION
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, MapPin, Star, MessageCircle, Award, Users, Sliders } from 'lucide-react';
import { talentService, TalentProfile } from '../services/talentService';

interface TalentDirectoryProps {
  searchQuery?: string;
  onTalentSelect: (talentId: string) => void;
  onBack: () => void;
  onJoinAsTalent: () => void;
}

const TalentDirectory: React.FC<TalentDirectoryProps> = ({ 
  searchQuery: initialSearchQuery = '', 
  onTalentSelect, 
  onBack,
  onJoinAsTalent
}) => {
  const [allTalents, setAllTalents] = useState<TalentProfile[]>([]);
  const [filteredTalents, setFilteredTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('name'); // name, rating, reviews, recent

  useEffect(() => {
    loadTalents();
  }, []);

  useEffect(() => {
    // Apply filters and search whenever dependencies change
    applyFiltersAndSearch();
  }, [allTalents, searchQuery, selectedSkills, selectedLocation, minRating, sortBy]);

  const loadTalents = async () => {
    try {
      console.log('🔍 Loading ALL real talents...');
      setLoading(true);
      
      // Get ONLY real talent profiles
      const realTalents = talentService.getAllTalentProfiles();
      console.log(`✅ Found ${realTalents.length} REAL talents in directory`);
      
      setAllTalents(realTalents);
    } catch (error) {
      console.error('Error loading talents:', error);
      setAllTalents([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle join as talent navigation - FIXED FOR CUSTOM ROUTING
  const handleJoinAsTalent = () => {
    console.log('🚀 Join as Talent button clicked!');
    console.log('✅ Using custom navigation system');
    onJoinAsTalent(); // Use the prop function instead of navigate
  };

  const handleViewProfile = (talentId: string) => {
    console.log(`🔗 Navigating to REAL talent profile: ${talentId}`);
    onTalentSelect(talentId); // Use the prop function
  };

  const handleContactTalent = (talentId: string) => {
    console.log(`💬 Opening contact for REAL talent: ${talentId}`);
    // For now, we'll need to add a prop for this or handle it differently
    // You might want to add onContactTalent prop to handle messaging
    alert(`Contact feature - Talent ID: ${talentId}`);
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...allTalents];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(talent =>
        talent.name.toLowerCase().includes(query) ||
        talent.title.toLowerCase().includes(query) ||
        talent.bio.toLowerCase().includes(query) ||
        talent.skills.some(skill => skill.toLowerCase().includes(query)) ||
        talent.location.toLowerCase().includes(query)
      );
    }

    // Apply skill filter
    if (selectedSkills.length > 0) {
      filtered = filtered.filter(talent =>
        selectedSkills.some(skill =>
          talent.skills.some(talentSkill =>
            talentSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }

    // Apply location filter
    if (selectedLocation) {
      filtered = filtered.filter(talent =>
        talent.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Apply rating filter
    if (minRating > 0) {
      filtered = filtered.filter(talent => (talent.rating || 0) >= minRating);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'reviews':
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredTalents(filtered);
  };

  // Get available skills from all talents
  const availableSkills = useMemo(() => {
    const skills = new Set<string>();
    allTalents.forEach(talent => {
      talent.skills.forEach(skill => skills.add(skill));
    });
    return Array.from(skills).sort();
  }, [allTalents]);

  // Get available locations from all talents
  const availableLocations = useMemo(() => {
    const locations = new Set<string>();
    allTalents.forEach(talent => {
      if (talent.location) {
        locations.add(talent.location);
      }
    });
    return Array.from(locations).sort();
  }, [allTalents]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSkills([]);
    setSelectedLocation('');
    setMinRating(0);
    setSortBy('name');
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">Voice Talent Directory</h1>
            <p className="text-gray-300 mt-2">Loading real talent profiles...</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-slate-800 rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="h-32 bg-slate-700"></div>
                <div className="p-4">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-700 rounded w-1/2 mb-3"></div>
                  <div className="h-12 bg-slate-700 rounded mb-3"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-slate-700 rounded flex-1"></div>
                    <div className="h-8 bg-slate-700 rounded flex-1"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Voice Talent Directory</h1>
          <p className="text-gray-300 mb-4">
            Find the perfect voice talent for your project
          </p>
          <div className="flex items-center justify-center space-x-2 text-green-400">
            <Award className="w-5 h-5" />
            <span className="font-semibold">
              {allTalents.length} Verified Real Talent{allTalents.length !== 1 ? 's' : ''} Available
            </span>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-slate-800 rounded-lg shadow-md p-6 mb-8 border border-slate-700">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, skills, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-700 text-white"
            >
              <Sliders className="w-5 h-5" />
              <span>Filters</span>
              {(selectedSkills.length > 0 || selectedLocation || minRating > 0) && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {selectedSkills.length + (selectedLocation ? 1 : 0) + (minRating > 0 ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
            >
              <option value="name">Sort by Name</option>
              <option value="rating">Sort by Rating</option>
              <option value="reviews">Sort by Reviews</option>
              <option value="recent">Sort by Recent</option>
            </select>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-slate-600 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Skills Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Skills</label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableSkills.map((skill) => (
                    <label key={skill} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(skill)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSkills([...selectedSkills, skill]);
                          } else {
                            setSelectedSkills(selectedSkills.filter(s => s !== skill));
                          }
                        }}
                        className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-700"
                      />
                      <span className="ml-2 text-sm text-gray-300">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">All Locations</option>
                  {availableLocations.map((location) => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value={0}>Any Rating</option>
                  <option value={4}>4+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                  <option value={5}>5 Stars</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="md:col-span-3 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-6 text-center">
          <p className="text-gray-300">
            Showing {filteredTalents.length} of {allTalents.length} real talents
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        </div>

        {/* No Results */}
        {allTalents.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-24 h-24 text-gray-500 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-4">No Real Talents Yet</h3>
            <p className="text-gray-300 mb-8 max-w-md mx-auto">
              Be the first to join our platform as a voice talent and start getting hired for projects!
            </p>
            <button
              onClick={handleJoinAsTalent}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold"
            >
              Join as Talent
            </button>
          </div>
        ) : filteredTalents.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Talents Match Your Filters</h3>
            <p className="text-gray-300 mb-6">Try adjusting your search criteria</p>
            <button
              onClick={clearFilters}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          /* Talent Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTalents.map((talent) => (
              <div key={talent.id} className="bg-slate-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl border border-slate-700 transition-all duration-300 hover:border-slate-600">
                {/* Header */}
                <div className="relative h-32 bg-gradient-to-br from-blue-600 to-indigo-600">
                  {talent.coverImage ? (
                    <img
                      src={talent.coverImage}
                      alt={`${talent.name} cover`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600"></div>
                  )}
                  
                  {/* Avatar */}
                  <div className="absolute -bottom-6 left-4">
                    <img
                      src={talent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(talent.name)}&size=60&background=3b82f6&color=fff`}
                      alt={talent.name}
                      className="w-12 h-12 rounded-full border-4 border-slate-800 shadow-lg"
                    />
                  </div>

                  {/* Verified Badge */}
                  <div className="absolute top-2 right-2">
                    <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                      <Award className="w-3 h-3" />
                      <span>Real</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 pt-8">
                  <div className="mb-3">
                    <h3 className="text-lg font-bold text-white mb-1">{talent.name}</h3>
                    <p className="text-gray-300 text-sm mb-2">{talent.title}</p>
                    
                    {talent.location && (
                      <div className="flex items-center text-gray-400 text-sm mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        {talent.location}
                      </div>
                    )}

                    {/* Rating */}
                    {talent.rating && talent.rating > 0 && (
                      <div className="flex items-center mb-2">
                        <div className="flex items-center mr-2">
                          {renderStars(talent.rating)}
                        </div>
                        <span className="text-sm text-gray-400">
                          {talent.rating.toFixed(1)} ({talent.reviewCount || 0})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <p className="text-gray-300 text-sm line-clamp-3 mb-3">
                    {talent.bio}
                  </p>

                  {/* Skills */}
                  {talent.skills && talent.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {talent.skills.slice(0, 2).map((skill, index) => (
                        <span
                          key={index}
                          className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded text-xs border border-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                      {talent.skills.length > 2 && (
                        <span className="bg-slate-700 text-gray-300 px-2 py-1 rounded text-xs border border-slate-600">
                          +{talent.skills.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewProfile(talent.id)}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm font-semibold"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleContactTalent(talent.id)}
                      className="flex-1 bg-slate-700 text-gray-300 py-2 px-3 rounded-lg hover:bg-slate-600 transition-colors text-sm font-semibold flex items-center justify-center border border-slate-600"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Contact
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Notice */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 bg-green-900/30 text-green-400 px-6 py-3 rounded-full border border-green-800">
            <Award className="w-5 h-5" />
            <span className="font-semibold">All talent profiles are verified real users</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentDirectory;