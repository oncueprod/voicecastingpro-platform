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
    
    // Wave parameters
    const waveCount = intensity === 'low' ? 4 : intensity === 'medium' ? 6 : 8;
    const waves: {
      amplitude: number;
      frequency: number;
      speed: number;
      phase: number;
      opacity: number;
      y: number;
      lineWidth: number;
    }[] = [];
    
    // Create waves with different properties
    for (let i = 0; i < waveCount; i++) {
      waves.push({
        amplitude: 8 + Math.random() * 25, // Reduced amplitude
        frequency: 0.005 + Math.random() * 0.015,
        speed: 0.05 + Math.random() * 0.2, // Reduced speed
        phase: Math.random() * Math.PI * 2,
        opacity: 0.1 + Math.random() * 0.15, // Reduced opacity
        y: canvas.height * (0.3 + Math.random() * 0.4), // Distribute waves vertically
        lineWidth: 1.5 + Math.random() * 2.5 // Thinner lines
      });
    }
    
    // Color mapping
    const colorMap: Record<string, string> = {
      blue: 'rgba(59, 130, 246, ',
      indigo: 'rgba(99, 102, 241, ',
      purple: 'rgba(139, 92, 246, ',
      green: 'rgba(16, 185, 129, ',
      red: 'rgba(239, 68, 68, '
    };
    
    const baseColor = colorMap[color] || colorMap.blue;
    
    // Animation loop
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      waves.forEach(wave => {
        wave.phase += wave.speed / 100;
        
        ctx.beginPath();
        
        for (let x = 0; x < canvas.width; x += 5) { // Increased step for better performance
          const y = wave.y + 
                   Math.sin(x * wave.frequency + wave.phase) * 
                   wave.amplitude * 
                   Math.sin(Date.now() / 2000);
          
          if (x === 0) {
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
      style={{ opacity: 0.4 }} // Reduced opacity
    />
  );
};

export default AudioWaveBackground;