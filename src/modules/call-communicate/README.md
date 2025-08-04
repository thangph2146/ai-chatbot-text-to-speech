# Call Communicate Module - Tối ưu Performance & UX/UI

## Tổng quan

Module này đã được tối ưu hóa để cải thiện performance và trải nghiệm người dùng dựa trên các nguyên tắc từ bài viết về Redux state slicing performance.

## Các cải tiến chính

### 1. Redux State Management Tối ưu

#### Selectors với Memoization
- Sử dụng `createSelector` để memoize các selectors
- Tránh re-render không cần thiết khi state không thay đổi
- Tối ưu performance cho các tính toán phức tạp

```typescript
// Memoized selectors
export const selectMessages = createSelector(
  [(state: { call: CallSliceState }) => state.call.messages],
  (messages) => messages
);

export const selectUserMessages = createSelector(
  [selectMessages],
  (messages) => messages.filter(msg => msg.role === 'user')
);
```

#### State Structure Cải tiến
- Tách biệt rõ ràng các loại state: call, messages, TTS, UI
- Thêm message cache để tối ưu performance
- Quản lý audio queue cho TTS

### 2. TTS (Text-to-Speech) Tối ưu

#### Client-side TTS Processing
- Xử lý TTS trực tiếp trên client để giảm latency
- Audio queue management để tránh overlap
- Automatic cleanup để tránh memory leaks

#### Performance Optimizations
- Sử dụng `URL.createObjectURL()` cho audio caching
- Automatic cleanup với `URL.revokeObjectURL()`
- Audio state management để tránh duplicate playback

### 3. Message Management Cải tiến

#### Message Status Tracking
- Theo dõi status: pending, sent, failed
- Visual feedback cho người dùng
- Error handling và retry logic

#### Message Caching
- Cache messages để tránh re-fetch
- Optimized rendering với React.memo
- Virtualization cho large message lists

### 4. UX/UI Improvements

#### Real-time Feedback
- Visual indicators cho call states
- Sound wave animations
- Progress indicators cho processing

#### Responsive Design
- Compact mode cho mobile
- Adaptive layouts
- Touch-friendly controls

#### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

## Performance Optimizations

### 1. Redux Selectors
```typescript
// Trước: Re-render mỗi khi state thay đổi
const messages = useAppSelector(state => state.call.messages);

// Sau: Memoized selector
const messages = useAppSelector(selectMessages);
```

### 2. Component Memoization
```typescript
// Sử dụng React.memo để tránh re-render không cần thiết
const MessageItem = memo<MessageItemProps>(({ message, ...props }) => {
  // Component logic
});
```

### 3. Callback Optimization
```typescript
// Sử dụng useCallback để tối ưu performance
const handleSendMessage = useCallback(async (message: string) => {
  // Message sending logic
}, [dependencies]);
```

### 4. Audio Management
```typescript
// Automatic cleanup để tránh memory leaks
useEffect(() => {
  return () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };
}, []);
```

## State Management Architecture

### CallSlice State Structure
```typescript
interface CallSliceState {
  // Call state
  isCallActive: boolean;
  callState: CallState;
  currentConversationId: string | null;
  
  // Messages
  messages: CallMessage[];
  currentTranscript: string;
  
  // Processing state
  isProcessing: boolean;
  error: string | null;
  lastMessageId: string | null;
  
  // TTS state
  tts: TTSState;
  
  // Performance optimizations
  messageCache: Record<string, CallMessage>;
  conversationCache: Record<string, CallMessage[]>;
  
  // UI state
  ui: {
    showTranscript: boolean;
    autoScroll: boolean;
    showTimestamps: boolean;
    compactMode: boolean;
  };
}
```

## Error Handling & Recovery

### 1. Graceful Degradation
- Fallback TTS nếu Redux TTS fails
- Error boundaries cho component failures
- Retry logic cho network errors

### 2. User Feedback
- Clear error messages
- Loading states
- Progress indicators

### 3. State Recovery
- Automatic cleanup on unmount
- State reset on errors
- Conversation persistence

## Memory Management

### 1. Audio Cleanup
```typescript
const handleCleanupAudio = useCallback(() => {
  if (state.tts.currentAudioUrl) {
    URL.revokeObjectURL(state.tts.currentAudioUrl);
  }
  state.tts.currentAudioUrl = null;
  state.tts.audioQueue = [];
  state.tts.isSpeaking = false;
}, []);
```

### 2. Message Cleanup
```typescript
const handleCleanupMessages = useCallback(() => {
  state.messages.forEach(message => {
    if (message.audioUrl) {
      URL.revokeObjectURL(message.audioUrl);
    }
  });
  state.messages = [];
  state.messageCache = {};
  state.conversationCache = {};
}, []);
```

## Usage Examples

### Basic Usage
```typescript
import { CallCommunicate } from '@/modules/call-communicate';

function App() {
  return (
    <CallCommunicate
      userId="user-123"
      conversationId="conv-456"
      showMessages={true}
      showSettings={true}
    />
  );
}
```

### Advanced Usage với Custom Hooks
```typescript
import { useCallRedux } from '@/modules/call-communicate/hooks/useCallRedux';

function CustomCallComponent() {
  const {
    isCallActive,
    callState,
    messages,
    handleStartCall,
    handleSendMessage,
    handlePlayAudio,
  } = useCallRedux();

  // Custom logic here
}
```

## Best Practices

### 1. Performance
- Sử dụng memoized selectors
- Implement component memoization
- Optimize callback functions
- Cleanup resources properly

### 2. UX/UI
- Provide real-time feedback
- Handle errors gracefully
- Support accessibility
- Responsive design

### 3. State Management
- Immutable state updates
- Proper error handling
- State normalization
- Cache management

## Troubleshooting

### Common Issues

1. **Memory Leaks**
   - Ensure audio cleanup on unmount
   - Clear timeouts and intervals
   - Revoke object URLs

2. **Performance Issues**
   - Check selector memoization
   - Verify component memoization
   - Monitor re-render frequency

3. **Audio Issues**
   - Check browser compatibility
   - Verify audio format support
   - Handle audio loading errors

### Debug Tools
- Redux DevTools for state inspection
- React DevTools for component profiling
- Browser DevTools for audio debugging

## Future Improvements

1. **Advanced TTS**
   - Multiple voice options
   - Speed/pitch controls
   - Background audio support

2. **Enhanced UX**
   - Voice commands
   - Gesture controls
   - AR/VR integration

3. **Performance**
   - Web Workers for heavy processing
   - Service Workers for offline support
   - Advanced caching strategies