# Hướng dẫn cấu hình Dify API

## Bước 1: Tạo file .env.local

Tạo file `.env.local` trong thư mục gốc của project với nội dung:

```env
# Dify API Configuration
NEXT_PUBLIC_DIFY_API_BASE_URL=https://trolyai.hub.edu.vn
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

Code hiện tại sử dụng function trực tiếp:

```typescript
// Trong call-api.ts
import { streamChat, DifyChatRequest, DifyStreamingCallbacks } from '../../../services/dify/dify-client';

// Sử dụng function trực tiếp
await streamChat(difyRequest, difyCallbacks);
```

Functions sẽ tự động:
- Đọc environment variables trực tiếp
- Validate cấu hình
- Debug logging
- Error handling

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
2. Đảm bảo sử dụng function trực tiếp
3. Kiểm tra Console log để xem URL thực tế

### Lỗi "DIFY_API_KEY chưa được cấu hình"

**Nguyên nhân:**
- Environment variable không được load
- File `.env.local` không đúng format

**Giải pháp:**
1. Kiểm tra tên file: `.env.local` (không phải `.env`)
2. Kiểm tra format: `NEXT_PUBLIC_DIFY_API_KEY=your_key`
3. Restart server sau khi thay đổi

## Test API

Sử dụng curl để test API trước khi dùng trong code:

```bash
curl -X POST 'https://trolyai.hub.edu.vn/v1/chat-messages' \
--header 'Authorization: Bearer YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
    "inputs": {},
    "query": "Hello",
    "response_mode": "streaming",
    "conversation_id": "",
    "user": "test-user"
}'
``` 