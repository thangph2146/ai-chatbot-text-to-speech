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
    toggleConversationHistory,
    deleteConversation
  } = useChatMessage();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleMessageAction = (messageId: string, action: string, data?: unknown) => {
    switch (action) {
      case 'edit':
        console.log('Edit message:', messageId);
        break;
      case 'delete':
        console.log('Delete message:', messageId);
        break;
      case 'copy':
        if (typeof data === 'string') {
          navigator.clipboard.writeText(data);
        }
        break;
      case 'reply':
        console.log('Reply to message:', messageId);
        break;
      case 'regenerate':
        console.log('Regenerate message:', messageId);
        break;
      case 'bookmark':
        console.log('Bookmark message:', messageId);
        break;
      case 'share':
        console.log('Share message:', messageId);
        break;
      default:
        console.log('Unknown action:', action, messageId, data);
    }
  };
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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Conversation History Sidebar */}
      {uiState.showConversationHistory && (
        <div className="w-80 bg-white/95 backdrop-blur-sm border-r border-blue-100 flex-shrink-0 shadow-lg">
          <ConversationHistory
            conversations={conversations}
            currentConversationId={undefined}
            onSelectConversation={(id) => {
              // Handle conversation selection
              console.log('Selected conversation:', id);
            }}
            onDeleteConversation={deleteConversation}
            onRenameConversation={(conversationId, newTitle) => {
              // Handle conversation rename
              console.log('Rename conversation:', conversationId, newTitle);
            }}
            onArchiveConversation={(conversationId) => {
              // Handle conversation archive
              console.log('Archive conversation:', conversationId);
            }}
            onPinConversation={(conversationId) => {
              // Handle conversation pin
              console.log('Pin conversation:', conversationId);
            }}
            onCreateConversation={() => {
              // Handle new conversation creation
              console.log('Create new conversation');
            }}
          />
        </div>
      )}
      
      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 max-w-5xl mx-auto bg-white/90 backdrop-blur-sm shadow-2xl border border-blue-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-6 flex justify-between items-center border-b border-blue-600">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleConversationHistory}
              className="p-3 hover:bg-blue-600/50 rounded-xl transition-all duration-200 hover:scale-105"
              title="Toggle conversation history"
            >
              {uiState.showConversationHistory ? <FaTimes className="w-5 h-5" /> : <FaBars className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FaComments className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Chat Assistant</h1>
                <p className="text-blue-200 text-sm">Powered by Dify</p>
              </div>
            </div>
            {streamingState.isStreaming && (
              <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Đang nhận phản hồi...</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLogs(true)}
              className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-600 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <FaHistory className="w-4 h-4" /> Logs
            </button>
            <button
              onClick={handleClearMessages}
              className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 shadow-lg"
            >
              Xóa tin nhắn
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white/50 to-blue-50/30" ref={messagesContainerRef}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={{
                ...msg,
                status: 'sent'
              }}
              onAction={handleMessageAction}
              isSelected={uiState.selectedMessageId === msg.id}
              isEditing={uiState.editingMessageId === msg.id}
              config={{ enableActions: true }}
            />
          ))}
          

          <div ref={messagesEndRef} />

          {loading && (
            <div className="flex justify-center">
              <div className="bg-blue-50 border border-blue-200 px-6 py-3 rounded-2xl text-sm text-blue-700 font-medium shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
                  Đang gửi tin nhắn...
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl text-sm font-medium shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-700 rounded-full"></div>
                  Lỗi: {error}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-blue-100 bg-white/80 backdrop-blur-sm">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSendMessage}
            disabled={loading}
            placeholder="Nhập tin nhắn của bạn..."
            showMarkdownPreview={uiState.showMarkdownPreview}
            onToggleMarkdownPreview={() => setMarkdownPreview(!uiState.showMarkdownPreview)}
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
