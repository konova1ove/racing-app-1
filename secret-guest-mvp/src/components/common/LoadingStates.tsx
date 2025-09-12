import React from 'react';
import { Loader, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <Loader className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
};

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  className = ''
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          {label && <span>{label}</span>}
          {showPercentage && <span>{clampedProgress}%</span>}
        </div>
      )}
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorMessage 
          title="Что-то пошло не так"
          message="Произошла непредвиденная ошибка. Попробуйте обновить страницу."
          actionButton={
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Обновить страницу
            </button>
          }
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorMessageProps {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  actionButton?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  type = 'error',
  actionButton,
  onDismiss,
  className = ''
}) => {
  const typeStyles = {
    error: {
      container: 'bg-error-50 border-error-200',
      icon: 'text-error-500',
      title: 'text-error-800',
      text: 'text-error-700',
      IconComponent: AlertCircle
    },
    warning: {
      container: 'bg-warning-50 border-warning-200',
      icon: 'text-warning-500',
      title: 'text-warning-800',
      text: 'text-warning-700',
      IconComponent: AlertCircle
    },
    info: {
      container: 'bg-primary-50 border-primary-200',
      icon: 'text-primary-500',
      title: 'text-primary-800',
      text: 'text-primary-700',
      IconComponent: Info
    }
  };

  const styles = typeStyles[type];
  const { IconComponent } = styles;

  return (
    <div className={`
      rounded-lg border p-4 ${styles.container} ${className}
    `}>
      <div className="flex items-start space-x-3">
        <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-medium mb-1 ${styles.title}`}>
              {title}
            </h3>
          )}
          <p className={`text-sm ${styles.text}`}>
            {message}
          </p>
          {actionButton && (
            <div className="mt-3">
              {actionButton}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ${styles.icon} hover:opacity-75`}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

interface SuccessMessageProps {
  title?: string;
  message: string;
  actionButton?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  title,
  message,
  actionButton,
  onDismiss,
  className = ''
}) => {
  return (
    <div className={`
      rounded-lg border p-4 bg-success-50 border-success-200 ${className}
    `}>
      <div className="flex items-start space-x-3">
        <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-success-500" />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-medium mb-1 text-success-800">
              {title}
            </h3>
          )}
          <p className="text-sm text-success-700">
            {message}
          </p>
          {actionButton && (
            <div className="mt-3">
              {actionButton}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-success-500 hover:opacity-75"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

interface LoadingStateProps {
  message?: string;
  progress?: number;
  showProgress?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Загрузка...',
  progress,
  showProgress = false,
  className = ''
}) => {
  return (
    <div className={`text-center py-8 ${className}`}>
      <LoadingSpinner size="lg" className="mx-auto mb-4 text-primary-600" />
      <p className="text-gray-600 mb-4">{message}</p>
      {showProgress && progress !== undefined && (
        <div className="max-w-xs mx-auto">
          <ProgressBar progress={progress} showPercentage />
        </div>
      )}
    </div>
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionButton?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionButton,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {icon && (
        <div className="mb-4 flex justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {actionButton && actionButton}
    </div>
  );
};

export { ErrorBoundary };