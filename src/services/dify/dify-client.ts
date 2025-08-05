// ==================== DIFY CLIENT SERVICE ====================
// Tách biệt logic xử lý Dify API để dễ quản lý và test

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

// ==================== DIFY FUNCTIONS ====================
export const streamChat = async (
  request: DifyChatRequest,
  callbacks: DifyStreamingCallbacks
): Promise<void> => {
  const baseUrl = process.env.NEXT_PUBLIC_DIFY_API_BASE_URL || '';
  const apiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY || '';
  const timeout = 30000; // 30 seconds

  let fullMessage = '';
  let latestConversationId: string | null = null;
  let messageId: string | null = null;

  try {
    // Call onStart callback if provided
    callbacks.onStart?.();

    const requestUrl = `${process.env.NEXT_PUBLIC_DIFY_API_BASE_URL}/v1/chat-messages`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'text/event-stream'
    };

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...request,
        response_mode: 'streaming'
      }),
      signal: AbortSignal.timeout(timeout)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
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
    console.error('Error in streaming chat:', error);
    callbacks.onError(error as Error);
  }
};

export const chat = async (request: DifyChatRequest): Promise<DifyChatResponse> => {
  const baseUrl = process.env.NEXT_PUBLIC_DIFY_API_BASE_URL || 'https://trolyai.hub.edu.vn';
  const apiKey = process.env.NEXT_PUBLIC_DIFY_API_KEY || 'app-kyJ4IsXr0BvdaSuYBpdPISXH';
  const timeout = 30000; // 30 seconds

  try {
    const requestUrl = `${baseUrl}/v1/chat-messages`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    console.log('=== DIFY API REQUEST (BLOCKING) ===');
    console.log('URL:', requestUrl);
    console.log('Headers:', headers);
    console.log('Request body:', JSON.stringify(request, null, 2));

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...request,
        response_mode: 'blocking'
      }),
      signal: AbortSignal.timeout(timeout)
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      const userMessage = getErrorMessage(response.status);
      throw new DifyError(
        `API Error ${response.status}: ${errorText || response.statusText}`,
        response.status,
        userMessage
      );
    }

    const data = await response.json();
    console.log('Response data:', data);

    return {
      fullMessage: data.answer || '',
      conversationId: data.conversation_id || null,
      messageId: data.message_id || data.id || null
    };

  } catch (error) {
    console.error('Error in chat:', error);
    throw error;
  }
}; 