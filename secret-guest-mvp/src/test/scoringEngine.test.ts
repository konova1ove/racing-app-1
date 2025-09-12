import { describe, it, expect, beforeEach } from 'vitest';
import { getScoringEngine } from '../services/scoringEngine';
import { Zone, DetectedObject } from '../types';
import { ZONES } from '../constants/zones';

describe('ScoringEngine', () => {
  let scoringEngine: ReturnType<typeof getScoringEngine>;
  let testZone: Zone;
  let mockDetectedObjects: DetectedObject[];

  beforeEach(() => {
    scoringEngine = getScoringEngine();
    testZone = ZONES[0]; // Reception zone
    mockDetectedObjects = [
      {
        class: 'person',
        confidence: 0.85,
        count: 3,
        isNegative: false,
        frameIndices: [0, 1, 2]
      },
      {
        class: 'reception_desk',
        confidence: 0.92,
        count: 1,
        isNegative: false,
        frameIndices: [1, 2]
      },
      {
        class: 'trash',
        confidence: 0.78,
        count: 1,
        isNegative: true,
        frameIndices: [2]
      }
    ];
  });

  it('should create scoring engine instance', () => {
    expect(scoringEngine).toBeDefined();
  });

  it('should score zone assessment correctly', () => {
    const result = scoringEngine.scoreZoneAssessment({
      zone: testZone,
      detectedObjects: mockDetectedObjects,
      processingTime: 15
    });

    expect(result).toBeDefined();
    expect(result.zoneId).toBe(testZone.id);
    expect(result.zoneName).toBe(testZone.name);
    expect(result.questionAnswers).toHaveLength(testZone.questions.length);
    expect(result.detectedObjects).toBe(mockDetectedObjects);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(5);
    expect(result.processingTime).toBe(15);
  });

  it('should generate valid question answers', () => {
    const result = scoringEngine.scoreZoneAssessment({
      zone: testZone,
      detectedObjects: mockDetectedObjects,
      processingTime: 15
    });

    result.questionAnswers.forEach(qa => {
      expect(qa.questionId).toBeDefined();
      expect(qa.questionText).toBeDefined();
      expect(qa.answer).toBeDefined();
      expect(qa.starRating).toBeGreaterThanOrEqual(1);
      expect(qa.starRating).toBeLessThanOrEqual(5);
      expect(qa.confidence).toBeGreaterThanOrEqual(0);
      expect(qa.confidence).toBeLessThanOrEqual(1);
      expect(qa.reasoning).toBeDefined();
    });
  });

  it('should handle empty detected objects', () => {
    const result = scoringEngine.scoreZoneAssessment({
      zone: testZone,
      detectedObjects: [],
      processingTime: 10
    });

    expect(result).toBeDefined();
    expect(result.questionAnswers).toHaveLength(testZone.questions.length);
    expect(result.overallScore).toBeDefined();
  });

  it('should calculate overall score from question answers', () => {
    const mockQuestionAnswers = [
      {
        questionId: 'test-1',
        questionText: 'Test question 1',
        answer: 'Test answer',
        starRating: 4 as const,
        confidence: 0.8,
        relatedObjects: ['person'],
        reasoning: 'Test reasoning'
      },
      {
        questionId: 'test-2',
        questionText: 'Test question 2',
        answer: 'Test answer',
        starRating: 3 as const,
        confidence: 0.7,
        relatedObjects: ['desk'],
        reasoning: 'Test reasoning'
      }
    ];

    const overallScore = scoringEngine.calculateOverallScore(mockQuestionAnswers, testZone);
    expect(overallScore).toBeGreaterThan(0);
    expect(overallScore).toBeLessThanOrEqual(5);
  });

  it('should get correct score category', () => {
    expect(scoringEngine.getScoreCategory(4.8)).toBe('Отлично');
    expect(scoringEngine.getScoreCategory(3.8)).toBe('Хорошо');
    expect(scoringEngine.getScoreCategory(2.8)).toBe('Удовлетворительно');
    expect(scoringEngine.getScoreCategory(1.8)).toBe('Плохо');
    expect(scoringEngine.getScoreCategory(0.8)).toBe('Очень плохо');
  });
});