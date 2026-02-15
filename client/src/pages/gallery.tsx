import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Star, StarOff, Trash2, Search, ArrowLeft, Download,
  Filter, Clock, Heart, XCircle, RefreshCw, Copy, ChevronDown, ChevronUp,
  Presentation, LayoutGrid, Share2, Tag, MessageSquare
} from 'lucide-react';
import { getConceptHistory, toggleFavorite, deleteConcept, clearHistory, StoredConcept, saveConceptsToHistory, resultToStoredConcept, getVersionChain, getAllTags } from '@/lib/conceptStorage';
import PresentationMode from '@/components/PresentationMode';
import MoodBoard from '@/components/MoodBoard';
import ConceptTags from '@/components/ConceptTags';
import ConceptVersionHistory, { ConceptVersion } from '@/components/ConceptVersionHistory';
import ArbiterScoreViz from '@/components/ArbiterScoreViz';
import ArbiterDetailPanel from '@/components/ArbiterDetailPanel';
import { useToast } from '@/hooks/use-toast';
import { exportConceptsAsPDF, exportConceptsAsPresentation } from '@/lib/conceptExport';
import { useDebounce } from '@/hooks/use-debounce';
import ErrorBoundary from '@/components/ErrorBoundary';
import { apiClient, handleAPIError } from '@/lib/apiClient';

type FilterMode = 'all' | 'favorites' | 'passed' | 'recent';
type SortMode = 'newest' | 'oldest' | 'score';

// Refinement panel for iterating on a concept
function ConceptRefinementPanel({
  concept,
  onClose,
  onRefined,
}: {
  concept: StoredConcept;
  onClose: () => void;
  onRefined: (newConcept: StoredConcept) => void;
}) {
  const [refinementType, setRefinementType] = useState<'headline' | 'tone' | 'device' | 'full'>('headline');
  const [instructions, setInstructions] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const { toast } = useToast();

  const handleRefine = async () => {
    setIsRefining(true);
    try {
      const refinementPrompt = buildRefinementPrompt(concept, refinementType, instructions);

      const result = await apiClient.post<any>('/api/generate', {
        query: refinementPrompt,
        tone: concept.tone,
        includeCliches: false,
        deepScan: false,
        conceptCount: 1,
        projectId: 'concept_forge_refinement',
      });

      if (result && !result.error) {
        const content = (result.content || '').replace(/```markdown\s*/g, '').replace(/```/g, '');
        const headlineMatch = content.match(/\*\*HEADLINE:?\*\*\s*(.+?)(?:\n|\*\*)/i);
        const taglineMatch = content.match(/\*\*TAGLINE:?\*\*\s*(.+?)(?:\n|\*\*)/i);
        const bodyCopyMatch = content.match(/\*\*BODY COPY:?\*\*\s*([\s\S]*?)(?=\*\*VISUAL|\*\*RHETORICAL|$)/i);
        const visualMatch = content.match(/\*\*VISUAL CONCEPT:?\*\*\s*([\s\S]*?)(?=\*\*RHETORICAL|$)/i);

        const parentVersion = concept.version || 1;
        const refined = resultToStoredConcept({
          headline: headlineMatch?.[1]?.trim() || concept.headlines[0],
          tagline: taglineMatch?.[1]?.trim() || concept.tagline,
          bodyCopy: bodyCopyMatch?.[1]?.trim() || concept.bodyCopy,
          visualConcept: visualMatch?.[1]?.trim() || concept.visualDescription,
          devices: concept.rhetoricalDevice,
          originalityScore: (result.originalityCheck?.confidence || 0) * 100,
          content,
        }, concept.prompt + ` [Refined: ${refinementType}]`, concept.tone);

        // Attach versioning metadata
        refined.parentId = concept.id;
        refined.version = parentVersion + 1;
        refined.refinementType = refinementType;

        saveConceptsToHistory([refined]);
        onRefined(refined);
        toast({ title: 'Concept refined', description: 'New version saved to gallery.' });
      }
    } catch (error) {
      handleAPIError(error);
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="border-t border-gray-700 p-5 bg-gray-900/90" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-black text-white uppercase tracking-widest font-mono">Refine Concept</h4>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-xs p-1">
          Close
        </button>
      </div>

      {/* Refinement type selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          { id: 'headline', label: 'Sharpen Headline' },
          { id: 'tone', label: 'Shift Tone' },
          { id: 'device', label: 'Try New Device' },
          { id: 'full', label: 'Full Rework' },
        ] as const).map(type => (
          <button
            key={type.id}
            onClick={() => setRefinementType(type.id)}
            className={`px-3 py-1.5 text-xs font-medium border transition-all ${
              refinementType === type.id
                ? 'bg-white text-black border-white'
                : 'bg-transparent text-gray-400 border-gray-700 hover:border-gray-500'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Additional instructions */}
      <Textarea
        placeholder="Optional: specific direction for the refinement (e.g., 'make it edgier', 'target Gen Z', 'use irony')..."
        value={instructions}
        onChange={e => setInstructions(e.target.value)}
        className="h-20 bg-gray-800 border-gray-700 text-white text-sm placeholder-gray-500 mb-4 resize-none"
      />

      <Button
        onClick={handleRefine}
        disabled={isRefining}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold"
      >
        {isRefining ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Refining...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refine Concept
          </>
        )}
      </Button>
    </div>
  );
}

