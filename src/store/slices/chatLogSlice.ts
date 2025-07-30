import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChatLogEntry {
  id: string;
  timestamp: number;
  type: "request" | "response" | "error";
  message: string;
  userId?: string;
  conversationId?: string;
  messageId?: string;
  responseTime?: number;
  statusCode?: number;
  errorDetails?: string;
  metadata?: Record<string, any>;
}

interface ChatLogState {
  logs: ChatLogEntry[];
  isLoading: boolean;
  error: string | null;
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
}

const initialState: ChatLogState = {
  logs: [],
  isLoading: false,
  error: null,
  totalRequests: 0,
  totalErrors: 0,
  averageResponseTime: 0,
};

const chatLogSlice = createSlice({
  name: "chatLog",
  initialState,
  reducers: {
    addLog: (state, action: PayloadAction<ChatLogEntry>) => {
      state.logs.unshift(action.payload); // Thêm log mới vào đầu danh sách

      // Giới hạn số lượng log (giữ lại 1000 log gần nhất)
      if (state.logs.length > 1000) {
        state.logs = state.logs.slice(0, 1000);
      }

      // Cập nhật thống kê
      if (action.payload.type === "request") {
        state.totalRequests += 1;
      }

      if (action.payload.type === "error") {
        state.totalErrors += 1;
      }

      // Tính toán thời gian phản hồi trung bình
      if (action.payload.responseTime) {
        const responseLogs = state.logs.filter((log) => log.responseTime);
        const totalResponseTime = responseLogs.reduce(
          (sum, log) => sum + (log.responseTime || 0),
          0
        );
        state.averageResponseTime = totalResponseTime / responseLogs.length;
      }
    },

    clearLogs: (state) => {
      state.logs = [];
      state.totalRequests = 0;
      state.totalErrors = 0;
      state.averageResponseTime = 0;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    removeLogById: (state, action: PayloadAction<string>) => {
      state.logs = state.logs.filter((log) => log.id !== action.payload);
    },

    updateLogById: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<ChatLogEntry> }>
    ) => {
      const { id, updates } = action.payload;
      const logIndex = state.logs.findIndex((log) => log.id === id);
      if (logIndex !== -1) {
        state.logs[logIndex] = { ...state.logs[logIndex], ...updates };
      }
    },
  },
});

export const {
  addLog,
  clearLogs,
  setLoading,
  setError,
  removeLogById,
  updateLogById,
} = chatLogSlice.actions;

export default chatLogSlice.reducer;
