import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { useVideo } from "@/hooks/use-video";
import { Link, useLocation } from "wouter";
import { Grid3X3, Lightbulb } from "lucide-react";
import backgroundVideo from "@assets/clean_anvil_video.mp4";

export default function HeroSection() {
  const { isForgeAnimating } = useVideo();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [location] = useLocation();
  const [videoLoaded, setVideoLoaded] = useState(false);

  const isMultiVariant = location === '/multivariant';
  
  return (
    <div 
      className="flex-1 flex items-center justify-center p-8 lg:p-16 relative overflow-hidden" 
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

      {/* FORCED BLUE OVERLAY - DIRECT STYLE INJECTION */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.68), rgba(71, 85, 105, 0.55), rgba(55, 65, 81, 0.60))',
          zIndex: 2,
          pointerEvents: 'none',
          display: 'block',
          opacity: 1,
          visibility: 'visible'
        }}
        data-overlay="gradient"
      ></div>

      {/* Content */}
      <div className="relative text-center" style={{ zIndex: 20 }}>
        <div className="mb-12 flex justify-center">
          <BrandLogo size="lg" animate={true} />
        </div>
        
        <h1 
          className="text-6xl lg:text-7xl xl:text-8xl font-black text-white mb-1 font-sans tracking-tighter uppercase leading-none relative z-20"
          style={{ 
            textShadow: '0 0 80px rgba(0, 0, 0, 0.9), 0 6px 12px rgba(0, 0, 0, 0.8), 0 12px 24px rgba(0, 0, 0, 0.6), 0 18px 36px rgba(0, 0, 0, 0.4)',
            filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.8))',
            WebkitFilter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.8))'
          }}
        >
          Concept<br />Forge
        </h1>
        
        <p className="text-lg lg:text-xl text-slate-300 mb-8 font-sans max-w-md mx-auto leading-relaxed">
          {isMultiVariant 
            ? "Generate multiple fundamentally different creative directions"
            : "Rapid-fire ideation powered by rhetorical craft and creative logic"
          }
        </p>

        {/* Mode Toggle Navigation */}
        <div className="mb-8 flex items-center justify-center space-x-4">
          <Link href="/">
            <Button 
              variant={!isMultiVariant ? "default" : "outline"}
              className={`flex items-center gap-2 transition-all duration-300 ${
                !isMultiVariant 
                  ? 'bg-white text-black hover:bg-gray-100' 
                  : 'border-slate-400 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              SINGLE CONCEPT
            </Button>
          </Link>
          
          <Link href="/multivariant">
            <Button 
              variant={isMultiVariant ? "default" : "outline"}
              className={`flex items-center gap-2 transition-all duration-300 ${
                isMultiVariant 
                  ? 'bg-white text-black hover:bg-gray-100' 
                  : 'border-slate-400 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              MULTI-VARIANT
            </Button>
          </Link>
        </div>
      </div>
      

    </div>
  );
}