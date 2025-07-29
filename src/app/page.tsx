"use client";

import { useEffect, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useChat, Message } from '../hooks/useChat';

export default function Home() {
  const { messages, input, loading, setInput, sendMessage } = useChat();
  const { transcript, listening, browserSupportsSpeechRecognition } = useSpeechRecognition();

  useEffect(() => {
    setInput(transcript);
  }, [transcript, setInput]);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isClient && !browserSupportsSpeechRecognition) {
    return <span>Trình duyệt không hỗ trợ nhận dạng giọng nói.</span>;
  }

  const handleListen = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true, language: 'vi-VN' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '5px', padding: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: '10px' }}>
            <span style={{ background: msg.role === 'user' ? '#dcf8c6' : '#f1f0f0', padding: '8px 12px', borderRadius: '10px', display: 'inline-block' }}>
              {msg.parts[0].text}
            </span>
          </div>
        ))}
        {loading && <div>Đang tải...</div>}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
          placeholder="Nhập tin nhắn..."
        />
        <button type="button" onClick={handleListen} style={{ marginLeft: '10px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
          {listening ? 'Dừng' : 'Ghi âm'}
        </button>
        <button type="submit" style={{ marginLeft: '10px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
          Gửi
        </button>
      </form>
    </div>
  );
}