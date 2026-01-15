import React, { useState, useEffect } from 'react';

const LoadingWindow = ({ isLoading, onClose }: { isLoading: boolean; onClose: () => void }) => {
    console.log('LoadingWindow: isLoading=', isLoading);
    if (!isLoading) return null;

    const steps = [
        { icon: '🔥', title: 'Warming the Forge', desc: 'Loading frameworks like Burke.' },
        { icon: '🔍', title: 'Detecting Essence', desc: 'Scanning "self-love".' },
        { icon: '📚', title: 'Querying Corpus', desc: 'Exploring 240+ campaigns.' },
        { icon: '🤖', title: 'Crafting Concepts', desc: 'Weaving bold ideas.' },
        { icon: '⚖️', title: 'Arbiter Review', desc: 'Checking originality (>60).' },
        { icon: '🎨', title: 'Finalizing Art', desc: 'Polishing outputs.' }
    ];

    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        console.log('LoadingWindow: Showing');
        const element = document.querySelector('.concept-output-area');
        if (element && document.contains(element)) {
            console.log('LoadingWindow: Mounted');
        }
        const interval = setInterval(() => setCurrentStep((prev) => (prev + 1) % steps.length), 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="concept-output-area" style={{
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            background: 'rgba(30,30,30,0.9)',
            display: 'block !important', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 30000,
            flexDirection: 'column',
            padding: '20px'
        }}>
            <div style={{
                background: 'rgba(42,42,42,0.9)', 
                border: '1px solid #fff', 
                padding: '20px', 
                maxWidth: '80%', 
                textAlign: 'center',
                fontFamily: 'system-ui, Arial, sans-serif', 
                color: '#fff',
                borderRadius: '0'
            } as React.CSSProperties}>
                <h2 style={{ fontSize: '24px', margin: '0 0 10px' }}>Forge Journey</h2>
                <div style={{ position: 'relative', height: '5px', background: '#444', margin: '10px 0' }}>
                    <div className="pulse" style={{ width: `${(currentStep / steps.length) * 100}%`, height: '100%', background: '#4caf50', animation: 'pulse 1s infinite' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {steps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', opacity: i === currentStep ? 1 : 0.6, transition: 'opacity 0.3s' }}>
                            <span className="rotate" style={{ fontSize: '24px', marginRight: '10px', animation: 'rotate 2s linear infinite' }}>{step.icon}</span>
                            <div><strong style={{ fontSize: '18px' }}>{step.title}</strong><p style={{ fontSize: '14px', margin: 0 }}>{step.desc}</p></div>
                        </div>
                    ))}
                </div>
                <style>{`
                    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                    @keyframes rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    .pulse, .rotate { animation-play-state: running !important; }
                `}</style>
                <button onClick={onClose} style={{ marginTop: '20px', padding: '10px', background: '#2A2A2A', color: '#fff', border: '1px solid #fff', borderRadius: '0' }}>Cancel</button>
            </div>
        </div>
    );
};

export default LoadingWindow;