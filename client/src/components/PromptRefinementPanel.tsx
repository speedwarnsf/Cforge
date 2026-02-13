import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, Target, Users } from 'lucide-react';

interface PromptRefinementPanelProps {
  query: string;
  onSelect: (text: string) => void;
}

interface RefinementSuggestion {
  icon: any;
  label: string;
  transform: (query: string) => string;
  color: string;
}

const REFINEMENT_SUGGESTIONS: RefinementSuggestion[] = [
  {
    icon: Target,
    label: "Add specific audience",
    transform: (query: string) => {
      if (query.toLowerCase().includes('audience') || query.toLowerCase().includes('target') || query.toLowerCase().includes('for')) {
        return query;
      }
      return query + " targeting young professionals aged 25-35";
    },
    color: "#FF6B47"
  },
  {
    icon: Users,
    label: "Add competitive context",
    transform: (query: string) => {
      if (query.toLowerCase().includes('compet') || query.toLowerCase().includes('different') || query.toLowerCase().includes('vs')) {
        return query;
      }
      return query + " differentiating from mainstream competitors";
    },
    color: "#FFD23F"
  }
];

export function PromptRefinementPanel({ query, onSelect }: PromptRefinementPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [suggestions, setSuggestions] = useState<RefinementSuggestion[]>([]);

  // Load preferred refinement from session storage on mount
  useEffect(() => {
    const initial = sessionStorage.getItem('preferredRefinement');
    if (initial && query !== initial) {
      // Auto-populate if we have a stored preference different from current query
      console.log('Found stored refinement preference:', initial);
    }
  }, []);

  useEffect(() => {
    // Show panel when user starts typing
    if (query && query.length > 20 && query.length < 500) {
      setIsVisible(true);
      
      // Filter suggestions based on what's already in the query
      const relevantSuggestions = REFINEMENT_SUGGESTIONS.filter(suggestion => {
        const transformed = suggestion.transform(query);
        return transformed !== query; // Only show if it would actually change the query
      });
      
      setSuggestions(relevantSuggestions);
    } else {
      setIsVisible(false);
    }
  }, [query]);



  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="mt-2 p-3 bg-gray-800/50 border-gray-600 rounded-none backdrop-blur-sm">
      <div className="text-xs font-medium text-gray-300 mb-2 uppercase tracking-wide">
        <Sparkles className="w-3 h-3 inline mr-1 text-blue-400" />
        Enhance Your Brief
      </div>
      

      
      <div className="grid grid-cols-1 gap-2">
        {suggestions.slice(0, 2).map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <div key={index} className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const transformedText = suggestion.transform(query);
                  // Save selection to session storage for cross-mode persistence
                  sessionStorage.setItem('preferredRefinement', transformedText);
                  // Send feedback for preference learning
                  fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      type: 'refine_select', 
                      selected: transformedText, 
                      original: query,
                      method: 'suggestion_select'
                    })
                  }).catch(err => console.error('Feedback error:', err));
                  onSelect(transformedText);
                }}
                aria-label={`Select refinement: ${suggestion.label}`}
                className="justify-start text-left h-auto p-2 hover:bg-gray-700/50 rounded-none text-xs text-gray-200 hover:text-white transition-all w-full"
                style={{ touchAction: 'manipulation', padding: '12px' }}
              >
                <Icon 
                  className="w-3 h-3 mr-2 flex-shrink-0" 
                  style={{ color: suggestion.color }}
                />
                <span className="text-gray-200">{suggestion.label}</span>
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default PromptRefinementPanel;