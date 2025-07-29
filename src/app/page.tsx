"use client";

"use client";

"use client";

import { useEffect, useState, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useChat, Message } from '../hooks/useChat';
import ReactMarkdown from 'react-markdown';
import { FaMicrophone, FaStopCircle } from 'react-icons/fa';

export default function Home() {
  const [isCalling, setIsCalling] = useState(false);

  const handleListen = useCallback((listen: boolean) => {
    if (listen) {
      SpeechRecognition.startListening({ continuous: true, language: 'vi-VN' });
    } else {
      SpeechRecognition.stopListening();
    }
  }, []);

  const { transcript, listening, browserSupportsSpeechRecognition, resetTranscript } = useSpeechRecognition();
  const { messages, input, loading, setInput, sendMessage } = useChat(handleListen, resetTranscript);


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

  const handleCall = () => {
    if (isCalling) {
      setIsCalling(false);
      handleListen(false);
    } else {
      setIsCalling(true);
      handleListen(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '5px', padding: '10px' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: '10px' }}>
            <span style={{ background: msg.role === 'user' ? '#dcf8c6' : '#f1f0f0', padding: '8px 12px', borderRadius: '10px', display: 'inline-block' }}>
              <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
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
        <button type="button" onClick={handleCall} style={{ marginLeft: '10px', padding: '10px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '24px' }}>
          {isCalling ? <FaStopCircle color="red" /> : <FaMicrophone />}
        </button>
        <button type="submit" style={{ marginLeft: '10px', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}>
          Gửi
        </button>
      </form>
    </div>
  );
}