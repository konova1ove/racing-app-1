import type { Zone, Question } from '../types';

// Reception Zone Questions and Scoring
const receptionQuestions: Question[] = [
  {
    id: 'reception-check-in-speed',
    text: 'Как быстро вас заселили?',
    description: 'Оценка очереди и скорости обслуживания на ресепшене',
    weight: 1.0,
    scoringCriteria: {
      maxStars: 5,
      thresholds: [
        { stars: 5, maxCount: 3, condition: 'and', description: '1-3 человека у стойки - быстрое обслуживание' },
        { stars: 3, minCount: 4, maxCount: 6, condition: 'and', description: '4-6 человек - умеренная очередь' },
        { stars: 2, minCount: 7, condition: 'and', description: '7+ человек - длинная очередь' }
      ],
      negativeFactors: ['crowd', 'long_queue'],
      positiveFactors: ['reception_desk', 'staff_member']
    },
    detectionRules: [
      { objectClass: 'person', importance: 'critical', scoreModifier: -0.5, description: 'Количество людей в зоне ресепшен' },
      { objectClass: 'reception_desk', importance: 'major', scoreModifier: 1.0, description: 'Наличие стойки ресепшен' },
      { objectClass: 'staff_member', importance: 'major', scoreModifier: 1.0, description: 'Присутствие персонала' }
    ]
  },
  {
    id: 'reception-navigation',
    text: 'Были ли понятные указатели и легко ли найти ресепшен?',
    description: 'Оценка навигации и указателей к зоне ресепшен',
    weight: 0.8,
    scoringCriteria: {
      maxStars: 5,
      thresholds: [
        { stars: 5, minCount: 2, condition: 'and', description: '2+ четких указателя' },
        { stars: 3, minCount: 1, condition: 'and', description: '1 указатель' },
        { stars: 1, maxCount: 0, condition: 'and', description: 'Нет указателей' }
      ],
      negativeFactors: ['clutter', 'poor_lighting'],
      positiveFactors: ['sign', 'arrow', 'directional_indicator']
    },
    detectionRules: [
      { objectClass: 'sign', importance: 'critical', scoreModifier: 2.0, description: 'Наличие указательных знаков' },
      { objectClass: 'arrow', importance: 'major', scoreModifier: 1.5, description: 'Направляющие стрелки' },
      { objectClass: 'directional_indicator', importance: 'major', scoreModifier: 1.0, description: 'Указатели направления' }
    ]
  },
  {
    id: 'reception-cleanliness',
    text: 'Чистота и порядок в зоне ресепшен?',
    description: 'Оценка общей чистоты и опрятности зоны ресепшен',
    weight: 1.2,
    scoringCriteria: {
      maxStars: 5,
      thresholds: [
        { stars: 5, maxCount: 0, condition: 'and', description: 'Идеальная чистота' },
        { stars: 3, minCount: 1, maxCount: 2, condition: 'and', description: '1-2 незначительные проблемы' },
        { stars: 1, minCount: 3, condition: 'and', description: '3+ проблемы с чистотой' }
      ],
      negativeFactors: ['trash', 'clutter', 'stain', 'dirt'],
      positiveFactors: ['clean_surface', 'organized_space']
    },
    detectionRules: [
      { objectClass: 'trash', importance: 'critical', scoreModifier: -2.0, description: 'Мусор в зоне' },
      { objectClass: 'clutter', importance: 'major', scoreModifier: -1.5, description: 'Беспорядок и захламленность' },
      { objectClass: 'stain', importance: 'major', scoreModifier: -1.0, description: 'Пятна на поверхностях' },
      { objectClass: 'dirt', importance: 'minor', scoreModifier: -0.5, description: 'Загрязнения' }
    ]
  }
];

