# Voice Communication Module

Module giao tiếp bằng giọng nói với AI, mô phỏng cuộc gọi điện thoại thực tế.

## Tính năng chính

### 1. Nhận diện giọng nói (Speech Recognition)
- Sử dụng Web Speech API để nhận diện giọng nói tiếng Việt
- Hỗ trợ nhận diện liên tục với kết quả tạm thời và cuối cùng
- Tự động gửi tin nhắn sau 5 giây im lặng
- Ngăn chặn tin nhắn trùng lặp

### 2. Chuyển đổi văn bản thành giọng nói (Text-to-Speech)
- Tích hợp với API TTS tùy chỉnh (`/api/tts`)
- Hỗ trợ fallback sang browser TTS
- Xử lý markdown trước khi chuyển đổi
- Giọng nói tiếng Việt tự nhiên

### 3. Tích hợp AI (Dify)
- Gửi tin nhắn đến Dify AI thông qua Redux
- Xử lý phản hồi streaming
- Quản lý conversation_id tự động

### 4. Xử lý ngắt quãng (Interruption)
- Phát hiện khi người dùng nói trong lúc AI đang trả lời
- Dừng TTS ngay lập tức
- Chuyển sang chế độ lắng nghe câu hỏi mới

## Cấu trúc thư mục

```
src/modules/call-communicate/
├── CallCommunicate.tsx          # Component chính
├── hooks/
│   ├── useVoiceRecognition.ts   # Hook nhận diện giọng nói
│   ├── useTextToSpeech.ts       # Hook chuyển đổi TTS
│   └── useCallRedux.ts          # Hook Redux cho call
├── store/
│   └── callSlice.ts             # Redux slice cho call
├── utils/
│   └── markdownProcessor.ts     # Xử lý markdown cho TTS
└── README.md                    # Tài liệu này
```

## Cách sử dụng

### 1. Import component
```tsx
import CallCommunicate from '@/modules/call-communicate/CallCommunicate';
```

### 2. Sử dụng trong page
```tsx
export default function CallDemoPage() {
  return (
    <div>
      <CallCommunicate />
    </div>
  );
}
```

## Luồng hoạt động

1. **Bắt đầu cuộc gọi**: Người dùng nhấn "Bắt đầu cuộc gọi"
2. **Lắng nghe**: Hệ thống bắt đầu nhận diện giọng nói
3. **Nhận diện**: Chuyển đổi giọng nói thành văn bản
4. **Gửi tin nhắn**: Sau 5 giây im lặng, gửi tin nhắn đến AI
5. **Nhận phản hồi**: AI trả lời qua Dify
6. **Chuyển đổi TTS**: Chuyển phản hồi thành giọng nói
7. **Phát âm thanh**: Phát âm thanh cho người dùng
8. **Lặp lại**: Quay lại bước 2 để tiếp tục cuộc trò chuyện

## Xử lý ngắt quãng

- Khi AI đang nói mà người dùng bắt đầu nói (>2 ký tự)
- Hệ thống sẽ:
  1. Dừng TTS ngay lập tức
  2. Xóa timeout hiện tại
  3. Reset transcript
  4. Chuyển sang chế độ lắng nghe
  5. Sau 500ms bắt đầu nhận diện giọng nói mới

## Cấu hình

### Voice Recognition
```tsx
const voiceConfig = {
  continuous: true,      // Nhận diện liên tục
  interimResults: true,  // Hiển thị kết quả tạm thời
  lang: 'vi-VN'         // Ngôn ngữ tiếng Việt
};
```

### Text-to-Speech
```tsx
const ttsConfig = {
  apiEndpoint: '/api/tts',  // API endpoint
  fallbackToSpeechSynthesis: true,  // Fallback sang browser TTS
  preferredVoice: 'vi-VN'   // Giọng nói ưa thích
};
```

## Dependencies

- `@reduxjs/toolkit`: Quản lý state
- `react`: Framework UI
- `axios`: HTTP client
- Web Speech API (built-in browser)
- Speech Synthesis API (built-in browser)

## Lưu ý

1. **Trình duyệt hỗ trợ**: Cần trình duyệt hỗ trợ Web Speech API
2. **Microphone permission**: Cần cấp quyền truy cập microphone
3. **HTTPS**: Web Speech API chỉ hoạt động trên HTTPS (hoặc localhost)
4. **Ngôn ngữ**: Được tối ưu cho tiếng Việt
5. **Network**: Cần kết nối internet cho API calls

## Troubleshooting

### Lỗi thường gặp

1. **Microphone not accessible**
   - Kiểm tra quyền truy cập microphone
   - Đảm bảo chạy trên HTTPS hoặc localhost

2. **Speech recognition not working**
   - Kiểm tra trình duyệt hỗ trợ
   - Thử refresh trang

3. **TTS not playing**
   - Kiểm tra API `/api/tts` hoạt động
   - Kiểm tra file `scripts/tts.py`
   - Đảm bảo có package `gtts` được cài đặt

4. **Duplicate messages**
   - Đã được xử lý trong phiên bản hiện tại
   - Kiểm tra logic trong `useVoiceRecognition.ts`

### Debug

Bật console để xem logs:
```javascript
// Trong CallCommunicate.tsx
console.log('Sending message after 5s silence:', trimmedFinalTranscript);
console.log('User interruption detected:', finalTranscript);
```