function buildRefinementPrompt(concept: StoredConcept, type: string, extra: string): string {
  const base = `Original brief: "${concept.prompt}"\nOriginal headline: "${concept.headlines[0]}"\nOriginal tagline: "${concept.tagline || ''}"\nOriginal body: "${concept.bodyCopy || ''}"\nDevice used: ${concept.rhetoricalDevice}\n\n`;

  switch (type) {
    case 'headline':
      return base + `Generate a stronger, more impactful headline for this concept. Keep the same strategic direction but make the headline more memorable, sharper, and award-worthy. ${extra}`;
    case 'tone':
      return base + `Rewrite this concept with a significantly different tone. If it was serious, make it witty. If it was playful, make it authoritative. Transform the emotional register while keeping the core insight. ${extra}`;
    case 'device':
      return base + `Rewrite this concept using a completely different rhetorical device. The current device is ${concept.rhetoricalDevice}. Choose a contrasting approach -- if it used metaphor, try antithesis; if repetition, try litotes. ${extra}`;
    case 'full':
      return base + `Completely rework this concept from scratch. Keep the same brief and strategic objective, but find a totally new creative angle, new rhetorical approach, new headline, new visual direction. ${extra}`;
    default:
      return base + extra;
  }
}

/** Gallery card */
const GalleryCard = React.memo(function GalleryCard({
  concept,
  isExpanded,
  onToggleExpand,
  onToggleFavorite,
  onDelete,
  onRefineStart,
  isRefining,
  onRefined,
  onRefineClose,
  onTagsChanged,
}: {
  concept: StoredConcept;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onRefineStart: (id: string) => void;
  isRefining: boolean;
  onRefined: (c: StoredConcept) => void;
  onRefineClose: () => void;
  onTagsChanged: () => void;
}) {
  return (
    <article
      className={`group bg-gray-950 border overflow-hidden transition-all cursor-pointer ${
        concept.isFavorite ? 'border-amber-800/60' : 'border-gray-800'
      } hover:border-gray-600 ${isExpanded ? 'col-span-1 md:col-span-2 xl:col-span-3' : ''}`}
      onClick={() => onToggleExpand(concept.id)}
      tabIndex={0}
      role="button"
      aria-expanded={isExpanded}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-white leading-tight tracking-tight">
              {concept.headlines[0] || 'Untitled'}
            </h3>
            {concept.tagline && (
              <p className="text-xs text-cyan-400 italic mt-1 line-clamp-1">{concept.tagline}</p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onToggleFavorite(concept.id); }}
              className="p-1.5 hover:bg-gray-800 transition-colors"
              aria-label={concept.isFavorite ? 'Remove favorite' : 'Add favorite'}
            >
              {concept.isFavorite
                ? <Star className="w-4 h-4 text-amber-400 fill-current" />
                : <StarOff className="w-4 h-4 text-gray-600 hover:text-amber-400" />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(concept.id); }}
              className="p-1.5 hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-all"
              aria-label="Delete"
            >
              <XCircle className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" />
            </button>
          </div>
        </div>

        {/* Device badge */}
        <Badge variant="secondary" className="bg-gray-800 text-gray-400 border-gray-700 text-[10px] uppercase tracking-widest font-mono mb-3">
          {concept.rhetoricalDevice}
        </Badge>

        {/* Brief excerpt */}
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
          {concept.prompt}
        </p>

        {/* Scores */}
        <ErrorBoundary compact label="scores">
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
        </ErrorBoundary>

        {/* Tags */}
        {(concept.tags && concept.tags.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {concept.tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-gray-500 border border-gray-800">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-gray-600 mt-3 font-mono">
          <time dateTime={concept.timestamp}>
            {new Date(concept.timestamp).toLocaleString()}
          </time>
        </p>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-gray-800 p-5 bg-gray-900/60" onClick={e => e.stopPropagation()}>
          {concept.headlines.length > 1 && (
            <div className="mb-4">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 font-mono">Headlines</h4>
              {concept.headlines.map((h, i) => (
                <p key={i} className="text-base text-white font-bold leading-tight">{h}</p>
              ))}
            </div>
          )}

          {concept.bodyCopy && (
            <div className="mb-4">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 font-mono">Body Copy</h4>
              <p className="text-sm text-gray-300 leading-relaxed">{concept.bodyCopy}</p>
            </div>
          )}

          {concept.visualDescription && (
            <div className="mb-4 border-l-2 border-gray-700 pl-4">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 font-mono">Visual Direction</h4>
              <p className="text-sm text-gray-400 leading-relaxed">{concept.visualDescription}</p>
            </div>
          )}

          <ErrorBoundary compact label="arbiter detail">
            <ArbiterDetailPanel
              originalityScore={concept.originalityScore}
              professionalismScore={concept.professionalismScore}
              clarityScore={concept.clarityScore}
              freshnessScore={concept.freshnessScore}
              resonanceScore={concept.resonanceScore}
              awardsScore={concept.awardsScore}
              finalStatus={concept.finalStatus}
              critique={concept.critique}
              juryComment={concept.juryComment}
              improvementTip={concept.improvementTip}
              reflection={concept.reflection}
              vibe={concept.vibe}
            />
          </ErrorBoundary>

          {/* Tags editor */}
          <div className="mb-4">
            <ConceptTags conceptId={concept.id} tags={concept.tags || []} onChange={onTagsChanged} />
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800"
              onClick={() => {
                const text = concept.headlines.join('\n') +
                  (concept.tagline ? '\n' + concept.tagline : '') +
                  (concept.bodyCopy ? '\n\n' + concept.bodyCopy : '') +
                  '\n\nVisual: ' + concept.visualDescription;
                navigator.clipboard.writeText(text);
              }}
            >
              <Copy className="w-3 h-3 mr-1.5" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800"
              onClick={() => exportConceptsAsPDF([concept])}
            >
              <Download className="w-3 h-3 mr-1.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 border-blue-800 text-blue-400 bg-transparent hover:bg-blue-950/50"
              onClick={() => onRefineStart(concept.id)}
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Refine
            </Button>
          </div>
        </div>
      )}

      {/* Version History */}
      {isExpanded && (() => {
        const chain = getVersionChain(concept.id);
        if (chain.length <= 1) return null;
        const versions: ConceptVersion[] = chain.map(c => ({
          id: c.id,
          headline: c.headlines[0] || 'Untitled',
          version: c.version || 1,
          refinementType: c.refinementType,
          timestamp: c.timestamp,
          originalityScore: c.originalityScore,
        }));
        return (
          <div className="px-5 pb-2">
            <ConceptVersionHistory
              versions={versions}
              currentId={concept.id}
              onSelectVersion={(id) => {
                onToggleExpand(concept.id); // collapse current
                setTimeout(() => onToggleExpand(id), 50); // expand target
              }}
            />
          </div>
        );
      })()}

      {/* Refinement panel */}
      {isRefining && (
        <ConceptRefinementPanel
          concept={concept}
          onClose={onRefineClose}
          onRefined={onRefined}
        />
      )}
    </article>
  );
});

