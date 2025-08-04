'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { cn } from '@/app/lib/utils';
import { FaPhone, FaPhoneSlash, FaMicrophone, FaVolumeUp, FaCog } from 'react-icons/fa';
import { SoundWave } from './components/SoundWave';
import { CallMessageList } from './components/CallMessageList';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { useCallRedux } from './hooks/useCallRedux';

export type CallState = 'idle' | 'listening' | 'processing' | 'speaking' | 'ended';

interface CallCommunicateProps {
  className?: string;
  onCallStateChange?: (state: CallState) => void;
  conversationId?: string;
  userId?: string;
  showMessages?: boolean;
  showSettings?: boolean;
}

export const CallCommunicate: React.FC<CallCommunicateProps> = ({
  className,
  onCallStateChange,
  conversationId,
  userId = 'user-001',
  showMessages = true,
  showSettings = true,
}) => {
  // Redux state and actions với selectors tối ưu
  const {
    callState,
    isCallActive,
    isProcessing,
    error,
    currentTranscript,
    currentConversationId,
    ttsState,
    uiState,
    isSpeaking,
    handleStartCall,
    handleEndCall,
    handleSetCallState,
    handleUpdateTranscript,
    handleClearTranscript,
    handleSetConversationId,
    handleSetError,
    handleClearError,
    handleSendMessage,
    handleSetUIState,
    handleCleanupAudio,
    handleCleanupMessages,
    handlePlayAudio,
  } = useCallRedux();
  
  // Refs để tránh re-render không cần thiết
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStartingListeningRef = useRef(false);

  // Custom hooks for voice recognition and TTS
  const {
    isListening,
    transcript,
    finalTranscript,
    startListening,
    stopListening,
    resetTranscript,
    resetFinalTranscript,
    isSupported: isVoiceSupported
  } = useVoiceRecognition({
    continuous: true,
    interimResults: true,
    lang: 'vi-VN'
  });

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking: isTTSSpeaking,
    isSupported: isTTSSupported
  } = useTextToSpeech();

  // Initialize conversation ID from props
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      handleSetConversationId(conversationId);
    }
  }, [conversationId, currentConversationId, handleSetConversationId]);

  // Notify parent of call state changes
  useEffect(() => {
    onCallStateChange?.(callState);
  }, [callState, onCallStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleCleanupAudio();
      handleCleanupMessages();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleCleanupAudio, handleCleanupMessages]);

  // Send message using Redux với TTS integration
  const handleSendMessageOptimized = useCallback(async (message: string) => {
    if (isProcessing || !message.trim()) return;
    
    const trimmedMessage = message.trim();
    
    // Clear timeout to prevent duplicate sends
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Stop listening and reset all transcripts
    stopListening();
    resetTranscript();
    resetFinalTranscript();
    handleClearTranscript();
    handleClearError();

    console.log('Sending message:', trimmedMessage);

    try {
      // Send message through Redux với TTS enabled
      const result = await handleSendMessage({
        message: trimmedMessage,
        userId,
        conversationId: currentConversationId,
        enableTTS: true
      });
      
      // TTS sẽ được xử lý tự động trong Redux slice
      if (result.assistantMessage) {
        handleSetCallState('speaking');
        
        // Fallback TTS nếu Redux TTS không hoạt động
        if (!result.audioUrl) {
          console.log('Using fallback TTS for:', result.assistantMessage.substring(0, 100) + '...');
          
          await speak(result.assistantMessage, {
            onEnd: () => {
              console.log('Fallback TTS ended, switching to listening mode');
              handleSetCallState('listening');
              if (!isStartingListeningRef.current) {
                isStartingListeningRef.current = true;
                startListening();
                setTimeout(() => {
                  isStartingListeningRef.current = false;
                }, 500);
              }
            },
            onError: (error) => {
              console.error('Fallback TTS Error:', error);
              handleSetError('Lỗi chuyển đổi giọng nói');
              handleSetCallState('listening');
              if (!isStartingListeningRef.current) {
                isStartingListeningRef.current = true;
                startListening();
                setTimeout(() => {
                  isStartingListeningRef.current = false;
                }, 500);
              }
            }
          });
        } else {
          console.log('Using Redux TTS audio URL');
          // Redux TTS sẽ tự động phát audio với callback khi kết thúc
          if (result.audioUrl) {
            handlePlayAudio(result.audioUrl, () => {
              console.log('Redux TTS ended, switching to listening mode');
              handleSetCallState('listening');
              if (!isStartingListeningRef.current) {
                isStartingListeningRef.current = true;
                startListening();
                setTimeout(() => {
                  isStartingListeningRef.current = false;
                }, 500);
              }
            });
          } else {
            // Fallback nếu không có audio URL
            console.log('No audio URL from Redux TTS, switching to listening mode');
            handleSetCallState('listening');
            if (!isStartingListeningRef.current) {
              isStartingListeningRef.current = true;
              startListening();
              setTimeout(() => {
                isStartingListeningRef.current = false;
              }, 500);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi gửi tin nhắn';
      handleSetError(errorMessage);
      handleSetCallState('listening');
      startListening();
    }
  }, [isProcessing, stopListening, resetTranscript, resetFinalTranscript, handleClearTranscript, handleClearError, handleSendMessage, userId, currentConversationId, handleSetCallState, speak, startListening, handleSetError, handlePlayAudio]);
            
  // Handle voice recognition results - use transcript for display, finalTranscript for sending
  useEffect(() => {
    if (!transcript || !isCallActive) return;

    // Update display transcript in Redux
    const trimmedTranscript = transcript.trim();
    if (trimmedTranscript && trimmedTranscript !== currentTranscript) {
      console.log('Updating transcript:', trimmedTranscript);
      handleUpdateTranscript(trimmedTranscript);
    }
  }, [transcript, isCallActive, currentTranscript, handleUpdateTranscript]);

  // Handle final transcript for sending messages
  useEffect(() => {
    if (!finalTranscript || !isCallActive || isProcessing || callState !== 'listening') return;

    const trimmedFinalTranscript = finalTranscript.trim();
    if (!trimmedFinalTranscript || trimmedFinalTranscript.length < 3) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for 2 seconds of silence after final transcript
    timeoutRef.current = setTimeout(() => {
      // Double check conditions before sending
      if (trimmedFinalTranscript && !isProcessing && callState === 'listening' && isCallActive) {
        console.log('Sending message after 2s silence:', trimmedFinalTranscript);
        handleSendMessageOptimized(trimmedFinalTranscript);
      }
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [finalTranscript, isCallActive, isProcessing, callState, handleSendMessageOptimized]);

  // Auto-switch to listening mode when audio ends
  useEffect(() => {
    if (callState === 'speaking' && !isSpeaking && !isTTSSpeaking) {
      console.log('Audio ended, switching to listening mode');
      handleSetCallState('listening');
      
      // Add delay to ensure audio state is fully updated
      setTimeout(() => {
        if (!isStartingListeningRef.current) {
          isStartingListeningRef.current = true;
          startListening();
          // Reset flag after a short delay
          setTimeout(() => {
            isStartingListeningRef.current = false;
          }, 500);
        }
      }, 100);
    }
  }, [callState, isSpeaking, isTTSSpeaking, handleSetCallState, startListening]);

  // Handle interruption when user starts speaking during AI response
  useEffect(() => {
    if (callState === 'speaking' && finalTranscript && finalTranscript.trim().length > 2) {
      console.log('User interruption detected:', finalTranscript);
      // Stop current TTS immediately
      stopSpeaking();
      handleCleanupAudio();
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Reset transcripts and start listening for new question
      resetTranscript();
      resetFinalTranscript();
      handleClearTranscript();
      handleSetCallState('listening');
      // Don't restart listening immediately, let the user finish speaking
      setTimeout(() => {
        if (!isStartingListeningRef.current) {
          isStartingListeningRef.current = true;
          startListening();
          setTimeout(() => {
            isStartingListeningRef.current = false;
          }, 500);
        }
      }, 500);
    }
  }, [finalTranscript, callState, resetTranscript, resetFinalTranscript, handleClearTranscript, handleSetCallState, startListening, stopSpeaking, handleCleanupAudio]);

  // Start call
  const startCall = useCallback(async () => {
    if (!isVoiceSupported || !isTTSSupported) {
      handleSetError('Trình duyệt không hỗ trợ tính năng giọng nói');
      return;
    }

    try {
      handleStartCall();
      handleClearError();
      
      // Start with a greeting
      const greeting = 'Xin chào! Tôi có thể giúp gì cho bạn?';
      handleSetCallState('speaking');
      
      await speak(greeting, {
        onEnd: () => {
          handleSetCallState('listening');
          startListening();
        },
        onError: (error) => {
          console.error('Greeting TTS Error:', error);
          handleSetError('Lỗi chuyển đổi giọng nói');
          handleSetCallState('listening');
          startListening();
        }
      });
    } catch (error) {
      console.error('Error starting call:', error);
      handleSetError('Không thể bắt đầu cuộc gọi');
      handleSetCallState('idle');
    }
  }, [isVoiceSupported, isTTSSupported, handleStartCall, handleClearError, handleSetCallState, speak, startListening, handleSetError]);

  // End call
  const endCall = useCallback(() => {
    handleEndCall();
    stopListening();
    stopSpeaking();
    resetTranscript();
    handleClearTranscript();
    handleClearError();
    handleCleanupAudio();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [handleEndCall, stopListening, stopSpeaking, resetTranscript, handleClearTranscript, handleClearError, handleCleanupAudio]);

  // Get status text based on current state
  const getStatusText = () => {
    switch (callState) {
      case 'listening':
        return 'Đang lắng nghe...';
      case 'processing':
        return 'Đang xử lý câu hỏi...';
      case 'speaking':
        return 'AI đang trả lời...';
      case 'ended':
        return 'Cuộc gọi đã kết thúc';
      default:
        return 'Nhấn để bắt đầu cuộc gọi';
    }
  };

  // Get sound wave type based on call state
  const getSoundWaveType = () => {
    switch (callState) {
      case 'listening':
        return 'listening';
      case 'processing':
        return 'processing';
      case 'speaking':
        return 'speaking';
      default:
        return 'idle';
    }
  };

  // Toggle UI settings
  const toggleSettings = useCallback(() => {
    handleSetUIState({
      showTranscript: !uiState.showTranscript,
      showTimestamps: !uiState.showTimestamps,
      compactMode: !uiState.compactMode,
    });
  }, [uiState, handleSetUIState]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Giao tiếp bằng giọng nói
        </h2>
        <p className={cn('text-lg font-medium', {
          'text-green-600': callState === 'listening',
          'text-blue-600': callState === 'processing',
          'text-purple-600': callState === 'speaking',
          'text-gray-600': callState === 'idle' || callState === 'ended',
        })}>
          {getStatusText()}
        </p>
        {currentTranscript && uiState.showTranscript && (
          <p className="text-sm text-gray-500 mt-1 italic">
            &ldquo;{currentTranscript}&rdquo;
          </p>
        )}
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Messages List */}
      {showMessages && (
        <div className="flex-1 mb-6">
          <CallMessageList
            className="bg-white rounded-lg shadow-sm border"
            maxHeight="300px"
            showTimestamps={uiState.showTimestamps}
            showStatus={true}
            compactMode={uiState.compactMode}
          />
        </div>
      )}

      {/* Sound Wave Visualization */}
      {isCallActive && (
        <div className="mb-6">
          <SoundWave 
            type={getSoundWaveType()}
            isActive={callState !== 'idle'}
            amplitude={isListening ? 0.8 : 0.5}
          />
        </div>
      )}

      {/* Call Controls */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {!isCallActive ? (
          <button
            onClick={startCall}
            disabled={!isVoiceSupported || !isTTSSupported}
            className={cn(
              'flex items-center justify-center w-16 h-16 rounded-full transition-all duration-200 shadow-lg',
              {
                'bg-green-500 hover:bg-green-600 text-white hover:scale-105': isVoiceSupported && isTTSSupported,
                'bg-gray-400 text-gray-600 cursor-not-allowed': !isVoiceSupported || !isTTSSupported,
              }
            )}
            title="Bắt đầu cuộc gọi"
          >
            <FaPhone className="w-6 h-6" />
          </button>
        ) : (
          <>
            {/* Microphone Status */}
            <div className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200',
              {
                'bg-green-100 text-green-600': isListening,
                'bg-gray-100 text-gray-400': !isListening,
              }
            )}>
              <FaMicrophone className="w-5 h-5" />
            </div>

            {/* Speaker Status */}
            <div className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200',
              {
                'bg-purple-100 text-purple-600': ttsState.isSpeaking,
                'bg-gray-100 text-gray-400': !ttsState.isSpeaking,
              }
            )}>
              <FaVolumeUp className="w-5 h-5" />
            </div>

            {/* Settings Button */}
            {showSettings && (
              <button
                onClick={toggleSettings}
                className="flex items-center justify-center w-12 h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-all duration-200"
                title="Cài đặt"
              >
                <FaCog className="w-5 h-5" />
              </button>
            )}

            {/* End Call Button */}
            <button
              onClick={endCall}
              className="flex items-center justify-center w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all duration-200 shadow-lg hover:scale-105"
              title="Kết thúc cuộc gọi"
            >
              <FaPhoneSlash className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Support Status */}
      <div className="text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-4">
          <span className={cn('flex items-center gap-1', {
            'text-green-600': isVoiceSupported,
            'text-red-600': !isVoiceSupported,
          })}>
            🎤 {isVoiceSupported ? 'Hỗ trợ' : 'Không hỗ trợ'} nhận diện giọng nói
          </span>
          <span className={cn('flex items-center gap-1', {
            'text-green-600': isTTSSupported,
            'text-red-600': !isTTSSupported,
          })}>
            🔊 {isTTSSupported ? 'Hỗ trợ' : 'Không hỗ trợ'} chuyển đổi giọng nói
          </span>
        </div>
      </div>
    </div>
  );
};

export default CallCommunicate;