import React, { useState, useEffect } from 'react';
import { Menu, X, Mic, Shield, User, MessageCircle, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onAuthClick: (type: 'signin' | 'signup') => void;
}

const Header: React.FC<HeaderProps> = ({ currentPage, onPageChange, onAuthClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [keySequence, setKeySequence] = useState<string[]>([]);
  const { isAuthenticated, user, signOut } = useAuth();
  const isProduction = import.meta.env.PROD;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Add keyboard sequence listener for admin access
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Safely get the lowercase key value
      const keyPressed = e.key?.toLowerCase();
      
      // Only track specific keys for the sequence if key is defined
      if (keyPressed && ['a', 'd', 'm', 'i', 'n'].includes(keyPressed)) {
        setKeySequence(prev => {
          const newSequence = [...prev, keyPressed];
          // Keep only the last 5 keys
          if (newSequence.length > 5) {
            return newSequence.slice(newSequence.length - 5);
          }
          return newSequence;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check for "admin" sequence
  useEffect(() => {
    const sequence = keySequence.join('');
    if (sequence === 'admin') {
      setShowAdminLogin(true);
      setKeySequence([]);
    }
  }, [keySequence]);

  // Listen for custom event to show admin login
  useEffect(() => {
    const handleShowAdminLogin = () => {
      setShowAdminLogin(true);
    };
    
    window.addEventListener('showAdminLogin', handleShowAdminLogin);
    
    // Secret keyboard shortcut for admin access
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Alt+A for admin access
      if (e.ctrlKey && e.altKey && e.key === 'a') {
        setShowAdminLogin(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('showAdminLogin', handleShowAdminLogin);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogoClick = () => {
    // Scroll to top before navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onPageChange('home');
    }, 100);
  };

  const handleNavClick = (page: string) => {
    // Scroll to top before navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onPageChange(page);
    }, 100);
  };

  const handleProfileClick = () => {
    // Scroll to top before navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onPageChange('profile');
    }, 100);
  };

  const handleMessagingClick = () => {
    // Scroll to top before navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onPageChange('messaging');
    }, 100);
  };

  const handleTalentSetupClick = () => {
    // Scroll to top before navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onPageChange('talent-setup');
    }, 100);
  };
  
  const handlePayPalSandboxClick = () => {
    // Scroll to top before navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      onPageChange('paypal-sandbox');
    }, 100);
  };

  const navigation = [
    { name: 'Home', key: 'home' },
    { name: 'Find Talent', key: 'talent' },
    { name: 'Post Project', key: 'post-project' },
    { name: 'How It Works', key: 'how-it-works' },
  ];

  return (
    <>
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-blue-800/90 backdrop-blur-md shadow-lg' : 'bg-gradient-to-r from-blue-800 via-blue-900 to-indigo-900'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div 
              className="flex items-center space-x-2 cursor-pointer" 
              onClick={handleLogoClick}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white/10 p-2 rounded-lg">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                VoiceCastingPro
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-8">
              {navigation.map((item) => (
                <motion.button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`text-sm font-medium transition-colors hover:text-blue-200 ${
                    currentPage === item.key
                      ? 'text-white border-b-2 border-white pb-4'
                      : 'text-white/80'
                  }`}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {item.name}
                </motion.button>
              ))}
              
              {/* PayPal Sandbox Testing Link - Only in development */}
              {!isProduction && (
                <motion.button
                  onClick={handlePayPalSandboxClick}
                  className="text-sm font-medium transition-colors hover:text-blue-200 text-white/80"
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  PayPal Sandbox
                </motion.button>
              )}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    {user?.avatar && (
                      <img 
                        src={user.avatar} 
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <div className="text-right">
                      <div className="text-white/90 text-sm font-medium">
                        {user?.name}
                      </div>
                      <div className="text-white/60 text-xs">
                        {user?.type === 'client' ? 'Client' : 'Voice Talent'}
                      </div>
                    </div>
                  </div>
                  
                  <motion.button 
                    onClick={handleMessagingClick}
                    className="text-white/90 hover:text-white transition-colors font-medium p-2 rounded-lg hover:bg-white/10"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Messages"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </motion.button>
                  
                  <motion.button 
                    onClick={handleProfileClick}
                    className="text-white/90 hover:text-white transition-colors font-medium p-2 rounded-lg hover:bg-white/10"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Edit Profile"
                  >
                    <User className="h-5 w-5" />
                  </motion.button>
                  
                  {/* PayPal Sandbox button - Only in development */}
                  {!isProduction && (
                    <motion.button 
                      onClick={handlePayPalSandboxClick}
                      className="text-white/90 hover:text-white transition-colors font-medium p-2 rounded-lg hover:bg-white/10"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title="PayPal Sandbox"
                    >
                      <CreditCard className="h-5 w-5" />
                    </motion.button>
                  )}
                  
                  <motion.button 
                    onClick={signOut}
                    className="text-white/90 hover:text-white transition-colors font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign Out
                  </motion.button>
                </div>
              ) : (
                <>
                  <motion.button 
                    onClick={() => onAuthClick('signin')}
                    className="text-white/90 hover:text-white transition-colors font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Login
                  </motion.button>
                  <motion.button 
                    onClick={() => onAuthClick('signup')}
                    className="bg-white text-blue-800 px-6 py-2 rounded-lg hover:bg-blue-50 transition-all font-medium"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign Up
                  </motion.button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md text-white/90 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <motion.div 
              className="md:hidden py-4 border-t border-white/20"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col space-y-3">
                {navigation.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      handleNavClick(item.key);
                      setIsMenuOpen(false);
                    }}
                    className={`text-left py-2 text-sm font-medium transition-colors hover:text-blue-200 ${
                      currentPage === item.key ? 'text-white' : 'text-white/80'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
                
                {/* PayPal Sandbox Testing Link - Only in development */}
                {!isProduction && (
                  <button
                    onClick={() => {
                      handlePayPalSandboxClick();
                      setIsMenuOpen(false);
                    }}
                    className="text-left py-2 text-sm font-medium transition-colors hover:text-blue-200 text-white/80"
                  >
                    PayPal Sandbox
                  </button>
                )}
                
                <div className="flex flex-col space-y-2 pt-4 border-t border-white/20">
                  {isAuthenticated ? (
                    <>
                      <div className="text-white/90 text-sm py-2">
                        Welcome, {user?.name}
                      </div>
                      <button 
                        onClick={() => {
                          handleMessagingClick();
                          setIsMenuOpen(false);
                        }}
                        className="text-left py-2 text-sm text-white/90 hover:text-white transition-colors"
                      >
                        Messages
                      </button>
                      <button 
                        onClick={() => {
                          handleProfileClick();
                          setIsMenuOpen(false);
                        }}
                        className="text-left py-2 text-sm text-white/90 hover:text-white transition-colors"
                      >
                        Edit Profile
                      </button>
                      <button 
                        onClick={signOut}
                        className="text-left py-2 text-sm text-white/90 hover:text-white transition-colors"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          onAuthClick('signin');
                          setIsMenuOpen(false);
                        }}
                        className="text-left py-2 text-sm text-white/90 hover:text-white transition-colors"
                      >
                        Login
                      </button>
                      <button 
                        onClick={() => {
                          onAuthClick('signup');
                          setIsMenuOpen(false);
                        }}
                        className="text-left py-2 text-sm text-white/90 hover:text-white transition-colors"
                      >
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </header>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <AdminLogin
          onClose={() => setShowAdminLogin(false)}
          onSuccess={() => {
            setShowAdminLogin(false);
            setShowAdminDashboard(true);
          }}
        />
      )}

      {/* Admin Dashboard Modal */}
      {showAdminDashboard && (
        <AdminDashboard
          onClose={() => setShowAdminDashboard(false)}
        />
      )}
    </>
  );
};

export default Header;