// Room Zone Questions and Scoring
const roomQuestions: Question[] = [
  {
    id: 'room-amenities',
    text: 'Соответствует ли номер ожиданиям и есть ли базовые удобства?',
    description: 'Проверка наличия основных удобств в номере',
    weight: 1.5,
    scoringCriteria: {
      maxStars: 5,
      thresholds: [
        { stars: 5, minCount: 4, condition: 'and', description: 'Все 4 базовых удобства присутствуют' },
        { stars: 4, minCount: 3, condition: 'and', description: '3 из 4 удобств' },
        { stars: 2, minCount: 2, condition: 'and', description: '2 из 4 удобств' },
        { stars: 1, maxCount: 1, condition: 'and', description: '1 или менее удобств' }
      ],
      negativeFactors: ['broken_equipment', 'missing_amenity'],
      positiveFactors: ['bed', 'tv', 'kettle', 'water_bottle']
    },
    detectionRules: [
      { objectClass: 'bed', importance: 'critical', scoreModifier: 2.0, description: 'Кровать' },
      { objectClass: 'tv', importance: 'major', scoreModifier: 1.5, description: 'Телевизор' },
      { objectClass: 'kettle', importance: 'major', scoreModifier: 1.0, description: 'Чайник' },
      { objectClass: 'water_bottle', importance: 'minor', scoreModifier: 0.5, description: 'Бутылка воды' }
    ]
  },
  {
    id: 'room-bedding-cleanliness',
    text: 'Чистота постели и поверхностей?',
    description: 'Оценка чистоты постельного белья и поверхностей в номере',
    weight: 1.3,
    scoringCriteria: {
      maxStars: 5,
      thresholds: [
        { stars: 5, maxCount: 0, condition: 'and', description: 'Безупречная чистота' },
        { stars: 3, minCount: 1, condition: 'and', description: '1 незначительная проблема' },
        { stars: 1, minCount: 2, condition: 'and', description: '2+ проблемы с чистотой' }
      ],
      negativeFactors: ['stain_on_sheet', 'hair_on_linen', 'surface_dirt'],
      positiveFactors: ['clean_sheets', 'fresh_towels']
    },
    detectionRules: [
      { objectClass: 'stain_on_sheet', importance: 'critical', scoreModifier: -2.0, description: 'Пятна на простынях' },
      { objectClass: 'hair_on_linen', importance: 'critical', scoreModifier: -2.0, description: 'Волосы на белье' },
      { objectClass: 'surface_dirt', importance: 'major', scoreModifier: -1.0, description: 'Грязь на поверхностях' }
    ]
  },
  {
    id: 'room-window-lighting',
    text: 'Чистота окон/освещенность?',
    description: 'Оценка состояния окон и качества освещения',
    weight: 0.8,
    scoringCriteria: {
      maxStars: 5,
      thresholds: [
        { stars: 5, minCount: 1, maxCount: 0, condition: 'and', description: 'Чистые окна, хорошее освещение' },
        { stars: 3, minCount: 1, condition: 'and', description: 'Незначительные разводы' },
        { stars: 1, minCount: 1, condition: 'and', description: 'Грязные окна' }
      ],
      negativeFactors: ['streaked_glass', 'dirty_window', 'poor_lighting'],
      positiveFactors: ['window', 'natural_light', 'clean_glass']
    },
    detectionRules: [
      { objectClass: 'window', importance: 'major', scoreModifier: 1.0, description: 'Наличие окна' },
      { objectClass: 'streaked_glass', importance: 'major', scoreModifier: -1.5, description: 'Разводы на стекле' },
      { objectClass: 'dirty_window', importance: 'critical', scoreModifier: -2.0, description: 'Грязное окно' }
    ]
  }
];

