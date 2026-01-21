import React, { memo } from 'react';

interface ResultsDisplayProps {
  results: any[];
  onFeedback: (index: number, type: string) => void;
}

const ResultsDisplay = memo(({ results, onFeedback }: ResultsDisplayProps) => {
    // Don't render anything if no results
    if (!results || results.length === 0) return null;

    return (
        <div className="concept-output-area" style={{ display: 'block !important', zIndex: 30000, maxWidth: '80%', margin: '0 auto' }}>
            <h2>Generated Concepts</h2>
            <div className="results-grid">
                {results.map((concept, i) => (
                    <div key={i} className="concept-card" style={{ background: 'rgba(42,42,42,0.9)', border: '1px solid #fff', borderRadius: '0', width: '100%' }}>
                        <h3>{concept.headline}</h3>
                        {concept.tagline && <p><strong>Tagline:</strong> {concept.tagline}</p>}
                        {concept.bodyCopy && <p><strong>Body Copy:</strong> {concept.bodyCopy}</p>}
                        {concept.visualConcept && <p><strong>Visual Concept:</strong> {concept.visualConcept}</p>}
                        <p><strong>Devices:</strong> {Array.isArray(concept.devices) ? concept.devices.join(', ') : (concept.devices || 'None')}</p>
                        <p><strong>Rationale:</strong> {concept.rationale || 'No rationale'}</p>
                        <div className="feedback-buttons">
                            <button onClick={() => onFeedback(i, 'more_like_this')}>More Like This</button>
                            <button onClick={() => onFeedback(i, 'less_like_this')}>Less Like This</button>
                            <button onClick={() => onFeedback(i, 'favorite')}>Favorite</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

ResultsDisplay.displayName = 'ResultsDisplay';

export default ResultsDisplay;
