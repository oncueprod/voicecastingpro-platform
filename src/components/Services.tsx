import React from 'react';
import { Mic, Radio, BookOpen, Video, Megaphone, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface ServicesProps {
  onPageChange?: (page: string) => void;
}

const Services: React.FC<ServicesProps> = ({ onPageChange }) => {
  const services = [
    {
      icon: Mic,
      title: 'Commercial Voice Over',
      description: 'Professional voices for TV, radio, and online advertisements',
      popular: true,
      searchQuery: 'commercial'
    },
    {
      icon: BookOpen,
      title: 'Audiobook Narration',
      description: 'Engaging narrators for fiction, non-fiction, and educational content',
      popular: false,
      searchQuery: 'audiobook'
    },
    {
      icon: Video,
      title: 'Video Game Voice Acting',
      description: 'Character voices and narration for gaming experiences',
      popular: false,
      searchQuery: 'gaming'
    },
    {
      icon: Radio,
      title: 'Podcast Intros & Outros',
      description: 'Professional introductions and closings for your podcast',
      popular: false,
      searchQuery: 'podcast'
    },
    {
      icon: Megaphone,
      title: 'IVR & Phone Systems',
      description: 'Clear, professional voices for automated phone systems',
      popular: false,
      searchQuery: 'ivr'
    },
    {
      icon: Globe,
      title: 'Multilingual Voice Over',
      description: 'Native speakers in 50+ languages and dialects',
      popular: true,
      searchQuery: 'multilingual'
    },
  ];

  const handleBrowseTalent = (searchQuery: string) => {
    if (onPageChange) {
      // Store the search query in sessionStorage so TalentDirectory can use it
      sessionStorage.setItem('talent_search_query', searchQuery);
      onPageChange('talent');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <section className="py-20 bg-slate-800 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-20 right-20 w-40 h-40 bg-blue-600/10 rounded-full blur-[100px] opacity-30"></div>
      <div className="absolute bottom-20 left-20 w-60 h-60 bg-indigo-600/10 rounded-full blur-[100px] opacity-30"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Voice Over Services for Every Need
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            From commercials to audiobooks, our talented voice artists deliver 
            professional recordings that captivate your audience.
          </p>
        </motion.div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <motion.div
                key={index}
                className={`relative bg-slate-700 rounded-xl p-8 border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
                  service.popular
                    ? 'border-blue-600 shadow-lg shadow-blue-600/20'
                    : 'border-gray-600 hover:border-blue-600'
                }`}
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                {service.popular && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}
                
                <div className={`inline-flex p-3 rounded-xl mb-6 ${
                  service.popular
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                    : 'bg-slate-600'
                }`}>
                  <IconComponent className={`h-6 w-6 ${
                    service.popular ? 'text-white' : 'text-gray-300'
                  }`} />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-3">
                  {service.title}
                </h3>
                <p className="text-gray-300 mb-6">
                  {service.description}
                </p>
                
                <motion.button 
                  onClick={() => handleBrowseTalent(service.searchQuery)}
                  className={`w-full py-3 rounded-lg font-medium transition-colors ${
                    service.popular
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-600/20'
                      : 'border border-gray-600 text-gray-300 hover:border-blue-600 hover:text-blue-400'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Browse {service.title.split(' ')[0]} Talent
                </motion.button>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default Services;