import React from 'react';
import { MessageStatus as MessageStatusType } from '../types';
import { cn } from '@/app/lib/utils';
import {
  FaClock,
  FaPaperPlane,
  FaCheck,
  FaCheckDouble,
  FaExclamationTriangle,
  FaSpinner,
  FaPlay,
} from 'react-icons/fa';

interface MessageStatusProps {
  status: MessageStatusType;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface StatusConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor?: string;
  animate?: boolean;
}

const statusConfigs: Record<MessageStatusType, StatusConfig> = {
  pending: {
    icon: FaClock,
    label: 'Đang chờ',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
  },
  sending: {
    icon: FaPaperPlane,
    label: 'Đang gửi',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    animate: true,
  },
  sent: {
    icon: FaCheck,
    label: 'Đã gửi',
    color: 'text-green-500',
    bgColor: 'bg-green-100',
  },
  delivered: {
    icon: FaCheckDouble,
    label: 'Đã nhận',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  failed: {
    icon: FaExclamationTriangle,
    label: 'Thất bại',
    color: 'text-red-500',
    bgColor: 'bg-red-100',
  },
  streaming: {
    icon: FaPlay,
    label: 'Đang trả lời',
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
    animate: true,
  },
  completed: {
    icon: FaCheckDouble,
    label: 'Hoàn thành',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
};

export const MessageStatus: React.FC<MessageStatusProps> = ({
  status,
  className,
  showLabel = false,
  size = 'sm',
}) => {
  const config = statusConfigs[status];
  const { icon: Icon, label, color, bgColor, animate } = config;

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const containerSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const paddingClasses = {
    sm: 'px-1.5 py-0.5',
    md: 'px-2 py-1',
    lg: 'px-3 py-1.5',
  };

  if (showLabel) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full',
          bgColor,
          color,
          paddingClasses[size],
          containerSizeClasses[size],
          className
        )}
      >
        <Icon
          className={cn(
            sizeClasses[size],
            {
              'animate-pulse': animate && status === 'sending',
              'animate-bounce': animate && status === 'streaming',
            }
          )}
        />
        <span className="font-medium">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        className
      )}
      title={label}
    >
      <Icon
        className={cn(
          sizeClasses[size],
          color,
          {
            'animate-pulse': animate && status === 'sending',
            'animate-bounce': animate && status === 'streaming',
          }
        )}
      />
    </div>
  );
};

// Specialized components for common use cases
export const StreamingIndicator: React.FC<{ className?: string }> = ({ className }) => (
  <MessageStatus status="streaming" showLabel className={className} />
);

export const SendingIndicator: React.FC<{ className?: string }> = ({ className }) => (
  <MessageStatus status="sending" showLabel className={className} />
);

export const FailedIndicator: React.FC<{ className?: string; onRetry?: () => void }> = ({ 
  className, 
  onRetry 
}) => (
  <div className={cn('inline-flex items-center gap-2', className)}>
    <MessageStatus status="failed" showLabel />
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-xs text-red-600 hover:text-red-800 underline"
      >
        Thử lại
      </button>
    )}
  </div>
);

export default MessageStatus;