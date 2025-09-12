import React, { useState, useCallback } from 'react';
import type { Zone, AssessmentResult, ProcessingStage } from './types';
import { ZONES, COMING_SOON_ZONES } from './constants/zones';
import { STORAGE_KEYS } from './constants';
import ZoneSelector from './components/ZoneSelector/ZoneSelector';
import VideoProcessor from './components/VideoProcessor/VideoProcessor';
import ResultsDisplay from './components/ResultsDisplay/ResultsDisplay';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import LoadingOverlay from './components/LoadingOverlay/LoadingOverlay';
import './App.css';

type AppScreen = 'zone-selection' | 'video-processing' | 'results';

function App() {
  // Main application state
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('zone-selection');
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [completedZones, setCompletedZones] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<AssessmentResult | null>(null);

  // Load saved data on component mount
  React.useEffect(() => {
    loadSavedData();
  }, []);

  // Save data to localStorage
  const saveData = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.assessmentResults, JSON.stringify(assessmentResults));
      localStorage.setItem(STORAGE_KEYS.completedZones, JSON.stringify(completedZones));
    } catch (error) {
      console.warn('Failed to save data to localStorage:', error);
    }
  }, [assessmentResults, completedZones]);

  // Load saved data from localStorage
  const loadSavedData = useCallback(() => {
    try {
      const savedResults = localStorage.getItem(STORAGE_KEYS.assessmentResults);
      const savedCompletedZones = localStorage.getItem(STORAGE_KEYS.completedZones);

      if (savedResults) {
        const results = JSON.parse(savedResults);
        setAssessmentResults(results);
      }

      if (savedCompletedZones) {
        const completed = JSON.parse(savedCompletedZones);
        setCompletedZones(completed);
      }
    } catch (error) {
      console.warn('Failed to load saved data:', error);
    }
  }, []);

  // Save data whenever it changes
  React.useEffect(() => {
    saveData();
  }, [saveData]);

  // Handle zone selection
  const handleZoneSelect = useCallback((zone: Zone) => {
    setCurrentZone(zone);
    setCurrentScreen('video-processing');
    setError(null);
  }, []);

  // Handle processing completion
  const handleProcessingComplete = useCallback((result: AssessmentResult) => {
    setCurrentResult(result);
    setAssessmentResults(prev => {
      // Remove any existing result for this zone and add the new one
      const filtered = prev.filter(r => r.zoneId !== result.zoneId);
      return [...filtered, result];
    });
    
    setCompletedZones(prev => {
      if (!prev.includes(result.zoneId)) {
        return [...prev, result.zoneId];
      }
      return prev;
    });
    
    setCurrentScreen('results');
    setIsProcessing(false);
    setProcessingStage('complete');
  }, []);

  // Handle back to zone selection
  const handleBackToZones = useCallback(() => {
    setCurrentScreen('zone-selection');
    setCurrentZone(null);
    setCurrentResult(null);
    setError(null);
    setProcessingStage('idle');
  }, []);

  // Handle processing start
  const handleProcessingStart = useCallback(() => {
    setIsProcessing(true);
    setError(null);
  }, []);

  // Handle processing stage updates
  const handleProcessingStageUpdate = useCallback((stage: ProcessingStage) => {
    setProcessingStage(stage);
  }, []);

  // Handle errors
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsProcessing(false);
    setProcessingStage('error');
  }, []);

  // Get all zones for selector
  const allZones = [...ZONES, ...COMING_SOON_ZONES];

  // Render current screen
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'zone-selection':
        return (
          <ZoneSelector
            zones={allZones}
            onZoneSelect={handleZoneSelect}
            completedZones={completedZones}
            className="max-w-6xl mx-auto"
          />
        );
      
      case 'video-processing':
        return currentZone ? (
          <VideoProcessor
            zone={currentZone}
            onProcessingComplete={handleProcessingComplete}
            onProcessingStart={handleProcessingStart}
            onProcessingStageUpdate={handleProcessingStageUpdate}
            onBack={handleBackToZones}
            onError={handleError}
            className="max-w-4xl mx-auto"
          />
        ) : null;
      
      case 'results':
        return currentResult ? (
          <ResultsDisplay
            result={currentResult}
            onAssessAnother={handleBackToZones}
            className="max-w-4xl mx-auto"
          />
        ) : null;
      
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-2xl mr-3">🏨</div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Secret Guest MVP
                  </h1>
                  <p className="text-sm text-gray-500">
                    Автоматизированная оценка качества отелей
                  </p>
                </div>
              </div>
              
              {/* Navigation breadcrumbs */}
              <nav className="hidden md:flex items-center space-x-2 text-sm">
                <button
                  onClick={handleBackToZones}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    currentScreen === 'zone-selection'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Выбор зоны
                </button>
                {currentZone && (
                  <>
                    <span className="text-gray-400">/</span>
                    <span className={`px-3 py-1 rounded-md ${
                      currentScreen === 'video-processing' 
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500'
                    }`}>
                      {currentZone.name}
                    </span>
                  </>
                )}
                {currentScreen === 'results' && (
                  <>
                    <span className="text-gray-400">/</span>
                    <span className="px-3 py-1 rounded-md bg-green-100 text-green-700">
                      Результаты
                    </span>
                  </>
                )}
              </nav>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-600 mr-3">⚠️</div>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Произошла ошибка
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    {error}
                  </p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {renderCurrentScreen()}
        </main>

        {/* Loading overlay */}
        {isProcessing && (
          <LoadingOverlay
            stage={processingStage}
            isVisible={isProcessing}
          />
        )}

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-sm text-gray-500">
              <p>
                Secret Guest MVP - демонстрация автоматизированной оценки качества отелей
              </p>
              <p className="mt-1">
                Используется компьютерное зрение для анализа видео и генерации отчетов
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
