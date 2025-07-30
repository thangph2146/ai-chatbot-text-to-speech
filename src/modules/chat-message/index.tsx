import React, { useEffect, useRef } from "react";
import { useChatMessage } from "./hooks/useChatMessage";
import LogViewer from "@/components/LogViewer";
import { MessageBubble } from "./components/MessageBubble";
import { ChatInput } from "./components/ChatInput";
import { ConversationHistory } from "./components/ConversationHistory";
import { FaHistory, FaComments, FaBars, FaTimes } from "react-icons/fa";

const ChatMessage = () => {
  const {
    messages,
    input,
    loading,
    error,
    setInput,
    sendMessage,
    clearMessages,
    showLogs,
    setShowLogs,
    conversations,
    streamingState,
    uiState,
    setInputFocus,
    setMarkdownPreview,
    setSelectedMessage,
    toggleConversationHistory,
    addConversation,
    updateConversation,
    deleteConversation
  } = useChatMessage();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && uiState.isScrolledToBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingState.accumulatedContent, uiState.isScrolledToBottom]);

  const handleSendMessage = (message: string) => {
    sendMessage(message);
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
    <div className="flex h-screen bg-gray-50">
      {/* Conversation History Sidebar */}
      {uiState.showConversationHistory && (
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
          <ConversationHistory
            conversations={conversations}
            currentConversationId={null}
            onSelectConversation={(id) => {
              // Handle conversation selection
              console.log('Selected conversation:', id);
            }}
            onDeleteConversation={deleteConversation}
            onUpdateConversation={updateConversation}
            onCreateConversation={() => {
              // Handle new conversation creation
              console.log('Create new conversation');
            }}
          />
        </div>
      )}
      
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 max-w-4xl mx-auto bg-white shadow-lg">
        {/* Header */}
        <div className="bg-blue-500 text-white p-4 flex justify-between items-center border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleConversationHistory}
              className="p-2 hover:bg-blue-600 rounded transition-colors"
              title="Toggle conversation history"
            >
              {uiState.showConversationHistory ? <FaTimes /> : <FaBars />}
            </button>
            <h1 className="text-xl font-bold">AI Chat với Dify</h1>
            {streamingState.isStreaming && (
              <div className="flex items-center gap-2 text-blue-200">
                <div className="w-2 h-2 bg-blue-200 rounded-full animate-pulse"></div>
                <span className="text-sm">Đang nhận phản hồi...</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLogs(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors"
            >
              <FaHistory /> Logs
            </button>
            <button
              onClick={handleClearMessages}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm transition-colors"
            >
              Xóa tin nhắn
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesContainerRef}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={{
                ...msg,
                status: 'sent'
              }}
              onEdit={(id, content) => {
                // Handle edit functionality
                console.log('Edit message:', id, content);
              }}
              onDelete={(id) => {
                // Handle delete functionality
                console.log('Delete message:', id);
              }}
              onCopy={(content) => {
                navigator.clipboard.writeText(content);
              }}
              onReply={(id) => {
                // Handle reply functionality
                console.log('Reply to message:', id);
              }}
              onRegenerate={(id) => {
                // Handle regenerate functionality
                console.log('Regenerate message:', id);
              }}
              onBookmark={(id) => {
                // Handle bookmark functionality
                console.log('Bookmark message:', id);
              }}
              onShare={(id) => {
                // Handle share functionality
                console.log('Share message:', id);
              }}
              isSelected={uiState.selectedMessage === msg.id}
              isEditing={uiState.editingMessage === msg.id}
              showActions={true}
            />
          ))}
          

          <div ref={messagesEndRef} />

          {loading && (
            <div className="flex justify-center">
              <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm text-gray-600">
                Đang gửi tin nhắn...
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

        {/* Input Area */}
        <div className="border-t">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSendMessage}
            disabled={loading}
            placeholder="Nhập tin nhắn của bạn..."
            showMarkdownPreview={uiState.showMarkdownPreview}
            onToggleMarkdownPreview={() => setShowMarkdownPreview(!uiState.showMarkdownPreview)}
            onFocus={() => setInputFocus(true)}
            onBlur={() => setInputFocus(false)}
            maxLength={4000}
            showCharacterCount={true}
            enableFileUpload={true}
            enableVoiceInput={true}
            onFileUpload={(files) => {
              // Handle file upload
              console.log('Files uploaded:', files);
            }}
            onVoiceInput={(transcript) => {
              // Handle voice input
              setInput(transcript);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
