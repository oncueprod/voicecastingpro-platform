import React from 'react';
import AudioWaveBackground from './AudioWaveBackground';
import SoundRippleBackground from './SoundRippleBackground';
import MicrophoneParticlesBackground from './MicrophoneParticlesBackground';
import GradientWaveBackground from './GradientWaveBackground';

interface AnimatedBackgroundProps {
  type?: 'waveform' | 'particles' | 'ripples' | 'gradient';
  color?: 'blue' | 'indigo' | 'purple' | 'green' | 'red';
  intensity?: 'low' | 'medium' | 'high';
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
  type = 'waveform', 
  color = 'blue', 
  intensity = 'medium' 
}) => {
  // Render the appropriate background based on the type
  switch (type) {
    case 'waveform':
      return <AudioWaveBackground color={color} intensity={intensity} />;
    case 'particles':
      return <MicrophoneParticlesBackground color={color} intensity={intensity} />;
    case 'ripples':
      return <SoundRippleBackground color={color} intensity={intensity} />;
    case 'gradient':
      return <GradientWaveBackground color={color} intensity={intensity} />;
    default:
      return <AudioWaveBackground color={color} intensity={intensity} />;
  }
};

export default AnimatedBackground;