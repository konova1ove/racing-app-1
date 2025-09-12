import { 
  Zone, 
  Question, 
  DetectedObject, 
  QuestionAnswer, 
  AssessmentResult,
  StarRating,
  ScoringCriteria,
  DetectionRule
} from '../types';
import { SCORING_CONFIG } from '../constants';

export interface ScoringContext {
  zone: Zone;
  detectedObjects: DetectedObject[];
  processingTime: number;
}

export interface QuestionScoringResult {
  questionAnswer: QuestionAnswer;
  score: number;
  confidence: number;
  reasoning: string;
}

export class ScoringEngine {
  /**
   * Calculate scores for all questions in a zone
   */
  scoreZoneAssessment(context: ScoringContext): AssessmentResult {
    const { zone, detectedObjects, processingTime } = context;
    
    const questionAnswers: QuestionAnswer[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Score each question
    for (const question of zone.questions) {
      const result = this.scoreQuestion(question, detectedObjects);
      questionAnswers.push(result.questionAnswer);
      
      totalWeightedScore += result.score * question.weight;
      totalWeight += question.weight;
    }

    // Calculate overall score
    const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      questionAnswers,
      detectedObjects,
      aggregatedComment: '', // Will be filled by comment generator
      overallScore: Math.round(overallScore * 10) / 10, // Round to 1 decimal
      completedAt: new Date(),
      processingTime
    };
  }

  /**
   * Score a single question based on detected objects
   */
  private scoreQuestion(
    question: Question, 
    detectedObjects: DetectedObject[]
  ): QuestionScoringResult {
    const { scoringCriteria, detectionRules } = question;
    
    // Get relevant objects for this question
    const relevantObjects = this.getRelevantObjects(detectedObjects, detectionRules);
    
    // Calculate base score from thresholds
    const thresholdScore = this.calculateThresholdScore(relevantObjects, scoringCriteria);
    
    // Apply detection rule modifiers
    const modifiedScore = this.applyDetectionModifiers(
      thresholdScore, 
      relevantObjects, 
      detectionRules
    );
    
    // Ensure score is within valid range
    const finalScore = Math.max(1, Math.min(5, modifiedScore));
    const starRating = Math.round(finalScore) as StarRating;
    
    // Calculate confidence based on detection confidence
    const confidence = this.calculateConfidence(relevantObjects);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(
      question,
      relevantObjects,
      finalScore,
      scoringCriteria
    );

    // Generate answer text
    const answer = this.generateAnswerText(question, relevantObjects, finalScore);

    const questionAnswer: QuestionAnswer = {
      questionId: question.id,
      questionText: question.text,
      answer,
      starRating,
      confidence,
      relatedObjects: relevantObjects.map(obj => obj.class),
      reasoning
    };

    return {
      questionAnswer,
      score: finalScore,
      confidence,
      reasoning
    };
  }

  /**
   * Get objects relevant to a specific question
   */
  private getRelevantObjects(
    detectedObjects: DetectedObject[],
    detectionRules: DetectionRule[]
  ): DetectedObject[] {
    const ruleClasses = new Set(detectionRules.map(rule => rule.objectClass));
    return detectedObjects.filter(obj => ruleClasses.has(obj.class));
  }

  /**
   * Calculate score based on threshold criteria
   */
  private calculateThresholdScore(
    relevantObjects: DetectedObject[],
    criteria: ScoringCriteria
  ): number {
    // Count positive and negative factors
    const positiveCount = relevantObjects
      .filter(obj => !obj.isNegative && criteria.positiveFactors.includes(obj.class))
      .reduce((sum, obj) => sum + obj.count, 0);
    
    const negativeCount = relevantObjects
      .filter(obj => obj.isNegative || criteria.negativeFactors.includes(obj.class))
      .reduce((sum, obj) => sum + obj.count, 0);

    // Find matching threshold
    for (const threshold of criteria.thresholds.sort((a, b) => b.stars - a.stars)) {
      let matches = false;

      if (threshold.condition === 'and') {
        // All conditions must be met
        const minCount = threshold.minCount || 0;
        const maxCount = threshold.maxCount || Infinity;
        
        if (positiveCount >= minCount && positiveCount <= maxCount && negativeCount === 0) {
          matches = true;
        }
      } else {
        // Any condition can be met (or logic)
        const minCount = threshold.minCount || 0;
        const maxCount = threshold.maxCount || Infinity;
        
        if (positiveCount >= minCount && positiveCount <= maxCount) {
          matches = true;
        }
      }

      if (matches) {
        return threshold.stars;
      }
    }

    // Default score if no threshold matches
    return criteria.maxStars / 2;
  }

