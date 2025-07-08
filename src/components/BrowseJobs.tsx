import React, { useState, useEffect } from 'react';
import { Search, MapPin, Clock, DollarSign, Star, Filter, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface BrowseJobsProps {
  onBack?: () => void;
  onPageChange?: (page: string) => void;
}

interface JobListing {
  id: string;
  title: string;
  description: string;
  budget: string;
  location: string;
  postedAt: Date;
  deadline: Date;
  clientName: string;
  clientRating: number;
  tags: string[];
  applicants: number;
}

const BrowseJobs: React.FC<BrowseJobsProps> = ({ onBack, onPageChange }) => {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
  // Load real projects from localStorage
  const loadRealProjects = () => {
    try {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      
      // Convert Project format to JobListing format
      const jobListings: JobListing[] = projects
        .filter((project: any) => project.status === 'open')
        .map((project: any) => ({
          id: project.id,
          title: project.title,
          description: project.description,
          budget: project.budget,
          location: project.location || 'Remote',
          postedAt: new Date(project.createdAt),
          deadline: project.deadline ? new Date(project.deadline) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          clientName: project.clientName,
          clientRating: 4.5, // Default rating
          tags: project.skills || [project.category || 'General'],
          applicants: Math.floor(Math.random() * 20) // Random for demo
        }));
      
      setJobs(jobListings);
    } catch (error) {
      console.error('Error loading projects:', error);
      setJobs([]);
    }
  };

  loadRealProjects();

  // Listen for new projects
  const handleProjectsUpdated = () => {
    loadRealProjects();
  };

  window.addEventListener('projectsUpdated', handleProjectsUpdated);
  
  return () => {
    window.removeEventListener('projectsUpdated', handleProjectsUpdated);
  };
}, []);
  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      // Navigate to home page
      window.location.href = '/';
    }
  };

  const handleSubscribeClick = () => {
    if (onPageChange) {
      onPageChange('subscription-plans');
    } else {
      // Navigate to subscription plans page with a query parameter
      window.location.href = '/subscription-plans?fromBrowseJobs=true';
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           job.tags.some(tag => tag.toLowerCase().includes(selectedCategory.toLowerCase()));
    return matchesSearch && matchesCategory;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.postedAt.getTime() - a.postedAt.getTime();
      case 'budget':
        return parseInt(b.budget.split('$')[1]) - parseInt(a.budget.split('$')[1]);
      case 'deadline':
        return a.deadline.getTime() - b.deadline.getTime();
      default:
        return 0;
    }
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  const formatDeadline = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 1) {
      return 'Due tomorrow';
    } else if (diffInDays < 7) {
      return `Due in ${diffInDays} days`;
    } else {
      return `Due ${date.toLocaleDateString()}`;
    }
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Browse Voice Over Jobs
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Discover exciting voice over opportunities from clients worldwide. 
            Find projects that match your skills and start building your portfolio.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-white"
              >
                <option value="all">All Categories</option>
                <option value="commercial">Commercial</option>
                <option value="audiobook">Audiobook</option>
                <option value="elearning">E-Learning</option>
                <option value="narration">Narration</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-white"
              >
                <option value="newest">Newest First</option>
                <option value="budget">Highest Budget</option>
                <option value="deadline">Urgent Deadline</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-400">
            Showing {sortedJobs.length} of {jobs.length} jobs
          </p>
        </div>

        {/* Subscription Notice for Talent */}
        <div className="bg-blue-900/30 border border-blue-600/50 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Voice Talent Subscription Required</h3>
              <p className="text-blue-200">
                To apply for jobs and contact clients, you need an active subscription plan.
                Unlock unlimited job applications and direct client messaging today!
              </p>
            </div>
            <motion.button
              onClick={handleSubscribeClick}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium whitespace-nowrap"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Subscription Plans
            </motion.button>
          </div>
        </div>

        {/* Job Listings */}
        <div className="space-y-6">
          {sortedJobs.map((job) => (
            <div key={job.id} className="bg-slate-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 border border-gray-700">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  {/* Job Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {job.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {job.location}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatTimeAgo(job.postedAt)}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          {job.budget}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    {job.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-900/50 text-blue-400 rounded-full text-sm font-medium border border-blue-800/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Client Info and Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium text-white">{job.clientName}</p>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-400 ml-1">
                            {job.clientRating} rating
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {job.applicants} applicants
                      </p>
                      <p className="text-sm font-medium text-orange-400">
                        {formatDeadline(job.deadline)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="mt-6 lg:mt-0 lg:ml-6">
                  <button 
                    onClick={handleSubscribeClick}
                    className="w-full lg:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {sortedJobs.length === 0 && (
          <div className="text-center py-12 bg-slate-800 rounded-xl p-8 border border-gray-700">
            <div className="w-24 h-24 mx-auto mb-6 bg-slate-700 rounded-full flex items-center justify-center">
              <Search className="w-12 h-12 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No jobs found
            </h3>
            <p className="text-gray-400">
              Try adjusting your search criteria or check back later for new opportunities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseJobs;