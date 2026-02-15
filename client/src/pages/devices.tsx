import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowLeft, Shuffle, Copy, ChevronDown, ChevronUp, BookOpen, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';

interface RhetoricalDevice {
  figure_name: string;
  definition: string;
}

// More comprehensive categorization with subcategories
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

type ViewMode = 'grid' | 'list';

export default function DevicesPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const debouncedSearch = useDebounce(search, 200);
  const { toast } = useToast();

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
        d.definition.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [categorized, activeCategory, debouncedSearch]);

  const randomDevice = useCallback(() => {
    if (devices.length === 0) return;
    const rand = devices[Math.floor(Math.random() * devices.length)];
    setSearch('');
    setActiveCategory(null);
    setExpandedDevice(rand.figure_name);
    setTimeout(() => {
      document.getElementById(`device-${rand.figure_name}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [devices]);

  const copyDevice = useCallback((device: { figure_name: string; definition: string }) => {
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
                onClick={randomDevice}
                className="text-xs border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800"
              >
                <Shuffle className="w-3 h-3 mr-1.5" />
                Random
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="text-xs border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800"
              >
                <Layers className="w-3 h-3 mr-1.5" />
                {viewMode === 'grid' ? 'List' : 'Grid'}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by name, definition, or category..."
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
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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
              onClick={() => { setSearch(''); setActiveCategory(null); }}
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
              {activeCategory && (
                <p className="text-xs text-gray-500">
                  Showing: <span className={CATEGORY_STYLES[activeCategory]?.text || 'text-white'}>{activeCategory}</span>
                </p>
              )}
            </div>

            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3'
                : 'space-y-2'
            }>
              {filtered.map(device => {
                const isExpanded = expandedDevice === device.figure_name;
                const style = CATEGORY_STYLES[device.category] || CATEGORY_STYLES['General'];

                return (
                  <article
                    key={device.figure_name}
                    id={`device-${device.figure_name}`}
                    onClick={() => setExpandedDevice(isExpanded ? null : device.figure_name)}
                    className={`cursor-pointer border transition-all group ${
                      isExpanded
                        ? `bg-gray-900 ${style.border} ${viewMode === 'grid' ? 'col-span-1 md:col-span-2 xl:col-span-3' : ''}`
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
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${style.text} ${style.border}`}
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
                        <div className="mt-5 pt-5 border-t border-gray-800">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div>
                              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 font-mono">
                                In Advertising
                              </h4>
                              <p className="text-sm text-gray-400 leading-relaxed">
                                {getAdvertisingUse(device.figure_name, device.definition)}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 font-mono">
                                Classic Example
                              </h4>
                              <p className="text-sm text-gray-400 italic leading-relaxed">
                                {getClassicExample(device.figure_name, device.definition)}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 font-mono">
                                Ad Example
                              </h4>
                              <p className="text-sm text-gray-400 italic leading-relaxed">
                                {getAdExample(device.figure_name, device.definition)}
                              </p>
                            </div>
                          </div>

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
      </div>
    </div>
  );
}

// Advertising use descriptions
function getAdvertisingUse(name: string, definition: string): string {
  const def = definition.toLowerCase();
  const n = name.toLowerCase();

  const uses: Record<string, string> = {
    'repetition': 'Reinforces brand messaging through strategic repetition. Creates memorable taglines that stick. "Just Do It" repeated across decades becomes identity.',
    'contrast': 'Before/after narratives, competitor differentiation, dramatic product reveals. Tension between opposites creates attention and memorability.',
    'metaphor': 'Transfers qualities from familiar concepts to your brand. Makes abstract benefits concrete and emotionally resonant.',
    'simile': 'Creates relatable comparisons that ground abstract product benefits in everyday experience.',
    'exaggerat': 'Heightens product claims for dramatic impact. The engine of humor-driven campaigns and attention-grabbing headlines.',
    'irony': 'Subverts expectations. Effective for challenger brands targeting sophisticated, media-literate audiences.',
    'question': 'Engages the audience directly. Rhetorical questions create mental participation and guide to your conclusion.',
    'sound': 'Increases memorability and shareability. Sonic devices make taglines stick and dominate audio/video.',
    'omission': 'Creates intrigue and audience participation. Strategic silence can be more powerful than words.',
    'emotion': 'Directly triggers emotional response. The foundation of brand loyalty and conversion.',
    'personif': 'Gives human qualities to products and brands. Creates relatability and emotional connection.',
    'naming': 'Substitution and renaming to reframe perception. Controls narrative through strategic word choice.',
  };

  for (const [key, value] of Object.entries(uses)) {
    if (def.includes(key) || n.includes(key)) return value;
  }

  return 'Apply this device to add rhetorical sophistication to headlines, body copy, and visual concepts. Creates deeper audience impact through deliberate language craft.';
}

// Classic rhetoric/literature examples
function getClassicExample(name: string, definition: string): string {
  const n = name.toLowerCase();
  const examples: Record<string, string> = {
    'anaphora': '"I have a dream... I have a dream... I have a dream..." -- MLK',
    'epistrophe': '"...of the people, by the people, for the people" -- Lincoln',
    'antithesis': '"It was the best of times, it was the worst of times" -- Dickens',
    'chiasmus': '"Ask not what your country can do for you -- ask what you can do for your country" -- JFK',
    'hyperbole': '"I\'ve told you a million times" -- universal expression',
    'litotes': '"Not bad at all" -- meaning excellent',
    'asyndeton': '"Veni, vidi, vici" -- Julius Caesar',
    'polysyndeton': '"And the rain fell and the wind blew and the house stood firm"',
    'metaphor': '"All the world\'s a stage" -- Shakespeare',
    'simile': '"Life is like a box of chocolates" -- Forrest Gump',
    'oxymoron': '"Parting is such sweet sorrow" -- Shakespeare',
    'paradox': '"I can resist anything except temptation" -- Oscar Wilde',
    'irony': '"What a beautiful day," said during a storm',
    'zeugma': '"She broke his car and his heart"',
    'anadiplosis': '"Fear leads to anger, anger leads to hate, hate leads to suffering" -- Yoda',
    'tmesis': '"Abso-bloody-lutely"',
    'paraprosdokian': '"I want to die peacefully in my sleep, like my grandfather -- not screaming like the passengers in his car"',
    'accismus': '"Oh no, I couldn\'t possibly accept..." while reaching for it',
    'synecdoche': '"All hands on deck" -- hands representing sailors',
    'metonymy': '"The pen is mightier than the sword" -- writing vs. warfare',
    'personification': '"The wind whispered through the trees"',
    'alliteration': '"Peter Piper picked a peck of pickled peppers"',
    'onomatopoeia': '"The bees buzzed and the brook babbled"',
    'euphemism': '"He passed away" instead of "he died"',
    'ellipsis': '"To be or not to be..." -- the unfinished thought lingers',
    'apostrophe': '"O Death, where is thy sting?" -- addressing an abstract concept',
    'syllepsis': '"She lowered her standards and her neckline"',
    'hendiadys': '"Sound and fury" instead of "furious sound"',
  };

  if (examples[n]) return examples[n];

  // Try partial match
  for (const [key, value] of Object.entries(examples)) {
    if (n.includes(key) || key.includes(n)) return value;
  }

  return `"${name}" -- a device of classical rhetoric used by orators from Aristotle to Churchill to craft more persuasive arguments.`;
}

// Advertising-specific examples
function getAdExample(name: string, definition: string): string {
  const n = name.toLowerCase();
  const def = definition.toLowerCase();

  const examples: Record<string, string> = {
    'anaphora': '"Because you\'re worth it. Because you deserve it. Because it\'s time." -- triple beat for emphasis',
    'antithesis': '"Small car. Big statement." -- VW-style contrast',
    'metaphor': '"Red Bull gives you wings." -- product benefit as transformation',
    'hyperbole': '"The best a man can get." -- Gillette\'s absolute superlative',
    'chiasmus': '"Don\'t live to work. Work to live." -- reversal as lifestyle brand positioning',
    'litotes': '"Not your ordinary coffee." -- understatement creating premium positioning',
    'asyndeton': '"Fast. Fresh. Fearless." -- three words, no conjunctions, maximum impact',
    'oxymoron': '"Seriously funny." -- contradiction creating intrigue for comedy brand',
    'alliteration': '"Coca-Cola. Krispy Kreme. Bed Bath & Beyond." -- sonic branding through sound',
    'rhetorical question': '"Got milk?" -- two-word question that became a cultural phenomenon',
    'personification': '"Your car knows." -- giving intelligence to products',
    'synecdoche': '"Get behind the wheel." -- the part (wheel) representing the whole (driving experience)',
    'metonymy': '"Silicon Valley disrupts again." -- place name for tech industry',
    'paradox': '"Less is more." -- Minimalist brand philosophy',
    'zeugma': '"Save time and money." -- one verb serving two objects',
    'epistrophe': '"Think big. Dream big. Go big." -- ending repetition for momentum',
    'polysyndeton': '"Quality and craftsmanship and tradition and innovation." -- excessive conjunctions for weight',
    'ellipsis': '"Just Do..." -- leaving the audience to complete the thought',
    'anadiplosis': '"Innovation drives change. Change drives growth. Growth drives success."',
  };

  if (examples[n]) return examples[n];

  for (const [key, value] of Object.entries(examples)) {
    if (n.includes(key) || key.includes(n)) return value;
  }

  if (def.includes('repetition')) return '"Every day. Every way. Every moment." -- rhythmic repetition for lifestyle brand';
  if (def.includes('contrast') || def.includes('opposite')) return '"Old thinking. New results." -- opposition highlighting innovation';
  if (def.includes('exaggerat')) return '"The world\'s most [superlative] [product]." -- strategic overstatement for positioning';
  if (def.includes('omission') || def.includes('absence')) return '"Less talk. More [product]." -- brevity as confidence';
  if (def.includes('sound') || def.includes('rhythm')) return '"Snap, Crackle, Pop." -- Rice Krispies\' sonic branding';

  return `Apply "${name}" to transform a straightforward product claim into a more compelling, memorable message that cuts through noise.`;
}
