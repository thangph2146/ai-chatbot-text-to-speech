'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { cn } from '@/app/lib/utils';
import { FaPhone, FaPhoneSlash, FaMicrophone, FaVolumeUp } from 'react-icons/fa';
import { SoundWave } from './components/SoundWave';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { useCallRedux } from './hooks/useCallRedux';

export type CallState = 'idle' | 'listening' | 'processing' | 'speaking' | 'ended';

interface CallCommunicateProps {
  className?: string;
  onCallStateChange?: (state: CallState) => void;
  conversationId?: string;
  userId?: string;
}

export const CallCommunicate: React.FC<CallCommunicateProps> = ({
  className,
  onCallStateChange,
  conversationId,
  userId = 'user-001'
}) => {
  // Redux state and actions
  const {
    isCallActive,
    callState,
    currentConversationId,
    currentTranscript,
    isProcessing,
    error,
    startCall: reduxStartCall,
    endCall: reduxEndCall,
    setCallState,
    updateTranscript,
    clearTranscript,
    setConversationId,
    setError,
    clearError,
    sendMessage,
  } = useCallRedux();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    isSpeaking,
    isSupported: isTTSSupported
  } = useTextToSpeech();

  // Initialize conversation ID from props
  useEffect(() => {
    if (conversationId && conversationId !== currentConversationId) {
      setConversationId(conversationId);
    }
  }, [conversationId, currentConversationId, setConversationId]);

  // Notify parent of call state changes
  useEffect(() => {
    onCallStateChange?.(callState);
  }, [callState, onCallStateChange]);



  // Send message using Redux
  const handleSendMessage = useCallback(async (message: string) => {
    if (isProcessing || !message.trim()) return;
    
    const trimmedMessage = message.trim();
    
    // Clear timeout to prevent duplicate sends
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    stopListening();
    resetTranscript();
    resetFinalTranscript();
    clearTranscript();
    clearError();

    try {
      // Send message through Redux
      const result = await sendMessage(trimmedMessage, userId);
      
      // Start TTS with the processed response
      if (result.assistantMessage) {
        setCallState('speaking');
        
        await speak(result.assistantMessage, {
          onEnd: () => {
            setCallState('listening');
            startListening();
          },
          onError: (error) => {
            console.error('TTS Error:', error);
            setError('Lỗi chuyển đổi giọng nói');
            setCallState('listening');
            startListening();
          }
        });
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi xảy ra khi gửi tin nhắn';
      setError(errorMessage);
      setCallState('listening');
      startListening();
    }
  }, [isProcessing, stopListening, resetTranscript, resetFinalTranscript, clearTranscript, clearError, sendMessage, userId, setCallState, speak, startListening, setError]);
            
  // Handle voice recognition results - use transcript for display, finalTranscript for sending
  useEffect(() => {
    if (!transcript || !isCallActive) return;

    // Update display transcript in Redux
    const trimmedTranscript = transcript.trim();
    if (trimmedTranscript && trimmedTranscript !== currentTranscript) {
      updateTranscript(trimmedTranscript);
    }
  }, [transcript, isCallActive, currentTranscript, updateTranscript]);

  // Handle final transcript for sending messages
  useEffect(() => {
    if (!finalTranscript || !isCallActive || isProcessing || callState !== 'listening') return;

    const trimmedFinalTranscript = finalTranscript.trim();
    if (!trimmedFinalTranscript || trimmedFinalTranscript.length < 3) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for 5 seconds of silence after final transcript
    timeoutRef.current = setTimeout(() => {
      // Double check conditions before sending
      if (trimmedFinalTranscript && !isProcessing && callState === 'listening' && isCallActive) {
        console.log('Sending message after 5s silence:', trimmedFinalTranscript);
        handleSendMessage(trimmedFinalTranscript);
      }
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [finalTranscript, isCallActive, isProcessing, callState, handleSendMessage]);

  // Handle interruption when user starts speaking during AI response
  useEffect(() => {
    if (callState === 'speaking' && finalTranscript && finalTranscript.trim().length > 2) {
      console.log('User interruption detected:', finalTranscript);
      // Stop current TTS immediately
      stop();
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Reset transcripts and start listening for new question
      resetTranscript();
      resetFinalTranscript();
      clearTranscript();
      setCallState('listening');
      // Don't restart listening immediately, let the user finish speaking
      setTimeout(() => {
        startListening();
      }, 500);
    }
  }, [finalTranscript, callState, resetTranscript, resetFinalTranscript, clearTranscript, setCallState, startListening]);

  // Start call
  const startCall = useCallback(async () => {
    if (!isVoiceSupported || !isTTSSupported) {
      setError('Trình duyệt không hỗ trợ tính năng giọng nói');
      return;
    }

    try {
      reduxStartCall();
      clearError();
      
      // Start with a greeting
      const greeting = 'Xin chào! Tôi có thể giúp gì cho bạn?';
      setCallState('speaking');
      
      await speak(greeting, {
        onEnd: () => {
          setCallState('listening');
          startListening();
        },
        onError: (error) => {
          console.error('Greeting TTS Error:', error);
          setError('Lỗi chuyển đổi giọng nói');
          setCallState('listening');
          startListening();
        }
      });
    } catch (error) {
      console.error('Error starting call:', error);
      setError('Không thể bắt đầu cuộc gọi');
      setCallState('idle');
    }
  }, [isVoiceSupported, isTTSSupported, reduxStartCall, clearError, setCallState, speak, startListening, setError]);

  // End call
  const endCall = useCallback(() => {
    reduxEndCall();
    stopListening();
    stopSpeaking();
    resetTranscript();
    clearTranscript();
    clearError();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [reduxEndCall, stopListening, stopSpeaking, resetTranscript, clearTranscript, clearError]);

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

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-xl', className)}>
      {/* Call Status */}
      <div className="text-center mb-8">
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
        {currentTranscript && (
          <p className="text-sm text-gray-500 mt-1 italic">
            &ldquo;{currentTranscript}&rdquo;
          </p>
        )}
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Sound Wave Visualization */}
      {isCallActive && (
        <div className="mb-8">
          <SoundWave 
            type={getSoundWaveType()}
            isActive={callState !== 'idle'}
            amplitude={isListening ? 0.8 : 0.5}
          />
        </div>
      )}

      {/* Call Controls */}
      <div className="flex items-center gap-6">
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
                'bg-purple-100 text-purple-600': isSpeaking,
                'bg-gray-100 text-gray-400': !isSpeaking,
              }
            )}>
              <FaVolumeUp className="w-5 h-5" />
            </div>

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
      <div className="mt-6 text-center text-sm text-gray-600">
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