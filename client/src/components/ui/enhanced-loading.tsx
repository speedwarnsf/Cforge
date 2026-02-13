import React, { useState, useEffect, memo } from 'react';
import { Loader2, Zap, Brain, Sparkles, Target, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingStep {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  emoji: string;
}

interface EnhancedLoadingProps {
  isVisible: boolean;
  type?: 'generation' | 'analysis' | 'saving' | 'loading';
  progress?: number;
  currentStep?: string;
  onCancel?: () => void;
  canCancel?: boolean;
}

const generationSteps: LoadingStep[] = [
  {
    id: 'analyzing',
    icon: Brain,
    title: 'Analyzing Brief',
    description: 'Understanding context and requirements',
    emoji: ''
  },
  {
    id: 'exploring',
    icon: Sparkles,
    title: 'Exploring Ideas',
    description: 'Searching rhetorical framework library',
    emoji: ''
  },
  {
    id: 'generating',
    icon: Zap,
    title: 'Generating Concepts',
    description: 'Crafting original creative solutions',
    emoji: ''
  },
  {
    id: 'evaluating',
    icon: Target,
    title: 'Quality Check',
    description: 'Running originality and impact analysis',
    emoji: ''
  },
  {
    id: 'finalizing',
    icon: CheckCircle,
    title: 'Polishing',
    description: 'Final refinements and optimization',
    emoji: ''
  }
];

const stepMap: Record<string, number> = {
  'analyzing': 0,
  'exploring': 1,
  'generating': 2,
  'evaluating': 3,
  'finalizing': 4,
  'complete': 5
};

export const EnhancedLoadingOverlay = memo(({ 
  isVisible, 
  type = 'generation',
  progress,
  currentStep,
  onCancel,
  canCancel = true
}: EnhancedLoadingProps) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [localProgress, setLocalProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setActiveStepIndex(0);
      setLocalProgress(0);
      return;
    }

    // Use provided step or progress to determine active step
    let targetStep = 0;
    if (currentStep && stepMap[currentStep] !== undefined) {
      targetStep = stepMap[currentStep];
    } else if (progress !== undefined) {
      targetStep = Math.floor((progress / 100) * generationSteps.length);
    }

    setActiveStepIndex(Math.min(targetStep, generationSteps.length - 1));
    setLocalProgress(progress || ((targetStep + 1) / generationSteps.length) * 100);
  }, [isVisible, currentStep, progress]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        style={{ WebkitBackdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-slate-900/95 border border-slate-700/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4"
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ConceptForge Working
            </h2>
            
            <p className="text-slate-400 text-sm mt-2">
              Creating your breakthrough campaign concept
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(localProgress)}%</span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${localProgress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              />
            </div>
          </div>

          {/* Current step */}
          <div className="mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStepIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl"
              >
                <div className="text-blue-400">
                  {(() => { const Icon = generationSteps[activeStepIndex]?.icon; return Icon ? <Icon className="w-6 h-6" /> : null; })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold">
                    {generationSteps[activeStepIndex]?.title}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {generationSteps[activeStepIndex]?.description}
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-5 h-5 text-blue-400" />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {generationSteps.map((_, index) => (
              <motion.div
                key={index}
                initial={false}
                animate={{
                  scale: index === activeStepIndex ? 1.2 : 1,
                  backgroundColor: index <= activeStepIndex ? '#3b82f6' : '#475569'
                }}
                transition={{ duration: 0.2 }}
                className="w-2 h-2 rounded-full"
              />
            ))}
          </div>

          {/* Cancel button */}
          {canCancel && onCancel && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel Generation
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

EnhancedLoadingOverlay.displayName = 'EnhancedLoadingOverlay';

// Lightweight loading spinner for inline use
export const InlineLoader = ({ 
  size = 'sm', 
  text,
  className = '' 
}: { 
  size?: 'xs' | 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-500`} />
      {text && (
        <span className="text-sm text-slate-400 animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
};

// Skeleton loader for content areas
export const SkeletonLoader = ({ 
  lines = 3,
  className = '',
  animated = true 
}: { 
  lines?: number;
  className?: string;
  animated?: boolean;
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-slate-700/50 rounded ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${85 + Math.random() * 15}%`
          }}
        />
      ))}
    </div>
  );
};

// Card loading state
export const LoadingCard = ({ 
  className = '',
  showImage = true 
}: { 
  className?: string;
  showImage?: boolean;
}) => {
  return (
    <div className={`border border-slate-700/50 rounded-xl p-6 ${className}`}>
      {showImage && (
        <div className="h-40 bg-slate-700/50 rounded-lg animate-pulse mb-4" />
      )}
      <div className="space-y-3">
        <div className="h-6 bg-slate-700/50 rounded animate-pulse" />
        <SkeletonLoader lines={2} />
        <div className="h-4 bg-slate-700/50 rounded animate-pulse w-1/3" />
      </div>
    </div>
  );
};