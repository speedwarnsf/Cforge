import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { useVideo } from "@/hooks/use-video";
// Use static video path for better bundle optimization
const backgroundVideo = "/videos/clean_anvil_video_optimized.mp4";

export default function ConceptForgeHero() {
  const { isForgeAnimating } = useVideo();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const scrollToIdeation = () => {
    const ideationSection = document.getElementById('ideation-section');
    if (ideationSection) {
      ideationSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div 
      className="h-screen flex items-center justify-center relative overflow-hidden" 
      style={{ 
        backgroundColor: '#0f172a',
        position: 'relative',
        isolation: 'isolate'
      }}
    >
      {/* Background Video */}
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
          backgroundColor: '#0f172a'
        }}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMwZjE3MmEiLz4KPC9zdmc+"
        onLoadedData={() => setVideoLoaded(true)}
      >
        <source src={backgroundVideo} type="video/mp4" />
      </video>

      {/* Overlay for better text readability */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.3) 0%, rgba(30, 41, 59, 0.35) 50%, rgba(51, 65, 85, 0.4) 100%)',
          zIndex: 2
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Brand Logo */}
        <div className="mb-8">
          <BrandLogo size="lg" animate={true} />
        </div>

        {/* Main Headline */}
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight">
          <span 
            style={{
              textShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))'
            }}
          >
            Concept
          </span>
          <br />
          <span 
            style={{
              background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: '#a78bfa',
              display: 'inline-block',
              textShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))'
            }}
          >
            Forge
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
          <span style={{ textShadow: '0 4px 16px rgba(0, 0, 0, 0.8)' }}>
            Where ideas become top performers through AI-powered rhetorical craft
          </span>
        </p>

        {/* CTA Button */}
        <Button
          onClick={scrollToIdeation}
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6 rounded-none shadow-2xl transition-all duration-300 hover:scale-105"
          style={{
            boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
          }}
        >
          Start Creating
        </Button>
      </div>
    </div>
  );
}