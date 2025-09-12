import React, { useEffect, useCallback, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { FrameData } from '../../types';
import { VIDEO_CONSTRAINTS, ERROR_MESSAGES } from '../../constants';

interface FrameExtractorProps {
  videoFile: File;
  onFramesExtracted: (frames: FrameData[]) => void;
  onProgress: (progress: number) => void;
  onError: (error: string) => void;
}

const FrameExtractor: React.FC<FrameExtractorProps> = ({
  videoFile,
  onFramesExtracted,
  onProgress,
  onError
}) => {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const isProcessingRef = useRef(false);

  // Initialize FFmpeg
  const initializeFFmpeg = useCallback(async (): Promise<FFmpeg> => {
    const ffmpeg = new FFmpeg();
    
    // Set up progress handling
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });

    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg log:', message);
    });

    try {
      // Load FFmpeg with CDN URLs
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      console.log('FFmpeg loaded successfully');
      return ffmpeg;
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      throw new Error('Failed to initialize video processor');
    }
  }, [onProgress]);

  // Extract frames from video
  const extractFrames = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      onProgress(0);
      
      // Initialize FFmpeg if not already done
      if (!ffmpegRef.current) {
        ffmpegRef.current = await initializeFFmpeg();
      }

      const ffmpeg = ffmpegRef.current;

      // Write input file
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

      // Extract frames at specified rate
      const frameRate = VIDEO_CONSTRAINTS.frameExtractionRate;
      const maxFrames = VIDEO_CONSTRAINTS.maxFrames;
      
      // Calculate video duration to determine frame count
      const videoDuration = await getVideoDuration(videoFile);
      const totalFrames = Math.min(Math.floor(videoDuration * frameRate), maxFrames);

      onProgress(20);

      // Run FFmpeg command to extract frames
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', `fps=${frameRate},scale=${VIDEO_CONSTRAINTS.targetWidth}:${VIDEO_CONSTRAINTS.targetHeight}`,
        '-frames:v', totalFrames.toString(),
        '-f', 'image2',
        'frame_%03d.png'
      ]);

      onProgress(70);

      // Read extracted frames
      const frames: FrameData[] = [];
      for (let i = 1; i <= totalFrames; i++) {
        const filename = `frame_${i.toString().padStart(3, '0')}.png`;
        
        try {
          const frameData = await ffmpeg.readFile(filename);
          if (frameData) {
            const blob = new Blob([frameData], { type: 'image/png' });
            const base64Data = await blobToBase64(blob);
            
            frames.push({
              index: i - 1,
              timestamp: (i - 1) / frameRate,
              base64Data,
              width: VIDEO_CONSTRAINTS.targetWidth,
              height: VIDEO_CONSTRAINTS.targetHeight
            });
          }
        } catch (error) {
          console.warn(`Failed to read frame ${i}:`, error);
        }
      }

      onProgress(100);

      if (frames.length === 0) {
        throw new Error('No frames could be extracted from the video');
      }

      console.log(`Successfully extracted ${frames.length} frames`);
      onFramesExtracted(frames);

    } catch (error) {
      console.error('Frame extraction error:', error);
      onError(error instanceof Error ? error.message : ERROR_MESSAGES.processing.frameExtractionFailed);
    } finally {
      isProcessingRef.current = false;
    }
  }, [videoFile, onFramesExtracted, onProgress, onError, initializeFFmpeg]);

  // Get video duration
  const getVideoDuration = useCallback((file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve(video.duration);
      };
      
      video.onerror = () => {
        reject(new Error('Could not load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  }, []);

  // Convert blob to base64
  const blobToBase64 = useCallback((blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/png;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  // Start extraction when component mounts
  useEffect(() => {
    extractFrames();
  }, [extractFrames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isProcessingRef.current = false;
    };
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="text-blue-600 text-2xl">🎬</div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Извлечение кадров из видео
        </h3>
        <p className="text-gray-600 text-sm">
          Обрабатываем видео и извлекаем кадры для анализа...
        </p>
        
        <div className="mt-4 text-xs text-gray-500">
          Скорость: {VIDEO_CONSTRAINTS.frameExtractionRate} кадр/сек
          • Максимум: {VIDEO_CONSTRAINTS.maxFrames} кадров
        </div>
      </div>
    </div>
  );
};

export default FrameExtractor;