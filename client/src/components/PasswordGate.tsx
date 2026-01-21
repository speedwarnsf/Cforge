import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  
  // Add debug style to hide any external overlays
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Force hide any external debug overlays */
      [class*="overlay"], [id*="overlay"], [class*="debug"], [id*="debug"],
      div[style*="position: fixed"], div[style*="z-index: 999"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      /* But keep our password gate visible */
      .password-gate-container {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    // Force redirect if on wrong path
    const currentPath = window.location.pathname;
    if (currentPath === '/code-share' || currentPath === '/test-interface.html') {
      console.log('Wrong path detected, redirecting to home...');
      window.location.href = '/';
      return;
    }
    
    // Clear any old auth tokens and check fresh
    const savedAuth = localStorage.getItem('concept-forge-auth');
    console.log('PasswordGate mounted. Checking auth status:', savedAuth);
    console.log('Current URL:', window.location.href);
    if (savedAuth === 'authorized') {
      setIsAuthorized(true);
      console.log('Auto-authorized from localStorage');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (username.trim() === CORRECT_USERNAME && password.trim() === CORRECT_PASSWORD) {
      setIsAuthorized(true);
      localStorage.setItem('concept-forge-auth', 'authorized');
      setError('');
    } else {
      setError('Invalid credentials. Please check your username and password.');
      setPassword('');
      setUsername('');
    }
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="password-gate-container min-h-screen bg-black flex items-center justify-center p-4" style={{ backgroundColor: '#000000' }}>
      {/* Hide external overlays */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Force hide any external debug overlays */
          div[style*="background: red"],
          div[style*="background-color: red"],
          div[style*="rgba(255, 0, 0"],
          div[style*="rgb(255, 0, 0"],
          [class*="overlay"]:not(.password-gate-container):not(.password-gate-container *),
          [id*="overlay"]:not(.password-gate-container):not(.password-gate-container *),
          [class*="debug"]:not(.password-gate-container):not(.password-gate-container *),
          [id*="debug"]:not(.password-gate-container):not(.password-gate-container *),
          [class*="version"]:not(.password-gate-container):not(.password-gate-container *),
          [id*="version"]:not(.password-gate-container):not(.password-gate-container *) {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        `
      }} />
      <Card className="w-full max-w-md bg-gray-900 border-gray-700 shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto">
            <CardTitle className="text-4xl font-bold text-white tracking-tight mb-2">
              THE C FORGE
            </CardTitle>
            <div className="h-0.5 w-24 mx-auto bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
          </div>
          <CardDescription className="text-gray-300 text-base">
            AI-Powered Creative Ideation Platform
          </CardDescription>
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-yellow-400 font-semibold text-sm uppercase tracking-wider">
              🚀 Public Beta Coming Soon
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Beta testers only • Authorized access required
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                autoFocus
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
              />
            </div>
            {error && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 rounded p-2">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-base shadow-lg"
              disabled={!username || !password}
            >
              Access Beta Platform
            </Button>
          </form>
          <div className="mt-6 text-center text-xs text-gray-500 border-t border-gray-700 pt-6">
            <p className="font-semibold mb-1">www.thecforge.com</p>
            <p>© 2026 The C Forge • All Rights Reserved</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};