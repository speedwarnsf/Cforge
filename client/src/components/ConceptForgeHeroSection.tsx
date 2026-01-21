import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useVideo } from "@/hooks/use-video";
import { ArrowRight, Play } from "lucide-react";
import backgroundVideo from "@assets/clean_anvil_video.mp4";

export default function ConceptForgeHeroSection() {
  const { videoRef, isForgeAnimating, playInitialAnimation } = useVideo();
  const [videoLoaded, setVideoLoaded] = useState(false);

  const scrollToIdeation = () => {
    const ideationSection = document.getElementById('ideation-section');
    ideationSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Anvil Video Background */}
      <div className="absolute inset-0 z-0">
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
            setVideoLoaded(true);
            console.log('🎬 Video loaded in HeroSection, triggering initial animation');
            playInitialAnimation();
          }}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>

        {/* Dark overlay for readability */}
        <div className={`absolute inset-0 transition-opacity duration-500 ${isForgeAnimating ? 'bg-black/40' : 'bg-black/60'}`}></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
          <span className="block text-white">Where ideas become</span>
          <span 
            className="block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
            style={{
              background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              WebkitTextFillColor: 'transparent'
            }}
          >
            top performers
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
          Discover the AI-powered creative suite that helps professionals craft campaigns with rhetorical intelligence and strategic precision.
        </p>

        {/* Stats Callout */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-white border border-white/20">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            hundreds of campaign examples • 4-arbiter evaluation • Semantic similarity detection
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={scrollToIdeation}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            START CREATING
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg font-medium rounded-lg backdrop-blur-sm"
          >
            <Play className="mr-2 h-5 w-5" />
            Watch Demo
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12">
          <p className="text-sm text-gray-400 mb-4">Trusted by creative professionals:</p>
          <div className="flex justify-center items-center gap-8 opacity-60">
            <div className="text-white font-semibold">Art Directors</div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="text-white font-semibold">Creative Teams</div>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <div className="text-white font-semibold">Brand Strategists</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}