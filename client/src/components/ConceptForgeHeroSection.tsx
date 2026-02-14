import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useVideo } from "@/hooks/use-video";
import { ArrowDown } from "lucide-react";
const backgroundVideo = "/videos/clean_anvil_video_optimized.mp4";

export default function ConceptForgeHeroSection() {
  const { videoRef, isForgeAnimating, playInitialAnimation } = useVideo();
  const [videoLoaded, setVideoLoaded] = useState(false);

  const scrollToIdeation = () => {
    const ideationSection = document.getElementById('ideation-section');
    ideationSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{
            opacity: isForgeAnimating ? 1 : 0.5,
            transition: 'opacity 0.5s ease'
          }}
          muted
          playsInline
          preload="auto"
          onLoadedData={() => {
            setVideoLoaded(true);
            playInitialAnimation();
          }}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
        <div className={`absolute inset-0 transition-opacity duration-500 ${isForgeAnimating ? 'bg-black/40' : 'bg-black/70'}`} />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
          <span className="block text-white" style={{ letterSpacing: '-0.03em' }}>CONCEPT</span>
          <span className="block text-white" style={{ letterSpacing: '-0.03em' }}>FORGE</span>
        </h1>

        <p className="text-base md:text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed font-light">
          293 rhetorical devices. 4-arbiter evaluation. 
          AI-powered concept generation built on classical rhetoric.
        </p>

        {/* Stats row */}
        <div className="flex justify-center items-center gap-8 mb-10 text-xs tracking-widest uppercase text-gray-500">
          <span>293 Devices</span>
          <span className="w-px h-3 bg-gray-700" />
          <span>4 Arbiters</span>
          <span className="w-px h-3 bg-gray-700" />
          <span>245+ Campaigns</span>
        </div>

        <Button
          onClick={scrollToIdeation}
          size="lg"
          className="bg-white text-black hover:bg-gray-200 px-10 py-4 text-sm font-semibold tracking-widest uppercase transition-all"
        >
          Start Creating
          <ArrowDown className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent z-10" />
    </div>
  );
}
