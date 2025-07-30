import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  sendMessageWithLogging,
  setInput,
  addMessage,
  clearMessages,
} from "@/store/slices/messageSlice";

export interface Message {
  role: "user" | "model";
  parts: { text: string }[];
  id: string;
  timestamp: number;
  conversationId?: string;
  messageId?: string;
}

export const useChatMessage = () => {
  const dispatch = useAppDispatch();
  const { messages, input, isLoading, error, currentConversationId } =
    useAppSelector((state) => state.message);

  const handleSetInput = useCallback(
    (value: string) => {
      dispatch(setInput(value));
    },
    [dispatch]
  );

  const sendMessage = useCallback(
    (messageText: string, userId?: string) => {
      if (!messageText.trim()) return;

      // Thêm tin nhắn user vào danh sách
      const userMessage: Message = {
        id: `user_${Date.now()}`,
        role: "user",
        parts: [{ text: messageText }],
        timestamp: Date.now(),
        conversationId: currentConversationId || undefined,
      };

      dispatch(addMessage(userMessage));

      // Gửi tin nhắn với logging
      dispatch(sendMessageWithLogging({ messageText, userId }));
    },
    [dispatch, currentConversationId]
  );

  const clearAllMessages = useCallback(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  return {
    messages,
    input,
    loading: isLoading,
    error,
    currentConversationId,
    setInput: handleSetInput,
    sendMessage,
    clearMessages: clearAllMessages,
  };
};
