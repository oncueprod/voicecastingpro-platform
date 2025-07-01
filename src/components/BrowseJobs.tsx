import React, { useState } from 'react';
import { Search, Filter, Clock, DollarSign, MapPin, Briefcase, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import ProtectedRoute from './ProtectedRoute';

const BrowseJobs: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'audiobook', label: 'Audiobook' },
    { value: 'gaming', label: 'Video Games' },
    { value: 'documentary', label: 'Documentary' },
    { value: 'elearning', label: 'E-Learning' },
    { value: 'ivr', label: 'IVR/Phone System' },
  ];

  const budgetRanges = [
    { value: 'all', label: 'All Budgets' },
    { value: 'under-100', label: 'Under $100' },
    { value: '100-250', label: '$100 - $250' },
    { value: '250-500', label: '$250 - $500' },
    { value: '500-1000', label: '$500 - $1,000' },
    { value: 'over-1000', label: 'Over $1,000' },
  ];

  const jobs = [
    {
      id: 1,
      title: 'Commercial Voice Over for Tech Startup',
      client: 'TechFlow Inc.',
      category: 'Commercial',
      budget: '$200 - $400',
      duration: '30 seconds',
      deadline: '3 days',
      location: 'Remote',
      description: 'Looking for a professional, energetic voice for our new product launch commercial. Must sound confident and approachable.',
      requirements: ['English (US)', 'Professional tone', 'Quick turnaround'],
      postedTime: '2 hours ago',
      proposals: 5,
      verified: true
    },
    {
      id: 2,
      title: 'Audiobook Narration - Mystery Novel',
      client: 'Midnight Publishing',
      category: 'Audiobook',
      budget: '$1,500 - $2,500',
      duration: '8 hours',
      deadline: '2 weeks',
      location: 'Remote',
      description: 'Seeking an experienced narrator for a thrilling mystery novel. Must be able to create distinct character voices.',
      requirements: ['Audiobook experience', 'Character voices', 'Home studio'],
      postedTime: '5 hours ago',
      proposals: 12,
      verified: true
    },
    {
      id: 3,
      title: 'E-Learning Course Narration',
      client: 'EduTech Solutions',
      category: 'E-Learning',
      budget: '$300 - $600',
      duration: '2 hours',
      deadline: '1 week',
      location: 'Remote',
      description: 'Professional narration needed for corporate training modules. Clear, engaging delivery required.',
      requirements: ['Clear articulation', 'Professional tone', 'E-learning experience'],
      postedTime: '1 day ago',
      proposals: 8,
      verified: false
    },
    {
      id: 4,
      title: 'Video Game Character Voices',
      client: 'Pixel Studios',
      category: 'Gaming',
      budget: '$500 - $1,000',
      duration: 'Multiple sessions',
      deadline: '3 weeks',
      location: 'Remote',
      description: 'Multiple character voices needed for indie RPG game. Looking for versatile voice actor.',
      requirements: ['Character voice experience', 'Gaming industry knowledge', 'Flexible schedule'],
      postedTime: '2 days ago',
      proposals: 15,
      verified: true
    },
    {
      id: 5,
      title: 'Documentary Narration - Wildlife Series',
      client: 'Nature Films Ltd.',
      category: 'Documentary',
      budget: '$800 - $1,200',
      duration: '45 minutes',
      deadline: '10 days',
      location: 'Remote',
      description: 'Authoritative yet warm narration for wildlife documentary series. David Attenborough style preferred.',
      requirements: ['Documentary experience', 'Authoritative voice', 'Nature content familiarity'],
      postedTime: '3 days ago',
      proposals: 7,
      verified: true
    },
    {
      id: 6,
      title: 'IVR System for Healthcare',
      client: 'MedCare Systems',
      category: 'IVR',
      budget: '$150 - $300',
      duration: '20 prompts',
      deadline: '5 days',
      location: 'Remote',
      description: 'Professional, calming voice needed for medical facility phone system. Must sound trustworthy.',
      requirements: ['Clear pronunciation', 'Calming tone', 'Healthcare experience preferred'],
      postedTime: '4 days ago',
      proposals: 6,
      verified: true
    }
  ];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === '' || 
                         job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || job.category.toLowerCase() === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleBackClick = () => {
    // Navigate to home page
    window.location.href = '/';
  };

  return (
    <ProtectedRoute requireTalent={true}>
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
            <span>Back</span>
          </motion.button>
          
          {/* Header */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Browse Voice Over Jobs
            </h1>
            <p className="text-lg text-gray-300">
              Find your next voice over opportunity from our curated job listings
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
                  placeholder="Search jobs by title, description, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                />
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
                  Budget Range
                </label>
                <select
                  value={selectedBudget}
                  onChange={(e) => setSelectedBudget(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  {budgetRanges.map(budget => (
                    <option key={budget.value} value={budget.value}>
                      {budget.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <motion.button 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Apply Filters
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Results count */}
          <motion.div 
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-gray-400">
              Showing {filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'}
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </motion.div>

          {/* Jobs List */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {filteredJobs.map((job, index) => (
              <motion.div
                key={job.id}
                className="bg-slate-800 rounded-2xl p-8 border border-gray-700 hover:border-blue-600 transition-all duration-300 hover:shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    {/* Job Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2">
                          {job.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Briefcase className="h-4 w-4" />
                            <span>{job.client}</span>
                            {job.verified && (
                              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                                Verified
                              </span>
                            )}
                          </span>
                          <span>{job.postedTime}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white mb-1">
                          {job.budget}
                        </div>
                        <div className="text-sm text-gray-400">
                          {job.proposals} proposals
                        </div>
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span>Duration: {job.duration}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span>Deadline: {job.deadline}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span>{job.location}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-300 mb-4 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Requirements */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Requirements:</h4>
                      <div className="flex flex-wrap gap-2">
                        {job.requirements.map((req, reqIndex) => (
                          <span
                            key={reqIndex}
                            className="bg-blue-900/50 text-blue-400 text-xs font-medium px-3 py-1 rounded-full border border-blue-800/50"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="mb-6">
                      <span className="bg-slate-700 text-gray-300 text-sm font-medium px-3 py-1 rounded-full">
                        {job.category}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lg:ml-8 lg:flex-shrink-0">
                    <div className="flex flex-col space-y-3 lg:w-48">
                      <motion.button 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Submit Proposal
                      </motion.button>
                      <motion.button 
                        className="border border-gray-600 text-gray-300 py-3 px-6 rounded-lg hover:border-blue-600 hover:text-blue-400 transition-colors font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Save Job
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Load More */}
          {filteredJobs.length > 0 && (
            <motion.div 
              className="text-center mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <motion.button 
                className="bg-slate-800 border border-gray-700 text-gray-300 px-8 py-4 rounded-xl hover:border-blue-600 hover:text-blue-400 transition-colors font-semibold text-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Load More Jobs
              </motion.button>
            </motion.div>
          )}

          {/* No results */}
          {filteredJobs.length === 0 && (
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
                No jobs found
              </h3>
              <p className="text-gray-400 mb-6">
                Try adjusting your search criteria or check back later for new opportunities.
              </p>
              <motion.button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedBudget('all');
                }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear Filters
              </motion.button>
            </motion.div>
          )}
          
          {/* Back Button (Bottom) */}
          <motion.div 
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <motion.button
              onClick={handleBackClick}
              className="bg-slate-800 border border-gray-700 text-gray-300 px-8 py-3 rounded-xl hover:border-blue-600 hover:text-blue-400 transition-colors font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Back
            </motion.button>
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default BrowseJobs;