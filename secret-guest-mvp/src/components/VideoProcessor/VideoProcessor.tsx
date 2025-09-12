import React, { useState, useRef, useCallback } from 'react';
import { Upload, Video, ArrowLeft, AlertCircle, CheckCircle, Play } from 'lucide-react';
import { VideoProcessorProps, ProcessingStage, FileValidation, AppError, FrameData } from '../../types';
import { VIDEO_CONSTRAINTS, ERROR_MESSAGES, UI_CONFIG } from '../../constants';
import FrameExtractor from '../FrameExtractor';

const VideoProcessor: React.FC<VideoProcessorProps> = ({
  zone,
  onProcessingComplete,
  onBack,
  className = ''
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<AppError | null>(null);
  const [validation, setValidation] = useState<FileValidation | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // File validation utility
  const validateFile = useCallback((file: File): FileValidation => {
    const errors: string[] = [];
    
    // Check file size
    if (file.size > VIDEO_CONSTRAINTS.maxFileSize) {
      errors.push(ERROR_MESSAGES.upload.fileTooBig);
    }
    
    // Check file format
    if (!VIDEO_CONSTRAINTS.supportedFormats.includes(file.type)) {
      errors.push(ERROR_MESSAGES.upload.invalidFormat);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      fileSize: file.size,
      format: file.type
    };
  }, []);

  // File selection handler
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    setValidation(validation);
    
    if (validation.isValid) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError({
        type: 'validation',
        message: validation.errors[0],
        timestamp: new Date(),
        recoverable: true
      });
    }
  }, [validateFile]);

  // Start video recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: VIDEO_CONSTRAINTS.targetWidth },
          height: { ideal: VIDEO_CONSTRAINTS.targetHeight }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `${zone.id}-recording.webm`, { type: 'video/webm' });
        
        const validation = validateFile(file);
        setValidation(validation);
        
        if (validation.isValid) {
          setSelectedFile(file);
          setError(null);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after max duration
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, VIDEO_CONSTRAINTS.maxDuration * 1000);

    } catch (error) {
      setError({
        type: 'upload',
        message: 'Не удалось получить доступ к камере',
        details: error,
        timestamp: new Date(),
        recoverable: true
      });
    }
  }, [zone.id, validateFile]);

  // Stop video recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  // Start processing the video
  const handleStartProcessing = useCallback(async () => {
    if (!selectedFile) return;

    setProcessingStage('uploading');
    setProgress(10);
    setError(null);

    try {
      // Import services dynamically
      const { getFrameExtractor } = await import('../../services/frameExtractor');
      const { getRoboflowService } = await import('../../services/roboflowService');
      const { getScoringEngine } = await import('../../services/scoringEngine');
      const { getCommentGenerator } = await import('../../services/commentGenerator');

      const frameExtractor = getFrameExtractor();
      const roboflowService = getRoboflowService();
      const scoringEngine = getScoringEngine();
      const commentGenerator = getCommentGenerator();

      // Stage 1: Extract frames
      setProcessingStage('extracting_frames');
      setProgress(20);
      
      const frames = await frameExtractor.extractFrames(selectedFile, (frameProgress) => {
        setProgress(20 + (frameProgress * 0.2)); // 20-40%
      });

      // Stage 2: Analyze frames with AI
      setProcessingStage('analyzing_frames');
      setProgress(40);

      let detectedObjects;
      if (roboflowService.isConfigured()) {
        detectedObjects = await roboflowService.analyzeFrames(frames, (analysisProgress) => {
          setProgress(40 + (analysisProgress * 0.4)); // 40-80%
        });
      } else {
        // Use mock data if API not configured
        detectedObjects = roboflowService.generateMockDetections(zone.id);
        // Simulate processing time
        for (let i = 40; i <= 80; i += 5) {
          setProgress(i);
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Stage 3: Calculate scores
      setProcessingStage('calculating_scores');
      setProgress(80);

      const processingTime = Math.round((Date.now() - Date.now()) / 1000) + 15; // Mock processing time
      const assessmentResult = scoringEngine.scoreZoneAssessment({
        zone,
        detectedObjects,
        processingTime
      });

      // Stage 4: Generate aggregated comment
      setProcessingStage('generating_report');
      setProgress(90);

      const aggregatedComment = commentGenerator.generateAggregatedComment(assessmentResult);
      assessmentResult.aggregatedComment = aggregatedComment;

      // Complete
      setProcessingStage('complete');
      setProgress(100);

      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onProcessingComplete(assessmentResult);

    } catch (error) {
      console.error('Processing error:', error);
      setError({
        type: 'processing',
        message: error instanceof Error ? error.message : 'Произошла ошибка при обработке видео',
        details: error,
        timestamp: new Date(),
        recoverable: true
      });
      setProcessingStage('error');
    }
  }, [selectedFile, zone, onProcessingComplete]);

  // Clear current selection
  const handleClearSelection = useCallback(() => {
    setSelectedFile(null);
    setValidation(null);
    setError(null);
    setProcessingStage('idle');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getProcessingStageLabel = (stage: ProcessingStage): string => {
    const stageInfo = UI_CONFIG.processingStages.find(s => s.stage === stage);
    return stageInfo?.label || 'Обработка...';
  };

  const isProcessing = ['uploading', 'extracting_frames', 'analyzing_frames', 'calculating_scores', 'generating_report'].includes(processingStage);

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          disabled={isProcessing}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Оценка зоны: {zone.name}
          </h1>
          <p className="text-gray-600">{zone.description}</p>
        </div>
      </div>

      {/* Questions Preview */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Вопросы для автоматической оценки
        </h2>
        <div className="space-y-3">
          {zone.questions.map((question, index) => (
            <div key={question.id} className="flex items-start space-x-3">
              <span className="text-primary-500 font-medium mt-1">{index + 1}.</span>
              <div>
                <p className="text-gray-900">{question.text}</p>
                {question.description && (
                  <p className="text-sm text-gray-600 mt-1">{question.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Upload/Recording Section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Загрузка видео
        </h2>

        {!selectedFile && !isRecording && (
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Загрузить видеофайл
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Выберите видеофайл или перетащите его сюда
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary"
                >
                  Выбрать файл
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Поддерживаемые форматы: MP4, WebM, MOV. Максимум 100MB, 10-30 секунд
                </p>
              </div>
            </div>

            {/* OR Divider */}
            <div className="flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-gray-500 text-sm">или</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Video Recording */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Записать видео
              </label>
              <div className="text-center">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  Запишите видео прямо в браузере
                </p>
                <button
                  onClick={startRecording}
                  className="btn-secondary"
                >
                  Начать запись
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Запись автоматически остановится через 30 секунд
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recording State */}
        {isRecording && (
          <div className="text-center space-y-4">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full max-w-md mx-auto rounded-lg"
            />
            <div className="flex items-center justify-center space-x-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-600 font-medium">Идет запись...</span>
            </div>
            <button
              onClick={stopRecording}
              className="btn-primary"
            >
              Остановить запись
            </button>
          </div>
        )}

        {/* File Selected */}
        {selectedFile && !isProcessing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-success-500" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearSelection}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleStartProcessing}
                className="btn-primary flex-1"
              >
                Начать анализ
              </button>
              <button
                onClick={handleClearSelection}
                className="btn-secondary"
              >
                Выбрать другой файл
              </button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-600">
                    {progress}%
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {getProcessingStageLabel(processingStage)}
              </h3>
              <p className="text-gray-600">
                ИИ анализирует ваше видео и отвечает на вопросы анкеты
              </p>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-error-500 mt-0.5" />
              <div>
                <p className="text-error-800 font-medium">Ошибка</p>
                <p className="text-error-700 text-sm">{error.message}</p>
                {error.recoverable && (
                  <button
                    onClick={() => setError(null)}
                    className="text-error-600 hover:text-error-800 text-sm underline mt-2"
                  >
                    Попробовать снова
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoProcessor;