import React, { useState, useCallback, useRef } from 'react';
import type { Zone, AssessmentResult, ProcessingStage, FrameData, DetectedObject } from '../../types';
import { ERROR_MESSAGES } from '../../constants';
import VideoUpload from './VideoUpload';
import LiveVisionAnalysis from './LiveVisionAnalysis';
import FrameExtractor from './FrameExtractor';
import VisionAnalyzer from './VisionAnalyzer';
import ScoringEngine from './ScoringEngine';
import ProcessingProgress from './ProcessingProgress';
import { Camera, Upload } from 'lucide-react';

interface VideoProcessorProps {
  zone: Zone;
  onProcessingComplete: (result: AssessmentResult) => void;
  onProcessingStart: () => void;
  onProcessingStageUpdate: (stage: ProcessingStage) => void;
  onBack: () => void;
  onError: (error: string) => void;
  className?: string;
}

type CaptureMode = 'live' | 'upload';

const VideoProcessor: React.FC<VideoProcessorProps> = ({
  zone,
  onProcessingComplete,
  onProcessingStart,
  onProcessingStageUpdate,
  onBack,
  onError,
  className = ''
}) => {
  const [captureMode, setCaptureMode] = useState<CaptureMode>('live');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<FrameData[]>([]);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<ProcessingStage>('idle');
  const [progress, setProgress] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Detect if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Update processing stage
  const updateStage = useCallback((stage: ProcessingStage, progressValue?: number) => {
    setCurrentStage(stage);
    onProcessingStageUpdate(stage);
    if (progressValue !== undefined) {
      setProgress(progressValue);
    }
  }, [onProcessingStageUpdate]);

  // Handle video file selection
  const handleVideoSelect = useCallback((file: File) => {
    setVideoFile(file);
    setExtractedFrames([]);
    setDetectedObjects([]);
    setProgress(0);
    updateStage('idle');
  }, [updateStage]);

  // Handle live video frames
  const handleFrameCapture = useCallback((frames: string[]) => {
    // Convert base64 frames to FrameData format
    const frameData: FrameData[] = frames.map((frame, index) => ({
      id: `frame-${index}`,
      timestamp: index,
      dataUrl: frame,
      width: 640,
      height: 480
    }));
    
    setExtractedFrames(frameData);
    setVideoFile(null); // Clear video file since we're using live frames
  }, []);

  // Start processing pipeline
  const startProcessing = useCallback(async () => {
    if (!videoFile && extractedFrames.length === 0) {
      onError('Видео или кадры не выбраны');
      return;
    }

    setIsProcessing(true);
    setProcessingStartTime(Date.now());
    onProcessingStart();
    abortControllerRef.current = new AbortController();

    try {
      if (extractedFrames.length > 0) {
        // We already have frames from live capture, proceed to analysis
        updateStage('analyzing_frames', 30);
      } else {
        // Extract frames from uploaded video file
        updateStage('extracting_frames', 10);
      }
    } catch (error) {
      console.error('Processing error:', error);
      onError(error instanceof Error ? error.message : ERROR_MESSAGES.processing.unexpectedError);
      setIsProcessing(false);
      updateStage('error');
    }
  }, [videoFile, extractedFrames, onProcessingStart, onError, updateStage]);

  // Handle frames extracted
  const handleFramesExtracted = useCallback(async (frames: FrameData[]) => {
    setExtractedFrames(frames);
    updateStage('analyzing_frames', 30);
  }, [updateStage]);

  // Handle analysis complete
  const handleAnalysisComplete = useCallback(async (objects: DetectedObject[]) => {
    setDetectedObjects(objects);
    updateStage('calculating_scores', 70);
  }, [updateStage]);

  // Handle scoring complete
  const handleScoringComplete = useCallback((result: AssessmentResult) => {
    // Calculate actual processing time
    const processingTime = Math.round((Date.now() - processingStartTime) / 1000);
    const finalResult = {
      ...result,
      processingTime
    };
    
    updateStage('complete', 100);
    setIsProcessing(false);
    onProcessingComplete(finalResult);
  }, [updateStage, onProcessingComplete, processingStartTime]);

  // Cancel processing
  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    updateStage('idle', 0);
  }, [updateStage]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <button
              onClick={onBack}
              className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {zone.icon} {zone.name}
              </h2>
              <p className="text-gray-600">{zone.description}</p>
            </div>
          </div>
          
          {isProcessing && (
            <button
              onClick={cancelProcessing}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Отменить
            </button>
          )}
        </div>

        {/* Questions that will be answered */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Вопросы для автоматической оценки:
          </h3>
          <ul className="space-y-2">
            {zone.questions.map((question) => (
              <li key={question.id} className="text-sm text-gray-600 flex items-start">
                <span className="text-blue-500 mr-2 mt-0.5">•</span>
                <span>{question.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Capture Mode Selector */}
      {!isProcessing && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Выберите способ записи
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setCaptureMode('live')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                captureMode === 'live'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <Camera className={`w-8 h-8 mb-2 ${
                  captureMode === 'live' ? 'text-blue-600' : 'text-gray-500'
                }`} />
                <h4 className="font-medium text-gray-900">Прямая съемка</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {isMobile ? 'Рекомендуется для мобильных устройств' : 'Съемка в реальном времени'}
                </p>
              </div>
            </button>
            
            <button
              onClick={() => setCaptureMode('upload')}
              className={`p-4 rounded-lg border-2 transition-colors ${
                captureMode === 'upload'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <Upload className={`w-8 h-8 mb-2 ${
                  captureMode === 'upload' ? 'text-blue-600' : 'text-gray-500'
                }`} />
                <h4 className="font-medium text-gray-900">Загрузка файла</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Загрузить готовое видео
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <ProcessingProgress
          stage={currentStage}
          progress={progress}
          startTime={processingStartTime}
        />
      )}

      {/* Live Vision Analysis */}
      {!isProcessing && captureMode === 'live' && (
        <LiveVisionAnalysis
          onFrameCapture={handleFrameCapture}
          onStartProcessing={startProcessing}
          disabled={isProcessing}
          zone={zone}
        />
      )}

      {/* Video Upload */}
      {!isProcessing && captureMode === 'upload' && (
        <VideoUpload
          onVideoSelect={handleVideoSelect}
          selectedFile={videoFile}
          onStartProcessing={startProcessing}
          disabled={isProcessing}
        />
      )}

      {/* Frame Extraction */}
      {videoFile && isProcessing && currentStage === 'extracting_frames' && (
        <FrameExtractor
          videoFile={videoFile}
          onFramesExtracted={handleFramesExtracted}
          onProgress={(progress) => setProgress(10 + progress * 0.2)}
          onError={onError}
        />
      )}

      {/* Vision Analysis */}
      {extractedFrames.length > 0 && isProcessing && currentStage === 'analyzing_frames' && (
        <VisionAnalyzer
          frames={extractedFrames}
          onAnalysisComplete={handleAnalysisComplete}
          onProgress={(progress) => setProgress(30 + progress * 0.4)}
          onError={onError}
        />
      )}

      {/* Scoring Engine */}
      {detectedObjects.length > 0 && isProcessing && currentStage === 'calculating_scores' && (
        <ScoringEngine
          zone={zone}
          detectedObjects={detectedObjects}
          onScoringComplete={handleScoringComplete}
          onProgress={(progress) => setProgress(70 + progress * 0.25)}
          onError={onError}
        />
      )}

      {/* Instructions */}
      {!isProcessing && !videoFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Как снимать видео для лучшего анализа
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Технические требования:</h4>
              <ul className="space-y-1">
                <li>• Длительность: 15-30 секунд</li>
                <li>• Формат: MP4, WebM, MOV</li>
                <li>• Размер: до 100MB</li>
                <li>• Качество: HD или выше</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Советы по съемке:</h4>
              <ul className="space-y-1">
                <li>• Снимайте при хорошем освещении</li>
                <li>• Показывайте ключевые элементы зоны</li>
                <li>• Медленно поворачивайте камеру</li>
                <li>• Избегайте резких движений</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoProcessor;
