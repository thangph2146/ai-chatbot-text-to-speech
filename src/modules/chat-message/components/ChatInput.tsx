import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InputAreaConfig } from '../types/ui';
import { cn } from '@/app/lib/utils';
import {
  FaPaperPlane,
  FaMarkdown,
  FaEye,
  FaEyeSlash,
  FaMicrophone,
  FaPaperclip,
  FaSmile,
} from 'react-icons/fa';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
  config?: Partial<InputAreaConfig>;
  className?: string;
  placeholder?: string;
  showMarkdownPreview?: boolean;
  onToggleMarkdownPreview?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  maxLength?: number;
  showCharacterCount?: boolean;
  enableFileUpload?: boolean;
  enableVoiceInput?: boolean;
  onFileUpload?: (files: FileList) => void;
  onVoiceInput?: (transcript: string) => void;
}

const defaultConfig: InputAreaConfig = {
  placeholder: 'Nhập tin nhắn của bạn...',
  maxLength: 4000,
  showCharCount: true,
  enableMarkdownPreview: true,
  enableFileUpload: false,
  enableVoiceInput: false,
  autoResize: true,
};

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  loading = false,
  disabled = false,
  config = {},
  className,
  placeholder,
  showMarkdownPreview = false,
  onToggleMarkdownPreview,
  onFocus,
  onBlur,
  maxLength,
  showCharacterCount,
  enableFileUpload,
  enableVoiceInput,
  onFileUpload,
  onVoiceInput,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const finalConfig = { 
    ...defaultConfig, 
    ...config,
    maxLength: maxLength ?? config.maxLength ?? defaultConfig.maxLength,
    showCharCount: showCharacterCount ?? config.showCharCount ?? defaultConfig.showCharCount,
    enableFileUpload: enableFileUpload ?? config.enableFileUpload ?? defaultConfig.enableFileUpload,
    enableVoiceInput: enableVoiceInput ?? config.enableVoiceInput ?? defaultConfig.enableVoiceInput,
  };
  const finalPlaceholder = placeholder || finalConfig.placeholder;

  // Auto-resize textarea
  useEffect(() => {
    if (finalConfig.autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value, finalConfig.autoResize]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !loading && !disabled) {
      onSend(value.trim());
    }
  }, [value, loading, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return;
      } else {
        // Send message with Enter
        e.preventDefault();
        handleSubmit(e);
      }
    }

    // Markdown shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertMarkdown('**', '**');
          break;
        case 'i':
          e.preventDefault();
          insertMarkdown('*', '*');
          break;
        case 'k':
          e.preventDefault();
          insertMarkdown('[', '](url)');
          break;
        case '`':
          e.preventDefault();
          insertMarkdown('`', '`');
          break;
      }
    }
  }, [handleSubmit]);

  const insertMarkdown = useCallback((before: string, after: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      if (textarea) {
        const newCursorPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }
    }, 0);
  }, [value, onChange]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload?.(files);
    }
  }, [onFileUpload]);

  const toggleVoiceRecording = useCallback(() => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      // Handle stop recording logic
      // In a real implementation, you would stop the recording and get the transcript
      const mockTranscript = "Voice input transcript";
      onVoiceInput?.(mockTranscript);
    } else {
      // Start recording
      setIsRecording(true);
      // Handle start recording logic
    }
  }, [isRecording, onVoiceInput]);

  const insertEmoji = useCallback((emoji: string) => {
    const newValue = value + emoji;
    onChange(newValue);
    textareaRef.current?.focus();
  }, [value, onChange]);

  const charCount = value.length;
  const isOverLimit = charCount > finalConfig.maxLength;
  const canSend = value.trim() && !loading && !disabled && !isOverLimit;

  return (
    <div className={cn('border-t border-gray-200 bg-white', className)}>
      {/* Markdown Preview */}
      {(showMarkdownPreview || showPreview) && finalConfig.enableMarkdownPreview && value.trim() && (
        <div className="border-b border-gray-200 p-4 bg-gray-50 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Xem trước Markdown:</span>
            <button
              onClick={() => {
                setShowPreview(false);
                onToggleMarkdownPreview?.();
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaEyeSlash className="w-4 h-4" />
            </button>
          </div>
          <MarkdownRenderer content={value} className="prose prose-sm max-w-none" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4">
        <div className="relative">
          {/* Main Input Area */}
          <div
            className={cn(
              'relative border rounded-lg transition-all duration-200',
              {
                'border-blue-500 ring-2 ring-blue-500 ring-opacity-20': isFocused,
                'border-gray-300': !isFocused,
                'border-red-500': isOverLimit,
              }
            )}
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsFocused(true);
                onFocus?.();
              }}
              onBlur={() => {
                setIsFocused(false);
                onBlur?.();
              }}
              placeholder={finalPlaceholder}
              disabled={disabled || loading}
              className={cn(
                'w-full px-4 py-3 pr-20 resize-none border-none outline-none rounded-lg',
                'placeholder-gray-500 text-gray-900',
                'disabled:bg-gray-50 disabled:text-gray-500',
                {
                  'min-h-[44px]': !finalConfig.autoResize,
                  'min-h-[44px] max-h-[200px]': finalConfig.autoResize,
                }
              )}
              rows={finalConfig.autoResize ? 1 : 3}
            />

            {/* Toolbar */}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              {/* Markdown Preview Toggle */}
              {finalConfig.enableMarkdownPreview && (
                <button
                  type="button"
                  onClick={() => {
                    const newShowPreview = !showPreview;
                    setShowPreview(newShowPreview);
                    onToggleMarkdownPreview?.();
                  }}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    {
                      'text-blue-600 bg-blue-100': showMarkdownPreview || showPreview,
                      'text-gray-500 hover:text-gray-700 hover:bg-gray-100': !(showMarkdownPreview || showPreview),
                    }
                  )}
                  title="Xem trước Markdown"
                >
                  {(showMarkdownPreview || showPreview) ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                </button>
              )}

              {/* File Upload */}
              {finalConfig.enableFileUpload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                    accept="image/*,text/*,.pdf,.doc,.docx"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    title="Đính kèm file"
                  >
                    <FaPaperclip className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Voice Input */}
              {finalConfig.enableVoiceInput && (
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    {
                      'text-red-600 bg-red-100 animate-pulse': isRecording,
                      'text-gray-500 hover:text-gray-700 hover:bg-gray-100': !isRecording,
                    }
                  )}
                  title={isRecording ? 'Dừng ghi âm' : 'Ghi âm'}
                >
                  <FaMicrophone className="w-4 h-4" />
                </button>
              )}

              {/* Send Button */}
              <button
                type="submit"
                disabled={!canSend}
                className={cn(
                  'p-2 rounded-md transition-all duration-200',
                  {
                    'text-white bg-blue-700 hover:bg-blue-800 transform hover:scale-105': canSend,
                    'text-gray-400 bg-gray-200 cursor-not-allowed': !canSend,
                  }
                )}
                title="Gửi tin nhắn (Enter)"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FaPaperPlane className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Character Count & Shortcuts */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>Shift+Enter để xuống dòng</span>
              {finalConfig.enableMarkdownPreview && (
                <span>Ctrl+B: <strong>đậm</strong>, Ctrl+I: <em>nghiêng</em></span>
              )}
            </div>
            
            {finalConfig.showCharCount && (
              <span className={cn({
                'text-red-700': isOverLimit,
                'text-yellow-500': charCount > finalConfig.maxLength * 0.8,
              })}>
                {charCount}/{finalConfig.maxLength}
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;