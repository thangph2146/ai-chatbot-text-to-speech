'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  startCall,
  endCall,
  setCallState,
  updateTranscript,
  clearTranscript,
  setConversationId,
  setError,
  clearError,
  clearMessages,
  setProcessing,
  sendCallMessage,
  type CallState,
} from '@/store/slices/callSlice';

export const useCallRedux = () => {
  const dispatch = useAppDispatch();
  const {
    isCallActive,
    callState,
    currentConversationId,
    messages,
    currentTranscript,
    isProcessing,
    error,
    lastMessageId,
  } = useAppSelector((state) => state.call);

  // Call control actions
  const handleStartCall = useCallback(() => {
    dispatch(startCall());
  }, [dispatch]);

  const handleEndCall = useCallback(() => {
    dispatch(endCall());
  }, [dispatch]);

  const handleSetCallState = useCallback((state: CallState) => {
    dispatch(setCallState(state));
  }, [dispatch]);

  // Transcript management
  const handleUpdateTranscript = useCallback((transcript: string) => {
    dispatch(updateTranscript(transcript));
  }, [dispatch]);

  const handleClearTranscript = useCallback(() => {
    dispatch(clearTranscript());
  }, [dispatch]);

  // Conversation management
  const handleSetConversationId = useCallback((id: string | null) => {
    dispatch(setConversationId(id));
  }, [dispatch]);

  // Error handling
  const handleSetError = useCallback((error: string | null) => {
    dispatch(setError(error));
  }, [dispatch]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Message management
  const handleClearMessages = useCallback(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  // Processing state
  const handleSetProcessing = useCallback((processing: boolean) => {
    dispatch(setProcessing(processing));
  }, [dispatch]);

  // Send message with Redux
  const handleSendMessage = useCallback(async (
    message: string,
    userId: string = 'user-001'
  ) => {
    try {
      const result = await dispatch(sendCallMessage({
        message,
        userId,
        conversationId: currentConversationId,
      })).unwrap();
      
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [dispatch, currentConversationId]);

  return {
    // State
    isCallActive,
    callState,
    currentConversationId,
    messages,
    currentTranscript,
    isProcessing,
    error,
    lastMessageId,
    
    // Actions
    startCall: handleStartCall,
    endCall: handleEndCall,
    setCallState: handleSetCallState,
    updateTranscript: handleUpdateTranscript,
    clearTranscript: handleClearTranscript,
    setConversationId: handleSetConversationId,
    setError: handleSetError,
    clearError: handleClearError,
    clearMessages: handleClearMessages,
    setProcessing: handleSetProcessing,
    sendMessage: handleSendMessage,
  };
};