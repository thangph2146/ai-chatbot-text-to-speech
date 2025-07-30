import React, { useState, useCallback, useMemo } from 'react';
import { Message, MessageAction, MessageBubbleConfig } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageActions } from './MessageActions';
import { MessageStatus } from './MessageStatus';
import { formatTimestamp } from '../utils/dateUtils';
import { cn } from '@/app/lib/utils';

interface MessageBubbleProps {
  message: Message;
  config?: Partial<MessageBubbleConfig>;
  onAction?: (messageId: string, action: MessageAction, data?: any) => void;
  isSelected?: boolean;
  isEditing?: boolean;
  onEditSave?: (messageId: string, newContent: string) => void;
  onEditCancel?: () => void;
  className?: string;
}

const defaultConfig: MessageBubbleConfig = {
  maxWidth: 'max-w-[85%]',
  showAvatar: false,
  showTimestamp: true,
  showStatus: true,
  enableActions: true,
  animateEntry: true,
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  config = {},
  onAction,
  isSelected = false,
  isEditing = false,
  onEditSave,
  onEditCancel,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showActions, setShowActions] = useState(false);
  const finalConfig = { ...defaultConfig, ...config };
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'model';
  const isSystem = message.role === 'system';

  // Combine all text parts for editing
  const fullText = useMemo(() => {
    if (!message.parts || !Array.isArray(message.parts)) {
      return '';
    }
    return message.parts.map(part => part.text || '').join('\n');
  }, [message.parts]);

  // Initialize edit content when editing starts
  React.useEffect(() => {
    if (isEditing) {
      setEditContent(fullText);
    }
  }, [isEditing, fullText]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (finalConfig.enableActions) {
      setShowActions(true);
    }
  }, [finalConfig.enableActions]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowActions(false);
  }, []);

  const handleAction = useCallback((action: MessageAction, data?: any) => {
    onAction?.(message.id, action, data);
  }, [message.id, onAction]);

  const handleEditSave = useCallback(() => {
    if (editContent.trim() && onEditSave) {
      onEditSave(message.id, editContent.trim());
    }
  }, [message.id, editContent, onEditSave]);

  const handleEditCancel = useCallback(() => {
    setEditContent(fullText);
    onEditCancel?.();
  }, [fullText, onEditCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  }, [handleEditSave, handleEditCancel]);

  // Determine bubble styling
  const bubbleClasses = cn(
    'group relative px-4 py-3 rounded-2xl transition-all duration-200',
    finalConfig.maxWidth,
    {
      // User messages (right side)
      'bg-blue-700 text-white ml-auto': isUser,
      'hover:bg-blue-800': isUser && isHovered,
      
      // Assistant messages (left side)
      'bg-white text-gray-900 border border-gray-200 mr-auto': isAssistant,
      'hover:bg-gray-50': isAssistant && isHovered,
      
      // System messages (center)
      'bg-yellow-50 text-yellow-800 mx-auto text-center text-sm': isSystem,
      
      // Selection state
      'ring-2 ring-blue-400 ring-opacity-50': isSelected,
      
      // Animation
      'animate-fade-in-up': finalConfig.animateEntry,
    },
    className
  );

  const containerClasses = cn(
    'flex mb-4 transition-all duration-200',
    {
      'justify-end': isUser,
      'justify-start': isAssistant,
      'justify-center': isSystem,
    }
  );

  return (
    <div 
      className={containerClasses}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative max-w-full">
        {/* Message Bubble */}
        <div className={bubbleClasses}>
          {/* Editing Mode */}
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="Chỉnh sửa tin nhắn..."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleEditCancel}
                  className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={!editContent.trim()}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Lưu
                </button>
              </div>
            </div>
          ) : (
            /* Normal Display Mode */
            <div className="space-y-2">
              {/* Message Content */}
              <div className="prose prose-sm max-w-none">
                {message.parts && Array.isArray(message.parts) ? message.parts.map((part, index) => (
                  <div key={index}>
                    {part.type === 'markdown' || isAssistant ? (
                      <MarkdownRenderer 
                        content={part.text || ''}
                        className={cn({
                          'prose-invert': isUser,
                        })}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap break-words">
                        {part.text || ''}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-gray-500 italic">
                    No content available
                  </div>
                )}
              </div>

              {/* Message Metadata */}
              <div className="flex items-center justify-between text-xs opacity-70">
                {finalConfig.showTimestamp && (
                  <span>
                    {formatTimestamp(message.timestamp)}
                  </span>
                )}
                
                {finalConfig.showStatus && message.status && (
                  <MessageStatus 
                    status={message.status}
                    className={cn({
                      'text-blue-200': isUser,
                      'text-gray-500': isAssistant,
                    })}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Message Actions */}
        {!isEditing && finalConfig.enableActions && (showActions || isSelected) && (
          <MessageActions
            messageId={message.id}
            messageRole={message.role}
            onAction={handleAction}
            className={cn(
              'absolute top-0 transition-opacity duration-200',
              {
                'right-full mr-2': isUser,
                'left-full ml-2': isAssistant,
                'opacity-0 group-hover:opacity-100': !isSelected,
              }
            )}
          />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;