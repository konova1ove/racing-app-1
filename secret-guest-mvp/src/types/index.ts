// Core application state management types
export interface AppState {
  currentZone: Zone | null;
  assessmentResults: AssessmentResult[];
  isProcessing: boolean;
  completedZones: string[];
  processingStage: ProcessingStage;
  error: string | null;
}

// Zone definition for different hotel areas
export interface Zone {
  id: string;
  name: string;
  icon: string;
  description: string;
  questions: Question[];
  modelEndpoint: string;
  isAvailable: boolean;
}

// Question configuration for each zone
export interface Question {
  id: string;
  text: string;
  description?: string;
  scoringCriteria: ScoringCriteria;
  detectionRules: DetectionRule[];
  weight: number; // For weighted scoring
}

// Scoring criteria for questions
export interface ScoringCriteria {
  maxStars: number;
  thresholds: ScoreThreshold[];
  negativeFactors: string[]; // Classes that negatively impact score
  positiveFactors: string[]; // Classes that positively impact score
}

// Score threshold configuration
export interface ScoreThreshold {
  stars: number;
  minCount?: number;
  maxCount?: number;
  condition: 'and' | 'or';
  description: string;
}

// Detection rule for mapping objects to questions
export interface DetectionRule {
  objectClass: string;
  importance: 'critical' | 'major' | 'minor';
  scoreModifier: number; // -2 to +2
  description: string;
}

// Assessment result for a zone
export interface AssessmentResult {
  zoneId: string;
  zoneName: string;
  questionAnswers: QuestionAnswer[];
  detectedObjects: DetectedObject[];
  aggregatedComment: string;
  overallScore: number;
  completedAt: Date;
  processingTime: number; // in seconds
}

// Answer to a specific question
export interface QuestionAnswer {
  questionId: string;
  questionText: string;
  answer: string;
  starRating: number;
  confidence: number;
  relatedObjects: string[];
  reasoning: string;
}

// Detected object from computer vision
export interface DetectedObject {
  class: string;
  confidence: number;
  count: number;
  isNegative: boolean;
  frameIndices: number[]; // Which frames contained this object
  boundingBoxes?: BoundingBox[];
  description?: string;
}

// Bounding box for object detection
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  frameIndex: number;
}

// Video processing stages
export type ProcessingStage = 
  | 'idle'
  | 'uploading'
  | 'extracting_frames'
  | 'analyzing_frames'
  | 'calculating_scores'
  | 'generating_report'
  | 'complete'
  | 'error';

// Frame extraction result
export interface FrameData {
  id?: string;
  index?: number;
  timestamp: number;
  base64Data?: string;
  dataUrl?: string;
  width: number;
  height: number;
}

// Roboflow API response
export interface RoboflowDetection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoboflowResponse {
  predictions: RoboflowDetection[];
  image: {
    width: number;
    height: number;
  };
  inference_id: string;
}

// Configuration for Roboflow API
export interface RoboflowConfig {
  baseURL: string;
  generalModel: string;
  negativeModel: string;
  apiKey: string;
  confidence: number;
  overlap: number;
}

// PDF report configuration
export interface PDFReportConfig {
  title: string;
  subtitle: string;
  logoUrl?: string;
  includeFrames: boolean;
  includeObjectList: boolean;
  paperSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
}

// Error types for better error handling
export interface AppError {
  type: 'upload' | 'processing' | 'api' | 'validation';
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

// File upload validation
export interface FileValidation {
  isValid: boolean;
  errors: string[];
  fileSize: number;
  duration?: number;
  format?: string;
}

// Component props interfaces
export interface ZoneSelectorProps {
  zones: Zone[];
  onZoneSelect: (zone: Zone) => void;
  completedZones: string[];
  className?: string;
}

export interface VideoProcessorProps {
  zone: Zone;
  onProcessingComplete: (result: AssessmentResult) => void;
  onBack: () => void;
  className?: string;
}

export interface ResultsDisplayProps {
  result: AssessmentResult;
  onDownloadPDF: () => void;
  onAssessAnother: () => void;
  className?: string;
}

export interface FrameExtractorProps {
  videoFile: File;
  onFramesExtracted: (frames: FrameData[]) => void;
  onError: (error: AppError) => void;
}

// Utility types
export type StarRating = 1 | 2 | 3 | 4 | 5;

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

// Constants for object classes
export interface ObjectClasses {
  general: readonly string[];
  negative: readonly string[];
  zoneSpecific: {
    reception: readonly string[];
    room: readonly string[];
    bathroom: readonly string[];
  };
}

// Form validation types
export interface FormValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}