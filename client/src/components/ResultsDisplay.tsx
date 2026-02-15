import React, { memo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Star, Copy, Download, ChevronDown, ChevronUp, Check, ExternalLink } from "lucide-react";
import ArbiterScoreViz from './ArbiterScoreViz';
import { Link } from 'wouter';

interface ResultsDisplayProps {
  results: any[];
  onFeedback: (index: number, type: string) => void;
}

const ResultsDisplay = memo(({ results, onFeedback }: ResultsDisplayProps) => {
  const [expandedRationale, setExpandedRationale] = useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!results || results.length === 0) return null;

  // Don't render error results as concept cards
  if (results.length === 1 && results[0].id === 'error') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-red-950/30 border border-red-800/50 p-8 text-center">
          <p className="text-red-400 font-bold text-xl mb-3">
            {results[0].headline}
          </p>
          <p className="text-gray-400 text-sm">
            {results[0].devices}
          </p>
          <p className="text-gray-600 text-xs mt-3">
            {results[0].rationale}
          </p>
        </div>
      </div>
    );
  }

  const copyConceptText = (concept: any, index: number) => {
    const text = `${concept.headline || ''}\n${concept.tagline || ''}\n\n${concept.bodyCopy || ''}\n\nVisual: ${concept.visualConcept || ''}\nDevices: ${Array.isArray(concept.devices) ? concept.devices.join(', ') : concept.devices || ''}`;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const exportAllAsText = () => {
    const text = results.map((c, i) => {
      let output = `--- CONCEPT ${i + 1} ---\n`;
      if (c.headline) output += `Headline: ${c.headline}\n`;
      if (c.tagline) output += `Tagline: ${c.tagline}\n`;
      if (c.bodyCopy) output += `Body Copy: ${c.bodyCopy}\n`;
      if (c.visualConcept) output += `Visual: ${c.visualConcept}\n`;
      const devices = Array.isArray(c.devices) ? c.devices.join(', ') : c.devices;
      if (devices) output += `Devices: ${devices}\n`;
      if (c.rationale) output += `Rationale: ${c.rationale}\n`;
      if (c.originalityScore > 0) output += `Originality: ${Math.round(c.originalityScore)}%\n`;
      return output;
    }).join('\n');
    return text;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-12 mb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-10 border-b border-gray-800 pb-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase mb-1">
            Generated Concept{results.length > 1 ? 's' : ''}
          </h2>
          <p className="text-xs text-gray-500 font-mono">
            {results.length} result{results.length > 1 ? 's' : ''} -- auto-saved to gallery
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText(exportAllAsText())}
            className="text-gray-500 hover:text-white text-xs"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const text = exportAllAsText();
              const blob = new Blob([text], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `conceptforge-${new Date().toISOString().slice(0,10)}.txt`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="text-gray-500 hover:text-white text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
          <Link href="/gallery">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-white text-xs">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Gallery
            </Button>
          </Link>
        </div>
      </div>

      {/* Concept Cards */}
      <div className="space-y-8">
        {results.map((concept, i) => (
          <article
            key={concept.id || i}
            className="bg-gray-950 border border-gray-800 hover:border-gray-600 transition-colors group"
          >
            <div className="p-8 sm:p-10">
              {/* Top row: number + devices + originality */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white text-black flex items-center justify-center text-sm font-black shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(concept.devices) ? concept.devices : [concept.devices]).filter(Boolean).map((device: string, j: number) => (
                      <Badge key={j} variant="secondary" className="bg-gray-900 text-gray-400 border border-gray-800 text-[10px] uppercase tracking-widest font-mono">
                        {device}
                      </Badge>
                    ))}
                  </div>
                </div>
                {concept.originalityScore > 0 && (
                  <div className={`text-xs font-mono tabular-nums px-3 py-1.5 border ${
                    concept.originalityScore >= 80
                      ? 'border-emerald-700 text-emerald-400 bg-emerald-950/30'
                      : concept.originalityScore >= 60
                        ? 'border-yellow-700 text-yellow-400 bg-yellow-950/30'
                        : 'border-red-700 text-red-400 bg-red-950/30'
                  }`}>
                    {Math.round(concept.originalityScore)}% original
                  </div>
                )}
              </div>

              {/* Headline */}
              {concept.headline && concept.headline !== `Concept ${i + 1}` && (
                <h3 className="text-3xl sm:text-4xl font-black text-white leading-[1.1] mb-4 tracking-tight">
                  {concept.headline}
                </h3>
              )}

              {/* Tagline */}
              {concept.tagline && (
                <p className="text-cyan-400 text-lg sm:text-xl mt-2 mb-6 font-medium italic tracking-tight">
                  {concept.tagline}
                </p>
              )}

              {/* Body Copy */}
              {concept.bodyCopy && (
                <div className="mb-6">
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest font-black mb-2 font-mono">Body Copy</div>
                  <p className="text-gray-300 text-base leading-relaxed max-w-prose">
                    {concept.bodyCopy}
                  </p>
                </div>
              )}

              {/* Visual Direction */}
              {concept.visualConcept && (
                <div className="mb-6 border-l-2 border-gray-700 pl-5">
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest font-black mb-2 font-mono">Visual Direction</div>
                  <p className="text-gray-400 text-sm leading-relaxed">{concept.visualConcept}</p>
                </div>
              )}

              {/* Rationale - collapsible */}
              {concept.rationale && concept.rationale !== 'No rationale' && concept.rationale !== 'Generated concept' && (
                <div className="mb-5">
                  <button
                    onClick={() => setExpandedRationale(prev => ({ ...prev, [i]: !prev[i] }))}
                    className="flex items-center gap-1.5 text-[10px] text-gray-600 uppercase tracking-widest font-black font-mono hover:text-gray-400 transition-colors cursor-pointer"
                  >
                    Rationale
                    {expandedRationale[i] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedRationale[i] && (
                    <p className="text-gray-500 text-sm italic mt-2 leading-relaxed max-w-prose">
                      {concept.rationale}
                    </p>
                  )}
                </div>
              )}

              {/* Arbiter Scores */}
              {(concept.originalityScore > 0 || concept.professionalismScore > 0 || concept.clarityScore > 0) && (
                <div className="mt-6 pt-6 border-t border-gray-800/60">
                  <ArbiterScoreViz
                    originalityScore={concept.originalityScore}
                    professionalismScore={concept.professionalismScore}
                    clarityScore={concept.clarityScore}
                    freshnessScore={concept.freshnessScore}
                    resonanceScore={concept.resonanceScore}
                    awardsScore={concept.awardsScore}
                    finalStatus={concept.finalStatus}
                    compact
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-6 mt-6 border-t border-gray-800/40">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(i, 'more_like_this')}
                  className="text-gray-600 hover:text-emerald-400 hover:bg-emerald-950/30 text-xs"
                >
                  <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                  More Like This
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(i, 'less_like_this')}
                  className="text-gray-600 hover:text-red-400 hover:bg-red-950/30 text-xs"
                >
                  <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                  Less Like This
                </Button>
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFeedback(i, 'favorite')}
                    className="text-gray-600 hover:text-amber-400 hover:bg-amber-950/30 text-xs"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyConceptText(concept, i)}
                    className="text-gray-600 hover:text-white text-xs"
                  >
                    {copiedIndex === i
                      ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                      : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
});

ResultsDisplay.displayName = 'ResultsDisplay';

export default ResultsDisplay;
