'use client';

import axios from 'axios';
import { API_ENDPOINTS } from './end-point';
import { API_BASE_URL, DIFY_API_BASE_URL, DIFY_API_KEY } from './config';

// ==================== CONFIGURATION ====================
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// ==================== INTERCEPTORS ====================
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        config.headers = { Authorization: `Bearer ${token}` };
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==================== TYPES ====================
export interface ChatRequest {
  inputs?: Record<string, unknown>;
  query: string;
  response_mode: 'streaming' | 'blocking';
  conversation_id?: string;
  user?: string;
}

export interface ChatResponse {
  fullMessage: string;
  conversationId: string | null;
  messageId: string | null;
}

export interface StreamingCallbacks {
  onMessage: (message: string) => void;
  onComplete: (result: ChatResponse) => void;
  onError: (error: Error) => void;
  onStart?: () => void;
}

// ==================== UTILITY FUNCTIONS ====================
const validateDifyConfig = (): void => {
  if (!DIFY_API_KEY) {
    throw new Error('DIFY_API_KEY chưa được cấu hình');
  }
  if (!DIFY_API_BASE_URL) {
    throw new Error('DIFY_API_BASE_URL chưa được cấu hình');
  }
};

const parseStreamingData = (data: string): Record<string, unknown> | null => {
  if (!data.startsWith('data: ')) {
    return null;
  }
  
  const jsonData = data.substring(6).trim();
  if (!jsonData || jsonData === '[DONE]') {
    return null;
  }
  
  try {
    return JSON.parse(jsonData);
  } catch (e) {
    console.error('Error parsing JSON line:', e, 'Data:', jsonData);
    return null;
  }
};

const handleStreamingError = (response: Response): Error => {
  const statusMessages: Record<number, string> = {
    400: 'Yêu cầu không hợp lệ. Vui lòng thử lại với nội dung khác.',
    401: 'Phiên làm việc của bạn đã hết hạn. Vui lòng tải lại trang để tiếp tục trò chuyện.',
    403: 'Bạn không có quyền truy cập chức năng này.',
    404: 'Không thể kết nối đến trợ lý AI. Vui lòng thử lại sau.',
    429: 'Xin lỗi! Tôi đang nhận quá nhiều yêu cầu. Hãy đợi một lát và thử lại nhé.',
    500: 'Hệ thống AI tạm thời không phản hồi. Tôi sẽ sớm hoạt động trở lại!',
    502: 'Hệ thống AI tạm thời không phản hồi. Tôi sẽ sớm hoạt động trở lại!',
    503: 'Hệ thống AI tạm thời không phản hồi. Tôi sẽ sớm hoạt động trở lại!',
    504: 'Hệ thống AI tạm thời không phản hồi. Tôi sẽ sớm hoạt động trở lại!',
  };
  
  const message = statusMessages[response.status] || 'Đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.';
  return new Error(`API Error ${response.status}: ${message}`);
};

// ==================== STREAMING CHAT FUNCTION ====================
export const postChatStream = async (
  data: ChatRequest,
  callbacks: StreamingCallbacks
): Promise<void> => {
  let fullMessage = '';
  let latestConversationId: string | null = null;
  let messageId: string | null = null;

  try {
    // Validate configuration
    validateDifyConfig();
    
    // Call onStart callback if provided
    callbacks.onStart?.();

    const response = await fetch(`${DIFY_API_BASE_URL}/v1/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        ...data,
        response_mode: 'streaming'
      }),
    });

    if (!response.ok) {
      throw handleStreamingError(response);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    if (!reader) {
      throw new Error('Response body is not readable');
    }

    // Process streaming response
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf('\n');

      while (boundary !== -1) {
        const eventString = buffer.substring(0, boundary).trim();
        buffer = buffer.substring(boundary + 1);

        if (eventString.startsWith('data: ')) {
          const parsedData = parseStreamingData(eventString);
          if (parsedData) {
            if (parsedData.event === 'message') {
              const chunkText = (parsedData.answer as string) || '';
              if (chunkText) {
                fullMessage += chunkText;
                callbacks.onMessage(chunkText);
              }
            }
            
            // Update conversation and message IDs
            if (parsedData.conversation_id) {
              latestConversationId = parsedData.conversation_id as string;
            }
            if (parsedData.message_id || parsedData.id) {
              messageId = (parsedData.message_id || parsedData.id) as string;
            }
          }
        }
        boundary = buffer.indexOf('\n');
      }
    }

    // Process remaining buffer
    if (buffer.trim().startsWith('data: ')) {
      const parsedData = parseStreamingData(buffer.trim());
      if (parsedData) {
        if (parsedData.event === 'message') {
          const chunkText = (parsedData.answer as string) || '';
          if (chunkText) {
            fullMessage += chunkText;
            callbacks.onMessage(chunkText);
          }
        }
        
        if (parsedData.conversation_id) {
          latestConversationId = parsedData.conversation_id as string;
        }
        if (parsedData.message_id || parsedData.id) {
          messageId = (parsedData.message_id || parsedData.id) as string;
        }
      }
    }

    // Call completion callback
    callbacks.onComplete({
      fullMessage,
      conversationId: latestConversationId,
      messageId
    });

  } catch (error) {
    console.error('Error in streaming chat:', error);
    callbacks.onError(error as Error);
  }
};

// ==================== LEGACY API FUNCTIONS ====================
export const callApiRoute = {
  // Example function to make a GET request
  getData: async () => {
    try {
      const response = await api.get(API_ENDPOINTS.CHAT);
      return response.data;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  },

  // Example function to make a POST request
  postItem: async (data: unknown) => {
    try {
      const response = await api.post(API_ENDPOINTS.CHAT, data);
      return response.data;
    } catch (error) {
      console.error('Error posting item:', error);
      throw error;
    }
  },

  // Legacy streaming function - now uses the new postChatStream
  postChatStream: async (
    data: unknown, 
    onMessage: (message: string) => void, 
    onComplete: (result: { fullMessage: string; conversationId: string | null; messageId: string | null }) => void, 
    onError: (error: Error) => void
  ) => {
    await postChatStream(
      data as ChatRequest,
      { onMessage, onComplete, onError }
    );
  },
};