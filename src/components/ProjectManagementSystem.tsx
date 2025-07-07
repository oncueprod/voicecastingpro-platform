import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, Calendar, MapPin, User, Briefcase, Search, Filter, X, Send, Clock, Eye } from 'lucide-react';

// Project interface
interface Project {
  id: string;
  title: string;
  description: string;
  budget: string;
  deadline: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  location?: string;
  category: string;
  skills: string[];
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  applicants?: string[];
  viewCount?: number;
}

// Project Service - Centralized data management
class ProjectService {
  private static readonly STORAGE_KEY = 'projects';

  static getAllProjects(): Project[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading projects:', error);
      return [];
    }
  }

  static createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'applicants' | 'viewCount'>): Project {
    const newProject: Project = {
      ...projectData,
      id: 'project_' + Date.now(),
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      applicants: [],
      viewCount: 0
    };

    try {
      const projects = this.getAllProjects();
      projects.unshift(newProject); // Add to beginning for newest first
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('projectsUpdated', { detail: projects }));
      
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  }

  static updateProject(id: string, updates: Partial<Project>): boolean {
    try {
      const projects = this.getAllProjects();
      const index = projects.findIndex(p => p.id === id);
      
      if (index === -1) return false;
      
      projects[index] = {
        ...projects[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
      window.dispatchEvent(new CustomEvent('projectsUpdated', { detail: projects }));
      
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      return false;
    }
  }

  static getProjectsByClient(clientId: string): Project[] {
    return this.getAllProjects().filter(project => project.clientId === clientId);
  }

  static getOpenProjects(): Project[] {
    return this.getAllProjects().filter(project => project.status === 'open');
  }

  static deleteProject(id: string): boolean {
    try {
      const projects = this.getAllProjects();
      const filteredProjects = projects.filter(p => p.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredProjects));
      window.dispatchEvent(new CustomEvent('projectsUpdated', { detail: filteredProjects }));
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }
}

// Client Project Creation Component
const ProjectCreationForm: React.FC<{ onClose?: () => void; onProjectCreated?: (project: Project) => void }> = ({ 
  onClose, 
  onProjectCreated 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    location: '',
    category: '',
    skills: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user info
  const getUserInfo = () => {
    return {
      id: localStorage.getItem('userId') || localStorage.getItem('user_id') || 'demo_client_' + Date.now(),
      name: localStorage.getItem('userName') || localStorage.getItem('user_name') || 'Demo Client',
      type: localStorage.getItem('userType') || localStorage.getItem('user_type') || 'client'
    };
  };

  const user = getUserInfo();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.budget) {
      alert('Please fill in all required fields (Title, Description, Budget)');
      return;
    }

    setIsSubmitting(true);

    try {
      const projectData = {
        ...formData,
        clientId: user.id,
        clientName: user.name,
        skills: formData.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0),
        location: formData.location || 'Remote'
      };

      const newProject = ProjectService.createProject(projectData);
      
      console.log('✅ Project created successfully:', newProject);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        budget: '',
        deadline: '',
        location: '',
        category: '',
        skills: ''
      });

      // Notify parent component
      if (onProjectCreated) {
        onProjectCreated(newProject);
      }

      alert('Project created successfully! Talents can now see and apply to your project.');
      
      if (onClose) {
        onClose();
      }

    } catch (error) {
      console.error('❌ Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Create New Project</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Commercial Voice Over for Tech Product"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your project requirements, style, tone, and any specific needs..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Budget *
                </label>
                <select
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select budget range</option>
                  <option value="$100-250">$100 - $250</option>
                  <option value="$250-500">$250 - $500</option>
                  <option value="$500-1000">$500 - $1,000</option>
                  <option value="$1000-2500">$1,000 - $2,500</option>
                  <option value="$2500-5000">$2,500 - $5,000</option>
                  <option value="$5000+">$5,000+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Deadline
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Audiobook">Audiobook</option>
                  <option value="E-Learning">E-Learning</option>
                  <option value="Documentary">Documentary</option>
                  <option value="Animation">Animation</option>
                  <option value="IVR">IVR/Phone Systems</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                  placeholder="Remote, New York, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Required Skills
              </label>
              <input
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Commercial Voice Over, Professional Tone, Tech Products (comma separated)"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple skills with commas</p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Project
                  </>
                )}
              </button>
              
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Talent Job Browser Component
const TalentJobBrowser: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [budgetFilter, setBudgetFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProjects = () => {
    try {
      setLoading(true);
      const allProjects = ProjectService.getOpenProjects();
      console.log('📋 Loaded projects for talents:', allProjects);
      setProjects(allProjects);
      setFilteredProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on search and filters
  useEffect(() => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(project => project.category === categoryFilter);
    }

    if (budgetFilter) {
      filtered = filtered.filter(project => project.budget === budgetFilter);
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, categoryFilter, budgetFilter]);

  // Listen for project updates
  useEffect(() => {
    loadProjects();

    const handleProjectsUpdated = (event: CustomEvent) => {
      console.log('🔄 Projects updated event received');
      const updatedProjects = ProjectService.getOpenProjects();
      setProjects(updatedProjects);
      setFilteredProjects(updatedProjects);
    };

    window.addEventListener('projectsUpdated', handleProjectsUpdated as EventListener);

    return () => {
      window.removeEventListener('projectsUpdated', handleProjectsUpdated as EventListener);
    };
  }, []);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const categories = ['Commercial', 'Audiobook', 'E-Learning', 'Documentary', 'Animation', 'IVR', 'Other'];
  const budgetRanges = ['$100-250', '$250-500', '$500-1000', '$1000-2500', '$2500-5000', '$5000+'];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Available Projects</h1>
          <p className="text-gray-400">
            Browse and apply to voice over projects from clients around the world.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects, skills, or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Budgets</option>
                {budgetRanges.map(range => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-400">
            Showing {filteredProjects.length} of {projects.length} projects
          </p>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {projects.length === 0 ? 'No Projects Available' : 'No Projects Match Your Filters'}
            </h3>
            <p className="text-gray-400 mb-6">
              {projects.length === 0 
                ? 'There are currently no open projects. Check back soon for new opportunities!'
                : 'Try adjusting your search criteria or filters to find more projects.'
              }
            </p>
            {projects.length === 0 && (
              <button
                onClick={loadProjects}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Refresh Projects
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-slate-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white line-clamp-2">
                    {project.title}
                  </h3>
                  <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded text-xs font-medium">
                    {project.status}
                  </span>
                </div>

                <p className="text-gray-300 text-sm mb-4 line-clamp-3">
                  {project.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <DollarSign className="h-4 w-4" />
                    <span>{project.budget}</span>
                  </div>
                  
                  {project.deadline && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <User className="h-4 w-4" />
                    <span>{project.clientName}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span>{project.location || 'Remote'}</span>
                  </div>
                </div>

                {project.skills && project.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {project.skills.slice(0, 3).map((skill, index) => (
                        <span 
                          key={index}
                          className="bg-blue-900/50 text-blue-400 px-2 py-1 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {project.skills.length > 3 && (
                        <span className="text-gray-500 text-xs px-2 py-1">
                          +{project.skills.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimeAgo(project.createdAt)}</span>
                  </div>
                  
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Combined Project Management Component
const ProjectManagementSystem: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');
  
  // Get user type
  const userType = localStorage.getItem('userType') || localStorage.getItem('user_type') || 'talent';
  const isClient = userType === 'client';

  const handleProjectCreated = (project: Project) => {
    console.log('✅ New project created:', project);
    // The event system will automatically refresh the talent browser
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation Tabs */}
      <div className="bg-slate-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'browse'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Browse Projects ({ProjectService.getOpenProjects().length})
            </button>
            
            {isClient && (
              <button
                onClick={() => setActiveTab('create')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                Create Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'browse' && <TalentJobBrowser />}
      
      {activeTab === 'create' && isClient && (
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProjectCreationForm 
              onProjectCreated={handleProjectCreated}
            />
          </div>
        </div>
      )}

      {/* Floating Create Button for Mobile */}
      {isClient && activeTab === 'browse' && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-colors z-40"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <ProjectCreationForm
          onClose={() => setShowCreateForm(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}
    </div>
  );
};

export { ProjectManagementSystem, ProjectService, TalentJobBrowser, ProjectCreationForm };