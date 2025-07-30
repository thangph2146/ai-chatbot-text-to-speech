import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { callApiRoute } from "@/app/lib/axios/call-api";
import { addLog } from "./chatLogSlice";

export interface Message {
  id: string;
  role: "user" | "model";
  parts: { text: string }[];
  timestamp: number;
  conversationId?: string;
  messageId?: string;
}

interface MessageState {
  messages: Message[];
  input: string;
  isLoading: boolean;
  error: string | null;
  currentConversationId: string | null;
}

const initialState: MessageState = {
  messages: [],
  input: "",
  isLoading: false,
  error: null,
  currentConversationId: null,
};

// Async thunk để gửi tin nhắn với logging
export const sendMessageWithLogging = createAsyncThunk(
  "message/sendMessageWithLogging",
  async (
    { messageText, userId }: { messageText: string; userId?: string },
    { dispatch, getState }
  ) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Log request
    dispatch(
      addLog({
        id: requestId,
        timestamp: startTime,
        type: "request",
        message: messageText,
        userId,
        conversationId: (getState() as any).message.currentConversationId,
        metadata: {
          requestId,
          userAgent:
            typeof window !== "undefined"
              ? window.navigator.userAgent
              : "server",
        },
      })
    );

    try {
      let fullResponse = "";
      let conversationId = "";
      let messageId = "";
      
      await new Promise<void>((resolve, reject) => {
        callApiRoute.postChatStream(
          {
            inputs: {},
            query: messageText,
            response_mode: "streaming",
            conversation_id: (getState() as any).message.currentConversationId || "",
            user: userId || "anonymous"
          },
          // onMessage callback
          (message: string) => {
            fullResponse += message;
          },
          // onComplete callback
          (result: { fullMessage: string; conversationId: string | null; messageId: string | null }) => {
            fullResponse = result.fullMessage;
            conversationId = result.conversationId || "";
            messageId = result.messageId || "";
            
            // Update conversation ID in state if we got a new one
            if (result.conversationId && result.conversationId !== (getState() as any).message.currentConversationId) {
              dispatch({ type: 'message/setCurrentConversationId', payload: result.conversationId });
            }
            
            resolve();
          },
          // onError callback
          (error: any) => {
            reject(error);
          }
        );
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Log successful response
      dispatch(
        addLog({
          id: `res_${requestId}`,
          timestamp: endTime,
          type: "response",
          message: fullResponse,
          userId,
          conversationId: conversationId || (getState() as any).message.currentConversationId,
          messageId: messageId || `msg_${Date.now()}`,
          responseTime,
          statusCode: 200,
          metadata: {
            requestId,
            responseSize: fullResponse.length,
          },
        })
      );

      return {
        response: { answer: fullResponse },
        responseTime,
        conversationId: conversationId || (getState() as any).message.currentConversationId,
        messageId: messageId || `msg_${Date.now()}`,
      };
    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Log error
      dispatch(
        addLog({
          id: `err_${requestId}`,
          timestamp: endTime,
          type: "error",
          message: error.message || "Unknown error occurred",
          userId,
          conversationId: (getState() as any).message.currentConversationId,
          responseTime,
          statusCode: error.status || 500,
          errorDetails: JSON.stringify({
            name: error.name,
            message: error.message,
            stack: error.stack,
          }),
          metadata: {
            requestId,
            errorType: error.constructor.name,
          },
        })
      );

      throw error;
    }
  }
);

const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    setInput: (state, action: PayloadAction<string>) => {
      state.input = action.payload;
    },

    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },

    clearMessages: (state) => {
      state.messages = [];
      state.currentConversationId = null;
    },

    setCurrentConversationId: (state, action: PayloadAction<string | null>) => {
      state.currentConversationId = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(sendMessageWithLogging.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendMessageWithLogging.fulfilled, (state, action) => {
        state.isLoading = false;

        // Thêm tin nhắn bot vào danh sách
        const botMessage: Message = {
          id: action.payload.messageId || `msg_${Date.now()}`,
          role: "model",
          parts: [
            { text: (action.payload.response as { answer: string }).answer },
          ],
          timestamp: Date.now(),
          conversationId: action.payload.conversationId,
          messageId: action.payload.messageId,
        };

        state.messages.push(botMessage);

        // Cập nhật conversation ID
        if (action.payload.conversationId) {
          state.currentConversationId = action.payload.conversationId;
        }

        // Clear input
        state.input = "";
      })
      .addCase(sendMessageWithLogging.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || "Something went wrong";

        // Thêm tin nhắn lỗi vào danh sách
        const errorMessage: Message = {
          id: `error_${Date.now()}`,
          role: "model",
          parts: [
            {
              text: "Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.",
            },
          ],
          timestamp: Date.now(),
        };

        state.messages.push(errorMessage);
      });
  },
});

export const {
  setInput,
  addMessage,
  clearMessages,
  setCurrentConversationId,
  setError,
} = messageSlice.actions;

export default messageSlice.reducer;
