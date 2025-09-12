import { AssessmentResult, DetectedObject, QuestionAnswer } from '../types';

export interface CommentGenerationOptions {
  includeDetails?: boolean;
  maxLength?: number;
  language?: 'ru' | 'en';
  tone?: 'formal' | 'casual' | 'professional';
}

export class CommentGenerator {
  /**
   * Generate aggregated comment from assessment results
   */
  generateAggregatedComment(
    result: AssessmentResult,
    options: CommentGenerationOptions = {}
  ): string {
    const {
      includeDetails = true,
      maxLength = 500,
      language = 'ru',
      tone = 'professional'
    } = options;

    const sections: string[] = [];

    // Zone introduction
    sections.push(this.generateZoneIntroduction(result, language));

    // Overall assessment
    sections.push(this.generateOverallAssessment(result, language));

    // Key findings
    if (includeDetails) {
      sections.push(this.generateKeyFindings(result, language));
    }

    // Positive highlights
    const positiveHighlights = this.generatePositiveHighlights(result, language);
    if (positiveHighlights) {
      sections.push(positiveHighlights);
    }

    // Areas for improvement
    const improvements = this.generateImprovementAreas(result, language);
    if (improvements) {
      sections.push(improvements);
    }

    // Technical summary
    if (includeDetails) {
      sections.push(this.generateTechnicalSummary(result, language));
    }

    let comment = sections.filter(section => section.length > 0).join(' ');

    // Trim to max length if needed
    if (comment.length > maxLength) {
      comment = comment.substring(0, maxLength - 3) + '...';
    }

    return comment;
  }

  /**
   * Generate zone introduction
   */
  private generateZoneIntroduction(result: AssessmentResult, language: 'ru' | 'en'): string {
    const templates = {
      ru: `Проведена автоматизированная оценка зоны "${result.zoneName}" с использованием компьютерного зрения.`,
      en: `Automated assessment of "${result.zoneName}" zone completed using computer vision.`
    };

    return templates[language];
  }

  /**
   * Generate overall assessment summary
   */
  private generateOverallAssessment(result: AssessmentResult, language: 'ru' | 'en'): string {
    const score = result.overallScore;
    const questionCount = result.questionAnswers.length;
    
    let scoreDescription = '';
    
    if (language === 'ru') {
      if (score >= 4.5) {
        scoreDescription = 'отличный результат';
      } else if (score >= 3.5) {
        scoreDescription = 'хороший результат';
      } else if (score >= 2.5) {
        scoreDescription = 'удовлетворительный результат';
      } else {
        scoreDescription = 'результат требует улучшения';
      }
      
      return `Общая оценка ${score.toFixed(1)} из 5.0 - ${scoreDescription}. Проанализировано ${questionCount} критериев качества.`;
    } else {
      if (score >= 4.5) {
        scoreDescription = 'excellent result';
      } else if (score >= 3.5) {
        scoreDescription = 'good result';
      } else if (score >= 2.5) {
        scoreDescription = 'satisfactory result';
      } else {
        scoreDescription = 'result needs improvement';
      }
      
      return `Overall score ${score.toFixed(1)} out of 5.0 - ${scoreDescription}. Analyzed ${questionCount} quality criteria.`;
    }
  }

  /**
   * Generate key findings based on detected objects
   */
  private generateKeyFindings(result: AssessmentResult, language: 'ru' | 'en'): string {
    const positiveObjects = result.detectedObjects.filter(obj => !obj.isNegative);
    const negativeObjects = result.detectedObjects.filter(obj => obj.isNegative);

    if (language === 'ru') {
      let findings = '';
      
      if (positiveObjects.length > 0) {
        const objectList = positiveObjects
          .slice(0, 3)
          .map(obj => `${obj.class}${obj.count > 1 ? ` (${obj.count} шт.)` : ''}`)
          .join(', ');
        findings += `Обнаружены ключевые объекты: ${objectList}.`;
      }

      if (negativeObjects.length > 0) {
        const issueList = negativeObjects
          .slice(0, 2)
          .map(obj => obj.class)
          .join(', ');
        findings += ` Выявлены проблемы: ${issueList}.`;
      }

      return findings;
    } else {
      let findings = '';
      
      if (positiveObjects.length > 0) {
        const objectList = positiveObjects
          .slice(0, 3)
          .map(obj => `${obj.class}${obj.count > 1 ? ` (${obj.count})` : ''}`)
          .join(', ');
        findings += `Key objects detected: ${objectList}.`;
      }

      if (negativeObjects.length > 0) {
        const issueList = negativeObjects
          .slice(0, 2)
          .map(obj => obj.class)
          .join(', ');
        findings += ` Issues identified: ${issueList}.`;
      }

      return findings;
    }
  }

  /**
   * Generate positive highlights
   */
  private generatePositiveHighlights(result: AssessmentResult, language: 'ru' | 'en'): string {
    const excellentAnswers = result.questionAnswers.filter(qa => qa.starRating >= 4);
    
    if (excellentAnswers.length === 0) return '';

    if (language === 'ru') {
      const highlights = excellentAnswers
        .slice(0, 2)
        .map(qa => this.extractKeywords(qa.answer))
        .filter(keyword => keyword.length > 0)
        .join(', ');
        
      return highlights ? `Особенно выделяется: ${highlights}.` : '';
    } else {
      const highlights = excellentAnswers
        .slice(0, 2)
        .map(qa => this.extractKeywords(qa.answer))
        .filter(keyword => keyword.length > 0)
        .join(', ');
        
      return highlights ? `Particularly noteworthy: ${highlights}.` : '';
    }
  }

