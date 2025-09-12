import { useCallback, useMemo, useRef, useEffect } from 'react';
import { debounce } from '../utils/performance';

/**
 * Custom hook for performance optimization utilities
 */
export const usePerformanceOptimization = () => {
  const frameRequestRef = useRef<number>();
  const timeoutRef = useRef<number>();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Optimized animation frame scheduling
  const scheduleWork = useCallback((callback: () => void) => {
    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current);
    }
    frameRequestRef.current = requestAnimationFrame(callback);
  }, []);

  // Memory-efficient timeout
  const scheduleTimeout = useCallback((callback: () => void, delay: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(callback, delay);
  }, []);

  // Debounced resize handler
  const debouncedResize = useMemo(() => {
    return debounce((callback: () => void) => {
      callback();
    }, 200);
  }, []);

  return {
    scheduleWork,
    scheduleTimeout,
    debouncedResize
  };
};

/**
 * Hook for optimizing video processing performance
 */
export const useVideoOptimization = () => {
  const canvasRef = useRef<HTMLCanvasElement>();
  const workerRef = useRef<Worker>();

  useEffect(() => {
    // Create reusable canvas for frame processing
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    // Initialize web worker for heavy processing if supported
    if (typeof Worker !== 'undefined' && !workerRef.current) {
      try {
        workerRef.current = new Worker('/workers/videoProcessor.js');
      } catch (error) {
        console.warn('Web Worker not available:', error);
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Optimize frame extraction with canvas reuse
  const extractFrameOptimized = useCallback((
    video: HTMLVideoElement,
    timestamp: number,
    targetWidth: number = 640,
    targetHeight: number = 480
  ): string => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Set canvas size
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Seek to timestamp
    video.currentTime = timestamp;

    return new Promise<string>((resolve, reject) => {
      const handleSeeked = () => {
        try {
          // Draw video frame to canvas with scaling
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          
          // Convert to optimized JPEG with quality setting
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        } finally {
          video.removeEventListener('seeked', handleSeeked);
        }
      };

      video.addEventListener('seeked', handleSeeked);
    });
  }, []);

  // Batch process multiple frames
  const batchExtractFrames = useCallback(async (
    video: HTMLVideoElement,
    timestamps: number[],
    batchSize: number = 3
  ): Promise<string[]> => {
    const results: string[] = [];
    
    for (let i = 0; i < timestamps.length; i += batchSize) {
      const batch = timestamps.slice(i, i + batchSize);
      const batchPromises = batch.map(timestamp => 
        extractFrameOptimized(video, timestamp)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Allow UI updates between batches
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return results;
  }, [extractFrameOptimized]);

  return {
    extractFrameOptimized,
    batchExtractFrames,
    canvas: canvasRef.current,
    worker: workerRef.current
  };
};

/**
 * Hook for memory management optimization
 */
export const useMemoryOptimization = () => {
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Track and cleanup object URLs
  const createObjectUrl = useCallback((file: Blob): string => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeObjectUrl = useCallback((url: string) => {
    if (objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }, []);

  const cleanupAllUrls = useCallback(() => {
    objectUrlsRef.current.forEach(url => {
      URL.revokeObjectURL(url);
    });
    objectUrlsRef.current.clear();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllUrls();
    };
  }, [cleanupAllUrls]);

  // Memory usage monitoring
  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }, []);

  return {
    createObjectUrl,
    revokeObjectUrl,
    cleanupAllUrls,
    getMemoryUsage
  };
};

/**
 * Hook for optimizing API calls and data processing
 */
export const useApiOptimization = () => {
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Cache API responses with TTL
  const getCachedResponse = useCallback((key: string, ttl: number = 300000): any => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  }, []);

  const setCachedResponse = useCallback((key: string, data: any) => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);

  // Abort controller management
  const createAbortController = useCallback((requestId: string): AbortController => {
    // Cancel existing request with same ID
    const existing = abortControllersRef.current.get(requestId);
    if (existing) {
      existing.abort();
    }

    const controller = new AbortController();
    abortControllersRef.current.set(requestId, controller);
    return controller;
  }, []);

  const abortRequest = useCallback((requestId: string) => {
    const controller = abortControllersRef.current.get(requestId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(requestId);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => {
        controller.abort();
      });
      abortControllersRef.current.clear();
    };
  }, []);

  return {
    getCachedResponse,
    setCachedResponse,
    createAbortController,
    abortRequest
  };
};