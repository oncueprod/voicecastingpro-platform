import React, { useState } from 'react';
import { Search, Star, Users, Headphones, CheckCircle, Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface HeroProps {
  onSearch: (query: string) => void;
  onPostProject?: () => void;
  onPageChange?: (page: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onSearch, onPostProject, onPageChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated, isClient, isTalent } = useAuth();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePostProject = () => {
    if (onPostProject) {
      onPostProject();
    }
  };

  return (
    <section className="relative min-h-screen pt-20 overflow-hidden bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-20 left-10 w-40 h-40 bg-white/5 rounded-full blur-[100px] opacity-50"></div>
      <div className="absolute bottom-20 right-10 w-60 h-60 bg-white/5 rounded-full blur-[100px] opacity-50"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative pt-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <motion.div 
            className="lg:pr-8 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              className="flex items-center space-x-2 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="bg-white/10 text-white px-3 py-1 rounded-full text-sm font-medium border border-white/20">
                Premier Voice Casting Platform
              </div>
              <div className="flex items-center space-x-1">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                </div>
                <span className="text-sm text-white/80 ml-1">Professional Platform</span>
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{ fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              Find the Perfect
              <span className="block mt-2">
                <span className="relative inline-block">
                  <span 
                    className="bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent"
                    style={{ 
                      background: 'linear-gradient(45deg, #67e8f9, #3b82f6, #8b5cf6, #ec4899, #f59e0b)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: 'gradient-shift 3s ease-in-out infinite'
                    }}
                  >
                    Voice
                  </span>
                  {/* Subtle glow effect */}
                  <span 
                    className="absolute inset-0 bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent blur-sm opacity-50"
                    style={{ 
                      background: 'linear-gradient(45deg, #67e8f9, #3b82f6, #8b5cf6, #ec4899, #f59e0b)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      animation: 'gradient-shift 3s ease-in-out infinite'
                    }}
                    aria-hidden="true"
                  >
                    Voice
                  </span>
                </span>
              </span>
              for Your Project
            </motion.h1>
            
            <motion.p 
              className="text-xl text-white/90 mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{ fontWeight: 400, lineHeight: 1.6 }}
            >
              Connect with professional voice actors from around the world. From commercials to audiobooks, 
              find the voice that brings your project to life.
            </motion.p>

            {/* Search Bar */}
            <motion.div 
              className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-2 mb-6 lg:mb-8 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="w-full sm:flex-1 flex items-center space-x-3 px-4">
                  <Search className="h-5 w-5 text-white/70" />
                  <input
                    type="text"
                    placeholder="Search by voice type, language, or project..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1 py-3 text-white placeholder-white/60 bg-transparent focus:outline-none"
                    style={{ fontWeight: 400 }}
                  />
                </div>
                <motion.button
                  onClick={handleSearch}
                  className="w-full sm:w-auto bg-white text-blue-800 px-6 py-3 rounded-lg hover:bg-blue-50 transition-all font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ fontWeight: 500 }}
                >
                  Search Talent
                </motion.button>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 mb-8 lg:mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <motion.button 
                onClick={() => onSearch('')}
                className="bg-white text-blue-800 px-8 py-4 rounded-xl hover:bg-blue-50 transition-all font-semibold text-lg shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ fontWeight: 600 }}
              >
                Browse Voice Talent
              </motion.button>
              {isAuthenticated ? (
                isClient ? (
                  <motion.button 
                    onClick={handlePostProject}
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl hover:border-white hover:bg-white/10 transition-colors font-semibold text-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ fontWeight: 600 }}
                  >
                    Post Your Project
                  </motion.button>
                ) : (
                  <motion.button 
                    onClick={() => onPageChange?.('browse-jobs')}
                    className="border-2 border-white/30 text-white px-8 py-4 rounded-xl hover:border-white hover:bg-white/10 transition-colors font-semibold text-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ fontWeight: 600 }}
                  >
                    Browse Voice Jobs
                  </motion.button>
                )
              ) : (
                <motion.button 
                  onClick={handlePostProject}
                  className="border-2 border-white/30 text-white px-8 py-4 rounded-xl hover:border-white hover:bg-white/10 transition-colors font-semibold text-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ fontWeight: 600 }}
                >
                  Post Your Project
                </motion.button>
              )}
            </motion.div>

            {/* Premium Stats */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="text-center group">
                <div className="flex items-center justify-center mb-3 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 p-3 rounded-full">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent" style={{ fontWeight: 800 }}>
                  Professional
                </div>
                <div className="text-sm text-white/80 font-medium" style={{ fontWeight: 500 }}>
                  Voice Artists
                </div>
              </div>
              
              <div className="text-center group">
                <div className="flex items-center justify-center mb-3 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 p-3 rounded-full">
                    <Headphones className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent" style={{ fontWeight: 800 }}>
                  Quality
                </div>
                <div className="text-sm text-white/80 font-medium" style={{ fontWeight: 500 }}>
                  Projects
                </div>
              </div>
              
              <div className="text-center group">
                <div className="flex items-center justify-center mb-3 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-violet-600 to-indigo-700 rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-r from-purple-500 via-violet-600 to-indigo-700 p-3 rounded-full">
                    <Star className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-violet-300 to-indigo-300 bg-clip-text text-transparent" style={{ fontWeight: 800 }}>
                  Premium
                </div>
                <div className="text-sm text-white/80 font-medium" style={{ fontWeight: 500 }}>
                  Service
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - DirectVOTalent Section */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.div 
              className="relative transform hover:scale-105 transition-transform duration-300"
              whileHover={{ y: -5 }}
            >
              {/* DirectVOTalent Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20">
                {/* Header with Icon */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="bg-blue-600 p-3 rounded-2xl">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white leading-tight" style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>
                      Direct Voice Talent Connections
                    </h3>
                  </div>
                </div>

                {/* Main Content */}
                <div className="mb-8">
                  <p className="text-white text-lg leading-relaxed" style={{ fontWeight: 400, lineHeight: 1.6 }}>
                    No middlemen, no commissions. Talent gains unlimited access with a single subscription payment. 
                    Clients post projects free.
                  </p>
                </div>

                {/* Stylish Animated Stats Boxes */}
                <div className="grid grid-cols-2 gap-6">
                  {/* 24/7 Voice Talents Box */}
                  <motion.div 
                    className="relative overflow-hidden"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                  >
                    <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30 relative">
                      {/* Animated background glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent rounded-2xl animate-pulse"></div>
                      
                      {/* Floating particles */}
                      <div className="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="absolute top-4 right-6 w-1 h-1 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
                      <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
                      
                      <div className="relative z-10 text-center">
                        <motion.div 
                          className="text-4xl font-bold text-white mb-2" 
                          style={{ fontWeight: 800 }}
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          24/7
                        </motion.div>
                        <div className="text-blue-200 font-medium text-base" style={{ fontWeight: 500 }}>
                          Voice Talents
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* VoiceCastingPro Box */}
                  <motion.div 
                    className="relative overflow-hidden"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 1.0 }}
                  >
                    <div className="bg-gradient-to-br from-indigo-600/30 to-purple-800/30 backdrop-blur-sm rounded-2xl p-6 border border-indigo-400/30 relative">
                      {/* Animated background glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-transparent rounded-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                      
                      {/* Floating particles */}
                      <div className="absolute top-3 left-2 w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                      <div className="absolute bottom-2 right-4 w-1 h-1 bg-purple-300 rounded-full animate-bounce" style={{ animationDelay: '0.8s' }}></div>
                      <div className="absolute top-5 right-2 w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '1.3s' }}></div>
                      
                      <div className="relative z-10 text-center flex flex-col items-center justify-center">
                        <motion.div 
                          className="text-xs sm:text-lg font-bold text-white mb-2 leading-tight whitespace-nowrap tracking-tighter w-full text-center" 
                          style={{ fontWeight: 700 }}
                          animate={{ y: [0, -2, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                          VoiceCastingPro
                        </motion.div>
                        <div className="text-indigo-200 font-medium text-base" style={{ fontWeight: 500 }}>
                          Brings Projects to Life
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
              
              {/* Enhanced Decorative elements */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-400/20 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-indigo-400/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
              
              {/* Additional floating elements */}
              <motion.div 
                className="absolute top-10 -left-4 w-3 h-3 bg-blue-400/60 rounded-full"
                animate={{ y: [0, -10, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              ></motion.div>
              <motion.div 
                className="absolute bottom-20 -right-2 w-2 h-2 bg-indigo-400/60 rounded-full"
                animate={{ y: [0, -8, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              ></motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Add custom CSS for gradient animation */}
      <style jsx>{`
        @keyframes gradient-shift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
    </section>
  );
};

export default Hero;