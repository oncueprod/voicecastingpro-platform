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
  storageType?: 'localStorage' | 'cloud'; // Track where the file is stored
}

interface CloudStorageConfig {
  provider: 'aws' | 'cloudinary' | 'vsp' | 'demo';
  endpoint?: string;
  credentials?: {
    accessKey?: string;
    secretKey?: string;
    region?: string;
  };
}

/**
 * Production-Ready Audio Service for VoiceConnect
 * 
 * Supports both demo mode (localStorage) and production mode (cloud storage)
 * Switch between modes by setting the storage provider
 */
class AudioService {
  private storageKey = 'audio_files';
  private isProduction = false; // Set to true for production deployment
  private cloudConfig: CloudStorageConfig = {
    provider: 'demo' // Change to 'vsp', 'aws', etc. for production
  };

  // Initialize with production settings
  configureCloudStorage(config: CloudStorageConfig): void {
    this.cloudConfig = config;
    this.isProduction = config.provider !== 'demo';
    console.log(`🚀 Audio service configured for ${this.isProduction ? 'PRODUCTION' : 'DEMO'} mode`);
  }

  async uploadAudio(
    file: File, 
    userId: string, 
    type: 'demo' | 'project_delivery' | 'revision',
    projectId?: string
  ): Promise<AudioFile> {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        reject(new Error('File must be an audio file'));
        return;
      }

      // File size limit
      if (file.size > 5 * 1024 * 1024) { // 5MB limit 
        reject(new Error('File size must be less than 5MB'));
        return;
      }

      // Check demo limit
      if (type === 'demo') {
        const existingDemos = this.getUserDemos(userId);
        if (existingDemos.length >= 5) {
          reject(new Error('Maximum of 5 demo files allowed. Please delete some existing demos first.'));
          return;
        }
      }

