import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ZoneSelector from '../components/ZoneSelector';
import { Zone } from '../types';

// Mock zones for testing
const mockZones: Zone[] = [
  {
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
          excellent: { threshold: 0.8, keywords: ['fast', 'quick'] },
          good: { threshold: 0.6, keywords: ['efficient'] },
          average: { threshold: 0.4, keywords: ['normal'] },
          poor: { threshold: 0.2, keywords: ['slow'] },
          terrible: { threshold: 0, keywords: ['very_slow'] }
        }
      }
    ],
    isAvailable: true,
    comingSoon: false
  },
  {
    id: 'room',
    name: 'Номер',
    description: 'Жилая зона отеля',
    questions: [
      {
        id: 'room-cleanliness',
        text: 'Насколько чист номер?',
        type: 'cleanliness',
        weight: 1.5,
        scoringCriteria: {
          excellent: { threshold: 0.9, keywords: ['clean', 'spotless'] },
          good: { threshold: 0.7, keywords: ['mostly_clean'] },
          average: { threshold: 0.5, keywords: ['acceptable'] },
          poor: { threshold: 0.3, keywords: ['dirty'] },
          terrible: { threshold: 0, keywords: ['very_dirty'] }
        }
      }
    ],
    isAvailable: true,
    comingSoon: false
  },
  {
    id: 'restaurant',
    name: 'Ресторан',
    description: 'Зона питания',
    questions: [],
    isAvailable: false,
    comingSoon: true
  }
];

const mockProps = {
  zones: mockZones,
  completedZones: [],
  onZoneSelect: vi.fn(),
  isProcessing: false
};

describe('ZoneSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render zone selector with zones', () => {
    render(<ZoneSelector {...mockProps} />);
    
    expect(screen.getByText('Выберите зону для оценки')).toBeInTheDocument();
    expect(screen.getByText('Ресепшн')).toBeInTheDocument();
    expect(screen.getByText('Номер')).toBeInTheDocument();
    expect(screen.getByText('Ресторан')).toBeInTheDocument();
  });

  it('should show zone descriptions', () => {
    render(<ZoneSelector {...mockProps} />);
    
    expect(screen.getByText('Зона стойки регистрации')).toBeInTheDocument();
    expect(screen.getByText('Жилая зона отеля')).toBeInTheDocument();
    expect(screen.getByText('Зона питания')).toBeInTheDocument();
  });

  it('should call onZoneSelect when available zone is clicked', async () => {
    const user = userEvent.setup();
    render(<ZoneSelector {...mockProps} />);
    
    const receptionCard = screen.getByRole('button', { name: /ресепшн/i });
    await user.click(receptionCard);
    
    expect(mockProps.onZoneSelect).toHaveBeenCalledTimes(1);
    expect(mockProps.onZoneSelect).toHaveBeenCalledWith(mockZones[0]);
  });

  it('should not call onZoneSelect for coming soon zones', async () => {
    const user = userEvent.setup();
    render(<ZoneSelector {...mockProps} />);
    
    const restaurantCard = screen.getByText('Ресторан').closest('div');
    if (restaurantCard) {
      await user.click(restaurantCard);
    }
    
    expect(mockProps.onZoneSelect).not.toHaveBeenCalled();
  });

  it('should show coming soon badge for unavailable zones', () => {
    render(<ZoneSelector {...mockProps} />);
    
    expect(screen.getByText('Скоро')).toBeInTheDocument();
  });

  it('should show completed badge for completed zones', () => {
    const propsWithCompleted = {
      ...mockProps,
      completedZones: ['reception']
    };
    
    render(<ZoneSelector {...propsWithCompleted} />);
    
    expect(screen.getByText('Завершено')).toBeInTheDocument();
  });

  it('should show question count for available zones', () => {
    render(<ZoneSelector {...mockProps} />);
    
    expect(screen.getByText('1 вопрос')).toBeInTheDocument();
  });

  it('should disable zones when processing', () => {
    const propsWithProcessing = {
      ...mockProps,
      isProcessing: true
    };
    
    render(<ZoneSelector {...propsWithProcessing} />);
    
    const receptionCard = screen.getByRole('button', { name: /ресепшн/i });
    expect(receptionCard).toBeDisabled();
  });

  it('should show progress when zones are completed', () => {
    const propsWithProgress = {
      ...mockProps,
      completedZones: ['reception']
    };
    
    render(<ZoneSelector {...propsWithProgress} />);
    
    // Should show progress indication
    expect(screen.getByText(/прогресс/i)).toBeInTheDocument();
  });
});