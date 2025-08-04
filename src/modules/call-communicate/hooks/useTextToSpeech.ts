'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface UseTextToSpeechReturn {
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
}

export const useTextToSpeech = (): UseTextToSpeechReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentOptionsRef = useRef<SpeakOptions | null>(null);

  // Load available voices
  const loadVoices = useCallback(() => {
    if (!isSupported || typeof window === 'undefined') return;
    
    const availableVoices = speechSynthesis.getVoices();
    setVoices(availableVoices);
  }, [isSupported]);

  // Check support and load voices on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [loadVoices]);

  // Call TTS API and play audio
  const callTTSAPI = useCallback(async (text: string): Promise<string> => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      console.error('TTS API call failed');
      throw new Error('TTS API call failed');
    }
  }, []);

  // Play audio from URL
  const playAudio = useCallback(async (audioUrl: string, options?: SpeakOptions): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.volume = options?.volume ?? 1;
      
      // Wait for audio to be ready before playing
      audio.oncanplaythrough = () => {
        setIsSpeaking(true);
        options?.onStart?.();
        
        audio.play().catch((error) => {
          setIsSpeaking(false);
          const playError = new Error(`Audio play failed: ${error.message}`);
          options?.onError?.(playError);
          URL.revokeObjectURL(audioUrl);
          audioRef.current = null;
          reject(playError);
        });
      };
      
      audio.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        options?.onEnd?.();
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        resolve();
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        const audioError = new Error('Audio playback failed');
        options?.onError?.(audioError);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        reject(audioError);
      };
      
      audio.onpause = () => {
        setIsPaused(true);
      };
      
      audio.onplay = () => {
        setIsPaused(false);
      };
      
      // Start loading the audio
      audio.load();
    });
  }, []);

  // Fallback to browser TTS
  const speakWithBrowserTTS = useCallback(async (text: string, options?: SpeakOptions): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!isSupported || typeof window === 'undefined') {
        const error = new Error('Speech synthesis not supported');
        options?.onError?.(error);
        reject(error);
        return;
      }

      // Stop any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      currentOptionsRef.current = options || null;

      // Set voice (prefer Vietnamese voice)
      if (options?.voice) {
        utterance.voice = options.voice;
      } else {
        const vietnameseVoice = voices.find(voice => 
          voice.lang.includes('vi') || voice.name.toLowerCase().includes('vietnamese')
        );
        if (vietnameseVoice) {
          utterance.voice = vietnameseVoice;
        }
      }

      utterance.rate = options?.rate ?? 1;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? 1;
      utterance.lang = 'vi-VN';

      utterance.onstart = () => {
        setIsSpeaking(true);
        options?.onStart?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        options?.onEnd?.();
        utteranceRef.current = null;
        currentOptionsRef.current = null;
        resolve();
      };

      utterance.onerror = (event) => {
        setIsSpeaking(false);
        setIsPaused(false);
        const error = new Error(`Speech synthesis error: ${event.error}`);
        options?.onError?.(error);
        utteranceRef.current = null;
        currentOptionsRef.current = null;
        reject(error);
      };

      utterance.onpause = () => {
        setIsPaused(true);
      };

      utterance.onresume = () => {
        setIsPaused(false);
      };

      speechSynthesis.speak(utterance);
    });
  }, [isSupported, voices]);

  // Stop speaking
  const stop = useCallback(() => {
    // Stop audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Stop browser TTS
    if (isSupported && typeof window !== 'undefined') {
      speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
    currentOptionsRef.current = null;
  }, [isSupported]);

  // Main speak function
  const speak = useCallback(async (text: string, options?: SpeakOptions): Promise<void> => {
    if (!text.trim()) {
      return;
    }

    // Stop any ongoing speech
    stop();

    try {
      // Try TTS API first
      const audioUrl = await callTTSAPI(text);
      await playAudio(audioUrl, options);
    } catch {
      console.warn('TTS API failed, falling back to browser TTS');
      // Fallback to browser TTS
      await speakWithBrowserTTS(text, options);
    }
  }, [callTTSAPI, playAudio, speakWithBrowserTTS, stop]);

  // Pause speaking
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    } else if (isSupported && typeof window !== 'undefined' && speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
  }, [isSupported]);

  // Resume speaking
  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    } else if (isSupported && typeof window !== 'undefined' && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }, [isSupported]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices
  };
};

export default useTextToSpeech;