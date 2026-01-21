import ConceptForgeIdeationSection from "@/components/ConceptForgeIdeationSection";
import AiGenerator from "@/components/ai-generator";
import SessionHistory from "@/components/session-history";
import { useVideo } from "@/hooks/use-video";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { Link } from "wouter";
import { useRef, useEffect } from "react";
import conceptForgeLogo from "@assets/Headline_1752875122000.png";
import backgroundVideo from "@assets/clean_anvil_video.mp4";

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
          console.log('🎯 Home: Generation completed, notifying ConceptForge');
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
        {/* Anvil Video Background */}
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
          onLoadedData={() => {
            console.log('🎬 Video loaded in Home, triggering initial animation');
            playInitialAnimation();
          }}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>

        {/* Dark Blue/Slate Multiply Gradient - Over video and extending to background */}
        <div 
          ref={overlayRef}
          className="global-gradient-overlay"
          style={{
            position: 'absolute !important' as any,
            top: '0px !important' as any,
            left: '0px !important' as any,
            width: '100vw !important' as any,
            height: '200vh !important' as any,
            background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.4) 0%, rgba(51, 65, 85, 0.5) 30%, rgba(30, 58, 138, 0.3) 60%, rgba(15, 23, 42, 0.6) 100%), linear-gradient(135deg, rgba(30, 41, 59, 0.3) 0%, rgba(51, 65, 85, 0.4) 50%, rgba(30, 58, 138, 0.2) 100%) !important' as any,
            mixBlendMode: 'multiply !important' as any,
            zIndex: '2 !important' as any,
            pointerEvents: 'none !important' as any,
            display: 'block !important' as any,
            opacity: '1 !important' as any
          }}
        />

        {/* ConceptForge Logo - Inside hero container */}
        <div 
          ref={logoRef}
          style={{
            position: 'absolute !important' as any,
            top: '15vh !important' as any,
            left: '50% !important' as any,
            transform: 'translateX(-50%) scale(1.2) translateZ(0) !important' as any,
            zIndex: '5 !important' as any,
            width: 'auto !important' as any,
            maxWidth: '450px !important' as any,
            padding: '0 20px !important' as any,
            pointerEvents: 'none !important' as any,
            opacity: '1 !important' as any
          }}
        >
          <img 
            src={conceptForgeLogo} 
            alt="ConceptForge" 
            style={{
              width: '100% !important' as any,
              height: 'auto !important' as any,
              maxWidth: '450px !important' as any,
              filter: 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.9)) !important' as any
            }}
          />
        </div>

      </div>

      {/* Admin Navigation - Fixed Position - Cache Bust v1752940350 */}
      <div className="fixed right-4 top-4 flex gap-2 z-50" data-cache-bust="1752940350">
        <Link href="/test-admin">
          <Button 
            variant="outline" 
            size="sm"
            style={{ backgroundColor: 'rgba(107, 114, 128, 0.7)', borderColor: 'rgba(107, 114, 128, 0.7)' }}
            className="text-xs px-2 py-0.5 h-6 text-gray-300 hover:text-white transition-all"
          >
            Test
          </Button>
        </Link>
        <Link href="/review">
          <Button 
            variant="outline" 
            size="sm"
            style={{ backgroundColor: 'rgba(107, 114, 128, 0.7)', borderColor: 'rgba(107, 114, 128, 0.7)' }}
            className="text-xs px-2 py-0.5 h-6 text-gray-300 hover:text-white transition-all"
          >
            Review
          </Button>
        </Link>
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