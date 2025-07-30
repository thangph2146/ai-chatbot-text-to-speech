'use client';

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
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
}

interface CallSliceState {
  isCallActive: boolean;
  callState: CallState;
  currentConversationId: string | null;
  messages: CallMessage[];
  currentTranscript: string;
  isProcessing: boolean;
  error: string | null;
  lastMessageId: string | null;
}

const initialState: CallSliceState = {
  isCallActive: false,
  callState: 'idle',
  currentConversationId: null,
  messages: [],
  currentTranscript: '',
  isProcessing: false,
  error: null,
  lastMessageId: null,
};

// Async thunk để gửi tin nhắn qua Dify API
export const sendCallMessage = createAsyncThunk(
  'call/sendMessage',
  async (
    { message, userId, conversationId }: { 
      message: string; 
      userId: string; 
      conversationId?: string | null; 
    },
    { rejectWithValue }
  ) => {
    try {
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
      
      // Only add conversation_id if it exists and is valid UUID format
      if (conversationId && conversationId.trim() !== '' && conversationId !== 'demo-conversation') {
        // Basic UUID validation (36 characters with hyphens)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(conversationId)) {
          requestData.conversation_id = conversationId;
        }
      }

      let fullResponse = '';
      let newConversationId = conversationId;
      let newMessageId: string | null = null;

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

      return {
        userMessage: message,
        assistantMessage: processedText,
        conversationId: newConversationId,
        messageId: newMessageId,
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
    },

    endCall: (state) => {
      state.isCallActive = false;
      state.callState = 'ended';
      state.currentTranscript = '';
      state.isProcessing = false;
      state.error = null;
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
      state.messages.push(action.payload);
    },

    clearMessages: (state) => {
      state.messages = [];
    },

    // Processing state
    setProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
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
          id: `user_${Date.now()}`,
          role: 'user',
          content: action.meta.arg.message,
          timestamp: Date.now(),
          conversationId: state.currentConversationId || undefined,
        };
        state.messages.push(userMessage);
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
          id: `assistant_${Date.now()}`,
          role: 'assistant',
          content: action.payload.assistantMessage,
          timestamp: Date.now(),
          conversationId: state.currentConversationId || undefined,
          messageId: action.payload.messageId || undefined,
        };
        state.messages.push(assistantMessage);
        state.lastMessageId = assistantMessage.id;
      })
      .addCase(sendCallMessage.rejected, (state, action) => {
        state.isProcessing = false;
        state.callState = 'idle';
        state.error = action.payload as string || 'Failed to send message';
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
} = callSlice.actions;

export default callSlice.reducer;