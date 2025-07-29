import { useState, useEffect } from 'react';

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = { role: 'user', parts: [{ text: messageText }] };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history: messages, message: messageText }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const botMessage: Message = { role: 'model', parts: [{ text: data.text }] };
      setMessages((prev) => [...prev, botMessage]);
      speak(data.text);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = { role: 'model', parts: [{ text: 'Sorry, something went wrong.' }] };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const speak = async (text: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        // Try to get error message from response body
        try {
          const errorData = await response.json();
          console.error('TTS API error:', errorData.error);
        } catch (e) {
          console.error('TTS API error: Could not parse error response.');
        }

        // Fallback to browser's synthesis if the API fails
        const utterance = new SpeechSynthesisUtterance(
          'Lỗi chuyển văn bản thành giọng nói. ' + text
        );
        utterance.lang = 'vi-VN';
        window.speechSynthesis.speak(utterance);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('Failed to fetch TTS audio:', error);
      // Fallback for network errors
      const utterance = new SpeechSynthesisUtterance(
        'Không thể kết nối dịch vụ giọng nói. ' + text
      );
      utterance.lang = 'vi-VN';
      window.speechSynthesis.speak(utterance);
    }
  };

  return {
    messages,
    input,
    loading,
    setInput,
    sendMessage,
  };
};