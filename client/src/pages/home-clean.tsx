import React from 'react';

export default function Home() {
  console.log("🏠 Home component rendering...");
  
  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* NUCLEAR FALLBACK - Pure HTML/CSS */}
      <div style={{position: 'fixed', top: 0, left: 0, right: 0, background: 'black', color: 'white', zIndex: 10000, padding: '20px'}}>
        <h1 style={{fontSize: '48px', fontWeight: 'bold', marginBottom: '20px'}}>CONCEPT FORGE V4 - WORKING INTERFACE</h1>
        
        {/* Feature Highlights */}
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px'}}>
          <div style={{textAlign: 'center'}}>
            <h4 style={{fontSize: '18px', fontWeight: 'bold', background: 'linear-gradient(45deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
              Your personalized brainstorm partner
            </h4>
            <p style={{color: '#9ca3af'}}>Workshop fresh ideas that remain true to your creative voice.</p>
          </div>
          
          <div style={{textAlign: 'center'}}>
            <h4 style={{fontSize: '18px', fontWeight: 'bold', background: 'linear-gradient(45deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
              Your research co-pilot
            </h4>
            <p style={{color: '#9ca3af'}}>Discover concepts with data-driven insights from hundreds of campaigns.</p>
          </div>
          
          <div style={{textAlign: 'center'}}>
            <h4 style={{fontSize: '18px', fontWeight: 'bold', background: 'linear-gradient(45deg, #34d399, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
              Your bank for the best ideas
            </h4>
            <p style={{color: '#9ca3af'}}>Save unlimited ideas. Come back anytime to build your next hit.</p>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div style={{display: 'flex', gap: '16px', marginBottom: '30px'}}>
          <button style={{padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: "0", fontSize: '16px', fontWeight: 'bold'}}>
            Single Concept
          </button>
          <button style={{padding: '12px 24px', background: '#374151', color: 'white', border: 'none', borderRadius: "0", fontSize: '16px', fontWeight: 'bold'}}>
            Multi-Variant
          </button>
        </div>

        {/* Generate Button */}
        <button style={{padding: '16px 32px', background: 'linear-gradient(45deg, #2563eb, #7c3aed)', color: 'white', border: 'none', borderRadius: "0", fontSize: '20px', fontWeight: 'bold', marginBottom: '30px'}}>
          Generate Concepts
        </button>

        {/* Analysis Tools */}
        <div>
          <h3 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', background: 'linear-gradient(45deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
            Where Ideas Become Top Performers
          </h3>
          <div style={{display: 'flex', gap: '30px'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px'}}>
              <input type="checkbox" style={{width: '16px', height: '16px'}} />
              Image Analysis
            </label>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px'}}>
              <input type="checkbox" style={{width: '16px', height: '16px'}} />
              Cliché Detection
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}