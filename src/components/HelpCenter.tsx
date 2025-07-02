import React, { useState } from 'react';
import { Search, MessageCircle, FileText, Video, Mail, ArrowLeft, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface HelpCenterProps {
  onPageChange?: (page: string) => void;
}

const HelpCenter: React.FC<HelpCenterProps> = ({ onPageChange }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<'helpful' | 'not-helpful' | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);

  const categories = [
    {
      icon: MessageCircle,
      title: 'Getting Started',
      description: 'Learn the basics of using VoiceCastingPro',
      articles: [
        { id: 'create-project', title: 'How to create your first project', content: 'Creating your first project on VoiceCastingPro is easy. Start by clicking the "Post Project" button on the homepage. Fill in the project details including title, description, budget, and deadline. You can also upload reference files like scripts or examples. Once submitted, your project will be visible to voice talent who can then submit proposals.' },
        { id: 'setup-talent-profile', title: 'Setting up your voice talent profile', content: 'To set up your voice talent profile, navigate to your account settings and select "Setup Profile". Add a professional photo, write a compelling bio highlighting your experience and voice type. Upload demo reels showcasing your range and abilities. Include languages you speak and any specialties you have. Complete your profile with your rates and payment information.' },
        { id: 'pricing-structure', title: 'Understanding our pricing structure', content: 'VoiceCastingPro uses a simple, transparent pricing model. For clients, posting projects is completely free. Voice talent can choose between monthly ($35/month) or annual ($348/year, saving $72) subscription plans. There\'s a 5% platform fee on all transactions, which covers secure payment processing and platform maintenance. Escrow payments ensure both parties are protected throughout the project lifecycle.' },
        { id: 'project-descriptions', title: 'Tips for writing effective project descriptions', content: 'An effective project description should include clear details about your project\'s purpose, target audience, and tone. Specify the length of the script, deadline, and budget range. Mention any specific requirements like accent, gender, or age range preferences. The more specific you are, the more targeted proposals you\'ll receive from voice talent who match your needs exactly.' }
      ]
    },
    {
      icon: FileText,
      title: 'For Clients',
      description: 'Everything you need to know about hiring talent',
      articles: [
        { id: 'post-project', title: 'How to post a voice over project', content: 'To post a voice over project, click "Post Project" in the navigation menu. Fill out the form with your project details including title, category, description, and voice requirements. Set your budget range and deadline. You can upload reference materials like scripts or examples. Review all information before submitting. Once posted, you\'ll start receiving proposals from qualified voice talent.' },
        { id: 'select-talent', title: 'Selecting the right voice artist', content: 'When selecting a voice artist, listen to their demos carefully to ensure their tone and style match your project needs. Review their profile for experience in your industry. Check their ratings and reviews from previous clients. Consider their response time and communication style. Don\'t hesitate to message potential candidates with specific questions before making your decision.' },
        { id: 'manage-communications', title: 'Managing project communications', content: 'Effective communication is key to successful voice over projects. Use our built-in messaging system to keep all project discussions in one place. Be clear and specific with your feedback. Share reference materials and examples to illustrate what you\'re looking for. Respond promptly to questions from talent. All communications are securely stored for future reference.' },
        { id: 'payment-billing', title: 'Payment and billing information', content: 'VoiceCastingPro uses a secure escrow payment system through PayPal. When you\'re ready to hire talent, create an escrow payment for the agreed amount. Funds are held securely until you approve the completed work. Once approved, payment is released to the talent minus the 5% platform fee. This system protects both parties and ensures quality delivery.' }
      ]
    },
    {
      icon: Video,
      title: 'For Voice Talent',
      description: 'Resources for voice artists and performers',
      articles: [
        { id: 'create-profile', title: 'Creating an outstanding profile', content: 'Your profile is your storefront on VoiceCastingPro. Use a professional headshot and write a compelling bio that highlights your experience and unique voice qualities. Be specific about your specialties, languages, and accents. Upload diverse, high-quality demos that showcase your range. Include details about your equipment and studio setup. Keep your profile updated with your latest work and availability status.' },
        { id: 'recording-demos', title: 'Recording high-quality demos', content: 'High-quality demos are essential for attracting clients. Record in a quiet, treated space to minimize background noise and echo. Use professional equipment - at minimum, a good USB microphone with a pop filter. Keep demos concise (30-60 seconds) and varied to showcase your range. Edit out mistakes and normalize audio levels. Include different styles and tones relevant to your target market.' },
        { id: 'bidding-projects', title: 'Bidding on projects effectively', content: 'When bidding on projects, take time to read the full description and requirements. Customize your proposal for each project rather than using generic templates. Highlight relevant experience and explain why you\'re the perfect fit. Be realistic with your rates and delivery timeline. Include a short custom audio sample if possible to demonstrate how you\'d approach their specific project.' },
        { id: 'client-relationships', title: 'Building long-term client relationships', content: 'Building long-term relationships starts with exceeding expectations on your first project. Deliver high-quality work on or before deadline. Be responsive and professional in all communications. Accept feedback graciously and make revisions promptly. Follow up after project completion to ensure client satisfaction. Maintain contact periodically with past clients to remind them of your services for future projects.' }
      ]
    }
  ];

  const faqs = [
    {
      question: 'How do I get started on VoiceCastingPro?',
      answer: 'Simply sign up for a free account, complete your profile, and start browsing projects or talent depending on your role.'
    },
    {
      question: 'What are the fees for using the platform?',
      answer: 'Clients can use the platform for free. Voice talent has subscription options starting at $35/month with various features.'
    },
    {
      question: 'How do payments work?',
      answer: 'We use secure payment processing. Clients pay upfront, and funds are released to talent upon project completion and approval.'
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period.'
    }
  ];

  const handleBackClick = () => {
    if (activeArticle) {
      setActiveArticle(null);
      setFeedbackSubmitted(null);
      setShowContactForm(false);
    } else if (onPageChange) {
      onPageChange('home');
    } else {
      // Navigate to home page
      window.location.href = '/';
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleFeedbackClick = (type: 'helpful' | 'not-helpful') => {
    setFeedbackSubmitted(type);
    
    if (type === 'not-helpful') {
      // Show contact form for additional help
      setTimeout(() => {
        setShowContactForm(true);
      }, 500);
    } else {
      // Show related articles or return to main page after a delay
      setTimeout(() => {
        setActiveArticle(null);
        setFeedbackSubmitted(null);
      }, 3000);
    }
  };

  const handleContactClick = () => {
    if (onPageChange) {
      onPageChange('contact-us');
    } else {
      window.location.href = '/contact-us';
    }
  };

  const renderArticleContent = () => {
    if (!activeArticle) return null;
    
    for (const category of categories) {
      const article = category.articles.find(a => a.id === activeArticle);
      if (article) {
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-slate-800 rounded-2xl p-8 border border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-blue-900/50 p-3 rounded-xl">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white">{article.title}</h3>
            </div>
            
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-6">{article.content}</p>
            </div>
            
            {!feedbackSubmitted ? (
              <div className="mt-8 pt-6 border-t border-gray-700">
                <p className="text-gray-400 text-sm">Was this article helpful?</p>
                <div className="flex space-x-4 mt-2">
                  <button 
                    onClick={() => handleFeedbackClick('helpful')}
                    className="px-4 py-2 bg-green-600/20 text-green-400 rounded-lg border border-green-600/30 text-sm hover:bg-green-600/30 transition-colors"
                  >
                    Yes, it helped
                  </button>
                  <button 
                    onClick={() => handleFeedbackClick('not-helpful')}
                    className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg border border-gray-600 text-sm hover:bg-slate-600 transition-colors"
                  >
                    No, I need more help
                  </button>
                </div>
              </div>
            ) : feedbackSubmitted === 'helpful' ? (
              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="bg-green-600/20 border border-green-600/30 text-green-400 px-4 py-3 rounded-lg">
                  <p className="font-medium">Thank you for your feedback!</p>
                  <p className="text-sm mt-1">We're glad this article was helpful. You'll be redirected to the Help Center shortly.</p>
                </div>
              </div>
            ) : showContactForm ? (
              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="bg-blue-600/20 border border-blue-600/30 text-blue-400 px-4 py-3 rounded-lg mb-4">
                  <p className="font-medium">We're sorry this article didn't help.</p>
                  <p className="text-sm mt-1">Our support team is ready to assist you with your specific question.</p>
                </div>
                
                <motion.button
                  onClick={handleContactClick}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium mt-4 inline-block text-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Contact Support Team
                </motion.button>
              </div>
            ) : (
              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="bg-yellow-600/20 border border-yellow-600/30 text-yellow-400 px-4 py-3 rounded-lg">
                  <p className="font-medium">Thank you for your feedback.</p>
                  <p className="text-sm mt-1">We'll connect you with our support team to provide more specific help.</p>
                </div>
              </div>
            )}
          </motion.div>
        );
      }
    }
    
    return null;
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
          <span>{activeArticle ? 'Back to Help Center' : 'Back'}</span>
        </motion.button>
        
        {!activeArticle && (
          <>
            {/* Header */}
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Help Center
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
                Find answers to your questions and learn how to make the most of VoiceCastingPro
              </p>
              
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search for help articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 text-lg"
                    />
                  </div>
                </form>
              </div>
            </motion.div>

            {/* Help Categories */}
            <motion.div 
              className="grid md:grid-cols-3 gap-8 mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {categories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <div key={index} className="bg-slate-800 rounded-2xl p-8 border border-gray-700 hover:border-blue-600 transition-colors">
                    <div className="bg-blue-900/50 p-3 rounded-xl w-fit mb-6">
                      <IconComponent className="h-6 w-6 text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">
                      {category.title}
                    </h3>
                    <p className="text-gray-400 mb-6">
                      {category.description}
                    </p>
                    <ul className="space-y-3">
                      {category.articles.map((article, articleIndex) => (
                        <li key={articleIndex}>
                          <button 
                            className="text-blue-400 hover:text-blue-300 transition-colors text-left"
                            onClick={() => setActiveArticle(article.id)}
                          >
                            {article.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </motion.div>

            {/* FAQ Section */}
            <motion.div 
              className="mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h2 className="text-3xl font-bold text-white text-center mb-12">
                Frequently Asked Questions
              </h2>
              <div className="max-w-4xl mx-auto space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="bg-slate-800 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      {faq.question}
                    </h3>
                    <p className="text-gray-300">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Contact Support */}
            <motion.div 
              className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-8 md:p-12 text-center border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Still Need Help?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                Our support team is here to help you succeed. Get in touch with us directly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button 
                  onClick={handleContactClick}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Mail className="h-5 w-5" />
                  <span>Email Support</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}

        {/* Article Content */}
        {activeArticle && renderArticleContent()}
        
        {/* Back Button (Bottom) */}
        <motion.div 
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <motion.button
            onClick={handleBackClick}
            className="bg-slate-800 border border-gray-700 text-gray-300 px-8 py-3 rounded-xl hover:border-blue-600 hover:text-blue-400 transition-colors font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {activeArticle ? 'Back to Help Center' : 'Back'}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default HelpCenter;