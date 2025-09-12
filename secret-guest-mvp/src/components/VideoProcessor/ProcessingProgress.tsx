import React from 'react';
import type { ProcessingStage } from '../../types';
import { UI_CONFIG } from '../../constants';

interface ProcessingProgressProps {
  stage: ProcessingStage;
  progress: number;
  startTime: number;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  stage,
  progress,
  startTime
}) => {
  // Get stage information
  const getStageInfo = (currentStage: ProcessingStage) => {
    const stageConfig = UI_CONFIG.processingStages.find(s => s.stage === currentStage);
    return stageConfig || { stage: currentStage, label: 'Обработка...', progress: 0 };
  };

  // Calculate elapsed time
  const getElapsedTime = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
  };

  const stageInfo = getStageInfo(stage);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Обработка видео
        </h3>
        <p className="text-gray-600 text-sm">
          {stageInfo.label}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Прогресс</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage indicators */}
      <div className="mt-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Этапы обработки</span>
          <span>Время: {getElapsedTime()}</span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {UI_CONFIG.processingStages.map((stageConfig, index) => {
            const isActive = stageConfig.stage === stage;
            const isCompleted = stageConfig.progress <= progress;
            
            return (
              <div
                key={stageConfig.stage}
                className={`p-2 rounded text-center text-xs transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : isCompleted
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                <div className="font-medium">{index + 1}</div>
                <div className="text-xs mt-1 leading-tight">
                  {stageConfig.stage === 'uploading' && 'Загрузка'}
                  {stageConfig.stage === 'extracting_frames' && 'Кадры'}
                  {stageConfig.stage === 'analyzing_frames' && 'Анализ'}
                  {stageConfig.stage === 'calculating_scores' && 'Оценки'}
                  {stageConfig.stage === 'generating_report' && 'Отчет'}
                  {stageConfig.stage === 'complete' && 'Готово'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current activity */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-3" />
          <span className="text-sm text-gray-700">
            {stageInfo.label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProcessingProgress;