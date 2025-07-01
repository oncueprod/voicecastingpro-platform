interface TalentProfile {
  id: string;
  userId: string;
  name: string;
  title: string;
  location: string;
  rating: number;
  reviews: number;
  responseTime: string;
  priceRange: string;
  image: string;
  specialties: string[];
  languages: string[];
  badge: string;
  bio: string;
  experience: string;
  completedProjects: number;
  repeatClients: number;
  equipment: string[];
  demos: {
    id: string;
    name: string;
    duration: number;
    type: string;
    url?: string;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  suspensionReason?: string;
}

interface ClientPost {
  id: string;
  userId: string;
  title: string;
  category: string;
  description: string;
  scriptLength: string;
  voiceStyle: string;
  gender: string;
  age: string;
  language: string;
  budget: string;
  deadline: string;
  projectType: 'one-time' | 'ongoing';
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  proposals: number;
  createdAt: Date;
  updatedAt: Date;
  clientName: string;
  clientEmail: string;
}

class TalentService {
  private talentStorageKey = 'talent_profiles';
  private postsStorageKey = 'client_posts';

  // Talent Profile Management
  getAllTalentProfiles(): TalentProfile[] {
    try {
      const profiles = JSON.parse(localStorage.getItem(this.talentStorageKey) || '[]');
      return profiles.map((profile: any) => ({
        ...profile,
        createdAt: new Date(profile.createdAt),
        updatedAt: new Date(profile.updatedAt)
      }));
    } catch {
      return this.initializeMockTalentProfiles();
    }
  }

  getTalentProfile(id: string): TalentProfile | null {
    const profiles = this.getAllTalentProfiles();
    return profiles.find(p => p.id === id) || null;
  }

  updateTalentProfile(id: string, updates: Partial<TalentProfile>): TalentProfile {
    const profiles = this.getAllTalentProfiles();
    const profileIndex = profiles.findIndex(p => p.id === id);
    
    if (profileIndex === -1) {
      throw new Error('Talent profile not found');
    }

    profiles[profileIndex] = {
      ...profiles[profileIndex],
      ...updates,
      updatedAt: new Date()
    };

    localStorage.setItem(this.talentStorageKey, JSON.stringify(profiles));
    return profiles[profileIndex];
  }

  deleteTalentProfile(id: string): boolean {
    const profiles = this.getAllTalentProfiles();
    const profileIndex = profiles.findIndex(p => p.id === id);
    
    if (profileIndex === -1) {
      return false;
    }

    profiles.splice(profileIndex, 1);
    localStorage.setItem(this.talentStorageKey, JSON.stringify(profiles));
    
    // Clean up related data
    this.cleanupTalentData(id);
    return true;
  }

  suspendTalentProfile(id: string, reason: string): boolean {
    try {
      this.updateTalentProfile(id, {
        isActive: false,
        suspensionReason: reason
      });
      return true;
    } catch {
      return false;
    }
  }

  activateTalentProfile(id: string): boolean {
    try {
      this.updateTalentProfile(id, {
        isActive: true,
        suspensionReason: undefined
      });
      return true;
    } catch {
      return false;
    }
  }

  // Client Posts Management
  getAllClientPosts(): ClientPost[] {
    try {
      const posts = JSON.parse(localStorage.getItem(this.postsStorageKey) || '[]');
      return posts.map((post: any) => ({
        ...post,
        createdAt: new Date(post.createdAt),
        updatedAt: new Date(post.updatedAt)
      }));
    } catch {
      return this.initializeMockClientPosts();
    }
  }

  getClientPost(id: string): ClientPost | null {
    const posts = this.getAllClientPosts();
    return posts.find(p => p.id === id) || null;
  }

  updateClientPost(id: string, updates: Partial<ClientPost>): ClientPost {
    const posts = this.getAllClientPosts();
    const postIndex = posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      throw new Error('Client post not found');
    }

    posts[postIndex] = {
      ...posts[postIndex],
      ...updates,
      updatedAt: new Date()
    };

    localStorage.setItem(this.postsStorageKey, JSON.stringify(posts));
    return posts[postIndex];
  }

  deleteClientPost(id: string): boolean {
    const posts = this.getAllClientPosts();
    const postIndex = posts.findIndex(p => p.id === id);
    
    if (postIndex === -1) {
      return false;
    }

    posts.splice(postIndex, 1);
    localStorage.setItem(this.postsStorageKey, JSON.stringify(posts));
    return true;
  }

  // Initialize mock data
  private initializeMockTalentProfiles(): TalentProfile[] {
    const mockProfiles: TalentProfile[] = [
      {
        id: 'talent_001',
        userId: 'user_talent_001',
        name: 'Sarah Mitchell',
        title: 'Commercial Voice Specialist',
        location: 'Los Angeles, CA',
        rating: 5.0,
        reviews: 245,
        responseTime: '2 hours',
        priceRange: '$150-300',
        image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
        specialties: ['Commercial', 'Warm & Friendly', 'Corporate'],
        languages: ['English (US)', 'Spanish'],
        badge: 'Pro Voice',
        bio: 'Professional voice artist with over 10 years of experience in commercial voice over.',
        experience: '10+ years',
        completedProjects: 500,
        repeatClients: 85,
        equipment: ['Neumann U87', 'Apollo Twin', 'Pro Tools', 'Treated Home Studio'],
        demos: [
          { id: 'demo_001', name: 'Commercial Demo', duration: 45, type: 'Commercial' },
          { id: 'demo_002', name: 'Corporate Narration', duration: 60, type: 'Corporate' }
        ],
        isActive: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20')
      },
      {
        id: 'talent_002',
        userId: 'user_talent_002',
        name: 'Marcus Johnson',
        title: 'Audiobook Narrator',
        location: 'New York, NY',
        rating: 4.9,
        reviews: 189,
        responseTime: '4 hours',
        priceRange: '$200-400',
        image: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=400',
        specialties: ['Audiobooks', 'Documentary', 'Deep & Authoritative'],
        languages: ['English (US)', 'Portuguese'],
        badge: 'Top Rated',
        bio: 'Award-winning narrator specializing in fiction and non-fiction audiobooks.',
        experience: '8+ years',
        completedProjects: 150,
        repeatClients: 92,
        equipment: ['Shure SM7B', 'Focusrite Scarlett', 'Adobe Audition', 'Acoustic Treatment'],
        demos: [
          { id: 'demo_003', name: 'Fiction Audiobook', duration: 120, type: 'Audiobook' },
          { id: 'demo_004', name: 'Documentary Narration', duration: 90, type: 'Documentary' }
        ],
        isActive: true,
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18')
      },
      {
        id: 'talent_003',
        userId: 'user_talent_003',
        name: 'Emma Thompson',
        title: 'Character Voice Artist',
        location: 'London, UK',
        rating: 4.8,
        reviews: 167,
        responseTime: '6 hours',
        priceRange: '$100-250',
        image: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=400',
        specialties: ['Animation', 'Video Games', 'Character Voices'],
        languages: ['English (UK)', 'French'],
        badge: 'Rising Star',
        bio: 'Versatile character voice artist with expertise in animation and gaming.',
        experience: '5+ years',
        completedProjects: 200,
        repeatClients: 78,
        equipment: ['Audio-Technica AT2020', 'PreSonus AudioBox', 'Reaper', 'Vocal Booth'],
        demos: [
          { id: 'demo_005', name: 'Character Voices', duration: 75, type: 'Character' },
          { id: 'demo_006', name: 'Animation Sample', duration: 60, type: 'Animation' }
        ],
        isActive: true,
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-15')
      }
    ];

    localStorage.setItem(this.talentStorageKey, JSON.stringify(mockProfiles));
    return mockProfiles;
  }

  private initializeMockClientPosts(): ClientPost[] {
    const mockPosts: ClientPost[] = [
      {
        id: 'post_001',
        userId: 'user_client_001',
        title: 'Commercial Voice Over for Tech Startup',
        category: 'Commercial',
        description: 'Looking for a professional, energetic voice for our new product launch commercial.',
        scriptLength: '30-60',
        voiceStyle: 'Energetic',
        gender: 'female',
        age: 'young-adult',
        language: 'English (US)',
        budget: '200-400',
        deadline: '2024-02-15',
        projectType: 'one-time',
        status: 'active',
        proposals: 12,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20'),
        clientName: 'TechFlow Inc.',
        clientEmail: 'hiring@techflow.com'
      },
      {
        id: 'post_002',
        userId: 'user_client_002',
        title: 'Audiobook Narration - Mystery Novel',
        category: 'Audiobook',
        description: 'Seeking an experienced narrator for a thrilling mystery novel.',
        scriptLength: 'over-60',
        voiceStyle: 'Dramatic',
        gender: 'male',
        age: 'adult',
        language: 'English (US)',
        budget: '1000-2500',
        deadline: '2024-03-01',
        projectType: 'one-time',
        status: 'active',
        proposals: 8,
        createdAt: new Date('2024-01-18'),
        updatedAt: new Date('2024-01-19'),
        clientName: 'Midnight Publishing',
        clientEmail: 'projects@midnightpub.com'
      },
      {
        id: 'post_003',
        userId: 'user_client_003',
        title: 'E-Learning Course Narration',
        category: 'E-Learning',
        description: 'Professional narration needed for corporate training modules.',
        scriptLength: '15-60',
        voiceStyle: 'Professional',
        gender: 'no-preference',
        age: 'adult',
        language: 'English (US)',
        budget: '500-1000',
        deadline: '2024-02-28',
        projectType: 'ongoing',
        status: 'active',
        proposals: 15,
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-01-17'),
        clientName: 'EduTech Solutions',
        clientEmail: 'content@edutech.com'
      },
      {
        id: 'post_004',
        userId: 'user_client_004',
        title: 'Video Game Character Voices',
        category: 'Gaming',
        description: 'Multiple character voices needed for indie RPG game.',
        scriptLength: '5-15',
        voiceStyle: 'Character Voices',
        gender: 'no-preference',
        age: 'no-preference',
        language: 'English (US)',
        budget: '500-1000',
        deadline: '2024-03-15',
        projectType: 'one-time',
        status: 'paused',
        proposals: 22,
        createdAt: new Date('2024-01-14'),
        updatedAt: new Date('2024-01-16'),
        clientName: 'Pixel Studios',
        clientEmail: 'voice@pixelstudios.com'
      }
    ];

    localStorage.setItem(this.postsStorageKey, JSON.stringify(mockPosts));
    return mockPosts;
  }

  private cleanupTalentData(talentId: string): void {
    // Remove talent from conversations
    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const filteredConversations = conversations.filter((c: any) => !c.participants.includes(talentId));
    localStorage.setItem('conversations', JSON.stringify(filteredConversations));

    // Remove talent messages
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    const filteredMessages = messages.filter((m: any) => m.senderId !== talentId && m.receiverId !== talentId);
    localStorage.setItem('messages', JSON.stringify(filteredMessages));

    // Remove talent escrows
    const escrows = JSON.parse(localStorage.getItem('escrow_payments') || '[]');
    const filteredEscrows = escrows.filter((e: any) => e.talentId !== talentId);
    localStorage.setItem('escrow_payments', JSON.stringify(filteredEscrows));
  }

  // Search and filter functions
  searchTalentProfiles(query: string, filters?: {
    isActive?: boolean;
    specialties?: string[];
    languages?: string[];
    location?: string;
  }): TalentProfile[] {
    let profiles = this.getAllTalentProfiles();

    // Text search
    if (query) {
      const searchLower = query.toLowerCase();
      profiles = profiles.filter(profile =>
        profile.name.toLowerCase().includes(searchLower) ||
        profile.title.toLowerCase().includes(searchLower) ||
        profile.bio.toLowerCase().includes(searchLower) ||
        profile.specialties.some(s => s.toLowerCase().includes(searchLower)) ||
        profile.languages.some(l => l.toLowerCase().includes(searchLower))
      );
    }

    // Apply filters
    if (filters) {
      if (filters.isActive !== undefined) {
        profiles = profiles.filter(p => p.isActive === filters.isActive);
      }
      if (filters.specialties && filters.specialties.length > 0) {
        profiles = profiles.filter(p => 
          filters.specialties!.some(s => p.specialties.includes(s))
        );
      }
      if (filters.languages && filters.languages.length > 0) {
        profiles = profiles.filter(p => 
          filters.languages!.some(l => p.languages.includes(l))
        );
      }
      if (filters.location) {
        profiles = profiles.filter(p => 
          p.location.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }
    }

    return profiles;
  }

  searchClientPosts(query: string, filters?: {
    status?: string;
    category?: string;
    budget?: string;
    projectType?: string;
  }): ClientPost[] {
    let posts = this.getAllClientPosts();

    // Text search
    if (query) {
      const searchLower = query.toLowerCase();
      posts = posts.filter(post =>
        post.title.toLowerCase().includes(searchLower) ||
        post.description.toLowerCase().includes(searchLower) ||
        post.clientName.toLowerCase().includes(searchLower) ||
        post.category.toLowerCase().includes(searchLower)
      );
    }

    // Apply filters
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        posts = posts.filter(p => p.status === filters.status);
      }
      if (filters.category && filters.category !== 'all') {
        posts = posts.filter(p => p.category === filters.category);
      }
      if (filters.budget && filters.budget !== 'all') {
        posts = posts.filter(p => p.budget === filters.budget);
      }
      if (filters.projectType && filters.projectType !== 'all') {
        posts = posts.filter(p => p.projectType === filters.projectType);
      }
    }

    return posts;
  }
}

export const talentService = new TalentService();
export type { TalentProfile, ClientPost };