import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Star, StarOff, Trash2, Search, ArrowLeft, Download, 
  Filter, Clock, Heart, XCircle 
} from 'lucide-react';
import { getConceptHistory, toggleFavorite, deleteConcept, clearHistory, StoredConcept } from '@/lib/conceptStorage';
import ArbiterScoreViz from '@/components/ArbiterScoreViz';
import { useToast } from '@/hooks/use-toast';
import { exportConceptsAsPDF, exportConceptsAsPresentation } from '@/lib/conceptExport';

type FilterMode = 'all' | 'favorites' | 'passed' | 'recent';

export default function GalleryPage() {
  const [concepts, setConcepts] = useState<StoredConcept[]>(() => getConceptHistory());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    let result = concepts;
    
    if (filter === 'favorites') result = result.filter(c => c.isFavorite);
    else if (filter === 'passed') result = result.filter(c => c.finalStatus === 'Passed');
    else if (filter === 'recent') {
      const dayAgo = Date.now() - 86400000;
      result = result.filter(c => new Date(c.timestamp).getTime() > dayAgo);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => 
        c.headlines.some(h => h.toLowerCase().includes(q)) ||
        c.prompt.toLowerCase().includes(q) ||
        c.rhetoricalDevice.toLowerCase().includes(q)
      );
    }

    return result;
  }, [concepts, search, filter]);

  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id);
    setConcepts(getConceptHistory());
  };

  const handleDelete = (id: string) => {
    deleteConcept(id);
    setConcepts(getConceptHistory());
    toast({ title: 'Concept removed', duration: 2000 });
  };

  const handleClearHistory = () => {
    if (confirm('Clear all non-favorited concepts?')) {
      clearHistory();
      setConcepts(getConceptHistory());
      toast({ title: 'History cleared (favorites kept)', duration: 2000 });
    }
  };

  const handleExportPDF = () => {
    const toExport = filtered.length > 0 ? filtered : concepts;
    exportConceptsAsPDF(toExport);
    toast({ title: 'PDF-ready export downloaded', duration: 2000 });
  };

  const handleExportPresentation = () => {
    const toExport = filtered.length > 0 ? filtered : concepts;
    exportConceptsAsPresentation(toExport);
    toast({ title: 'Presentation export downloaded', duration: 2000 });
  };

  const filterButtons: { mode: FilterMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'all', label: 'All', icon: <Filter className="w-3 h-3" /> },
    { mode: 'favorites', label: 'Favorites', icon: <Heart className="w-3 h-3" /> },
    { mode: 'passed', label: 'Passed', icon: <Badge className="w-3 h-3 bg-emerald-600 text-white text-[8px] p-0">✓</Badge> },
    { mode: 'recent', label: '24h', icon: <Clock className="w-3 h-3" /> },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/multivariant">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-1">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold tracking-wide">CONCEPT GALLERY</h1>
            <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
              {filtered.length} / {concepts.length}
            </Badge>
          </div>
          
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <Input
              placeholder="Search concepts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 bg-gray-900 border-gray-700 text-white text-sm placeholder-gray-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-xs h-7 border-gray-600 text-gray-300 bg-transparent hover:bg-gray-800">
              <Download className="w-3 h-3 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPresentation} className="text-xs h-7 border-gray-600 text-gray-300 bg-transparent hover:bg-gray-800">
              <Download className="w-3 h-3 mr-1" /> Deck
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearHistory} className="text-xs h-7 border-red-800 text-red-400 bg-transparent hover:bg-red-950">
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2">
          {filterButtons.map(f => (
            <button
              key={f.mode}
              onClick={() => setFilter(f.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                filter === f.mode
                  ? 'bg-white text-black font-medium'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">No concepts found</p>
            <p className="text-sm">
              {concepts.length === 0
                ? 'Generate some concepts to build your gallery'
                : 'Try adjusting your search or filters'}
            </p>
            <Link href="/multivariant">
              <Button variant="outline" className="mt-4 border-gray-600 text-gray-300 bg-transparent hover:bg-gray-800">
                Go to Generator
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(concept => (
              <div
                key={concept.id}
                className={`group bg-gray-900/60 border rounded-lg overflow-hidden transition-all cursor-pointer ${
                  concept.isFavorite ? 'border-amber-700/50' : 'border-gray-700/50'
                } hover:border-gray-500/70`}
                onClick={() => setExpandedId(expandedId === concept.id ? null : concept.id)}
              >
                <div className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">
                        {concept.headlines[0] || 'Untitled'}
                      </h3>
                      {concept.tagline && (
                        <p className="text-xs text-cyan-400 italic truncate mt-0.5">{concept.tagline}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleToggleFavorite(concept.id); }}
                        className="p-1 hover:bg-gray-800 rounded"
                      >
                        {concept.isFavorite
                          ? <Star className="w-4 h-4 text-amber-400 fill-current" />
                          : <StarOff className="w-4 h-4 text-gray-500 hover:text-amber-400" />}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(concept.id); }}
                        className="p-1 hover:bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XCircle className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {/* Device & Prompt */}
                  <Badge variant="secondary" className="bg-slate-800/80 text-gray-300 border-slate-700 text-[10px] mb-2">
                    {concept.rhetoricalDevice}
                  </Badge>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">
                    {concept.prompt}
                  </p>

                  {/* Compact Arbiter Scores */}
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

                  {/* Timestamp */}
                  <p className="text-[10px] text-gray-600 mt-2">
                    {new Date(concept.timestamp).toLocaleString()}
                  </p>
                </div>

                {/* Expanded detail */}
                {expandedId === concept.id && (
                  <div className="border-t border-gray-800 p-4 bg-gray-900/80" onClick={e => e.stopPropagation()}>
                    {/* All headlines */}
                    {concept.headlines.length > 1 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Headlines</h4>
                        {concept.headlines.map((h, i) => (
                          <p key={i} className="text-sm text-white font-semibold">{h}</p>
                        ))}
                      </div>
                    )}

                    {concept.bodyCopy && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Body Copy</h4>
                        <p className="text-xs text-gray-300 leading-relaxed">{concept.bodyCopy}</p>
                      </div>
                    )}

                    {concept.visualDescription && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1">Visual</h4>
                        <p className="text-xs text-gray-300 leading-relaxed">{concept.visualDescription}</p>
                      </div>
                    )}

                    {/* Full arbiter viz */}
                    <ArbiterScoreViz
                      originalityScore={concept.originalityScore}
                      professionalismScore={concept.professionalismScore}
                      clarityScore={concept.clarityScore}
                      freshnessScore={concept.freshnessScore}
                      resonanceScore={concept.resonanceScore}
                      awardsScore={concept.awardsScore}
                      finalStatus={concept.finalStatus}
                    />

                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-gray-600 text-gray-300 bg-transparent"
                        onClick={() => {
                          const text = concept.headlines.join('\n') + 
                            (concept.tagline ? '\n' + concept.tagline : '') +
                            (concept.bodyCopy ? '\n\n' + concept.bodyCopy : '') +
                            '\n\nVisual: ' + concept.visualDescription;
                          navigator.clipboard.writeText(text);
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-gray-600 text-gray-300 bg-transparent"
                        onClick={() => exportConceptsAsPDF([concept])}
                      >
                        Export
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
