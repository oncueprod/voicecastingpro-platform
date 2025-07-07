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
}

class AudioService {
  private storageKey = 'audio_files';

  async uploadAudio(
    file: File, 
    userId: string, 
    type: 'demo' | 'project_delivery' | 'revision',
    projectId?: string
  ): Promise<AudioFile> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('audio/')) {
        reject(new Error('File must be an audio file'));
        return;
      }
 
      // Reduced file size limit to 2MB to fit in localStorage
      if (file.size > 2 * 1024 * 1024) { // 2MB limit (was 5MB)
        reject(new Error('File size must be less than 2MB for demo purposes'));
        return;
      }

      // Check if we already have 3 demos for this user (reduced from 5)
      if (type === 'demo') {
        const existingDemos = this.getUserDemos(userId);
        if (existingDemos.length >= 3) {
          reject(new Error('Maximum of 3 demo files allowed due to storage limitations. Please delete some existing demos first.'));
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        const audioElement = new Audio();
        
        try {
          const dataUrl = reader.result as string;
          
          // Check if this single file would exceed reasonable storage size
          const estimatedSize = dataUrl.length;
          if (estimatedSize > 1.5 * 1024 * 1024) { // 1.5MB base64 limit
            reject(new Error('Audio file too large when encoded. Please use a smaller file or shorter duration.'));
            return;
          }
          
          audioElement.src = dataUrl;

          audioElement.onloadedmetadata = () => {
            const audioFile: AudioFile = {
              id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              url: dataUrl,
              duration: audioElement.duration || 30,
              size: file.size,
              uploadedAt: new Date(),
              userId,
              projectId,
              type
            };

            // Store in localStorage with better error handling
            try {
              const existingFiles = this.getAudioFiles();
              
              // For demo files, enforce a maximum of 3 per user
              if (type === 'demo') {
                const userDemos = existingFiles.filter(f => f.userId === userId && f.type === 'demo');
                if (userDemos.length >= 3) {
                  reject(new Error('Maximum of 3 demo files allowed. Please delete some existing demos first.'));
                  return;
                }
              }

              // Add the new file
              const newFiles = [...existingFiles, audioFile];
              
              // Check total storage size before saving
              const totalSize = JSON.stringify(newFiles).length;
              console.log(`Storage size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
              
              if (totalSize > 4 * 1024 * 1024) { // 4MB total limit
                reject(new Error('Total storage limit reached. Please delete some existing audio files first.'));
                return;
              }

              // Try to save to localStorage
              localStorage.setItem(this.storageKey, JSON.stringify(newFiles));
              console.log(`✅ Audio file uploaded successfully: ${audioFile.name}`);
              resolve(audioFile);
              
            } catch (storageError: any) {
              console.error('Storage error:', storageError);
              
              if (storageError.name === 'QuotaExceededError') {
                // More helpful error message
                reject(new Error('Browser storage is full. Please:\n1. Delete some existing audio files\n2. Use smaller audio files (under 1MB)\n3. Clear browser cache'));
              } else {
                reject(new Error('Failed to save audio file: ' + storageError.message));
              }
            }
          };
          
          audioElement.onerror = (e) => {
            console.error('Audio element error:', e);
            reject(new Error('Failed to load audio file. Please try a different audio format.'));
          };
          
        } catch (error) {
          console.error('Error processing audio file:', error);
          reject(new Error('Failed to process audio file'));
        }
        
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
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
      const fileIndex = files.findIndex(f => f.id === fileId && f.userId === userId);
      
      if (fileIndex === -1) return false;

      files.splice(fileIndex, 1);
      localStorage.setItem(this.storageKey, JSON.stringify(files));
      console.log(`✅ Audio file deleted: ${fileId}`);
      return true;
    } catch (error) {
      console.error('Error deleting audio file:', error);
      return false;
    }
  }

  getAudioFile(fileId: string): AudioFile | null {
    const files = this.getAudioFiles();
    return files.find(f => f.id === fileId) || null;
  }

  getUserDemos(userId: string): AudioFile[] {
    return this.getAudioFiles(userId).filter(f => f.type === 'demo');
  }
  
  // Get a sample URL for demo purposes
  getSampleAudioUrl(): string {
    // Return a data URL for a simple audio tone that works in all browsers
    const sampleRate = 44100;
    const duration = 1; // 1 second
    const frequency = 440; // A4 note
    const samples = sampleRate * duration;
    
    // Create a simple WAV file data URL
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
    
    // Generate sine wave
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    
    // Convert to base64 data URL
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

  // Clear all demos for a user
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

  // Get storage info for debugging
  getStorageInfo(): { used: string; files: number; demos: number } {
    try {
      const allData = localStorage.getItem(this.storageKey) || '[]';
      const files = JSON.parse(allData);
      const demos = files.filter((f: AudioFile) => f.type === 'demo');
      
      return {
        used: `${(allData.length / 1024 / 1024).toFixed(2)}MB`,
        files: files.length,
        demos: demos.length
      };
    } catch (error) {
      return { used: 'Error', files: 0, demos: 0 };
    }
  }
}

export const audioService = new AudioService();
export type { AudioFile };