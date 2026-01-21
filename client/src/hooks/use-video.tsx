import { useRef, useEffect, createContext, useContext, ReactNode, useState } from 'react';
import backgroundVideo from "@assets/clean_anvil_video.mp4";

interface VideoContextType {
  videoRef: React.RefObject<HTMLVideoElement>;
  playForgeAnimation: () => Promise<void>;
  isForgeAnimating: boolean;
}

const VideoContext = createContext<VideoContextType | null>(null);

export function VideoProvider({ children }: { children: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isForgeAnimating, setIsForgeAnimating] = useState(false);
  const [hasPlayedInitial, setHasPlayedInitial] = useState(false);

  useEffect(() => {
    // Play initial animation once when component mounts
    if (videoRef.current && !hasPlayedInitial) {
      const video = videoRef.current;

      const handleCanPlay = () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.currentTime = 0;
        video.loop = false;

        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setHasPlayedInitial(true);
          }).catch(() => {
            setHasPlayedInitial(true);
          });
        }
      };

      // Also try immediate play if already ready
      if (video.readyState >= 3) { // HAVE_FUTURE_DATA
        handleCanPlay();
      } else {
        video.addEventListener('canplay', handleCanPlay);
        video.load();
      }
    }
  }, [hasPlayedInitial]);

  const playForgeAnimation = (): Promise<void> => {
    return new Promise((resolve) => {
      if (videoRef.current) {
        setIsForgeAnimating(true);
        const video = videoRef.current;

        video.currentTime = 0;
        video.loop = false;
        video.style.opacity = "1.0"; // Full visibility during forge

        const handleEnded = () => {
          video.removeEventListener('ended', handleEnded);
          video.style.opacity = "0.3"; // Back to background opacity
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
  };

  return (
    <VideoContext.Provider value={{ videoRef, playForgeAnimation, isForgeAnimating }}>
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