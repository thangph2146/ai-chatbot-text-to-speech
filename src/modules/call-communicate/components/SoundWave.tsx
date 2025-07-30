import React, { useEffect, useRef } from 'react';
import { cn } from '@/app/lib/utils';

export type SoundWaveType = 'idle' | 'listening' | 'processing' | 'speaking';

interface SoundWaveProps {
  type: SoundWaveType;
  isActive: boolean;
  amplitude?: number;
  className?: string;
}

export const SoundWave: React.FC<SoundWaveProps> = ({
  type,
  isActive,
  amplitude = 0.5,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const barCount = 20;
    const barWidth = width / barCount;

    const animate = () => {
      timeRef.current += 0.1;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        // Draw flat line when inactive
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        return;
      }

      // Get colors based on type
      let primaryColor: string;
      let secondaryColor: string;
      
      switch (type) {
        case 'listening':
          primaryColor = '#10b981'; // green
          secondaryColor = '#34d399';
          break;
        case 'processing':
          primaryColor = '#3b82f6'; // blue
          secondaryColor = '#60a5fa';
          break;
        case 'speaking':
          primaryColor = '#8b5cf6'; // purple
          secondaryColor = '#a78bfa';
          break;
        default:
          primaryColor = '#6b7280'; // gray
          secondaryColor = '#9ca3af';
      }

      // Draw animated bars
      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth + barWidth / 2;
        
        // Calculate bar height based on type and time
        let barHeight: number;
        
        switch (type) {
          case 'listening':
            // Gentle wave for listening
            barHeight = Math.sin(timeRef.current + i * 0.5) * amplitude * 30 + 10;
            break;
          case 'processing':
            // Pulsing effect for processing
            barHeight = Math.abs(Math.sin(timeRef.current * 2 + i * 0.3)) * amplitude * 40 + 5;
            break;
          case 'speaking':
            // More dynamic wave for speaking
            barHeight = Math.abs(Math.sin(timeRef.current * 1.5 + i * 0.4) * Math.cos(timeRef.current * 0.8 + i * 0.2)) * amplitude * 50 + 8;
            break;
          default:
            barHeight = 5;
        }

        // Ensure minimum height
        barHeight = Math.max(barHeight, 3);
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.5, secondaryColor);
        gradient.addColorStop(1, primaryColor);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x - barWidth / 4, centerY - barHeight, barWidth / 2, barHeight * 2);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [type, isActive, amplitude]);

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <canvas
        ref={canvasRef}
        width={300}
        height={80}
        className="rounded-lg bg-white/50 backdrop-blur-sm shadow-inner"
      />
    </div>
  );
};

export default SoundWave;