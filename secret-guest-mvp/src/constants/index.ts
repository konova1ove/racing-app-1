import { ObjectClasses, RoboflowConfig } from '../types';

// Object classes for computer vision detection
export const OBJECT_CLASSES: ObjectClasses = {
  // General objects detected across all zones
  general: [
    'person',
    'staff_member',
    'guest',
    'chair',
    'desk',
    'window',
    'door',
    'sign',
    'arrow',
    'directional_indicator',
    'light',
    'clean_surface',
    'organized_space'
  ] as const,

  // Negative conditions that reduce scores
  negative: [
    'stain',
    'dirt',
    'hair',
    'clutter',
    'trash',
    'broken_equipment',
    'missing_amenity',
    'poor_lighting',
    'stain_on_sheet',
    'hair_on_linen',
    'surface_dirt',
    'streaked_glass',
    'dirty_window',
    'stain_on_sink',
    'dirty_toilet',
    'hair_in_shower',
    'limescale',
    'dirty_towel',
    'missing_amenities',
    'stained_supplies',
    'crowd',
    'long_queue'
  ] as const,

  // Zone-specific objects
  zoneSpecific: {
    reception: [
      'reception_desk',
      'computer',
      'key_card',
      'bell',
      'brochure',
      'visitor_chair',
      'counter',
      'information_board'
    ] as const,
    
    room: [
      'bed',
      'tv',
      'kettle',
      'water_bottle',
      'pillow',
      'blanket',
      'nightstand',
      'lamp',
      'air_conditioner',
      'minibar',
      'safe',
      'curtains',
      'carpet',
      'clean_sheets',
      'fresh_towels'
    ] as const,
    
    bathroom: [
      'toilet',
      'sink',
      'shower',
      'bathtub',
      'towel',
      'amenities_kit',
      'soap_dispenser',
      'mirror',
      'toilet_paper',
      'shampoo',
      'shower_gel',
      'hair_dryer',
      'clean_sink',
      'clean_toilet',
      'clean_shower'
    ] as const
  }
};

// Roboflow API configuration
export const ROBOFLOW_CONFIG: RoboflowConfig = {
  baseURL: 'https://detect.roboflow.com/',
  generalModel: 'hotel-objects-v1/1',
  negativeModel: 'hotel-issues-v1/1',
  apiKey: import.meta.env.VITE_ROBOFLOW_API_KEY || 'demo-key',
  confidence: 0.4,
  overlap: 0.3
};

// Video processing constraints
export const VIDEO_CONSTRAINTS = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxDuration: 30, // 30 seconds
  minDuration: 10, // 10 seconds
  supportedFormats: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  frameExtractionRate: 1, // 1 frame per second
  maxFrames: 15,
  targetWidth: 640,
  targetHeight: 480
} as const;

// PDF report settings
export const PDF_CONFIG = {
  title: 'Отчет Тайного Гостя',
  subtitle: 'Автоматизированная оценка качества отеля',
  paperSize: 'a4' as const,
  orientation: 'portrait' as const,
  margins: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20
  },
  fontSize: {
    title: 18,
    subtitle: 14,
    heading: 12,
    body: 10,
    small: 8
  },
  colors: {
    primary: '#0284c7',
    secondary: '#78716c',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    text: '#1f2937',
    light: '#f9fafb'
  }
} as const;

// Scoring configuration
export const SCORING_CONFIG = {
  maxStars: 5,
  defaultWeight: 1.0,
  confidenceThreshold: 0.3,
  
  // Weight multipliers for different question types
  questionWeights: {
    cleanliness: 1.5,
    amenities: 1.2,
    service: 1.3,
    navigation: 0.8,
    comfort: 1.0
  },
  
  // Star rating thresholds
  starThresholds: {
    excellent: 4.5,
    good: 3.5,
    average: 2.5,
    poor: 1.5,
    terrible: 0
  }
} as const;

// UI configuration
export const UI_CONFIG = {
  animationDuration: 300,
  debounceDelay: 500,
  maxRetries: 3,
  processingTimeout: 60000, // 60 seconds
  
  // Progress indicators
  processingStages: [
    { stage: 'uploading', label: 'Загрузка видео...', progress: 10 },
    { stage: 'extracting_frames', label: 'Извлечение кадров...', progress: 30 },
    { stage: 'analyzing_frames', label: 'Анализ с помощью ИИ...', progress: 70 },
    { stage: 'calculating_scores', label: 'Подсчет оценок...', progress: 85 },
    { stage: 'generating_report', label: 'Генерация отчета...', progress: 95 },
    { stage: 'complete', label: 'Готово!', progress: 100 }
  ]
} as const;

// Error messages
export const ERROR_MESSAGES = {
  upload: {
    fileTooBig: 'Файл слишком большой. Максимальный размер: 100MB',
    invalidFormat: 'Неподдерживаемый формат. Используйте MP4, WebM или MOV',
    videoTooLong: 'Видео слишком длинное. Максимальная длительность: 30 секунд',
    videoTooShort: 'Видео слишком короткое. Минимальная длительность: 10 секунд',
    uploadFailed: 'Ошибка загрузки файла. Попробуйте еще раз'
  },
  processing: {
    frameExtractionFailed: 'Не удалось извлечь кадры из видео',
    apiCallFailed: 'Ошибка обращения к сервису анализа',
    scoringFailed: 'Ошибка подсчета оценок',
    timeout: 'Превышено время ожидания обработки',
    unexpectedError: 'Произошла непредвиденная ошибка'
  },
  api: {
    networkError: 'Ошибка сети. Проверьте подключение к интернету',
    serverError: 'Ошибка сервера. Попробуйте позже',
    invalidResponse: 'Получен некорректный ответ от сервера',
    rateLimitExceeded: 'Превышен лимит запросов. Попробуйте позже'
  },
  validation: {
    required: 'Это поле обязательно для заполнения',
    invalidFormat: 'Неверный формат данных',
    outOfRange: 'Значение вне допустимого диапазона'
  }
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  upload: 'Видео успешно загружено',
  processing: 'Анализ завершен успешно',
  pdfGenerated: 'PDF-отчет создан',
  assessmentComplete: 'Оценка зоны завершена'
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  assessmentResults: 'secret-guest-assessment-results',
  userPreferences: 'secret-guest-user-preferences',
  completedZones: 'secret-guest-completed-zones',
  lastSession: 'secret-guest-last-session'
} as const;

// API endpoints
export const API_ENDPOINTS = {
  roboflow: {
    detect: (model: string) => `${ROBOFLOW_CONFIG.baseURL}${model}`,
    general: `${ROBOFLOW_CONFIG.baseURL}${ROBOFLOW_CONFIG.generalModel}`,
    negative: `${ROBOFLOW_CONFIG.baseURL}${ROBOFLOW_CONFIG.negativeModel}`
  }
} as const;