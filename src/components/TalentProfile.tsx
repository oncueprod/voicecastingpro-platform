// src/components/TalentProfile.tsx - UPDATED TALENT PROFILE WITH MESSAGING (TypeScript)
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Heart, Star, MapPin, Play, Download } from 'lucide-react';

// TypeScript interfaces
interface CurrentUser {
  id: string;
  name: string;
  type: 'client' | 'talent';
}

interface PortfolioItem {
  id: number;
  title: string;
  duration: string;
  description: string;
  audioUrl: string;
}

interface Talent {
  id: string;
  name: string;
  specialties: string[];
  location: string;
  rating: number;
  reviewCount: number;
  hourlyRate: { min: number; max: number };
  responseTime: string;
  availability: string;
  experience: string;
  projectsCompleted: number;
  clientsInterested: number;
  activeShortlists: number;
  languages: string[];
  bio: string;
  avatar: string;
  isOnline: boolean;
  portfolio: PortfolioItem[];
}

const TalentProfile: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>(); // Get talent ID from URL
  const [contacting, setContacting] = useState<boolean>(false);
  
  // IMPORTANT: Replace with your actual current user data
  const currentUser: CurrentUser = {
    id: 'user_1752164361991_e4ogp44sg', // Your actual user ID
    name: 'Current User',
    type: 'client'
  };

  // This would come from your API/props in real app
  const talent: Talent = {
    id: 'talent_bjay_001', // This should match the ID in your backend
    name: 'BJay Kaplan',
    specialties: ['Commercials', 'Narrations'],
    location: 'Location not specified',
    rating: 5,
    reviewCount: 0,
    hourlyRate: { min: 75, max: 100 },
    responseTime: '1 hour',
    availability: 'Available now',
    experience: '1+ years',
    projectsCompleted: 0,
    clientsInterested: 0,
    activeShortlists: 0,
    languages: ['English'],
    bio: 'Professional voice talent',
    avatar: '🎙️',
    isOnline: true,
    portfolio: [
      {
        id: 1,
        title: 'Commercial Demo',
        duration: '45s',
        description: 'Sample commercial voice over',
        audioUrl: '/audio/commercial-demo.mp3'
      },
      {
        id: 2,
        title: 'Narration Sample', 
        duration: '60s',
        description: 'Sample narration voice over',
        audioUrl: '/audio/narration-demo.mp3'
      }
    ]
  };

  // MAIN CONTACT FUNCTION - This creates conversation and redirects to messages
  const handleContactTalent = async (): Promise<void> => {
    try {
      setContacting(true);
      console.log('🚀 Starting conversation with talent:', talent.name);

      // Step 1: Create conversation
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        },
        body: JSON.stringify({
          conversationId,
          participants: [currentUser.id, talent.id],
          projectTitle: `Project Inquiry - ${talent.specialties.join(', ')}`
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Conversation created:', result);

      // Step 2: Send initial message
      const initialMessage = `Hi ${talent.name}! I'm interested in your voice over services for ${talent.specialties.join(' and ')}. I'd love to discuss a potential project with you.`;
      
      const messageResponse = await fetch('/api/contact/talent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        },
        body: JSON.stringify({
          conversationId: result.conversation.id,
          senderId: currentUser.id,
          receiverId: talent.id,
          content: initialMessage,
          type: 'text',
          timestamp: new Date().toISOString(),
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      });

      if (messageResponse.ok) {
        console.log('✅ Initial message sent');
      }

      // Step 3: Redirect to message center
      navigate(`/messages/${result.conversation.id}`);

    } catch (error) {
      console.error('❌ Failed to contact talent:', error);
      
      // Fallback: Just go to messages page
      alert('Starting conversation... Redirecting to messages.');
      navigate('/messages');
      
    } finally {
      setContacting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="text-blue-400 hover:text-blue-300 mb-4"
          >
            ← Back to Talent Directory
          </button>
        </div>

        {/* Talent Profile */}
        <div className="bg-slate-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* Profile Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 rounded-full p-4 text-2xl">
                  {talent.avatar}
                  {talent.isOnline && (
                    <div className="relative">
                      <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{talent.name}</h1>
                  <p className="text-blue-400 font-medium">{talent.specialties.join(', ')}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {talent.location}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span>{talent.rating}</span>
                      <span>({talent.reviewCount} reviews)</span>
                    </div>
                    <span>${talent.hourlyRate.min}-{talent.hourlyRate.max}/hour</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* MAIN CONTACT BUTTON */}
                <button
                  onClick={handleContactTalent}
                  disabled={contacting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  {contacting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5" />
                      Contact Talent
                    </>
                  )}
                </button>
                
                <button className="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors">
                  <Heart className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">About</h2>
                <p className="text-gray-300">{talent.bio}</p>
              </div>

              {/* Portfolio */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Portfolio</h2>
                <div className="space-y-4">
                  {talent.portfolio.map((item) => (
                    <div key={item.id} className="bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white">{item.title}</h3>
                          <p className="text-sm text-gray-400">{item.duration}</p>
                          <p className="text-sm text-gray-300 mt-1">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded">
                            <Play className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-white p-2">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">Reviews</h2>
                <div className="text-center py-8">
                  <p className="text-gray-400">No reviews yet</p>
                </div>
              </div>
            </div>

            {/* Right Column - Stats & Info */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Experience</span>
                    <span className="text-white font-medium">{talent.experience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Projects Completed</span>
                    <span className="text-white font-medium">{talent.projectsCompleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Response Time</span>
                    <span className="text-white font-medium">{talent.responseTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Availability</span>
                    <span className="text-green-400 font-medium">{talent.availability}</span>
                  </div>
                </div>
              </div>

              {/* Market Appeal */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-4">Market Appeal</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Client Interest</span>
                    <span className="text-white font-medium">{talent.clientsInterested}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Shortlists</span>
                    <span className="text-white font-medium">{talent.activeShortlists}</span>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {talent.specialties.map((skill, index) => (
                    <span key={index} className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-4">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {talent.languages.map((language, index) => (
                    <span key={index} className="text-gray-300">{language}</span>
                  ))}
                </div>
              </div>

              {/* Contact Actions */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-4">Contact Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleContactTalent}
                    disabled={contacting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    💬 Send Message
                  </button>
                  <button
                    onClick={() => navigate('/messages')}
                    className="w-full border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    📨 View All Messages
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentProfile;
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, Heart, Star, MapPin, Play, Download } from 'lucide-react';

const TalentProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get talent ID from URL
  const [contacting, setContacting] = useState(false);
  
  // IMPORTANT: Replace with your actual current user data
  const currentUser = {
    id: 'user_1752164361991_e4ogp44sg', // Your actual user ID
    name: 'Current User',
    type: 'client'
  };

  // This would come from your API/props in real app
  const talent = {
    id: 'talent_bjay_001', // This should match the ID in your backend
    name: 'BJay Kaplan',
    specialties: ['Commercials', 'Narrations'],
    location: 'Location not specified',
    rating: 5,
    reviewCount: 0,
    hourlyRate: { min: 75, max: 100 },
    responseTime: '1 hour',
    availability: 'Available now',
    experience: '1+ years',
    projectsCompleted: 0,
    clientsInterested: 0,
    activeShortlists: 0,
    languages: ['English'],
    bio: 'Professional voice talent',
    avatar: '🎙️',
    isOnline: true,
    portfolio: [
      {
        id: 1,
        title: 'Commercial Demo',
        duration: '45s',
        description: 'Sample commercial voice over',
        audioUrl: '/audio/commercial-demo.mp3'
      },
      {
        id: 2,
        title: 'Narration Sample', 
        duration: '60s',
        description: 'Sample narration voice over',
        audioUrl: '/audio/narration-demo.mp3'
      }
    ]
  };

  // MAIN CONTACT FUNCTION - This creates conversation and redirects to messages
  const handleContactTalent = async () => {
    try {
      setContacting(true);
      console.log('🚀 Starting conversation with talent:', talent.name);

      // Step 1: Create conversation
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        },
        body: JSON.stringify({
          conversationId,
          participants: [currentUser.id, talent.id],
          projectTitle: `Project Inquiry - ${talent.specialties.join(', ')}`
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Conversation created:', result);

      // Step 2: Send initial message
      const initialMessage = `Hi ${talent.name}! I'm interested in your voice over services for ${talent.specialties.join(' and ')}. I'd love to discuss a potential project with you.`;
      
      const messageResponse = await fetch('/api/contact/talent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.id
        },
        body: JSON.stringify({
          conversationId: result.conversation.id,
          senderId: currentUser.id,
          receiverId: talent.id,
          content: initialMessage,
          type: 'text',
          timestamp: new Date().toISOString(),
          messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
      });

      if (messageResponse.ok) {
        console.log('✅ Initial message sent');
      }

      // Step 3: Redirect to message center
      navigate(`/messages/${result.conversation.id}`);

    } catch (error) {
      console.error('❌ Failed to contact talent:', error);
      
      // Fallback: Just go to messages page
      alert('Starting conversation... Redirecting to messages.');
      navigate('/messages');
      
    } finally {
      setContacting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="text-blue-400 hover:text-blue-300 mb-4"
          >
            ← Back to Talent Directory
          </button>
        </div>

        {/* Talent Profile */}
        <div className="bg-slate-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* Profile Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 rounded-full p-4 text-2xl">
                  {talent.avatar}
                  {talent.isOnline && (
                    <div className="relative">
                      <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{talent.name}</h1>
                  <p className="text-blue-400 font-medium">{talent.specialties.join(', ')}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {talent.location}
                    </span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span>{talent.rating}</span>
                      <span>({talent.reviewCount} reviews)</span>
                    </div>
                    <span>${talent.hourlyRate.min}-{talent.hourlyRate.max}/hour</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* MAIN CONTACT BUTTON */}
                <button
                  onClick={handleContactTalent}
                  disabled={contacting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  {contacting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5" />
                      Contact Talent
                    </>
                  )}
                </button>
                
                <button className="border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-colors">
                  <Heart className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">About</h2>
                <p className="text-gray-300">{talent.bio}</p>
              </div>

              {/* Portfolio */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Portfolio</h2>
                <div className="space-y-4">
                  {talent.portfolio.map((item) => (
                    <div key={item.id} className="bg-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-white">{item.title}</h3>
                          <p className="text-sm text-gray-400">{item.duration}</p>
                          <p className="text-sm text-gray-300 mt-1">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded">
                            <Play className="h-4 w-4" />
                          </button>
                          <button className="text-gray-400 hover:text-white p-2">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-3">Reviews</h2>
                <div className="text-center py-8">
                  <p className="text-gray-400">No reviews yet</p>
                </div>
              </div>
            </div>

            {/* Right Column - Stats & Info */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Experience</span>
                    <span className="text-white font-medium">{talent.experience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Projects Completed</span>
                    <span className="text-white font-medium">{talent.projectsCompleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Response Time</span>
                    <span className="text-white font-medium">{talent.responseTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Availability</span>
                    <span className="text-green-400 font-medium">{talent.availability}</span>
                  </div>
                </div>
              </div>

              {/* Market Appeal */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-4">Market Appeal</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Client Interest</span>
                    <span className="text-white font-medium">{talent.clientsInterested}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Shortlists</span>
                    <span className="text-white font-medium">{talent.activeShortlists}</span>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {talent.specialties.map((skill, index) => (
                    <span key={index} className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-4">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {talent.languages.map((language, index) => (
                    <span key={index} className="text-gray-300">{language}</span>
                  ))}
                </div>
              </div>

              {/* Contact Actions */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="font-medium text-white mb-4">Contact Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleContactTalent}
                    disabled={contacting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    💬 Send Message
                  </button>
                  <button
                    onClick={() => navigate('/messages')}
                    className="w-full border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white py-2 px-4 rounded-lg transition-colors"
                  >
                    📨 View All Messages
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TalentProfile;