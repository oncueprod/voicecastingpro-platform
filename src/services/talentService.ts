// talentService.ts - REAL TALENTS ONLY - NO MOCK DATA
export interface TalentProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  title: string;
  location: string;
  bio: string;
  skills: string[];
  hourlyRate?: string;
  rating?: number;
  reviewCount?: number;
  avatar?: string;
  coverImage?: string;
  languages?: string[];
  experience?: string;
  samples?: VoiceSample[];
  reviews?: Review[];
  responseTime?: string;
  completionRate?: string;
  totalJobs?: number;
  isRealUser: boolean; // CRITICAL: Only real users
  createdAt: string;
  updatedAt: string;
}

export interface VoiceSample {
  id: string;
  title: string;
  duration: string;
  url: string;
  category: string;
  description?: string;
}

export interface Review {
  id: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  date: string;
  projectType?: string;
}

class TalentService {
  private STORAGE_KEY = 'talent_profiles';

  constructor() {
    // Clean any existing mock data on initialization
    this.cleanMockData();
  }

  // Clean any mock data that might exist
  private cleanMockData(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const profiles = JSON.parse(stored);
        // Only keep profiles that are explicitly marked as real users
        const realProfiles = profiles.filter((profile: any) => 
          profile.isRealUser === true && 
          profile.userId && 
          profile.email
        );
        
        console.log(`🧹 Cleaned talent profiles: ${profiles.length} -> ${realProfiles.length} real users`);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(realProfiles));
      }
    } catch (error) {
      console.error('Error cleaning mock data:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // Get all REAL talent profiles only
  getAllTalentProfiles(): TalentProfile[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        console.log('📝 No talent profiles found in storage');
        return [];
      }

      const profiles = JSON.parse(stored);
      // STRICT FILTER: Only real users with required fields
      const realProfiles = profiles.filter((profile: any) => 
        profile.isRealUser === true &&
        profile.userId &&
        profile.email &&
        profile.name
      );

      console.log(`✅ Found ${realProfiles.length} REAL talent profiles`);
      return realProfiles;
    } catch (error) {
      console.error('Error getting talent profiles:', error);
      return [];
    }
  }

  // Get specific REAL talent profile by ID
  getTalentProfile(id: string): TalentProfile | null {
    try {
      const profiles = this.getAllTalentProfiles();
      const profile = profiles.find(p => p.id === id || p.userId === id);
      
      if (profile) {
        console.log(`✅ Found REAL talent profile for ID: ${id}`);
        return profile;
      } else {
        console.log(`❌ No REAL talent profile found for ID: ${id}`);
        return null;
      }
    } catch (error) {
      console.error('Error getting talent profile:', error);
      return null;
    }
  }

  // Create a new REAL talent profile
  createTalentProfile(userId: string, profileData: Partial<TalentProfile>): TalentProfile {
    try {
      const profiles = this.getAllTalentProfiles();
      
      // Check if user already has a talent profile
      const existingProfile = profiles.find(p => p.userId === userId);
      if (existingProfile) {
        throw new Error('User already has a talent profile');
      }

      const newProfile: TalentProfile = {
        id: `talent_${userId}_${Date.now()}`,
        userId,
        name: profileData.name || '',
        email: profileData.email || '',
        title: profileData.title || 'Voice Over Artist',
        location: profileData.location || '',
        bio: profileData.bio || '',
        skills: profileData.skills || [],
        hourlyRate: profileData.hourlyRate,
        rating: 0,
        reviewCount: 0,
        avatar: profileData.avatar,
        coverImage: profileData.coverImage,
        languages: profileData.languages || ['English'],
        experience: profileData.experience,
        samples: profileData.samples || [],
        reviews: profileData.reviews || [],
        responseTime: profileData.responseTime || '< 24 hours',
        completionRate: '100%',
        totalJobs: 0,
        isRealUser: true, // ALWAYS true for created profiles
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      profiles.push(newProfile);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
      
      console.log(`✅ Created REAL talent profile for user: ${userId}`);
      return newProfile;
    } catch (error) {
      console.error('Error creating talent profile:', error);
      throw error;
    }
  }

  // Update existing REAL talent profile
  updateTalentProfile(id: string, updates: Partial<TalentProfile>): TalentProfile | null {
    try {
      const profiles = this.getAllTalentProfiles();
      const profileIndex = profiles.findIndex(p => p.id === id || p.userId === id);
      
      if (profileIndex === -1) {
        console.log(`❌ No REAL talent profile found to update: ${id}`);
        return null;
      }

      const updatedProfile = {
        ...profiles[profileIndex],
        ...updates,
        isRealUser: true, // Always maintain as real user
        updatedAt: new Date().toISOString()
      };

      profiles[profileIndex] = updatedProfile;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
      
      console.log(`✅ Updated REAL talent profile: ${id}`);
      return updatedProfile;
    } catch (error) {
      console.error('Error updating talent profile:', error);
      return null;
    }
  }

  // Delete REAL talent profile
  deleteTalentProfile(id: string): boolean {
    try {
      const profiles = this.getAllTalentProfiles();
      const filteredProfiles = profiles.filter(p => p.id !== id && p.userId !== id);
      
      if (filteredProfiles.length === profiles.length) {
        console.log(`❌ No REAL talent profile found to delete: ${id}`);
        return false;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredProfiles));
      console.log(`✅ Deleted REAL talent profile: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting talent profile:', error);
      return false;
    }
  }

  // Get featured REAL talents (first 3)
  getFeaturedTalents(): TalentProfile[] {
    const allProfiles = this.getAllTalentProfiles();
    // Sort by rating and review count, take top 3
    return allProfiles
      .sort((a, b) => {
        const scoreA = (a.rating || 0) * (a.reviewCount || 0);
        const scoreB = (b.rating || 0) * (b.reviewCount || 0);
        return scoreB - scoreA;
      })
      .slice(0, 3);
  }

  // Search REAL talents
  searchTalents(query: string): TalentProfile[] {
    const allProfiles = this.getAllTalentProfiles();
    const lowercaseQuery = query.toLowerCase();
    
    return allProfiles.filter(profile => 
      profile.name.toLowerCase().includes(lowercaseQuery) ||
      profile.title.toLowerCase().includes(lowercaseQuery) ||
      profile.bio.toLowerCase().includes(lowercaseQuery) ||
      profile.skills.some(skill => skill.toLowerCase().includes(lowercaseQuery)) ||
      profile.location.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Filter REAL talents by criteria
  filterTalents(filters: {
    skills?: string[];
    location?: string;
    hourlyRateMin?: number;
    hourlyRateMax?: number;
    rating?: number;
  }): TalentProfile[] {
    let profiles = this.getAllTalentProfiles();

    if (filters.skills && filters.skills.length > 0) {
      profiles = profiles.filter(profile =>
        filters.skills!.some(skill =>
          profile.skills.some(profileSkill =>
            profileSkill.toLowerCase().includes(skill.toLowerCase())
          )
        )
      );
    }

    if (filters.location) {
      profiles = profiles.filter(profile =>
        profile.location.toLowerCase().includes(filters.location!.toLowerCase())
      );
    }

    if (filters.rating) {
      profiles = profiles.filter(profile =>
        (profile.rating || 0) >= filters.rating!
      );
    }

    return profiles;
  }

  // Get talent statistics
  getTalentStats(): {
    totalTalents: number;
    averageRating: number;
    totalReviews: number;
    topSkills: string[];
  } {
    const profiles = this.getAllTalentProfiles();
    
    const totalTalents = profiles.length;
    const averageRating = profiles.reduce((sum, p) => sum + (p.rating || 0), 0) / totalTalents || 0;
    const totalReviews = profiles.reduce((sum, p) => sum + (p.reviewCount || 0), 0);
    
    // Get top skills
    const skillCounts: { [key: string]: number } = {};
    profiles.forEach(profile => {
      profile.skills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });
    
    const topSkills = Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([skill]) => skill);

    return {
      totalTalents,
      averageRating,
      totalReviews,
      topSkills
    };
  }
}

// Export singleton instance
export const talentService = new TalentService();

// Named exports for convenience
export const {
  getAllTalentProfiles,
  getTalentProfile,
  createTalentProfile,
  updateTalentProfile,
  deleteTalentProfile,
  getFeaturedTalents,
  searchTalents,
  filterTalents,
  getTalentStats
} = talentService;