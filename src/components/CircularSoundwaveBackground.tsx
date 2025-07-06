import React, { useEffect, useRef } from 'react';

interface CircularSoundwaveBackgroundProps {
  color?: 'blue' | 'indigo' | 'purple' | 'green' | 'red';
  intensity?: 'low' | 'medium' | 'high';
}

const CircularSoundwaveBackground: React.FC<CircularSoundwaveBackgroundProps> = ({ 
  color = 'blue', 
  intensity = 'medium' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef<number>(0);
  const circlesRef = useRef<any[]>([]);
  
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
        circleCount: 7,
        sourceCount: 4,
        maxRadius: 350,
        opacity: 0.4,
        speed: 0.6,
        lineWidth: 2
      },
      medium: {
        circleCount: 10,
        sourceCount: 6,
        maxRadius: 400,
        opacity: 0.4,
        speed: 0.7,
        lineWidth: 2.5
      },
      high: {
        circleCount: 15,
        sourceCount: 8,
        maxRadius: 500,
        opacity: 0.5,
        speed: 1.1,
        lineWidth: 3
      }
    };
    
    const settings = intensitySettings[intensity];
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create sound sources (points from which circles emanate)
    const createSoundSources = () => {
      const sources = [];
      
      for (let i = 0; i < settings.sourceCount; i++) {
        sources.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          // Each source has slightly different properties
          speed: settings.speed * (0.9 + Math.random() * 0.3),
          maxRadius: settings.maxRadius * (0.8 + Math.random() * 0.5),
          opacity: settings.opacity * (0.9 + Math.random() * 0.3),
          lineWidth: settings.lineWidth * (0.9 + Math.random() * 0.3),
          // Pulsing frequency
          pulseSpeed: 0.5 + Math.random() * 1.5,
          // Delay between circle spawns
          spawnDelay: 1 + Math.random() * 2,
          lastSpawnTime: -Math.random() * 3 // Stagger initial spawns
        });
      }
      
      return sources;
    };
    
    // Initialize circles
    const initializeCircles = () => {
      const sources = createSoundSources();
      circlesRef.current = [];
      
      // Pre-populate with some circles
      sources.forEach(source => {
        for (let i = 0; i < 4; i++) {
          if (Math.random() > 0.3) {
            circlesRef.current.push({
              x: source.x,
              y: source.y,
              radius: Math.random() * source.maxRadius,
              maxRadius: source.maxRadius,
              speed: source.speed,
              opacity: source.opacity * (1 - (Math.random() * source.maxRadius) / source.maxRadius),
              lineWidth: source.lineWidth,
              sourceIndex: sources.indexOf(source)
            });
          }
        }
      });
      
      return sources;
    };
    
    // Initialize sound sources and circles
    const sources = initializeCircles();
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      timeRef.current += 0.016; // Roughly 60fps
      
      // Update existing circles
      for (let i = circlesRef.current.length - 1; i >= 0; i--) {
        const circle = circlesRef.current[i];
        
        // Expand radius
        circle.radius += circle.speed;
        
        // Fade out as the circle expands
        circle.opacity = circle.opacity * 0.992;
        
        // Draw circle
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.strokeStyle = baseColor + circle.opacity + ')';
        ctx.lineWidth = circle.lineWidth;
        ctx.stroke();
        
        // Remove circles that are too large or too faded
        if (circle.radius > circle.maxRadius || circle.opacity < 0.02) {
          circlesRef.current.splice(i, 1);
        }
      }
      
      // Spawn new circles from sources
      sources.forEach((source, index) => {
        // Update source position with gentle movement
        source.x += Math.sin(timeRef.current * 0.15 + index) * 0.4;
        source.y += Math.cos(timeRef.current * 0.2 + index * 0.7) * 0.4;
        
        // Keep sources within canvas bounds
        source.x = Math.max(0, Math.min(canvas.width, source.x));
        source.y = Math.max(0, Math.min(canvas.height, source.y));
        
        // Check if it's time to spawn a new circle
        if (timeRef.current - source.lastSpawnTime > source.spawnDelay) {
          // Pulse effect - spawn circles at varying rates
          const pulseIntensity = 0.5 + 0.5 * Math.sin(timeRef.current * source.pulseSpeed * 0.8);
          
          // Higher chance to spawn during pulse peaks
          if (Math.random() < pulseIntensity * 0.3) {
            circlesRef.current.push({
              x: source.x,
              y: source.y,
              radius: 0, // Start from zero
              maxRadius: source.maxRadius * (0.85 + Math.random() * 0.3),
              speed: source.speed * (0.85 + Math.random() * 0.3),
              opacity: source.opacity * (0.9 + Math.random() * 0.3),
              lineWidth: source.lineWidth * (0.9 + pulseIntensity * 0.5), // Thicker lines during peaks
              sourceIndex: index
            });
            
            source.lastSpawnTime = timeRef.current;
          }
        }
      });
      
      // Occasionally move sound sources to new positions
      if (Math.random() < 0.001) {
        const sourceIndex = Math.floor(Math.random() * sources.length);
        sources[sourceIndex].x = Math.random() * canvas.width;
        sources[sourceIndex].y = Math.random() * canvas.height;
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
      style={{ opacity: 0.6 }}
    />
  );
};

export default CircularSoundwaveBackground;