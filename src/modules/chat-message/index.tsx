import React, { useState } from "react";
import { useChatMessage } from "./hooks/useChatMessage";
import LogViewer from "@/components/LogViewer";
import { FaHistory, FaComments } from "react-icons/fa";

const ChatMessage = () => {
  const {
    messages,
    input,
    loading,
    error,
    setInput,
    sendMessage,
    clearMessages,
  } = useChatMessage();
  const [showLogs, setShowLogs] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input, "user-001"); // Có thể thay đổi userId theo logic ứng dụng
  };

  const handleClearMessages = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả tin nhắn?")) {
      clearMessages();
    }
  };

  if (showLogs) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <button
              onClick={() => setShowLogs(false)}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              <FaComments /> Quay lại Chat
            </button>
          </div>
          <LogViewer />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-lg">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">AI Chat với Dify</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLogs(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
          >
            <FaHistory /> Logs
          </button>
          <button
            onClick={handleClearMessages}
            className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm"
          >
            Xóa tin nhắn
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              <div className="text-sm">{msg.parts[0].text}</div>
              <div className="text-xs opacity-70 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString("vi-VN")}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span>Đang xử lý...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-100 text-red-800 px-4 py-2 rounded-lg text-sm">
              Lỗi: {error}
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-200"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nhập tin nhắn của bạn..."
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? "Đang gửi..." : "Gửi"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatMessage;
