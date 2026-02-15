import React, { useState, useEffect, useCallback } from 'react';
import { StoredConcept } from '@/lib/conceptStorage';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2 } from 'lucide-react';

interface PresentationModeProps {
  concepts: StoredConcept[];
  initialIndex?: number;
  onClose: () => void;
}

export default function PresentationMode({ concepts, initialIndex = 0, onClose }: PresentationModeProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const concept = concepts[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, concepts.length - 1));
  }, [concepts.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'f') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, onClose]);

  // Auto-hide controls after 3s of no mouse movement
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handleMove = () => {
      setShowControls(true);
      clearTimeout(timer);
      timer = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener('mousemove', handleMove);
    timer = setTimeout(() => setShowControls(false), 3000);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      clearTimeout(timer);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (!concept) return null;

  const scores = [
    { label: 'ORIGINALITY', value: concept.originalityScore },
    { label: 'PROFESSIONALISM', value: concept.professionalismScore },
    { label: 'CLARITY', value: concept.clarityScore },
    { label: 'FRESHNESS', value: concept.freshnessScore },
    { label: 'RESONANCE', value: concept.resonanceScore },
    { label: 'AWARDS', value: concept.awardsScore },
  ].filter(s => s.value && s.value > 0);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-4 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <div className="text-xs font-mono text-gray-500 tracking-widest uppercase">
          {currentIndex + 1} / {concepts.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-500 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main slide */}
      <div className="flex-1 flex items-center justify-center px-16 py-20">
        <div className="max-w-4xl w-full">
          {/* Slide number */}
          <div className="text-[120px] font-black text-white/[0.03] absolute top-8 right-16 select-none leading-none">
            {String(currentIndex + 1).padStart(2, '0')}
          </div>

          {/* Tags */}
          {concept.tags && concept.tags.length > 0 && (
            <div className="flex gap-2 mb-6">
              {concept.tags.map(tag => (
                <span key={tag} className="px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-gray-500 border border-gray-800">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-4">
            {concept.headlines[0] || 'Untitled'}
          </h1>

          {/* Tagline */}
          {concept.tagline && (
            <p className="text-xl md:text-2xl text-cyan-400 italic mb-8">
              {concept.tagline}
            </p>
          )}

          {/* Device badge */}
          <div className="inline-block border border-white/20 px-4 py-1.5 text-[11px] font-mono uppercase tracking-[3px] text-white/50 mb-10">
            {concept.rhetoricalDevice}
          </div>

          {/* Body copy */}
          {concept.bodyCopy && (
            <p className="text-lg text-white/70 leading-relaxed max-w-2xl mb-8">
              {concept.bodyCopy}
            </p>
          )}

          {/* Visual direction */}
          {concept.visualDescription && (
            <div className="border-l-2 border-white/10 pl-6 mb-8">
              <div className="text-[9px] font-mono uppercase tracking-[3px] text-white/30 mb-2">Visual Direction</div>
              <p className="text-sm text-white/50 italic leading-relaxed">
                {concept.visualDescription}
              </p>
            </div>
          )}

          {/* Scores */}
          {scores.length > 0 && (
            <div className="flex gap-6 mt-10">
              {scores.map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-black text-blue-400">{s.value}</div>
                  <div className="text-[8px] font-mono uppercase tracking-[2px] text-white/30 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation arrows */}
      <div
        className="absolute inset-y-0 left-0 flex items-center transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="p-6 text-gray-600 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-default"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      </div>
      <div
        className="absolute inset-y-0 right-0 flex items-center transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <button
          onClick={goNext}
          disabled={currentIndex === concepts.length - 1}
          className="p-6 text-gray-600 hover:text-white transition-colors disabled:opacity-20 disabled:cursor-default"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900">
        <div
          className="h-full bg-white/20 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / concepts.length) * 100}%` }}
        />
      </div>

      {/* Keyboard hints */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 text-[10px] font-mono text-gray-600 transition-opacity duration-300"
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <span>LEFT/RIGHT arrows to navigate</span>
        <span>F for fullscreen</span>
        <span>ESC to exit</span>
      </div>
    </div>
  );
}
