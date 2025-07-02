import React, { useState, useEffect } from 'react';
import { Star, MapPin, Clock, Play, Pause, MessageCircle, DollarSign, Award, Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import AudioUpload from './AudioUpload';
import EnhancedMessagingInterface from './EnhancedMessagingInterface';
import EscrowPaymentManager from './EscrowPaymentManager';

interface TalentProfileProps {
  talentId: string;
  onClose?: () => void;
}

const TalentProfile: React.FC<TalentProfileProps> = ({ talentId, onClose }) => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'demos' | 'reviews' | 'contact'>('overview');
  const [showMessaging, setShowMessaging] = useState(false);
  const [showEscrow, setShowEscrow] = useState(false);
  const [playingDemo, setPlayingDemo] = useState<string | null>(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Mock talent data - in production, this would come from your API
  const talent = {
    id: talentId,
    name: 'Sarah Mitchell',
    title: 'Commercial Voice Specialist',
    location: 'Los Angeles, CA',
    rating: 5.0,
    reviews: 245,
    responseTime: '2 hours',
    priceRange: '$150-300',
    image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
    specialties: ['Commercial', 'Warm & Friendly', 'Corporate', 'E-Learning'],
    languages: ['English (US)', 'Spanish'],
    badge: 'Pro Voice',
    bio: 'Professional voice artist with over 10 years of experience in commercial voice over. I specialize in warm, friendly, and conversational reads that connect with your audience. My home studio is equipped with industry-standard equipment ensuring broadcast-quality recordings.',
    experience: '10+ years',
    completedProjects: 500,
    repeatClients: 85,
    equipment: ['Neumann U87', 'Apollo Twin', 'Pro Tools', 'Treated Home Studio'],
    demos: [
      { id: '1', name: 'Commercial Demo', duration: 45, type: 'Commercial' },
      { id: '2', name: 'Corporate Narration', duration: 60, type: 'Corporate' },
      { id: '3', name: 'E-Learning Sample', duration: 30, type: 'E-Learning' }
    ],
    recentReviews: [
      {
        id: '1',
        client: 'TechFlow Inc.',
        rating: 5,
        comment: 'Absolutely perfect! Sarah delivered exactly what we needed for our commercial. Professional, quick turnaround, and amazing quality.',
        date: '2024-01-15',
        project: 'Tech Startup Commercial'
      },
      {
        id: '2',
        client: 'EduCorp',
        rating: 5,
        comment: 'Outstanding work on our e-learning modules. Clear, engaging, and professional delivery.',
        date: '2024-01-10',
        project: 'Corporate Training Videos'
      }
    ]
  };

  const handlePlayDemo = (demoId: string) => {
    if (playingDemo === demoId) {
      setPlayingDemo(null);
    } else {
      setPlayingDemo(demoId);
    }
  };

  const handleContactClick = () => {
    if (!isAuthenticated) {
      alert('Please sign in to contact this talent');
      return;
    }
    if (user?.type !== 'client') {
      alert('Only clients can contact talent');
      return;
    }
    setShowMessaging(true);
  };

  const handleEscrowClick = () => {
    if (!isAuthenticated) {
      alert('Please sign in to create payments');
      return;
    }
    if (user?.type !== 'client') {
      alert('Only clients can create payments');
      return;
    }
    setShowEscrow(true);
  };

  const handleBackClick = () => {
    if (onClose) {
      onClose();
    } else {
      // Use window.location.href to ensure consistent navigation
      window.location.href = '/talent';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'demos', label: 'Voice Demos' },
    { id: 'reviews', label: 'Reviews' },
    { id: 'contact', label: 'Contact & Payment' }
  ];

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <motion.button
          onClick={handleBackClick}
          className="flex items-center space-x-2 text-white/80 hover:text-white mb-8 transition-colors"
          whileHover={{ x: -5 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Directory</span>
        </motion.button>

        {/* Header */}
        <motion.div 
          className="bg-slate-800 rounded-2xl p-8 mb-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-6 lg:space-y-0 lg:space-x-8">
            <div className="relative">
              <img
                src={talent.image}
                alt={talent.name}
                className="w-32 h-32 rounded-2xl object-cover"
              />
              <div className="absolute -top-2 -right-2">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {talent.badge}
                </span>
              </div>
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{talent.name}</h1>
              <p className="text-xl text-gray-300 mb-4">{talent.title}</p>
              
              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div className="flex items-center space-x-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-white">{talent.rating}</span>
                  <span className="text-gray-400">({talent.reviews} reviews)</span>
                </div>
                
                <div className="flex items-center space-x-1 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>{talent.location}</span>
                </div>
                
                <div className="flex items-center space-x-1 text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Responds in {talent.responseTime}</span>
                </div>
                
                <div className="text-white font-semibold">
                  {talent.priceRange}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {talent.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="bg-blue-900/50 text-blue-400 text-sm font-medium px-3 py-1 rounded-full border border-blue-800/50"
                  >
                    {specialty}
                  </span>
                ))}
              </div>

              {/* Contact buttons - only show if authenticated */}
              <div className="flex flex-wrap gap-4">
                <motion.button
                  onClick={handleContactClick}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {!isAuthenticated ? (
                    <>
                      <Lock className="h-5 w-5" />
                      <span>Sign In to Message</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5" />
                      <span>Message {talent.name.split(' ')[0]}</span>
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  onClick={handleEscrowClick}
                  className="flex items-center space-x-2 border border-gray-600 text-gray-300 px-6 py-3 rounded-lg hover:border-blue-600 hover:text-blue-400 transition-colors font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {!isAuthenticated ? (
                    <>
                      <Lock className="h-5 w-5" />
                      <span>Sign In for Payments</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="h-5 w-5" />
                      <span>Create Secure Payment</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Authentication notice */}
              {!isAuthenticated && (
                <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
                  <p className="text-yellow-300 text-sm">
                    🔒 Sign in to contact talent and create secure payments
                  </p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex space-x-1 bg-slate-800 rounded-xl p-2 border border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Bio */}
                <div className="bg-slate-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">About {talent.name}</h3>
                  <p className="text-gray-300 leading-relaxed">{talent.bio}</p>
                </div>

                {/* Equipment */}
                <div className="bg-slate-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-xl font-bold text-white mb-4">Studio Equipment</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {talent.equipment.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-blue-400" />
                        <span className="text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Stats */}
                <div className="bg-slate-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4">Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Experience</span>
                      <span className="text-white font-medium">{talent.experience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Projects Completed</span>
                      <span className="text-white font-medium">{talent.completedProjects}+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Repeat Clients</span>
                      <span className="text-white font-medium">{talent.repeatClients}%</span>
                    </div>
                  </div>
                </div>

                {/* Languages */}
                <div className="bg-slate-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4">Languages</h3>
                  <div className="space-y-2">
                    {talent.languages.map((language, index) => (
                      <div key={index} className="text-gray-300">{language}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'demos' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-6">Voice Demos</h3>
                
                {user?.id === talentId && (
                  <div className="mb-8">
                    <AudioUpload
                      userId={user.id}
                      type="demo"
                      title="Upload Demo Reels"
                      maxFiles={10}
                    />
                  </div>
                )}

                <div className="space-y-4">
                  {talent.demos.map((demo) => (
                    <div key={demo.id} className="bg-slate-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <motion.button
                            onClick={() => handlePlayDemo(demo.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {playingDemo === demo.id ? (
                              <Pause className="h-5 w-5" />
                            ) : (
                              <Play className="h-5 w-5" />
                            )}
                          </motion.button>
                          
                          <div>
                            <h4 className="text-white font-medium">{demo.name}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-400">
                              <span>{demo.duration}s</span>
                              <span>{demo.type}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="bg-slate-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-6">Client Reviews</h3>
              
              <div className="space-y-6">
                {talent.recentReviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-700 pb-6 last:border-b-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="flex items-center space-x-1">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <span className="text-white font-medium">{review.client}</span>
                        </div>
                        <p className="text-sm text-gray-400">{review.project}</p>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-8">
              {/* Authentication check for messaging */}
              {showMessaging && isAuthenticated && user?.type === 'client' && (
                <div className="bg-slate-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">Message {talent.name}</h3>
                  </div>
                  <EnhancedMessagingInterface
                    recipientId={talentId}
                    projectTitle={`Voice Over Project with ${talent.name}`}
                    onClose={() => setShowMessaging(false)}
                  />
                </div>
              )}

              {/* Authentication check for escrow */}
              {showEscrow && isAuthenticated && user?.type === 'client' && (
                <EscrowPaymentManager
                  talentId={talentId}
                  onEscrowCreated={() => {
                    setShowEscrow(false);
                    alert('Escrow payment created successfully!');
                  }}
                />
              )}

              {/* Contact Options */}
              {!showMessaging && !showEscrow && (
                <div className="bg-slate-800 rounded-xl p-6 border border-gray-700 text-center">
                  <h3 className="text-xl font-bold text-white mb-4">Get in Touch</h3>
                  <p className="text-gray-300 mb-6">
                    Ready to work with {talent.name}? Start a conversation or create a secure payment.
                  </p>
                  
                  {isAuthenticated && user?.type === 'client' ? (
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <motion.button
                        onClick={() => setShowMessaging(true)}
                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span>Send Message</span>
                      </motion.button>
                      
                      <motion.button
                        onClick={() => setShowEscrow(true)}
                        className="flex items-center justify-center space-x-2 border border-gray-600 text-gray-300 px-6 py-3 rounded-lg hover:border-blue-600 hover:text-blue-400 transition-colors font-medium"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <DollarSign className="h-5 w-5" />
                        <span>Create Secure Payment</span>
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
                        <p className="text-yellow-300 text-sm mb-4">
                          {!isAuthenticated 
                            ? '🔒 Please sign in to contact this talent and create payments'
                            : user?.type === 'talent' 
                              ? '👤 Only clients can contact talent and create payments'
                              : '❓ Invalid user type'
                          }
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <motion.button
                          onClick={handleContactClick}
                          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Lock className="h-5 w-5" />
                          <span>Sign In to Message</span>
                        </motion.button>
                        
                        <motion.button
                          onClick={handleEscrowClick}
                          className="flex items-center justify-center space-x-2 border border-gray-600 text-gray-300 px-6 py-3 rounded-lg hover:border-blue-600 hover:text-blue-400 transition-colors font-medium"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Lock className="h-5 w-5" />
                          <span>Sign In for Payments</span>
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default TalentProfile;