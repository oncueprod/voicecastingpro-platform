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

      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        reject(new Error('File size must be less than 2MB'));
        return;
      }

      // Check if we already have 5 demos for this user
      if (type === 'demo') {
        const existingDemos = this.getUserDemos(userId);
        if (existingDemos.length >= 5) {
          reject(new Error('Maximum of 5 demo files allowed. Please delete some existing demos first.'));
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        const audioElement = new Audio();
        
        // Create a smaller audio element for metadata only
        try {
          const dataUrl = reader.result as string;
          audioElement.src = dataUrl;

          audioElement.onloadedmetadata = () => {
            const audioFile: AudioFile = {
              id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: file.name,
              url: dataUrl,
              duration: audioElement.duration || 30, // Default to 30 seconds if duration can't be determined
              size: file.size,
              uploadedAt: new Date(),
              userId,
              projectId,
              type
            };

            // Store in localStorage (in production, this would be cloud storage)
            try {
              const existingFiles = this.getAudioFiles();
              
              // For demo files, enforce a maximum of 5 per user
              if (type === 'demo') {
                const userDemos = existingFiles.filter(f => f.userId === userId && f.type === 'demo');
                if (userDemos.length >= 5) {
                  throw new Error('Maximum of 5 demo files allowed. Please delete some existing demos first.');
                }
              }

              // Add the new file
              existingFiles.push(audioFile);

              // Try to save to localStorage
              try {
                localStorage.setItem(this.storageKey, JSON.stringify(existingFiles));
                resolve(audioFile);
              } catch (storageError) {
                // Handle storage quota exceeded error
                console.error('Storage error:', storageError);
                
                // If storage error, try to save just this file by removing all other files for this user
                const otherUserFiles = existingFiles.filter(f => f.userId !== userId);
                const justThisFile = [audioFile];
                
                try {
                  localStorage.setItem(this.storageKey, JSON.stringify([...otherUserFiles, ...justThisFile]));
                  resolve(audioFile);
                } catch (finalError) {
                  reject(new Error('Storage quota exceeded. Try using smaller audio files or delete existing ones.'));
                }
              }
            } catch (error) {
              reject(error);
            }
          };
          
          // Handle errors in audio loading
          audioElement.onerror = (e) => {
            console.error('Audio element error:', e);
            reject(new Error('Failed to load audio file'));
          };
        } catch (error) {
          console.error('Error creating audio element:', error);
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
    const files = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    return files.filter((file: AudioFile) => {
      if (userId && file.userId !== userId) return false;
      if (projectId && file.projectId !== projectId) return false;
      return true;
    });
  }

  deleteAudioFile(fileId: string, userId: string): boolean {
    const files = this.getAudioFiles();
    const fileIndex = files.findIndex(f => f.id === fileId && f.userId === userId);
    
    if (fileIndex === -1) return false;

    files.splice(fileIndex, 1);
    localStorage.setItem(this.storageKey, JSON.stringify(files));
    return true;
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
    // This creates a 1-second 440Hz sine wave tone
    const sampleRate = 44100;
    const duration = 1; // 1 second
    const frequency = 440; // A4 note
    const samples = sampleRate * duration;
    
    // Create a simple WAV file data URL
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV header
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
      return true;
    } catch (error) {
      console.error('Failed to clear user demos:', error);
      return false;
    }
  }
}

export const audioService = new AudioService();
export type { AudioFile };