'use client';

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { callApiRoute } from '@/app/lib/axios/call-api';
import { processMarkdownText } from '@/modules/call-communicate/utils/markdownProcessor';

export type CallState = 'idle' | 'listening' | 'processing' | 'speaking' | 'ended';

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

interface TTSState {
  isSpeaking: boolean;
  currentAudioUrl: string | null;
  audioQueue: string[];
  volume: number;
  rate: number;
  pitch: number;
  voice: string | null;
}

interface CallSliceState {
  // Call state
  isCallActive: boolean;
  callState: CallState;
  currentConversationId: string | null;
  
  // Messages
  messages: CallMessage[];
  currentTranscript: string;
  
  // Processing state
  isProcessing: boolean;
  error: string | null;
  lastMessageId: string | null;
  
  // TTS state
  tts: TTSState;
  
  // Performance optimizations
  messageCache: Record<string, CallMessage>;
  conversationCache: Record<string, CallMessage[]>;
  
  // UI state
  ui: {
    showTranscript: boolean;
    autoScroll: boolean;
    showTimestamps: boolean;
    compactMode: boolean;
  };
}

const initialState: CallSliceState = {
  // Call state
  isCallActive: false,
  callState: 'idle',
  currentConversationId: null,
  
  // Messages
  messages: [],
  currentTranscript: '',
  
  // Processing state
  isProcessing: false,
  error: null,
  lastMessageId: null,
  
  // TTS state
  tts: {
    isSpeaking: false,
    currentAudioUrl: null,
    audioQueue: [],
    volume: 1.0,
    rate: 1.0,
    pitch: 1.0,
    voice: null,
  },
  
  // Performance optimizations
  messageCache: {},
  conversationCache: {},
  
  // UI state
  ui: {
    showTranscript: true,
    autoScroll: true,
    showTimestamps: true,
    compactMode: false,
  },
};

// Optimized selectors using createSelector for memoization
export const selectCallState = (state: { call: CallSliceState }) => state.call.callState;
export const selectIsCallActive = (state: { call: CallSliceState }) => state.call.isCallActive;
export const selectIsProcessing = (state: { call: CallSliceState }) => state.call.isProcessing;
export const selectError = (state: { call: CallSliceState }) => state.call.error;
export const selectCurrentTranscript = (state: { call: CallSliceState }) => state.call.currentTranscript;
export const selectCurrentConversationId = (state: { call: CallSliceState }) => state.call.currentConversationId;
export const selectTTSState = (state: { call: CallSliceState }) => state.call.tts;
export const selectUIState = (state: { call: CallSliceState }) => state.call.ui;

// Memoized selectors for better performance
export const selectMessages = createSelector(
  [(state: { call: CallSliceState }) => state.call.messages],
  (messages) => messages
);

export const selectLastMessage = createSelector(
  [selectMessages],
  (messages) => messages[messages.length - 1] || null
);

export const selectUserMessages = createSelector(
  [selectMessages],
  (messages) => messages.filter(msg => msg.role === 'user')
);

export const selectAssistantMessages = createSelector(
  [selectMessages],
  (messages) => messages.filter(msg => msg.role === 'assistant')
);

export const selectIsSpeaking = createSelector(
  [selectTTSState],
  (tts) => tts.isSpeaking
);

export const selectAudioQueue = createSelector(
  [selectTTSState],
  (tts) => tts.audioQueue
);