  /**
   * Apply detection rule modifiers to the base score
   */
  private applyDetectionModifiers(
    baseScore: number,
    relevantObjects: DetectedObject[],
    detectionRules: DetectionRule[]
  ): number {
    let modifiedScore = baseScore;

    for (const obj of relevantObjects) {
      const rule = detectionRules.find(r => r.objectClass === obj.class);
      if (!rule) continue;

      // Apply modifier based on importance and count
      let modifier = rule.scoreModifier;
      
      // Scale modifier by object count and confidence
      modifier *= Math.min(obj.count, 3); // Cap at 3x
      modifier *= obj.confidence; // Weight by detection confidence
      
      // Apply importance weighting
      switch (rule.importance) {
        case 'critical':
          modifier *= 1.5;
          break;
        case 'major':
          modifier *= 1.2;
          break;
        case 'minor':
          modifier *= 0.8;
          break;
      }

      modifiedScore += modifier;
    }

    return modifiedScore;
  }

  /**
   * Calculate confidence based on detection confidences
   */
  private calculateConfidence(relevantObjects: DetectedObject[]): number {
    if (relevantObjects.length === 0) {
      return 0.5; // Default confidence when no objects detected
    }

    // Average confidence weighted by object count
    let totalConfidence = 0;
    let totalCount = 0;

    for (const obj of relevantObjects) {
      totalConfidence += obj.confidence * obj.count;
      totalCount += obj.count;
    }

    return totalCount > 0 ? totalConfidence / totalCount : 0.5;
  }

  /**
   * Generate human-readable reasoning for the score
   */
  private generateReasoning(
    question: Question,
    relevantObjects: DetectedObject[],
    score: number,
    criteria: ScoringCriteria
  ): string {
    const parts: string[] = [];

    // Describe detected positive factors
    const positiveObjects = relevantObjects.filter(obj => 
      !obj.isNegative && criteria.positiveFactors.includes(obj.class)
    );
    
    if (positiveObjects.length > 0) {
      const objectDescriptions = positiveObjects.map(obj => 
        `${obj.class} (${obj.count}${obj.count > 1 ? ' шт.' : ' шт.'})`
      );
      parts.push(`Обнаружено: ${objectDescriptions.join(', ')}`);
    }

    // Describe detected negative factors
    const negativeObjects = relevantObjects.filter(obj => 
      obj.isNegative || criteria.negativeFactors.includes(obj.class)
    );
    
    if (negativeObjects.length > 0) {
      const objectDescriptions = negativeObjects.map(obj => 
        `${obj.class} (${obj.count}${obj.count > 1 ? ' шт.' : ' шт.'})`
      );
      parts.push(`Проблемы: ${objectDescriptions.join(', ')}`);
    }

    // Add score interpretation
    if (score >= 4.5) {
      parts.push('Отличное качество');
    } else if (score >= 3.5) {
      parts.push('Хорошее качество');
    } else if (score >= 2.5) {
      parts.push('Удовлетворительное качество');
    } else {
      parts.push('Требует улучшения');
    }

    return parts.join('. ') || 'Анализ выполнен на основе компьютерного зрения';
  }

