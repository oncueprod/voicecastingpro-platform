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
    console.log('🔍 AuthContext: Starting auth check...');
    const token = localStorage.getItem('auth_token');
    console.log('🔍 AuthContext: Token found:', !!token);
    
    if (token) {
      try {
        console.log('🔍 AuthContext: Calling authAPI.verifyToken()...');
        const result = await authAPI.verifyToken();
        console.log('🔍 AuthContext: authAPI.verifyToken() result:', result);
        
        const { user } = result;
        console.log('🔍 AuthContext: Extracted user:', user);
        
        setUser(user);
        console.log('🔍 AuthContext: setUser() called with:', user);
      } catch (error) {
        console.error('❌ AuthContext: Failed to verify token:', error);
        console.error('❌ AuthContext: Error details:', error.response?.data);
        localStorage.removeItem('auth_token');
      }
    } else {
      console.log('🔍 AuthContext: No token found');
    }
    setIsLoading(false);
    console.log('🔍 AuthContext: setIsLoading(false) called');
  };

  checkAuth();
}, []);

  const signIn = async (email: string, password: string, userType: 'client' | 'talent') => {
    setIsLoading(true);
    try {
      const { user, token } = await authAPI.login(email, password, userType);
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

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signUp,
    resetPassword,
    signOut,
    isAuthenticated: !!user,
    isClient: user?.type === 'client',
    isTalent: user?.type === 'talent'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};