import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Check, Copy, Download, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ComparisonConcept {
  id: string;
  headline: string;
  tagline?: string;
  bodyCopy?: string;
  visualConcept?: string;
  devices: string | string[];
  originalityScore: number;
  professionalismScore?: number;
  clarityScore?: number;
  freshnessScore?: number;
  resonanceScore?: number;
  awardsScore?: number;
}

interface ConceptComparisonProps {
  concepts: ComparisonConcept[];
  onClose: () => void;
  onSelect?: (concept: ComparisonConcept) => void;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  if (!score) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-20 shrink-0 font-mono uppercase tracking-wider" style={{ fontSize: '9px' }}>{label}</span>
      <div className="flex-1 h-1.5 bg-gray-800">
        <div className="h-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-gray-400 font-mono w-8 text-right" style={{ fontSize: '10px' }}>{Math.round(score)}</span>
    </div>
  );
}

export default function ConceptComparison({ concepts, onClose, onSelect }: ConceptComparisonProps) {
  const { toast } = useToast();
  const [winnerId, setWinnerId] = useState<string | null>(null);

  if (concepts.length < 2) return null;

  // Take max 3 for side-by-side
  const compared = concepts.slice(0, 3);

  const copyText = (c: ComparisonConcept) => {
    const text = [c.headline, c.tagline, c.bodyCopy, c.visualConcept].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', duration: 1500 });
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Side-by-Side Comparison</h2>
            <p className="text-xs text-gray-500 font-mono mt-1">Comparing {compared.length} concepts -- select a winner or close</p>
          </div>
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Comparison Grid */}
        <div className={`grid gap-4 ${compared.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
          {compared.map((concept, i) => {
            const isWinner = winnerId === concept.id;
            const devices = Array.isArray(concept.devices) ? concept.devices : [concept.devices];
            
            return (
              <div
                key={concept.id}
                className={`border transition-all ${
                  isWinner
                    ? 'border-emerald-500 bg-emerald-950/20'
                    : winnerId
                      ? 'border-gray-800 opacity-60'
                      : 'border-gray-800 hover:border-gray-600'
                }`}
              >
                {/* Concept Number */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800/60">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 flex items-center justify-center text-sm font-black shrink-0 ${
                      isWinner ? 'bg-emerald-500 text-black' : 'bg-white text-black'
                    }`}>
                      {isWinner ? <Check className="w-5 h-5" /> : i + 1}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {devices.filter(Boolean).map((d, j) => (
                        <Badge key={j} variant="secondary" className="bg-gray-900 text-gray-400 border border-gray-800 text-[9px] uppercase tracking-widest font-mono">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => copyText(concept)} className="p-1.5 text-gray-600 hover:text-white transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  {concept.headline && (
                    <h3 className="text-xl font-black text-white leading-tight tracking-tight">
                      {concept.headline}
                    </h3>
                  )}

                  {concept.tagline && (
                    <p className="text-cyan-400 text-sm font-medium italic">{concept.tagline}</p>
                  )}

                  {concept.bodyCopy && (
                    <div>
                      <div className="text-[9px] text-gray-600 uppercase tracking-widest font-black mb-1 font-mono">Body Copy</div>
                      <p className="text-gray-300 text-xs leading-relaxed line-clamp-4">{concept.bodyCopy}</p>
                    </div>
                  )}

                  {concept.visualConcept && (
                    <div className="border-l-2 border-gray-700 pl-3">
                      <div className="text-[9px] text-gray-600 uppercase tracking-widest font-black mb-1 font-mono">Visual</div>
                      <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{concept.visualConcept}</p>
                    </div>
                  )}
                </div>

                {/* Scores */}
                <div className="px-5 pb-4 space-y-1.5">
                  <ScoreBar label="Original" score={concept.originalityScore} color="#10b981" />
                  <ScoreBar label="Pro" score={concept.professionalismScore || 0} color="#3b82f6" />
                  <ScoreBar label="Clarity" score={concept.clarityScore || 0} color="#8b5cf6" />
                  <ScoreBar label="Fresh" score={concept.freshnessScore || 0} color="#f59e0b" />
                  <ScoreBar label="Resonate" score={concept.resonanceScore || 0} color="#ec4899" />
                  <ScoreBar label="Awards" score={concept.awardsScore || 0} color="#06b6d4" />
                </div>

                {/* Select as winner */}
                <div className="p-4 border-t border-gray-800/60">
                  <Button
                    onClick={() => {
                      setWinnerId(isWinner ? null : concept.id);
                      if (!isWinner && onSelect) onSelect(concept);
                    }}
                    className={`w-full text-sm font-semibold ${
                      isWinner
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {isWinner ? (
                      <><Check className="w-4 h-4 mr-2" /> Selected</>
                    ) : (
                      <><Star className="w-4 h-4 mr-2" /> Select This One</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
