import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  MessageSquare, 
  Shield, 
  Activity, 
  Search, 
  Filter,
  Eye,
  Ban,
  CheckCircle,
  Trash2,
  AlertTriangle,
  Settings,
  Key,
  UserPlus,
  Download,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminService, AdminUser, UserManagement } from '../services/adminService';
import { talentService, TalentProfile, ClientPost } from '../services/talentService';

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'messages' | 'talent' | 'posts' | 'settings'>('overview');
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [posts, setPosts] = useState<ClientPost[]>([]);
  const [flaggedMessages, setFlaggedMessages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete_talent' | 'delete_all_talents';
    id?: string;
    callback: () => void;
  } | null>(null);

  const currentAdmin = adminService.getCurrentAdmin();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    try {
      setUsers(adminService.getAllUsers());
      setTalents(talentService.getAllTalentProfiles());
      setPosts(talentService.getAllClientPosts());
      setFlaggedMessages(adminService.getFlaggedMessages());
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentAdmin) {
      setPasswordError('No admin session found');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    try {
      await adminService.changePassword(
        currentAdmin.id,
        passwordForm.currentPassword,
        passwordForm.newPassword
      );
      
      setPasswordSuccess(true);
      setPasswordError('');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordChange(false);
      }, 3000);
      
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
      setPasswordSuccess(false);
    }
  };

  const handleSuspendUser = async (userId: string, reason: string) => {
    if (!currentAdmin) return;
    
    try {
      await adminService.suspendUser(userId, reason, currentAdmin.id);
      loadData();
      alert('User suspended successfully');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to suspend user');
    }
  };

  const handleActivateUser = async (userId: string) => {
    if (!currentAdmin) return;
    
    try {
      await adminService.activateUser(userId, currentAdmin.id);
      loadData();
      alert('User activated successfully');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to activate user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentAdmin) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this user? This action cannot be undone and will remove all associated data.'
    );
    
    if (confirmed) {
      try {
        await adminService.deleteUser(userId, currentAdmin.id);
        loadData();
        alert('User deleted successfully');
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete user');
      }
    }
  };

  const handleDeleteTalent = async (talentId: string) => {
    setConfirmAction({
      type: 'delete_talent',
      id: talentId,
      callback: async () => {
        try {
          talentService.deleteTalentProfile(talentId);
          loadData();
          alert('Talent profile deleted successfully');
        } catch (error) {
          alert('Failed to delete talent profile');
        }
        setShowConfirmDialog(false);
      }
    });
    setShowConfirmDialog(true);
  };

  const handleDeleteAllTalents = async () => {
    setConfirmAction({
      type: 'delete_all_talents',
      callback: async () => {
        try {
          // Delete all talent profiles
          talents.forEach(talent => {
            talentService.deleteTalentProfile(talent.id);
          });
          loadData();
          alert('All talent profiles deleted successfully');
        } catch (error) {
          alert('Failed to delete talent profiles');
        }
        setShowConfirmDialog(false);
      }
    });
    setShowConfirmDialog(true);
  };

  const handleDeletePost = async (postId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this client post? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        talentService.deleteClientPost(postId);
        loadData();
        alert('Client post deleted successfully');
      } catch (error) {
        alert('Failed to delete client post');
      }
    }
  };

  const handleFlagMessage = async (messageId: string, reason: string) => {
    if (!currentAdmin) return;
    
    try {
      await adminService.flagMessage(messageId, reason, currentAdmin.id);
      loadData();
      alert('Message flagged successfully');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to flag message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentAdmin) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this message? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await adminService.deleteMessage(messageId, currentAdmin.id);
        loadData();
        alert('Message deleted successfully');
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Failed to delete message');
      }
    }
  };

  const exportData = () => {
    const data = {
      users,
      talents,
      posts,
      flaggedMessages,
      exportedAt: new Date().toISOString(),
      exportedBy: currentAdmin?.email
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voicecastingpro-admin-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = adminService.getSystemStats();

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
                         user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || user.status === selectedFilter || user.type === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const filteredTalents = talents.filter(talent => {
    const matchesSearch = searchQuery === '' || 
                         talent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         talent.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'active' && talent.isActive) ||
                         (selectedFilter === 'suspended' && !talent.isActive);
    
    return matchesSearch && matchesFilter;
  });

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchQuery === '' || 
                         post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || post.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'talent', label: 'Talent Profiles', icon: Users },
    { id: 'posts', label: 'Client Posts', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (!currentAdmin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-4">Session Expired</h3>
          <p className="text-gray-300 mb-6">Please log in again to access the admin dashboard.</p>
          <button onClick={onClose} className="bg-blue-600 text-white px-6 py-3 rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div 
        className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] border border-gray-700 flex flex-col"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="bg-red-900/50 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">SuperAdmin Dashboard</h2>
              <p className="text-gray-400">Welcome, {currentAdmin.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <motion.button
              onClick={exportData}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </motion.button>
            
            <motion.button
              onClick={loadData}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </motion.button>
            
            <motion.button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-6 w-6" />
            </motion.button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-white border-b-2 border-red-500 bg-slate-700'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-700 rounded-xl p-6 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Users</p>
                      <p className="text-2xl font-bold text-white">{stats.users.total}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                
                <div className="bg-slate-700 rounded-xl p-6 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Active Users</p>
                      <p className="text-2xl font-bold text-green-400">{stats.users.active}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-400" />
                  </div>
                </div>
                
                <div className="bg-slate-700 rounded-xl p-6 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Flagged Messages</p>
                      <p className="text-2xl font-bold text-red-400">{stats.messages.flagged}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-400" />
                  </div>
                </div>
                
                <div className="bg-slate-700 rounded-xl p-6 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Volume</p>
                      <p className="text-2xl font-bold text-yellow-400">${stats.escrows.volume.toLocaleString()}</p>
                    </div>
                    <Shield className="h-8 w-8 text-yellow-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-700 rounded-xl p-6 border border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-4">User Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Clients</span>
                      <span className="text-white font-medium">{stats.users.clients}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Talent</span>
                      <span className="text-white font-medium">{stats.users.talents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Suspended</span>
                      <span className="text-red-400 font-medium">{stats.users.suspended}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700 rounded-xl p-6 border border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-4">Platform Activity</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Messages</span>
                      <span className="text-white font-medium">{stats.messages.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Escrows</span>
                      <span className="text-white font-medium">{stats.escrows.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Talent Profiles</span>
                      <span className="text-white font-medium">{talents.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <div className="bg-slate-700 rounded-xl p-6 border border-gray-600">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Account Settings</h3>
                    <p className="text-gray-400">Manage your admin account settings</p>
                  </div>
                  <motion.button
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Key className="h-4 w-4" />
                    <span>Change Password</span>
                  </motion.button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Admin ID</label>
                    <div className="bg-slate-600 p-3 rounded-lg text-white font-mono text-sm">
                      {currentAdmin.id}
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email</label>
                    <div className="bg-slate-600 p-3 rounded-lg text-white">
                      {currentAdmin.email}
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Role</label>
                    <div className="bg-slate-600 p-3 rounded-lg text-white">
                      {currentAdmin.role.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Last Login</label>
                    <div className="bg-slate-600 p-3 rounded-lg text-white">
                      {currentAdmin.lastLogin ? currentAdmin.lastLogin.toLocaleString() : 'Never'}
                    </div>
                  </div>
                </div>

                {/* Password Change Form */}
                <AnimatePresence>
                  {showPasswordChange && (
                    <motion.div
                      className="border-t border-gray-600 pt-6"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h4 className="text-lg font-semibold text-white mb-4">Change Password</h4>
                      
                      {passwordSuccess && (
                        <div className="bg-green-500/20 border border-green-400 text-green-100 px-4 py-3 rounded-lg mb-4">
                          ✅ Password changed successfully!
                        </div>
                      )}

                      {passwordError && (
                        <div className="bg-red-500/20 border border-red-400 text-red-100 px-4 py-3 rounded-lg mb-4">
                          ❌ {passwordError}
                        </div>
                      )}

                      <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                          <label className="block text-gray-400 text-sm mb-2">Current Password</label>
                          <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter current password"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-2">New Password</label>
                          <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter new password (min 6 characters)"
                            minLength={6}
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 text-sm mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Confirm new password"
                            required
                          />
                        </div>

                        <div className="flex space-x-4">
                          <motion.button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Update Password
                          </motion.button>
                          
                          <motion.button
                            type="button"
                            onClick={() => {
                              setShowPasswordChange(false);
                              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                              setPasswordError('');
                              setPasswordSuccess(false);
                            }}
                            className="border border-gray-600 text-gray-300 px-6 py-3 rounded-lg hover:border-red-600 hover:text-red-400 transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Cancel
                          </motion.button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  />
                </div>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="all">All Users</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="client">Clients</option>
                  <option value="talent">Talent</option>
                </select>
              </div>

              {/* Users Table */}
              <div className="bg-slate-700 rounded-xl border border-gray-600 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Projects</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Flagged</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-600">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">{user.name}</div>
                              <div className="text-sm text-gray-400">{user.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.type === 'client' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {user.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {user.totalProjects || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {user.flaggedMessages || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {user.status === 'active' ? (
                                <button
                                  onClick={() => {
                                    const reason = prompt('Reason for suspension:');
                                    if (reason) handleSuspendUser(user.id, reason);
                                  }}
                                  className="text-red-400 hover:text-red-300"
                                  title="Suspend User"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivateUser(user.id)}
                                  className="text-green-400 hover:text-green-300"
                                  title="Activate User"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-400 hover:text-red-300"
                                title="Delete User"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Talent Profiles Tab */}
          {activeTab === 'talent' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex flex-1 gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search talent profiles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    />
                  </div>
                  <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                  >
                    <option value="all">All Profiles</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                
                {/* Delete All Talent Profiles Button */}
                <motion.button
                  onClick={handleDeleteAllTalents}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center space-x-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Remove All Fake Profiles</span>
                </motion.button>
              </div>

              {/* Talent Profiles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTalents.map((talent) => (
                  <div key={talent.id} className="bg-slate-700 rounded-xl p-6 border border-gray-600">
                    <div className="flex items-center space-x-3 mb-4">
                      <img
                        src={talent.image}
                        alt={talent.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="text-white font-medium">{talent.name}</h3>
                        <p className="text-gray-400 text-sm">{talent.title}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Rating:</span>
                        <span className="text-white">{talent.rating}/5 ({talent.reviews} reviews)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Projects:</span>
                        <span className="text-white">{talent.completedProjects}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Status:</span>
                        <span className={talent.isActive ? 'text-green-400' : 'text-red-400'}>
                          {talent.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // View talent details
                          alert(`Viewing details for ${talent.name}`);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                      >
                        <Eye className="h-4 w-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => handleDeleteTalent(talent.id)}
                        className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client Posts Tab */}
          {activeTab === 'posts' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search client posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                  />
                </div>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  <option value="all">All Posts</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Client Posts List */}
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="bg-slate-700 rounded-xl p-6 border border-gray-600">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-medium text-lg mb-2">{post.title}</h3>
                        <p className="text-gray-400 text-sm mb-2">by {post.clientName}</p>
                        <p className="text-gray-300 text-sm">{post.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            // View post details
                            alert(`Viewing details for: ${post.title}`);
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Category:</span>
                        <span className="text-white ml-2">{post.category}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Budget:</span>
                        <span className="text-white ml-2">${post.budget}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <span className={`ml-2 ${
                          post.status === 'active' ? 'text-green-400' : 
                          post.status === 'paused' ? 'text-yellow-400' : 
                          post.status === 'completed' ? 'text-blue-400' : 'text-red-400'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Proposals:</span>
                        <span className="text-white ml-2">{post.proposals}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <div className="bg-slate-700 rounded-xl p-6 border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-4">Flagged Messages</h3>
                
                {flaggedMessages.length === 0 ? (
                  <p className="text-gray-400">No flagged messages found.</p>
                ) : (
                  <div className="space-y-4">
                    {flaggedMessages.map((message) => (
                      <div key={message.id} className="bg-slate-600 rounded-lg p-4 border border-gray-500">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-white font-medium">Message ID: {message.id}</p>
                            <p className="text-gray-400 text-sm">From: {message.senderId}</p>
                            <p className="text-gray-400 text-sm">
                              {new Date(message.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for flagging:');
                                if (reason) handleFlagMessage(message.id, reason);
                              }}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white py-1 px-3 rounded text-sm transition-colors"
                            >
                              Flag
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(message.id)}
                              className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="bg-slate-800 rounded p-3">
                          <p className="text-gray-300 text-sm">{message.content}</p>
                        </div>
                        {message.flagReason && (
                          <div className="mt-2 text-red-400 text-sm">
                            Flagged: {message.flagReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <motion.div 
            className="bg-slate-800 rounded-xl p-6 border border-gray-700 max-w-md w-full"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-xl font-bold text-white mb-4">
              {confirmAction.type === 'delete_talent' ? 'Delete Talent Profile' : 'Remove All Fake Profiles'}
            </h3>
            <p className="text-gray-300 mb-6">
              {confirmAction.type === 'delete_talent' 
                ? 'Are you sure you want to delete this talent profile? This action cannot be undone.'
                : 'Are you sure you want to remove all fake talent profiles? This action cannot be undone and will delete ALL talent profiles in the system.'}
            </p>
            <div className="flex space-x-4">
              <motion.button
                onClick={confirmAction.callback}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Yes, Delete
              </motion.button>
              <motion.button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 border border-gray-600 text-gray-300 py-3 rounded-lg hover:border-gray-500 transition-colors font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;