// Async thunk với tối ưu performance
export const sendCallMessage = createAsyncThunk(
  'call/sendMessage',
  async (
    { 
      message, 
      userId, 
      conversationId,
      enableTTS = true 
    }: { 
      message: string; 
      userId: string; 
      conversationId?: string | null;
      enableTTS?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const startTime = performance.now();
      
      // Prepare request data
      const requestData: {
        inputs: Record<string, unknown>;
        query: string;
        response_mode: string;
        user: string;
        conversation_id?: string;
      } = {
        inputs: {},
        query: message,
        response_mode: 'streaming',
        user: userId
      };
      
      // Validate conversation ID
      if (conversationId && conversationId.trim() !== '' && conversationId !== 'demo-conversation') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(conversationId)) {
          requestData.conversation_id = conversationId;
        }
      }

      let fullResponse = '';
      let newConversationId = conversationId;
      let newMessageId: string | null = null;
      let audioUrl: string | null = null;

      await callApiRoute.postChatStream(
        requestData,
        // onMessage callback - accumulate response
        (chunk: string) => {
          fullResponse += chunk;
        },
        // onComplete callback
        async (result: { fullMessage: string; conversationId: string | null; messageId: string | null }) => {
          fullResponse = result.fullMessage;
          newConversationId = result.conversationId || conversationId;
          newMessageId = result.messageId;
        },
        // onError callback
        (error: Error) => {
          throw error;
        }
      );

      // Process markdown text
      const processedText = processMarkdownText(fullResponse);

      // Generate TTS audio if enabled
      if (enableTTS && processedText.trim()) {
        try {
          console.log('Generating TTS for text:', processedText.substring(0, 100) + '...');
          
          const ttsResponse = await fetch('/api/tts', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg,audio/*,*/*'
            },
            body: JSON.stringify({ text: processedText }),
          });
          
          if (ttsResponse.ok) {
            const audioBlob = await ttsResponse.blob();
            
            // Validate audio blob
            if (audioBlob && audioBlob.size > 0) {
              audioUrl = URL.createObjectURL(audioBlob);
              console.log('TTS generated successfully:', audioBlob.size, 'bytes');
            } else {
              console.warn('TTS returned empty audio blob');
            }
          } else {
            const errorData = await ttsResponse.json().catch(() => ({}));
            console.warn('TTS API error:', ttsResponse.status, errorData);
          }
        } catch (ttsError) {
          console.warn('TTS generation failed:', ttsError);
          // Don't throw error, continue without TTS
        }
      }

      const processingTime = performance.now() - startTime;

      return {
        userMessage: message,
        assistantMessage: processedText,
        conversationId: newConversationId,
        messageId: newMessageId,
        audioUrl,
        processingTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return rejectWithValue(errorMessage);
    }
  }
);

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    // Call control actions
    startCall: (state) => {
      state.isCallActive = true;
      state.callState = 'idle';
      state.error = null;
      state.currentTranscript = '';
      state.messages = [];
      state.lastMessageId = null;
      // Clear caches to prevent stale data
      state.messageCache = {};
      state.conversationCache = {};
    },

    endCall: (state) => {
      state.isCallActive = false;
      state.callState = 'ended';
      state.currentTranscript = '';
      state.isProcessing = false;
      state.error = null;
      // Cleanup TTS
      if (state.tts.currentAudioUrl) {
        URL.revokeObjectURL(state.tts.currentAudioUrl);
      }
      state.tts.currentAudioUrl = null;
      state.tts.audioQueue = [];
      state.tts.isSpeaking = false;
    },

    setCallState: (state, action: PayloadAction<CallState>) => {
      state.callState = action.payload;
    },

    // Transcript management
    updateTranscript: (state, action: PayloadAction<string>) => {
      state.currentTranscript = action.payload;
    },

    clearTranscript: (state) => {
      state.currentTranscript = '';
    },

    // Conversation management
    setConversationId: (state, action: PayloadAction<string | null>) => {
      state.currentConversationId = action.payload;
    },

    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Message management
    addMessage: (state, action: PayloadAction<CallMessage>) => {
      const message = action.payload;
      state.messages.push(message);
      // Cache the message
      state.messageCache[message.id] = message;
    },

    clearMessages: (state) => {
      state.messages = [];
      state.messageCache = {};
      state.conversationCache = {};
    },

    // Processing state
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },

    // TTS management
    setTTSState: (state, action: PayloadAction<Partial<TTSState>>) => {
      state.tts = { ...state.tts, ...action.payload };
    },

    addToAudioQueue: (state, action: PayloadAction<string>) => {
      state.tts.audioQueue.push(action.payload);
    },

    removeFromAudioQueue: (state, action: PayloadAction<string>) => {
      state.tts.audioQueue = state.tts.audioQueue.filter(url => url !== action.payload);
    },

    setSpeaking: (state, action: PayloadAction<boolean>) => {
      state.tts.isSpeaking = action.payload;
    },

    setCurrentAudioUrl: (state, action: PayloadAction<string | null>) => {
      // Cleanup previous audio URL
      if (state.tts.currentAudioUrl) {
        URL.revokeObjectURL(state.tts.currentAudioUrl);
      }
      state.tts.currentAudioUrl = action.payload;
    },

    // UI state management
    setUIState: (state, action: PayloadAction<Partial<CallSliceState['ui']>>) => {
      state.ui = { ...state.ui, ...action.payload };
    },

    // Cleanup actions
    cleanupAudio: (state) => {
      if (state.tts.currentAudioUrl) {
        URL.revokeObjectURL(state.tts.currentAudioUrl);
      }
      state.tts.currentAudioUrl = null;
      state.tts.audioQueue = [];
      state.tts.isSpeaking = false;
    },

    cleanupMessages: (state) => {
      // Cleanup audio URLs from messages
      state.messages.forEach(message => {
        if (message.audioUrl) {
          URL.revokeObjectURL(message.audioUrl);
        }
      });
      state.messages = [];
      state.messageCache = {};
      state.conversationCache = {};
    },

    // Performance optimizations
    updateMessageStatus: (state, action: PayloadAction<{ id: string; status: CallMessage['status'] }>) => {
      const message = state.messages.find(msg => msg.id === action.payload.id);
      if (message) {
        message.status = action.payload.status;
        // Update cache
        state.messageCache[message.id] = message;
      }
    },

    setMessagePlaying: (state, action: PayloadAction<{ id: string; isPlaying: boolean }>) => {
      const message = state.messages.find(msg => msg.id === action.payload.id);
      if (message) {
        message.isPlaying = action.payload.isPlaying;
        // Update cache
        state.messageCache[message.id] = message;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendCallMessage.pending, (state, action) => {
        state.isProcessing = true;
        state.callState = 'processing';
        state.error = null;
        
        // Add user message immediately
        const userMessage: CallMessage = {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'user',
          content: action.meta.arg.message,
          timestamp: Date.now(),
          conversationId: state.currentConversationId || undefined,
          status: 'pending',
        };
        state.messages.push(userMessage);
        // Cache the message
        state.messageCache[userMessage.id] = userMessage;
      })
      .addCase(sendCallMessage.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.callState = 'speaking';
        
        // Update conversation ID if received
        if (action.payload.conversationId && action.payload.conversationId !== state.currentConversationId) {
          state.currentConversationId = action.payload.conversationId;
        }
        
        // Add assistant message
        const assistantMessage: CallMessage = {
          id: `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: action.payload.assistantMessage,
          timestamp: Date.now(),
          conversationId: state.currentConversationId || undefined,
          messageId: action.payload.messageId || undefined,
          status: 'sent',
          audioUrl: action.payload.audioUrl || undefined,
        };
        state.messages.push(assistantMessage);
        state.lastMessageId = assistantMessage.id;
        
        // Cache the message
        state.messageCache[assistantMessage.id] = assistantMessage;
        
        // Add to audio queue if TTS is available
        if (action.payload.audioUrl) {
          state.tts.audioQueue.push(action.payload.audioUrl);
        }
        
        // Update user message status
        const userMessage = state.messages.find(msg => 
          msg.role === 'user' && msg.status === 'pending'
        );
        if (userMessage) {
          userMessage.status = 'sent';
          state.messageCache[userMessage.id] = userMessage;
        }
      })
      .addCase(sendCallMessage.rejected, (state, action) => {
        state.isProcessing = false;
        state.callState = 'idle';
        state.error = action.payload as string || 'Failed to send message';
        
        // Update user message status to failed
        const userMessage = state.messages.find(msg => 
          msg.role === 'user' && msg.status === 'pending'
        );
        if (userMessage) {
          userMessage.status = 'failed';
          state.messageCache[userMessage.id] = userMessage;
        }
      });
  },
});

export const {
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
} = callSlice.actions;

export default callSlice.reducer;