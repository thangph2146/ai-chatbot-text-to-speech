import axios from 'axios';
import { API_ENDPOINTS } from './end-point';
import { API_BASE_URL, DIFY_API_BASE_URL, DIFY_API_KEY } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken'); // Or wherever your token is stored
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

  // Function to handle streaming chat responses
  postChatStream: async (
    data: unknown, 
    onMessage: (message: string) => void, 
    onComplete: (result: { fullMessage: string; conversationId: string | null; messageId: string | null }) => void, 
    onError: (error: any) => void
  ) => {
    let fullMessage = '';
    let latestConversationId: string | null = null;
    let messageId: string | null = null;

    try {
      if (!DIFY_API_KEY) {
        throw new Error('DIFY_API_KEY chưa được cấu hình');
      }

      const response = await fetch(`${DIFY_API_BASE_URL}/v1/chat-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DIFY_API_KEY}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          ...(data as object),
          response_mode: 'streaming'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');

        while (boundary !== -1) {
          const eventString = buffer.substring(0, boundary).trim();
          buffer = buffer.substring(boundary + 2);

          if (eventString.startsWith('data:')) {
            const jsonData = eventString.substring(5).trim();
            try {
              const parsedData = JSON.parse(jsonData);
              // Adapt based on actual API response structure
              const chunkText = parsedData.chunk || parsedData.answer || parsedData.text || '';
              const currentConvId = parsedData.conversation_id;
              const currentMessageId = parsedData.message_id;

              if (chunkText) {
                fullMessage += chunkText;
                onMessage(chunkText);
              }

              if (currentConvId) latestConversationId = currentConvId;
              if (currentMessageId) messageId = currentMessageId;

            } catch (e) {
              console.error('Error parsing SSE JSON:', e, 'Data:', jsonData);
            }
          }
          boundary = buffer.indexOf('\n\n');
        }
      }

      // Process remaining buffer content (if any)
      if (buffer.trim().startsWith('data:')) {
        const jsonData = buffer.trim().substring(5).trim();
        try {
          const parsedData = JSON.parse(jsonData);
          const chunkText = parsedData.chunk || parsedData.answer || parsedData.text || '';
          const currentConvId = parsedData.conversation_id;
          const currentMessageId = parsedData.message_id;
          
          if (chunkText) {
            fullMessage += chunkText;
            onMessage(chunkText);
          }
          
          if (currentConvId) latestConversationId = currentConvId;
          if (currentMessageId) messageId = currentMessageId;
        } catch (e) {
          console.error('Error parsing final SSE JSON:', e, 'Data:', jsonData);
        }
      }

      onComplete({ fullMessage, conversationId: latestConversationId, messageId });
    } catch (error) {
      console.error('Error in streaming chat:', error);
      onError(error);
    }
  },

  // Add more API call functions as needed
};