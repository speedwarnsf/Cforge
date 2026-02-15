import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { addTagToConcept, removeTagFromConcept, getAllTags } from '@/lib/conceptStorage';

interface ConceptTagsProps {
  conceptId: string;
  tags: string[];
  onChange: () => void;
  compact?: boolean;
}

export default function ConceptTags({ conceptId, tags, onChange, compact }: ConceptTagsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  useEffect(() => {
    if (inputValue.trim()) {
      const allTags = getAllTags();
      const filtered = allTags.filter(t =>
        t.includes(inputValue.toLowerCase()) && !tags.includes(t)
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [inputValue, tags]);

  const handleAdd = (tag: string) => {
    addTagToConcept(conceptId, tag);
    setInputValue('');
    setIsAdding(false);
    setSuggestions([]);
    onChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAdd(inputValue.trim());
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setInputValue('');
    }
  };

  const handleRemove = (tag: string) => {
    removeTagFromConcept(conceptId, tag);
    onChange();
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-gray-500 border border-gray-800 group">
            {tag}
            <button onClick={e => { e.stopPropagation(); handleRemove(tag); }} className="opacity-0 group-hover:opacity-100 ml-0.5">
              <X className="w-2 h-2" />
            </button>
          </span>
        ))}
        {!isAdding ? (
          <button
            onClick={e => { e.stopPropagation(); setIsAdding(true); }}
            className="p-0.5 text-gray-700 hover:text-gray-400 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        ) : (
          <div className="relative" onClick={e => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => { setTimeout(() => { setIsAdding(false); setInputValue(''); }, 200); }}
              className="w-24 h-5 px-1.5 text-[10px] bg-gray-900 border border-gray-700 text-white outline-none"
              placeholder="add tag..."
            />
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 z-50 min-w-[120px]">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onMouseDown={e => { e.preventDefault(); handleAdd(s); }}
                    className="block w-full text-left px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-800 hover:text-white font-mono"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <Tag className="w-3 h-3 text-gray-600" />
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-gray-400 border border-gray-700 group hover:border-gray-500">
          {tag}
          <button onClick={() => handleRemove(tag)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      {!isAdding ? (
        <button onClick={() => setIsAdding(true)} className="px-2 py-0.5 text-[10px] font-mono text-gray-600 border border-dashed border-gray-800 hover:border-gray-600 hover:text-gray-400 transition-colors">
          + tag
        </button>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { setTimeout(() => { setIsAdding(false); setInputValue(''); }, 200); }}
            className="w-28 h-6 px-2 text-[10px] bg-gray-900 border border-gray-700 text-white outline-none font-mono"
            placeholder="campaign, client..."
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-gray-900 border border-gray-700 z-50 min-w-[140px]">
              {suggestions.map(s => (
                <button
                  key={s}
                  onMouseDown={e => { e.preventDefault(); handleAdd(s); }}
                  className="block w-full text-left px-2 py-1.5 text-[10px] text-gray-400 hover:bg-gray-800 hover:text-white font-mono"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
