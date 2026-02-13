import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  History,
  Star,
  StarOff,
  Trash2,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X
} from 'lucide-react';

interface CreativeBrief {
  id: string;
  name: string | null;
  query: string;
  tone: string;
  concept_count: number;
  is_starred: boolean;
  last_used_at: string;
  created_at: string;
  times_used: number;
}

interface BriefHistoryProps {
  onSelectBrief: (brief: CreativeBrief) => void;
  currentQuery?: string;
}

export default function BriefHistory({ onSelectBrief, currentQuery }: BriefHistoryProps) {
  const [briefs, setBriefs] = useState<CreativeBrief[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Fetch briefs when expanded
  useEffect(() => {
    if (isExpanded) {
      fetchBriefs();
    }
  }, [isExpanded, showStarredOnly]);

  const fetchBriefs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (showStarredOnly) params.append('starred', 'true');
      params.append('limit', '50');

      const res = await fetch(`/api/briefs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBriefs(data);
      }
    } catch (error) {
      console.error('Failed to fetch briefs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/briefs/${id}/star`, { method: 'PATCH' });
      if (res.ok) {
        setBriefs(briefs.map(b =>
          b.id === id ? { ...b, is_starred: !b.is_starred } : b
        ));
      }
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this brief from history?')) return;

    try {
      const res = await fetch(`/api/briefs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBriefs(briefs.filter(b => b.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete brief:', error);
    }
  };

  const handleSaveName = async (id: string) => {
    try {
      const res = await fetch(`/api/briefs/${id}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName })
      });
      if (res.ok) {
        setBriefs(briefs.map(b =>
          b.id === id ? { ...b, name: editName } : b
        ));
        setEditingId(null);
        setEditName('');
      }
    } catch (error) {
      console.error('Failed to save name:', error);
    }
  };

  const startEditing = (brief: CreativeBrief, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(brief.id);
    setEditName(brief.name || '');
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditName('');
  };

  // Filter briefs by search term
  const filteredBriefs = briefs.filter(brief => {
    const searchLower = searchTerm.toLowerCase();
    return (
      brief.query.toLowerCase().includes(searchLower) ||
      (brief.name && brief.name.toLowerCase().includes(searchLower)) ||
      brief.tone.toLowerCase().includes(searchLower)
    );
  });

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Truncate query for preview
  const truncateQuery = (query: string, maxLength: number = 80) => {
    if (query.length <= maxLength) return query;
    return query.substring(0, maxLength) + '...';
  };

  return (
    <div className="border border-gray-700 rounded-none bg-gray-900/50 overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-300">
          <History className="w-4 h-4" />
          <span className="text-sm font-medium">Brief History</span>
          {briefs.length > 0 && !isExpanded && (
            <Badge variant="secondary" className="text-xs">
              {briefs.length}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-700 p-4">
          {/* Search and filters */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search briefs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700 text-sm"
              />
            </div>
            <Button
              variant={showStarredOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowStarredOnly(!showStarredOnly)}
              className="flex items-center gap-1"
            >
              <Star className={`w-4 h-4 ${showStarredOnly ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">Starred</span>
            </Button>
          </div>

          {/* Brief list */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                Loading briefs...
              </div>
            ) : filteredBriefs.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                {searchTerm ? 'No matching briefs found' : 'No briefs saved yet'}
              </div>
            ) : (
              filteredBriefs.map((brief) => (
                <div
                  key={brief.id}
                  onClick={() => onSelectBrief(brief)}
                  className={`p-3 rounded-none border cursor-pointer transition-all hover:border-blue-500/50 hover:bg-gray-800/50 ${
                    currentQuery === brief.query
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Name or query preview */}
                      {editingId === brief.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Project name..."
                            className="h-7 text-sm bg-gray-900 border-gray-600"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveName(brief.id)}
                            className="text-green-400 hover:text-green-300"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          {brief.name ? (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white text-sm">
                                {brief.name}
                              </span>
                              <button
                                onClick={(e) => startEditing(brief, e)}
                                className="text-gray-500 hover:text-gray-300"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => startEditing(brief, e)}
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              Name this project
                            </button>
                          )}
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                            {truncateQuery(brief.query)}
                          </p>
                        </>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(brief.last_used_at)}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0">
                          {brief.tone}
                        </Badge>
                        <span>{brief.concept_count} concepts</span>
                        {brief.times_used > 1 && (
                          <span className="text-gray-600">
                            Used {brief.times_used}x
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleToggleStar(brief.id, e)}
                        className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
                          brief.is_starred ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {brief.is_starred ? (
                          <Star className="w-4 h-4 fill-current" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => handleDelete(brief.id, e)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
