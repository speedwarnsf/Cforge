import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowLeft, BookOpen, Shuffle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';

interface RhetoricalDevice {
  figure_name: string;
  definition: string;
}

// Categorize devices by their rhetorical function
function categorizeDevice(name: string, definition: string): string {
  const def = definition.toLowerCase();
  const n = name.toLowerCase();
  
  if (def.includes('repetition') || def.includes('repeat') || n.includes('anaphora') || n.includes('epistrophe') || n.includes('epanalepsis'))
    return 'Repetition';
  if (def.includes('contrast') || def.includes('opposite') || def.includes('juxtapos') || n.includes('antithesis') || n.includes('oxymoron'))
    return 'Contrast';
  if (def.includes('metaphor') || def.includes('comparison') || def.includes('likened') || def.includes('simile') || def.includes('analogy'))
    return 'Comparison';
  if (def.includes('irony') || def.includes('ironic') || def.includes('mock') || def.includes('sarcas') || def.includes('feign'))
    return 'Irony';
  if (def.includes('exaggerat') || def.includes('amplif') || def.includes('intensif') || n.includes('hyperbole'))
    return 'Amplification';
  if (def.includes('omission') || def.includes('omit') || def.includes('leaving out') || def.includes('absence') || def.includes('ellipsis'))
    return 'Omission';
  if (def.includes('order') || def.includes('arrangement') || def.includes('structure') || def.includes('inversion') || def.includes('syntax'))
    return 'Structure';
  if (def.includes('sound') || def.includes('rhythm') || def.includes('rhyme') || def.includes('alliterat') || def.includes('assonance'))
    return 'Sound';
  if (def.includes('emotion') || def.includes('passion') || def.includes('feeling') || def.includes('pathos') || def.includes('appeal'))
    return 'Emotion';
  if (def.includes('question') || def.includes('asking') || def.includes('rhetorical question'))
    return 'Question';
  if (def.includes('naming') || def.includes('word') || def.includes('coining') || def.includes('neologism') || def.includes('language'))
    return 'Language';
  
  return 'General';
}

const CATEGORY_COLORS: Record<string, string> = {
  'Repetition': 'border-blue-500 text-blue-400',
  'Contrast': 'border-amber-500 text-amber-400',
  'Comparison': 'border-purple-500 text-purple-400',
  'Irony': 'border-red-500 text-red-400',
  'Amplification': 'border-orange-500 text-orange-400',
  'Omission': 'border-gray-500 text-gray-400',
  'Structure': 'border-cyan-500 text-cyan-400',
  'Sound': 'border-green-500 text-green-400',
  'Emotion': 'border-pink-500 text-pink-400',
  'Question': 'border-indigo-500 text-indigo-400',
  'Language': 'border-teal-500 text-teal-400',
  'General': 'border-slate-500 text-slate-400',
};

