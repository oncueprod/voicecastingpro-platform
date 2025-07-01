interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
  userId: string;
  conversationId: string;
  messageId?: string;
}

class FileService {
  private storageKey = 'file_attachments';
  private maxFileSize = 50 * 1024 * 1024; // 50MB
  private allowedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Audio
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
    // Documents
    'application/pdf', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel' // .xls
  ];

  async uploadFile(
    file: File,
    userId: string,
    conversationId: string,
    messageId?: string
  ): Promise<FileAttachment> {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!this.allowedTypes.includes(file.type)) {
        reject(new Error(`File type ${file.type} is not supported. Allowed types: images (jpg, png, gif), audio (mp3, wav), documents (pdf, docx, txt)`));
        return;
      }

      // Validate file size
      if (file.size > this.maxFileSize) {
        reject(new Error(`File size must be less than ${this.maxFileSize / (1024 * 1024)}MB`));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const attachment: FileAttachment = {
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result as string,
          uploadedAt: new Date(),
          userId,
          conversationId,
          messageId
        };

        // Store in localStorage (in production, this would be cloud storage)
        const existingFiles = this.getFiles();
        existingFiles.push(attachment);
        localStorage.setItem(this.storageKey, JSON.stringify(existingFiles));

        resolve(attachment);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  getFiles(conversationId?: string): FileAttachment[] {
    const files = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    return files.filter((file: FileAttachment) => {
      if (conversationId && file.conversationId !== conversationId) return false;
      return true;
    }).map((file: any) => ({
      ...file,
      uploadedAt: new Date(file.uploadedAt)
    }));
  }

  deleteFile(fileId: string, userId: string): boolean {
    const files = this.getFiles();
    const fileIndex = files.findIndex(f => f.id === fileId && f.userId === userId);
    
    if (fileIndex === -1) return false;

    files.splice(fileIndex, 1);
    localStorage.setItem(this.storageKey, JSON.stringify(files));
    return true;
  }

  getFileById(fileId: string): FileAttachment | null {
    const files = this.getFiles();
    return files.find(f => f.id === fileId) || null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('audio/')) return '🎵';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type === 'text/plain') return '📄';
    return '📎';
  }

  isImage(type: string): boolean {
    return type.startsWith('image/');
  }

  isAudio(type: string): boolean {
    return type.startsWith('audio/');
  }
}

export const fileService = new FileService();
export type { FileAttachment };