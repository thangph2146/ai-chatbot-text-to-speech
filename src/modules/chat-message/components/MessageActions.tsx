import React, { useState, useCallback } from 'react';
import { MessageAction } from '../types';
import { cn } from '@/app/lib/utils';
import {
  FaEdit,
  FaTrash,
  FaCopy,
  FaReply,
  FaRedo,
  FaBookmark,
  FaShare,
  FaEllipsisV,
  FaCheck,
} from 'react-icons/fa';

interface MessageActionsProps {
  messageId: string;
  messageRole: 'user' | 'model' | 'system';
  onAction: (action: MessageAction, data?: any) => void;
  className?: string;
  compact?: boolean;
}

interface ActionConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: MessageAction;
  color: string;
  hoverColor: string;
  requiresConfirm?: boolean;
  disabled?: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  messageRole,
  onAction,
  className,
  compact = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<MessageAction | null>(null);

  // Define available actions based on message role
  const getAvailableActions = useCallback((): ActionConfig[] => {
    const baseActions: ActionConfig[] = [
      {
        icon: FaCopy,
        label: 'Sao chép',
        action: 'copy',
        color: 'text-gray-600',
        hoverColor: 'hover:text-gray-800',
      },
    ];

    if (messageRole === 'user') {
      return [
        ...baseActions,
        {
          icon: FaEdit,
          label: 'Chỉnh sửa',
          action: 'edit',
          color: 'text-blue-600',
          hoverColor: 'hover:text-blue-800',
        },
        {
          icon: FaTrash,
          label: 'Xóa',
          action: 'delete',
          color: 'text-red-600',
          hoverColor: 'hover:text-red-800',
          requiresConfirm: true,
        },
      ];
    }

    if (messageRole === 'model') {
      return [
        ...baseActions,
        {
          icon: FaRedo,
          label: 'Tạo lại',
          action: 'regenerate',
          color: 'text-green-600',
          hoverColor: 'hover:text-green-800',
        },
        {
          icon: FaReply,
          label: 'Trả lời',
          action: 'reply',
          color: 'text-purple-600',
          hoverColor: 'hover:text-purple-800',
        },
        {
          icon: FaBookmark,
          label: 'Lưu',
          action: 'bookmark',
          color: 'text-yellow-600',
          hoverColor: 'hover:text-yellow-800',
        },
        {
          icon: FaShare,
          label: 'Chia sẻ',
          action: 'share',
          color: 'text-indigo-600',
          hoverColor: 'hover:text-indigo-800',
        },
      ];
    }

    return baseActions;
  }, [messageRole]);

  const availableActions = getAvailableActions();

  const handleActionClick = useCallback(async (actionConfig: ActionConfig) => {
    const { action, requiresConfirm } = actionConfig;

    if (requiresConfirm && confirmingAction !== action) {
      setConfirmingAction(action);
      return;
    }

    // Handle copy action with feedback
    if (action === 'copy') {
      setCopiedAction(action);
      setTimeout(() => setCopiedAction(null), 2000);
    }

    // Reset confirmation state
    setConfirmingAction(null);
    setShowDropdown(false);

    // Execute action
    onAction(action, { messageId });
  }, [messageId, onAction, confirmingAction]);

  const handleCancelConfirm = useCallback(() => {
    setConfirmingAction(null);
  }, []);

  const renderActionButton = useCallback((actionConfig: ActionConfig, index: number) => {
    const { icon: Icon, label, action, color, hoverColor, requiresConfirm } = actionConfig;
    const isConfirming = confirmingAction === action;
    const isCopied = copiedAction === action;

    if (isConfirming) {
      return (
        <div key={action} className="flex items-center gap-1">
          <button
            onClick={() => handleActionClick(actionConfig)}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            title="Xác nhận xóa"
          >
            Xóa
          </button>
          <button
            onClick={handleCancelConfirm}
            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            title="Hủy"
          >
            Hủy
          </button>
        </div>
      );
    }

    return (
      <button
        key={action}
        onClick={() => handleActionClick(actionConfig)}
        className={cn(
          'p-2 rounded-full transition-all duration-200 transform hover:scale-110',
          'bg-white shadow-md hover:shadow-lg',
          color,
          hoverColor,
          {
            'p-1.5': compact,
          }
        )}
        title={label}
      >
        {isCopied ? (
          <FaCheck className={cn('w-4 h-4 text-green-500', { 'w-3 h-3': compact })} />
        ) : (
          <Icon className={cn('w-4 h-4', { 'w-3 h-3': compact })} />
        )}
      </button>
    );
  }, [compact, confirmingAction, copiedAction, handleActionClick, handleCancelConfirm]);

  const renderCompactActions = useCallback(() => {
    const primaryActions = availableActions.slice(0, 2);
    const secondaryActions = availableActions.slice(2);

    return (
      <div className="flex items-center gap-1">
        {/* Primary actions */}
        {primaryActions.map((action, index) => renderActionButton(action, index))}
        
        {/* Dropdown for secondary actions */}
        {secondaryActions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-full bg-white shadow-md hover:shadow-lg text-gray-600 hover:text-gray-800 transition-all duration-200 transform hover:scale-110"
              title="Thêm hành động"
            >
              <FaEllipsisV className="w-4 h-4" />
            </button>
            
            {showDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                {secondaryActions.map((action, index) => (
                  <button
                    key={action.action}
                    onClick={() => handleActionClick(action)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2',
                      action.color,
                      action.hoverColor,
                      'hover:bg-gray-50'
                    )}
                  >
                    <action.icon className="w-3 h-3" />
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [availableActions, showDropdown, renderActionButton, handleActionClick]);

  const renderFullActions = useCallback(() => {
    return (
      <div className="flex items-center gap-1">
        {availableActions.map((action, index) => renderActionButton(action, index))}
      </div>
    );
  }, [availableActions, renderActionButton]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className={cn('flex items-center', className)}>
      {compact ? renderCompactActions() : renderFullActions()}
    </div>
  );
};

export default MessageActions;