import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Clock } from 'lucide-react';

export interface ConceptVersion {
  id: string;
  headline: string;
  version: number;
  refinementType?: string;
  timestamp: string;
  originalityScore?: number;
}

interface ConceptVersionHistoryProps {
  versions: ConceptVersion[];
  currentId: string;
  onSelectVersion: (id: string) => void;
}

export default function ConceptVersionHistory({ versions, currentId, onSelectVersion }: ConceptVersionHistoryProps) {
  if (versions.length <= 1) return null;

  return (
    <div className="border border-gray-800 bg-gray-950/50 p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-3.5 h-3.5 text-gray-500" />
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">Version History</h4>
        <span className="text-[10px] text-gray-600 font-mono">{versions.length} versions</span>
      </div>
      
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {versions.map((v, i) => {
          const isCurrent = v.id === currentId;
          return (
            <React.Fragment key={v.id}>
              <button
                onClick={() => onSelectVersion(v.id)}
                className={`shrink-0 px-3 py-2 border transition-all text-left ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-950/30'
                    : 'border-gray-800 hover:border-gray-600 bg-gray-900/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold ${isCurrent ? 'text-blue-400' : 'text-gray-400'}`}>
                    v{v.version}
                  </span>
                  {v.refinementType && (
                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-gray-700 text-gray-500">
                      {v.refinementType}
                    </Badge>
                  )}
                </div>
                <p className={`text-[10px] leading-snug max-w-[140px] truncate ${
                  isCurrent ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {v.headline}
                </p>
                {v.originalityScore !== undefined && v.originalityScore > 0 && (
                  <span className="text-[9px] text-gray-600 font-mono">{Math.round(v.originalityScore)}% orig</span>
                )}
              </button>
              {i < versions.length - 1 && (
                <ArrowRight className="w-3 h-3 text-gray-700 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
