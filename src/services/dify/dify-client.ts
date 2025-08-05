// ==================== DIFY CLIENT SERVICE ====================
// Tách biệt logic xử lý Dify API để dễ quản lý và test

import { DIFY_API_BASE_URL, DIFY_API_KEY } from '@/app/lib/axios/config';

// ==================== TYPES ====================
export interface DifyChatRequest {
  inputs?: Record<string, unknown>;
  query: string;
  response_mode: 'streaming' | 'blocking';
  conversation_id?: string;
  user?: string;
}

export interface DifyChatResponse {
  fullMessage: string;
  conversationId: string | null;
  messageId: string | null;
}

export interface DifyStreamingCallbacks {
  onMessage: (message: string) => void;
  onComplete: (result: DifyChatResponse) => void;
  onError: (error: Error) => void;
  onStart?: () => void;
}

export interface DifyErrorResponse {
  error: string;
  message: string;
  statusCode?: number;
}

// ==================== ERROR HANDLING ====================
export class DifyError extends Error {
  public statusCode: number;
  public userMessage: string;

  constructor(message: string, statusCode: number = 500, userMessage?: string) {
    super(message);
    this.name = 'DifyError';
    this.statusCode = statusCode;
    this.userMessage = userMessage || message;
  }
}

const getErrorMessage = (statusCode: number): string => {
  const errorMessages: Record<number, string> = {
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
  
  return errorMessages[statusCode] || 'Đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.';
};

// ==================== UTILITY FUNCTIONS ====================
const validateDifyConfig = (): void => {
  if (!DIFY_API_KEY) {
    throw new DifyError('DIFY_API_KEY chưa được cấu hình', 500);
  }
  if (!DIFY_API_BASE_URL) {
    throw new DifyError('DIFY_API_BASE_URL chưa được cấu hình', 500);
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
    return JSON.parse(jsonData) as Record<string, unknown>;
  } catch (e) {
    console.error('Error parsing JSON line:', e, 'Data:', jsonData);
    return null;
  }
};

// ==================== DIFY CLIENT CLASS ====================
export class DifyClient {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor() {
    this.baseUrl = DIFY_API_BASE_URL || '';
    this.apiKey = DIFY_API_KEY || '';
    this.timeout = 30000; // 30 seconds
  }

  // ==================== STREAMING CHAT ====================
  async streamChat(
    request: DifyChatRequest,
    callbacks: DifyStreamingCallbacks
  ): Promise<void> {
    let fullMessage = '';
    let latestConversationId: string | null = null;
    let messageId: string | null = null;

    try {
      // Validate configuration
      validateDifyConfig();
      
      // Call onStart callback if provided
      callbacks.onStart?.();

      const response = await fetch(`${this.baseUrl}/v1/chat-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          ...request,
          response_mode: 'streaming'
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const userMessage = getErrorMessage(response.status);
        throw new DifyError(
          `API Error ${response.status}: ${errorText || response.statusText}`,
          response.status,
          userMessage
        );
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new DifyError('Response body is not readable', 500);
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
                const chunkText = parsedData.answer as string || '';
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
            const chunkText = parsedData.answer as string || '';
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
      console.error('Error in Dify streaming chat:', error);
      
      if (error instanceof DifyError) {
        callbacks.onError(error);
      } else {
        const genericError = new DifyError(
          error instanceof Error ? error.message : 'Unknown error occurred',
          500
        );
        callbacks.onError(genericError);
      }
    }
  }

  // ==================== BLOCKING CHAT ====================
  async chat(request: DifyChatRequest): Promise<DifyChatResponse> {
    try {
      validateDifyConfig();

      const response = await fetch(`${this.baseUrl}/v1/chat-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          ...request,
          response_mode: 'blocking'
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const userMessage = getErrorMessage(response.status);
        throw new DifyError(
          `API Error ${response.status}: ${errorText || response.statusText}`,
          response.status,
          userMessage
        );
      }

      const data = await response.json() as Record<string, unknown>;
      
      return {
        fullMessage: data.answer as string || '',
        conversationId: data.conversation_id as string || null,
        messageId: data.message_id as string || null
      };

    } catch (error) {
      console.error('Error in Dify chat:', error);
      
      if (error instanceof DifyError) {
        throw error;
      } else {
        throw new DifyError(
          error instanceof Error ? error.message : 'Unknown error occurred',
          500
        );
      }
    }
  }


}

// ==================== SINGLETON INSTANCE ====================
export const difyClient = new DifyClient(); 