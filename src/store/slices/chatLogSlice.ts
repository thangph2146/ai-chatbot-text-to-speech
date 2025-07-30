import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error' | 'info';
  message: string;
  userId?: string;
  conversationId?: string | null;
  messageId?: string;
  responseTime?: number;
  statusCode?: number;
  errorDetails?: string;
  metadata?: any;
}

interface ChatLogState {
  logs: LogEntry[];
  isLogVisible: boolean;
  totalRequests: number;
  totalErrors: number;
  averageResponseTime: number;
}

const initialState: ChatLogState = {
  logs: [],
  isLogVisible: false,
  totalRequests: 0,
  totalErrors: 0,
  averageResponseTime: 0,
};

const chatLogSlice = createSlice({
  name: 'chatLog',
  initialState,
  reducers: {
    addLog: (state, action: PayloadAction<LogEntry>) => {
      state.logs.push(action.payload);
      if (action.payload.type === 'request') {
        state.totalRequests++;
      }
      if (action.payload.type === 'error') {
        state.totalErrors++;
      }
      if (action.payload.type === 'response' && action.payload.responseTime) {
        const totalResponseTime = state.averageResponseTime * (state.totalRequests - state.totalErrors -1) + action.payload.responseTime;
        state.averageResponseTime = totalResponseTime / (state.totalRequests - state.totalErrors);
      }
    },
    removeLogById: (state, action: PayloadAction<string>) => {
        state.logs = state.logs.filter(log => log.id !== action.payload);
    },
    clearLogs: (state) => {
      state.logs = [];
      state.totalRequests = 0;
      state.totalErrors = 0;
      state.averageResponseTime = 0;
    },
    toggleLogVisibility: (state) => {
      state.isLogVisible = !state.isLogVisible;
    },
  },
});

export const { addLog, clearLogs, toggleLogVisibility, removeLogById } = chatLogSlice.actions;
export default chatLogSlice.reducer;