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
    { device: 'Antithesis', fact: 'Juxtaposing contrasting ideas. "One small step for man, one giant leap for mankind."', category: 'Contrast' },
    { device: 'Anaphora', fact: 'Repetition at the start of successive clauses. "I have a dream... I have a dream..."', category: 'Repetition' },
    { device: 'Hyperbole', fact: 'Deliberate exaggeration for emphasis. The backbone of every "best ever" campaign.', category: 'Amplification' },
    { device: 'Metonymy', fact: 'Substituting a related concept. "The pen is mightier than the sword."', category: 'Substitution' },
    { device: 'Synecdoche', fact: 'A part representing the whole. "All hands on deck" -- hands for sailors.', category: 'Substitution' },
    { device: 'Chiasmus', fact: 'Reversed parallel structure. "Ask not what your country can do for you..."', category: 'Structure' },
    { device: 'Litotes', fact: 'Understatement through double negation. "Not bad" meaning excellent.', category: 'Irony' },
    { device: 'Asyndeton', fact: 'Omitting conjunctions for speed. "Veni, vidi, vici" -- came, saw, conquered.', category: 'Omission' },
    { device: 'Epistrophe', fact: 'Repetition at the end of clauses. "...of the people, by the people, for the people."', category: 'Repetition' },
    { device: 'Zeugma', fact: 'One word governing multiple elements. "She broke his car and his heart."', category: 'Wordplay' },
    { device: 'Anadiplosis', fact: 'Ending one clause and beginning the next with the same word. Creates momentum.', category: 'Repetition' },
    { device: 'Polysyndeton', fact: 'Excessive use of conjunctions. "And... and... and..." -- builds relentless pace.', category: 'Structure' },
    { device: 'Tmesis', fact: 'Splitting a word with another word. "Abso-bloody-lutely."', category: 'Wordplay' },
    { device: 'Syllepsis', fact: 'One word used in two senses simultaneously. Intellectual wordplay at its finest.', category: 'Wordplay' },
    { device: 'Paraprosdokian', fact: 'An unexpected ending to a phrase. The punchline technique of rhetoric.', category: 'Surprise' },
    { device: 'Oxymoron', fact: 'Combining contradictory terms. "Deafening silence." Creates memorable tension.', category: 'Contrast' },
    { device: 'Euphemism', fact: 'Substituting a mild expression for a harsh one. The diplomat\'s tool.', category: 'Substitution' },
    { device: 'Alliteration', fact: 'Repeated initial consonant sounds. "Coca-Cola." The foundation of sonic branding.', category: 'Sound' },
];

