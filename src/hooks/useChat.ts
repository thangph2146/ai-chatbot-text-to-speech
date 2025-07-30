'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import logger from '@/app/lib/logger';

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const useChat = (
  onListen: (listening: boolean) => void
) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const stopAudio = useCallback(() => {
    // Dừng audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Hủy request đang chờ
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset trạng thái
    setSpeaking(false);
    setLoading(false);
  }, [audioRef, abortControllerRef, setSpeaking, setLoading]);

  const speak = async (text: string, onEnd?: () => void, autoListen?: boolean) => {
    const cleanText = text.replace(/\*\*/g, ''); // Remove markdown bold

    stopAudio();
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!response.ok) {
        // Try to get error message from response body
        try {
          const errorData = await response.json();
          console.error('TTS API error:', errorData.error);
        } catch (error) {
          console.error('TTS API error: Could not parse error response. Error:', error);
        }

        // Fallback to browser's synthesis if the API fails
        const utterance = new SpeechSynthesisUtterance(
          'Lỗi chuyển văn bản thành giọng nói. ' + text
        );
        utterance.lang = 'vi-VN';
        utterance.onend = () => {
          if (onEnd) onEnd();
          audioRef.current = null;
          setSpeaking(false);
          if (autoListen) {
            setTimeout(() => onListen(true), 100); // Small delay for better UX
          }
        };
        window.speechSynthesis.speak(utterance);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play();
      setSpeaking(true);
      audio.onended = () => {
        if (onEnd) onEnd();
        audioRef.current = null;
        setSpeaking(false);
        if (autoListen) {
          setTimeout(() => onListen(true), 100); // Small delay for better UX
        }
      };
    } catch (error) {
      console.error('Failed to fetch TTS audio:', error);
      // Fallback for network errors
      const utterance = new SpeechSynthesisUtterance(
        'Không thể kết nối dịch vụ giọng nói. ' + text
      );
      utterance.lang = 'vi-VN';
      utterance.onend = () => {
        audioRef.current = null;
        setSpeaking(false);
        if (autoListen) {
          setTimeout(() => onListen(true), 100); // Small delay for better UX
        }
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const sendMessage = async (messageText: string, isCall: boolean = false) => {
    if (!messageText.trim()) return;

    // Hủy request cũ nếu đang có
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Dừng audio cũ nếu đang phát
    stopAudio();
    
    // Dừng listening khi bắt đầu xử lý
    onListen(false);

    const userMessage: Message = { role: 'user', parts: [{ text: messageText }] };  
    setLoading(true);

    // Tạo AbortController mới
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history: messages, message: messageText }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      if (!response.body) {
        logger.error('Response body is null');
        return;
      }

      logger.info('Starting to process stream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';
      const botMessage: Message = { role: 'model', parts: [{ text: '' }] };

      // Add user message and an empty bot message to start
      setMessages((prev) => [...prev, userMessage, botMessage]);

      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            logger.info('Stream finished');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const json = JSON.parse(line.substring(5));
                if (json.event === 'message') {
                  fullMessage += json.answer;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = { role: 'model', parts: [{ text: fullMessage }] };
                    return newMessages;
                  });
                } else if (json.event === 'message_end') {
                  logger.info('Message end event received:', json);
                }
              } catch (e) {
                logger.error('Could not parse stream line:', line, e);
              }
            }
          }
        }

        if (!isCall) {
          speak(fullMessage, undefined, isCall);
        }
        setInput('');
      };

      processStream();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      logger.error('Failed to send message:', error);
      if (!isCall && !abortController.signal.aborted) {
        const errorMessage: Message = { role: 'model', parts: [{ text: 'Xin lỗi, đã có lỗi xảy ra.' }] };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    messages,
    input,
    loading,
    speaking,
    setInput,
    sendMessage,
    stopAudio,
  };
};