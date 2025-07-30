'use client';

import React from 'react';
import CallCommunicate from '@/modules/call-communicate/CallCommunicate';

const CallDemoPage = () => {
  const handleCallStateChange = (state: string) => {
    console.log('Call state changed:', state);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            AI Voice Assistant
          </h1>
          <p className="text-gray-600">
            Trò chuyện với AI bằng giọng nói như đang gọi điện thoại
          </p>
        </div>
        
        <CallCommunicate
          userId="demo-user"
          onCallStateChange={handleCallStateChange}
          className="w-full"
        />
        
        <div className="mt-8 text-center">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-700 mb-2">Hướng dẫn sử dụng:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Nhấn &ldquo;Bắt đầu cuộc gọi&rdquo; để khởi động</li>
              <li>• Nói câu hỏi của bạn</li>
              <li>• Dừng 2 giây để gửi tin nhắn</li>
              <li>• AI sẽ trả lời bằng giọng nói</li>
              <li>• Nói tiếp để ngắt lời AI</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallDemoPage;