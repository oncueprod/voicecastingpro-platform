interface AudioFile {
  id: string;
  name: string;
  url: string;
  duration: number;
  size: number;
  uploadedAt: Date;
  userId: string;
  projectId?: string;
  type: 'demo' | 'project_delivery' | 'revision';
  title?: string;
  description?: string;
  category?: string;
}

class AudioService {
  private apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // Get auth token from localStorage
  private getAuthToken(): string | null {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  }

  // Get auth headers
  private getAuthHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async uploadAudio(
    file: File, 
    userId: string, 
    type: 'demo' | 'project_delivery' | 'revision',
    projectId?: string,
    options?: {
      title?: string;
      description?: string;
      category?: string;
      duration?: number;
    }
  ): Promise<AudioFile> {
    try {
      if (!file.type.startsWith('audio/')) {
        throw new Error('File must be an audio file');
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('File size must be less than 50MB');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('type', type);
      
      if (projectId) {
        formData.append('projectId', projectId);
      }
      
      if (options?.title) {
        formData.append('title', options.title);
      }
      
      if (options?.description) {
        formData.append('description', options.description);
      }
      
      if (options?.category) {
        formData.append('category', options.category);
      }
      
      if (options?.duration) {
        formData.append('duration', options.duration.toString());
      }

      // Upload to backend
      const response = await fetch(`${this.apiUrl}/upload/audio`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Convert to AudioFile interface
      const audioFile: AudioFile = {
        id: result.file.id,
        name: result.file.name,
        url: result.file.url,
        duration: result.file.duration || 0,
        size: result.file.size,
        uploadedAt: new Date(result.file.uploadedAt),
        userId: result.file.userId,
        projectId: result.file.projectId,
        type: result.file.type,
        title: options?.title,
        description: options?.description,
        category: options?.category
      };

      return audioFile;

    } catch (error) {
      console.error('Audio upload error:', error);
      throw error instanceof Error ? error : new Error('Upload failed');
    }
  }

  async getAudioFiles(userId?: string, projectId?: string): Promise<AudioFile[]> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        console.warn('No auth token found, returning empty array');
        return [];
      }

      // If no userId provided, try to get from token
      if (!userId) {
        try {
          const tokenData = JSON.parse(atob(token.split('.')[1]));
          userId = tokenData.userId;
        } catch (e) {
          console.warn('Could not parse user ID from token');
          return [];
        }
      }

      if (!userId) {
        return [];
      }

      let url = `${this.apiUrl}/upload/audio/${userId}`;
      const params = new URLSearchParams();
      
      if (projectId) {
        params.append('projectId', projectId);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.error('Failed to fetch audio files:', response.status);
        return [];
      }

      const result = await response.json();
      
      if (!result.success) {
        console.error('Failed to fetch audio files:', result.error);
        return [];
      }

      // Convert to AudioFile interface
      return result.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        url: file.url,
        duration: file.duration || 0,
        size: file.size,
        uploadedAt: new Date(file.uploadedAt),
        userId: file.userId,
        projectId: file.projectId,
        type: file.type,
        title: file.title,
        description: file.description,
        category: file.category
      }));

    } catch (error) {
      console.error('Get audio files error:', error);
      return [];
    }
  }

  async deleteAudioFile(fileId: string, userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/upload/${fileId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        console.error('Failed to delete audio file:', response.status);
        return false;
      }

      const result = await response.json();
      return result.success;

    } catch (error) {
      console.error('Delete audio file error:', error);
      return false;
    }
  }

  getAudioFile(fileId: string): AudioFile | null {
    // Since we're now using backend storage, we'd need to implement a separate API call
    // For now, this method is not actively used, but keeping for compatibility
    console.warn('getAudioFile not implemented for backend storage');
    return null;
  }

  async getUserDemos(userId: string): Promise<AudioFile[]> {
    const files = await this.getAudioFiles(userId);
    return files.filter(f => f.type === 'demo');
  }

  async getProjectAudio(projectId: string): Promise<AudioFile[]> {
    const files = await this.getAudioFiles(undefined, projectId);
    return files;
  }

  // Utility method to get ImageKit optimized URLs
  getOptimizedAudioUrl(url: string, options?: {
    quality?: number;
    format?: string;
  }): string {
    if (!url.includes('ik.imagekit.io')) {
      return url; // Not an ImageKit URL
    }

    const params = new URLSearchParams();
    
    if (options?.quality) {
      params.append('tr', `q-${options.quality}`);
    }
    
    if (options?.format) {
      params.append('tr', `f-${options.format}`);
    }

    return params.toString() ? `${url}?${params.toString()}` : url;
  }

  // Method to get audio metadata/waveform thumbnail (future enhancement)
  getAudioThumbnailUrl(url: string): string {
    if (!url.includes('ik.imagekit.io')) {
      return url;
    }
    
    // For audio files, we might want to generate a waveform image
    // This would require server-side processing, but ImageKit can store the waveform image
    return `${url}?tr=w-300,h-100`; // Placeholder for future waveform functionality
  }
}

export const audioService = new AudioService();
export type { AudioFile };