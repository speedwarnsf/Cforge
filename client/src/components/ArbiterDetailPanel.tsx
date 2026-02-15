import React, { memo } from 'react';

interface ArbiterScore {
  name: string;
  short: string;
  value: number;
  reasoning?: string;
}

interface ArbiterDetailPanelProps {
  originalityScore?: number;
  professionalismScore?: number;
  clarityScore?: number;
  freshnessScore?: number;
  resonanceScore?: number;
  awardsScore?: number;
  finalStatus?: string;
  critique?: string;
  juryComment?: string;
  improvementTip?: string;
  reflection?: string;
  vibe?: string;
}

function getGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C+';
  if (score >= 50) return 'C';
  return 'D';
}

function gradeColor(score: number): string {
  if (score >= 85) return 'text-emerald-400 border-emerald-700/50 bg-emerald-950/30';
  if (score >= 70) return 'text-green-400 border-green-700/50 bg-green-950/30';
  if (score >= 55) return 'text-yellow-400 border-yellow-700/50 bg-yellow-950/30';
  if (score >= 40) return 'text-orange-400 border-orange-700/50 bg-orange-950/30';
  return 'text-red-400 border-red-700/50 bg-red-950/30';
}

function barWidth(score: number): string {
  return `${Math.min(100, Math.max(0, score))}%`;
}

function barColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-green-500';
  if (score >= 55) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getStatusLabel(status?: string) {
  if (!status) return null;
  const map: Record<string, { text: string; cls: string }> = {
    'Passed': { text: 'PASSED', cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50' },
    'Needs Review': { text: 'NEEDS REVIEW', cls: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50' },
    'Failed': { text: 'FAILED', cls: 'bg-red-900/50 text-red-300 border-red-700/50' },
  };
  const m = map[status] || { text: status, cls: 'bg-gray-800 text-gray-300 border-gray-600' };
  return <span className={`text-[10px] px-2 py-0.5 border font-mono tracking-wider ${m.cls}`}>{m.text}</span>;
}

const ArbiterDetailPanel = memo(function ArbiterDetailPanel({
  originalityScore = 0,
  professionalismScore = 0,
  clarityScore = 0,
  freshnessScore = 0,
  resonanceScore = 0,
  awardsScore = 0,
  finalStatus,
  critique,
  juryComment,
  improvementTip,
  reflection,
  vibe,
}: ArbiterDetailPanelProps) {
  const arbiters: ArbiterScore[] = [
    {
      name: 'Originality',
      short: 'ORI',
      value: originalityScore,
      reasoning: originalityScore > 0
        ? originalityScore >= 80
          ? 'High creative divergence from existing work. Fresh perspective and novel approach.'
          : originalityScore >= 60
            ? 'Moderate originality. Some familiar elements but with distinct execution.'
            : 'Low originality. Concept shares significant overlap with common approaches.'
        : undefined,
    },
    {
      name: 'Professionalism',
      short: 'PRO',
      value: professionalismScore,
      reasoning: critique || (professionalismScore > 0
        ? professionalismScore >= 80
          ? 'Campaign-ready quality. Clean execution with strong craft.'
          : professionalismScore >= 60
            ? 'Solid professional quality with room for polish.'
            : 'Needs significant refinement before presentation.'
        : undefined),
    },
    {
      name: 'Clarity',
      short: 'CLR',
      value: clarityScore,
      reasoning: clarityScore > 0
        ? clarityScore >= 80
          ? 'Message is immediately clear. Single-minded proposition lands instantly.'
          : clarityScore >= 60
            ? 'Core message comes through but could be sharper.'
            : 'Message is muddled. Multiple competing ideas dilute impact.'
        : undefined,
    },
    {
      name: 'Freshness',
      short: 'FRS',
      value: freshnessScore,
      reasoning: freshnessScore > 0
        ? freshnessScore >= 80
          ? 'Feels genuinely new. Avoids category cliches and tired tropes.'
          : freshnessScore >= 60
            ? 'Some fresh elements mixed with familiar category conventions.'
            : 'Relies heavily on well-worn approaches. Needs a bolder angle.'
        : undefined,
    },
    {
      name: 'Audience Resonance',
      short: 'RES',
      value: resonanceScore,
      reasoning: reflection || vibe || (resonanceScore > 0
        ? resonanceScore >= 80
          ? 'Strong emotional connection with target audience. Culturally attuned.'
          : resonanceScore >= 60
            ? 'Reasonable audience fit. Some cultural or emotional gaps.'
            : 'Weak audience connection. Rethink the emotional or cultural angle.'
        : undefined),
    },
    {
      name: 'Awards Potential',
      short: 'AWD',
      value: awardsScore,
      reasoning: juryComment || (awardsScore > 0
        ? awardsScore >= 80
          ? 'Strong awards contender. Craft, insight, and originality align at a high level.'
          : awardsScore >= 60
            ? 'Solid work with some award-worthy elements. Needs elevation in execution.'
            : 'Unlikely to stand out in award competitions without major rework.'
        : undefined),
    },
  ].filter(s => s.value > 0);

  if (arbiters.length === 0) return null;

  const avgScore = Math.round(arbiters.reduce((sum, a) => sum + a.value, 0) / arbiters.length);

  return (
    <div className="space-y-4" role="region" aria-label="Arbiter quality assessment">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">
          Arbiter Assessment
        </h4>
        <div className="flex items-center gap-2">
          {getStatusLabel(finalStatus)}
          <span className={`text-xs font-mono px-2 py-0.5 border ${gradeColor(avgScore)}`}>
            AVG {avgScore}%
          </span>
        </div>
      </div>

      {/* Score rows */}
      <div className="space-y-3">
        {arbiters.map(arbiter => (
          <div key={arbiter.short} className="space-y-1">
            {/* Score header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500 w-6">{arbiter.short}</span>
                <span className="text-xs text-gray-300 font-medium">{arbiter.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-black ${arbiter.value >= 70 ? 'text-emerald-400' : arbiter.value >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {getGrade(arbiter.value)}
                </span>
                <span className="text-xs text-gray-500 font-mono tabular-nums w-8 text-right">{arbiter.value}%</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${barColor(arbiter.value)}`}
                style={{ width: barWidth(arbiter.value) }}
              />
            </div>

            {/* Reasoning */}
            {arbiter.reasoning && (
              <p className="text-[11px] text-gray-500 leading-relaxed pl-8">
                {arbiter.reasoning}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Improvement tip */}
      {improvementTip && (
        <div className="border-t border-gray-800 pt-3">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono mb-1">
            Improvement Tip
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">{improvementTip}</p>
        </div>
      )}
    </div>
  );
});

export default ArbiterDetailPanel;
