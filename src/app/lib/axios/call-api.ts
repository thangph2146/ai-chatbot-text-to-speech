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
    onError: (error: Error) => void
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
        let boundary = buffer.indexOf('\n');

        while (boundary !== -1) {
          const eventString = buffer.substring(0, boundary).trim();
          buffer = buffer.substring(boundary + 1);

          if (eventString.startsWith('data: ')) {
            const jsonData = eventString.substring(6).trim();
            try {
              const parsedData = JSON.parse(jsonData);
              if (parsedData.event === 'message') {
                const chunkText = parsedData.answer || '';
                if (chunkText) {
                  fullMessage += chunkText;
                  onMessage(chunkText);
                }
              }
              const currentConvId = parsedData.conversation_id;
              const currentMessageId = parsedData.message_id || parsedData.id;

              if (currentConvId) latestConversationId = currentConvId;
              if (currentMessageId) messageId = currentMessageId;

              if (parsedData.event === 'message_end') {
                // Handle end if needed
              }
            } catch (e) {
              console.error('Error parsing JSON line:', e, 'Data:', jsonData);
            }
          }
          boundary = buffer.indexOf('\n');
        }
      }

      // Process remaining buffer content (if any)
      if (buffer.trim().startsWith('data: ')) {
        const jsonData = buffer.trim().substring(6).trim();
        try {
          const parsedData = JSON.parse(jsonData);
          if (parsedData.event === 'message') {
            const chunkText = parsedData.answer || '';
            if (chunkText) {
              fullMessage += chunkText;
              onMessage(chunkText);
            }
          }
          const currentConvId = parsedData.conversation_id;
          const currentMessageId = parsedData.message_id || parsedData.id;

          if (currentConvId) latestConversationId = currentConvId;
          if (currentMessageId) messageId = currentMessageId;

          if (parsedData.event === 'message_end') {
            // Handle end if needed
          }
        } catch (e) {
          console.error('Error parsing final JSON line:', e, 'Data:', jsonData);
        }
      }

      onComplete({ fullMessage, conversationId: latestConversationId, messageId });
    } catch (error) {
      console.error('Error in streaming chat:', error);
      onError(error as Error);
    }
  },

  // Add more API call functions as needed
};