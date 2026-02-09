import { useState, useEffect, useCallback, useRef } from 'react';

interface ViewportSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

interface TouchGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
}

export function useViewport(): ViewportSize {
  const [viewport, setViewport] = useState<ViewportSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: false,
    isTablet: false,
    isDesktop: true
  });

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setViewport({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024
      });
    };

    updateViewport();
    
    const debouncedUpdate = debounce(updateViewport, 100);
    window.addEventListener('resize', debouncedUpdate);
    window.addEventListener('orientationchange', debouncedUpdate);

    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      window.removeEventListener('orientationchange', debouncedUpdate);
    };
  }, []);

  return viewport;
}

export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold: number = 50
) {
  const [gesture, setGesture] = useState<TouchGesture | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const startX = touchStartRef.current.x;
    const startY = touchStartRef.current.y;
    const endX = touch.clientX;
    const endY = touch.clientY;

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < threshold) return;

    let direction: TouchGesture['direction'] = null;

    // Determine primary direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      direction = deltaX > 0 ? 'right' : 'left';
    } else {
      direction = deltaY > 0 ? 'down' : 'up';
    }

    const gestureData: TouchGesture = {
      startX,
      startY,
      endX,
      endY,
      direction,
      distance
    };

    setGesture(gestureData);

    // Execute callbacks
    switch (direction) {
      case 'left':
        onSwipeLeft?.();
        break;
      case 'right':
        onSwipeRight?.();
        break;
      case 'up':
        onSwipeUp?.();
        break;
      case 'down':
        onSwipeDown?.();
        break;
    }

    touchStartRef.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  const bindGesture = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return { gesture, bindGesture };
}

export function useTouchFeedback() {
  const addTouchFeedback = useCallback((element: HTMLElement) => {
    const handleTouchStart = () => {
      element.style.transform = 'scale(0.98)';
      element.style.transition = 'transform 0.1s ease';
    };

    const handleTouchEnd = () => {
      element.style.transform = 'scale(1)';
      setTimeout(() => {
        element.style.transition = '';
      }, 100);
    };

    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  return { addTouchFeedback };
}

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const heightDifference = windowHeight - viewportHeight;
      
      // Consider keyboard open if height difference is significant (>150px)
      setKeyboardHeight(heightDifference > 150 ? heightDifference : 0);
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return keyboardHeight;
}

export function useSafeAreaInsets() {
  const [insets, setInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  useEffect(() => {
    const updateInsets = () => {
      const style = getComputedStyle(document.documentElement);
      
      setInsets({
        top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0')
      });
    };

    updateInsets();
    
    // Re-check when orientation changes
    window.addEventListener('orientationchange', updateInsets);
    return () => window.removeEventListener('orientationchange', updateInsets);
  }, []);

  return insets;
}

// Mobile-optimized scroll hook
export function useMobileScroll(threshold: number = 100) {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleScroll = () => {
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      setScrollPosition(currentScrollTop);
      setIsScrolling(true);
      
      // Determine scroll direction
      if (currentScrollTop > lastScrollTop.current) {
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }
      
      lastScrollTop.current = currentScrollTop;

      // Clear scrolling state after delay
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScrolling(false);
        setScrollDirection(null);
      }, 150);
    };

    const debouncedScroll = debounce(handleScroll, 10);
    window.addEventListener('scroll', debouncedScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', debouncedScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  return { isScrolling, scrollDirection, scrollPosition };
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Performance optimization for touch devices
export function usePerformanceMode() {
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setShouldReduceMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);

    // Simple low power mode detection (heuristic)
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|Android/i.test(userAgent);
    const hasLimitedMemory = (navigator as any).deviceMemory && (navigator as any).deviceMemory < 4;
    
    setIsLowPowerMode(isMobile && hasLimitedMemory);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return { isLowPowerMode, shouldReduceMotion };
}