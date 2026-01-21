import React, { useState, useEffect, memo } from 'react';

const LoadingWindow = memo(({ isLoading, onClose }: { isLoading: boolean; onClose: () => void }) => {
    const steps = [
        { icon: '🔥', title: 'Warming the Forge', desc: 'Loading rhetorical frameworks.' },
        { icon: '🔍', title: 'Analyzing Brief', desc: 'Extracting key themes.' },
        { icon: '📚', title: 'Querying Corpus', desc: 'Exploring 411 rhetorical devices.' },
        { icon: '🤖', title: 'Crafting Concepts', desc: 'Generating creative variants.' },
        { icon: '⚖️', title: 'Arbiter Review', desc: 'Checking originality score.' },
        { icon: '🎨', title: 'Finalizing', desc: 'Polishing outputs.' }
    ];

    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (!isLoading) {
            setCurrentStep(0);
            return;
        }

        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % steps.length);
        }, 2500);

        return () => clearInterval(interval);
    }, [isLoading, steps.length]);

    // Return null after hooks are called
    if (!isLoading) return null;

    return (
        <div
            className="loading-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(15, 23, 42, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50000,
                flexDirection: 'column',
                padding: '20px'
            }}
        >
            <div style={{
                background: 'rgba(30, 41, 59, 0.95)',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                padding: '40px',
                maxWidth: '500px',
                width: '90%',
                textAlign: 'center',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#fff',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Animated forge icon */}
                <div style={{
                    fontSize: '48px',
                    marginBottom: '20px',
                    animation: 'pulse 2s ease-in-out infinite'
                }}>
                    🔥
                </div>

                <h2 style={{
                    fontSize: '24px',
                    margin: '0 0 8px',
                    fontWeight: 600,
                    background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Forging Your Concept
                </h2>

                <p style={{
                    color: '#94a3b8',
                    fontSize: '14px',
                    marginBottom: '24px'
                }}>
                    This may take 15-30 seconds
                </p>

                {/* Progress bar */}
                <div style={{
                    position: 'relative',
                    height: '4px',
                    background: 'rgba(148, 163, 184, 0.2)',
                    margin: '16px 0 24px',
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${((currentStep + 1) / steps.length) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                        transition: 'width 0.5s ease-out',
                        borderRadius: '2px'
                    }} />
                </div>

                {/* Current step display */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '24px'
                }}>
                    <span style={{
                        fontSize: '28px',
                        animation: 'bounce 1s ease-in-out infinite'
                    }}>
                        {steps[currentStep].icon}
                    </span>
                    <div style={{ textAlign: 'left' }}>
                        <strong style={{
                            fontSize: '16px',
                            display: 'block',
                            color: '#f1f5f9'
                        }}>
                            {steps[currentStep].title}
                        </strong>
                        <span style={{
                            fontSize: '13px',
                            color: '#94a3b8'
                        }}>
                            {steps[currentStep].desc}
                        </span>
                    </div>
                </div>

                {/* Step indicators */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: '24px'
                }}>
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: i <= currentStep ? '#3b82f6' : 'rgba(148, 163, 184, 0.3)',
                                transition: 'background 0.3s ease'
                            }}
                        />
                    ))}
                </div>

                <style>{`
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.1); opacity: 0.8; }
                    }
                    @keyframes bounce {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-5px); }
                    }
                `}</style>

                <button
                    onClick={onClose}
                    style={{
                        padding: '10px 24px',
                        background: 'transparent',
                        color: '#94a3b8',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.5)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
});

LoadingWindow.displayName = 'LoadingWindow';

export default LoadingWindow;
