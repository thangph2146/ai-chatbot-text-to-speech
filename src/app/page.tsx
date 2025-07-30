"use client";

import { useEffect, useState, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useChat } from '../hooks/useChat';
import { useCall } from '../hooks/useCall';
import ReactMarkdown from 'react-markdown';
import { FaPhoneSlash } from 'react-icons/fa';
import CallModal from '@/components/CallModal';
import SoundWave from '@/components/SoundWave';

export default function Home() {
  const { transcript, listening, browserSupportsSpeechRecognition, resetTranscript } = useSpeechRecognition();
  
  // Unified speech recognition handler
  const handleSpeechRecognition = useCallback((listen: boolean) => {
    if (listen) {
      SpeechRecognition.startListening({ continuous: true, language: 'vi-VN' });
    } else {
      SpeechRecognition.stopListening();
    }
  }, []);
  
  // Regular chat handler
  const regularChatHandleListen = handleSpeechRecognition;
  
  const { messages, input, loading: regularLoading, speaking: regularSpeaking, setInput, sendMessage } = useChat(regularChatHandleListen);
  
  const {
    isCallActive,
    callState,
    isListening: callIsListening,
    loading: callLoading,
    speaking: callSpeaking,
    startCall,
    endCall,
    handleListen: callHandleListen,
    handleTranscriptChange,
    interruptSpeaking
  } = useCall();

  // Handle transcript changes for call mode
  useEffect(() => {
    if (isCallActive) {
      handleTranscriptChange(transcript);
    } else if (transcript && transcript.trim().length > 0) {
      // Regular chat mode
      sendMessage(transcript, false);
      resetTranscript();
    }
  }, [transcript, isCallActive, handleTranscriptChange, sendMessage, resetTranscript]);

  // Auto manage speech recognition based on call listening state
  useEffect(() => {
    if (isCallActive && callIsListening && !listening) {
      handleSpeechRecognition(true);
    } else if (isCallActive && !callIsListening && listening) {
      handleSpeechRecognition(false);
    }
  }, [isCallActive, callIsListening, listening, handleSpeechRecognition]);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isClient && !browserSupportsSpeechRecognition) {
    return <span>Trình duyệt không hỗ trợ nhận dạng giọng nói.</span>;
  }

  const handleCallButtonClick = () => {
    startCall();
  };

  const handleCloseModal = () => {
    endCall();
    resetTranscript();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input, false);
  };

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-5">
      <div className="flex-1 overflow-y-auto mb-5 border border-gray-300 rounded-lg p-3">
        {messages.map((msg, index) => (
          <div key={index} className={`text-${msg.role === 'user' ? 'right' : 'left'} mb-2.5`}>
            <span className={`inline-block px-3 py-2 rounded-lg ${msg.role === 'user' ? 'bg-green-200' : 'bg-gray-200'}`}>
              <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
            </span>
          </div>
        ))}
        {(regularLoading || callLoading) && (
          <div className="flex items-center justify-center">
            <span className="mr-3">Đang tải...</span>
            <SoundWave type="loading" />
          </div>
        )}
        {!(regularLoading || callLoading) && (regularSpeaking || callSpeaking) && (
          <div className="flex items-center justify-center">
            <span className="mr-3">Bot đang trả lời...</span>
            <SoundWave type="speaking" />
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2.5 rounded-lg border border-gray-300"
          placeholder="Nhập tin nhắn..."
        />
        <button type="submit" className="ml-2.5 p-2.5 rounded-lg border border-gray-300">
          Gửi
        </button>
        <button type="button" onClick={handleCallButtonClick} className="ml-2.5 p-2.5 rounded-full border-none bg-transparent cursor-pointer text-2xl">
          <FaPhoneSlash className="text-green-500" />
        </button>
      </form>
      <CallModal 
        isOpen={isCallActive} 
        onClose={handleCloseModal} 
        listening={callIsListening} 
        speaking={callState === 'speaking'} 
        loading={callState === 'processing'}
        handleListen={callHandleListen} 
        stopAudio={interruptSpeaking} 
      />
    </div>
  );
}