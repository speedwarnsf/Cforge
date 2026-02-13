import React, { useRef, useEffect } from 'react';
import { useVideo } from '@/hooks/use-video';
import { Loader2, Sparkles, Brain, CheckCircle, Zap, Terminal } from 'lucide-react';

const statusSteps = [
  { key: 'analyzing', icon: Brain, label: 'Analyzing brief...' },
  { key: 'exploring', icon: Sparkles, label: 'Exploring creative directions...' },
  { key: 'evolving', icon: Zap, label: 'Evolving concepts...' },
  { key: 'generating', icon: Zap, label: 'Generating concepts...' },
  { key: 'evaluating', icon: CheckCircle, label: 'Evaluating quality...' },
  { key: 'saving', icon: Loader2, label: 'Saving to history...' },
  { key: 'complete', icon: CheckCircle, label: 'Complete!' },
];

export default function GenerationStatusOverlay() {
  const { isForgeAnimating, generationStatus } = useVideo();
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [generationStatus?.logs]);

  if (!isForgeAnimating || !generationStatus) return null;

  const currentStepIndex = statusSteps.findIndex(s => s.key === generationStatus.step);
  const logs = generationStatus.logs || [];

  return (
    <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[60000] pointer-events-none">
      {/* Status Card - Responsive: smaller on mobile */}
      <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-none md:rounded-none p-3 md:p-4 shadow-2xl w-72 md:w-96 pointer-events-auto">
        {/* Animated Header - Responsive */}
        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          <div className="relative">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-none bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 text-white animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-none bg-gradient-to-r from-blue-500 to-purple-500 animate-ping opacity-25"></div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm md:text-base font-semibold text-white">
              Forging Concepts
            </h3>
            <p className="text-gray-400 text-[10px] md:text-xs truncate">
              {generationStatus.detail || 'Please wait...'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="h-2 bg-gray-700 rounded-none overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
              style={{ width: `${generationStatus.progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] md:text-xs text-gray-500">
              {statusSteps[currentStepIndex]?.label || 'Processing...'}
            </span>
            <span className="text-[10px] md:text-xs text-gray-400 font-mono">
              {generationStatus.progress}%
            </span>
          </div>
        </div>

        {/* Progress Steps - Compact */}
        <div className="flex gap-1 mb-3">
          {statusSteps.slice(0, -1).map((step, index) => {
            const isActive = index === currentStepIndex;
            const isComplete = index < currentStepIndex;

            return (
              <div
                key={step.key}
                className={`flex-1 h-1 rounded-none transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-500'
                    : isComplete
                    ? 'bg-green-500'
                    : 'bg-gray-700'
                }`}
              />
            );
          })}
        </div>

        {/* Live Log Window */}
        <div className="border border-gray-700 rounded-none overflow-hidden">
          <div className="flex items-center gap-2 px-2 py-1 bg-gray-800 border-b border-gray-700">
            <Terminal className="w-3 h-3 text-green-400" />
            <span className="text-[10px] md:text-xs text-gray-400 font-mono">Live Activity</span>
            <div className="ml-auto flex gap-1">
              <div className="w-2 h-2 rounded-none bg-red-500"></div>
              <div className="w-2 h-2 rounded-none bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-none bg-green-500"></div>
            </div>
          </div>
          <div
            ref={logContainerRef}
            className="h-24 md:h-32 overflow-y-auto overflow-x-hidden bg-gray-950 p-2 font-mono text-[9px] md:text-[10px] leading-relaxed break-words whitespace-pre-wrap"
          >
            {logs.length === 0 ? (
              <div className="text-gray-600 italic">Waiting for activity...</div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`text-gray-400 ${index === logs.length - 1 ? 'text-green-400' : ''}`}
                >
                  {log}
                </div>
              ))
            )}
            {/* Blinking cursor */}
            <span className="inline-block w-1.5 h-3 bg-green-400 animate-pulse ml-0.5"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
