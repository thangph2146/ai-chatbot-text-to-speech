'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectCallState,
  selectIsCallActive,
  selectIsProcessing,
  selectError,
  selectCurrentTranscript,
  selectCurrentConversationId,
  selectTTSState,
  selectUIState,
  selectMessages,
  selectLastMessage,
  selectUserMessages,
  selectAssistantMessages,
  selectIsSpeaking,
  selectAudioQueue,
  sendCallMessage,
  startCall,
  endCall,
  setCallState,
  updateTranscript,
  clearTranscript,
  setConversationId,
  setError,
  clearError,
  addMessage,
  clearMessages,
  setProcessing,
  setTTSState,
  addToAudioQueue,
  removeFromAudioQueue,
  setSpeaking,
  setCurrentAudioUrl,
  setUIState,
  cleanupAudio,
  cleanupMessages,
  updateMessageStatus,
  setMessagePlaying,
} from '@/store/slices/callSlice';

export const useCallRedux = () => {
  const dispatch = useAppDispatch();
  
  // Selectors với memoization
  const callState = useAppSelector(selectCallState);
  const isCallActive = useAppSelector(selectIsCallActive);
  const isProcessing = useAppSelector(selectIsProcessing);
  const error = useAppSelector(selectError);
  const currentTranscript = useAppSelector(selectCurrentTranscript);
  const ttsState = useAppSelector(selectTTSState);
  const uiState = useAppSelector(selectUIState);
  const messages = useAppSelector(selectMessages);
  const lastMessage = useAppSelector(selectLastMessage);
  const userMessages = useAppSelector(selectUserMessages);
  const assistantMessages = useAppSelector(selectAssistantMessages);
  const isSpeaking = useAppSelector(selectIsSpeaking);
  const audioQueue = useAppSelector(selectAudioQueue);
  const currentConversationId = useAppSelector(selectCurrentConversationId);

  // Refs để tránh re-render không cần thiết
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);

  // Callback functions với useCallback để tối ưu performance
  const handleStartCall = useCallback(() => {
    dispatch(startCall());
  }, [dispatch]);

  const handleEndCall = useCallback(() => {
    dispatch(endCall());
  }, [dispatch]);

  const handleSetCallState = useCallback((state: 'idle' | 'listening' | 'processing' | 'speaking' | 'ended') => {
    dispatch(setCallState(state));
  }, [dispatch]);

  const handleUpdateTranscript = useCallback((transcript: string) => {
    dispatch(updateTranscript(transcript));
  }, [dispatch]);

  const handleClearTranscript = useCallback(() => {
    dispatch(clearTranscript());
  }, [dispatch]);

  const handleSetConversationId = useCallback((conversationId: string | null) => {
    dispatch(setConversationId(conversationId));
  }, [dispatch]);

  const handleSetError = useCallback((error: string | null) => {
    dispatch(setError(error));
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleAddMessage = useCallback((message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    conversationId?: string;
    messageId?: string;
    status?: 'pending' | 'sent' | 'failed';
    audioUrl?: string;
    isPlaying?: boolean;
  }) => {
    dispatch(addMessage(message));
  }, [dispatch]);

  const handleClearMessages = useCallback(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  const handleSetProcessing = useCallback((processing: boolean) => {
    dispatch(setProcessing(processing));
  }, [dispatch]);

  // TTS Management
  const handleSetTTSState = useCallback((ttsState: Partial<{
    isSpeaking: boolean;
    currentAudioUrl: string | null;
    audioQueue: string[];
    volume: number;
    rate: number;
    pitch: number;
    voice: string | null;
  }>) => {
    dispatch(setTTSState(ttsState));
  }, [dispatch]);

  const handleAddToAudioQueue = useCallback((audioUrl: string) => {
    dispatch(addToAudioQueue(audioUrl));
  }, [dispatch]);

  const handleRemoveFromAudioQueue = useCallback((audioUrl: string) => {
    dispatch(removeFromAudioQueue(audioUrl));
  }, [dispatch]);

  const handleSetSpeaking = useCallback((speaking: boolean) => {
    dispatch(setSpeaking(speaking));
  }, [dispatch]);

  const handleSetCurrentAudioUrl = useCallback((audioUrl: string | null) => {
    dispatch(setCurrentAudioUrl(audioUrl));
  }, [dispatch]);

  // UI Management
  const handleSetUIState = useCallback((uiState: Partial<{
    showTranscript: boolean;
    autoScroll: boolean;
    showTimestamps: boolean;
    compactMode: boolean;
  }>) => {
    dispatch(setUIState(uiState));
  }, [dispatch]);

  // Cleanup functions
  const handleCleanupAudio = useCallback(() => {
    dispatch(cleanupAudio());
  }, [dispatch]);

  const handleCleanupMessages = useCallback(() => {
    dispatch(cleanupMessages());
  }, [dispatch]);

  const handleUpdateMessageStatus = useCallback((id: string, status: 'pending' | 'sent' | 'failed') => {
    dispatch(updateMessageStatus({ id, status }));
  }, [dispatch]);

  const handleSetMessagePlaying = useCallback((id: string, isPlaying: boolean) => {
    dispatch(setMessagePlaying({ id, isPlaying }));
  }, [dispatch]);

  // Send message với TTS integration
  const handleSendMessage = useCallback(async ({
    message,
    userId,
    conversationId,
    enableTTS = true
  }: {
    message: string;
    userId: string;
    conversationId?: string | null;
    enableTTS?: boolean;
  }) => {
    try {
      const result = await dispatch(sendCallMessage({
        message,
        userId,
        conversationId,
        enableTTS
      })).unwrap();

      return result;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }, [dispatch]);

  // Audio playback management
  const handlePlayAudio = useCallback(async (audioUrl: string, onEnd?: () => void) => {
    try {
      // Validate audio URL
      if (!audioUrl || typeof audioUrl !== 'string') {
        console.warn('Invalid audio URL:', audioUrl);
        return;
      }

      // Check browser audio support
      if (!window.Audio || typeof window.Audio !== 'function') {
        console.warn('Browser does not support Audio API');
        return;
      }

      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Create new audio element
      const audio = new Audio();
      audioRef.current = audio;

      // Set audio properties
      audio.preload = 'auto';
      audio.volume = 1.0;
      audio.playbackRate = 1.0;

      // Add event listeners
      const handleEnded = () => {
        console.log('Audio playback ended');
        handleSetSpeaking(false);
        handleSetCurrentAudioUrl(null);
        
        // Call onEnd callback if provided
        if (onEnd) {
          onEnd();
        }
        
        // Play next audio in queue if available
        if (audioQueueRef.current.length > 0) {
          const nextAudio = audioQueueRef.current.shift();
          if (nextAudio) {
            handlePlayAudio(nextAudio, onEnd);
          }
        }
      };

      const handleError = (error: Event) => {
        console.warn('Audio playback failed:', error);
        handleSetSpeaking(false);
        handleSetCurrentAudioUrl(null);
        
        // Call onEnd callback even on error
        if (onEnd) {
          onEnd();
        }
        
        // Try to play next audio in queue
        if (audioQueueRef.current.length > 0) {
          const nextAudio = audioQueueRef.current.shift();
          if (nextAudio) {
            setTimeout(() => handlePlayAudio(nextAudio, onEnd), 100);
          }
        }
      };

      const handleLoadStart = () => {
        console.log('Audio loading started');
      };

      const handleCanPlay = () => {
        console.log('Audio can play');
      };

      const handleLoadError = () => {
        console.warn('Audio load failed');
        handleSetSpeaking(false);
        handleSetCurrentAudioUrl(null);
        
        // Call onEnd callback on load error
        if (onEnd) {
          onEnd();
        }
      };

      // Add all event listeners
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleLoadError);

      // Set source and start loading
      audio.src = audioUrl;
      audio.load();

      // Wait for audio to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Audio loading timeout'));
        }, 10000); // 10 second timeout

        const handleCanPlayThrough = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplaythrough', handleCanPlayThrough);
          audio.removeEventListener('error', handleLoadError);
          resolve();
        };

        const handleLoadErrorWithReject = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplaythrough', handleCanPlayThrough);
          audio.removeEventListener('error', handleLoadErrorWithReject);
          reject(new Error('Audio load failed'));
        };

        audio.addEventListener('canplaythrough', handleCanPlayThrough);
        audio.addEventListener('error', handleLoadErrorWithReject);
      });

      // Start playing
      handleSetSpeaking(true);
      handleSetCurrentAudioUrl(audioUrl);
      
      const playResult = await audio.play();
      console.log('Audio play result:', playResult);

    } catch (error) {
      console.warn('Failed to play audio:', error);
      handleSetSpeaking(false);
      handleSetCurrentAudioUrl(null);
      
      // Call onEnd callback on error
      if (onEnd) {
        onEnd();
      }
      
      // Try to play next audio in queue
      if (audioQueueRef.current.length > 0) {
        const nextAudio = audioQueueRef.current.shift();
        if (nextAudio) {
          setTimeout(() => handlePlayAudio(nextAudio, onEnd), 100);
        }
      }
    }
  }, [handleSetSpeaking, handleSetCurrentAudioUrl]);

  const handleStopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    handleSetSpeaking(false);
    handleSetCurrentAudioUrl(null);
  }, [handleSetSpeaking, handleSetCurrentAudioUrl]);

  const handlePlayNextAudio = useCallback(() => {
    if (audioQueue.length > 0) {
      const nextAudio = audioQueue[0];
      handleRemoveFromAudioQueue(nextAudio);
      handlePlayAudio(nextAudio);
    }
  }, [audioQueue, handleRemoveFromAudioQueue, handlePlayAudio]);

  // Auto-play audio queue
  useEffect(() => {
    audioQueueRef.current = audioQueue;
    
    if (audioQueue.length > 0 && !isSpeaking) {
      handlePlayNextAudio();
    }
  }, [audioQueue, isSpeaking, handlePlayNextAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    // State
    callState,
    isCallActive,
    isProcessing,
    error,
    currentTranscript,
    currentConversationId,
    ttsState,
    uiState,
    messages,
    lastMessage,
    userMessages,
    assistantMessages,
    isSpeaking,
    audioQueue,

    // Actions
    handleStartCall,
    handleEndCall,
    handleSetCallState,
    handleUpdateTranscript,
    handleClearTranscript,
    handleSetConversationId,
    handleSetError,
    handleClearError,
    handleAddMessage,
    handleClearMessages,
    handleSetProcessing,
    handleSendMessage,

    // TTS Actions
    handleSetTTSState,
    handleAddToAudioQueue,
    handleRemoveFromAudioQueue,
    handleSetSpeaking,
    handleSetCurrentAudioUrl,
    handlePlayAudio,
    handleStopAudio,
    handlePlayNextAudio,

    // UI Actions
    handleSetUIState,

    // Cleanup Actions
    handleCleanupAudio,
    handleCleanupMessages,
    handleUpdateMessageStatus,
    handleSetMessagePlaying,
  };
};