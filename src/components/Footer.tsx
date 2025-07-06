import React, { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { motion } from 'framer-motion';

interface FooterProps {
  onAuthClick: (type: 'signin' | 'signup') => void;
  onPageChange: (page: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onAuthClick, onPageChange }) => {
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If section doesn't exist, scroll to top
      scrollToTop();
    }
  };

  const handleNavigation = (page: string, sectionId?: string) => {
    if (page === 'home' && sectionId) {
      // If we're already on home page, scroll to section
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '') {
        scrollToSection(sectionId);
      } else {
        // Navigate to home page first, then scroll
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          onPageChange('home');
          setTimeout(() => scrollToSection(sectionId), 100);
        }, 100);
      }
    } else {
      // For all other pages, navigate and scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        onPageChange(page);
      }, 100);
    }
  };

  const handleSubscriptionPlansClick = () => {
    // Navigate to subscription plans page and scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onPageChange('subscription-plans-public');
    }, 100);
  };

  const handleAuthClick = (type: 'signin' | 'signup') => {
    // Scroll to top before showing auth modal
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onAuthClick(type);
    }, 100);
  };

  // Hidden admin access via double-click on copyright text
  const [copyrightClicks, setCopyrightClicks] = React.useState(0);
  const copyrightClickTimer = useRef<NodeJS.Timeout | null>(null);

  const handleCopyrightClick = () => {
    setCopyrightClicks(prev => prev + 1);
    
    // Reset clicks after 1 second
    if (copyrightClickTimer.current) {
      clearTimeout(copyrightClickTimer.current);
    }
    
    copyrightClickTimer.current = setTimeout(() => {
      setCopyrightClicks(0);
    }, 1000);
    
    // Show admin login after 3 quick clicks
    if (copyrightClicks >= 2) {
      // Dispatch a custom event that Header component will listen for
      const event = new CustomEvent('showAdminLogin');
      window.dispatchEvent(event);
      setCopyrightClicks(0);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (copyrightClickTimer.current) {
        clearTimeout(copyrightClickTimer.current);
      }
    };
  }, []);

  return (
    <footer className="bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-20 left-10 w-40 h-40 bg-white/5 rounded-full blur-[100px] opacity-30"></div>
      <div className="absolute bottom-20 right-10 w-60 h-60 bg-white/5 rounded-full blur-[100px] opacity-30"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Main footer content */}
        <motion.div 
          className="py-10 lg:py-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand section */}
            <motion.div 
              className="lg:col-span-1 text-center sm:text-left"
              variants={itemVariants}
            >
              <button 
                onClick={() => handleNavigation('home')}
                className="flex items-center space-x-2 mb-6 hover:opacity-80 transition-opacity"
              >
                <div className="bg-white/10 p-2 rounded-lg">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">
                  VoiceCastingPro
                </span>
              </button>
              
              <p className="text-white/80 mb-4 sm:mb-6 leading-relaxed">
                The premier platform connecting voice talent with clients worldwide.
              </p>
              
              <div className="text-sm text-white/70 flex flex-col items-center sm:items-start">
                <div className="flex items-center space-x-2 mb-2">
                  <span>📧</span>
                  <button 
                    onClick={() => handleNavigation('contact-us')}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    support@voicecastingpro.com
                  </button>
                </div>
              </div>
            </motion.div>

            {/* For Clients */}
            <motion.div
              className="text-center sm:text-left"
              variants={itemVariants}
            >
              <h3 className="font-semibold text-white mb-6">For Clients</h3>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => handleNavigation('talent')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Find Talent
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavigation('post-project')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Post a Job
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavigation('home', 'how-it-works')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    How It Works
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleAuthClick('signup')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Sign Up Free
                  </button>
                </li>
              </ul>
            </motion.div>

            {/* For Talent */}
            <motion.div 
              className="text-center sm:text-left"
              variants={itemVariants}
            >
              <h3 className="font-semibold text-white mb-6">For Talent</h3>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => handleNavigation('browse-jobs')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Browse Jobs
                  </button>
                </li>
                <li>
                  <button 
                    onClick={handleSubscriptionPlansClick}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Subscription Plans
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavigation('home', 'featured-talent')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Featured Talent
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleAuthClick('signup')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Join Today
                  </button>
                </li>
              </ul>
            </motion.div>

            {/* Support */}
            <motion.div 
              className="text-center sm:text-left"
              variants={itemVariants}
            >
              <h3 className="font-semibold text-white mb-6">Support</h3>
              <ul className="space-y-3">
                <li>
                  <button 
                    onClick={() => handleNavigation('help-center')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Help Center
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavigation('contact-us')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Contact Us
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavigation('home', 'services')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Services
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavigation('terms-of-service')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => handleNavigation('privacy-policy')}
                    className="text-white/80 hover:text-white transition-colors text-sm text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom footer */}
        <div className="border-t border-white/20 py-8 text-center">
          <div 
            className="text-white/70 text-sm cursor-pointer"
            onClick={handleCopyrightClick}
          >
            © 2025 VoiceCastingPro, a division of On Cue Productions, Inc. All rights reserved. Built for voice professionals worldwide.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;