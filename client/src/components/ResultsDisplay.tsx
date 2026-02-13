import React, { memo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Star, Copy, Download, FileText } from "lucide-react";
import ArbiterScoreViz from './ArbiterScoreViz';

interface ResultsDisplayProps {
  results: any[];
  onFeedback: (index: number, type: string) => void;
}

const ResultsDisplay = memo(({ results, onFeedback }: ResultsDisplayProps) => {
  if (!results || results.length === 0) return null;

  // Don't render error results as concept cards
  if (results.length === 1 && results[0].id === 'error') {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 mt-8">
        <Card className="bg-red-950/30 border-red-800/50">
          <CardContent className="p-6 text-center">
            <p className="text-red-400 font-medium text-lg mb-2">
              {results[0].headline}
            </p>
            <p className="text-gray-400 text-sm">
              {results[0].devices}
            </p>
            <p className="text-gray-500 text-xs mt-2">
              {results[0].rationale}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
    <div className="w-full max-w-5xl mx-auto px-4 mt-8 mb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap border-b border-gray-800 pb-4">
        <h2 className="text-lg font-bold text-white tracking-wide uppercase">
          Generated Concept{results.length > 1 ? 's' : ''}
        </h2>
        <Badge variant="secondary" className="bg-gray-800 text-gray-400 border-gray-700 text-xs">
          {results.length} result{results.length > 1 ? 's' : ''}
        </Badge>
        <div className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigator.clipboard.writeText(exportAllAsText())}
            className="text-gray-500 hover:text-white text-xs"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
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
            <Download className="w-3.5 h-3.5 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Concept Cards */}
      <div className="grid gap-4">
        {results.map((concept, i) => (
          <article
            key={concept.id || i}
            className="bg-gray-950 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            <div className="p-6">
              {/* Concept number + headline */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-8 h-8 bg-white text-black flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {concept.headline || `Concept ${i + 1}`}
                  </h3>
                  {concept.tagline && (
                    <p className="text-cyan-400 text-sm mt-1 italic">
                      {concept.tagline}
                    </p>
                  )}
                </div>
                {concept.originalityScore > 0 && (
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${
                      concept.originalityScore >= 80
                        ? 'border-emerald-600 text-emerald-400'
                        : concept.originalityScore >= 60
                          ? 'border-yellow-600 text-yellow-400'
                          : 'border-red-600 text-red-400'
                    }`}
                  >
                    {Math.round(concept.originalityScore)}% original
                  </Badge>
                )}
              </div>

              {/* Body */}
              {concept.bodyCopy && (
                <p className="text-gray-300 text-sm mb-3 leading-relaxed">
                  {concept.bodyCopy}
                </p>
              )}

              {concept.visualConcept && (
                <div className="mb-3 border-l-2 border-gray-700 pl-3">
                  <span className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Visual Direction</span>
                  <p className="text-gray-400 text-sm mt-0.5">{concept.visualConcept}</p>
                </div>
              )}

              {/* Devices */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(Array.isArray(concept.devices) ? concept.devices : [concept.devices]).filter(Boolean).map((device: string, j: number) => (
                  <Badge key={j} variant="secondary" className="bg-gray-900 text-gray-400 border border-gray-800 text-[10px] uppercase tracking-wider">
                    {device}
                  </Badge>
                ))}
              </div>

              {concept.rationale && concept.rationale !== 'No rationale' && (
                <p className="text-gray-600 text-xs italic border-l-2 border-gray-800 pl-3 mb-4">
                  {concept.rationale}
                </p>
              )}

              {/* Arbiter Scores if available */}
              {(concept.originalityScore > 0 || concept.professionalismScore > 0 || concept.clarityScore > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-800">
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
              <div className="flex gap-2 pt-4 mt-4 border-t border-gray-800/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(i, 'more_like_this')}
                  className="text-gray-500 hover:text-emerald-400 hover:bg-emerald-900/20 text-xs"
                >
                  <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                  More Like This
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(i, 'less_like_this')}
                  className="text-gray-500 hover:text-red-400 hover:bg-red-900/20 text-xs"
                >
                  <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                  Less Like This
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(i, 'favorite')}
                  className="text-gray-500 hover:text-amber-400 hover:bg-amber-900/20 text-xs ml-auto"
                >
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const text = `${concept.headline || ''}\n${concept.tagline || ''}\n\n${concept.bodyCopy || ''}\n\nVisual: ${concept.visualConcept || ''}\nDevices: ${Array.isArray(concept.devices) ? concept.devices.join(', ') : concept.devices || ''}`;
                    navigator.clipboard.writeText(text);
                  }}
                  className="text-gray-500 hover:text-white text-xs"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy
                </Button>
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
