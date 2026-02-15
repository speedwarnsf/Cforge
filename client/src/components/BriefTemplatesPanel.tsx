import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import { briefTemplates, templateCategories, type BriefTemplate } from '@/lib/briefTemplates';

interface BriefTemplatesPanelProps {
  onSelectTemplate: (template: BriefTemplate) => void;
}

export default function BriefTemplatesPanel({ onSelectTemplate }: BriefTemplatesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!activeCategory) return briefTemplates;
    return briefTemplates.filter(t => t.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="border border-gray-700 bg-gray-900/50 overflow-hidden">
      {/* Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-gray-300">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">Brief Templates</span>
          <Badge variant="secondary" className="text-xs">{briefTemplates.length}</Badge>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {isExpanded && (
        <div className="border-t border-gray-700 p-4">
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1 text-xs font-medium transition-all ${
                !activeCategory ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              All
            </button>
            {templateCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-1 text-xs font-medium transition-all ${
                  activeCategory === cat ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Template cards */}
          <div className="max-h-72 overflow-y-auto space-y-2">
            {filtered.map(template => (
              <div
                key={template.id}
                className="p-3 border border-gray-700 bg-gray-800/30 hover:border-blue-500/50 hover:bg-gray-800/50 cursor-pointer transition-all group"
                onClick={() => onSelectTemplate(template)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{template.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 text-gray-500 border-gray-600">
                        {template.suggestedTone}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{template.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 shrink-0 mt-1 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
