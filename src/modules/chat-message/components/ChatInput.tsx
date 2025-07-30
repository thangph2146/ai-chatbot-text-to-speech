import React, { useState, useCallback, useRef, useEffect } from 'react';
import { InputAreaConfig } from '../types/ui';
import { cn } from '@/app/lib/utils';
import {
  FaPaperPlane,
  FaEye,
  FaEyeSlash,
  FaMicrophone,
  FaPaperclip,
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
  }, [handleSubmit, insertMarkdown]);

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



  const charCount = value.length;
  const isOverLimit = charCount > finalConfig.maxLength;
  const canSend = value.trim() && !loading && !disabled && !isOverLimit;

  return (
    <div className={cn('border-t border-gray-200 bg-white shadow-md', className)}>
      {/* Markdown Preview */}
      {(showMarkdownPreview || showPreview) && finalConfig.enableMarkdownPreview && value.trim() && (
        <div className="border-b border-gray-200 p-4 bg-gray-50 max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-blue-700">Xem trước Markdown:</span>
            <button
              onClick={() => {
                setShowPreview(false);
                onToggleMarkdownPreview?.();
              }}
              className="text-blue-700 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-all duration-200"
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
              'relative border rounded-xl transition-all duration-200 shadow-sm',
              {
                'border-blue-700 ring-2 ring-blue-700/20': isFocused,
                'border-gray-300': !isFocused,
                'border-red-700 ring-2 ring-red-700/20': isOverLimit,
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
                'w-full px-4 py-3 pr-20 resize-none border-none outline-none rounded-xl bg-white',
                'placeholder-gray-400 text-gray-800 font-medium',
                'disabled:bg-gray-50 disabled:text-gray-500',
                {
                  'min-h-[48px]': !finalConfig.autoResize,
                  'min-h-[48px] max-h-[200px]': finalConfig.autoResize,
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
                    'p-2 rounded-lg transition-all duration-200',
                    {
                      'text-blue-700 bg-blue-50 border border-blue-700/30': showMarkdownPreview || showPreview,
                      'text-gray-500 hover:text-blue-700 hover:bg-blue-50': !(showMarkdownPreview || showPreview),
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
                    className="p-2 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200"
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
                    'p-2 rounded-lg transition-all duration-200',
                    {
                      'text-red-700 bg-red-50 border border-red-700/30 animate-pulse': isRecording,
                      'text-gray-500 hover:text-blue-700 hover:bg-blue-50': !isRecording,
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
                'p-2.5 rounded-lg transition-all duration-200 shadow-sm',
                {
                  'bg-blue-700 hover:bg-blue-800 text-white': canSend,
                  'bg-gray-300 text-gray-500 cursor-not-allowed': !canSend,
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
          <div className="flex items-center justify-between mt-3 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 text-gray-600">
              <span className="font-medium">Shift+Enter: Xuống dòng</span>
              {finalConfig.enableMarkdownPreview && (
                <>
                  <span className="font-medium">Ctrl+B: <strong>Đậm</strong></span>
                  <span className="font-medium">Ctrl+I: <em>Nghiêng</em></span>
                </>
              )}
            </div>
            
            {finalConfig.showCharCount && (
              <span className={cn('font-semibold px-2 py-1 rounded text-xs', {
                'text-red-700 bg-red-50': isOverLimit,
                'text-yellow-700 bg-yellow-50': charCount > finalConfig.maxLength * 0.8 && !isOverLimit,
                'text-gray-600 bg-gray-100': charCount <= finalConfig.maxLength * 0.8,
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