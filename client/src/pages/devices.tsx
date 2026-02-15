import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ArrowLeft, Shuffle, Copy, ChevronDown, ChevronUp, BookOpen, Layers, GraduationCap, Zap, BarChart3, HelpCircle, Check, X, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

// Types
interface AdExample {
  brand: string;
  example: string;
  year: string;
}

interface EnhancedDevice {
  figure_name: string;
  id: string;
  definition: string;
  family: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  origin: string;
  advertising_use: string;
  ad_examples: AdExample[];
  category?: string;
}

interface FamilyInfo {
  name: string;
  description: string;
  subcategories: string[];
}

interface QuizQuestion {
  question: {
    ad_example: string;
    brand: string;
    year: string;
  };
  options: string[];
  correct_answer: string;
  hint: string;
}

interface DailyDevice extends EnhancedDevice {
  day: string;
}

// Category rules for grouping (same as before but used alongside families)
const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: 'Repetition', keywords: ['repetition', 'repeat', 'anaphora', 'epistrophe', 'epanalepsis', 'anadiplosis', 'polyptoton', 'symploce', 'conduplicatio', 'epizeuxis', 'diacope', 'palilogy'] },
  { category: 'Contrast & Opposition', keywords: ['contrast', 'opposite', 'juxtapos', 'antithesis', 'oxymoron', 'paradox', 'antimetabole', 'chiasmus'] },
  { category: 'Comparison & Analogy', keywords: ['metaphor', 'comparison', 'likened', 'simile', 'analogy', 'allegory', 'parable'] },
  { category: 'Irony & Wit', keywords: ['irony', 'ironic', 'mock', 'sarcas', 'feign', 'pretend', 'dissimulation'] },
  { category: 'Amplification', keywords: ['exaggerat', 'amplif', 'intensif', 'hyperbole', 'climax', 'auxesis', 'incrementum'] },
  { category: 'Omission & Brevity', keywords: ['omission', 'omit', 'leaving out', 'absence', 'ellipsis', 'asyndeton', 'brachylogia', 'aposiopesis'] },
  { category: 'Word Order & Structure', keywords: ['order', 'arrangement', 'inversion', 'syntax', 'anastrophe', 'hyperbaton', 'hysteron', 'parenthesis'] },
  { category: 'Sound & Rhythm', keywords: ['sound', 'rhythm', 'rhyme', 'alliterat', 'assonance', 'consonance', 'onomatopoeia', 'homoioteleuton'] },
  { category: 'Emotion & Appeal', keywords: ['emotion', 'passion', 'feeling', 'pathos', 'appeal', 'exclamation', 'ecphonesis'] },
  { category: 'Questioning', keywords: ['question', 'asking', 'rhetorical question', 'erotesis', 'hypophora'] },
  { category: 'Naming & Substitution', keywords: ['naming', 'coining', 'neologism', 'metonymy', 'synecdoche', 'antonomasia', 'periphrasis', 'euphemism'] },
  { category: 'Description & Imagery', keywords: ['description', 'image', 'picture', 'vivid', 'portrait', 'ecphrasis', 'enargeia', 'hypotyposis'] },
  { category: 'Dialogue & Address', keywords: ['address', 'apostrophe', 'prosopopoeia', 'dialogue', 'speaking', 'personif'] },
];

function categorizeDevice(name: string, definition: string): string {
  const lower = (name + ' ' + definition).toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) return rule.category;
  }
  return 'General';
}

const CATEGORY_STYLES: Record<string, { border: string; text: string; bg: string }> = {
  'Repetition': { border: 'border-blue-600', text: 'text-blue-400', bg: 'bg-blue-950/40' },
  'Contrast & Opposition': { border: 'border-amber-600', text: 'text-amber-400', bg: 'bg-amber-950/40' },
  'Comparison & Analogy': { border: 'border-purple-600', text: 'text-purple-400', bg: 'bg-purple-950/40' },
  'Irony & Wit': { border: 'border-red-600', text: 'text-red-400', bg: 'bg-red-950/40' },
  'Amplification': { border: 'border-orange-600', text: 'text-orange-400', bg: 'bg-orange-950/40' },
  'Omission & Brevity': { border: 'border-gray-600', text: 'text-gray-400', bg: 'bg-gray-800/40' },
  'Word Order & Structure': { border: 'border-cyan-600', text: 'text-cyan-400', bg: 'bg-cyan-950/40' },
  'Sound & Rhythm': { border: 'border-green-600', text: 'text-green-400', bg: 'bg-green-950/40' },
  'Emotion & Appeal': { border: 'border-pink-600', text: 'text-pink-400', bg: 'bg-pink-950/40' },
  'Questioning': { border: 'border-indigo-600', text: 'text-indigo-400', bg: 'bg-indigo-950/40' },
  'Naming & Substitution': { border: 'border-teal-600', text: 'text-teal-400', bg: 'bg-teal-950/40' },
  'Description & Imagery': { border: 'border-violet-600', text: 'text-violet-400', bg: 'bg-violet-950/40' },
  'Dialogue & Address': { border: 'border-rose-600', text: 'text-rose-400', bg: 'bg-rose-950/40' },
  'General': { border: 'border-slate-600', text: 'text-slate-400', bg: 'bg-slate-800/40' },
};

