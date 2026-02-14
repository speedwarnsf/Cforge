import ConceptForgeIdeationSection from "@/components/ConceptForgeIdeationSection";
import AiGenerator from "@/components/ai-generator";
import { useVideo } from "@/hooks/use-video";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useRef, useEffect } from "react";
import conceptForgeLogo from "@assets/Headline_1752875122000.png";
// Use static video paths for better bundle optimization
const backgroundVideoOptimized = "/videos/clean_anvil_video_optimized.mp4";
const backgroundVideoFallback = "/videos/clean_anvil_video_optimized.mp4"; // Use optimized for both

export default function Home() {
  const { playForgeAnimation, videoRef, isForgeAnimating, playInitialAnimation } = useVideo();
  const aiGeneratorRef = useRef<any>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Parallax scroll effect with logo fade-out
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const parallaxSpeed = -0.4;

      if (overlayRef.current) {
        overlayRef.current.style.transform = `translateY(${scrollY * parallaxSpeed}px) translateZ(0)`;
      }

      // Fade out logo as user scrolls to prevent blocking content
      if (logoRef.current) {
        const fadeStart = 150;
        const fadeDistance = 250;
        let opacity = 1;

        if (scrollY > fadeStart) {
          opacity = Math.max(0, 1 - (scrollY - fadeStart) / fadeDistance);
        }

        logoRef.current.style.opacity = opacity.toString();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const triggerForgeAnimation = async () => {
    await playForgeAnimation();
  };

  const handleGenerateComplete = (generationData: any) => {
    // Trigger the AI generator with the data from ConceptForgeIdeationSection
    if (aiGeneratorRef.current && aiGeneratorRef.current.triggerGeneration) {
      const originalOnComplete = generationData.onComplete;
      
      // Add completion callback to the generation data
      const enhancedGenerationData = {
        ...generationData,
        onCompleteCallback: () => {
          console.log('Home: Generation completed, notifying ConceptForge');
          if (originalOnComplete) {
            originalOnComplete();
          }
        }
      };
      
      aiGeneratorRef.current.triggerGeneration(enhancedGenerationData);
    }
  };

  return (
    <div className="min-h-screen text-white relative" style={{ background: 'transparent !important' }}>
      {/* Parallax Background Container */}
      <div className="fixed top-0 left-0 w-full h-screen overflow-hidden" style={{ zIndex: 0 }}>
        {/* Optimized Anvil Video Background */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{
            opacity: isForgeAnimating ? 1 : 0.6,
            transition: 'opacity 0.5s ease'
          }}
          muted
          playsInline
          preload="auto"
          poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHZpZXdCb3g9IjAgMCAxMjgwIDcyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMUUyOTNiIi8+Cjwvc3ZnPgo=" // Dark placeholder
          onLoadedData={() => {
            console.log('🎬 Optimized video loaded in Home, triggering initial animation');
            playInitialAnimation();
          }}
          onError={(e) => {
            console.warn('🎬 Video load error, falling back to original');
            // Fallback to original video if optimized version fails
            e.currentTarget.src = backgroundVideoFallback;
          }}
        >
          <source src={backgroundVideoOptimized} type="video/mp4" />
          <source src={backgroundVideoFallback} type="video/mp4" />
          <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white text-sm">
            Video not supported
          </div>
        </video>

        {/* Dark Blue/Slate Multiply Gradient - Over video and extending to background */}
        <div 
          ref={overlayRef}
          className="global-gradient-overlay absolute top-0 left-0 w-screen pointer-events-none"
          style={{
            height: '200vh',
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(51, 65, 85, 0.5) 30%, rgba(30, 58, 138, 0.3) 60%, rgba(15, 23, 42, 0.6) 100%), linear-gradient(135deg, rgba(30, 41, 59, 0.3) 0%, rgba(51, 65, 85, 0.4) 50%, rgba(30, 58, 138, 0.2) 100%)',
            mixBlendMode: 'multiply',
            zIndex: 2,
          }}
        />

        {/* ConceptForge Logo - Inside hero container */}
        <div 
          ref={logoRef}
          className="absolute pointer-events-none px-5"
          style={{
            top: '15vh',
            left: '50%',
            transform: 'translateX(-50%) scale(1.2) translateZ(0)',
            zIndex: 5,
            maxWidth: '450px',
          }}
        >
          <img 
            src={conceptForgeLogo} 
            alt="ConceptForge" 
            className="w-full h-auto max-w-[450px]"
            style={{
              filter: 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.9))',
            }}
          />
        </div>

      </div>

      {/* Admin Navigation - Only visible in development or with ?admin query param */}
      <div className="fixed right-4 top-4 flex gap-2 z-50">
        <Link href="/devices">
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs px-2 py-0.5 h-6 bg-black/60 border-white/20 text-white/60 hover:text-white transition-all"
          >
            293 Devices
          </Button>
        </Link>
        <Link href="/gallery">
          <Button 
            variant="outline" 
            size="sm"
            className="text-xs px-2 py-0.5 h-6 bg-black/60 border-amber-700/50 text-amber-400/70 hover:text-amber-300 transition-all"
          >
            Gallery
          </Button>
        </Link>
        {(import.meta.env.DEV || new URLSearchParams(window.location.search).has('admin')) && (
          <>
            <Link href="/test-admin">
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs px-2 py-0.5 h-6 bg-gray-500/70 border-gray-500/70 text-gray-300 hover:text-white transition-all"
              >
                Test
              </Button>
            </Link>
            <Link href="/review">
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs px-2 py-0.5 h-6 bg-gray-500/70 border-gray-500/70 text-gray-300 hover:text-white transition-all"
              >
                Review
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Background Continuation Layer - Minimal Height */}
      <div 
        className="absolute top-0 left-0 w-full z-1"
        style={{
          height: '120vh',
          background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.2) 50%, rgba(15, 23, 42, 0.8) 70%, rgba(15, 23, 42, 0.95) 100%)',
          marginTop: '50vh'
        }}
      />

      {/* Content Section - Below video hero */}
      <div className="relative z-10" style={{ marginTop: '50vh' }}>
        <ConceptForgeIdeationSection 
          onSubmit={triggerForgeAnimation} 
          onGenerateComplete={handleGenerateComplete}
        />
      </div>

      {/* AI Generator Results Section - Hidden but functional for ref integration */}
      <div id="results-area" className="relative z-10 mt-16" style={{ display: 'none' }}>
        <AiGenerator 
          ref={aiGeneratorRef}
          onSubmit={triggerForgeAnimation} 
        />
      </div>
    </div>
  );
}