      if (this.isProduction) {
        // Production: Upload to cloud storage
        this.uploadToCloudStorage(file, userId, type, projectId, resolve, reject);
      } else {
        // Demo: Use localStorage with real audio for first 2 demos
        this.uploadToLocalStorage(file, userId, type, projectId, resolve, reject);
      }
    });
  }

  private async uploadToCloudStorage(
    file: File,
    userId: string,
    type: 'demo' | 'project_delivery' | 'revision',
    projectId: string | undefined,
    resolve: (value: AudioFile) => void,
    reject: (reason: Error) => void
  ): Promise<void> {
    try {
      const fileName = `${userId}/${type}/${Date.now()}_${file.name}`;
      let cloudUrl: string;

      // Route to appropriate cloud storage provider
      switch (this.cloudConfig.provider) {
        case 'vsp':
          cloudUrl = await this.uploadToVSP(file, fileName);
          break;
        case 'aws':
          cloudUrl = await this.uploadToAWS(file, fileName);
          break;
        case 'cloudinary':
          cloudUrl = await this.uploadToCloudinary(file, fileName);
          break;
        default:
          throw new Error('Cloud storage provider not configured');
      }

      // Get audio metadata
      const audioElement = new Audio();
      const dataUrl = URL.createObjectURL(file);
      
      audioElement.onloadedmetadata = () => {
        const audioFile: AudioFile = {
          id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          url: cloudUrl, // Real cloud storage URL
          duration: audioElement.duration,
          size: file.size,
          uploadedAt: new Date(),
          userId,
          projectId,
          type,
          storageType: 'cloud'
        };

        // Save metadata to database/localStorage
        this.saveAudioMetadata(audioFile, resolve, reject);
        URL.revokeObjectURL(dataUrl);
      };

      audioElement.onerror = () => {
        URL.revokeObjectURL(dataUrl);
        reject(new Error('Failed to load audio file metadata'));
      };

      audioElement.src = dataUrl;

    } catch (error: any) {
      reject(new Error(`Cloud upload failed: ${error.message}`));
    }
  }

  private uploadToLocalStorage(
    file: File,
    userId: string,
    type: 'demo' | 'project_delivery' | 'revision',
    projectId: string | undefined,
    resolve: (value: AudioFile) => void,
    reject: (reason: Error) => void
  ): void {
    const reader = new FileReader();
    
    reader.onload = () => {
      const audioElement = new Audio();
      const dataUrl = reader.result as string;
      
      audioElement.onloadedmetadata = () => {
        // Demo mode: First 2 demos get real audio, rest get sample audio
        const existingUserDemos = this.getUserDemos(userId);
        const shouldStoreActualAudio = existingUserDemos.length < 2;
        
        const audioFile: AudioFile = {
          id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          url: shouldStoreActualAudio ? dataUrl : this.getSampleAudioUrl(),
          duration: audioElement.duration || 30,
          size: file.size,
          uploadedAt: new Date(),
          userId,
          projectId,
          type,
          storageType: 'localStorage'
        };

        this.saveAudioMetadata(audioFile, resolve, reject);
      };
      
      audioElement.onerror = () => {
        reject(new Error('Failed to load audio file. Please try a different audio format.'));
      };

      audioElement.src = dataUrl;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  }

  // VSP Storage Integration (implement with your VSP API)
  private async uploadToVSP(file: File, fileName: string): Promise<string> {
    // TODO: Implement VSP upload logic
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);

    const response = await fetch('/api/vsp/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`VSP upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.url; // Return the VSP URL
  }

  // AWS S3 Integration (alternative cloud storage)
  private async uploadToAWS(file: File, fileName: string): Promise<string> {
    // TODO: Implement AWS S3 upload logic
    // This would use AWS SDK or presigned URLs
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', fileName);

    const response = await fetch('/api/aws/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`AWS upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.url; // Return the S3 URL
  }

  // Cloudinary Integration (alternative cloud storage)
  private async uploadToCloudinary(file: File, fileName: string): Promise<string> {
    // TODO: Implement Cloudinary upload logic
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'voice_demos'); // Configure in Cloudinary

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/video/upload`, 
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.secure_url; // Return the Cloudinary URL
  }

  private saveAudioMetadata(
    audioFile: AudioFile,
    resolve: (value: AudioFile) => void,
    reject: (reason: Error) => void
  ): void {
    try {
      const existingFiles = this.getAudioFiles();
      
      // Enforce demo limit
      if (audioFile.type === 'demo') {
        const userDemos = existingFiles.filter(f => f.userId === audioFile.userId && f.type === 'demo');
        if (userDemos.length >= 5) {
          reject(new Error('Maximum of 5 demo files allowed. Please delete some existing demos first.'));
          return;
        }
      }

      const newFiles = [...existingFiles, audioFile];
      localStorage.setItem(this.storageKey, JSON.stringify(newFiles));
      
      console.log(`✅ Audio file uploaded successfully: ${audioFile.name}`);
      console.log(`📁 Storage: ${audioFile.storageType === 'cloud' ? 'Cloud Storage' : 'Local Storage'}`);
      
      resolve(audioFile);
      
    } catch (error: any) {
      reject(new Error('Failed to save audio metadata: ' + error.message));
    }
  }

  private getAuthToken(): string {
    // Get authentication token from your auth system
    return localStorage.getItem('auth_token') || '';
  }

  getAudioFiles(userId?: string, projectId?: string): AudioFile[] {
    try {
      const files = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return files.filter((file: AudioFile) => {
        if (userId && file.userId !== userId) return false;
        if (projectId && file.projectId !== projectId) return false;
        return true;
      });
    } catch (error) {
      console.error('Error reading audio files:', error);
      return [];
    }
  }

  deleteAudioFile(fileId: string, userId: string): boolean {
    try {
      const files = this.getAudioFiles();
      const file = files.find(f => f.id === fileId && f.userId === userId);
      
      if (!file) return false;

      // Delete from cloud storage if applicable
      if (this.isProduction && file.storageType === 'cloud') {
        this.deleteFromCloudStorage(file.url);
      }

      // Remove from metadata
      const remainingFiles = files.filter(f => f.id !== fileId);
      localStorage.setItem(this.storageKey, JSON.stringify(remainingFiles));
      
      console.log(`✅ Audio file deleted: ${fileId}`);
      return true;
    } catch (error) {
      console.error('Error deleting audio file:', error);
      return false;
    }
  }

  private async deleteFromCloudStorage(fileUrl: string): Promise<void> {
    try {
      // Implement cloud storage deletion based on provider
      await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({ url: fileUrl })
      });
    } catch (error) {
      console.error('Failed to delete from cloud storage:', error);
    }
  }

  getAudioFile(fileId: string): AudioFile | null {
    const files = this.getAudioFiles();
    return files.find(f => f.id === fileId) || null;
  }

  getUserDemos(userId: string): AudioFile[] {
    return this.getAudioFiles(userId).filter(f => f.type === 'demo');
  }
  
  // Sample audio for demo purposes
  getSampleAudioUrl(): string {
    const sampleRate = 44100;
    const duration = 1;
    const frequency = 440;
    const samples = sampleRate * duration;
    
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    return `data:audio/wav;base64,${base64}`;
  }

  getProjectAudio(projectId: string): AudioFile[] {
    return this.getAudioFiles(undefined, projectId);
  }

  clearUserDemos(userId: string): boolean {
    try {
      const files = this.getAudioFiles();
      const remainingFiles = files.filter(f => !(f.userId === userId && f.type === 'demo'));
      localStorage.setItem(this.storageKey, JSON.stringify(remainingFiles));
      console.log(`✅ Cleared all demos for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to clear user demos:', error);
      return false;
    }
  }

  getStorageInfo(): { used: string; files: number; demos: number; mode: string } {
    try {
      const allData = localStorage.getItem(this.storageKey) || '[]';
      const files = JSON.parse(allData);
      const demos = files.filter((f: AudioFile) => f.type === 'demo');
      
      return {
        used: `${(allData.length / 1024).toFixed(2)}KB`,
        files: files.length,
        demos: demos.length,
        mode: this.isProduction ? 'Production (Cloud)' : 'Demo (Local)'
      };
    } catch (error) {
      return { used: 'Error', files: 0, demos: 0, mode: 'Error' };
    }
  }

  // Initialize for production use
  static initializeForProduction(provider: 'vsp' | 'aws' | 'cloudinary', config?: any): AudioService {
    const service = new AudioService();
    service.configureCloudStorage({
      provider,
      ...config
    });
    return service;
  }
}

export const audioService = new AudioService();
export type { AudioFile, CloudStorageConfig };