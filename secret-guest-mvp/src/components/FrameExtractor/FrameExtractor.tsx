import React, { useState, useEffect, useCallback } from 'react';
import { Film, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { FrameExtractorProps, FrameData, AppError } from '../../types';
import { getFrameExtractor } from '../../services/frameExtractor';
import { VIDEO_CONSTRAINTS } from '../../constants';

const FrameExtractor: React.FC<FrameExtractorProps> = ({
  videoFile,
  onFramesExtracted,
  onError
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedFrames, setExtractedFrames] = useState<FrameData[]>([]);
  const [error, setError] = useState<AppError | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const extractFrames = useCallback(async () => {
    if (!videoFile) return;

    setIsExtracting(true);
    setProgress(0);
    setError(null);
    setIsInitializing(true);

    try {
      const frameExtractor = getFrameExtractor();
      
      // Initialize FFmpeg if not already done
      await frameExtractor.initialize();
      setIsInitializing(false);
      
      // Check video duration
      const duration = await frameExtractor.getVideoDuration(videoFile);
      if (duration > VIDEO_CONSTRAINTS.maxDuration) {
        throw {
          type: 'validation',
          message: `Video is too long. Maximum duration is ${VIDEO_CONSTRAINTS.maxDuration} seconds.`,
          timestamp: new Date(),
          recoverable: true
        } as AppError;
      }

      if (duration < VIDEO_CONSTRAINTS.minDuration) {
        throw {
          type: 'validation',
          message: `Video is too short. Minimum duration is ${VIDEO_CONSTRAINTS.minDuration} seconds.`,
          timestamp: new Date(),
          recoverable: true
        } as AppError;
      }

      // Extract frames
      const frames = await frameExtractor.extractFrames(videoFile, (progress) => {
        setProgress(progress);
      });

      setExtractedFrames(frames);
      onFramesExtracted(frames);

    } catch (error) {
      const appError = error as AppError;
      setError(appError);
      onError(appError);
    } finally {
      setIsExtracting(false);
      setIsInitializing(false);
    }
  }, [videoFile, onFramesExtracted, onError]);

  useEffect(() => {
    if (videoFile && !isExtracting && extractedFrames.length === 0) {
      extractFrames();
    }
  }, [videoFile, extractFrames, isExtracting, extractedFrames.length]);

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (error) {
    return (
      <div className="p-6 bg-error-50 border border-error-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-error-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-error-800 font-medium mb-1">
              Frame Extraction Failed
            </h3>
            <p className="text-error-700 text-sm mb-3">
              {error.message}
            </p>
            {error.recoverable && (
              <button
                onClick={extractFrames}
                className="text-error-600 hover:text-error-800 text-sm underline"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (extractedFrames.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-success-600">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">
            {extractedFrames.length} frames extracted successfully
          </span>
        </div>
        
        <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {extractedFrames.slice(0, 10).map((frame, index) => (
            <div key={frame.index} className="relative group">
              <img
                src={frame.base64Data}
                alt={`Frame ${frame.index + 1}`}
                className="w-full h-20 object-cover rounded-lg border border-gray-200 group-hover:border-primary-300 transition-colors"
              />
              <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                {frame.index + 1}
              </div>
              <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                {frame.timestamp.toFixed(1)}s
              </div>
            </div>
          ))}
          {extractedFrames.length > 10 && (
            <div className="flex items-center justify-center h-20 bg-gray-100 rounded-lg border border-gray-200">
              <span className="text-gray-500 text-sm">
                +{extractedFrames.length - 10} more
              </span>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          Ready for AI analysis • {extractedFrames.length} frames • 
          {VIDEO_CONSTRAINTS.frameExtractionRate} FPS extraction rate
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Info */}
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
        <Film className="w-5 h-5 text-primary-500" />
        <div className="flex-1">
          <div className="font-medium text-gray-900">{videoFile.name}</div>
          <div className="text-sm text-gray-600">
            {formatFileSize(videoFile.size)} • {videoFile.type}
          </div>
        </div>
      </div>

      {/* Processing Status */}
      <div className="text-center space-y-4">
        {isInitializing && (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-5 h-5 animate-spin text-primary-600" />
              <span className="text-gray-700">Initializing video processor...</span>
            </div>
            <p className="text-sm text-gray-500">
              Loading FFmpeg engine for the first time (this may take a moment)
            </p>
          </div>
        )}

        {isExtracting && !isInitializing && (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-5 h-5 animate-spin text-primary-600" />
              <span className="text-gray-700">Extracting frames from video...</span>
            </div>
            
            <div className="w-full max-w-md mx-auto">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              Extracting at {VIDEO_CONSTRAINTS.frameExtractionRate} frame per second •
              Maximum {VIDEO_CONSTRAINTS.maxFrames} frames
            </div>
          </div>
        )}

        {!isExtracting && !isInitializing && extractedFrames.length === 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-5 h-5 animate-spin text-primary-600" />
              <span className="text-gray-700">Preparing video analysis...</span>
            </div>
          </div>
        )}
      </div>

      {/* Technical Info */}
      <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-50 rounded">
        <div>• Frame extraction rate: {VIDEO_CONSTRAINTS.frameExtractionRate} FPS</div>
        <div>• Target resolution: {VIDEO_CONSTRAINTS.targetWidth}×{VIDEO_CONSTRAINTS.targetHeight}</div>
        <div>• Maximum frames: {VIDEO_CONSTRAINTS.maxFrames}</div>
        <div>• Processing: Client-side using FFmpeg WebAssembly</div>
      </div>
    </div>
  );
};

export default FrameExtractor;