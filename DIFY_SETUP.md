# Hướng dẫn cấu hình Dify API

## Bước 1: Tạo file .env.local

Tạo file `.env.local` trong thư mục gốc của project với nội dung:

```env
# Dify API Configuration
NEXT_PUBLIC_DIFY_API_BASE_URL=http://trolyai.hub.edu.vn
NEXT_PUBLIC_DIFY_API_KEY=your_actual_api_key_here

# Other API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

## Bước 2: Lấy API Key

1. Đăng nhập vào Dify Console
2. Vào phần API Keys
3. Tạo hoặc copy API Key
4. Thay thế `your_actual_api_key_here` bằng API Key thực tế

## Bước 3: Kiểm tra cấu hình

Sau khi tạo file `.env.local`, restart development server:

```bash
npm run dev
```

## Bước 4: Debug

Nếu gặp lỗi 401 hoặc 404, kiểm tra:

1. **API Key có đúng không:**
   - Mở Developer Tools (F12)
   - Xem Console để kiểm tra log validation
   - Đảm bảo API Key không phải là `your_api_key_here`

2. **Environment variables có được load không:**
   - Kiểm tra log trong Console
   - Đảm bảo file `.env.local` được tạo đúng vị trí

3. **API Key format:**
   - API Key phải bắt đầu với `Bearer `
   - Độ dài tối thiểu 10 ký tự

## Cấu trúc code mới

Code hiện tại sử dụng axios trong `call-api-dify.ts` với DifyService:

```typescript
// Trong call-api-dify.ts
import axios from 'axios';

const difyApi = axios.create({
  baseURL: DIFY_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DIFY_API_KEY}`,
  },
  timeout: 30000
});

// Trong dify-service.ts
import { postDifyChatStream, postDifyChat } from '../../app/lib/axios/call-api-dify';

// Sử dụng DifyService với retry logic
await difyService.streamChatWithRetry(request, callbacks);
```

DifyService sẽ tự động:
- Xử lý retry logic với exponential backoff
- Rate limiting (60 requests/minute, 1000 requests/hour)
- Error handling với response status
- Streaming response processing

## Test API

Sử dụng file test để kiểm tra:

```typescript
import { testDifyServiceIntegration } from './test-integration';

// Test tích hợp
await testDifyServiceIntegration();
```

## Lỗi thường gặp

### Lỗi 401: "Authorization header must be provided and start with 'Bearer'"

**Nguyên nhân:**
- `NEXT_PUBLIC_DIFY_API_KEY` chưa được set
- API Key không hợp lệ
- File `.env.local` chưa được tạo

**Giải pháp:**
1. Tạo file `.env.local` với API Key hợp lệ
2. Restart development server
3. Kiểm tra Console log để xác nhận cấu hình

### Lỗi 404: HTML response

**Nguyên nhân:**
- Request đang được gửi đến Next.js server thay vì Dify API
- URL endpoint không đúng

**Giải pháp:**
1. Kiểm tra `NEXT_PUBLIC_DIFY_API_BASE_URL` có đúng không
2. Đảm bảo sử dụng axios instance đúng cách
3. Kiểm tra Console log để xem URL thực tế

### Lỗi "DIFY_API_KEY chưa được cấu hình"

**Nguyên nhân:**
- Environment variable không được load
- File `.env.local` không đúng format

**Giải pháp:**
1. Kiểm tra tên file: `.env.local` (không phải `.env`)
2. Kiểm tra format: `NEXT_PUBLIC_DIFY_API_KEY=your_key`
3. Restart server sau khi thay đổi

## Test API với curl

Sử dụng curl để test API trước khi dùng trong code:

```bash
curl -X POST 'http://trolyai.hub.edu.vn/v1/chat-messages' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
    "inputs": {},
    "query": "What are the specs of the iPhone 13 Pro Max?",
    "response_mode": "streaming",
    "conversation_id": "",
    "user": "abc-123",
    "files": [
      {
        "type": "image",
        "transfer_method": "remote_url",
        "url": "https://cloud.dify.ai/logo/logo-site.png"
      }
    ]
}'
``` 