  /**
   * Generate answer text for the question
   */
  private generateAnswerText(
    question: Question,
    relevantObjects: DetectedObject[],
    score: number
  ): string {
    // Map question IDs to specific answer templates
    const questionId = question.id;
    
    switch (questionId) {
      case 'reception-check-in-speed':
        const peopleCount = relevantObjects
          .filter(obj => obj.class === 'person')
          .reduce((sum, obj) => sum + obj.count, 0);
        
        if (peopleCount <= 3) {
          return 'Быстрое обслуживание - небольшая очередь у стойки';
        } else if (peopleCount <= 6) {
          return 'Умеренная скорость обслуживания - средняя очередь';
        } else {
          return 'Медленное обслуживание - длинная очередь';
        }

      case 'reception-navigation':
        const signCount = relevantObjects
          .filter(obj => ['sign', 'arrow', 'directional_indicator'].includes(obj.class))
          .reduce((sum, obj) => sum + obj.count, 0);
        
        if (signCount >= 2) {
          return 'Отличная навигация - множественные указатели';
        } else if (signCount === 1) {
          return 'Базовая навигация - минимальные указатели';
        } else {
          return 'Проблемы с навигацией - указатели не обнаружены';
        }

      case 'reception-cleanliness':
        const negativeCount = relevantObjects
          .filter(obj => obj.isNegative)
          .reduce((sum, obj) => sum + obj.count, 0);
        
        if (negativeCount === 0) {
          return 'Идеальная чистота и порядок';
        } else if (negativeCount <= 2) {
          return 'В целом чисто, незначительные замечания';
        } else {
          return 'Требуется улучшение чистоты';
        }

      case 'room-amenities':
        const amenities = ['bed', 'tv', 'kettle', 'water_bottle'];
        const foundAmenities = amenities.filter(amenity =>
          relevantObjects.some(obj => obj.class === amenity)
        );
        
        return `${foundAmenities.length} из 4 базовых удобств присутствуют: ${foundAmenities.join(', ')}`;

      case 'room-bedding-cleanliness':
        const beddingIssues = relevantObjects
          .filter(obj => ['stain_on_sheet', 'hair_on_linen'].includes(obj.class))
          .reduce((sum, obj) => sum + obj.count, 0);
        
        if (beddingIssues === 0) {
          return 'Постельное белье чистое и свежее';
        } else {
          return `Обнаружены проблемы с чистотой белья (${beddingIssues} шт.)`;
        }

      case 'room-window-lighting':
        const hasWindow = relevantObjects.some(obj => obj.class === 'window');
        const hasIssues = relevantObjects.some(obj => 
          ['streaked_glass', 'dirty_window'].includes(obj.class)
        );
        
        if (hasWindow && !hasIssues) {
          return 'Окна чистые, хорошее естественное освещение';
        } else if (hasWindow && hasIssues) {
          return 'Окна требуют очистки';
        } else {
          return 'Окна не обнаружены или плохое освещение';
        }

      case 'bathroom-fixtures-cleanliness':
        const fixtureIssues = relevantObjects
          .filter(obj => ['stain_on_sink', 'dirty_toilet', 'hair_in_shower'].includes(obj.class))
          .reduce((sum, obj) => sum + obj.count, 0);
        
        if (fixtureIssues === 0) {
          return 'Вся сантехника в отличном состоянии';
        } else {
          return `Обнаружены проблемы с чистотой сантехники (${fixtureIssues} шт.)`;
        }

      case 'bathroom-supplies':
        const towelCount = relevantObjects
          .filter(obj => obj.class === 'towel')
          .reduce((sum, obj) => sum + obj.count, 0);
        const hasAmenities = relevantObjects.some(obj => 
          ['amenities_kit', 'soap_dispenser'].includes(obj.class)
        );
        
        if (towelCount > 0 && hasAmenities) {
          return `Полный набор принадлежностей: полотенца (${towelCount} шт.) и туалетные принадлежности`;
        } else if (towelCount > 0) {
          return `Полотенца предоставлены (${towelCount} шт.), туалетные принадлежности частично`;
        } else {
          return 'Недостаточно полотенец и принадлежностей';
        }

      default:
        // Generic answer based on score
        if (score >= 4) {
          return 'Высокое качество по всем критериям';
        } else if (score >= 3) {
          return 'Хорошее качество с незначительными замечаниями';
        } else if (score >= 2) {
          return 'Удовлетворительное качество, есть области для улучшения';
        } else {
          return 'Качество требует существенного улучшения';
        }
    }
  }

  /**
   * Calculate overall zone score from question scores
   */
  calculateOverallScore(questionAnswers: QuestionAnswer[], zone: Zone): number {
    if (questionAnswers.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const qa of questionAnswers) {
      const question = zone.questions.find(q => q.id === qa.questionId);
      const weight = question?.weight || 1.0;
      
      totalWeightedScore += qa.starRating * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  }

  /**
   * Get score category label
   */
  getScoreCategory(score: number): string {
    if (score >= SCORING_CONFIG.starThresholds.excellent) return 'Отлично';
    if (score >= SCORING_CONFIG.starThresholds.good) return 'Хорошо';
    if (score >= SCORING_CONFIG.starThresholds.average) return 'Удовлетворительно';
    if (score >= SCORING_CONFIG.starThresholds.poor) return 'Плохо';
    return 'Очень плохо';
  }
}

// Singleton instance
let scoringEngineInstance: ScoringEngine | null = null;

export const getScoringEngine = (): ScoringEngine => {
  if (!scoringEngineInstance) {
    scoringEngineInstance = new ScoringEngine();
  }
  return scoringEngineInstance;
};