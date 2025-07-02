import React, { useEffect, useRef } from 'react';

interface AudioWaveBackgroundProps {
  color?: 'blue' | 'indigo' | 'purple' | 'green' | 'red';
  intensity?: 'low' | 'medium' | 'high';
}

const AudioWaveBackground: React.FC<AudioWaveBackgroundProps> = ({ 
  color = 'blue', 
  intensity = 'medium' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Color mapping
    const colorMap: Record<string, string> = {
      blue: 'rgba(59, 130, 246, ',
      indigo: 'rgba(99, 102, 241, ',
      purple: 'rgba(139, 92, 246, ',
      green: 'rgba(16, 185, 129, ',
      red: 'rgba(239, 68, 68, '
    };
    
    const baseColor = colorMap[color] || colorMap.blue;
    
    // Intensity settings
    const intensitySettings = {
      low: {
        waveCount: 3,
        opacity: 0.2,
        lineWidth: 1.5,
        amplitude: 10,
        speed: 0.03
      },
      medium: {
        waveCount: 5,
        opacity: 0.3,
        lineWidth: 2,
        amplitude: 15,
        speed: 0.05
      },
      high: {
        waveCount: 7,
        opacity: 0.4,
        lineWidth: 2.5,
        amplitude: 20,
        speed: 0.07
      }
    };
    
    const settings = intensitySettings[intensity];
    
    // Create voice-like waveform data
    // This simulates the varying amplitudes of a voice recording
    const createVoiceWaveform = (length: number, complexity: number) => {
      const waveform = [];
      let value = 0.5;
      
      // Create a more natural voice-like pattern with varying frequencies
      for (let i = 0; i < length; i++) {
        // Add some randomness but maintain continuity for natural voice-like appearance
        const change = (Math.random() - 0.5) * 0.1;
        value = Math.max(0.1, Math.min(0.9, value + change));
        
        // Add micro-variations to simulate voice texture
        const microVariation = Math.sin(i * 0.2) * 0.05 + Math.sin(i * 0.5) * 0.03;
        
        // Add occasional "spikes" for plosive sounds (like p, b, t)
        const spike = Math.random() > 0.98 ? (Math.random() * 0.3) : 0;
        
        // Add silence gaps occasionally (like pauses between words)
        const silence = Math.random() > 0.95 ? Math.max(0, value - 0.4) : 0;
        
        waveform.push(value + microVariation + spike - silence);
      }
      
      return waveform;
    };
    
    // Create multiple waveforms for different voice characteristics
    const waveforms = [];
    for (let i = 0; i < settings.waveCount; i++) {
      const length = 100 + Math.floor(Math.random() * 50); // Varying lengths
      const complexity = 3 + Math.random() * 5;
      
      waveforms.push({
        data: createVoiceWaveform(length, complexity),
        speed: settings.speed * (0.7 + Math.random() * 0.6), // Varying speeds
        offset: Math.random() * 100,
        y: canvas.height * (0.3 + Math.random() * 0.4), // Distribute waves vertically
        amplitude: settings.amplitude * (0.8 + Math.random() * 0.4), // Varying amplitudes
        lineWidth: settings.lineWidth * (0.8 + Math.random() * 0.4), // Varying line widths
        opacity: settings.opacity * (0.8 + Math.random() * 0.4) // Varying opacities
      });
    }
    
    // Animation loop
    let animationId: number;
    let time = 0;
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;
      
      waveforms.forEach(wave => {
        ctx.beginPath();
        
        const segmentWidth = canvas.width / (wave.data.length - 1);
        
        for (let i = 0; i < wave.data.length; i++) {
          const x = i * segmentWidth;
          
          // Calculate y position based on waveform data
          // Use time and offset for animation
          const dataIndex = Math.floor((i + wave.offset + time * wave.speed * 100) % wave.data.length);
          const value = wave.data[dataIndex];
          
          // Apply a voice-like envelope to the waveform
          const envelope = Math.sin((i / wave.data.length) * Math.PI);
          const y = wave.y - (value - 0.5) * wave.amplitude * envelope;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.strokeStyle = baseColor + wave.opacity + ')';
        ctx.lineWidth = wave.lineWidth;
        ctx.stroke();
      });
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [color, intensity]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
};

export default AudioWaveBackground;