// Bathroom Zone Questions and Scoring
const bathroomQuestions: Question[] = [
  {
    id: 'bathroom-fixtures-cleanliness',
    text: 'Чистота сантехники (раковина, унитаз, душ)?',
    description: 'Оценка чистоты основной сантехники в ванной',
    weight: 1.5,
    scoringCriteria: {
      maxStars: 5,
      thresholds: [
        { stars: 5, maxCount: 0, condition: 'and', description: 'Вся сантехника чистая' },
        { stars: 3, minCount: 1, condition: 'and', description: '1 проблема с чистотой' },
        { stars: 1, minCount: 2, condition: 'and', description: '2+ проблемы с чистотой' }
      ],
      negativeFactors: ['stain_on_sink', 'dirty_toilet', 'hair_in_shower'],
      positiveFactors: ['clean_sink', 'clean_toilet', 'clean_shower']
    },
    detectionRules: [
      { objectClass: 'stain_on_sink', importance: 'critical', scoreModifier: -2.0, description: 'Пятна на раковине' },
      { objectClass: 'dirty_toilet', importance: 'critical', scoreModifier: -2.0, description: 'Грязный унитаз' },
      { objectClass: 'hair_in_shower', importance: 'major', scoreModifier: -1.5, description: 'Волосы в душе' },
      { objectClass: 'limescale', importance: 'minor', scoreModifier: -0.5, description: 'Известковый налет' }
    ]
  },
  {
    id: 'bathroom-supplies',
    text: 'Полотенца и туалетные принадлежности предоставлены и чистые?',
    description: 'Проверка наличия и качества полотенец и туалетных принадлежностей',
    weight: 1.0,
    scoringCriteria: {
      maxStars: 5,
      thresholds: [
        { stars: 5, minCount: 2, condition: 'and', description: 'Полный набор чистых принадлежностей' },
        { stars: 3, minCount: 1, condition: 'and', description: 'Частичный набор' },
        { stars: 1, maxCount: 0, condition: 'and', description: 'Отсутствие принадлежностей' }
      ],
      negativeFactors: ['dirty_towel', 'missing_amenities', 'stained_supplies'],
      positiveFactors: ['towel', 'amenities_kit', 'soap_dispenser']
    },
    detectionRules: [
      { objectClass: 'towel', importance: 'critical', scoreModifier: 1.5, description: 'Наличие полотенец' },
      { objectClass: 'amenities_kit', importance: 'major', scoreModifier: 1.0, description: 'Набор туалетных принадлежностей' },
      { objectClass: 'soap_dispenser', importance: 'minor', scoreModifier: 0.5, description: 'Дозатор мыла' },
      { objectClass: 'dirty_towel', importance: 'major', scoreModifier: -1.5, description: 'Грязное полотенце' }
    ]
  }
];

// Main zone configurations
export const ZONES: Zone[] = [
  {
    id: 'reception',
    name: 'Ресепшен',
    icon: '🏨',
    description: 'Зона регистрации и первого впечатления',
    questions: receptionQuestions,
    modelEndpoint: 'hotel-reception-v1/1',
    isAvailable: true
  },
  {
    id: 'room',
    name: 'Номер',
    icon: '🛏️',
    description: 'Жилая зона с основными удобствами',
    questions: roomQuestions,
    modelEndpoint: 'hotel-room-v1/1',
    isAvailable: true
  },
  {
    id: 'bathroom',
    name: 'Ванная',
    icon: '🚿',
    description: 'Санузел и гигиенические принадлежности',
    questions: bathroomQuestions,
    modelEndpoint: 'hotel-bathroom-v1/1',
    isAvailable: true
  }
];

// Coming soon zones for future implementation
export const COMING_SOON_ZONES: Zone[] = [
  {
    id: 'restaurant',
    name: 'Ресторан',
    icon: '🍽️',
    description: 'Зона питания и обслуживания',
    questions: [],
    modelEndpoint: '',
    isAvailable: false
  },
  {
    id: 'elevator',
    name: 'Лифт',
    icon: '🛗',
    description: 'Вертикальный транспорт',
    questions: [],
    modelEndpoint: '',
    isAvailable: false
  },
  {
    id: 'lobby',
    name: 'Лобби',
    icon: '🪑',
    description: 'Общественная зона ожидания',
    questions: [],
    modelEndpoint: '',
    isAvailable: false
  },
  {
    id: 'fitness',
    name: 'Фитнес',
    icon: '🏋️',
    description: 'Спортивная зона',
    questions: [],
    modelEndpoint: '',
    isAvailable: false
  },
  {
    id: 'spa',
    name: 'СПА',
    icon: '🧖',
    description: 'Зона релаксации и процедур',
    questions: [],
    modelEndpoint: '',
    isAvailable: false
  },
  {
    id: 'parking',
    name: 'Парковка',
    icon: '🚗',
    description: 'Зона паркования автомобилей',
    questions: [],
    modelEndpoint: '',
    isAvailable: false
  }
];

// Get all zones including coming soon
export const getAllZones = (): Zone[] => [...ZONES, ...COMING_SOON_ZONES];

// Get only available zones
export const getAvailableZones = (): Zone[] => ZONES.filter(zone => zone.isAvailable);

// Get zone by ID
export const getZoneById = (id: string): Zone | undefined => {
  return getAllZones().find(zone => zone.id === id);
};

// Get questions for a specific zone
export const getZoneQuestions = (zoneId: string): Question[] => {
  const zone = getZoneById(zoneId);
  return zone ? zone.questions : [];
};