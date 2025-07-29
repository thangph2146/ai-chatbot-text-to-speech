"use client";

import { FaPhoneSlash, FaMicrophone, FaStopCircle } from 'react-icons/fa';
import SoundWave from './SoundWave';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  listening: boolean;
  speaking: boolean;
  loading: boolean;
  handleListen: (listen: boolean) => void;
  stopAudio: () => void;
}

const CallModal: React.FC<CallModalProps> = ({ isOpen, onClose, listening, speaking, loading, handleListen, stopAudio }) => {
  if (!isOpen) return null;

  const handleHangUp = () => {
    handleListen(false);
    stopAudio();
    onClose();
  };

  const getStatusText = () => {
    if (speaking) return "🤖 Bot đang trả lời...";
    if (loading) return "⚡ Đang xử lý câu hỏi...";
    if (listening) return "🎤 Đang lắng nghe...";
    return "💬 Nhấn micro để bắt đầu";
  };

  const getStatusColor = () => {
    if (speaking) return "text-blue-600";
    if (loading) return "text-yellow-600";
    if (listening) return "text-green-600";
    return "text-gray-600";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl text-center w-full max-w-sm shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Cuộc gọi AI</h2>
        <p className={`text-sm mb-6 font-medium ${getStatusColor()}`}>{getStatusText()}</p>
        
        <div className="my-8 h-16 flex justify-center items-center">
          {loading && <SoundWave type="processing" />}
          {!loading && speaking && <SoundWave type="speaking" />}
          {!loading && !speaking && listening && <SoundWave type="listening" />}
        </div>
        
        <div className="flex justify-center gap-6">
          <button 
            onClick={() => {
              if (speaking) {
                stopAudio();
              }
              handleListen(!listening);
            }} 
            disabled={loading}
            className={`border-none rounded-full w-16 h-16 flex items-center justify-center cursor-pointer transition-all duration-200 ${
              listening 
                ? 'bg-red-100 hover:bg-red-200' 
                : loading 
                ? 'bg-gray-100 cursor-not-allowed'
                : 'bg-green-100 hover:bg-green-200'
            }`}
          >
            {listening ? (
              <FaStopCircle size={24} className="text-red-500" />
            ) : (
              <FaMicrophone size={24} className={loading ? "text-gray-400" : "text-green-500"} />
            )}
          </button>
          
          <button 
            onClick={handleHangUp} 
            className="bg-red-500 hover:bg-red-600 border-none rounded-full w-16 h-16 flex items-center justify-center cursor-pointer transition-all duration-200"
          >
            <FaPhoneSlash size={24} color="white" />
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          {listening && "💭 Hãy nói câu hỏi của bạn..."}
          {speaking && "⏸️ Nhấn micro để ngắt lời và hỏi câu mới"}
          {loading && "⏳ Đang suy nghĩ, vui lòng chờ..."}
          {!listening && !speaking && !loading && "🎯 Sẵn sàng lắng nghe bạn"}
        </p>
      </div>
    </div>
  );
};

export default CallModal;