export default function DevicesPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 200);

  const { data: devices = [], isLoading } = useQuery<RhetoricalDevice[]>({
    queryKey: ['/api/devices'],
    queryFn: async () => {
      const res = await fetch('/api/devices');
      if (!res.ok) throw new Error('Failed to load devices');
      return res.json();
    },
  });

  const categorized = useMemo(() => {
    return devices.map(d => ({
      ...d,
      category: categorizeDevice(d.figure_name, d.definition),
    }));
  }, [devices]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    categorized.forEach(d => {
      counts[d.category] = (counts[d.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [categorized]);

  const filtered = useMemo(() => {
    let result = categorized;
    if (activeCategory) result = result.filter(d => d.category === activeCategory);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(d =>
        d.figure_name.toLowerCase().includes(q) ||
        d.definition.toLowerCase().includes(q)
      );
    }
    return result;
  }, [categorized, activeCategory, debouncedSearch]);

  const randomDevice = () => {
    if (devices.length === 0) return;
    const rand = devices[Math.floor(Math.random() * devices.length)];
    setSearch('');
    setActiveCategory(null);
    setExpandedDevice(rand.figure_name);
    // Scroll to it
    setTimeout(() => {
      document.getElementById(`device-${rand.figure_name}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-wide uppercase">Rhetorical Device Library</h1>
              <p className="text-xs text-gray-500">{devices.length} devices from classical rhetoric to modern persuasion</p>
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={randomDevice}
                className="text-xs border-gray-600 text-gray-300 bg-transparent hover:bg-gray-800"
              >
                <Shuffle className="w-3 h-3 mr-1.5" />
                Random
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search devices by name or definition..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-9 bg-gray-900 border-gray-700 text-white text-sm placeholder-gray-500"
              type="search"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1 text-xs font-medium transition-colors border ${
                !activeCategory
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'
              }`}
            >
              All ({devices.length})
            </button>
            {categories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1 text-xs font-medium transition-colors border ${
                  activeCategory === cat
                    ? 'bg-white text-black border-white'
                    : `bg-transparent ${CATEGORY_COLORS[cat] || 'text-gray-400 border-gray-700'} hover:bg-gray-900`
                }`}
              >
                {cat} ({count})
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Device Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-900/50 border border-gray-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-1">No devices match your search</p>
            <p className="text-sm">Try a different term or browse by category</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-600 mb-4 font-mono uppercase tracking-wider">
              {filtered.length} device{filtered.length !== 1 ? 's' : ''} shown
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map(device => {
                const isExpanded = expandedDevice === device.figure_name;
                const catColor = CATEGORY_COLORS[device.category] || 'border-gray-700 text-gray-400';
                
                return (
                  <article
                    key={device.figure_name}
                    id={`device-${device.figure_name}`}
                    onClick={() => setExpandedDevice(isExpanded ? null : device.figure_name)}
                    className={`cursor-pointer border transition-all group ${
                      isExpanded
                        ? 'bg-gray-900 border-white/30 col-span-1 md:col-span-2 xl:col-span-3'
                        : 'bg-gray-950 border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className={`font-bold tracking-wide uppercase text-sm ${
                          isExpanded ? 'text-white' : 'text-gray-200 group-hover:text-white'
                        }`}>
                          {device.figure_name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${catColor}`}
                        >
                          {device.category}
                        </Badge>
                      </div>
                      <p className={`text-sm leading-relaxed ${
                        isExpanded ? 'text-gray-300' : 'text-gray-500 line-clamp-2'
                      }`}>
                        {device.definition}
                      </p>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-800">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                In advertising
                              </h4>
                              <p className="text-sm text-gray-400">
                                {getAdvertisingUse(device.figure_name, device.definition)}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Example application
                              </h4>
                              <p className="text-sm text-gray-400 italic">
                                {getExample(device.figure_name, device.definition)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs border-gray-700 text-gray-400 bg-transparent hover:bg-gray-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${device.figure_name}: ${device.definition}`);
                              }}
                            >
                              Copy
                            </Button>
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
      </div>
    </div>
  );
}

// Generate contextual advertising use based on the definition
function getAdvertisingUse(name: string, definition: string): string {
  const def = definition.toLowerCase();
  if (def.includes('repetition') || def.includes('repeat'))
    return 'Use to reinforce brand messaging and create memorable taglines through strategic repetition of key phrases or structures.';
  if (def.includes('contrast') || def.includes('opposite'))
    return 'Create before/after narratives, competitor comparisons, or dramatic product reveals by positioning opposing ideas side by side.';
  if (def.includes('metaphor') || def.includes('comparison') || def.includes('simile'))
    return 'Transfer qualities from familiar concepts to your brand. Makes abstract benefits tangible and emotionally resonant.';
  if (def.includes('exaggerat') || def.includes('amplif'))
    return 'Heighten product claims for dramatic impact. Works well in humor-driven campaigns and attention-grabbing headlines.';
  if (def.includes('irony') || def.includes('feign'))
    return 'Subvert audience expectations. Effective for challenger brands and campaigns targeting sophisticated, media-literate audiences.';
  if (def.includes('question'))
    return 'Engage the audience directly. Rhetorical questions create involvement and lead readers to your predetermined conclusion.';
  if (def.includes('sound') || def.includes('rhythm'))
    return 'Increase memorability and shareability. Sound devices make taglines stick in memory and work well in audio/video.';
  if (def.includes('omission') || def.includes('absence'))
    return 'Create intrigue and audience participation. What you leave unsaid can be more powerful than what you say.';
  return 'Apply this device to add rhetorical sophistication to headlines, body copy, and visual concepts for deeper audience impact.';
}

function getExample(name: string, definition: string): string {
  const def = definition.toLowerCase();
  if (def.includes('repetition'))
    return '"Because you\'re worth it. Because you deserve it. Because it\'s time." -- Three-beat repetition for emphasis.';
  if (def.includes('contrast') || def.includes('opposite'))
    return '"Small car. Big statement." -- Contrasting scale to highlight unexpected value.';
  if (def.includes('metaphor'))
    return '"Red Bull gives you wings." -- Product benefit as physical transformation.';
  if (def.includes('exaggerat'))
    return '"The best a man can get." -- Absolute superlative as aspirational positioning.';
  if (def.includes('irony') || def.includes('feign'))
    return '"Think different." -- Apple\'s ironic simplicity in an industry of jargon.';
  if (def.includes('question'))
    return '"Got milk?" -- Two-word question that became a cultural phenomenon.';
  return `Apply "${name}" to transform a straightforward product claim into a more compelling, memorable message.`;
}
