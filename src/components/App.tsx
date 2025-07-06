import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import Header from './Header';
import { ArrowLeft } from 'lucide-react';
import Hero from './Hero';
import FeaturedTalent from './FeaturedTalent';
import Services from './Services';
import WhyChoose from './WhyChoose';
import HowItWorks from './HowItWorks';
import Footer from './Footer';
import TalentDirectory from './TalentDirectory';
import TalentProfile from './TalentProfile';
import PostProject from './PostProject';
import AuthPage from './AuthPage';
import HelpCenter from './HelpCenter';
import ContactUs from './ContactUs';
import TermsOfService from './TermsOfService';
import PrivacyPolicy from './PrivacyPolicy';
import BrowseJobs from './BrowseJobs';
import SubscriptionPlans from './SubscriptionPlans';
import PublicSubscriptionPlans from './PublicSubscriptionPlans';
import UserProfile from './UserProfile';
import TalentProfileSetup from './TalentProfileSetup';
import MessagingSystem from './MessagingSystem';
import PayPalSandboxTester from './PayPalSandboxTester';
import ScrollToTop from './ScrollToTop';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import CircularSoundwaveBackground from './CircularSoundwaveBackground';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTalentId, setSelectedTalentId] = useState<string | null>(null);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const isProduction = import.meta.env.PROD;
  const [fromSignup, setFromSignup] = useState(false);
  const [fromBrowseJobs, setFromBrowseJobs] = useState(false);
  const [talentProfilesUpdated, setTalentProfilesUpdated] = useState(0);

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
    
    // Listen for storage changes to update components when talent profiles change
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'talent_profiles') {
        setTalentProfilesUpdated(prev => prev + 1);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('showAdminLogin', handleShowAdminLogin);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handle direct navigation to subscription plans from browse jobs
  useEffect(() => {
    // Check if we have a URL parameter for subscription redirect
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const fromBrowseJobsParam = urlParams.get('fromBrowseJobs');
      
      if (fromBrowseJobsParam === 'true' && currentPage !== 'subscription-plans') {
        // Navigate to subscription plans
        setCurrentPage('subscription-plans');
        setFromBrowseJobs(true);
      }
    }
  }, [currentPage]);

  const handleAuthSuccess = () => {
    // Navigate back to home page after successful authentication
    setCurrentPage('home');
  };

  const handleAuthClick = (type: 'signin' | 'signup') => {
    setCurrentPage(type);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Scroll to top before navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setCurrentPage('talent');
    }, 100);
  };

  const handleTalentSelect = (talentId: string) => {
    setSelectedTalentId(talentId);
    // Scroll to top before navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setCurrentPage('talent-profile');
    }, 100);
  };

  const handlePostProject = () => {
    // Scroll to top before navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setCurrentPage('post-project');
    }, 100);
  };

  const handlePageChange = (page: string) => {
    // Don't allow navigation to PayPal Sandbox in production
    if (page === 'paypal-sandbox' && isProduction) {
      return;
    }
    
    // Scroll to top before navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setCurrentPage(page);
    }, 100);
  };

  // Render the background
  const renderBackground = () => {
    if (currentPage !== 'home') return null;
    return <CircularSoundwaveBackground color="blue" intensity="medium" />;
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'signin':
        return (
          <AuthPage 
            type="signin" 
            onBack={() => setCurrentPage('home')}
            onSuccess={handleAuthSuccess}
          />
        );
      case 'signup':
        return (
          <AuthPage 
            type="signup" 
            onBack={() => setCurrentPage('home')}
            onSuccess={handleAuthSuccess}
          />
        );
      case 'talent':
        return (
          <TalentDirectory 
            searchQuery={searchQuery} 
            onTalentSelect={handleTalentSelect}
            onBack={() => setCurrentPage('home')}
          />
        );
      case 'talent-profile':
        return selectedTalentId ? (
          <TalentProfile 
            talentId={selectedTalentId}
            onClose={() => {
              // Scroll to top before navigation
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setTimeout(() => {
                setCurrentPage('talent');
                setSelectedTalentId(null);
              }, 100);
            }}
          />
        ) : null;
      case 'post-project':
        return <PostProject onBack={() => setCurrentPage('home')} />;
      case 'help-center':
        return <HelpCenter onPageChange={handlePageChange} />;
      case 'contact-us':
        return <ContactUs onPageChange={handlePageChange} />;
      case 'terms-of-service':
        return <TermsOfService />;
      case 'privacy-policy':
        return <PrivacyPolicy />;
      case 'browse-jobs':
        return <BrowseJobs 
          onBack={() => setCurrentPage('home')} 
          onPageChange={handlePageChange} 
        />;
      case 'subscription-plans':
        return <SubscriptionPlans
          fromSignup={fromSignup} 
          onBack={() => {
            // Check if we should go back to browse jobs or home
            if (fromBrowseJobs) {
              setCurrentPage('browse-jobs');
              setFromBrowseJobs(false);
            } else {
              setCurrentPage('home');
              setFromSignup(false);
            }
          }}
        />;
      case 'subscription-plans-public':
        return <PublicSubscriptionPlans onAuthClick={handleAuthClick} />;
      case 'profile':
        return <UserProfile onBack={() => setCurrentPage('home')} />;
      case 'talent-setup':
        return (
          <TalentProfileSetup 
            onBack={() => {
              setFromSignup(false);
              setCurrentPage('home');
            }}
            onComplete={() => {
              // When profile setup is complete, navigate to subscription page
              setFromSignup(true);
              setCurrentPage('subscription-plans');
            }}
          />
        );
      case 'messaging':
        return <MessagingSystem onClose={() => setCurrentPage('home')} />;
      case 'paypal-sandbox':
        // Only render in development mode
        return !isProduction ? 
          <PayPalSandboxTester onBack={() => setCurrentPage('home')} /> : 
          setCurrentPage('home');
      case 'how-it-works':
        return <HowItWorks onPageChange={handlePageChange} />;
      default:
        return (
          <>
            <Header 
              currentPage={currentPage} 
              onPageChange={handlePageChange}
              onAuthClick={handleAuthClick}
            />
            <div id="hero">
              <Hero onSearch={handleSearch} onPostProject={handlePostProject} />
            </div>
            <div id="services">
              <Services onPageChange={handlePageChange} />
            </div>
            <div id="featured-talent">
              <FeaturedTalent 
                key={`featured-talent-${talentProfilesUpdated}`} 
                onTalentSelect={handleTalentSelect} 
              />
            </div>
            <div id="why-choose">
              <WhyChoose onAuthClick={handleAuthClick} onPageChange={handlePageChange} />
            </div>
            <div id="how-it-works">
              <HowItWorks onPageChange={handlePageChange} />
            </div>
            <Footer 
              onAuthClick={handleAuthClick}
              onPageChange={handlePageChange}
            />
          </>
        );
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-900">
        {renderPage()}
        <ScrollToTop />
        {renderBackground()}
        
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
      </div>
    </AuthProvider>
  );
}

export default App;