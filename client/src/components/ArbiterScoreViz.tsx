import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface ArbiterScoreVizProps {
  originalityScore?: number;
  professionalismScore?: number;
  clarityScore?: number;
  freshnessScore?: number;
  resonanceScore?: number;
  awardsScore?: number;
  finalStatus?: string;
  compact?: boolean;
}

function getGradeColor(score: number): string {
  if (score >= 85) return 'text-emerald-400';
  if (score >= 70) return 'text-green-400';
  if (score >= 55) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getGradeLetter(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  if (score >= 50) return 'C-';
  return 'D';
}

function getStatusBadge(status?: string) {
  if (!status) return null;
  const colors: Record<string, string> = {
    'Passed': 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
    'Needs Review': 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
    'Failed': 'bg-red-900/50 text-red-300 border-red-700/50',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${colors[status] || 'bg-gray-800 text-gray-300 border-gray-600'}`}>
      {status}
    </span>
  );
}

const ArbiterScoreViz = React.memo(function ArbiterScoreViz({
  originalityScore = 0,
  professionalismScore = 0,
  clarityScore = 0,
  freshnessScore = 0,
  resonanceScore = 0,
  awardsScore = 0,
  finalStatus,
  compact = false,
}: ArbiterScoreVizProps) {
  const scores = [
    { name: 'Originality', value: originalityScore, short: 'ORI' },
    { name: 'Professionalism', value: professionalismScore, short: 'PRO' },
    { name: 'Clarity', value: clarityScore, short: 'CLR' },
    { name: 'Freshness', value: freshnessScore, short: 'FRS' },
    { name: 'Resonance', value: resonanceScore, short: 'RES' },
    { name: 'Awards', value: awardsScore, short: 'AWD' },
  ].filter(s => s.value > 0);

  if (scores.length === 0) return null;

  const radarData = scores.map(s => ({ subject: s.short, score: s.value, fullMark: 100 }));

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5" role="list" aria-label="Quality scores">
        {scores.map(s => (
          <div key={s.short} className="flex items-center gap-1 bg-gray-800/60 px-2 py-1 rounded text-xs" role="listitem" aria-label={`${s.name}: ${s.value}%`}>
            <span className="text-gray-400" aria-hidden="true">{s.short}</span>
            <span className={`font-bold ${getGradeColor(s.value)}`}>{s.value}</span>
          </div>
        ))}
        {finalStatus && getStatusBadge(finalStatus)}
      </div>
    );
  }

  return (
    <div className="arbiter-scores" role="region" aria-label="Quality arbiter scores">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Quality Arbiter Scores</h4>
        {finalStatus && getStatusBadge(finalStatus)}
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        {/* Radar Chart */}
        {scores.length >= 3 && (
          <div className="w-full md:w-1/2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#60A5FA"
                  fill="#3B82F6"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '6px' }}
                  labelStyle={{ color: '#E5E7EB' }}
                  itemStyle={{ color: '#60A5FA' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Grade Cards */}
        <div className={`grid grid-cols-3 gap-2 ${scores.length >= 3 ? 'w-full md:w-1/2' : 'w-full'}`}>
          {scores.map(s => (
            <div key={s.short} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-2.5 text-center" aria-label={`${s.name}: ${getGradeLetter(s.value)} (${s.value}%)`}>
              <div className={`text-xl font-black ${getGradeColor(s.value)}`} aria-hidden="true">
                {getGradeLetter(s.value)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{s.name}</div>
              <div className="text-xs text-gray-500 font-mono">{s.value}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default ArbiterScoreViz;
