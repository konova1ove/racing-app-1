import React from 'react';
import { Download, RotateCcw, CheckCircle, Eye, Clock } from 'lucide-react';
import { ResultsDisplayProps, QuestionAnswer, DetectedObject } from '../../types';
import StarRating from '../common/StarRating';

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  result,
  onDownloadPDF,
  onAssessAnother,
  className = ''
}) => {
  const formatProcessingTime = (seconds: number): string => {
    return `${seconds} сек`;
  };

  const getOverallRatingColor = (score: number): string => {
    if (score >= 4.5) return 'text-success-600';
    if (score >= 3.5) return 'text-yellow-600';
    if (score >= 2.5) return 'text-warning-600';
    return 'text-error-600';
  };

  const getOverallRatingLabel = (score: number): string => {
    if (score >= 4.5) return 'Отлично';
    if (score >= 3.5) return 'Хорошо';
    if (score >= 2.5) return 'Удовлетворительно';
    if (score >= 1.5) return 'Плохо';
    return 'Очень плохо';
  };

  const QuestionAnswerCard: React.FC<{ qa: QuestionAnswer }> = ({ qa }) => (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex-1 pr-4">
          {qa.questionText}
        </h3>
        <StarRating rating={qa.starRating} size="lg" />
      </div>
      
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Автоматический ответ:</h4>
          <p className="text-gray-900">{qa.answer}</p>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Обоснование:</h4>
          <p className="text-sm text-gray-600">{qa.reasoning}</p>
        </div>
        
        {qa.relatedObjects.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Связанные объекты:</h4>
            <div className="flex flex-wrap gap-1">
              {qa.relatedObjects.map((obj, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full"
                >
                  {obj}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>Уверенность: {(qa.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );

  const DetectedObjectsList: React.FC<{ objects: DetectedObject[] }> = ({ objects }) => {
    const positiveObjects = objects.filter(obj => !obj.isNegative);
    const negativeObjects = objects.filter(obj => obj.isNegative);

    return (
      <div className="card p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <Eye className="w-5 h-5" />
          <span>Обнаруженные объекты</span>
        </h3>
        
        {positiveObjects.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-success-700 mb-2">
              Положительные факторы ({positiveObjects.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {positiveObjects.map((obj, index) => (
                <div
                  key={index}
                  className="p-3 bg-success-50 border border-success-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-success-800">
                      {obj.class}
                    </span>
                    <span className="text-xs text-success-600">
                      {obj.count > 1 ? `×${obj.count}` : ''}
                    </span>
                  </div>
                  <div className="text-xs text-success-600">
                    Уверенность: {(obj.confidence * 100).toFixed(0)}%
                  </div>
                  {obj.description && (
                    <div className="text-xs text-success-600 mt-1">
                      {obj.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {negativeObjects.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-error-700 mb-2">
              Проблемы ({negativeObjects.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {negativeObjects.map((obj, index) => (
                <div
                  key={index}
                  className="p-3 bg-error-50 border border-error-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-error-800">
                      {obj.class}
                    </span>
                    <span className="text-xs text-error-600">
                      {obj.count > 1 ? `×${obj.count}` : ''}
                    </span>
                  </div>
                  <div className="text-xs text-error-600">
                    Уверенность: {(obj.confidence * 100).toFixed(0)}%
                  </div>
                  {obj.description && (
                    <div className="text-xs text-error-600 mt-1">
                      {obj.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {objects.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            Объекты не обнаружены
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header with Overall Score */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Результаты оценки: {result.zoneName}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-success-500" />
                <span>Завершено {result.completedAt.toLocaleString('ru-RU')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Время обработки: {formatProcessingTime(result.processingTime)}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Общая оценка</div>
            <div className={`text-3xl font-bold ${getOverallRatingColor(result.overallScore)}`}>
              {result.overallScore.toFixed(1)}
            </div>
            <div className={`text-sm font-medium ${getOverallRatingColor(result.overallScore)}`}>
              {getOverallRatingLabel(result.overallScore)}
            </div>
            <StarRating 
              rating={result.overallScore} 
              size="lg" 
              showValue={false}
              className="justify-end mt-2"
            />
          </div>
        </div>
        
        {/* Aggregated Comment */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Сводный комментарий
          </h3>
          <p className="text-gray-900">{result.aggregatedComment}</p>
        </div>
      </div>

      {/* Question-Answer Pairs */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Автоматические ответы на вопросы анкеты
        </h2>
        {result.questionAnswers.map((qa) => (
          <QuestionAnswerCard key={qa.questionId} qa={qa} />
        ))}
      </div>

      {/* Detected Objects */}
      <DetectedObjectsList objects={result.detectedObjects} />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onDownloadPDF}
          className="btn-primary flex items-center justify-center space-x-2 flex-1"
        >
          <Download className="w-5 h-5" />
          <span>Скачать PDF-отчет</span>
        </button>
        <button
          onClick={onAssessAnother}
          className="btn-secondary flex items-center justify-center space-x-2 flex-1"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Оценить другую зону</span>
        </button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-primary-600 mb-1">
            {result.questionAnswers.length}
          </div>
          <div className="text-sm text-gray-600">Вопросов оценено</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-success-600 mb-1">
            {result.detectedObjects.filter(obj => !obj.isNegative).length}
          </div>
          <div className="text-sm text-gray-600">Положительных факторов</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-error-600 mb-1">
            {result.detectedObjects.filter(obj => obj.isNegative).length}
          </div>
          <div className="text-sm text-gray-600">Проблем обнаружено</div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;