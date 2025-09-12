import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultsDisplay from '../components/ResultsDisplay';
import { AssessmentResult } from '../types';

// Mock PDF generation service
vi.mock('../services/pdfGenerator', () => ({
  getPdfGenerator: () => ({
    generateReport: vi.fn().mockResolvedValue(undefined)
  })
}));

const mockResult: AssessmentResult = {
  zoneId: 'reception',
  zoneName: 'Ресепшн',
  questionAnswers: [
    {
      questionId: 'reception-speed',
      questionText: 'Насколько быстро происходит процесс регистрации?',
      answer: 'Процесс регистрации происходит достаточно быстро, персонал эффективно обрабатывает запросы гостей.',
      starRating: 4,
      confidence: 0.85,
      relatedObjects: ['person', 'reception_desk'],
      reasoning: 'Обнаружено 2 человека у стойки регистрации с высокой уверенностью. Персонал присутствует и активно работает.'
    },
    {
      questionId: 'reception-navigation',
      questionText: 'Есть ли четкие указатели и навигация?',
      answer: 'Навигация в зоне ресепшн достаточно понятная, есть основные указатели.',
      starRating: 3,
      confidence: 0.72,
      relatedObjects: ['sign', 'directional_indicator'],
      reasoning: 'Найдены указатели, но их количество ограничено.'
    }
  ],
  detectedObjects: [
    {
      class: 'person',
      confidence: 0.89,
      count: 2,
      isNegative: false,
      frameIndices: [0, 1, 2]
    },
    {
      class: 'reception_desk',
      confidence: 0.94,
      count: 1,
      isNegative: false,
      frameIndices: [1, 2]
    },
    {
      class: 'sign',
      confidence: 0.67,
      count: 1,
      isNegative: false,
      frameIndices: [0]
    }
  ],
  overallScore: 3.5,
  processingTime: 15,
  timestamp: '2024-01-15T10:30:00Z',
  aggregatedComment: 'Зона ресепшн показывает хорошую общую производительность. Персонал работает эффективно, хотя навигация могла бы быть более детальной. Рекомендуется улучшить указатели для лучшей ориентации гостей.'
};

const mockProps = {
  result: mockResult,
  onNewAssessment: vi.fn(),
  onBackToZones: vi.fn(),
  onGeneratePDF: vi.fn()
};

describe('ResultsDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render results display with assessment data', () => {
    render(<ResultsDisplay {...mockProps} />);
    
    expect(screen.getByText('Результаты оценки')).toBeInTheDocument();
    expect(screen.getByText('Ресепшн')).toBeInTheDocument();
    expect(screen.getByText('3.5')).toBeInTheDocument();
  });

  it('should display overall score with star rating', () => {
    render(<ResultsDisplay {...mockProps} />);
    
    // Should show overall score
    expect(screen.getByText('3.5')).toBeInTheDocument();
    expect(screen.getByText('из 5')).toBeInTheDocument();
    
    // Should show star visualization (assuming stars are rendered)
    const stars = screen.getAllByRole('img', { name: /звезда/i });
    expect(stars.length).toBeGreaterThan(0);
  });

  it('should display question answers with star ratings', () => {
    render(<ResultsDisplay {...mockProps} />);
    
    expect(screen.getByText('Насколько быстро происходит процесс регистрации?')).toBeInTheDocument();
    expect(screen.getByText('Есть ли четкие указатели и навигация?')).toBeInTheDocument();
    
    // Should show individual star ratings
    expect(screen.getByText('4')).toBeInTheDocument(); // First question rating
    expect(screen.getByText('3')).toBeInTheDocument(); // Second question rating
  });

  it('should display detected objects', () => {
    render(<ResultsDisplay {...mockProps} />);
    
    expect(screen.getByText('Обнаруженные объекты')).toBeInTheDocument();
    expect(screen.getByText('person')).toBeInTheDocument();
    expect(screen.getByText('reception_desk')).toBeInTheDocument();
    expect(screen.getByText('sign')).toBeInTheDocument();
  });

  it('should show confidence levels for detected objects', () => {
    render(<ResultsDisplay {...mockProps} />);
    
    expect(screen.getByText('89%')).toBeInTheDocument(); // person confidence
    expect(screen.getByText('94%')).toBeInTheDocument(); // reception_desk confidence
    expect(screen.getByText('67%')).toBeInTheDocument(); // sign confidence
  });

  it('should display aggregated comment', () => {
    render(<ResultsDisplay {...mockProps} />);
    
    expect(screen.getByText(/зона ресепшн показывает хорошую общую производительность/i)).toBeInTheDocument();
  });

  it('should call onGeneratePDF when generate PDF button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResultsDisplay {...mockProps} />);
    
    const pdfButton = screen.getByRole('button', { name: /скачать pdf/i });
    await user.click(pdfButton);
    
    expect(mockProps.onGeneratePDF).toHaveBeenCalledTimes(1);
    expect(mockProps.onGeneratePDF).toHaveBeenCalledWith(mockResult);
  });

  it('should call onNewAssessment when new assessment button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResultsDisplay {...mockProps} />);
    
    const newAssessmentButton = screen.getByRole('button', { name: /новая оценка/i });
    await user.click(newAssessmentButton);
    
    expect(mockProps.onNewAssessment).toHaveBeenCalledTimes(1);
  });

  it('should call onBackToZones when back button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResultsDisplay {...mockProps} />);
    
    const backButton = screen.getByRole('button', { name: /к выбору зон/i });
    await user.click(backButton);
    
    expect(mockProps.onBackToZones).toHaveBeenCalledTimes(1);
  });

  it('should show processing time', () => {
    render(<ResultsDisplay {...mockProps} />);
    
    expect(screen.getByText(/время обработки/i)).toBeInTheDocument();
    expect(screen.getByText('15 сек')).toBeInTheDocument();
  });

  it('should display timestamp of assessment', () => {
    render(<ResultsDisplay {...mockProps} />);
    
    expect(screen.getByText(/дата оценки/i)).toBeInTheDocument();
    // Should show formatted date
    expect(screen.getByText(/15\.01\.2024/)).toBeInTheDocument();
  });

  it('should show reasoning for answers when expanded', async () => {
    const user = userEvent.setup();
    render(<ResultsDisplay {...mockProps} />);
    
    // Look for expand buttons or click on question to show reasoning
    const expandButton = screen.queryByRole('button', { name: /подробнее/i });
    if (expandButton) {
      await user.click(expandButton);
      
      expect(screen.getByText(/обнаружено 2 человека у стойки регистрации/i)).toBeInTheDocument();
    }
  });

  it('should handle empty or missing data gracefully', () => {
    const emptyResult: AssessmentResult = {
      zoneId: 'test',
      zoneName: 'Test Zone',
      questionAnswers: [],
      detectedObjects: [],
      overallScore: 0,
      processingTime: 0,
      timestamp: new Date().toISOString(),
      aggregatedComment: ''
    };
    
    const propsWithEmptyResult = {
      ...mockProps,
      result: emptyResult
    };
    
    render(<ResultsDisplay {...propsWithEmptyResult} />);
    
    expect(screen.getByText('Test Zone')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should show score category based on overall score', () => {
    render(<ResultsDisplay {...mockProps} />);
    
    // Score of 3.5 should be "Хорошо"
    expect(screen.getByText('Хорошо')).toBeInTheDocument();
  });
});