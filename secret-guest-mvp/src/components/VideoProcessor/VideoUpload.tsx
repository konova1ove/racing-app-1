import React, { useCallback, useState, useRef } from 'react';
import { Upload, Video, Play, FileX } from 'lucide-react';
import { VIDEO_CONSTRAINTS, ERROR_MESSAGES } from '../../constants';

interface VideoUploadProps {
  onVideoSelect: (file: File) => void;
  selectedFile: File | null;
  onStartProcessing: () => void;
  disabled: boolean;
}

const VideoUpload: React.FC<VideoUploadProps> = ({
  onVideoSelect,
  selectedFile,
  onStartProcessing,
  disabled
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Validate video file
  const validateVideoFile = useCallback(async (file: File): Promise<string | null> => {
    // Check file size
    if (file.size > VIDEO_CONSTRAINTS.maxFileSize) {
      return ERROR_MESSAGES.upload.fileTooBig;
    }

    // Check file format
    if (!VIDEO_CONSTRAINTS.supportedFormats.includes(file.type)) {
      return ERROR_MESSAGES.upload.invalidFormat;
    }

    // Check video duration
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        
        if (duration > VIDEO_CONSTRAINTS.maxDuration) {
          resolve(ERROR_MESSAGES.upload.videoTooLong);
        } else if (duration < VIDEO_CONSTRAINTS.minDuration) {
          resolve(ERROR_MESSAGES.upload.videoTooShort);
        } else {
          resolve(null);
        }
      };
      
      video.onerror = () => {
        resolve(ERROR_MESSAGES.upload.invalidFormat);
      };
      
      video.src = URL.createObjectURL(file);
    });
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setValidationError(null);
    
    const error = await validateVideoFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
    
    onVideoSelect(file);
  }, [onVideoSelect, validateVideoFile]);

  // Handle file input change
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Open file picker
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Remove selected file
  const removeFile = useCallback(() => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    setValidationError(null);
    onVideoSelect(null as any);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [videoPreview, onVideoSelect]);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return (
    <div className="space-y-6">
      {!selectedFile ? (
        // Upload area
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={openFilePicker}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={VIDEO_CONSTRAINTS.supportedFormats.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />
          
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-500" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Загрузите видео для анализа
              </h3>
              <p className="text-gray-600 mb-4">
                Перетащите файл сюда или нажмите для выбора
              </p>
              
              <div className="text-sm text-gray-500 space-y-1">
                <p>Поддерживаемые форматы: MP4, WebM, MOV</p>
                <p>Максимальный размер: {formatFileSize(VIDEO_CONSTRAINTS.maxFileSize)}</p>
                <p>Длительность: {VIDEO_CONSTRAINTS.minDuration}-{VIDEO_CONSTRAINTS.maxDuration} секунд</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Video preview and controls
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <Video className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <h3 className="font-medium text-gray-900">{selectedFile.name}</h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
            </div>
            
            <button
              onClick={removeFile}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={disabled}
            >
              <FileX className="w-4 h-4" />
            </button>
          </div>
          
          {/* Video preview */}
          {videoPreview && (
            <div className="mb-6">
              <video
                ref={videoRef}
                src={videoPreview}
                controls
                className="w-full max-w-md mx-auto rounded-lg shadow-sm"
                style={{ maxHeight: '300px' }}
              />
            </div>
          )}
          
          {/* Start processing button */}
          <div className="flex justify-center">
            <button
              onClick={onStartProcessing}
              disabled={disabled || !!validationError}
              className={`
                flex items-center px-6 py-3 rounded-lg font-medium transition-colors
                ${disabled || validationError
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              <Play className="w-5 h-5 mr-2" />
              Начать анализ
            </button>
          </div>
        </div>
      )}
      
      {/* Validation error */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-3">⚠️</div>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Ошибка валидации файла
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {validationError}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;