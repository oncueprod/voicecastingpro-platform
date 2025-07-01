import React from 'react';
import { motion } from 'framer-motion';

interface SoundRippleBackgroundProps {
  color?: 'blue' | 'indigo' | 'purple' | 'green' | 'red';
  intensity?: 'low' | 'medium' | 'high';
}

const SoundRippleBackground: React.FC<SoundRippleBackgroundProps> = ({ 
  color = 'blue', 
  intensity = 'medium' 
}) => {
  // Determine number of ripple sources based on intensity
  const rippleSourceCount = intensity === 'low' ? 3 : intensity === 'medium' ? 5 : 7;
  
  // Determine ripples per source based on intensity
  const ripplesPerSource = intensity === 'low' ? 2 : intensity === 'medium' ? 3 : 4;
  
  // Color mapping
  const colorMap: Record<string, string> = {
    blue: 'blue',
    indigo: 'indigo',
    purple: 'purple',
    green: 'green',
    red: 'red'
  };
  
  const borderColor = colorMap[color] || 'blue';
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: rippleSourceCount }).map((_, i) => (
        <div key={i} className="absolute" style={{
          left: `${20 + Math.random() * 60}%`,
          top: `${20 + Math.random() * 60}%`
        }}>
          {Array.from({ length: ripplesPerSource }).map((_, j) => (
            <motion.div
              key={j}
              className={`absolute rounded-full border border-${borderColor}-500/30`} // Reduced opacity
              style={{
                borderWidth: '2px', // Thinner borders
                borderColor: `rgba(${color === 'blue' ? '59, 130, 246' : 
                               color === 'indigo' ? '99, 102, 241' : 
                               color === 'purple' ? '139, 92, 246' : 
                               color === 'green' ? '16, 185, 129' : 
                               '239, 68, 68'}, 0.25)` // Reduced opacity
              }}
              initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.5 }}
              animate={{ 
                width: ['0px', '300px'], // Smaller ripples
                height: ['0px', '300px'], 
                x: [0, -150],
                y: [0, -150],
                opacity: [0.25, 0] // Start with lower opacity
              }}
              transition={{
                duration: 4 + j * 2,
                repeat: Infinity,
                delay: j * 2 + i * 0.5,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SoundRippleBackground;