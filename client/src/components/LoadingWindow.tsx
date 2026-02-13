import React, { useState, useEffect, useRef, memo } from 'react';

interface LoadingWindowProps {
    isLoading: boolean;
    onClose: () => void;
    progress?: { step: string; progress: number; detail?: string } | null;
}

const STEP_MAP: Record<string, number> = {
    'analyzing': 0,
    'exploring': 1,
    'evolving': 2,
    'generating': 3,
    'validating': 4,
    'complete': 5
};

const LoadingWindow = memo(({ isLoading, onClose, progress }: LoadingWindowProps) => {
    const steps = [
        { icon: '', title: 'Analyzing Brief', desc: 'Extracting key themes and direction.' },
        { icon: '', title: 'Divergent Exploration', desc: 'Creative personas generating ideas.' },
        { icon: '', title: 'Selecting Devices', desc: 'Choosing from 411 rhetorical devices.' },
        { icon: '', title: 'Crafting Concepts', desc: 'Generating creative variants in parallel.' },
        { icon: '', title: 'Scoring & Ranking', desc: 'Evaluating quality and originality.' },
        { icon: '', title: 'Done!', desc: 'Your concepts are ready.' }
    ];

    const [currentStep, setCurrentStep] = useState(0);
    const [progressPercent, setProgressPercent] = useState(0);
    const [elapsedSec, setElapsedSec] = useState(0);
    const startRef = useRef(Date.now());

    // Use real progress data when available, fall back to timer
    useEffect(() => {
        if (!isLoading) {
            setCurrentStep(0);
            setProgressPercent(0);
            setElapsedSec(0);
            startRef.current = Date.now();
            return;
        }

        if (progress) {
            const stepIndex = STEP_MAP[progress.step] ?? currentStep;
            setCurrentStep(Math.min(stepIndex, steps.length - 1));
            setProgressPercent(Math.min(progress.progress, 100));
        } else {
            // Fallback: timer-based progression
            const interval = setInterval(() => {
                setCurrentStep((prev) => Math.min(prev + 1, steps.length - 2));
                setProgressPercent((prev) => Math.min(prev + 16, 85));
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isLoading, progress]);

    // Elapsed time counter
    useEffect(() => {
        if (!isLoading) return;
        startRef.current = Date.now();
        const timer = setInterval(() => {
            setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
        }, 500);
        return () => clearInterval(timer);
    }, [isLoading]);

    if (!isLoading) return null;

    const detail = progress?.detail || steps[currentStep]?.desc || '';

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
                borderRadius: '0',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Step indicator */}
                <div style={{
                    fontSize: '14px',
                    marginBottom: '20px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace'
                }}>
                    Step {currentStep + 1} of {steps.length}
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
                    {steps[currentStep]?.title || 'Forging Your Concept'}
                </h2>

                <p style={{
                    color: '#94a3b8',
                    fontSize: '14px',
                    marginBottom: '24px'
                }}>
                    {elapsedSec > 0 ? `${elapsedSec}s elapsed` : 'Starting up...'}
                </p>

                {/* Progress bar */}
                <div style={{
                    position: 'relative',
                    height: '4px',
                    background: 'rgba(148, 163, 184, 0.2)',
                    margin: '16px 0 24px',
                    borderRadius: '0',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                        transition: 'width 0.5s ease-out',
                        borderRadius: '0'
                    }} />
                </div>

                {/* Current step detail */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '0',
                    marginBottom: '24px',
                    minHeight: '72px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <span style={{
                            fontSize: '13px',
                            color: '#94a3b8'
                        }}>
                            {detail}
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
                    {steps.slice(0, -1).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '0',
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
                `}</style>

                <button
                    onClick={onClose}
                    style={{
                        padding: '10px 24px',
                        background: 'transparent',
                        color: '#94a3b8',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        borderRadius: '0',
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
