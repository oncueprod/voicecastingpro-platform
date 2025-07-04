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
      
      if (profiles.length === 0) {
        return this.initializeMockTalentProfiles();
      }
      
      // Filter out duplicates by ID using Map
      const uniqueProfiles = Array.from(
        new Map(profiles.map((profile: TalentProfile) => [profile.id, profile])).values()
      );
      
      return uniqueProfiles.map((profile: any) => ({
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
      // Create new profile if it doesn't exist
      const newProfile = {
        id,
        ...updates,
        createdAt: new Date(),
        updatedAt: new Date()
      } as TalentProfile;
      
      profiles.push(newProfile);
      localStorage.setItem(this.talentStorageKey, JSON.stringify(profiles));
      
      // Dispatch storage event to notify other components
      window.dispatchEvent(new StorageEvent('storage', {
        key: this.talentStorageKey,
        newValue: JSON.stringify(profiles)
      }));
      
      return newProfile;
    }

    profiles[profileIndex] = {
      ...profiles[profileIndex],
      ...updates,
      updatedAt: new Date()
    };

    // Remove duplicates before saving
    const uniqueProfiles = Array.from(
      new Map(profiles.map((profile: TalentProfile) => [profile.id, profile])).values()
    );

    localStorage.setItem(this.talentStorageKey, JSON.stringify(uniqueProfiles));
    
    // Dispatch storage event to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: this.talentStorageKey,
      newValue: JSON.stringify(uniqueProfiles)
    }));
    
    return profiles[profileIndex];
  }

  deleteTalentProfile(id: string): boolean {
    try {
      console.log(`Attempting to delete talent profile with ID: ${id}`);
      const profiles = this.getAllTalentProfiles();
      const profileIndex = profiles.findIndex(p => p.id === id);
      
      if (profileIndex === -1) {
        console.error(`Talent profile with ID ${id} not found`);
        return false;
      }

      // Get the userId before deleting the profile
      const userId = profiles[profileIndex].userId;
      console.log(`Found talent profile at index ${profileIndex} with userId: ${userId}`);
      
      // Remove the profile
      profiles.splice(profileIndex, 1);
      localStorage.setItem(this.talentStorageKey, JSON.stringify(profiles));
      console.log(`Deleted talent profile from storage, remaining profiles: ${profiles.length}`);
      
      // Dispatch storage event to notify other components
      window.dispatchEvent(new StorageEvent('storage', {
        key: this.talentStorageKey,
        newValue: JSON.stringify(profiles)
      }));
      
      // Clean up related data
      if (userId) {
        this.cleanupTalentData(userId);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting talent profile:', error);
      return false;
    }
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
      
      if (posts.length === 0) {
        return this.initializeMockClientPosts();
      }
      
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
    try {
      const posts = this.getAllClientPosts();
      const postIndex = posts.findIndex(p => p.id === id);
      
      if (postIndex === -1) {
        return false;
      }

      posts.splice(postIndex, 1);
      localStorage.setItem(this.postsStorageKey, JSON.stringify(posts));
      return true;
    } catch (error) {
      console.error('Error deleting client post:', error);
      return false;
    }
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
      },
      {
        id: 'talent_004',
        userId: 'user_talent_004',
        name: 'David Chen',
        title: 'Corporate Narrator',
        location: 'Toronto, Canada',
        rating: 4.9,
        reviews: 203,
        responseTime: '3 hours',
        priceRange: '$180-350',
        image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
        specialties: ['Corporate', 'E-Learning', 'Professional'],
        languages: ['English (US)', 'Mandarin'],
        badge: 'Pro Voice',
        bio: 'Professional voice artist specializing in corporate and e-learning content.',
        experience: '7+ years',
        completedProjects: 320,
        repeatClients: 88,
        equipment: ['Rode NT1', 'Universal Audio Interface', 'Logic Pro', 'Professional Studio'],
        demos: [
          { id: 'demo_007', name: 'Corporate Explainer', duration: 60, type: 'Corporate' },
          { id: 'demo_008', name: 'E-Learning Module', duration: 90, type: 'E-Learning' }
        ],
        isActive: true,
        createdAt: new Date('2024-01-12'),
        updatedAt: new Date('2024-01-19')
      },
      {
        id: 'talent_005',
        userId: 'user_talent_005',
        name: 'Sophie Laurent',
        title: 'International Voice Talent',
        location: 'Paris, France',
        rating: 4.7,
        reviews: 134,
        responseTime: '5 hours',
        priceRange: '$120-280',
        image: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400',
        specialties: ['Multilingual', 'Commercial', 'Elegant & Sophisticated'],
        languages: ['French', 'English (UK)', 'Italian'],
        badge: 'International',
        bio: 'Multilingual voice artist with a sophisticated European sound.',
        experience: '6+ years',
        completedProjects: 180,
        repeatClients: 75,
        equipment: ['Neumann TLM 103', 'RME Babyface', 'Pro Tools', 'Treated Room'],
        demos: [
          { id: 'demo_009', name: 'French Commercial', duration: 45, type: 'Commercial' },
          { id: 'demo_010', name: 'English Narration', duration: 60, type: 'Narration' }
        ],
        isActive: true,
        createdAt: new Date('2024-01-08'),
        updatedAt: new Date('2024-01-16')
      },
      {
        id: 'talent_006',
        userId: 'user_talent_006',
        name: 'James Wilson',
        title: 'Documentary Voice Over',
        location: 'Sydney, Australia',
        rating: 4.8,
        reviews: 156,
        responseTime: '4 hours',
        priceRange: '$160-320',
        image: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400',
        specialties: ['Documentary', 'Narration', 'Authoritative'],
        languages: ['English (AU)', 'English (UK)'],
        badge: 'Documentary Pro',
        bio: 'Specialized in documentary narration with a warm, authoritative tone.',
        experience: '9+ years',
        completedProjects: 220,
        repeatClients: 82,
        equipment: ['Sennheiser MKH 416', 'Audient iD14', 'Adobe Audition', 'Professional Booth'],
        demos: [
          { id: 'demo_011', name: 'Nature Documentary', duration: 90, type: 'Documentary' },
          { id: 'demo_012', name: 'Historical Narration', duration: 75, type: 'Narration' }
        ],
        isActive: true,
        createdAt: new Date('2024-01-07'),
        updatedAt: new Date('2024-01-14')
      }
    ];

    // Filter out duplicates by ID using Map
    const uniqueProfiles = Array.from(
      new Map(mockProfiles.map(profile => [profile.id, profile])).values()
    );

    localStorage.setItem(this.talentStorageKey, JSON.stringify(uniqueProfiles));
    
    // Dispatch storage event to notify other components
    window.dispatchEvent(new StorageEvent('storage', {
      key: this.talentStorageKey,
      newValue: JSON.stringify(uniqueProfiles)
    }));
    
    return uniqueProfiles;
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
    console.log(`Cleaning up data for talent ID: ${talentId}`);
    
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
    
    // Remove talent audio files
    const audioFiles = JSON.parse(localStorage.getItem('audio_files') || '[]');
    const filteredAudioFiles = audioFiles.filter((a: any) => a.userId !== talentId);
    localStorage.setItem('audio_files', JSON.stringify(filteredAudioFiles));
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