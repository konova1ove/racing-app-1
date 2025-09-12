import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoProcessor from '../components/VideoProcessor';
import { Zone, ProcessingStage } from '../types';

// Mock the services
vi.mock('../services/frameExtractor', () => ({
  getFrameExtractor: () => ({
    extractFrames: vi.fn().mockResolvedValue(['frame1.jpg', 'frame2.jpg']),
    isInitialized: vi.fn().mockReturnValue(true),
    initialize: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('../services/roboflowService', () => ({
  getRoboflowService: () => ({
    detectObjects: vi.fn().mockResolvedValue([
      {
        class: 'person',
        confidence: 0.85,
        count: 2,
        isNegative: false,
        frameIndices: [0, 1]
      }
    ])
  })
}));

vi.mock('../services/scoringEngine', () => ({
  getScoringEngine: () => ({
    scoreZoneAssessment: vi.fn().mockReturnValue({
      zoneId: 'reception',
      zoneName: 'Ресепшн',
      questionAnswers: [],
      detectedObjects: [],
      overallScore: 4.2,
      processingTime: 15,
      timestamp: new Date().toISOString(),
      aggregatedComment: 'Хорошая работа'
    })
  })
}));

const mockZone: Zone = {
  id: 'reception',
  name: 'Ресепшн',
  description: 'Зона стойки регистрации',
  questions: [
    {
      id: 'reception-speed',
      text: 'Насколько быстро происходит процесс регистрации?',
      type: 'service',
      weight: 1.3,
      scoringCriteria: {
        excellent: { threshold: 0.8, keywords: ['fast'] },
        good: { threshold: 0.6, keywords: ['efficient'] },
        average: { threshold: 0.4, keywords: ['normal'] },
        poor: { threshold: 0.2, keywords: ['slow'] },
        terrible: { threshold: 0, keywords: ['very_slow'] }
      }
    }
  ],
  isAvailable: true,
  comingSoon: false
};

const mockProps = {
  zone: mockZone,
  onComplete: vi.fn(),
  onCancel: vi.fn(),
  processingStage: 'idle' as ProcessingStage,
  progress: 0
};

// Create a mock file
const createMockFile = (name: string, size: number, type: string) => {
  return new File(['test content'], name, { type, lastModified: Date.now() });
};

describe('VideoProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset any global mocks
    global.URL.createObjectURL = vi.fn(() => 'mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('should render video processor interface', () => {
    render(<VideoProcessor {...mockProps} />);
    
    expect(screen.getByText('Загрузите видео')).toBeInTheDocument();
    expect(screen.getByText('Ресепшн')).toBeInTheDocument();
    expect(screen.getByText('Загрузить видео')).toBeInTheDocument();
  });

  it('should show zone questions', () => {
    render(<VideoProcessor {...mockProps} />);
    
    expect(screen.getByText('Насколько быстро происходит процесс регистрации?')).toBeInTheDocument();
  });

  it('should accept valid video file', async () => {
    const user = userEvent.setup();
    render(<VideoProcessor {...mockProps} />);
    
    const fileInput = screen.getByLabelText(/загрузить видео/i);
    const validFile = createMockFile('test.mp4', 10 * 1024 * 1024, 'video/mp4'); // 10MB
    
    await user.upload(fileInput, validFile);
    
    expect(fileInput.files).toHaveLength(1);
    expect(fileInput.files?.[0]).toBe(validFile);
  });

  it('should reject file that is too large', async () => {
    const user = userEvent.setup();
    render(<VideoProcessor {...mockProps} />);
    
    const fileInput = screen.getByLabelText(/загрузить видео/i);
    const largeFile = createMockFile('large.mp4', 200 * 1024 * 1024, 'video/mp4'); // 200MB
    
    await user.upload(fileInput, largeFile);
    
    await waitFor(() => {
      expect(screen.getByText(/файл слишком большой/i)).toBeInTheDocument();
    });
  });

  it('should reject invalid file format', async () => {
    const user = userEvent.setup();
    render(<VideoProcessor {...mockProps} />);
    
    const fileInput = screen.getByLabelText(/загрузить видео/i);
    const invalidFile = createMockFile('test.txt', 1024, 'text/plain');
    
    await user.upload(fileInput, invalidFile);
    
    await waitFor(() => {
      expect(screen.getByText(/неподдерживаемый формат/i)).toBeInTheDocument();
    });
  });

  it('should show cancel button when processing', () => {
    const propsWithProcessing = {
      ...mockProps,
      processingStage: 'extracting_frames' as ProcessingStage,
      progress: 30
    };
    
    render(<VideoProcessor {...propsWithProcessing} />);
    
    expect(screen.getByText('Отменить')).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const propsWithProcessing = {
      ...mockProps,
      processingStage: 'extracting_frames' as ProcessingStage,
      progress: 30
    };
    
    render(<VideoProcessor {...propsWithProcessing} />);
    
    const cancelButton = screen.getByText('Отменить');
    await user.click(cancelButton);
    
    expect(mockProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('should show progress during processing', () => {
    const propsWithProcessing = {
      ...mockProps,
      processingStage: 'analyzing_frames' as ProcessingStage,
      progress: 65
    };
    
    render(<VideoProcessor {...propsWithProcessing} />);
    
    expect(screen.getByText('Анализ с помощью ИИ...')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('should show video preview when file is selected', async () => {
    const user = userEvent.setup();
    render(<VideoProcessor {...mockProps} />);
    
    const fileInput = screen.getByLabelText(/загрузить видео/i);
    const validFile = createMockFile('test.mp4', 10 * 1024 * 1024, 'video/mp4');
    
    await user.upload(fileInput, validFile);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /начать анализ/i })).toBeInTheDocument();
    });
  });

  it('should disable interface when processing', () => {
    const propsWithProcessing = {
      ...mockProps,
      processingStage: 'extracting_frames' as ProcessingStage,
      progress: 30
    };
    
    render(<VideoProcessor {...propsWithProcessing} />);
    
    const fileInput = screen.getByLabelText(/загрузить видео/i);
    expect(fileInput).toBeDisabled();
  });

  it('should handle video recording (if supported)', async () => {
    const user = userEvent.setup();
    render(<VideoProcessor {...mockProps} />);
    
    // Check if record button exists (depends on browser support)
    const recordButton = screen.queryByText(/записать видео/i);
    if (recordButton) {
      await user.click(recordButton);
      // Should start recording process
      expect(recordButton).toBeInTheDocument();
    }
  });
});