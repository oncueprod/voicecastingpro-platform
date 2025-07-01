import React from 'react';
import { motion } from 'framer-motion';

interface GradientWaveBackgroundProps {
  color?: 'blue' | 'indigo' | 'purple' | 'green' | 'red';
  intensity?: 'low' | 'medium' | 'high';
}

const GradientWaveBackground: React.FC<GradientWaveBackgroundProps> = ({ 
  color = 'blue', 
  intensity = 'medium' 
}) => {
  // Determine opacity based on intensity
  const baseOpacity = intensity === 'low' ? 0.15 : intensity === 'medium' ? 0.25 : 0.35;
  
  // Color mapping
  const colorMap: Record<string, {primary: string, secondary: string, tertiary: string}> = {
    blue: {
      primary: '#3b82f6',
      secondary: '#60a5fa',
      tertiary: '#2563eb'
    },
    indigo: {
      primary: '#6366f1',
      secondary: '#818cf8',
      tertiary: '#4f46e5'
    },
    purple: {
      primary: '#8b5cf6',
      secondary: '#a78bfa',
      tertiary: '#7c3aed'
    },
    green: {
      primary: '#10b981',
      secondary: '#34d399',
      tertiary: '#059669'
    },
    red: {
      primary: '#ef4444',
      secondary: '#f87171',
      tertiary: '#dc2626'
    }
  };
  
  const colors = colorMap[color] || colorMap.blue;
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div 
        className="absolute inset-0 gradient-morph"
        style={{
          opacity: baseOpacity,
          background: `
            radial-gradient(circle at 30% 30%, ${colors.primary}, transparent 60%), 
            radial-gradient(circle at 70% 70%, ${colors.secondary}, transparent 60%),
            radial-gradient(circle at 50% 50%, ${colors.tertiary}, transparent 70%)
          `,
          backgroundBlendMode: 'screen',
          filter: 'blur(50px)' // More blur for subtlety
        }}
        animate={{
          background: [
            `
              radial-gradient(circle at 30% 30%, ${colors.primary}, transparent 60%), 
              radial-gradient(circle at 70% 70%, ${colors.secondary}, transparent 60%),
              radial-gradient(circle at 50% 50%, ${colors.tertiary}, transparent 70%)
            `,
            `
              radial-gradient(circle at 70% 30%, ${colors.secondary}, transparent 60%), 
              radial-gradient(circle at 30% 70%, ${colors.primary}, transparent 60%),
              radial-gradient(circle at 50% 50%, ${colors.tertiary}, transparent 70%)
            `,
            `
              radial-gradient(circle at 30% 30%, ${colors.primary}, transparent 60%), 
              radial-gradient(circle at 70% 70%, ${colors.secondary}, transparent 60%),
              radial-gradient(circle at 50% 50%, ${colors.tertiary}, transparent 70%)
            `
          ]
        }}
        transition={{
          duration: 20, // Slower transition
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Add floating gradient blobs for more visual interest */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            background: i % 2 === 0 ? colors.primary : colors.secondary,
            width: 80 + Math.random() * 150, // Smaller blobs
            height: 80 + Math.random() * 150,
            opacity: 0.1, // Reduced opacity
            filter: 'blur(70px)' // More blur
          }}
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight
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
            opacity: [0.1, 0.15, 0.1] // Reduced opacity variation
          }}
          transition={{
            duration: 25 + Math.random() * 20, // Slower movement
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
};

export default GradientWaveBackground;