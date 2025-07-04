import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  register: async (email: string, password: string, name: string, type: 'client' | 'talent') => {
    try {
      // In a real app, this would call the backend API
      // For now, we'll use the database service directly
      const { database } = await import('./database');
      const user = await database.createUser(email, password, name, type);
      
      // Generate a mock token
      const token = btoa(JSON.stringify({ userId: user.id, email: user.email, type }));
      
      return { user, token };
    } catch (error) {
      throw error;
    }
  },
  
  login: async (email: string, password: string, userType: 'client' | 'talent') => {
    try {
      // In a real app, this would call the backend API
      // For now, we'll use the database service directly
      const { database } = await import('./database');
      const user = await database.authenticateUser(email, password, userType);
      
      // Generate a mock token
      const token = btoa(JSON.stringify({ userId: user.id, email: user.email, type: user.type }));
      
      return { user, token };
    } catch (error) {
      throw error;
    }
  },
  
  resetPassword: async (email: string) => {
    try {
      // In a real app, this would call the backend API
      // For now, we'll simulate a successful password reset request
      console.log(`Password reset requested for: ${email}`);
      
      // Simulate checking if user exists
      const { database } = await import('./database');
      const user = await database.getUserByEmail(email);
      
      if (!user) {
        // Don't reveal that the user doesn't exist
        return { message: 'If an account with this email exists, a password reset link has been sent' };
      }
      
      // In a real app, this would send an email with a reset link
      console.log(`Password reset link would be sent to: ${email}`);
      
      return { message: 'If an account with this email exists, a password reset link has been sent' };
    } catch (error) {
      throw error;
    }
  },
  
  verifyToken: async () => {
    try {
      // In a real app, this would verify the token with the backend
      // For now, we'll decode the token and check if the user exists
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No token found');
      }
      
      const decoded = JSON.parse(atob(token));
      
      const { database } = await import('./database');
      const user = await database.getUserById(decoded.userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return { user };
    } catch (error) {
      throw error;
    }
  }
};

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
  
  updateProfile: async (profileData: any) => {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  },
  
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

// Talent API
export const talentAPI = {
  getAllTalent: async (filters?: any) => {
    const response = await api.get('/talent', { params: filters });
    return response.data;
  },
  
  getTalentById: async (id: string) => {
    const response = await api.get(`/talent/${id}`);
    return response.data;
  },
  
  updateTalentProfile: async (profileData: any) => {
    const response = await api.put('/talent/profile', profileData);
    return response.data;
  },
  
  uploadDemo: async (file: File, title: string, description?: string) => {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('title', title);
    if (description) formData.append('description', description);
    
    const response = await api.post('/talent/demos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  deleteDemo: async (demoId: string) => {
    const response = await api.delete(`/talent/demos/${demoId}`);
    return response.data;
  }
};

// Messaging API
export const messageAPI = {
  getConversations: async () => {
    const response = await api.get('/messages/conversations');
    return response.data;
  },
  
  getMessages: async (conversationId: string) => {
    const response = await api.get(`/messages/conversations/${conversationId}`);
    return response.data;
  },
  
  createConversation: async (recipientId: string, projectId?: string, projectTitle?: string) => {
    const response = await api.post('/messages/conversations', {
      recipientId,
      projectId,
      projectTitle
    });
    return response.data;
  },
  
  sendMessage: async (conversationId: string, content: string, type = 'text', metadata?: any) => {
    const response = await api.post(`/messages/conversations/${conversationId}`, {
      content,
      type,
      metadata
    });
    return response.data;
  },
  
  uploadAttachment: async (conversationId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/messages/conversations/${conversationId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  markAsRead: async (messageId: string) => {
    const response = await api.put(`/messages/${messageId}/read`);
    return response.data;
  }
};

// Payment API
export const paymentAPI = {
  createEscrow: async (amount: number, talentId: string, projectId: string, projectTitle: string, description: string) => {
    const response = await api.post('/payments/escrow', {
      amount,
      currency: 'USD',
      talentId,
      projectId,
      projectTitle,
      description
    });
    return response.data;
  },
  
  captureEscrow: async (escrowId: string, orderId: string) => {
    const response = await api.post(`/payments/escrow/${escrowId}/capture`, {
      orderId
    });
    return response.data;
  },
  
  releaseEscrow: async (escrowId: string, talentPayPalEmail: string) => {
    const response = await api.post(`/payments/escrow/${escrowId}/release`, {
      talentPayPalEmail
    });
    return response.data;
  },
  
  getEscrows: async () => {
    const response = await api.get('/payments/escrow');
    return response.data;
  },
  
  createSubscription: async (planId: string) => {
    const response = await api.post('/payments/subscription', {
      planId
    });
    return response.data;
  },
  
  activateSubscription: async (subscriptionId: string) => {
    const response = await api.post(`/payments/subscription/${subscriptionId}/activate`);
    return response.data;
  },
  
  cancelSubscription: async (subscriptionId: string) => {
    const response = await api.post(`/payments/subscription/${subscriptionId}/cancel`);
    return response.data;
  }
};

// Admin API
export const adminAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/admin/login', { username, password });
    return response.data;
  },
  
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  
  suspendUser: async (userId: string, reason: string) => {
    const response = await api.put(`/admin/users/${userId}/suspend`, { reason });
    return response.data;
  },
  
  activateUser: async (userId: string) => {
    const response = await api.put(`/admin/users/${userId}/activate`);
    return response.data;
  },
  
  deleteUser: async (userId: string) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
  
  getFlaggedMessages: async () => {
    const response = await api.get('/admin/messages/flagged');
    return response.data;
  },
  
  flagMessage: async (messageId: string, reason: string) => {
    const response = await api.put(`/admin/messages/${messageId}/flag`, { reason });
    return response.data;
  },
  
  deleteMessage: async (messageId: string) => {
    const response = await api.delete(`/admin/messages/${messageId}`);
    return response.data;
  },
  
  getSystemStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  }
};

export default api;