import React, { useState } from "react";

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  size = 'md', 
  animate = true,
  className = ''
}) => {
  const [currentColorSet, setCurrentColorSet] = useState(0);
  
  React.useEffect(() => {
    if (!animate) return;
    
    const interval = setInterval(() => {
      setCurrentColorSet(prev => (prev + 1) % 4);
    }, 1200); // Slower on homepage
    
    return () => clearInterval(interval);
  }, [animate]);

  const baseColors = ['#FF6B47', '#4285F4', '#FFD23F', '#1A1A1A']; // correct brand colors
  
  // Create 4 different color arrangements for clockwise rotation
  // Positions: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
  // Clockwise cycle: 0->1->3->2->0
  const colorSets = [
    baseColors, // original: red(0), blue(1), yellow(2), black(3)
    [baseColors[2], baseColors[0], baseColors[3], baseColors[1]], // yellow(0), red(1), black(2), blue(3)
    [baseColors[3], baseColors[2], baseColors[1], baseColors[0]], // black(0), yellow(1), blue(2), red(3)
    [baseColors[1], baseColors[3], baseColors[0], baseColors[2]]  // blue(0), black(1), red(2), yellow(3)
  ];
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16', 
    lg: 'w-20 h-20'
  };
  
  const currentColors = animate ? colorSets[currentColorSet] : baseColors;
  
  return (
    <div className={`${sizeClasses[size]} bg-white flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 40 40" className="w-3/4 h-3/4">
        <rect 
          x="5" y="5" width="14" height="14" 
          fill={currentColors[0]}
          className="transition-colors duration-500 ease-in-out"
        />
        <rect 
          x="21" y="5" width="14" height="14" 
          fill={currentColors[1]}
          className="transition-colors duration-500 ease-in-out"
        />
        <rect 
          x="5" y="21" width="14" height="14" 
          fill={currentColors[2]}
          className="transition-colors duration-500 ease-in-out"
        />
        <rect 
          x="21" y="21" width="14" height="14" 
          fill={currentColors[3]}
          className="transition-colors duration-500 ease-in-out"
        />
      </svg>
    </div>
  );
};