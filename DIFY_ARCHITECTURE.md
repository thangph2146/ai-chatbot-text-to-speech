# Kiến Trúc Hệ Thống Dify - Tách Biệt Logic

## Tổng Quan

Hệ thống đã được tái cấu trúc để tách biệt rõ ràng các logic xử lý Dify API, giúp dễ bảo trì, test và mở rộng.

## Cấu Trúc Thư Mục

```
src/
├── app/lib/axios/
│   ├── call-api.ts          # Legacy API wrapper (đã cải thiện)
│   ├── config.ts            # Cấu hình API
│   └── end-point.ts         # Endpoints
├── services/dify/
│   ├── dify-client.ts       # DifyClient - Xử lý API calls
│   └── dify-service.ts      # DifyService - Retry & Rate Limiting
└── store/slices/
    └── messageSlice.ts      # Redux state management
```

## Các Layer Chính

### 1. **DifyClient** (`src/services/dify/dify-client.ts`)

**Chức năng:**
- Xử lý trực tiếp API calls đến Dify
- Streaming response parsing
- Error handling cơ bản

**Tính năng:**
```typescript
class DifyClient {
  async streamChat(request, callbacks)     // Streaming chat
  async chat(request)                      // Blocking chat  
}
```

### 2. **DifyService** (`src/services/dify/dify-service.ts`)

**Chức năng:**
- Retry logic với exponential backoff
- Rate limiting (60 req/min, 1000 req/hour)
- Error handling nâng cao

**Tính năng:**
```typescript
class DifyService {
  async streamChatWithRetry(request, callbacks)  // Streaming với retry
  async chatWithRetry(request)                   // Blocking với retry
  getServiceStatus()                             // Trạng thái service
}
```

### 3. **MessageSlice** (`src/store/slices/messageSlice.ts`)

**Chức năng:**
- Quản lý state Redux
- UI state management
- Streaming state updates

## Luồng Xử Lý

### Streaming Chat Flow:
```
User Input → MessageSlice → DifyService → DifyClient → Dify API
                ↓
            UI Updates ← Streaming Response ← Callbacks
```

### Error Handling Flow:
```
Error → DifyClient → DifyService (Retry Logic) → MessageSlice → UI Error
```

## Cải Thiện Chính

### 1. **Tách Biệt Trách Nhiệm**
- **DifyClient**: Chỉ xử lý API calls
- **DifyService**: Xử lý business logic (retry, rate limiting)
- **MessageSlice**: Quản lý state và UI

### 2. **Error Handling**
```typescript
// Custom error class với user-friendly messages
export class DifyError extends Error {
  public statusCode: number;
  public userMessage: string;
}
```

### 3. **Retry Logic**
- Exponential backoff (1s, 2s, 4s, 8s, max 10s)
- Chỉ retry trên server errors (5xx) và rate limiting (429)
- Tối đa 3 lần retry

### 4. **Rate Limiting**
- 60 requests/minute
- 1000 requests/hour
- Tự động wait khi vượt quá limit



## Cấu Hình

### Default Config:
```typescript
const defaultConfig = {
  retry: {
    maxRetries: 3,
    baseDelay: 1000,    // 1 second
    maxDelay: 10000,     // 10 seconds
    backoffMultiplier: 2,
  },
  rateLimit: {
    maxRequestsPerMinute: 60,
    maxRequestsPerHour: 1000,
  },
};
```

## Sử Dụng

### Streaming Chat:
```typescript
await difyService.streamChatWithRetry(
  {
    query: "Hello",
    response_mode: "streaming",
    conversation_id: "conv_123",
    user: "user_456"
  },
  {
    onMessage: (chunk) => console.log(chunk),
    onComplete: (result) => console.log(result),
    onError: (error) => console.error(error)
  }
);
```

### Blocking Chat:
```typescript
const response = await difyService.chatWithRetry({
  query: "Hello",
  response_mode: "blocking",
  conversation_id: "conv_123",
  user: "user_456"
});
```

## Lợi Ích

1. **Dễ Test**: Mỗi layer có thể test độc lập
2. **Dễ Debug**: Error handling rõ ràng với stack trace
3. **Scalable**: Dễ thêm tính năng mới (caching, monitoring)
4. **Maintainable**: Code được tổ chức theo chức năng
5. **Reliable**: Retry logic và rate limiting đảm bảo stability

## Migration Guide

### Từ Legacy Code:
```typescript
// Cũ
callApiRoute.postChatStream(data, onMessage, onComplete, onError);

// Mới  
difyService.streamChatWithRetry(data, { onMessage, onComplete, onError });
```

### Error Handling:
```typescript
// Cũ
catch (error) {
  console.error('Error:', error);
}

// Mới
catch (error) {
  if (error instanceof DifyError) {
    console.error('Dify Error:', error.userMessage);
  }
}
``` 