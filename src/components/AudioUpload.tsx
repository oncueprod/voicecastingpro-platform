import React, { useState, useRef } from 'react';
import { Upload, Play, Pause, Trash2, Download, Music } from 'lucide-react';
import { motion } from 'framer-motion';
import { audioService, AudioFile } from '../services/audioService';

interface AudioUploadProps {
  userId: string;
  projectId?: string;
  type: 'demo' | 'project_delivery' | 'revision';
  onUploadComplete?: (file: AudioFile) => void;
  maxFiles?: number;
  title?: string;
}

const AudioUpload: React.FC<AudioUploadProps> = ({
  userId,
  projectId,
  type,
  onUploadComplete,
  maxFiles = 5,
  title = 'Upload Audio Files'
}) => {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  React.useEffect(() => {
    loadFiles();
  }, [userId, projectId, type]);

  const loadFiles = () => {
    const userFiles = audioService.getAudioFiles(userId, projectId)
      .filter(f => f.type === type);
    setFiles(userFiles);
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    setUploadError(null);
    
    // Check if we're at or over the limit
    if (files.length >= maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed. Please delete some existing files first.`);
      return;
    }
    
    // Calculate how many more files we can add
    const remainingSlots = maxFiles - files.length;
    const filesToProcess = Math.min(remainingSlots, selectedFiles.length);
    
    if (filesToProcess < selectedFiles.length) {
      setUploadError(`Only adding ${filesToProcess} files to stay within the limit of ${maxFiles} files.`);
    }

    setUploading(true);

    try {
      // Process files one by one to handle potential storage errors
      for (let i = 0; i < filesToProcess; i++) {
        const file = selectedFiles[i];
        try {
          const audioFile = await audioService.uploadAudio(file, userId, type, projectId);
          setFiles(prev => [...prev, audioFile]);
          if (onUploadComplete) onUploadComplete(audioFile);
        } catch (error) {
          if (error instanceof Error) {
            setUploadError(`Error uploading file: ${error.message}`);
            break; // Stop processing more files
          }
        }
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const playPause = (fileId: string, url: string) => {
    const currentAudio = audioRefs.current.get(playingId || '');
    
    if (playingId === fileId) {
      // Pause current
      if (currentAudio) {
        currentAudio.pause();
      }
      setPlayingId(null);
    } else {
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      // Play new audio
      let audio = audioRefs.current.get(fileId);
      if (!audio) {
        audio = new Audio(url);
        audioRefs.current.set(fileId, audio);
        audio.addEventListener('ended', () => setPlayingId(null));
      }
      
      audio.play();
      setPlayingId(fileId);
    }
  };

  const deleteFile = (fileId: string) => {
    if (audioService.deleteAudioFile(fileId, userId)) {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      
      // Stop and remove audio if playing
      if (playingId === fileId) {
        const audio = audioRefs.current.get(fileId);
        if (audio) {
          audio.pause();
          audioRefs.current.delete(fileId);
        }
        setPlayingId(null);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className="text-sm text-gray-400 whitespace-nowrap">
          {files.length}/{maxFiles} files {files.length >= maxFiles && '(maximum reached)'}
        </span>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-500/10'
            : files.length >= maxFiles ? 'border-gray-500 bg-gray-700/30 opacity-50' : 'border-gray-600 hover:border-blue-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        
        <div className="space-y-4">
          <div className="bg-slate-700 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <Music className="h-8 w-8 text-gray-400" />
          </div>
          
          <div>
            {files.length < maxFiles ? (
              <>
                <p className="text-white font-medium mb-2">
                  Drop audio files here or{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs sm:text-sm text-gray-400">
                  Supports MP3, WAV, M4A (Max 2MB per file)
                </p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Maximum {maxFiles} files allowed
                </p>
              </>
            ) : (
              <>
                <p className="text-yellow-400 font-medium mb-2">
                  Maximum number of files reached ({maxFiles})
                </p>
                <p className="text-sm text-gray-400">
                  Delete existing files to upload more
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Maximum Files Warning */}
      {files.length >= maxFiles && (
        <div className="mt-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3 text-center">
          <p className="text-yellow-300 text-xs sm:text-sm">
            <strong>Note:</strong> You've reached the maximum of {maxFiles} audio files.
            To upload more, please delete some existing files.
          </p>
        </div>
      )}
      
      {/* Error Message */}
      {uploadError && (
        <div className="mt-3 bg-red-900/30 border border-red-600/50 rounded-lg p-3 text-center">
          <p className="text-red-300 text-xs sm:text-sm">
            <strong>Error:</strong> {uploadError}
          </p>
        </div>
      )}

      {/* Uploading State */}
      {uploading && (
        <div className="mt-4 bg-slate-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            <span className="text-white">Uploading files...</span>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3 mt-4">
          {files.map((file) => (
            <motion.div
              key={file.id}
              className="bg-slate-800 rounded-lg p-4 border border-gray-700"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <motion.button
                    onClick={() => playPause(file.id, file.url)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {playingId === file.id ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </motion.button>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-4 text-xs sm:text-sm text-gray-400">
                      <span>{formatDuration(file.duration)}</span>
                      <span>{formatFileSize(file.size)}</span>
                      <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <motion.button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = file.url;
                      link.download = file.name;
                      link.click();
                    }}
                    className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Download className="h-4 w-4" />
                  </motion.button>
                  
                  <motion.button
                    onClick={() => deleteFile(file.id)}
                    className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-slate-700 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AudioUpload;