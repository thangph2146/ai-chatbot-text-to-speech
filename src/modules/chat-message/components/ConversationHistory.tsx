import React, { useState, useCallback, useMemo } from 'react';
import { Conversation, HistoryFilter, HistorySort, HistorySortBy, HistorySortOrder } from '../types';
import { cn } from '@/app/lib/utils';
import {
  FaSearch,
  FaFilter,
  FaTrash,
  FaEdit,
  FaComments,
  FaClock,
  FaTag,
  FaArchive,
  FaEllipsisV,
  FaPlus,
  FaSpinner,
} from 'react-icons/fa';
import { formatTimestamp, formatRelativeTime } from '../utils/dateUtils';

interface ConversationHistoryProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onArchiveConversation: (conversationId: string) => void;
  onPinConversation: (conversationId: string) => void;
  className?: string;
  loading?: boolean;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onRenameConversation,
  onArchiveConversation,
  onPinConversation,
  className,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>({});
  const [sort, setSort] = useState<HistorySort>({ by: 'lastActivity', order: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filter and sort conversations
  const filteredAndSortedConversations = useMemo(() => {
    let filtered = conversations.filter(conv => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = conv.title.toLowerCase().includes(query);
        const messageMatch = conv.messages.some(msg => 
          msg.parts.some(part => part.text.toLowerCase().includes(query))
        );
        if (!titleMatch && !messageMatch) return false;
      }

      // Date range filter
      if (filter.dateRange) {
        const convDate = new Date(conv.updatedAt);
        if (convDate < filter.dateRange.start || convDate > filter.dateRange.end) {
          return false;
        }
      }

      // Tags filter
      if (filter.tags && filter.tags.length > 0) {
        const convTags = conv.metadata?.tags || [];
        if (!filter.tags.some(tag => convTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });

    // Sort conversations
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.by) {
        case 'date':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'messageCount':
          comparison = a.messages.length - b.messages.length;
          break;
        case 'lastActivity':
        default:
          comparison = a.updatedAt - b.updatedAt;
          break;
      }

      return sort.order === 'asc' ? comparison : -comparison;
    });

    // Prioritize pinned conversations
    const pinned = filtered.filter(conv => conv.metadata?.pinned);
    const unpinned = filtered.filter(conv => !conv.metadata?.pinned);
    
    return [...pinned, ...unpinned];
  }, [conversations, searchQuery, filter, sort]);

  const handleEditStart = useCallback((conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingId && editingTitle.trim()) {
      onRenameConversation(editingId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle('');
  }, [editingId, editingTitle, onRenameConversation]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingTitle('');
  }, []);

  const handleSortChange = useCallback((newSortBy: HistorySortBy) => {
    setSort(prev => ({
      by: newSortBy,
      order: prev.by === newSortBy && prev.order === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const handleBulkAction = useCallback((action: 'delete' | 'archive') => {
    selectedConversations.forEach(id => {
      if (action === 'delete') {
        onDeleteConversation(id);
      } else if (action === 'archive') {
        onArchiveConversation(id);
      }
    });
    setSelectedConversations(new Set());
    setShowBulkActions(false);
  }, [selectedConversations, onDeleteConversation, onArchiveConversation]);

  const toggleConversationSelection = useCallback((id: string) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const renderConversationItem = useCallback((conversation: Conversation) => {
    const isSelected = conversation.id === currentConversationId;
    const isEditing = editingId === conversation.id;
    const isChecked = selectedConversations.has(conversation.id);
    const isPinned = conversation.metadata?.pinned;
    const isArchived = conversation.metadata?.archived;

    return (
      <div
        key={conversation.id}
        className={cn(
          'group relative p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer',
          {
            'bg-blue-100 border-l-4 border-blue-700': isSelected,
            'opacity-60': isArchived,
          }
        )}
        onClick={() => !isEditing && onSelectConversation(conversation.id)}
      >
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          {showBulkActions && (
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => toggleConversationSelection(conversation.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
          )}

          {/* Pin Indicator */}
          {isPinned && (
            <FaSpinner className="w-3 h-3 text-yellow-500 mt-1 flex-shrink-0" />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            {isEditing ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave();
                    if (e.key === 'Escape') handleEditCancel();
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  autoFocus
                />
                <button
                  onClick={handleEditSave}
                  className="text-green-600 hover:text-green-800"
                >
                  ✓
                </button>
                <button
                  onClick={handleEditCancel}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            ) : (
              <h3 className={cn(
                'font-medium text-sm truncate',
                {
                  'text-blue-900': isSelected,
                  'text-gray-900': !isSelected,
                }
              )}>
                {conversation.title}
              </h3>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <FaComments className="w-3 h-3" />
                <span>{conversation.messages.length}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <FaClock className="w-3 h-3" />
                <span>{formatRelativeTime(conversation.updatedAt)}</span>
              </div>

              {conversation.metadata?.tags && conversation.metadata.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <FaTag className="w-3 h-3" />
                  <span>{conversation.metadata.tags[0]}</span>
                  {conversation.metadata.tags.length > 1 && (
                    <span>+{conversation.metadata.tags.length - 1}</span>
                  )}
                </div>
              )}
            </div>

            {/* Last Message Preview */}
            {conversation.messages.length > 0 && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {conversation.messages[conversation.messages.length - 1].parts[0]?.text}
              </p>
            )}
          </div>

          {/* Actions */}
          {!isEditing && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPinConversation(conversation.id);
                }}
                className={cn(
                  'p-1 rounded hover:bg-gray-200 transition-colors',
                  {
                    'text-yellow-500': isPinned,
                    'text-gray-500': !isPinned,
                  }
                )}
                title={isPinned ? 'Bỏ ghim' : 'Ghim'}
              >
                <FaSpinner className="w-3 h-3" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditStart(conversation);
                }}
                className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors"
                title="Đổi tên"
              >
                <FaEdit className="w-3 h-3" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchiveConversation(conversation.id);
                }}
                className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors"
                title={isArchived ? 'Bỏ lưu trữ' : 'Lưu trữ'}
              >
                <FaArchive className="w-3 h-3" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Bạn có chắc chắn muốn xóa cuộc trò chuyện này?')) {
                    onDeleteConversation(conversation.id);
                  }
                }}
                className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
                title="Xóa"
              >
                <FaTrash className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }, [
    currentConversationId,
    editingId,
    editingTitle,
    selectedConversations,
    showBulkActions,
    onSelectConversation,
    onPinConversation,
    onArchiveConversation,
    onDeleteConversation,
    handleEditStart,
    handleEditSave,
    handleEditCancel,
    toggleConversationSelection,
  ]);

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Lịch sử trò chuyện</h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={cn(
                'p-2 rounded-md transition-colors',
                {
                  'bg-blue-100 text-blue-600': showBulkActions,
                  'text-gray-500 hover:text-gray-700 hover:bg-gray-100': !showBulkActions,
                }
              )}
              title="Chọn nhiều"
            >
              <FaEllipsisV className="w-4 h-4" />
            </button>
            
            <button
              onClick={onCreateConversation}
              className="p-2 rounded-md bg-blue-700 text-white hover:bg-blue-800 transition-colors"
              title="Tạo cuộc trò chuyện mới"
            >
              <FaPlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-md text-sm transition-colors',
              {
                'bg-blue-100 text-blue-600': showFilters,
                'text-gray-500 hover:text-gray-700 hover:bg-gray-100': !showFilters,
              }
            )}
          >
            <FaFilter className="w-3 h-3" />
            Lọc
          </button>
          
          <select
            value={`${sort.by}-${sort.order}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-') as [HistorySortBy, HistorySortOrder];
              setSort({ by, order });
            }}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="lastActivity-desc">Hoạt động gần nhất</option>
            <option value="lastActivity-asc">Hoạt động cũ nhất</option>
            <option value="date-desc">Tạo mới nhất</option>
            <option value="date-asc">Tạo cũ nhất</option>
            <option value="title-asc">Tên A-Z</option>
            <option value="title-desc">Tên Z-A</option>
            <option value="messageCount-desc">Nhiều tin nhắn nhất</option>
            <option value="messageCount-asc">Ít tin nhắn nhất</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && selectedConversations.size > 0 && (
          <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50 rounded-md">
            <span className="text-sm text-blue-700">
              Đã chọn {selectedConversations.size} cuộc trò chuyện
            </span>
            <button
              onClick={() => handleBulkAction('archive')}
              className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition-colors"
            >
              Lưu trữ
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedConversations.size} cuộc trò chuyện?`)) {
                  handleBulkAction('delete');
                }
              }}
              className="px-3 py-1 bg-red-700 text-white rounded text-sm hover:bg-red-800 transition-colors"
            >
              Xóa
            </button>
          </div>
        )}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAndSortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <FaComments className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-center">
              {searchQuery ? 'Không tìm thấy cuộc trò chuyện nào' : 'Chưa có cuộc trò chuyện nào'}
            </p>
            {!searchQuery && (
              <button
                onClick={onCreateConversation}
                className="mt-2 text-blue-600 hover:text-blue-800 underline"
              >
                Tạo cuộc trò chuyện đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredAndSortedConversations.map(renderConversationItem)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;