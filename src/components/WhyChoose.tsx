import React from 'react';
import { Shield, Clock, Award, Users, Star, CheckCircle, Check, DollarSign } from 'lucide-react';

interface WhyChooseProps {
  onAuthClick: (type: 'signin' | 'signup') => void;
  onPageChange: (page: string) => void;
}

const WhyChoose: React.FC<WhyChooseProps> = ({ onAuthClick, onPageChange }) => {
  const features = [
    {
      icon: Shield,
      title: 'SecurePay Escrow',
      description: 'Your payments are protected with our escrow system until work is approved.',
      color: 'text-emerald-400'
    },
    {
      icon: Award,
      title: 'Verified Talent',
      description: 'All voice actors are professionally vetted and showcase verified demo reels.',
      color: 'text-blue-400'
    },
    {
      icon: Clock,
      title: 'Fast Turnaround',
      description: 'Get your projects completed quickly with our efficient workflow system.',
      color: 'text-purple-400'
    },
    {
      icon: Users,
      title: 'Direct Communication',
      description: 'Communicate directly with talent through our built-in messaging system.',
      color: 'text-orange-400'
    }
  ];

  return (
    <section className="py-20 bg-slate-800 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Why Choose <span className="text-blue-400">DirectVO</span>?
          </h2>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            We've built the most comprehensive platform for voice-over professionals and clients, 
            ensuring quality, security, and satisfaction every step of the way.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-600/50 hover:border-blue-500/50 transition-all duration-300 hover:transform hover:scale-105 group"
            >
              <div className={`w-16 h-16 rounded-2xl bg-slate-600/50 flex items-center justify-center mb-6 group-hover:bg-slate-600/70 transition-colors duration-300`}>
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-slate-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">Simple Transparent Pricing</h3>
            <p className="text-slate-300 text-lg">Choose the plan that works best for you</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Clients Plan */}
            <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-600/50 hover:border-blue-500/50 transition-all duration-300">
              <h4 className="text-xl font-bold text-white mb-2">Clients</h4>
              <div className="text-3xl font-bold text-white mb-2">FREE</div>
              <p className="text-slate-300 mb-6">Perfect for hiring voice talent</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Post unlimited jobs
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Browse talent profiles
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Direct messaging
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Secure payments
                </li>
              </ul>
              
              <button
                onClick={() => onAuthClick('signup')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium"
              >
                Sign Up Free
              </button>
            </div>
            
            {/* Talent Monthly Plan */}
            <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-600/50 hover:border-blue-500/50 transition-all duration-300">
              <h4 className="text-xl font-bold text-white mb-2">Talent Monthly</h4>
              <div className="text-3xl font-bold text-white mb-2">$35</div>
              <p className="text-slate-300 mb-6">Per month, billed monthly</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Create professional profile
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Apply to unlimited jobs
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Upload audio samples
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Direct client messaging
                </li>
              </ul>
              
              <button
                onClick={() => onPageChange('subscription-plans-public')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium"
              >
                Subscribe Now
              </button>
            </div>
            
            {/* Talent Annual Plan */}
            <div className="bg-slate-700/50 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/50 transition-all duration-300 relative">
              <h4 className="text-xl font-bold text-white mb-2">Talent Annual</h4>
              <div className="text-3xl font-bold text-white mb-2">$348</div>
              <p className="text-slate-300 mb-2">Per year, billed annually</p>
              <p className="text-green-400 text-sm mb-6">Save $72 per year</p>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Everything in Monthly
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Priority customer support
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Featured profile listing
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  Early access to new features
                </li>
                <li className="flex items-center text-slate-300">
                  <Check className="w-5 h-5 text-green-400 mr-2" />
                  <span>2 months free!</span>
                </li>
              </ul>
              
              <button
                onClick={() => onPageChange('subscription-plans-public')}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg transition-colors font-medium"
              >
                Subscribe Now
              </button>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="bg-slate-700/30 rounded-3xl p-12 border border-slate-600/30">
          {/* CTA Section */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8">
              <h4 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h4>
              <p className="text-blue-100 mb-6 text-lg">Join our community of voice professionals today</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => onAuthClick('signup')}
                  className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold hover:bg-blue-50 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Sign Up as Talent
                </button>
                <button
                  onClick={() => onPageChange('post-project')}
                  className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold hover:bg-white hover:text-blue-600 transition-all duration-200"
                >
                  Post a Project
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;