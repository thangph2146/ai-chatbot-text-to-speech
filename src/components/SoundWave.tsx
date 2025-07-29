import React from 'react';

interface SoundWaveProps {
  type?: 'listening' | 'speaking' | 'loading' | 'processing';
}

const SoundWave: React.FC<SoundWaveProps> = ({ type = 'speaking' }) => {
  const getBarColor = () => {
    switch (type) {
      case 'listening':
        return 'bg-green-500';
      case 'loading':
      case 'processing':
        return 'bg-yellow-500';
      case 'speaking':
      default:
        return 'bg-blue-500';
    }
  };

  const getAnimationClass = (index: number) => {
    if (type === 'loading' || type === 'processing') {
      return `animate-pulse`;
    }
    return `animate-sound-wave-${index + 1}`;
  };

  return (
    <div className="flex justify-center items-center h-12">
      {[...Array(5)].map((_, index) => (
        <div 
          key={index}
          className={`w-1 h-3 mx-0.5 rounded transition-all duration-300 ${
            getBarColor()
          } ${
            getAnimationClass(index)
          }`}
          style={{
            height: (type === 'loading' || type === 'processing') ? '12px' : undefined,
            animationDelay: (type === 'loading' || type === 'processing') ? `${index * 0.1}s` : undefined
          }}
        ></div>
      ))}
    </div>
  );
};

export default SoundWave;