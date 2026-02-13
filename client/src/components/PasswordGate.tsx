import React, { useState, useEffect, useRef } from 'react';
// Use static video path for better bundle optimization
const backgroundVideo = "/videos/clean_anvil_video_optimized.mp4";

// Secure beta access credentials
const CORRECT_PASSWORD = 'beta-access-2026';
const CORRECT_USERNAME = 'beta-tester';

interface PasswordGateProps {
  children: React.ReactNode;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState('');
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath === '/code-share' || currentPath === '/test-interface.html') {
      window.location.href = '/';
      return;
    }
    
    const savedAuth = localStorage.getItem('concept-forge-auth');
    if (savedAuth === 'authorized') {
      setIsAuthorized(true);
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && videoLoaded) {
      videoRef.current.play().catch(() => {});
    }
  }, [videoLoaded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (username.trim() === CORRECT_USERNAME && password.trim() === CORRECT_PASSWORD) {
      setIsAuthorized(true);
      localStorage.setItem('concept-forge-auth', 'authorized');
      setError('');
    } else {
      setError('Invalid credentials');
      setPassword('');
    }
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoLoaded(true)}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Logo */}
        <h1 className="text-5xl md:text-6xl font-light tracking-[0.2em] text-white mb-2">
          CONCEPT<span className="font-semibold">FORGE</span>
        </h1>
        <p className="text-white/50 text-sm tracking-widest mb-16">
          Creative Ideation Platform
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
          <label htmlFor="cforge-username" className="sr-only">Username</label>
          <input
            id="cforge-username"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors"
            autoFocus
            autoComplete="username"
          />
          <label htmlFor="cforge-password" className="sr-only">Password</label>
          <input
            id="cforge-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 transition-colors"
            autoComplete="current-password"
          />
          
          {error && (
            <p className="text-red-400/80 text-sm text-center">{error}</p>
          )}
          
          <button
            type="submit"
            disabled={!username || !password}
            className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed border border-white/30 rounded-lg px-4 py-3 text-white font-medium tracking-wide transition-all duration-200"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
};