export default function GalleryPage() {
  const [concepts, setConcepts] = useState<StoredConcept[]>(() => getConceptHistory());
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [filter, setFilter] = useState<FilterMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('filter') === 'favorites') return 'favorites';
    }
    return 'all';
  });
  const [sort, setSort] = useState<SortMode>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [showPresentation, setShowPresentation] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [showMoodBoard, setShowMoodBoard] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    let result = concepts;

    if (filter === 'favorites') result = result.filter(c => c.isFavorite);
    else if (filter === 'passed') result = result.filter(c => c.finalStatus === 'Passed');
    else if (filter === 'recent') {
      const dayAgo = Date.now() - 86400000;
      result = result.filter(c => new Date(c.timestamp).getTime() > dayAgo);
    }

    if (tagFilter) {
      result = result.filter(c => c.tags && c.tags.includes(tagFilter));
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(c =>
        c.headlines.some(h => h.toLowerCase().includes(q)) ||
        c.prompt.toLowerCase().includes(q) ||
        c.rhetoricalDevice.toLowerCase().includes(q) ||
        (c.tagline || '').toLowerCase().includes(q) ||
        (c.tags || []).some(t => t.includes(q))
      );
    }

    // Sort
    if (sort === 'oldest') {
      result = [...result].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } else if (sort === 'score') {
      result = [...result].sort((a, b) => (b.originalityScore || 0) - (a.originalityScore || 0));
    }
    // 'newest' is default order from storage

    return result;
  }, [concepts, debouncedSearch, filter, sort, tagFilter]);

  const handleToggleFavorite = useCallback((id: string) => {
    toggleFavorite(id);
    setConcepts(getConceptHistory());
  }, []);

  const handleDelete = useCallback((id: string) => {
    deleteConcept(id);
    setConcepts(getConceptHistory());
    toast({ title: 'Concept removed', duration: 2000 });
  }, [toast]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
    setRefiningId(null);
  }, []);

  const handleClearHistory = () => {
    if (confirm('Clear all non-favorited concepts?')) {
      clearHistory();
      setConcepts(getConceptHistory());
      toast({ title: 'History cleared (favorites kept)', duration: 2000 });
    }
  };

  const handleRefined = useCallback((newConcept: StoredConcept) => {
    setConcepts(getConceptHistory());
    setExpandedId(newConcept.id);
    setRefiningId(null);
  }, []);

  const handleShareForFeedback = useCallback(() => {
    const toShare = filtered.length > 0 ? filtered : concepts;
    if (toShare.length === 0) {
      toast({ title: 'No concepts to share', duration: 2000 });
      return;
    }
    const shareData = {
      name: 'Concept Review',
      concepts: toShare.map(c => ({
        id: c.id,
        headline: c.headlines[0] || 'Untitled',
        tagline: c.tagline,
        bodyCopy: c.bodyCopy,
        visualDescription: c.visualDescription,
        rhetoricalDevice: c.rhetoricalDevice,
        tags: c.tags,
      })),
    };
    const encoded = btoa(JSON.stringify(shareData));
    const url = `${window.location.origin}/feedback#${encoded}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Feedback link copied', description: 'Share this link with clients for review.' });
  }, [filtered, concepts, toast]);

  const allTags = useMemo(() => getAllTags(), [concepts]);

  const filterButtons: { mode: FilterMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'all', label: 'All', icon: <Filter className="w-3 h-3" /> },
    { mode: 'favorites', label: 'Favorites', icon: <Heart className="w-3 h-3" /> },
    { mode: 'passed', label: 'Passed', icon: null },
    { mode: 'recent', label: '24h', icon: <Clock className="w-3 h-3" /> },
  ];

  // Stats
  const stats = useMemo(() => ({
    total: concepts.length,
    favorites: concepts.filter(c => c.isFavorite).length,
    passed: concepts.filter(c => c.finalStatus === 'Passed').length,
    avgScore: concepts.length > 0
      ? Math.round(concepts.reduce((sum, c) => sum + (c.originalityScore || 0), 0) / concepts.length)
      : 0,
  }), [concepts]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {/* Top row */}
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-black tracking-tight uppercase">Concept Gallery</h1>
              <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono mt-0.5">
                <span>{stats.total} concepts</span>
                <span>{stats.favorites} favorited</span>
                <span>{stats.passed} passed</span>
                {stats.avgScore > 0 && <span>avg {stats.avgScore}% originality</span>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button variant="outline" size="sm" onClick={() => { setPresentationIndex(0); setShowPresentation(true); }} disabled={filtered.length === 0 && concepts.length === 0} className="text-xs h-8 border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800">
                <Presentation className="w-3 h-3 mr-1" /> Present
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowMoodBoard(true)} className="text-xs h-8 border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800">
                <LayoutGrid className="w-3 h-3 mr-1" /> Board
              </Button>
              <Button variant="outline" size="sm" onClick={handleShareForFeedback} className="text-xs h-8 border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800">
                <Share2 className="w-3 h-3 mr-1" /> Share
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportConceptsAsPDF(filtered.length > 0 ? filtered : concepts)} className="text-xs h-8 border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800">
                <Download className="w-3 h-3 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportConceptsAsPresentation(filtered.length > 0 ? filtered : concepts)} className="text-xs h-8 border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800">
                <Download className="w-3 h-3 mr-1" /> Deck
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearHistory} className="text-xs h-8 border-red-900 text-red-400 bg-transparent hover:bg-red-950">
                <Trash2 className="w-3 h-3 mr-1" /> Clear
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by headline, prompt, device, tagline..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-10 bg-gray-900 border-gray-700 text-white text-sm placeholder-gray-500 focus:border-white/30"
              type="search"
            />
          </div>

          {/* Filters + Sort */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {filterButtons.map(f => (
                <button
                  key={f.mode}
                  onClick={() => setFilter(f.mode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all font-medium ${
                    filter === f.mode
                      ? 'bg-white text-black'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {(['newest', 'oldest', 'score'] as SortMode[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-2 py-1 text-[10px] uppercase tracking-wider font-mono transition-all ${
                    sort === s ? 'text-white' : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tag filters */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <Tag className="w-3 h-3 text-gray-600" />
              {tagFilter && (
                <button
                  onClick={() => setTagFilter(null)}
                  className="px-2 py-0.5 text-[10px] font-mono text-gray-500 border border-dashed border-gray-700 hover:border-gray-500"
                >
                  clear
                </button>
              )}
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-all ${
                    tagFilter === tag
                      ? 'bg-white text-black border border-white'
                      : 'text-gray-500 border border-gray-800 hover:border-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <p className="text-xl font-bold mb-2">
              {concepts.length === 0 ? 'No concepts yet' : 'No matches'}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              {concepts.length === 0
                ? 'Generate concepts from the home page to build your gallery'
                : 'Try adjusting your search or filters'}
            </p>
            <Link href="/">
              <Button variant="outline" className="border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800">
                Go to Generator
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map(concept => (
              <GalleryCard
                key={concept.id}
                concept={concept}
                isExpanded={expandedId === concept.id}
                onToggleExpand={handleToggleExpand}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
                onRefineStart={setRefiningId}
                isRefining={refiningId === concept.id}
                onRefined={handleRefined}
                onRefineClose={() => setRefiningId(null)}
                onTagsChanged={() => setConcepts(getConceptHistory())}
              />
            ))}
          </div>
        )}
      </div>

      {/* Presentation Mode */}
      {showPresentation && (
        <PresentationMode
          concepts={filtered.length > 0 ? filtered : concepts}
          initialIndex={presentationIndex}
          onClose={() => setShowPresentation(false)}
        />
      )}

      {/* Mood Board */}
      {showMoodBoard && (
        <MoodBoard
          concepts={concepts}
          onClose={() => setShowMoodBoard(false)}
        />
      )}
    </div>
  );
}
