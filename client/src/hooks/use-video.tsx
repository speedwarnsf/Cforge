import { useRef, createContext, useContext, ReactNode, useState, useCallback } from 'react';

interface GenerationStatus {
  step: string;
  progress: number;
  detail?: string;
  logs?: string[];
}

interface VideoContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
  playForgeAnimation: () => Promise<void>;
  playInitialAnimation: () => void;
  startForgeLoop: () => void;
  stopForgeLoop: () => void;
  isForgeAnimating: boolean;
  generationStatus: GenerationStatus | null;
  setGenerationStatus: (status: GenerationStatus | null) => void;
  addGenerationLog: (message: string) => void;
  clearGenerationLogs: () => void;
}

const VideoContext = createContext<VideoContextType | null>(null);

export function VideoProvider({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isForgeAnimating, setIsForgeAnimating] = useState(false);
  const [hasPlayedInitial, setHasPlayedInitial] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const loopingRef = useRef(false);

  // Function to play initial animation - called from HeroSection when video loads
  const playInitialAnimation = useCallback(() => {
    const video = videoRef.current;
    if (!video || hasPlayedInitial) return;

    console.log('🎬 playInitialAnimation called');
    video.loop = false;
    video.currentTime = 0;
    video.style.opacity = "0.6";

    // Handle video end - pause at last frame
    const handleEnded = () => {
      console.log('🎬 Initial animation ended, pausing at last frame');
      video.removeEventListener('ended', handleEnded);
      video.pause();
    };
    video.addEventListener('ended', handleEnded);

    video.play()
      .then(() => {
        console.log('🎬 Initial animation playing successfully');
        setHasPlayedInitial(true);
      })
      .catch((err) => {
        console.log('🎬 Autoplay blocked:', err.message);
        setHasPlayedInitial(true);
      });
  }, [hasPlayedInitial]);

  // Start looping animation (for generation)
  const startForgeLoop = useCallback(() => {
    if (videoRef.current && !loopingRef.current) {
      loopingRef.current = true;
      setIsForgeAnimating(true);
      const video = videoRef.current;

      video.currentTime = 0;
      video.loop = true;
      video.style.opacity = "1.0";
      video.play().catch(() => {});
    }
  }, []);

  // Stop looping and pause at end frame
  const stopForgeLoop = useCallback(() => {
    console.log('🎬 stopForgeLoop called');
    loopingRef.current = false;
    setIsForgeAnimating(false);

    if (videoRef.current) {
      const video = videoRef.current;
      video.loop = false;

      // Let current play finish, then pause
      const handleEnded = () => {
        video.removeEventListener('ended', handleEnded);
        video.pause();
        video.style.opacity = "0.6";
      };
      video.addEventListener('ended', handleEnded);
    }
  }, []);

  // Single play animation (legacy support)
  const playForgeAnimation = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (videoRef.current) {
        setIsForgeAnimating(true);
        const video = videoRef.current;

        video.currentTime = 0;
        video.loop = false;
        video.style.opacity = "1.0";

        const handleEnded = () => {
          video.removeEventListener('ended', handleEnded);
          video.pause(); // Stay on last frame
          video.style.opacity = "0.6";
          setIsForgeAnimating(false);
          resolve();
        };

        video.addEventListener('ended', handleEnded);
        video.play().catch(() => {
          handleEnded();
        });
      } else {
        resolve();
      }
    });
  }, []);

  // Add a log message to the generation status
  const addGenerationLog = useCallback((message: string) => {
    setGenerationStatus(prev => {
      if (!prev) return prev;
      const timestamp = new Date().toLocaleTimeString();
      const entry = `[${timestamp}] ${message}`;
      const currentLogs = prev.logs || [];
      return {
        ...prev,
        logs: [...currentLogs, entry].slice(-50) // Keep last 50 logs
      };
    });
  }, []);

  // Clear all generation logs
  const clearGenerationLogs = useCallback(() => {
    setGenerationStatus(prev => {
      if (!prev) return prev;
      return { ...prev, logs: [] };
    });
  }, []);

  return (
    <VideoContext.Provider value={{
      videoRef,
      playForgeAnimation,
      playInitialAnimation,
      startForgeLoop,
      stopForgeLoop,
      isForgeAnimating,
      generationStatus,
      setGenerationStatus,
      addGenerationLog,
      clearGenerationLogs
    }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within VideoProvider');
  }
  return context;
}