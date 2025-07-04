import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  type: 'client' | 'talent';
  avatar?: string;
  lastLogin?: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string, userType: 'client' | 'talent') => Promise<void>;
  signUp: (email: string, password: string, name: string, userType: 'client' | 'talent') => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
  isClient: boolean;
  isTalent: boolean;
  updateUserAvatar: (avatarUrl: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const { user } = await authAPI.verifyToken();
          
          // Check for profile photo in localStorage
          const profileKey = user.type === 'client' ? 'client_profile' : 'talent_profile';
          const savedProfile = localStorage.getItem(profileKey);
          
          if (savedProfile) {
            try {
              const profileData = JSON.parse(savedProfile);
              if (profileData.profilePhoto) {
                user.avatar = profileData.profilePhoto;
              }
            } catch (error) {
              console.error('Failed to parse saved profile:', error);
            }
          }
          
          setUser(user);
        } catch (error) {
          console.error('Failed to verify token:', error);
          localStorage.removeItem('auth_token');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string, userType: 'client' | 'talent') => {
    setIsLoading(true);
    try {
      const { user, token } = await authAPI.login(email, password, userType);
      
      // Check for profile photo in localStorage
      const profileKey = userType === 'client' ? 'client_profile' : 'talent_profile';
      const savedProfile = localStorage.getItem(profileKey);
      
      if (savedProfile) {
        try {
          const profileData = JSON.parse(savedProfile);
          if (profileData.profilePhoto) {
            user.avatar = profileData.profilePhoto;
          }
        } catch (error) {
          console.error('Failed to parse saved profile:', error);
        }
      }
      
      setUser(user);
      localStorage.setItem('auth_token', token);
    } catch (error) {
      throw error; // Re-throw to be handled by the component
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, userType: 'client' | 'talent') => {
    setIsLoading(true);
    try {
      const { user, token } = await authAPI.register(email, password, name, userType);
      setUser(user);
      localStorage.setItem('auth_token', token);
    } catch (error) {
      throw error; // Re-throw to be handled by the component
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await authAPI.resetPassword(email);
    } catch (error) {
      throw error; // Re-throw to be handled by the component
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
  };
  
  const updateUserAvatar = (avatarUrl: string) => {
    if (user) {
      setUser({
        ...user,
        avatar: avatarUrl
      });
      
      // Also update in profile storage
      const profileKey = user.type === 'client' ? 'client_profile' : 'talent_profile';
      const savedProfile = localStorage.getItem(profileKey);
      
      if (savedProfile) {
        try {
          const profileData = JSON.parse(savedProfile);
          profileData.profilePhoto = avatarUrl;
          localStorage.setItem(profileKey, JSON.stringify(profileData));
        } catch (error) {
          console.error('Failed to update profile photo in storage:', error);
        }
      }
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signUp,
    resetPassword,
    signOut,
    isAuthenticated: !!user,
    isClient: user?.type === 'client',
    isTalent: user?.type === 'talent',
    updateUserAvatar
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};