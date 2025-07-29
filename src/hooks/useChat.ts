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

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
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