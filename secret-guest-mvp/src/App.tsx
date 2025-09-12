import React, { useState, useCallback } from 'react';
import ZoneSelector from './components/ZoneSelector';
import VideoProcessor from './components/VideoProcessor';
import ResultsDisplay from './components/ResultsDisplay';
import { Zone, AssessmentResult, AppState } from './types';
import { getAllZones } from './constants/zones';
import { STORAGE_KEYS } from './constants';

function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    // Load completed zones from localStorage
    const savedCompletedZones = localStorage.getItem(STORAGE_KEYS.completedZones);
    return {
      currentZone: null,
      assessmentResults: [],
      isProcessing: false,
      completedZones: savedCompletedZones ? JSON.parse(savedCompletedZones) : [],
      processingStage: 'idle',
      error: null
    };
  });

  const [currentResult, setCurrentResult] = useState<AssessmentResult | null>(null);
  const [currentView, setCurrentView] = useState<'zones' | 'video' | 'results'>('zones');

  // Save completed zones to localStorage
  const saveCompletedZones = useCallback((zones: string[]) => {
    localStorage.setItem(STORAGE_KEYS.completedZones, JSON.stringify(zones));
  }, []);

  // Handle zone selection
  const handleZoneSelect = useCallback((zone: Zone) => {
    setAppState(prev => ({ ...prev, currentZone: zone }));
    setCurrentView('video');
  }, []);

  // Handle going back to zone selection
  const handleBackToZones = useCallback(() => {
    setAppState(prev => ({ ...prev, currentZone: null }));
    setCurrentView('zones');
  }, []);

  // Handle processing completion
  const handleProcessingComplete = useCallback((result: AssessmentResult) => {
    setCurrentResult(result);
    setCurrentView('results');
    
    // Add zone to completed zones if not already there
    const newCompletedZones = [...appState.completedZones];
    if (!newCompletedZones.includes(result.zoneId)) {
      newCompletedZones.push(result.zoneId);
      setAppState(prev => ({ ...prev, completedZones: newCompletedZones }));
      saveCompletedZones(newCompletedZones);
    }
    
    // Add result to assessment results
    setAppState(prev => ({
      ...prev,
      assessmentResults: [...prev.assessmentResults, result]
    }));
  }, [appState.completedZones, saveCompletedZones]);

  // Handle PDF download
  const handleDownloadPDF = useCallback(async () => {
    if (!currentResult) return;
    
    try {
      const { getPDFGenerator } = await import('./services/pdfGenerator');
      const pdfGenerator = getPDFGenerator();
      
      await pdfGenerator.generateAndDownload(currentResult, {
        language: 'ru',
        includeObjectDetails: true,
        addWatermark: true
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Ошибка при создании PDF. Попробуйте еще раз.');
    }
  }, [currentResult]);

  // Handle assess another zone
  const handleAssessAnother = useCallback(() => {
    setCurrentResult(null);
    setCurrentView('zones');
    setAppState(prev => ({ ...prev, currentZone: null }));
  }, []);

  const zones = getAllZones();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {currentView === 'zones' && (
          <ZoneSelector
            zones={zones}
            onZoneSelect={handleZoneSelect}
            completedZones={appState.completedZones}
          />
        )}
        
        {currentView === 'video' && appState.currentZone && (
          <div className="space-y-6">
            <VideoProcessor
              zone={appState.currentZone}
              onProcessingComplete={handleProcessingComplete}
              onBack={handleBackToZones}
            />
          </div>
        )}
        
        {currentView === 'results' && currentResult && (
          <ResultsDisplay
            result={currentResult}
            onDownloadPDF={handleDownloadPDF}
            onAssessAnother={handleAssessAnother}
          />
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="mb-2">
            Секретный Гость MVP - Автоматизированная оценка качества отеля
          </p>
          <p className="text-sm">
            Версия 1.0.0 • Создано для хакатона
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
