import React from 'react';

/**
 * Performance utility functions for optimization
 */

/**
 * Debounce function to limit the rate at which a function can fire
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): ((...args: Parameters<T>) => void) => {
  let timeout: number | undefined;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = undefined;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);

    if (callNow) func(...args);
  };
};

/**
 * Throttle function to ensure a function is called at most once per specified time period
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return function throttledFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Create a memoized version of a function
 */
export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  getKey?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * Optimize image loading with compression and resize
 */
export const optimizeImage = (
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Batch process operations to avoid blocking the main thread
 */
export const batchProcess = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 5,
  delay: number = 10
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(processor);
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults);
    
    // Allow UI updates between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
};

/**
 * Monitor performance metrics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(label: string): void {
    performance.mark(`${label}-start`);
  }

  endTimer(label: string): number {
    const endMark = `${label}-end`;
    performance.mark(endMark);
    
    const measureName = `${label}-duration`;
    performance.measure(measureName, `${label}-start`, endMark);
    
    const measure = performance.getEntriesByName(measureName)[0];
    const duration = measure.duration;
    
    // Store metric
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(duration);
    
    // Clean up marks and measures
    performance.clearMarks(`${label}-start`);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
    
    return duration;
  }

  getAverageTime(label: string): number {
    const times = this.metrics.get(label);
    if (!times || times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const result: Record<string, { average: number; count: number; latest: number }> = {};
    
    this.metrics.forEach((times, label) => {
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      result[label] = {
        average,
        count: times.length,
        latest: times[times.length - 1] || 0
      };
    });
    
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

/**
 * Lazy loading utility for components
 */
export const createLazyLoader = <T>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  return React.lazy(importFunc);
};

/**
 * Virtual scrolling utility for large lists
 */
export class VirtualScrollManager {
  private containerHeight: number = 0;
  private itemHeight: number = 0;
  private scrollTop: number = 0;
  private totalItems: number = 0;

  constructor(containerHeight: number, itemHeight: number) {
    this.containerHeight = containerHeight;
    this.itemHeight = itemHeight;
  }

  setScrollTop(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  setTotalItems(count: number): void {
    this.totalItems = count;
  }

  getVisibleRange(): { start: number; end: number; offset: number } {
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const end = Math.min(start + visibleCount + 1, this.totalItems);
    const offset = start * this.itemHeight;

    return { start, end, offset };
  }

  getTotalHeight(): number {
    return this.totalItems * this.itemHeight;
  }
}

/**
 * Memory cleanup utilities
 */
export const cleanupResources = () => {
  // Force garbage collection if available (development only)
  if (typeof window !== 'undefined' && 'gc' in window && process.env.NODE_ENV === 'development') {
    (window as any).gc();
  }
};

/**
 * Check if device has limited resources
 */
export const isLowEndDevice = (): boolean => {
  // Check for hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 1;
  
  // Check for memory if available
  const memory = (navigator as any).deviceMemory;
  
  // Check connection speed
  const connection = (navigator as any).connection;
  const isSlowConnection = connection && 
    (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');

  return cores <= 2 || (memory && memory <= 2) || isSlowConnection;
};

/**
 * Adaptive quality settings based on device capabilities
 */
export const getAdaptiveSettings = () => {
  const isLowEnd = isLowEndDevice();
  
  return {
    videoQuality: isLowEnd ? 'low' : 'high',
    frameExtractionRate: isLowEnd ? 0.5 : 1, // frames per second
    maxFrames: isLowEnd ? 10 : 15,
    imageQuality: isLowEnd ? 0.6 : 0.8,
    batchSize: isLowEnd ? 2 : 5,
    enableCaching: !isLowEnd,
    animationDuration: isLowEnd ? 150 : 300
  };
};