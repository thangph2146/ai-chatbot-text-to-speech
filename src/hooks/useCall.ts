'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from './useChat';

export type CallState = 'idle' | 'listening' | 'processing' | 'speaking' | 'ended';

export const useCall = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [lastTranscript, setLastTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const interruptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleListen = useCallback((listening: boolean) => {
    setIsListening(listening);
    if (!isCallActive) return;
    
    if (listening) {
      // Nếu đang speaking, dừng audio trước khi bắt đầu listening
      if (callState === 'speaking') {
        // stopAudio(); // Removed this line
      }
      setCallState('listening');
    } else {
      setCallState('idle');
    }
  }, [isCallActive, callState]);

  const { messages, input, loading, speaking, setInput, sendMessage, stopAudio } = useChat(handleListen);

  const resetTranscript = useCallback(() => {
    setLastTranscript('');
  }, []);

  const startCall = useCallback(() => {
    setIsCallActive(true);
    setCallState('idle');
    setLastTranscript('');
    // Gửi tin nhắn chào mừng
    sendMessage("Xin chào, tôi có thể giúp gì cho bạn?", true);
  }, [sendMessage]);

  const endCall = useCallback(() => {
    setIsCallActive(false);
    setCallState('ended');
    setLastTranscript('');
    setIsListening(false);
    stopAudio();
    
    // Clear all pending timeouts
    if (interruptionTimeoutRef.current) {
      clearTimeout(interruptionTimeoutRef.current);
      interruptionTimeoutRef.current = null;
    }
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
      transcriptTimeoutRef.current = null;
    }
  }, [stopAudio]);

  const handleTranscriptChange = useCallback((transcript: string) => {
    if (!isCallActive || !transcript) {
      return;
    }

    const trimmedTranscript = transcript.trim();
    if (trimmedTranscript.length === 0 || trimmedTranscript === lastTranscript) {
      return;
    }

    // Clear any existing timeouts
    if (transcriptTimeoutRef.current) {
      clearTimeout(transcriptTimeoutRef.current);
    }
    if (interruptionTimeoutRef.current) {
      clearTimeout(interruptionTimeoutRef.current);
    }

    // Set a delay to ensure complete transcript and avoid partial processing
    transcriptTimeoutRef.current = setTimeout(() => {
      // Double check if still active and transcript hasn't changed
      if (isCallActive && trimmedTranscript !== lastTranscript) {
        setLastTranscript(trimmedTranscript);
        setCallState('processing');
        setIsListening(false); // Stop listening when processing
        sendMessage(trimmedTranscript, true);
      }
    }, 800); // Increased delay for better transcript completion
  }, [isCallActive, lastTranscript, sendMessage]);

  // Update call state based on chat states
  const updateCallState = useCallback(() => {
    if (!isCallActive) {
      setCallState('ended');
      setIsListening(false);
      return;
    }

    if (loading) {
      setCallState('processing');
      setIsListening(false);
    } else if (speaking) {
      setCallState('speaking');
      setIsListening(false);
    } else {
      // Khi không loading và không speaking, tự động chuyển về listening nếu đang trong call
      if (callState === 'speaking' || callState === 'processing') {
        setCallState('listening');
        setIsListening(true);
      }
    }
  }, [isCallActive, loading, speaking, callState]);

  // Effect to update call state when chat states change
  useEffect(() => {
    updateCallState();
  }, [updateCallState]);

  const interruptSpeaking = useCallback(() => {
    if (callState === 'speaking') {
      stopAudio();
      setCallState('idle');
    }
  }, [callState, stopAudio]);

  return {
    // Call states
    isCallActive,
    callState,
    isListening,
    
    // Chat states (passed through)
    messages,
    input,
    loading,
    speaking,
    
    // Actions
    startCall,
    endCall,
    handleListen,
    handleTranscriptChange,
    interruptSpeaking,
    setInput,
    
    // Utilities
    resetTranscript,
    lastTranscript
  };
};