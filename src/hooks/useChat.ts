import { useState, useEffect, useRef } from 'react';

export interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const useChat = (
  onListen: (listening: boolean) => void,
  resetTranscript: () => void
) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

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

      const data = await response.json();
      const botMessage: Message = { role: 'model', parts: [{ text: data.text }] };
      
      // Chỉ thêm vào messages nếu không bị hủy
      if (!abortController.signal.aborted) {
        if (!isCall) {
          setMessages((prev) => [...prev, userMessage, botMessage]);
        }
        speak(data.text, undefined, isCall);
      }
      
      setInput('');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      
      console.error('Failed to send message:', error);
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

  const stopAudio = () => {
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
  };

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
        } catch (e) {
          console.error('TTS API error: Could not parse error response.');
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

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

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