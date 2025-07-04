import React, { useState, useEffect } from 'react';
import { Play, Pause, Star, MapPin, Clock, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { talentService } from '../services/talentService';

interface FeaturedTalentProps {
  onTalentSelect?: (talentId: string) => void;
}

const FeaturedTalent: React.FC<FeaturedTalentProps> = ({ onTalentSelect }) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [talents, setTalents] = useState<any[]>([]);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioTimer, setAudioTimer] = useState<NodeJS.Timeout | null>(null);

  // Load talent profiles from service
  useEffect(() => {
    const loadTalents = () => {
      // Get talent profiles from service
      const allTalents = talentService.getAllTalentProfiles();
      
      // Take only the first 3 profiles or fewer if less are available
      const featuredTalents = allTalents.slice(0, 3);
      setTalents(featuredTalents);
    };
    
    loadTalents();
    
    // Listen for storage changes to update talent list if profiles are deleted
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'talent_profiles') {
        loadTalents();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handlePlayPause = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    
    // Clear any existing timer
    if (audioTimer) {
      clearTimeout(audioTimer);
      setAudioTimer(null);
    }
    
    if (playingIndex === index) {
      // Stop playing
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      setPlayingIndex(null);
      setAudioElement(null);
    } else {
      // Stop current audio if playing
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      
      // Create new audio element
      const audio = new Audio();
      
      // Set up event listeners
      audio.addEventListener('ended', () => {
        setPlayingIndex(null);
        setAudioElement(null);
      });
      
      // In a real app, this would play an actual demo file
      // For demo purposes, we'll use a silent audio file
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      
      // Set volume and play
      audio.volume = 0.8;
      audio.play().catch(err => console.error('Error playing audio:', err));
      
      // Store reference and update state
      setAudioElement(audio);
      setPlayingIndex(index);
      
      // Auto-stop after 30 seconds for demo purposes
      const timer = setTimeout(() => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        setPlayingIndex(null);
        setAudioElement(null);
        setAudioTimer(null);
      }, 30000);
      
      setAudioTimer(timer);
    }
  };

  const handleTalentClick = (talentId: string) => {
    // Stop any playing audio before navigating
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setPlayingIndex(null);
      setAudioElement(null);
    }
    
    // Clear any existing timer
    if (audioTimer) {
      clearTimeout(audioTimer);
      setAudioTimer(null);
    }
    
    // Scroll to top before navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Small delay to ensure scroll completes before navigation
    setTimeout(() => {
      onTalentSelect?.(talentId);
    }, 100);
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
      
      if (audioTimer) {
        clearTimeout(audioTimer);
      }
    };
  }, [audioElement, audioTimer]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // If no talents are available, don't render the section
  if (talents.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-slate-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-20 left-10 w-40 h-40 bg-blue-600/10 rounded-full blur-[100px] opacity-30"></div>
      <div className="absolute bottom-20 right-10 w-60 h-60 bg-indigo-600/10 rounded-full blur-[100px] opacity-30"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Featured Voice Talent
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Discover our top-rated voice artists who have helped thousands of clients 
            bring their projects to life with professional voice overs.
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {talents.map((talent, index) => (
            <motion.div
              key={talent.id}
              className="bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group hover:-translate-y-1 border border-gray-700 hover:border-blue-600 cursor-pointer"
              variants={itemVariants}
              whileHover={{ y: -5 }}
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
                <div className="absolute top-4 right-4">
                  <div className="bg-slate-800/80 backdrop-blur-sm rounded-full p-2 shadow-lg">
                    <Award className="h-4 w-4 text-yellow-500" />
                  </div>
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

        <motion.div 
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button 
            onClick={() => handleTalentClick('all')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:shadow-lg hover:shadow-blue-600/20 transition-all font-semibold text-lg"
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(37, 99, 235, 0.5)" }}
            whileTap={{ scale: 0.95 }}
          >
            View All Voice Talent
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedTalent;