import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Volume2, Music, Radio } from 'lucide-react';

interface MicrophoneParticlesBackgroundProps {
  color?: 'blue' | 'indigo' | 'purple' | 'green' | 'red';
  intensity?: 'low' | 'medium' | 'high';
}

const MicrophoneParticlesBackground: React.FC<MicrophoneParticlesBackgroundProps> = ({ 
  color = 'blue', 
  intensity = 'medium' 
}) => {
  // Determine number of particles based on intensity
  const particleCount = intensity === 'low' ? 15 : intensity === 'medium' ? 25 : 35;
  
  // Color mapping
  const colorMap: Record<string, {bg: string, icon: string}> = {
    blue: {
      bg: 'rgba(59, 130, 246, ',
      icon: 'rgba(59, 130, 246, '
    },
    indigo: {
      bg: 'rgba(99, 102, 241, ',
      icon: 'rgba(99, 102, 241, '
    },
    purple: {
      bg: 'rgba(139, 92, 246, ',
      icon: 'rgba(139, 92, 246, '
    },
    green: {
      bg: 'rgba(16, 185, 129, ',
      icon: 'rgba(16, 185, 129, '
    },
    red: {
      bg: 'rgba(239, 68, 68, ',
      icon: 'rgba(239, 68, 68, '
    }
  };
  
  const colors = colorMap[color] || colorMap.blue;
  
  // Icons to use
  const icons = [Mic, Volume2, Music, Radio];
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: particleCount }).map((_, i) => {
        // Determine if this particle should be an icon (1 in 4 chance)
        const isIcon = i % 4 === 0;
        const IconComponent = icons[i % icons.length];
        
        return (
          <motion.div
            key={i}
            className={`absolute ${isIcon ? 'w-8 h-8' : 'w-3 h-3'} rounded-full flex items-center justify-center`}
            style={{
              backgroundColor: isIcon ? `${colors.bg}0.15)` : `${colors.bg}0.1)`,
              boxShadow: isIcon ? `0 0 10px ${colors.bg}0.2)` : 'none'
            }}
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: Math.random() * 0.3 + 0.2, // Reduced base opacity
              scale: Math.random() * 0.4 + 0.7 // Smaller particles
            }}
            animate={{
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight
              ],
              opacity: [
                Math.random() * 0.2 + 0.2,
                Math.random() * 0.3 + 0.3,
                Math.random() * 0.2 + 0.2
              ],
              scale: isIcon ? [0.7, 0.9, 0.7] : [1, 1.2, 1] // Reduced pulsing effect
            }}
            transition={{
              duration: 20 + Math.random() * 20, // Slower movement
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {isIcon ? (
              <IconComponent style={{ color: `${colors.icon}0.6)` }} className="h-5 w-5" />
            ) : (
              <div className="w-1.5 h-2 rounded-full" style={{ backgroundColor: `${colors.icon}0.4)` }}></div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default MicrophoneParticlesBackground;