import React, { useEffect, useCallback, useRef } from 'react';
import type { Zone, DetectedObject, AssessmentResult, QuestionAnswer } from '../../types';
import { SCORING_CONFIG } from '../../constants';

interface ScoringEngineProps {
  zone: Zone;
  detectedObjects: DetectedObject[];
  onScoringComplete: (result: AssessmentResult) => void;
  onProgress: (progress: number) => void;
  onError: (error: string) => void;
}

const ScoringEngine: React.FC<ScoringEngineProps> = ({
  zone,
  detectedObjects,
  onScoringComplete,
  onProgress,
  onError
}) => {
  const isScoringRef = useRef(false);

  // Calculate scores and generate assessment result
  const calculateScores = useCallback(async () => {
    if (isScoringRef.current) return;
    isScoringRef.current = true;

    try {
      onProgress(0);

      const questionAnswers: QuestionAnswer[] = [];
      let totalWeightedScore = 0;
      let totalWeight = 0;

      // Process each question
      for (let i = 0; i < zone.questions.length; i++) {
        const question = zone.questions[i];
        onProgress((i / zone.questions.length) * 80);

        // Calculate score for this question
        const questionScore = calculateQuestionScore(question, detectedObjects);
        const answer = generateQuestionAnswer(question, detectedObjects, questionScore);
        
        questionAnswers.push(answer);
        
        totalWeightedScore += questionScore.stars * question.weight;
        totalWeight += question.weight;
      }

      onProgress(90);

      // Calculate overall score
      const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

      // Generate aggregated comment
      const aggregatedComment = generateAggregatedComment(zone, detectedObjects, questionAnswers);

      onProgress(95);

      // Create assessment result
      const result: AssessmentResult = {
        zoneId: zone.id,
        zoneName: zone.name,
        questionAnswers,
        detectedObjects,
        aggregatedComment,
        overallScore: Math.round(overallScore * 10) / 10,
        completedAt: new Date(),
        processingTime: 0 // Will be calculated by parent component
      };

      onProgress(100);
      onScoringComplete(result);

    } catch (error) {
      console.error('Scoring error:', error);
      onError(error instanceof Error ? error.message : 'Failed to calculate scores');
    } finally {
      isScoringRef.current = false;
    }
  }, [zone, detectedObjects, onScoringComplete, onProgress, onError]);

  // Calculate score for a single question
  const calculateQuestionScore = useCallback((question: any, objects: DetectedObject[]) => {
    let score = SCORING_CONFIG.maxStars;
    let confidence = 0;
    let relatedObjects: string[] = [];
    let reasoning = '';

    // Find relevant objects for this question
    const relevantObjects = objects.filter(obj => 
      question.detectionRules.some((rule: any) => rule.objectClass === obj.class)
    );

    relatedObjects = relevantObjects.map(obj => obj.class);

    if (relevantObjects.length === 0) {
      // No relevant objects detected - use default scoring
      const hasPositiveFactors = question.scoringCriteria.positiveFactors.some((factor: string) =>
        objects.some(obj => obj.class === factor)
      );

      if (!hasPositiveFactors) {
        score = Math.max(1, SCORING_CONFIG.maxStars - 2);
        reasoning = 'Не обнаружены ожидаемые объекты для оценки';
      } else {
        reasoning = 'Базовая оценка на основе общих факторов';
      }
    } else {
      // Calculate score based on detection rules
      let scoreModifier = 0;
      let detectedIssues: string[] = [];
      let detectedPositives: string[] = [];

      relevantObjects.forEach(obj => {
        const rule = question.detectionRules.find((r: any) => r.objectClass === obj.class);
        if (rule) {
          scoreModifier += rule.scoreModifier * obj.count;
          confidence = Math.max(confidence, obj.confidence);

          if (obj.isNegative) {
            detectedIssues.push(obj.class);
          } else {
            detectedPositives.push(obj.class);
          }
        }
      });

      // Apply scoring thresholds
      for (const threshold of question.scoringCriteria.thresholds) {
        const relevantCount = relevantObjects.reduce((sum, obj) => sum + obj.count, 0);
        
        let meetsThreshold = false;
        if (threshold.minCount !== undefined && threshold.maxCount !== undefined) {
          meetsThreshold = relevantCount >= threshold.minCount && relevantCount <= threshold.maxCount;
        } else if (threshold.minCount !== undefined) {
          meetsThreshold = relevantCount >= threshold.minCount;
        } else if (threshold.maxCount !== undefined) {
          meetsThreshold = relevantCount <= threshold.maxCount;
        }

        if (meetsThreshold) {
          score = threshold.stars;
          reasoning = threshold.description;
          break;
        }
      }

      // Apply modifiers
      score = Math.max(1, Math.min(SCORING_CONFIG.maxStars, score + scoreModifier));

      // Generate reasoning
      if (detectedIssues.length > 0 && detectedPositives.length > 0) {
        reasoning = `Обнаружены положительные факторы (${detectedPositives.join(', ')}) и проблемы (${detectedIssues.join(', ')})`;
      } else if (detectedIssues.length > 0) {
        reasoning = `Обнаружены проблемы: ${detectedIssues.join(', ')}`;
      } else if (detectedPositives.length > 0) {
        reasoning = `Обнаружены положительные факторы: ${detectedPositives.join(', ')}`;
      }
    }

    return {
      stars: Math.round(score),
      confidence: Math.round(confidence * 100) / 100,
      relatedObjects,
      reasoning: reasoning || 'Автоматическая оценка на основе анализа изображений'
    };
  }, []);

  // Generate answer for a question
  const generateQuestionAnswer = useCallback((question: any, objects: DetectedObject[], scoreData: any): QuestionAnswer => {
    return {
      questionId: question.id,
      questionText: question.text,
      answer: generateAnswerText(question, objects, scoreData),
      starRating: scoreData.stars,
      confidence: scoreData.confidence,
      relatedObjects: scoreData.relatedObjects,
      reasoning: scoreData.reasoning
    };
  }, []);

  // Generate answer text based on score
  const generateAnswerText = useCallback((question: any, objects: DetectedObject[], scoreData: any): string => {
    const stars = scoreData.stars;
    
    if (stars >= 5) {
      return 'Отлично';
    } else if (stars >= 4) {
      return 'Хорошо';
    } else if (stars >= 3) {
      return 'Удовлетворительно';
    } else if (stars >= 2) {
      return 'Плохо';
    } else {
      return 'Очень плохо';
    }
  }, []);

  // Generate aggregated comment
  const generateAggregatedComment = useCallback((zone: Zone, objects: DetectedObject[], answers: QuestionAnswer[]): string => {
    const comments: string[] = [];
    
    // Summarize detected objects
    const positiveObjects = objects.filter(obj => !obj.isNegative);
    const negativeObjects = objects.filter(obj => obj.isNegative);

    if (positiveObjects.length > 0) {
      const objectList = positiveObjects.map(obj => `${obj.class} (${obj.count})`).join(', ');
      comments.push(`Обнаружены объекты: ${objectList}`);
    }

    if (negativeObjects.length > 0) {
      const issueList = negativeObjects.map(obj => `${obj.class} (${obj.count})`).join(', ');
      comments.push(`Выявлены проблемы: ${issueList}`);
    }

    // Add overall assessment
    const avgScore = answers.reduce((sum, answer) => sum + answer.starRating, 0) / answers.length;
    if (avgScore >= 4.5) {
      comments.push('Зона соответствует высоким стандартам качества');
    } else if (avgScore >= 3.5) {
      comments.push('Зона в целом соответствует стандартам с незначительными замечаниями');
    } else if (avgScore >= 2.5) {
      comments.push('Зона требует улучшений для соответствия стандартам');
    } else {
      comments.push('Зона нуждается в серьезных улучшениях');
    }

    return comments.join('. ') + '.';
  }, []);

  // Start scoring when component mounts
  useEffect(() => {
    calculateScores();
  }, [calculateScores]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="text-blue-600 text-2xl">⭐</div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Подсчет оценок
        </h3>
        <p className="text-gray-600 text-sm">
          Анализируем результаты и вычисляем звездные рейтинги...
        </p>
        
        <div className="mt-4 text-sm text-gray-500">
          Обрабатываются {zone.questions.length} вопросов
        </div>
      </div>
    </div>
  );
};

export default ScoringEngine;