const FAMILY_STYLES: Record<string, { border: string; text: string; bg: string; label: string }> = {
  'schemes': { border: 'border-blue-500', text: 'text-blue-300', bg: 'bg-blue-950/30', label: 'Scheme' },
  'tropes': { border: 'border-amber-500', text: 'text-amber-300', bg: 'bg-amber-950/30', label: 'Trope' },
  'figures_of_thought': { border: 'border-purple-500', text: 'text-purple-300', bg: 'bg-purple-950/30', label: 'Figure of Thought' },
  'figures_of_sound': { border: 'border-green-500', text: 'text-green-300', bg: 'bg-green-950/30', label: 'Figure of Sound' },
  'figures_of_amplification': { border: 'border-orange-500', text: 'text-orange-300', bg: 'bg-orange-950/30', label: 'Amplification' },
};

const DIFFICULTY_STYLES: Record<string, { text: string; border: string; label: string }> = {
  'beginner': { text: 'text-green-400', border: 'border-green-700', label: 'Beginner' },
  'intermediate': { text: 'text-yellow-400', border: 'border-yellow-700', label: 'Intermediate' },
  'advanced': { text: 'text-red-400', border: 'border-red-700', label: 'Advanced' },
};

type ViewMode = 'grid' | 'list';
type PageTab = 'browse' | 'families' | 'quiz' | 'analytics';