const LoadingWindow = memo(({ isLoading, onClose, progress }: LoadingWindowProps) => {
    const steps = [
        { title: 'Analyzing Brief', desc: 'Extracting key themes and creative direction.' },
        { title: 'Divergent Exploration', desc: 'Creative personas generating wild ideas.' },
        { title: 'Selecting Devices', desc: 'Choosing from 293 rhetorical devices.' },
        { title: 'Crafting Concepts', desc: 'Generating creative variants in parallel.' },
        { title: 'Scoring & Ranking', desc: 'Four arbiters evaluating quality.' },
        { title: 'Done', desc: 'Your concepts are ready.' }
    ];

    const [currentStep, setCurrentStep] = useState(0);
    const [progressPercent, setProgressPercent] = useState(0);
    const [elapsedSec, setElapsedSec] = useState(0);
    const [currentFact, setCurrentFact] = useState(0);
    const [factVisible, setFactVisible] = useState(true);
    const startRef = useRef(Date.now());

    // Rotate device facts with crossfade
    useEffect(() => {
        if (!isLoading) return;
        setCurrentFact(Math.floor(Math.random() * DEVICE_FACTS.length));
        const interval = setInterval(() => {
            setFactVisible(false);
            setTimeout(() => {
                setCurrentFact(prev => (prev + 1) % DEVICE_FACTS.length);
                setFactVisible(true);
            }, 400);
        }, 5000);
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
    const isComplete = currentStep === steps.length - 1;

    return (
        <div
            className="loading-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0, 0, 0, 0.97)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50000,
                flexDirection: 'column',
                padding: '20px',
            }}
        >
            <div style={{
                background: '#0a0a0a',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '48px',
                maxWidth: '600px',
                width: '92%',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#fff',
            }}>
                {/* Step counter + timer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '32px',
                }}>
                    <span style={{
                        fontSize: '10px',
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                        color: '#444',
                        fontFamily: 'ui-monospace, monospace',
                    }}>
                        Step {currentStep + 1} / {steps.length}
                    </span>
                    <span style={{
                        fontSize: '10px',
                        letterSpacing: '0.2em',
                        color: '#444',
                        fontFamily: 'ui-monospace, monospace',
                    }}>
                        {elapsedSec > 0 ? `${elapsedSec}s` : '--'}
                    </span>
                </div>

                {/* Current step title */}
                <h2 style={{
                    fontSize: '32px',
                    margin: '0 0 8px',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    color: isComplete ? '#4ade80' : '#fff',
                    lineHeight: 1.1,
                    transition: 'color 0.3s ease',
                }}>
                    {steps[currentStep]?.title || 'Forging'}
                </h2>

                <p style={{
                    color: '#666',
                    fontSize: '14px',
                    marginBottom: '36px',
                    lineHeight: '1.5',
                }}>
                    {detail}
                </p>

                {/* Progress bar */}
                <div style={{
                    position: 'relative',
                    height: '3px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    marginBottom: '8px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: isComplete
                            ? '#4ade80'
                            : 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.7) 100%)',
                        transition: 'width 0.8s ease-out, background 0.3s ease',
                    }} />
                    {/* Shimmer effect on active progress */}
                    {!isComplete && progressPercent > 0 && progressPercent < 100 && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                            animation: 'shimmer 2s infinite',
                        }} />
                    )}
                </div>

                {/* Percentage */}
                <div style={{
                    fontSize: '11px',
                    color: '#444',
                    fontFamily: 'ui-monospace, monospace',
                    textAlign: 'right',
                    marginBottom: '32px',
                }}>
                    {progressPercent}%
                </div>

                {/* Step dots with labels */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '40px',
                    alignItems: 'center',
                }}>
                    {steps.slice(0, -1).map((step, i) => (
                        <div
                            key={i}
                            title={step.title}
                            style={{
                                flex: 1,
                                height: '4px',
                                background: i < currentStep
                                    ? '#4ade80'
                                    : i === currentStep
                                        ? '#fff'
                                        : 'rgba(255, 255, 255, 0.08)',
                                transition: 'background 0.5s ease',
                            }}
                        />
                    ))}
                </div>

                {/* Device fact section */}
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    paddingTop: '28px',
                    minHeight: '100px',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                    }}>
                        <span style={{
                            fontSize: '9px',
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                            color: '#333',
                            fontFamily: 'ui-monospace, monospace',
                        }}>
                            Rhetorical Device
                        </span>
                        <span style={{
                            fontSize: '9px',
                            color: '#333',
                            padding: '1px 6px',
                            border: '1px solid #222',
                            fontFamily: 'ui-monospace, monospace',
                        }}>
                            {fact.category}
                        </span>
                    </div>
                    <div style={{
                        opacity: factVisible ? 1 : 0,
                        transition: 'opacity 0.4s ease',
                    }}>
                        <div style={{
                            fontSize: '15px',
                            color: '#aaa',
                            fontWeight: 700,
                            marginBottom: '4px',
                        }}>
                            {fact.device}
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: '#666',
                            lineHeight: '1.6',
                        }}>
                            {fact.fact}
                        </div>
                    </div>
                </div>

                {/* Cancel button */}
                <button
                    onClick={onClose}
                    style={{
                        padding: '10px 24px',
                        background: 'transparent',
                        color: '#333',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        transition: 'all 0.2s ease',
                        marginTop: '28px',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        fontFamily: 'ui-monospace, monospace',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.color = '#888';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.color = '#333';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                >
                    Cancel
                </button>
            </div>

            {/* Shimmer animation */}
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    );
});

LoadingWindow.displayName = 'LoadingWindow';

export default LoadingWindow;
