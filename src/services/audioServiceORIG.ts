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

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        reject(new Error('File size must be less than 50MB'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const audioElement = new Audio();
        audioElement.onloadedmetadata = () => {
          const audioFile: AudioFile = {
            id: `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            url: reader.result as string,
            duration: audioElement.duration,
            size: file.size,
            uploadedAt: new Date(),
            userId,
            projectId,
            type
          };

          // Store in localStorage (in production, this would be cloud storage)
          const existingFiles = this.getAudioFiles();
          existingFiles.push(audioFile);
          localStorage.setItem(this.storageKey, JSON.stringify(existingFiles));

          resolve(audioFile);
        };
        audioElement.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
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

  getProjectAudio(projectId: string): AudioFile[] {
    return this.getAudioFiles(undefined, projectId);
  }
}

export const audioService = new AudioService();
export type { AudioFile };
