'use client';

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { useCallRedux } from '../hooks/useCallRedux';

interface CallMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  conversationId?: string;
  messageId?: string;
  status?: 'pending' | 'sent' | 'failed';
  audioUrl?: string;
  isPlaying?: boolean;
}

interface CallMessageListProps {
  className?: string;
  maxHeight?: string;
  showTimestamps?: boolean;
  showStatus?: boolean;
  compactMode?: boolean;
}

const MessageItem = memo<{
  message: CallMessage;
  showTimestamp: boolean;
  showStatus: boolean;
  compactMode: boolean;
  onPlayAudio?: (audioUrl: string) => void;
  onStopAudio?: () => void;
}>(({ message, showTimestamp, showStatus, compactMode, onPlayAudio, onStopAudio }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  
  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const getStatusIcon = useCallback((status?: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'sent':
        return '✓';
      case 'failed':
        return '❌';
      default:
        return null;
    }
  }, []);

  const handlePlayAudio = useCallback(() => {
    if (message.audioUrl && onPlayAudio) {
      onPlayAudio(message.audioUrl);
    }
  }, [message.audioUrl, onPlayAudio]);

  const handleStopAudio = useCallback(() => {
    if (onStopAudio) {
      onStopAudio();
    }
  }, [onStopAudio]);

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${
        compactMode ? 'mb-2' : 'mb-4'
      }`}
    >
      <div
        className={`max-w-xs lg:max-w-md xl:max-w-lg ${
          isUser
            ? 'bg-blue-500 text-white rounded-l-lg rounded-tr-lg'
            : 'bg-gray-100 text-gray-800 rounded-r-lg rounded-tl-lg'
        } px-4 py-2 ${compactMode ? 'px-3 py-1.5' : 'px-4 py-2'}`}
      >
        <div className="flex items-start gap-2">
          {isAssistant && message.audioUrl && (
            <button
              onClick={message.isPlaying ? handleStopAudio : handlePlayAudio}
              className={`flex-shrink-0 p-1 rounded-full transition-colors ${
                message.isPlaying
                  ? 'bg-red-500 text-white'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              title={message.isPlaying ? 'Dừng phát âm thanh' : 'Phát âm thanh'}
            >
              {message.isPlaying ? '⏸️' : '🔊'}
            </button>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="break-words whitespace-pre-wrap">
              {message.content}
            </div>
            
            {(showTimestamp || showStatus) && (
              <div className={`flex items-center gap-2 mt-1 ${
                isUser ? 'justify-end' : 'justify-start'
              }`}>
                {showTimestamp && (
                  <span className={`text-xs ${
                    isUser ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </span>
                )}
                
                {showStatus && message.status && (
                  <span className="text-xs opacity-75">
                    {getStatusIcon(message.status)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export const CallMessageList: React.FC<CallMessageListProps> = memo(({
  className = '',
  maxHeight = '400px',
  showTimestamps = true,
  showStatus = true,
  compactMode = false,
}) => {
  const {
    messages,
    uiState,
    handlePlayAudio,
    handleStopAudio,
    handleSetMessagePlaying,
  } = useCallRedux();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (uiState.autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, uiState.autoScroll]);

  // Handle audio playback state
  const handlePlayAudioWithState = useCallback((audioUrl: string) => {
    // Set all messages as not playing
    messages.forEach(msg => {
      if (msg.audioUrl) {
        handleSetMessagePlaying(msg.id, false);
      }
    });
    
    // Set current message as playing
    const currentMessage = messages.find(msg => msg.audioUrl === audioUrl);
    if (currentMessage) {
      handleSetMessagePlaying(currentMessage.id, true);
    }
    
    handlePlayAudio(audioUrl);
  }, [messages, handlePlayAudio, handleSetMessagePlaying]);

  const handleStopAudioWithState = useCallback(() => {
    // Set all messages as not playing
    messages.forEach(msg => {
      if (msg.audioUrl) {
        handleSetMessagePlaying(msg.id, false);
      }
    });
    
    handleStopAudio();
  }, [messages, handleStopAudio, handleSetMessagePlaying]);

  // Virtualization for performance (simple implementation)
  const visibleMessages = messages.slice(-50); // Show last 50 messages for performance

  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 text-gray-500 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">🎤</div>
          <p className="text-sm">Bắt đầu cuộc trò chuyện bằng giọng nói</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ maxHeight }}
    >
      <div className="px-4 py-2">
        {visibleMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            showTimestamp={showTimestamps}
            showStatus={showStatus}
            compactMode={compactMode}
            onPlayAudio={handlePlayAudioWithState}
            onStopAudio={handleStopAudioWithState}
          />
        ))}
        
        {/* Loading indicator for pending messages */}
        {messages.some(msg => msg.status === 'pending') && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-100 text-gray-800 rounded-r-lg rounded-tl-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-600">Đang xử lý...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
});

CallMessageList.displayName = 'CallMessageList'; 