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

// Rhetorical device facts shown during loading
const DEVICE_FACTS = [
    { device: 'Antithesis', fact: 'Juxtaposing contrasting ideas. "One small step for man, one giant leap for mankind."' },
    { device: 'Anaphora', fact: 'Repetition at the start of successive clauses. "I have a dream... I have a dream..."' },
    { device: 'Hyperbole', fact: 'Deliberate exaggeration for emphasis. The backbone of every "best ever" campaign.' },
    { device: 'Metonymy', fact: 'Substituting a related concept. "The pen is mightier than the sword."' },
    { device: 'Synecdoche', fact: 'A part representing the whole. "All hands on deck" -- hands for sailors.' },
    { device: 'Chiasmus', fact: 'Reversed parallel structure. "Ask not what your country can do for you..."' },
    { device: 'Litotes', fact: 'Understatement through double negation. "Not bad" meaning excellent.' },
    { device: 'Asyndeton', fact: 'Omitting conjunctions for speed. "Veni, vidi, vici" -- came, saw, conquered.' },
    { device: 'Epistrophe', fact: 'Repetition at the end of clauses. "...of the people, by the people, for the people."' },
    { device: 'Zeugma', fact: 'One word governing multiple elements. "She broke his car and his heart."' },
    { device: 'Anadiplosis', fact: 'Ending one clause and beginning the next with the same word. Creates momentum.' },
    { device: 'Polysyndeton', fact: 'Excessive use of conjunctions. "And... and... and..." -- builds relentless pace.' },
    { device: 'Tmesis', fact: 'Splitting a word with another word. "Abso-bloody-lutely."' },
    { device: 'Syllepsis', fact: 'One word used in two senses simultaneously. Intellectual wordplay at its finest.' },
    { device: 'Paraprosdokian', fact: 'An unexpected ending to a phrase. "I want to die peacefully in my sleep, like my grandfather."' },
];

const LoadingWindow = memo(({ isLoading, onClose, progress }: LoadingWindowProps) => {
    const steps = [
        { title: 'Analyzing Brief', desc: 'Extracting key themes and direction.' },
        { title: 'Divergent Exploration', desc: 'Creative personas generating ideas.' },
        { title: 'Selecting Devices', desc: 'Choosing from 293 rhetorical devices.' },
        { title: 'Crafting Concepts', desc: 'Generating creative variants in parallel.' },
        { title: 'Scoring & Ranking', desc: 'Four arbiters evaluating quality.' },
        { title: 'Done', desc: 'Your concepts are ready.' }
    ];

    const [currentStep, setCurrentStep] = useState(0);
    const [progressPercent, setProgressPercent] = useState(0);
    const [elapsedSec, setElapsedSec] = useState(0);
    const [currentFact, setCurrentFact] = useState(0);
    const startRef = useRef(Date.now());

    // Rotate device facts
    useEffect(() => {
        if (!isLoading) return;
        setCurrentFact(Math.floor(Math.random() * DEVICE_FACTS.length));
        const interval = setInterval(() => {
            setCurrentFact(prev => (prev + 1) % DEVICE_FACTS.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [isLoading]);

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
            const interval = setInterval(() => {
                setCurrentStep((prev) => Math.min(prev + 1, steps.length - 2));
                setProgressPercent((prev) => Math.min(prev + 16, 85));
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isLoading, progress]);

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
    const fact = DEVICE_FACTS[currentFact];

    return (
        <div
            className="loading-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50000,
                flexDirection: 'column',
                padding: '20px'
            }}
        >
            <div style={{
                background: 'rgba(20, 20, 20, 0.98)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '48px',
                maxWidth: '560px',
                width: '90%',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#fff',
            }}>
                {/* Step indicator */}
                <div style={{
                    fontSize: '11px',
                    marginBottom: '24px',
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: '#666',
                    fontFamily: 'JetBrains Mono, monospace',
                    display: 'flex',
                    justifyContent: 'space-between',
                }}>
                    <span>Step {currentStep + 1} / {steps.length}</span>
                    <span>{elapsedSec > 0 ? `${elapsedSec}s` : '--'}</span>
                </div>

                <h2 style={{
                    fontSize: '28px',
                    margin: '0 0 8px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#fff',
                }}>
                    {steps[currentStep]?.title || 'Forging'}
                </h2>

                <p style={{
                    color: '#888',
                    fontSize: '14px',
                    marginBottom: '32px',
                    lineHeight: '1.5',
                }}>
                    {detail}
                </p>

                {/* Progress bar */}
                <div style={{
                    position: 'relative',
                    height: '2px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    margin: '0 0 40px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: '#fff',
                        transition: 'width 0.8s ease-out',
                    }} />
                </div>

                {/* Step dots */}
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: '40px'
                }}>
                    {steps.slice(0, -1).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                width: '6px',
                                height: '6px',
                                background: i <= currentStep ? '#fff' : 'rgba(255, 255, 255, 0.15)',
                                transition: 'background 0.3s ease'
                            }}
                        />
                    ))}
                </div>

                {/* Rhetorical device fact */}
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '24px',
                    minHeight: '80px',
                }}>
                    <div style={{
                        fontSize: '10px',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                        color: '#555',
                        marginBottom: '8px',
                        fontFamily: 'JetBrains Mono, monospace',
                    }}>
                        Did you know
                    </div>
                    <div style={{
                        fontSize: '13px',
                        color: '#999',
                        lineHeight: '1.6',
                        transition: 'opacity 0.5s ease',
                    }}>
                        <strong style={{ color: '#ccc' }}>{fact.device}</strong> -- {fact.fact}
                    </div>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        padding: '8px 20px',
                        background: 'transparent',
                        color: '#555',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s ease',
                        marginTop: '24px',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.color = '#999';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.color = '#555';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
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
