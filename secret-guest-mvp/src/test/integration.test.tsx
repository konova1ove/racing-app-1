import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock all the services for integration testing
vi.mock('../services/frameExtractor', () => ({
  getFrameExtractor: () => ({
    extractFrames: vi.fn().mockResolvedValue([
      'data:image/jpeg;base64,frame1data',
      'data:image/jpeg;base64,frame2data',
      'data:image/jpeg;base64,frame3data'
    ]),
    isInitialized: vi.fn().mockReturnValue(true),
    initialize: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('../services/roboflowService', () => ({
  getRoboflowService: () => ({
    detectObjects: vi.fn().mockResolvedValue([
      {
        class: 'person',
        confidence: 0.89,
        count: 2,
        isNegative: false,
        frameIndices: [0, 1]
      },
      {
        class: 'reception_desk',
        confidence: 0.94,
        count: 1,
        isNegative: false,
        frameIndices: [1, 2]
      },
      {
        class: 'clean_surface',
        confidence: 0.76,
        count: 3,
        isNegative: false,
        frameIndices: [0, 1, 2]
      }
    ])
  })
}));

vi.mock('../services/commentGenerator', () => ({
  getCommentGenerator: () => ({
    generateAggregatedComment: vi.fn().mockReturnValue(
      'Зона ресепшн показывает отличные результаты. Персонал активно работает, поверхности чистые, общая атмосфера позитивная.'
    )
  })
}));

vi.mock('../services/pdfGenerator', () => ({
  getPdfGenerator: () => ({
    generateReport: vi.fn().mockResolvedValue(undefined)
  })
}));

// Create a mock file for testing
const createMockVideoFile = (name: string, size: number = 10 * 1024 * 1024) => {
  return new File(['mock video content'], name, { 
    type: 'video/mp4',
    lastModified: Date.now()
  });
};

describe('Integration: Complete Assessment Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'mock-video-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full assessment flow: zone selection → video upload → processing → results → PDF', async () => {
    const user = userEvent.setup();
    
    // Step 1: Render the app
    render(<App />);
    
    // Should start with zone selection
    expect(screen.getByText('Выберите зону для оценки')).toBeInTheDocument();
    expect(screen.getByText('Ресепшн')).toBeInTheDocument();
    
    // Step 2: Select Reception zone
    const receptionCard = screen.getByRole('button', { name: /ресепшн/i });
    await user.click(receptionCard);
    
    // Should navigate to video upload screen
    await waitFor(() => {
      expect(screen.getByText('Загрузите видео')).toBeInTheDocument();
    });
    
    // Should show reception zone questions
    expect(screen.getByText(/насколько быстро происходит процесс регистрации/i)).toBeInTheDocument();
    
    // Step 3: Upload a video file
    const fileInput = screen.getByLabelText(/загрузить видео/i);
    const mockFile = createMockVideoFile('reception-test.mp4');
    
    await user.upload(fileInput, mockFile);
    
    // Should show video preview and analysis button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /начать анализ/i })).toBeInTheDocument();
    });
    
    // Step 4: Start analysis
    const analyzeButton = screen.getByRole('button', { name: /начать анализ/i });
    await user.click(analyzeButton);
    
    // Should show processing stages
    await waitFor(() => {
      expect(screen.getByText(/извлечение кадров/i)).toBeInTheDocument();
    });
    
    // Wait for processing to complete and results to appear
    await waitFor(() => {
      expect(screen.getByText('Результаты оценки')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Step 5: Verify results are displayed
    expect(screen.getByText('Ресепшн')).toBeInTheDocument();
    expect(screen.getByText(/обнаруженные объекты/i)).toBeInTheDocument();
    
    // Should show detected objects
    expect(screen.getByText('person')).toBeInTheDocument();
    expect(screen.getByText('reception_desk')).toBeInTheDocument();
    
    // Should show overall score
    const scoreElement = screen.getByText(/\d+\.\d+/);
    expect(scoreElement).toBeInTheDocument();
    
    // Step 6: Generate PDF report
    const pdfButton = screen.getByRole('button', { name: /скачать pdf/i });
    await user.click(pdfButton);
    
    // Should call PDF generation service
    await waitFor(() => {
      const { getPdfGenerator } = require('../services/pdfGenerator');
      expect(getPdfGenerator().generateReport).toHaveBeenCalledTimes(1);
    });
    
    // Step 7: Navigate back to zone selection
    const backButton = screen.getByRole('button', { name: /к выбору зон/i });
    await user.click(backButton);
    
    // Should return to zone selection
    await waitFor(() => {
      expect(screen.getByText('Выберите зону для оценки')).toBeInTheDocument();
    });
    
    // Reception zone should now show as completed
    expect(screen.getByText('Завершено')).toBeInTheDocument();
  }, 15000);

  it('should handle video upload errors gracefully', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Select reception zone
    const receptionCard = screen.getByRole('button', { name: /ресепшн/i });
    await user.click(receptionCard);
    
    await waitFor(() => {
      expect(screen.getByText('Загрузите видео')).toBeInTheDocument();
    });
    
    // Try to upload a file that's too large
    const fileInput = screen.getByLabelText(/загрузить видео/i);
    const largeFile = createMockVideoFile('large.mp4', 200 * 1024 * 1024); // 200MB
    
    await user.upload(fileInput, largeFile);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/файл слишком большой/i)).toBeInTheDocument();
    });
  });

  it('should handle processing cancellation', async () => {
    const user = userEvent.setup();
    
    // Mock a slow processing service
    const { getFrameExtractor } = require('../services/frameExtractor');
    getFrameExtractor().extractFrames = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 5000))
    );
    
    render(<App />);
    
    // Navigate to video upload
    const receptionCard = screen.getByRole('button', { name: /ресепшн/i });
    await user.click(receptionCard);
    
    await waitFor(() => {
      expect(screen.getByText('Загрузите видео')).toBeInTheDocument();
    });
    
    // Upload video and start analysis
    const fileInput = screen.getByLabelText(/загрузить видео/i);
    const mockFile = createMockVideoFile('test.mp4');
    
    await user.upload(fileInput, mockFile);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /начать анализ/i })).toBeInTheDocument();
    });
    
    const analyzeButton = screen.getByRole('button', { name: /начать анализ/i });
    await user.click(analyzeButton);
    
    // Should show processing and cancel button
    await waitFor(() => {
      expect(screen.getByText('Отменить')).toBeInTheDocument();
    });
    
    // Cancel processing
    const cancelButton = screen.getByText('Отменить');
    await user.click(cancelButton);
    
    // Should return to video upload state
    await waitFor(() => {
      expect(screen.getByText('Загрузите видео')).toBeInTheDocument();
    });
  });

  it('should persist completed zones in localStorage', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Complete an assessment
    const receptionCard = screen.getByRole('button', { name: /ресепшн/i });
    await user.click(receptionCard);
    
    await waitFor(() => {
      expect(screen.getByText('Загрузите видео')).toBeInTheDocument();
    });
    
    const fileInput = screen.getByLabelText(/загрузить видео/i);
    const mockFile = createMockVideoFile('test.mp4');
    
    await user.upload(fileInput, mockFile);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /начать анализ/i })).toBeInTheDocument();
    });
    
    const analyzeButton = screen.getByRole('button', { name: /начать анализ/i });
    await user.click(analyzeButton);
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('Результаты оценки')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Go back to zones
    const backButton = screen.getByRole('button', { name: /к выбору зон/i });
    await user.click(backButton);
    
    // Check that localStorage was updated
    const completedZones = JSON.parse(localStorage.getItem('secret-guest-completed-zones') || '[]');
    expect(completedZones).toContain('reception');
  });

  it('should handle multiple zone assessments', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Complete reception assessment
    let receptionCard = screen.getByRole('button', { name: /ресепшн/i });
    await user.click(receptionCard);
    
    // ... complete the assessment flow (abbreviated for brevity)
    await waitFor(() => {
      expect(screen.getByText('Загрузите видео')).toBeInTheDocument();
    });
    
    const fileInput = screen.getByLabelText(/загрузить видео/i);
    const mockFile = createMockVideoFile('reception.mp4');
    await user.upload(fileInput, mockFile);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /начать анализ/i })).toBeInTheDocument();
    });
    
    const analyzeButton = screen.getByRole('button', { name: /начать анализ/i });
    await user.click(analyzeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Результаты оценки')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Go back and assess room zone
    const backButton = screen.getByRole('button', { name: /к выбору зон/i });
    await user.click(backButton);
    
    await waitFor(() => {
      expect(screen.getByText('Выберите зону для оценки')).toBeInTheDocument();
    });
    
    const roomCard = screen.getByRole('button', { name: /номер/i });
    await user.click(roomCard);
    
    // Should show room assessment interface
    await waitFor(() => {
      expect(screen.getByText(/насколько чист номер/i)).toBeInTheDocument();
    });
  });
});