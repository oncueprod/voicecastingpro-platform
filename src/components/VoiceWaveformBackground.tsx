import React, { useEffect, useRef } from 'react';

interface VoiceWaveformBackgroundProps {
  color?: 'blue' | 'indigo' | 'purple' | 'green' | 'red';
  intensity?: 'low' | 'medium' | 'high';
}

const VoiceWaveformBackground: React.FC<VoiceWaveformBackgroundProps> = ({ 
  color = 'blue', 
  intensity = 'medium' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef<number>(0);
  const waveformDataRef = useRef<any[]>([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
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
        barCount: 100,
        maxHeight: 100,
        opacity: 0.3,
        speed: 2.0
      },
      medium: {
        barCount: 120,
        maxHeight: 150,
        opacity: 0.4,
        speed: 2.5
      },
      high: {
        barCount: 140,
        maxHeight: 200,
        opacity: 0.5,
        speed: 3.0
      }
    };
    
    const settings = intensitySettings[intensity];
    
    // Create waveform data
    function createWaveformData() {
      const waveformData = [];
      
      for (let i = 0; i < settings.barCount; i++) {
        // Create a more natural voice pattern
        // Voice patterns typically have higher amplitudes in the middle frequencies
        let heightFactor;
        
        if (i < settings.barCount * 0.15 || i > settings.barCount * 0.85) {
          // Lower amplitudes at the edges (low and high frequencies)
          heightFactor = 0.2 + Math.random() * 0.2;
        } else if (i > settings.barCount * 0.3 && i < settings.barCount * 0.7) {
          // Higher amplitudes in the middle (mid frequencies where voice is strongest)
          heightFactor = 0.5 + Math.random() * 0.5;
        } else {
          // Transition areas
          heightFactor = 0.3 + Math.random() * 0.3;
        }
        
        waveformData.push({
          x: i * (barWidth + gap),
          height: settings.maxHeight * heightFactor,
          speed: (0.7 + Math.random() * 0.6) * settings.speed,
          phase: Math.random() * Math.PI * 2,
          opacity: (0.3 + Math.random() * 0.7) * settings.opacity,
          // Add additional oscillators with different frequencies for more complex movement
          oscillators: [
            { freq: 1.0 + Math.random() * 0.2, amp: 0.6 + Math.random() * 0.4 },
            { freq: 0.5 + Math.random() * 0.3, amp: 0.3 + Math.random() * 0.3 },
            { freq: 1.5 + Math.random() * 0.5, amp: 0.2 + Math.random() * 0.2 }
          ],
          // Add variation factors
          variationSpeed: 0.01 + Math.random() * 0.02,
          breathingFactor: 0.1 + Math.random() * 0.1,
          spikeChance: 0.001 + Math.random() * 0.002
        });
      }
      
      return waveformData;
    };
    
    // Create bars with properties
    const barWidth = Math.max(2, Math.floor(canvas.width / settings.barCount));
    const gap = 2;
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Recreate waveform data when canvas is resized
      waveformDataRef.current = createWaveformData();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize waveform data if not already created
    if (waveformDataRef.current.length === 0) {
      waveformDataRef.current = createWaveformData();
    }
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      timeRef.current += 0.01;
      
      // Draw center line (like in audio editors)
      const centerY = canvas.height / 2;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.strokeStyle = baseColor + '0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw bars
      waveformDataRef.current.forEach((bar, index) => {
        // Calculate height using multiple oscillators for more natural movement
        let height = 0;
        bar.oscillators.forEach(osc => {
          height += osc.amp * Math.sin(timeRef.current * bar.speed * osc.freq + bar.phase);
        });
        
        // Normalize height to be between 0 and 1, then scale by bar height
        height = ((height / bar.oscillators.length) * 0.5 + 0.5) * bar.height;
        
        // Add occasional "spikes" for emphasis (like in speech)
        const spike = Math.random() < bar.spikeChance ? bar.height * 0.5 : 0;
        
        // Add "breathing" effect to simulate natural voice cadence
        const breathingEffect = Math.sin(timeRef.current * 0.2 + index * 0.01) * bar.height * bar.breathingFactor;
        
        // Draw bar (centered vertically)
        ctx.fillStyle = baseColor + bar.opacity + ')';
        ctx.fillRect(
          bar.x, 
          centerY - (height + spike + breathingEffect) / 2, 
          barWidth, 
          height + spike + breathingEffect
        );
        
        // Continuously update phase to keep animation fresh
        bar.phase += bar.variationSpeed * (0.8 + Math.random() * 0.4);
        
        // Occasionally update oscillator frequencies to prevent patterns
        if (Math.random() < 0.005) {
          bar.oscillators.forEach(osc => {
            osc.freq = osc.freq * (0.95 + Math.random() * 0.1);
            osc.amp = Math.max(0.1, Math.min(0.9, osc.amp * (0.95 + Math.random() * 0.1)));
          });
        }
        
        // Occasionally update variation factors
        if (Math.random() < 0.002) {
          bar.variationSpeed = 0.01 + Math.random() * 0.02;
          bar.breathingFactor = 0.1 + Math.random() * 0.1;
          bar.spikeChance = 0.001 + Math.random() * 0.002;
        }
      });
      
      // Continuously refresh a small portion of the bars to keep animation dynamic
      if (Math.random() < 0.05) {
        const barIndex = Math.floor(Math.random() * waveformDataRef.current.length);
        const newBar = createWaveformData()[0];
        
        // Only update certain properties to maintain visual continuity
        waveformDataRef.current[barIndex].speed = newBar.speed;
        waveformDataRef.current[barIndex].phase = newBar.phase;
        waveformDataRef.current[barIndex].oscillators = newBar.oscillators;
      }
      
      // Every few seconds, refresh a larger batch of bars
      if (Math.floor(timeRef.current * 100) % 50 === 0) {
        const startIndex = Math.floor(Math.random() * (waveformDataRef.current.length - 20));
        const refreshCount = 5 + Math.floor(Math.random() * 15);
        
        for (let i = 0; i < refreshCount; i++) {
          if (startIndex + i < waveformDataRef.current.length) {
            const newBar = createWaveformData()[0];
            waveformDataRef.current[startIndex + i].height = newBar.height;
            waveformDataRef.current[startIndex + i].speed = newBar.speed;
            waveformDataRef.current[startIndex + i].phase = newBar.phase;
            waveformDataRef.current[startIndex + i].oscillators = newBar.oscillators;
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [color, intensity]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.2 }}
    />
  );
};

export default VoiceWaveformBackground;