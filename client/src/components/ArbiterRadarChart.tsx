import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface ArbiterRadarChartProps {
  data: Array<{ subject: string; score: number; fullMark: number }>;
}

export default function ArbiterRadarChart({ data }: ArbiterRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
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
  );
}
