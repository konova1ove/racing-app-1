import axios, { AxiosResponse } from 'axios';
import { RoboflowResponse, RoboflowDetection, FrameData, DetectedObject, AppError } from '../types';
import { ROBOFLOW_CONFIG, API_ENDPOINTS, ERROR_MESSAGES } from '../constants';

export interface RoboflowAnalysisOptions {
  model?: 'general' | 'negative';
  confidence?: number;
  overlap?: number;
}

export class RoboflowService {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly defaultConfidence: number;
  private readonly defaultOverlap: number;

  constructor() {
    this.apiKey = ROBOFLOW_CONFIG.apiKey;
    this.baseURL = ROBOFLOW_CONFIG.baseURL;
    this.defaultConfidence = ROBOFLOW_CONFIG.confidence;
    this.defaultOverlap = ROBOFLOW_CONFIG.overlap;
  }

  /**
   * Analyze a single frame using the specified model
   */
  async analyzeFrame(
    frameData: string,
    options: RoboflowAnalysisOptions = {}
  ): Promise<RoboflowResponse> {
    const { model = 'general', confidence, overlap } = options;
    
    try {
      const endpoint = model === 'general' 
        ? API_ENDPOINTS.roboflow.general
        : API_ENDPOINTS.roboflow.negative;

      const params = new URLSearchParams({
        api_key: this.apiKey,
        confidence: (confidence || this.defaultConfidence).toString(),
        overlap: (overlap || this.defaultOverlap).toString(),
        format: 'json'
      });

      // Convert base64 to blob for upload
      const base64Data = frameData.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');

      const response: AxiosResponse<RoboflowResponse> = await axios.post(
        `${endpoint}?${params.toString()}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      return response.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new AppError({
            type: 'api',
            message: ERROR_MESSAGES.api.rateLimitExceeded,
            details: error.response.data,
            timestamp: new Date(),
            recoverable: true
          });
        }
        
        if (error.response?.status >= 500) {
          throw new AppError({
            type: 'api',
            message: ERROR_MESSAGES.api.serverError,
            details: error.response.data,
            timestamp: new Date(),
            recoverable: true
          });
        }

        if (!error.response) {
          throw new AppError({
            type: 'api',
            message: ERROR_MESSAGES.api.networkError,
            details: error,
            timestamp: new Date(),
            recoverable: true
          });
        }
      }

      throw new AppError({
        type: 'api',
        message: 'Failed to analyze frame with computer vision',
        details: error,
        timestamp: new Date(),
        recoverable: true
      });
    }
  }

  /**
   * Analyze multiple frames and aggregate results
   */
  async analyzeFrames(
    frames: FrameData[],
    onProgress?: (progress: number) => void
  ): Promise<DetectedObject[]> {
    if (frames.length === 0) {
      return [];
    }

    const allDetections: Map<string, DetectedObject> = new Map();
    let processedFrames = 0;

    try {
      // Process frames in batches to avoid overwhelming the API
      const batchSize = 3;
      const batches = [];
      
      for (let i = 0; i < frames.length; i += batchSize) {
        batches.push(frames.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        // Process batch concurrently
        const batchPromises = batch.map(async (frame) => {
          try {
            // Analyze with general model
            const generalResults = await this.analyzeFrame(frame.base64Data, { 
              model: 'general' 
            });
            
            // Analyze with negative model  
            const negativeResults = await this.analyzeFrame(frame.base64Data, { 
              model: 'negative' 
            });

            return {
              frameIndex: frame.index,
              generalDetections: generalResults.predictions || [],
              negativeDetections: negativeResults.predictions || []
            };
          } catch (error) {
            console.warn(`Failed to analyze frame ${frame.index}:`, error);
            return {
              frameIndex: frame.index,
              generalDetections: [],
              negativeDetections: []
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        
        // Aggregate results
        for (const result of batchResults) {
          this.aggregateDetections(
            result.generalDetections,
            result.negativeDetections,
            result.frameIndex,
            allDetections
          );
          
          processedFrames++;
          if (onProgress) {
            onProgress(Math.round((processedFrames / frames.length) * 100));
          }
        }

        // Add delay between batches to respect rate limits
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return Array.from(allDetections.values());

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError({
        type: 'api',
        message: 'Failed to complete frame analysis',
        details: error,
        timestamp: new Date(),
        recoverable: true
      });
    }
  }

  /**
   * Aggregate detection results across frames
   */
  private aggregateDetections(
    generalDetections: RoboflowDetection[],
    negativeDetections: RoboflowDetection[],
    frameIndex: number,
    aggregatedMap: Map<string, DetectedObject>
  ): void {
    // Process general detections
    for (const detection of generalDetections) {
      const key = detection.class;
      const existing = aggregatedMap.get(key);
      
      if (existing) {
        existing.count += 1;
        existing.confidence = Math.max(existing.confidence, detection.confidence);
        existing.frameIndices.push(frameIndex);
        
        if (existing.boundingBoxes) {
          existing.boundingBoxes.push({
            x: detection.x,
            y: detection.y,
            width: detection.width,
            height: detection.height,
            frameIndex
          });
        }
      } else {
        aggregatedMap.set(key, {
          class: detection.class,
          confidence: detection.confidence,
          count: 1,
          isNegative: false,
          frameIndices: [frameIndex],
          boundingBoxes: [{
            x: detection.x,
            y: detection.y,
            width: detection.width,
            height: detection.height,
            frameIndex
          }]
        });
      }
    }

    // Process negative detections
    for (const detection of negativeDetections) {
      const key = `negative_${detection.class}`;
      const existing = aggregatedMap.get(key);
      
      if (existing) {
        existing.count += 1;
        existing.confidence = Math.max(existing.confidence, detection.confidence);
        existing.frameIndices.push(frameIndex);
        
        if (existing.boundingBoxes) {
          existing.boundingBoxes.push({
            x: detection.x,
            y: detection.y,
            width: detection.width,
            height: detection.height,
            frameIndex
          });
        }
      } else {
        aggregatedMap.set(key, {
          class: detection.class,
          confidence: detection.confidence,
          count: 1,
          isNegative: true,
          frameIndices: [frameIndex],
          boundingBoxes: [{
            x: detection.x,
            y: detection.y,
            width: detection.width,
            height: detection.height,
            frameIndex
          }]
        });
      }
    }
  }

  /**
   * Check if the API key is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== 'demo-key' && this.apiKey.length > 0;
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      // Create a simple test image (1x1 pixel)
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 1, 1);
      }
      const testImage = canvas.toDataURL('image/jpeg');

      await this.analyzeFrame(testImage, { confidence: 0.9 });
      return true;
    } catch (error) {
      console.warn('Roboflow API test failed:', error);
      return false;
    }
  }

  /**
   * Generate mock detection results for testing
   */
  generateMockDetections(zoneId: string): DetectedObject[] {
    const mockDetections: DetectedObject[] = [];

    switch (zoneId) {
      case 'reception':
        mockDetections.push(
          {
            class: 'person',
            confidence: 0.85,
            count: 3,
            isNegative: false,
            frameIndices: [0, 2, 4],
            description: 'People in reception area'
          },
          {
            class: 'reception_desk',
            confidence: 0.92,
            count: 1,
            isNegative: false,
            frameIndices: [1, 2, 3],
            description: 'Reception desk visible'
          },
          {
            class: 'sign',
            confidence: 0.78,
            count: 2,
            isNegative: false,
            frameIndices: [0, 1],
            description: 'Directional signs present'
          }
        );
        break;

      case 'room':
        mockDetections.push(
          {
            class: 'bed',
            confidence: 0.96,
            count: 1,
            isNegative: false,
            frameIndices: [0, 1, 2],
            description: 'Bed detected'
          },
          {
            class: 'tv',
            confidence: 0.88,
            count: 1,
            isNegative: false,
            frameIndices: [1, 2],
            description: 'Television present'
          },
          {
            class: 'water_bottle',
            confidence: 0.72,
            count: 2,
            isNegative: false,
            frameIndices: [2],
            description: 'Water bottles available'
          }
        );
        break;

      case 'bathroom':
        mockDetections.push(
          {
            class: 'towel',
            confidence: 0.91,
            count: 4,
            isNegative: false,
            frameIndices: [0, 1],
            description: 'Towels provided'
          },
          {
            class: 'soap_dispenser',
            confidence: 0.84,
            count: 1,
            isNegative: false,
            frameIndices: [1],
            description: 'Soap dispenser available'
          },
          {
            class: 'stain',
            confidence: 0.67,
            count: 1,
            isNegative: true,
            frameIndices: [2],
            description: 'Stain detected on surface'
          }
        );
        break;
    }

    return mockDetections;
  }
}

// Singleton instance
let roboflowServiceInstance: RoboflowService | null = null;

export const getRoboflowService = (): RoboflowService => {
  if (!roboflowServiceInstance) {
    roboflowServiceInstance = new RoboflowService();
  }
  return roboflowServiceInstance;
};