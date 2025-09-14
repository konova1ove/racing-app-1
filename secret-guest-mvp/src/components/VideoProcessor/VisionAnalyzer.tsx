import React, { useEffect, useCallback, useRef, useState } from 'react';
import axios from 'axios';
import type { FrameData, DetectedObject, RoboflowResponse } from '../../types';
import { ROBOFLOW_CONFIG, ERROR_MESSAGES } from '../../constants';

interface VisionAnalyzerProps {
  frames: FrameData[];
  onAnalysisComplete: (detectedObjects: DetectedObject[]) => void;
  onProgress: (progress: number) => void;
  onError: (error: string) => void;
}

const VisionAnalyzer: React.FC<VisionAnalyzerProps> = ({
  frames,
  onAnalysisComplete,
  onProgress,
  onError
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [analyzedFrames, setAnalyzedFrames] = useState(0);
  const isAnalyzingRef = useRef(false);

  // Analyze frames with Roboflow API
  const analyzeFrames = useCallback(async () => {
    if (isAnalyzingRef.current || frames.length === 0) return;
    isAnalyzingRef.current = true;

    try {
      const allDetections: DetectedObject[] = [];
      const objectCounts = new Map<string, { count: number, frameIndices: number[], confidence: number }>();

      onProgress(0);

      // Analyze each frame
      for (let i = 0; i < frames.length; i++) {
        setCurrentFrameIndex(i);
        const frame = frames[i];

        try {
          // Call general objects model
          const generalDetections = await analyzeFrameWithModel(frame, 'general');
          
          // Call negative conditions model
          const negativeDetections = await analyzeFrameWithModel(frame, 'negative');

          // Process general detections
          generalDetections.forEach(detection => {
            const key = detection.class;
            if (!objectCounts.has(key)) {
              objectCounts.set(key, {
                count: 0,
                frameIndices: [],
                confidence: 0
              });
            }
            
            const existing = objectCounts.get(key)!;
            existing.count++;
            existing.frameIndices.push(i);
            existing.confidence = Math.max(existing.confidence, detection.confidence);
          });

          // Process negative detections
          negativeDetections.forEach(detection => {
            const key = detection.class;
            if (!objectCounts.has(key)) {
              objectCounts.set(key, {
                count: 0,
                frameIndices: [],
                confidence: 0
              });
            }
            
            const existing = objectCounts.get(key)!;
            existing.count++;
            existing.frameIndices.push(i);
            existing.confidence = Math.max(existing.confidence, detection.confidence);
          });

          setAnalyzedFrames(i + 1);
          onProgress((i + 1) / frames.length * 100);

          // Small delay to prevent API rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.warn(`Failed to analyze frame ${i}:`, error);
          // Continue with next frame
        }
      }

      // Convert to DetectedObject format
      objectCounts.forEach((data, className) => {
        const isNegative = isNegativeClass(className);
        
        allDetections.push({
          class: className,
          confidence: data.confidence,
          count: data.count,
          isNegative,
          frameIndices: data.frameIndices,
          description: getObjectDescription(className)
        });
      });

      console.log(`Analysis complete. Found ${allDetections.length} object types across ${frames.length} frames`);
      onAnalysisComplete(allDetections);

    } catch (error) {
      console.error('Vision analysis error:', error);
      onError(error instanceof Error ? error.message : ERROR_MESSAGES.api.serverError);
    } finally {
      isAnalyzingRef.current = false;
    }
  }, [frames, onAnalysisComplete, onProgress, onError]);

  // Analyze single frame with specific model
  const analyzeFrameWithModel = useCallback(async (frame: FrameData, modelType: 'general' | 'negative') => {
    const modelEndpoint = modelType === 'general' ? ROBOFLOW_CONFIG.generalModel : ROBOFLOW_CONFIG.negativeModel;
    const apiUrl = `${ROBOFLOW_CONFIG.baseURL}${modelEndpoint}`;

    // Convert base64 to blob
    const imageData = frame.base64Data || frame.dataUrl;
    if (!imageData) {
      throw new Error('No image data available in frame');
    }
    
    const response = await fetch(imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`);
    const blob = await response.blob();

    // Create form data
    const formData = new FormData();
    formData.append('file', blob, `frame_${frame.index}.png`);

    try {
      const apiResponse = await axios.post(apiUrl, formData, {
        params: {
          api_key: ROBOFLOW_CONFIG.apiKey,
          confidence: ROBOFLOW_CONFIG.confidence,
          overlap: ROBOFLOW_CONFIG.overlap
        },
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000
      });

      const result: RoboflowResponse = apiResponse.data;
      return result.predictions || [];

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error(ERROR_MESSAGES.api.rateLimitExceeded);
        } else if (error.response && error.response.status >= 500) {
          throw new Error(ERROR_MESSAGES.api.serverError);
        } else if (error.code === 'ECONNABORTED') {
          throw new Error(ERROR_MESSAGES.processing.timeout);
        }
      }
      throw new Error(ERROR_MESSAGES.api.networkError);
    }
  }, []);

  // Check if object class is negative
  const isNegativeClass = useCallback((className: string): boolean => {
    const negativeClasses = [
      'stain', 'dirt', 'hair', 'clutter', 'trash', 'broken_equipment',
      'missing_amenity', 'poor_lighting', 'stain_on_sheet', 'hair_on_linen',
      'surface_dirt', 'streaked_glass', 'dirty_window', 'stain_on_sink',
      'dirty_toilet', 'hair_in_shower', 'limescale', 'dirty_towel',
      'missing_amenities', 'stained_supplies', 'crowd', 'long_queue'
    ];
    return negativeClasses.includes(className);
  }, []);

  // Get object description
  const getObjectDescription = useCallback((className: string): string => {
    const descriptions: Record<string, string> = {
      // General objects
      person: 'Человек в кадре',
      staff_member: 'Сотрудник отеля',
      guest: 'Гость отеля',
      reception_desk: 'Стойка ресепшен',
      bed: 'Кровать',
      tv: 'Телевизор',
      kettle: 'Чайник',
      water_bottle: 'Бутылка воды',
      towel: 'Полотенце',
      amenities_kit: 'Набор принадлежностей',
      window: 'Окно',
      sign: 'Указатель',
      arrow: 'Стрелка',
      
      // Negative objects
      stain: 'Пятно',
      dirt: 'Грязь',
      hair: 'Волосы',
      clutter: 'Беспорядок',
      trash: 'Мусор',
      stain_on_sheet: 'Пятно на простыне',
      hair_on_linen: 'Волосы на белье',
      dirty_toilet: 'Грязный унитаз',
      streaked_glass: 'Разводы на стекле'
    };
    
    return descriptions[className] || className;
  }, []);

  // Start analysis when component mounts
  useEffect(() => {
    analyzeFrames();
  }, [analyzeFrames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isAnalyzingRef.current = false;
    };
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="text-blue-600 text-2xl">🤖</div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Анализ с помощью ИИ
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          Обрабатываем кадры с помощью компьютерного зрения...
        </p>
        
        <div className="space-y-2 text-sm text-gray-500">
          <div>
            Анализируется кадр {currentFrameIndex + 1} из {frames.length}
          </div>
          <div>
            Обработано кадров: {analyzedFrames}
          </div>
        </div>

        {/* Progress visualization */}
        <div className="mt-4">
          <div className="flex justify-center space-x-1">
            {frames.slice(0, Math.min(frames.length, 10)).map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index < analyzedFrames
                    ? 'bg-green-500'
                    : index === currentFrameIndex
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-gray-300'
                }`}
              />
            ))}
            {frames.length > 10 && (
              <span className="text-xs text-gray-500 ml-2">
                +{frames.length - 10} кадров
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisionAnalyzer;