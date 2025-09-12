import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { FrameData, AppError } from '../types';
import { VIDEO_CONSTRAINTS } from '../constants';
import { PerformanceMonitor, batchProcess, getAdaptiveSettings } from '../utils/performance';

export class FrameExtractor {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private performanceMonitor = PerformanceMonitor.getInstance();
  private canvas: HTMLCanvasElement | null = null;
  private adaptiveSettings = getAdaptiveSettings();

  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    try {
      this.ffmpeg = new FFmpeg();

      // Load FFmpeg core
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
    } catch (error) {
      throw new AppError({
        type: 'processing',
        message: 'Failed to initialize video processing engine',
        details: error,
        timestamp: new Date(),
        recoverable: false
      });
    }
  }

  async extractFrames(
    videoFile: File,
    onProgress?: (progress: number) => void
  ): Promise<FrameData[]> {
    this.performanceMonitor.startTimer('frameExtraction');
    
    if (!this.ffmpeg || !this.isLoaded) {
      await this.initialize();
    }

    if (!this.ffmpeg) {
      throw new AppError({
        type: 'processing',
        message: 'Video processing engine not available',
        timestamp: new Date(),
        recoverable: false
      });
    }

    try {
      const inputFileName = 'input.mp4';
      const outputPattern = 'frame_%03d.jpg'; // Use JPEG for better performance

      // Write video file to FFmpeg filesystem
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

      // Set up progress monitoring
      if (onProgress) {
        this.ffmpeg.on('progress', ({ progress }) => {
          onProgress(Math.round(progress * 100));
        });
      }

      // Use adaptive settings for performance
      const frameRate = this.adaptiveSettings.frameExtractionRate;
      const maxFrames = this.adaptiveSettings.maxFrames;
      
      // Extract frames with optimized settings
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-vf', `fps=${frameRate},scale=${VIDEO_CONSTRAINTS.targetWidth}:${VIDEO_CONSTRAINTS.targetHeight}`,
        '-frames:v', maxFrames.toString(),
        '-q:v', '3', // JPEG quality (lower = better quality, higher = smaller size)
        '-y',
        outputPattern
      ]);

      // Batch process frames for better performance
      const frameIndices = Array.from({ length: maxFrames }, (_, i) => i + 1);
      const frames = await batchProcess(
        frameIndices,
        async (frameIndex) => this.processFrame(frameIndex, frameRate),
        this.adaptiveSettings.batchSize
      );

      // Filter out null frames
      const validFrames = frames.filter((frame): frame is FrameData => frame !== null);

      // Cleanup
      await this.cleanup([inputFileName, ...frameIndices.map(i => 
        `frame_${i.toString().padStart(3, '0')}.jpg`
      )]);

      if (validFrames.length === 0) {
        throw new AppError({
          type: 'processing',
          message: 'No frames could be extracted from the video',
          timestamp: new Date(),
          recoverable: true
        });
      }

      const duration = this.performanceMonitor.endTimer('frameExtraction');
      console.log(`Frame extraction completed in ${duration.toFixed(2)}ms`);

      return validFrames;

    } catch (error) {
      this.performanceMonitor.endTimer('frameExtraction');
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError({
        type: 'processing',
        message: 'Failed to extract frames from video',
        details: error,
        timestamp: new Date(),
        recoverable: true
      });
    }
  }

  private async processFrame(frameIndex: number, frameRate: number): Promise<FrameData | null> {
    if (!this.ffmpeg) return null;

    const frameFileName = `frame_${frameIndex.toString().padStart(3, '0')}.jpg`;
    
    try {
      const frameData = await this.ffmpeg.readFile(frameFileName);
      
      if (frameData instanceof Uint8Array) {
        const blob = new Blob([frameData], { type: 'image/jpeg' });
        
        // Optimize image if needed for low-end devices
        const optimizedBlob = this.adaptiveSettings.imageQuality < 0.8 
          ? await this.optimizeImageBlob(blob)
          : blob;
          
        const base64Data = await this.blobToBase64(optimizedBlob);
        
        return {
          index: frameIndex - 1,
          timestamp: (frameIndex - 1) / frameRate,
          base64Data,
          width: VIDEO_CONSTRAINTS.targetWidth,
          height: VIDEO_CONSTRAINTS.targetHeight
        };
      }
    } catch (error) {
      console.warn(`Frame ${frameIndex} not found`);
    }
    
    return null;
  }

  private async optimizeImageBlob(blob: Blob): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
      }
      
      const canvas = this.canvas;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      if (!ctx) {
        resolve(blob);
        return;
      }
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(
          (optimizedBlob) => {
            resolve(optimizedBlob || blob);
          },
          'image/jpeg',
          this.adaptiveSettings.imageQuality
        );
      };
      
      img.onerror = () => resolve(blob);
      img.src = URL.createObjectURL(blob);
    });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async cleanup(fileNames: string[]): Promise<void> {
    if (!this.ffmpeg) return;

    for (const fileName of fileNames) {
      try {
        await this.ffmpeg.deleteFile(fileName);
      } catch (error) {
        // Ignore cleanup errors
        console.warn(`Failed to delete file ${fileName}:`, error);
      }
    }
  }

  async getVideoDuration(videoFile: File): Promise<number> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.initialize();
    }

    if (!this.ffmpeg) return 0;

    try {
      const inputFileName = 'input_duration.mp4';
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

      // Get video info
      let duration = 0;
      this.ffmpeg.on('log', ({ message }) => {
        const match = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          const hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const seconds = parseInt(match[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
        }
      });

      await this.ffmpeg.exec(['-i', inputFileName, '-f', 'null', '-']);
      await this.cleanup([inputFileName]);

      return duration;
    } catch (error) {
      console.warn('Failed to get video duration:', error);
      return 0;
    }
  }

  async terminate(): Promise<void> {
    if (this.ffmpeg) {
      await this.ffmpeg.terminate();
      this.ffmpeg = null;
      this.isLoaded = false;
    }
    
    // Cleanup canvas
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
  }
}

// Singleton instance
let frameExtractorInstance: FrameExtractor | null = null;

export const getFrameExtractor = (): FrameExtractor => {
  if (!frameExtractorInstance) {
    frameExtractorInstance = new FrameExtractor();
  }
  return frameExtractorInstance;
};