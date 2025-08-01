'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
  }
}

interface UseVoiceRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
}

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  transcript: string;
  finalTranscript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  resetFinalTranscript: () => void;
}

export const useVoiceRecognition = ({
  continuous = true,
  interimResults = true,
  lang = 'vi-VN',
  onStart,
  onEnd,
  onError,
  onResult
}: UseVoiceRecognitionOptions = {}): UseVoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false);
      return;
    }
    
    const SpeechRecognitionAPI = (typeof SpeechRecognition !== 'undefined' ? SpeechRecognition : window.webkitSpeechRecognition) as {
      new (): SpeechRecognition;
    };
    setIsSupported(!!SpeechRecognitionAPI);
    
    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
    }
  }, []);

  // Setup recognition instance
  useEffect(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
      onStart?.();
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
      onEnd?.();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setInterimTranscript(interimTranscript);
      
      if (finalTranscript) {
        // Only update if we have new final content
        const newFinalTranscript = finalTranscript.trim();
        if (newFinalTranscript) {
          setFinalTranscript(prev => {
            // Avoid duplicates by checking if the new transcript is already included
            if (prev && prev.includes(newFinalTranscript)) {
              return prev;
            }
            const combined = prev ? `${prev} ${newFinalTranscript}` : newFinalTranscript;
            return combined;
          });
          setTranscript(prev => {
            if (prev && prev.includes(newFinalTranscript)) {
              return prev;
            }
            const combined = prev ? `${prev} ${newFinalTranscript}` : newFinalTranscript;
            return combined;
          });
          onResult?.(newFinalTranscript, true);
        }
      } else if (interimTranscript) {
        // For interim results, combine with final transcript
        setTranscript(() => {
          const finalPart = finalTranscript;
          const interim = interimTranscript.trim();
          return finalPart ? `${finalPart} ${interim}` : interim;
        });
        onResult?.(interimTranscript, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = 'Lỗi nhận diện giọng nói';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'Không phát hiện giọng nói';
          break;
        case 'audio-capture':
          errorMessage = 'Không thể truy cập microphone';
          break;
        case 'not-allowed':
          errorMessage = 'Quyền truy cập microphone bị từ chối';
          break;
        case 'network':
          errorMessage = 'Lỗi kết nối mạng';
          break;
        case 'service-not-allowed':
          errorMessage = 'Dịch vụ nhận diện giọng nói không khả dụng';
          break;
        default:
          errorMessage = `Lỗi nhận diện giọng nói: ${event.error}`;
      }
      
      setError(errorMessage);
      setIsListening(false);
      isListeningRef.current = false;
      onError?.(errorMessage);
    };

    return () => {
      if (isListeningRef.current) {
        recognition.stop();
      }
    };
  }, [continuous, interimResults, lang, onStart, onEnd, onError, onResult]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || isListeningRef.current) return;

    try {
      setError(null);
      recognition.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('Không thể bắt đầu nhận diện giọng nói');
    }
  }, []);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !isListeningRef.current) return;

    try {
      recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setFinalTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const resetFinalTranscript = useCallback(() => {
    setFinalTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    finalTranscript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    resetFinalTranscript
  };
};

export default useVoiceRecognition;