  /**
   * Generate improvement areas
   */
  private generateImprovementAreas(result: AssessmentResult, language: 'ru' | 'en'): string {
    const poorAnswers = result.questionAnswers.filter(qa => qa.starRating <= 2);
    const negativeObjects = result.detectedObjects.filter(obj => obj.isNegative);

    if (poorAnswers.length === 0 && negativeObjects.length === 0) return '';

    if (language === 'ru') {
      const issues: string[] = [];

      if (poorAnswers.length > 0) {
        issues.push('низкие оценки по некоторым критериям');
      }

      if (negativeObjects.length > 0) {
        const issueTypes = negativeObjects
          .slice(0, 2)
          .map(obj => obj.class)
          .join(', ');
        issues.push(`проблемы с: ${issueTypes}`);
      }

      return `Рекомендуется улучшить: ${issues.join(', ')}.`;
    } else {
      const issues: string[] = [];

      if (poorAnswers.length > 0) {
        issues.push('low scores on some criteria');
      }

      if (negativeObjects.length > 0) {
        const issueTypes = negativeObjects
          .slice(0, 2)
          .map(obj => obj.class)
          .join(', ');
        issues.push(`issues with: ${issueTypes}`);
      }

      return `Recommended improvements: ${issues.join(', ')}.`;
    }
  }

  /**
   * Generate technical summary
   */
  private generateTechnicalSummary(result: AssessmentResult, language: 'ru' | 'en'): string {
    const processingTime = result.processingTime;
    const objectCount = result.detectedObjects.length;
    const avgConfidence = this.calculateAverageConfidence(result.detectedObjects);

    if (language === 'ru') {
      return `Анализ завершен за ${processingTime} сек., обнаружено ${objectCount} объектов со средней уверенностью ${(avgConfidence * 100).toFixed(0)}%.`;
    } else {
      return `Analysis completed in ${processingTime}s, detected ${objectCount} objects with ${(avgConfidence * 100).toFixed(0)}% average confidence.`;
    }
  }

  /**
   * Extract keywords from answer text
   */
  private extractKeywords(answer: string): string {
    // Simple keyword extraction - can be enhanced with NLP
    const keywords = [
      'отличн', 'хорош', 'идеальн', 'чист', 'свеж', 'полн',
      'excellent', 'good', 'perfect', 'clean', 'fresh', 'complete'
    ];

    for (const keyword of keywords) {
      if (answer.toLowerCase().includes(keyword)) {
        return answer.split('.')[0]; // Return first sentence
      }
    }

    return '';
  }

  /**
   * Calculate average confidence from detected objects
   */
  private calculateAverageConfidence(objects: DetectedObject[]): number {
    if (objects.length === 0) return 0;

    const totalConfidence = objects.reduce((sum, obj) => sum + obj.confidence, 0);
    return totalConfidence / objects.length;
  }

  /**
   * Generate comment for specific question type
   */
  generateQuestionComment(
    questionAnswer: QuestionAnswer,
    detectedObjects: DetectedObject[],
    language: 'ru' | 'en' = 'ru'
  ): string {
    const relevantObjects = detectedObjects.filter(obj =>
      questionAnswer.relatedObjects.includes(obj.class)
    );

    if (language === 'ru') {
      let comment = `Оценка: ${questionAnswer.starRating} звезд. `;
      
      if (relevantObjects.length > 0) {
        const objectDescriptions = relevantObjects
          .map(obj => `${obj.class} (${(obj.confidence * 100).toFixed(0)}% уверенность)`)
          .join(', ');
        comment += `Обнаружено: ${objectDescriptions}. `;
      }

      comment += questionAnswer.reasoning;
      
      return comment;
    } else {
      let comment = `Rating: ${questionAnswer.starRating} stars. `;
      
      if (relevantObjects.length > 0) {
        const objectDescriptions = relevantObjects
          .map(obj => `${obj.class} (${(obj.confidence * 100).toFixed(0)}% confidence)`)
          .join(', ');
        comment += `Detected: ${objectDescriptions}. `;
      }

      comment += questionAnswer.reasoning;
      
      return comment;
    }
  }

  /**
   * Generate comparative comment (for multiple assessments)
   */
  generateComparativeComment(
    results: AssessmentResult[],
    language: 'ru' | 'en' = 'ru'
  ): string {
    if (results.length < 2) {
      return this.generateAggregatedComment(results[0]);
    }

    const avgScore = results.reduce((sum, result) => sum + result.overallScore, 0) / results.length;
    const bestZone = results.reduce((best, current) => 
      current.overallScore > best.overallScore ? current : best
    );
    const worstZone = results.reduce((worst, current) => 
      current.overallScore < worst.overallScore ? current : worst
    );

    if (language === 'ru') {
      return `Средняя оценка по ${results.length} зонам: ${avgScore.toFixed(1)} из 5.0. ` +
             `Лучший результат в зоне "${bestZone.zoneName}" (${bestZone.overallScore.toFixed(1)}), ` +
             `требует внимания зона "${worstZone.zoneName}" (${worstZone.overallScore.toFixed(1)}).`;
    } else {
      return `Average score across ${results.length} zones: ${avgScore.toFixed(1)} out of 5.0. ` +
             `Best performance in "${bestZone.zoneName}" (${bestZone.overallScore.toFixed(1)}), ` +
             `needs attention "${worstZone.zoneName}" (${worstZone.overallScore.toFixed(1)}).`;
    }
  }
}

// Singleton instance
let commentGeneratorInstance: CommentGenerator | null = null;

export const getCommentGenerator = (): CommentGenerator => {
  if (!commentGeneratorInstance) {
    commentGeneratorInstance = new CommentGenerator();
  }
  return commentGeneratorInstance;
};