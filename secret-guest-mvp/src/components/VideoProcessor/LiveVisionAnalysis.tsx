import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Square, Play, RotateCcw, AlertCircle, Eye, Loader } from 'lucide-react';
import { VIDEO_CONSTRAINTS, ROBOFLOW_CONFIG } from '../../constants';
import axios from 'axios';

interface LiveVisionAnalysisProps {
  onFrameCapture: (frames: string[]) => void;
  onStartProcessing: () => void;
  disabled: boolean;
  zone: { name: string; icon: string };
}

interface DetectionOverlay {
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
  confidence: number;
  isNegative: boolean;
}

const LiveVisionAnalysis: React.FC<LiveVisionAnalysisProps> = ({
  onFrameCapture,
  onStartProcessing,
  disabled,
  zone
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [liveDetections, setLiveDetections] = useState<DetectionOverlay[]>([]);
  const [detectedObjects, setDetectedObjects] = useState<Map<string, { count: number; confidence: number }>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      
      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: VIDEO_CONSTRAINTS.targetWidth },
          height: { ideal: VIDEO_CONSTRAINTS.targetHeight },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
        startLiveAnalysis();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Не удалось получить доступ к камере. Проверьте разрешения.');
    }
  }, [cameraFacing]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setIsRecording(false);
    setRecordingTime(0);
    setLiveDetections([]);
    setDetectedObjects(new Map());
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
  }, []);

  // Capture frame from video
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    canvas.width = VIDEO_CONSTRAINTS.targetWidth;
    canvas.height = VIDEO_CONSTRAINTS.targetHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Analyze frame in real-time
  const analyzeFrameRealTime = useCallback(async () => {
    if (!isStreaming || isAnalyzing || !videoRef.current) return;
    
    const now = Date.now();
    if (now - lastAnalysisTime < 2000) return;
    
    setIsAnalyzing(true);
    setLastAnalysisTime(now);
    
    try {
      const frameData = captureFrame();
      if (!frameData) return;
      
      const detections = await analyzeFrameWithAPI(frameData);
      setLiveDetections(detections);
      
      setDetectedObjects(prev => {
        const updated = new Map(prev);
        detections.forEach(detection => {
          const key = detection.class;
          const existing = updated.get(key) || { count: 0, confidence: 0 };
          updated.set(key, {
            count: existing.count + 1,
            confidence: Math.max(existing.confidence, detection.confidence)
          });
        });
        return updated;
      });
      
    } catch (error) {
      console.warn('Real-time analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isStreaming, isAnalyzing, lastAnalysisTime, captureFrame]);

  // Start live analysis
  const startLiveAnalysis = useCallback(() => {
    if (analysisIntervalRef.current) return;
    
    analysisIntervalRef.current = setInterval(() => {
      analyzeFrameRealTime();
    }, 2000);
  }, [analyzeFrameRealTime]);

  // Analyze frame with API
  const analyzeFrameWithAPI = useCallback(async (frameData: string): Promise<DetectionOverlay[]> => {
    try {
      const response = await fetch(frameData);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');
      
      const apiUrl = `${ROBOFLOW_CONFIG.baseURL}${ROBOFLOW_CONFIG.generalModel}`;
      
      const apiResponse = await axios.post(apiUrl, formData, {
        params: {
          api_key: ROBOFLOW_CONFIG.apiKey,
          confidence: ROBOFLOW_CONFIG.confidence,
          overlap: ROBOFLOW_CONFIG.overlap
        },
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 10000
      });
      
      const predictions = apiResponse.data.predictions || [];
      
      return predictions.map((pred: any) => ({
        x: pred.x - pred.width / 2,
        y: pred.y - pred.height / 2,
        width: pred.width,
        height: pred.height,
        class: pred.class,
        confidence: pred.confidence,
        isNegative: isNegativeClass(pred.class)
      }));
      
    } catch (error) {
      console.warn('API analysis failed:', error);
      return [];
    }
  }, []);

  // Check if class is negative
  const isNegativeClass = useCallback((className: string): boolean => {
    const negativeClasses = [
      'stain', 'dirt', 'hair', 'clutter', 'trash', 'broken_equipment',
      'missing_amenity', 'poor_lighting', 'dirty_toilet', 'dirty_towel'
    ];
    return negativeClasses.includes(className);
  }, []);

  // Draw detection overlays
  const drawDetections = useCallback(() => {
    if (!overlayCanvasRef.current || !videoRef.current) return;
    
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    
    if (!ctx) return;
    
    canvas.width = video.videoWidth || VIDEO_CONSTRAINTS.targetWidth;
    canvas.height = video.videoHeight || VIDEO_CONSTRAINTS.targetHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    liveDetections.forEach(detection => {
      const color = detection.isNegative ? '#ef4444' : '#22c55e';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(detection.x, detection.y, detection.width, detection.height);
      
      const label = `${detection.class} (${Math.round(detection.confidence * 100)}%)`;
      ctx.font = '14px Arial';
      const textWidth = ctx.measureText(label).width;
      
      ctx.fillStyle = color;
      ctx.fillRect(detection.x, detection.y - 25, textWidth + 10, 20);
      
      ctx.fillStyle = 'white';
      ctx.fillText(label, detection.x + 5, detection.y - 8);
    });
  }, [liveDetections]);

  useEffect(() => {
    drawDetections();
  }, [liveDetections, drawDetections]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!isStreaming) return;
    
    setIsRecording(true);
    setRecordingTime(0);
    setCapturedFrames([]);
    
    intervalRef.current = setInterval(() => {
      const frame = captureFrame();
      if (frame) {
        setCapturedFrames(prev => {
          const newFrames = [...prev, frame];
          if (newFrames.length > VIDEO_CONSTRAINTS.maxFrames) {
            return newFrames.slice(-VIDEO_CONSTRAINTS.maxFrames);
          }
          return newFrames;
        });
      }
      
      setRecordingTime(prev => {
        const newTime = prev + 1;
        if (newTime >= VIDEO_CONSTRAINTS.maxDuration) {
          stopRecording();
        }
        return newTime;
      });
    }, 1000);
  }, [isStreaming, captureFrame]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Process captured frames
  const processFrames = useCallback(() => {
    if (capturedFrames.length >= VIDEO_CONSTRAINTS.minDuration) {
      onFrameCapture(capturedFrames);
      onStartProcessing();
      stopCamera();
    }
  }, [capturedFrames, onFrameCapture, onStartProcessing, stopCamera]);

  // Switch camera
  const switchCamera = useCallback(() => {
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
    if (isStreaming) {
      stopCamera();
    }
  }, [isStreaming, stopCamera]);

  useEffect(() => {
    if (isStreaming && !streamRef.current) {
      startCamera();
    }
  }, [cameraFacing, isStreaming, startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-900 mb-2">Ошибка доступа к камере</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={startCamera}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-2">{zone.icon}</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Живой анализ зоны: {zone.name}
        </h2>
        <p className="text-gray-600">
          ИИ анализирует видео в реальном времени и показывает что видит
        </p>
      </div>

      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
        
        {isAnalyzing && (
          <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full flex items-center">
            <Loader className="w-4 h-4 mr-2 animate-spin" />
            Анализ...
          </div>
        )}
        
        {isRecording && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full flex items-center">
            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
            REC {formatTime(recordingTime)}
          </div>
        )}

        {isStreaming && (
          <button
            onClick={switchCamera}
            className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
            disabled={disabled || isRecording}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}

        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <button
              onClick={startCamera}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              disabled={disabled}
            >
              <Eye className="w-5 h-5 mr-2" />
              Включить живой анализ
            </button>
          </div>
        )}
      </div>

      {isStreaming && detectedObjects.size > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Eye className="w-5 h-5 mr-2 text-blue-600" />
            Что видит ИИ:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from(detectedObjects.entries()).map(([objectClass, data]) => {
              const isNegative = isNegativeClass(objectClass);
              return (
                <div
                  key={objectClass}
                  className={`p-3 rounded-lg border ${
                    isNegative 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-green-200 bg-green-50'
                  }`}
                >
                  <div className={`font-medium ${
                    isNegative ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {objectClass}
                  </div>
                  <div className="text-sm text-gray-600">
                    Обнаружено: {data.count} раз
                  </div>
                  <div className="text-xs text-gray-500">
                    Уверенность: {Math.round(data.confidence * 100)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isStreaming && (
        <div className="flex justify-center space-x-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center"
              disabled={disabled}
            >
              <Play className="w-5 h-5 mr-2" />
              Начать запись для анализа
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              disabled={disabled}
            >
              <Square className="w-5 h-5 mr-2" />
              Остановить запись
            </button>
          )}
        </div>
      )}

      {capturedFrames.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">
                Записано кадров: {capturedFrames.length}
              </h4>
              <p className="text-sm text-blue-700">
                Минимум {VIDEO_CONSTRAINTS.minDuration} кадров для полного анализа
              </p>
            </div>
            
            {capturedFrames.length >= VIDEO_CONSTRAINTS.minDuration && (
              <button
                onClick={processFrames}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                disabled={disabled}
              >
                Создать отчет
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Как работает живой анализ:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <span className="text-green-600">Зеленые рамки</span> - положительные объекты (мебель, удобства)</li>
          <li>• <span className="text-red-600">Красные рамки</span> - проблемы (грязь, пятна, поломки)</li>
          <li>• Анализ происходит каждые 2 секунды</li>
          <li>• Медленно поворачивайте камеру для лучшего охвата</li>
          <li>• Нажмите "Запись" для создания итогового отчета</li>
        </ul>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default LiveVisionAnalysis;