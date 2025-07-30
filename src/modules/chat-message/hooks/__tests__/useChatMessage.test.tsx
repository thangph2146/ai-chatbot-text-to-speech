import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { useChatMessage } from "../useChatMessage";
import { callApiRoute } from "@/app/lib/axios/call-api";
import { ReactNode } from "react";
import chatLogReducer from "@/store/slices/chatLogSlice";
import messageReducer from "@/store/slices/messageSlice";

// Mock the API call
jest.mock("@/app/lib/axios/call-api", () => ({
  callApiRoute: {
    postItem: jest.fn(),
    postChatStream: jest.fn(),
  },
}));

const mockCallApiRoute = callApiRoute as { 
  postItem: jest.MockedFunction<any>;
  postChatStream: jest.MockedFunction<any>;
};

// Create a wrapper component for React Query and Redux
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const store = configureStore({
    reducer: {
      chatLog: chatLogReducer,
      message: messageReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ["persist/PERSIST"],
        },
      }),
  });

  return ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
};

describe("useChatMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with empty messages and not loading", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatMessage(), { wrapper });

    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should send message successfully", async () => {
    const wrapper = createWrapper();
    
    // Mock streaming response
     mockCallApiRoute.postChatStream.mockImplementation((data, onMessage, onComplete, onError) => {
       // Simulate streaming response
       setTimeout(() => {
         onMessage("Bot response message");
         onComplete({ fullMessage: "Bot response message", conversationId: "conv-123", messageId: "msg-456" });
       }, 100);
       return Promise.resolve();
     });

    const { result } = renderHook(() => useChatMessage(), { wrapper });

    act(() => {
      result.current.sendMessage("Hello, how are you?", "user-001");
    });

    // Check that loading state is true initially
    expect(result.current.loading).toBe(true);

    // Check that user message is added immediately
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({
      role: "user",
      parts: [{ text: "Hello, how are you?" }],
    });

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check that bot response is added
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      role: "model",
      parts: [{ text: "Bot response message" }],
    });

    // Verify API was called correctly
    expect(mockCallApiRoute.postChatStream).toHaveBeenCalledWith(
      {
        inputs: {},
        query: "Hello, how are you?",
        response_mode: "streaming",
        conversation_id: "",
        user: "user-001"
      },
      expect.any(Function), // onMessage
      expect.any(Function), // onComplete
      expect.any(Function)  // onError
    );
  });

  it("should handle API error gracefully", async () => {
    const wrapper = createWrapper();
    
    // Mock streaming error
     mockCallApiRoute.postChatStream.mockImplementation((data, onMessage, onComplete, onError) => {
       // Simulate streaming error
       setTimeout(() => {
         onError(new Error("API Error"));
       }, 100);
       return Promise.resolve();
     });

    const { result } = renderHook(() => useChatMessage(), { wrapper });

    act(() => {
      result.current.sendMessage("Test message", "user-001");
    });

    // Check that loading state is true initially
    expect(result.current.loading).toBe(true);

    // Check that user message is added
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].parts[0].text).toBe("Test message");
    expect(result.current.messages[0].role).toBe("user");

    // Wait for the mutation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check that error state is set
    expect(result.current.error).toBeTruthy();

    // Check that error message is added
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]).toMatchObject({
      role: "model",
      parts: [
        {
          text: "Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn. Vui lòng thử lại.",
        },
      ],
    });
  });

  it("should not send empty messages", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatMessage(), { wrapper });

    act(() => {
      result.current.sendMessage("", "user-001");
    });

    expect(result.current.messages).toHaveLength(0);
    expect(mockCallApiRoute.postChatStream).not.toHaveBeenCalled();
  });

  it("should not send messages with only whitespace", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatMessage(), { wrapper });

    act(() => {
      result.current.sendMessage("   \n\t   ", "user-001");
    });

    expect(result.current.messages).toHaveLength(0);
    expect(mockCallApiRoute.postChatStream).not.toHaveBeenCalled();
  });

  it("should handle multiple messages correctly", async () => {
    const wrapper = createWrapper();
    
    // Mock streaming response
     mockCallApiRoute.postChatStream.mockImplementation((data, onMessage, onComplete, onError) => {
       setTimeout(() => {
         onMessage("Response");
         onComplete({ fullMessage: "Response", conversationId: "conv-123", messageId: "msg-456" });
       }, 100);
       return Promise.resolve();
     });

    const { result } = renderHook(() => useChatMessage(), { wrapper });

    act(() => {
      result.current.sendMessage("First message", "user-001");
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.sendMessage("Second message", "user-001");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(4);
    });

    // Check that messages are in correct order
    expect(result.current.messages[0].parts[0].text).toBe("First message");
    expect(result.current.messages[1].parts[0].text).toBe("Response");
    expect(result.current.messages[2].parts[0].text).toBe("Second message");
    expect(result.current.messages[3].parts[0].text).toBe("Response");
  });

  it("should clear messages when clearMessages is called", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatMessage(), { wrapper });

    // Add some messages first
    act(() => {
      result.current.sendMessage("Test message", "user-001");
    });

    expect(result.current.messages).toHaveLength(1);

    // Clear messages
    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("should update input when setInput is called", () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useChatMessage(), { wrapper });

    act(() => {
      result.current.setInput("New input value");
    });

    expect(result.current.input).toBe("New input value");
  });
});
