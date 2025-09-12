import React, { useCallback } from 'react';
import type { AssessmentResult } from '../../types';
import { Star, Download, RotateCcw, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import PDFGenerator from '../PDFGenerator/PDFGenerator';

interface ResultsDisplayProps {
  result: AssessmentResult;
  onAssessAnother: () => void;
  className?: string;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  result,
  onAssessAnother,
  className = ''
}) => {
  // Render star rating
  const renderStarRating = useCallback((rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className={`ml-2 font-medium ${
          size === 'lg' ? 'text-lg' : size === 'md' ? 'text-sm' : 'text-xs'
        } text-gray-700`}>
          {rating}/5
        </span>
      </div>
    );
  }, []);

  // Get score color class
  const getScoreColor = useCallback((score: number) => {
    if (score >= 4.5) return 'text-green-600 bg-green-100';
    if (score >= 3.5) return 'text-blue-600 bg-blue-100';
    if (score >= 2.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }, []);

  // Format processing time
  const formatProcessingTime = useCallback((seconds: number) => {
    if (seconds < 60) return `${seconds} сек`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with overall score */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-500 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Оценка завершена
              </h2>
              <p className="text-gray-600">
                {result.zoneName} • {result.questionAnswers.length} вопросов
              </p>
            </div>
          </div>

          {/* Overall score */}
          <div className={`inline-flex items-center px-6 py-3 rounded-full ${getScoreColor(result.overallScore)}`}>
            <span className="text-2xl font-bold mr-2">
              {result.overallScore}
            </span>
            {renderStarRating(Math.round(result.overallScore), 'lg')}
          </div>

          {/* Processing info */}
          <div className="flex items-center justify-center mt-4 text-sm text-gray-500 space-x-4">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>Время обработки: {formatProcessingTime(result.processingTime)}</span>
            </div>
            <div className="flex items-center">
              <span>Завершено: {result.completedAt.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-4 justify-center">
          <PDFGenerator
            result={result}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-5 h-5 mr-2" />
            Скачать PDF-отчет
          </PDFGenerator>
          
          <button
            onClick={onAssessAnother}
            className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Оценить другую зону
          </button>
        </div>
      </div>

      {/* Question answers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Ответы на вопросы анкеты
        </h3>
        
        <div className="space-y-6">
          {result.questionAnswers.map((answer, index) => (
            <div
              key={answer.questionId}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {index + 1}. {answer.questionText}
                  </h4>
                  <div className="flex items-center space-x-3">
                    {renderStarRating(answer.starRating)}
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${getScoreColor(answer.starRating)}`}>
                      {answer.answer}
                    </span>
                  </div>
                </div>
              </div>

              {/* Answer details */}
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  <strong>Обоснование:</strong> {answer.reasoning}
                </p>
                
                {answer.relatedObjects.length > 0 && (
                  <p>
                    <strong>Обнаруженные объекты:</strong> {answer.relatedObjects.join(', ')}
                  </p>
                )}
                
                <p>
                  <strong>Уверенность:</strong> {Math.round(answer.confidence * 100)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detected objects summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Обнаруженные объекты
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Positive objects */}
          <div>
            <h4 className="font-medium text-green-700 mb-3 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Положительные факторы
            </h4>
            <div className="space-y-2">
              {result.detectedObjects
                .filter(obj => !obj.isNegative)
                .map((obj, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-green-50 rounded"
                  >
                    <span className="text-sm text-green-800">
                      {obj.description || obj.class}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-green-600">
                        {obj.count}x
                      </span>
                      <span className="text-xs text-green-600">
                        {Math.round(obj.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              {result.detectedObjects.filter(obj => !obj.isNegative).length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  Положительные факторы не обнаружены
                </p>
              )}
            </div>
          </div>

          {/* Negative objects */}
          <div>
            <h4 className="font-medium text-red-700 mb-3 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Проблемы и замечания
            </h4>
            <div className="space-y-2">
              {result.detectedObjects
                .filter(obj => obj.isNegative)
                .map((obj, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-red-50 rounded"
                  >
                    <span className="text-sm text-red-800">
                      {obj.description || obj.class}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-red-600">
                        {obj.count}x
                      </span>
                      <span className="text-xs text-red-600">
                        {Math.round(obj.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              {result.detectedObjects.filter(obj => obj.isNegative).length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  Проблемы не обнаружены
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Aggregated comment */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Сводный комментарий
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-gray-700 leading-relaxed">
            {result.aggregatedComment}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;