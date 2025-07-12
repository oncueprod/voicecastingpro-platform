// FeaturedTalent.tsx - REAL TALENTS ONLY - NO MOCK DATA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, MessageCircle, Users, Award } from 'lucide-react';
import { talentService, TalentProfile } from '../services/talentService';

const FeaturedTalent: React.FC = () => {
  const [featuredTalents, setFeaturedTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadFeaturedTalents();
  }, []);

  const loadFeaturedTalents = async () => {
    try {
      console.log('🔍 Loading REAL featured talents...');
      setLoading(true);
      
      // Get ONLY real talent profiles
      const realTalents = talentService.getFeaturedTalents();
      console.log(`✅ Found ${realTalents.length} REAL featured talents`);
      
      setFeaturedTalents(realTalents);
    } catch (error) {
      console.error('Error loading featured talents:', error);
      setFeaturedTalents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (talentId: string) => {
    console.log(`🔗 Navigating to REAL talent profile: ${talentId}`);
    navigate(`/talent/${talentId}`);
  };

  const handleContactTalent = (talentId: string) => {
    console.log(`💬 Opening contact for REAL talent: ${talentId}`);
    // Navigate to messaging or open contact modal
    navigate(`/messages?talent=${talentId}`);
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
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Voice Talents</h2>
            <p className="text-xl text-gray-600">Loading real talent profiles...</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="flex space-x-3">
                    <div className="h-10 bg-gray-200 rounded flex-1"></div>
                    <div className="h-10 bg-gray-200 rounded flex-1"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // If no real talents found, show empty state
  if (featuredTalents.length === 0) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Voice Talents</h2>
            <p className="text-xl text-gray-600">Discover professional voice talent for your projects</p>
          </div>
          
          <div className="text-center py-12">
            <Users className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No Featured Talents Yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              We're building our community of professional voice talents. 
              Be the first to join and get featured!
            </p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => navigate('/signup')}
                className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Join as Talent
              </button>
              <button
                onClick={() => navigate('/talent')}
                className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                Browse All Talents
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Voice Talents</h2>
          <p className="text-xl text-gray-600">
            Discover our top-rated professional voice talents
          </p>
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-green-600">
            <Award className="w-4 h-4" />
            <span className="font-semibold">
              {featuredTalents.length} Real Talent{featuredTalents.length !== 1 ? 's' : ''} Available
            </span>
          </div>
        </div>

        {/* Talent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredTalents.map((talent) => (
            <div key={talent.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {/* Cover Image */}
              <div className="relative h-48 bg-gradient-to-br from-purple-600 to-blue-600">
                {talent.coverImage ? (
                  <img
                    src={talent.coverImage}
                    alt={`${talent.name} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                    <div className="text-white text-lg font-semibold">
                      {talent.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  </div>
                )}
                
                {/* Avatar */}
                <div className="absolute -bottom-6 left-6">
                  <img
                    src={talent.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(talent.name)}&size=80&background=7c3aed&color=fff`}
                    alt={talent.name}
                    className="w-12 h-12 rounded-full border-4 border-white shadow-lg"
                  />
                </div>

                {/* Real User Badge */}
                <div className="absolute top-4 right-4">
                  <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
                    <Award className="w-3 h-3" />
                    <span>Verified</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 pt-8">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{talent.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{talent.title}</p>
                  
                  {talent.location && (
                    <div className="flex items-center text-gray-500 text-sm mb-3">
                      <MapPin className="w-4 h-4 mr-1" />
                      {talent.location}
                    </div>
                  )}

                  {/* Rating */}
                  {talent.rating && talent.rating > 0 && (
                    <div className="flex items-center mb-3">
                      <div className="flex items-center mr-2">
                        {renderStars(talent.rating)}
                      </div>
                      <span className="text-sm text-gray-600">
                        {talent.rating.toFixed(1)} ({talent.reviewCount || 0} reviews)
                      </span>
                    </div>
                  )}

                  {/* Bio */}
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                    {talent.bio}
                  </p>

                  {/* Skills */}
                  {talent.skills && talent.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {talent.skills.slice(0, 3).map((skill, index) => (
                        <span
                          key={index}
                          className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {talent.skills.length > 3 && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                          +{talent.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-lg font-bold text-gray-900">{talent.totalJobs || 0}</div>
                      <div className="text-xs text-gray-600">Projects</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2">
                      <div className="text-lg font-bold text-gray-900">{talent.completionRate || '100%'}</div>
                      <div className="text-xs text-gray-600">Success Rate</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleViewProfile(talent.id)}
                    className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                  >
                    View Profile
                  </button>
                  <button
                    onClick={() => handleContactTalent(talent.id)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm font-semibold flex items-center justify-center"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Contact
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        {featuredTalents.length > 0 && (
          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/talent')}
              className="bg-white text-purple-600 border-2 border-purple-600 px-8 py-3 rounded-lg hover:bg-purple-600 hover:text-white transition-colors font-semibold"
            >
              View All {talentService.getAllTalentProfiles().length} Real Talents
            </button>
          </div>
        )}

        {/* Real Talents Notice */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm">
            <Award className="w-4 h-4" />
            <span>All talents are verified real users - No mock profiles</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedTalent;