import React, { memo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Star, Sparkles, Copy, Download } from "lucide-react";

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
        <Card className="bg-red-950/30 border-red-800/50 backdrop-blur-sm">
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

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-8 mb-12">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h2 className="text-xl font-semibold text-white">
          Generated Concept{results.length > 1 ? 's' : ''}
        </h2>
        <Badge variant="secondary" className="bg-amber-900/30 text-amber-400 border-amber-700/50">
          {results.length} result{results.length > 1 ? 's' : ''}
        </Badge>
        <div className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const text = results.map((c, i) => `--- Concept ${i + 1} ---\nHeadline: ${c.headline || ''}\nDevices: ${Array.isArray(c.devices) ? c.devices.join(', ') : c.devices || ''}\nRationale: ${c.rationale || ''}`).join('\n\n');
              navigator.clipboard.writeText(text);
            }}
            className="text-gray-400 hover:text-white text-xs"
          >
            <Copy className="w-3.5 h-3.5 mr-1" />
            Copy All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const text = results.map((c, i) => `--- Concept ${i + 1} ---\nHeadline: ${c.headline || ''}\nDevices: ${Array.isArray(c.devices) ? c.devices.join(', ') : c.devices || ''}\nRationale: ${c.rationale || ''}`).join('\n\n');
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
            className="text-gray-400 hover:text-white text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {results.map((concept, i) => (
          <Card 
            key={concept.id || i} 
            className="bg-gray-900/60 border-gray-700/50 backdrop-blur-sm hover:border-gray-600/70 transition-colors"
          >
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
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
                    className={`shrink-0 ${
                      concept.originalityScore >= 80 
                        ? 'border-green-600 text-green-400' 
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
                <p className="text-gray-400 text-sm mb-3">
                  <span className="text-gray-500 font-medium">Visual: </span>
                  {concept.visualConcept}
                </p>
              )}

              {/* Devices & Rationale */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(Array.isArray(concept.devices) ? concept.devices : [concept.devices]).filter(Boolean).map((device: string, j: number) => (
                  <Badge key={j} variant="secondary" className="bg-slate-800/80 text-gray-300 border-slate-700 text-xs">
                    {device}
                  </Badge>
                ))}
              </div>

              {concept.rationale && concept.rationale !== 'No rationale' && (
                <p className="text-gray-500 text-xs italic border-l-2 border-gray-700 pl-3 mb-4">
                  {concept.rationale}
                </p>
              )}

              {/* Feedback */}
              <div className="flex gap-2 pt-2 border-t border-gray-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(i, 'more_like_this')}
                  className="text-gray-400 hover:text-green-400 hover:bg-green-900/20 text-xs"
                >
                  <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                  More Like This
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(i, 'less_like_this')}
                  className="text-gray-400 hover:text-red-400 hover:bg-red-900/20 text-xs"
                >
                  <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                  Less Like This
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFeedback(i, 'favorite')}
                  className="text-gray-400 hover:text-amber-400 hover:bg-amber-900/20 text-xs ml-auto"
                >
                  <Star className="w-3.5 h-3.5 mr-1.5" />
                  Favorite
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

ResultsDisplay.displayName = 'ResultsDisplay';

export default ResultsDisplay;