// ============================================
// DEVICE OF THE DAY COMPONENT
// ============================================
function DeviceOfTheDay() {
  const { data: daily, isLoading } = useQuery<DailyDevice>({
    queryKey: ['/api/devices/daily'],
    queryFn: async () => {
      const res = await fetch('/api/devices/daily');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  if (isLoading || !daily) return null;

  const familyStyle = FAMILY_STYLES[daily.family] || FAMILY_STYLES['figures_of_thought'];
  const diffStyle = DIFFICULTY_STYLES[daily.difficulty] || DIFFICULTY_STYLES['intermediate'];

  return (
    <div className="border border-white/10 bg-gray-950 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Zap className="w-5 h-5 text-yellow-400" />
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Device of the Day</h2>
        <span className="text-[10px] text-gray-600 font-mono ml-auto">{daily.day}</span>
      </div>
      <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-3">{daily.figure_name}</h3>
      <p className="text-sm text-gray-300 leading-relaxed mb-4">{daily.definition}</p>
      <div className="flex gap-2 mb-4">
        <Badge variant="outline" className={`text-[10px] ${familyStyle.text} ${familyStyle.border}`}>
          {familyStyle.label}
        </Badge>
        <Badge variant="outline" className={`text-[10px] ${diffStyle.text} ${diffStyle.border}`}>
          {diffStyle.label}
        </Badge>
      </div>
      {daily.origin && (
        <div className="mb-4">
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 font-mono">Origin</h4>
          <p className="text-xs text-gray-400">{daily.origin}</p>
        </div>
      )}
      {daily.advertising_use && (
        <div className="mb-4">
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 font-mono">In Advertising</h4>
          <p className="text-xs text-gray-400">{daily.advertising_use}</p>
        </div>
      )}
      {daily.ad_examples.length > 0 && (
        <div>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 font-mono">Real-World Examples</h4>
          <div className="space-y-2">
            {daily.ad_examples.map((ex, i) => (
              <div key={i} className="border border-gray-800 bg-gray-900/50 p-3">
                <p className="text-xs text-gray-300 italic">"{ex.example}"</p>
                <p className="text-[10px] text-gray-500 mt-1">{ex.brand}, {ex.year}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// QUIZ MODE COMPONENT
// ============================================
function QuizMode() {
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showHint, setShowHint] = useState(false);

  const fetchQuestion = async () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setShowHint(false);
    const res = await fetch('/api/devices/quiz');
    if (res.ok) {
      setCurrentQuestion(await res.json());
    }
  };

  useEffect(() => { fetchQuestion(); }, []);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    const isCorrect = answer === currentQuestion?.correct_answer;
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  if (!currentQuestion) {
    return <div className="text-center py-12 text-gray-500">Loading quiz...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Score */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
          Device Quiz
        </h2>
        <div className="text-xs font-mono text-gray-500">
          {score.correct}/{score.total} correct
          {score.total > 0 && (
            <span className="ml-2 text-gray-600">
              ({Math.round(score.correct / score.total * 100)}%)
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="border border-white/10 bg-gray-950 p-6 mb-6">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 font-mono">
          Which rhetorical device is used here?
        </p>
        <blockquote className="text-lg text-white font-medium leading-relaxed mb-2 border-l-2 border-white/20 pl-4">
          "{currentQuestion.question.ad_example}"
        </blockquote>
        <p className="text-xs text-gray-500">
          -- {currentQuestion.question.brand}, {currentQuestion.question.year}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2 mb-6">
        {currentQuestion.options.map(option => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === currentQuestion.correct_answer;
          let style = 'border-gray-700 text-gray-300 hover:border-gray-500';
          if (showResult) {
            if (isCorrect) style = 'border-green-500 text-green-300 bg-green-950/30';
            else if (isSelected && !isCorrect) style = 'border-red-500 text-red-300 bg-red-950/30';
          } else if (isSelected) {
            style = 'border-white text-white';
          }

          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              className={`text-left p-4 border transition-all text-sm font-medium uppercase tracking-wide ${style}`}
              disabled={showResult}
            >
              <div className="flex items-center gap-3">
                {showResult && isCorrect && <Check className="w-4 h-4 text-green-400 shrink-0" />}
                {showResult && isSelected && !isCorrect && <X className="w-4 h-4 text-red-400 shrink-0" />}
                {option}
              </div>
            </button>
          );
        })}
      </div>

      {/* Hint / Result */}
      {!showResult && (
        <button
          onClick={() => setShowHint(!showHint)}
          className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
        >
          {showHint ? 'Hide hint' : 'Show hint'}
        </button>
      )}
      {showHint && !showResult && currentQuestion.hint && (
        <p className="text-xs text-gray-500 mt-2 border-l border-gray-700 pl-3 italic">
          {currentQuestion.hint}
        </p>
      )}

      {showResult && (
        <div className="flex items-center gap-4">
          <p className={`text-sm font-bold ${selectedAnswer === currentQuestion.correct_answer ? 'text-green-400' : 'text-red-400'}`}>
            {selectedAnswer === currentQuestion.correct_answer ? 'Correct' : `The answer: ${currentQuestion.correct_answer}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQuestion}
            className="text-xs border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800 ml-auto"
          >
            Next Question
            <ArrowRight className="w-3 h-3 ml-1.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// ANALYTICS VIEW
// ============================================
function AnalyticsView({ devices }: { devices: EnhancedDevice[] }) {
  // Analyze gallery data from localStorage
  const analytics = useMemo(() => {
    let stored: any[] = [];
    try {
      const raw = localStorage.getItem('concept_history');
      if (raw) stored = JSON.parse(raw);
    } catch {}

    // Count device usage
    const deviceCounts: Record<string, number> = {};
    stored.forEach((concept: any) => {
      const device = concept.rhetoricalDevice?.toLowerCase()?.trim();
      if (device) {
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      }
    });

    const sorted = Object.entries(deviceCounts)
      .sort((a, b) => b[1] - a[1]);

    // Family distribution
    const familyCounts: Record<string, number> = {};
    const difficultyCounts: Record<string, number> = { beginner: 0, intermediate: 0, advanced: 0 };
    devices.forEach(d => {
      familyCounts[d.family] = (familyCounts[d.family] || 0) + 1;
      difficultyCounts[d.difficulty] = (difficultyCounts[d.difficulty] || 0) + 1;
    });

    return { deviceUsage: sorted, familyCounts, difficultyCounts, totalConcepts: stored.length };
  }, [devices]);

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-gray-800 bg-gray-950 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Total Devices</p>
          <p className="text-2xl font-black text-white">{devices.length}</p>
        </div>
        <div className="border border-gray-800 bg-gray-950 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Gallery Concepts</p>
          <p className="text-2xl font-black text-white">{analytics.totalConcepts}</p>
        </div>
        <div className="border border-gray-800 bg-gray-950 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Devices Used</p>
          <p className="text-2xl font-black text-white">{analytics.deviceUsage.length}</p>
        </div>
        <div className="border border-gray-800 bg-gray-950 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Coverage</p>
          <p className="text-2xl font-black text-white">
            {devices.length > 0 ? Math.round(analytics.deviceUsage.length / devices.length * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Most Used Devices */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">Most Used Devices</h3>
        {analytics.deviceUsage.length === 0 ? (
          <p className="text-sm text-gray-600">No gallery concepts yet. Generate concepts to see device usage analytics.</p>
        ) : (
          <div className="space-y-1">
            {analytics.deviceUsage.slice(0, 20).map(([name, count], i) => {
              const maxCount = analytics.deviceUsage[0][1] as number;
              const pct = (count as number) / (maxCount as number) * 100;
              return (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-gray-600 w-5 text-right">{i + 1}</span>
                  <span className="text-xs text-gray-300 w-40 truncate uppercase font-bold">{name}</span>
                  <div className="flex-1 h-4 bg-gray-900 border border-gray-800 relative">
                    <div
                      className="h-full bg-white/10"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-500 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Difficulty Breakdown */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">By Difficulty</h3>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(analytics.difficultyCounts).map(([diff, count]) => {
            const style = DIFFICULTY_STYLES[diff] || DIFFICULTY_STYLES['intermediate'];
            return (
              <div key={diff} className={`border ${style.border} bg-gray-950 p-4`}>
                <p className={`text-[10px] font-mono uppercase tracking-widest ${style.text} mb-1`}>{diff}</p>
                <p className="text-xl font-black text-white">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Family Breakdown */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">By Family</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(analytics.familyCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([family, count]) => {
              const style = FAMILY_STYLES[family] || FAMILY_STYLES['figures_of_thought'];
              return (
                <div key={family} className={`border ${style.border} bg-gray-950 p-4 flex items-center justify-between`}>
                  <span className={`text-xs font-bold uppercase ${style.text}`}>{style.label}</span>
                  <span className="text-lg font-black text-white">{count}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// FAMILIES VIEW
// ============================================
function FamiliesView({ devices, families }: { devices: EnhancedDevice[]; families: Record<string, FamilyInfo> }) {
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, EnhancedDevice[]> = {};
    devices.forEach(d => {
      if (!map[d.family]) map[d.family] = [];
      map[d.family].push(d);
    });
    return map;
  }, [devices]);

  const familyOrder = ['schemes', 'tropes', 'figures_of_thought', 'figures_of_sound', 'figures_of_amplification'];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 mb-6">
        The classical rhetorical tradition organizes figures into families based on how they work.
        Understanding these families helps you choose the right device for your creative brief.
      </p>
      {familyOrder.map(familyKey => {
        const info = families[familyKey];
        const familyDevices = grouped[familyKey] || [];
        const style = FAMILY_STYLES[familyKey] || FAMILY_STYLES['figures_of_thought'];
        const isExpanded = expandedFamily === familyKey;

        if (!info && familyDevices.length === 0) return null;

        return (
          <div key={familyKey} className={`border ${style.border} bg-gray-950`}>
            <button
              onClick={() => setExpandedFamily(isExpanded ? null : familyKey)}
              className="w-full p-5 text-left flex items-center justify-between"
            >
              <div>
                <h3 className={`text-lg font-black uppercase tracking-tight ${style.text}`}>
                  {info?.name || familyKey}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{familyDevices.length} devices</p>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
            </button>
            {isExpanded && (
              <div className="px-5 pb-5">
                {info?.description && (
                  <p className="text-sm text-gray-400 mb-4 leading-relaxed">{info.description}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {familyDevices
                    .sort((a, b) => a.figure_name.localeCompare(b.figure_name))
                    .map(device => {
                      const diffStyle = DIFFICULTY_STYLES[device.difficulty] || DIFFICULTY_STYLES['intermediate'];
                      return (
                        <div key={device.id} className="border border-gray-800 bg-gray-900/50 p-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-xs font-black uppercase text-gray-200">{device.figure_name}</h4>
                            <Badge variant="outline" className={`text-[8px] ${diffStyle.text} ${diffStyle.border} shrink-0`}>
                              {diffStyle.label}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-gray-500 line-clamp-2">{device.definition}</p>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function DevicesPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [learnMode, setLearnMode] = useState(false);
  const [activeTab, setActiveTab] = useState<PageTab>('browse');
  const debouncedSearch = useDebounce(search, 200);
  const { toast } = useToast();

  // Fetch enhanced education data
  const { data: educationData, isLoading } = useQuery<{ devices: EnhancedDevice[]; families: Record<string, FamilyInfo> }>({
    queryKey: ['/api/devices/education'],
    queryFn: async () => {
      const res = await fetch('/api/devices/education');
      if (!res.ok) throw new Error('Failed to load devices');
      return res.json();
    },
  });

  const devices = educationData?.devices || [];
  const families = educationData?.families || {};

  const categorized = useMemo(() => {
    return devices.map(d => ({
      ...d,
      category: categorizeDevice(d.figure_name, d.definition),
    }));
  }, [devices]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    categorized.forEach(d => {
      counts[d.category!] = (counts[d.category!] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [categorized]);

  const filtered = useMemo(() => {
    let result = categorized;
    if (activeCategory) result = result.filter(d => d.category === activeCategory);
    if (activeDifficulty) result = result.filter(d => d.difficulty === activeDifficulty);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(d =>
        d.figure_name.toLowerCase().includes(q) ||
        d.definition.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q) ||
        d.family.toLowerCase().includes(q)
      );
    }
    return result;
  }, [categorized, activeCategory, activeDifficulty, debouncedSearch]);

  const randomDevice = useCallback(() => {
    if (devices.length === 0) return;
    const rand = devices[Math.floor(Math.random() * devices.length)];
    setSearch('');
    setActiveCategory(null);
    setActiveDifficulty(null);
    setExpandedDevice(rand.figure_name);
    setTimeout(() => {
      document.getElementById(`device-${rand.figure_name}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [devices]);

  const copyDevice = useCallback((device: EnhancedDevice) => {
    navigator.clipboard.writeText(`${device.figure_name}: ${device.definition}`);
    toast({ title: 'Copied to clipboard', duration: 1500 });
  }, [toast]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {/* Top row */}
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-black tracking-tight uppercase">Rhetorical Devices</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {devices.length} devices -- classical rhetoric to modern persuasion
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLearnMode(!learnMode)}
                className={`text-xs border-gray-700 bg-transparent hover:bg-gray-800 ${learnMode ? 'text-yellow-400 border-yellow-700' : 'text-gray-300'}`}
              >
                <GraduationCap className="w-3 h-3 mr-1.5" />
                Learn
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={randomDevice}
                className="text-xs border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800"
              >
                <Shuffle className="w-3 h-3 mr-1.5" />
                Random
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-3">
            {[
              { key: 'browse' as PageTab, label: 'Browse', icon: BookOpen },
              { key: 'families' as PageTab, label: 'Families', icon: Layers },
              { key: 'quiz' as PageTab, label: 'Quiz', icon: HelpCircle },
              { key: 'analytics' as PageTab, label: 'Analytics', icon: BarChart3 },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all border ${
                  activeTab === tab.key
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                <tab.icon className="w-3 h-3 inline mr-1.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + Filters (Browse tab only) */}
          {activeTab === 'browse' && (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search by name, definition, category, or family..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10 h-10 bg-gray-900 border-gray-700 text-white text-sm placeholder-gray-500 focus:border-white/30"
                  type="search"
                  autoComplete="off"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Difficulty filters */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {Object.entries(DIFFICULTY_STYLES).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => setActiveDifficulty(activeDifficulty === key ? null : key)}
                    className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      activeDifficulty === key
                        ? 'bg-white text-black border-white'
                        : `bg-transparent ${style.text} ${style.border}`
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
                <span className="text-gray-700 text-[10px] self-center px-1">|</span>
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 border border-gray-800"
                >
                  {viewMode === 'grid' ? 'List' : 'Grid'}
                </button>
              </div>

              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1.5 text-xs font-medium transition-all border ${
                    !activeCategory
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  All ({devices.length})
                </button>
                {categories.map(([cat, count]) => {
                  const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES['General'];
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                      className={`px-3 py-1.5 text-xs font-medium transition-all border ${
                        activeCategory === cat
                          ? 'bg-white text-black border-white'
                          : `bg-transparent ${style.text} ${style.border} hover:bg-gray-900`
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Device of the Day - shown on browse tab */}
        {activeTab === 'browse' && !search && !activeCategory && !activeDifficulty && (
          <DeviceOfTheDay />
        )}

        {activeTab === 'browse' && (
          <>
            {isLoading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3' : 'space-y-2'}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-28 bg-gray-900/50 border border-gray-800 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24 text-gray-500">
                <BookOpen className="w-16 h-16 mx-auto mb-6 opacity-20" />
                <p className="text-xl font-bold mb-2">No devices match your search</p>
                <p className="text-sm text-gray-600">Try a different term or browse by category</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearch(''); setActiveCategory(null); setActiveDifficulty(null); }}
                  className="mt-6 border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800"
                >
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-600 font-mono uppercase tracking-wider">
                    {filtered.length} device{filtered.length !== 1 ? 's' : ''} shown
                  </p>
                </div>

                <div className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'
                    : 'space-y-2'
                }>
                  {filtered.map(device => {
                    const isExpanded = expandedDevice === device.figure_name;
                    const catStyle = CATEGORY_STYLES[device.category || 'General'] || CATEGORY_STYLES['General'];
                    const familyStyle = FAMILY_STYLES[device.family] || FAMILY_STYLES['figures_of_thought'];
                    const diffStyle = DIFFICULTY_STYLES[device.difficulty] || DIFFICULTY_STYLES['intermediate'];

                    return (
                      <article
                        key={device.figure_name}
                        id={`device-${device.figure_name}`}
                        onClick={() => setExpandedDevice(isExpanded ? null : device.figure_name)}
                        className={`cursor-pointer border transition-all group ${
                          isExpanded
                            ? `bg-gray-900 ${catStyle.border} ${viewMode === 'grid' ? 'col-span-1 md:col-span-2 xl:col-span-3' : ''}`
                            : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className={`font-black tracking-wide uppercase text-sm ${
                              isExpanded ? 'text-white' : 'text-gray-200 group-hover:text-white'
                            }`}>
                              {device.figure_name}
                            </h3>
                            <div className="flex gap-1 shrink-0">
                              <Badge
                                variant="outline"
                                className={`text-[8px] ${diffStyle.text} ${diffStyle.border}`}
                              >
                                {diffStyle.label}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[8px] ${familyStyle.text} ${familyStyle.border}`}
                              >
                                {familyStyle.label}
                              </Badge>
                            </div>
                          </div>
                          <p className={`text-sm leading-relaxed ${
                            isExpanded ? 'text-gray-300' : 'text-gray-500 line-clamp-2'
                          }`}>
                            {device.definition}
                          </p>

                          {isExpanded && (learnMode || true) && (
                            <div className="mt-5 pt-5 border-t border-gray-800">
                              {/* Learn Mode: Origin */}
                              {device.origin && (
                                <div className="mb-5">
                                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 font-mono">
                                    Origin & Etymology
                                  </h4>
                                  <p className="text-sm text-gray-400 leading-relaxed">
                                    {device.origin}
                                  </p>
                                </div>
                              )}

                              {/* Learn Mode: How it works in advertising */}
                              {device.advertising_use && (
                                <div className="mb-5">
                                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 font-mono">
                                    How It Works in Advertising
                                  </h4>
                                  <p className="text-sm text-gray-400 leading-relaxed">
                                    {device.advertising_use}
                                  </p>
                                </div>
                              )}

                              {/* Learn Mode: 3 Real-world ad examples */}
                              {device.ad_examples.length > 0 && (
                                <div className="mb-5">
                                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 font-mono">
                                    Real-World Ad Examples
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {device.ad_examples.map((ex, i) => (
                                      <div key={i} className="border border-gray-800 bg-gray-900/50 p-3">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{ex.brand}</p>
                                        <p className="text-xs text-gray-300 italic leading-relaxed">"{ex.example}"</p>
                                        <p className="text-[10px] text-gray-600 mt-1">{ex.year}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="mt-4 flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800"
                                  onClick={(e) => { e.stopPropagation(); copyDevice(device); }}
                                >
                                  <Copy className="w-3 h-3 mr-1.5" />
                                  Copy
                                </Button>
                                <Link href={`/?device=${encodeURIComponent(device.figure_name)}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Use in Brief
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'families' && (
          <FamiliesView devices={devices} families={families} />
        )}

        {activeTab === 'quiz' && (
          <QuizMode />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView devices={devices} />
        )}
      </div>
    </div>
  );
}
