import React from 'react';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';
import type { Zone, ZoneSelectorProps } from '../../types';

const ZoneSelector: React.FC<ZoneSelectorProps> = ({
  zones,
  onZoneSelect,
  completedZones,
  className = ''
}) => {
  const availableZones = zones.filter(zone => zone.isAvailable);
  const comingSoonZones = zones.filter(zone => !zone.isAvailable);

  const isZoneCompleted = (zoneId: string): boolean => {
    return completedZones.includes(zoneId);
  };

  const ZoneCard: React.FC<{ zone: Zone; onClick?: () => void; disabled?: boolean }> = ({
    zone,
    onClick,
    disabled = false
  }) => {
    const completed = isZoneCompleted(zone.id);
    
    return (
      <div
        onClick={!disabled ? onClick : undefined}
        className={`
          zone-card relative group
          ${disabled 
            ? 'opacity-50 cursor-not-allowed bg-gray-100' 
            : 'hover:scale-105 transform transition-transform duration-200'
          }
          ${completed ? 'border-success-200 bg-success-50' : ''}
        `}
      >
        {/* Zone Icon */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-4xl mb-2">{zone.icon}</div>
          {completed && (
            <CheckCircle className="w-6 h-6 text-success-600" />
          )}
          {disabled && (
            <Clock className="w-6 h-6 text-gray-400" />
          )}
        </div>

        {/* Zone Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {zone.name}
        </h3>

        {/* Zone Description */}
        <p className="text-gray-600 text-sm mb-4">
          {zone.description}
        </p>

        {/* Questions List */}
        {zone.questions.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700">
              Вопросы для оценки:
            </h4>
            <ul className="space-y-1">
              {zone.questions.map((question, index) => (
                <li key={question.id} className="text-xs text-gray-600 flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">•</span>
                  <span>{question.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button */}
        {!disabled && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-500">
              {completed ? 'Завершено' : 'Начать оценку'}
            </span>
            <ArrowRight className="w-4 h-4 text-primary-500 group-hover:translate-x-1 transition-transform" />
          </div>
        )}

        {/* Coming Soon Label */}
        {disabled && (
          <div className="absolute top-4 right-4 bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
            Скоро
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Тайный Гость MVP
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          Автоматизированная оценка качества отеля с помощью видеоанализа
        </p>
        <p className="text-sm text-gray-500">
          Выберите зону для оценки. Загрузите короткое видео (15-30 сек), 
          и ИИ автоматически ответит на вопросы анкеты тайного гостя.
        </p>
      </div>

      {/* Available Zones */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
          Доступные зоны для оценки
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableZones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              onClick={() => onZoneSelect(zone)}
            />
          ))}
        </div>
      </div>

      {/* Coming Soon Zones */}
      {comingSoonZones.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            Скоро появится
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {comingSoonZones.map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                disabled={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Progress Summary */}
      {completedZones.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-primary-900 mb-2">
            Прогресс оценки
          </h3>
          <p className="text-primary-700">
            Завершено зон: {completedZones.length} из {availableZones.length}
          </p>
          <div className="w-full bg-primary-200 rounded-full h-2 mt-3">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(completedZones.length / availableZones.length) * 100}%`
              }}
            ></div>
          </div>
          {completedZones.length === availableZones.length && (
            <p className="text-sm text-primary-600 mt-2 font-medium">
              🎉 Все доступные зоны оценены!
            </p>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Как это работает
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-primary-600 font-bold">1</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Выберите зону</h4>
            <p className="text-sm text-gray-600">
              Выберите зону отеля для оценки
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-primary-600 font-bold">2</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Загрузите видео</h4>
            <p className="text-sm text-gray-600">
              Снимите короткое видео (15-30 сек) выбранной зоны
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-primary-600 font-bold">3</span>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Получите отчет</h4>
            <p className="text-sm text-gray-600">
              ИИ автоматически ответит на вопросы и создаст PDF-отчет
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneSelector;