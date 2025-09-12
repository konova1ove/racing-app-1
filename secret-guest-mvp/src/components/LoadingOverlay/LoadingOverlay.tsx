import React from 'react';
import type { ProcessingStage } from '../../types';
import { UI_CONFIG } from '../../constants';

interface LoadingOverlayProps {
  stage: ProcessingStage;
  isVisible: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  stage,
  isVisible
}) => {
  if (!isVisible) return null;

  // Get stage information
  const getStageInfo = (currentStage: ProcessingStage) => {
    const stageConfig = UI_CONFIG.processingStages.find(s => s.stage === currentStage);
    return stageConfig || { stage: currentStage, label: 'Обработка...', progress: 0 };
  };

  const stageInfo = getStageInfo(stage);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        {/* Animated loading icon */}
        <div className="w-16 h-16 mx-auto mb-6">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>

        {/* Stage message */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Обработка видео
        </h3>
        <p className="text-gray-600 text-sm mb-4">
          {stageInfo.label}
        </p>

        {/* Progress indicator */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${stageInfo.progress}%` }}
          />
        </div>

        <p className="text-xs text-gray-500">
          Пожалуйста, не закрывайте окно
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;