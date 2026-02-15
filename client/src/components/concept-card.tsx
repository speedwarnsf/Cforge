import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, Copy, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConceptCardProps {
  concept: {
    id: number;
    conceptId?: string;
    content: string;
    visualPrompt: string;
    tone: string;
    tokens: number;
    processingTime: string;
    timestamp: string;
    originalityCheck?: {
      query: string;
      isOriginal: boolean;
      confidence: number;
      matches: Array<any>;
      searchPerformed: boolean;
    };
    rhetoricalDevice?: string;
    rhetoricalDeviceDefinition?: string;
    iterationType?: 'original' | 'reforge_headline' | 'reforge_tagline' | 'reforge_body' | 'reforge_full';
  };
  onRate?: (conceptId: string, rating: 'more_like_this' | 'less_like_this') => void;
  showRating?: boolean;
  index?: number;
}

interface ParsedSections {
  headline: string;
  tagline: string;
  bodyCopy: string;
  visualConcept: string;
  rhetoricalCraft: string;
}

const ConceptCard = React.memo(function ConceptCard({ concept, onRate, showRating = true, index }: ConceptCardProps) {
  const { toast } = useToast();
  const [currentRating, setCurrentRating] = useState<'more_like_this' | 'less_like_this' | null>(null);
  const [craftExpanded, setCraftExpanded] = useState(false);

  const extractSections = (content: string): ParsedSections => {
    // Strip markdown fences
    const clean = content.replace(/```markdown\s*/g, '').replace(/```/g, '');

    const sections: ParsedSections = {
      headline: '',
      tagline: '',
      bodyCopy: '',
      visualConcept: '',
      rhetoricalCraft: '',
    };

    const headlineMatch = clean.match(/\*\*HEADLINE:?\*\*\s*([^*]+?)(?=\*\*|$)/i);
    if (headlineMatch) sections.headline = headlineMatch[1].trim();

    const taglineMatch = clean.match(/\*\*TAGLINE:?\*\*\s*([^*]+?)(?=\*\*|$)/i);
    if (taglineMatch) sections.tagline = taglineMatch[1].trim();

    const bodyCopyMatch = clean.match(/\*\*BODY COPY:?\*\*\s*([\s\S]*?)(?=\*\*VISUAL|\*\*RHETORICAL|$)/i);
    if (bodyCopyMatch) sections.bodyCopy = bodyCopyMatch[1].trim();

    const visualMatch = clean.match(/\*\*VISUAL CONCEPT:?\*\*\s*([\s\S]*?)(?=\*\*RHETORICAL|$)/i);
    if (visualMatch) sections.visualConcept = visualMatch[1].trim();

    const rhetoricalMatch = clean.match(/\*\*RHETORICAL CRAFT.*?\*\*\s*([\s\S]*?)$/i);
    if (rhetoricalMatch) sections.rhetoricalCraft = rhetoricalMatch[1].trim();

    return sections;
  };

  const tryParseJSON = (content: string): ParsedSections | null => {
    try {
      const data = JSON.parse(content);
      return {
        headline: data.headline || '',
        tagline: data.tagline || '',
        bodyCopy: data.bodyCopy || '',
        visualConcept: data.visualConcept || '',
        rhetoricalCraft: Array.isArray(data.rhetoricalCraft)
          ? data.rhetoricalCraft.map((c: any) => `${c.device}: ${c.explanation}`).join('\n')
          : (data.strategicImpact || ''),
      };
    } catch {
      return null;
    }
  };

  const sections = tryParseJSON(concept.content) || extractSections(concept.content);
  const hasParsedContent = !!(sections.headline || sections.tagline || sections.bodyCopy);

  // Parse rhetorical craft into devices
  const parseCraftDevices = (craft: string) => {
    const devices: { label: string; content: string }[] = [];
    const primaryMatch = craft.match(/Primary Device:\s*([\s\S]*?)(?=Secondary Device:|Strategic Impact:|$)/i);
    const secondaryMatch = craft.match(/Secondary Device:\s*([\s\S]*?)(?=Strategic Impact:|$)/i);
    const impactMatch = craft.match(/Strategic Impact:\s*([\s\S]*?)$/i);

    if (primaryMatch) devices.push({ label: 'Primary Device', content: primaryMatch[1].trim() });
    if (secondaryMatch) devices.push({ label: 'Secondary Device', content: secondaryMatch[1].trim() });
    if (impactMatch) devices.push({ label: 'Strategic Impact', content: impactMatch[1].trim() });

    if (devices.length === 0 && craft) {
      devices.push({ label: 'Craft Notes', content: craft });
    }
    return devices;
  };

  const handleRate = (rating: 'more_like_this' | 'less_like_this') => {
    if (concept.conceptId && onRate) {
      onRate(concept.conceptId, rating);
      setCurrentRating(rating);
      toast({
        title: rating === 'more_like_this' ? "Marked as preferred" : "Marked as less preferred",
        description: "Your feedback will improve future concepts",
        duration: 2000,
      });
    }
  };

  const copyToClipboard = async () => {
    const parts: string[] = [];
    if (sections.headline) parts.push(`HEADLINE: ${sections.headline}`);
    if (sections.tagline) parts.push(`TAGLINE: ${sections.tagline}`);
    if (sections.bodyCopy) parts.push(`BODY COPY: ${sections.bodyCopy}`);
    if (sections.visualConcept) parts.push(`VISUAL CONCEPT: ${sections.visualConcept}`);
    if (sections.rhetoricalCraft) parts.push(`RHETORICAL CRAFT: ${sections.rhetoricalCraft}`);

    const text = parts.length > 0 ? parts.join('\n\n') : concept.content.replace(/\*\*/g, '').trim();

    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", duration: 2000 });
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const downloadAsDoc = () => {
    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Concept ${index ? index + 1 : ''}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px;">
<h1 style="border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">${sections.headline || `Concept ${index ? index + 1 : ''}`}</h1>
${sections.tagline ? `<h2 style="color: #6b7280; font-style: italic;">${sections.tagline}</h2>` : ''}
${sections.bodyCopy ? `<p>${sections.bodyCopy}</p>` : ''}
${sections.visualConcept ? `<h3>Visual Concept</h3><p style="color: #6b7280;">${sections.visualConcept}</p>` : ''}
${sections.rhetoricalCraft ? `<h3>Rhetorical Craft</h3><p>${sections.rhetoricalCraft}</p>` : ''}
<p style="color: #9ca3af; font-size: 12px; margin-top: 40px;">Generated by Concept Forge</p>
</body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concept-${index ? index + 1 : 'export'}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Concept exported", duration: 2000 });
  };

  return (
    <article
      className="concept-card bg-gray-950 border border-gray-800 overflow-hidden"
      style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
      aria-label={`Concept ${index !== undefined ? index + 1 : ''}: ${concept.rhetoricalDevice || 'creative concept'}`}
    >
      <div className="p-5 sm:p-8">
        {/* Header: number + device + actions */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            {index !== undefined && (
              <div className="w-9 h-9 bg-white text-black flex items-center justify-center text-sm font-bold shrink-0">
                {index + 1}
              </div>
            )}
            {concept.rhetoricalDevice && (
              <div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-mono text-gray-400 border-gray-700">
                  {concept.rhetoricalDevice.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Badge>
                {concept.rhetoricalDeviceDefinition && (
                  <p className="text-[11px] text-gray-600 mt-1.5 max-w-sm leading-snug">
                    {concept.rhetoricalDeviceDefinition}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Concept actions">
            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="text-gray-600 hover:text-white min-w-[36px] min-h-[36px]" aria-label="Copy">
              <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadAsDoc} className="text-gray-600 hover:text-white min-w-[36px] min-h-[36px]" aria-label="Download">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {hasParsedContent ? (
          <div className="space-y-5">
            {/* Headline */}
            {sections.headline && (
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">
                {sections.headline}
              </h2>
            )}

            {/* Tagline */}
            {sections.tagline && (
              <p className="text-cyan-400 text-base sm:text-lg font-medium italic">
                {sections.tagline}
              </p>
            )}

            {/* Body Copy */}
            {sections.bodyCopy && (
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2 font-mono">Body Copy</div>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                  {sections.bodyCopy}
                </p>
              </div>
            )}

            {/* Visual Concept */}
            {sections.visualConcept && (
              <div className="border-l-2 border-gray-700 pl-4">
                <div className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2 font-mono">Visual Direction</div>
                <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                  {sections.visualConcept}
                </p>
              </div>
            )}

            {/* Rhetorical Craft - collapsible */}
            {sections.rhetoricalCraft && (
              <div className="pt-4 border-t border-gray-800/60">
                <button
                  onClick={() => setCraftExpanded(!craftExpanded)}
                  className="flex items-center gap-1.5 text-[10px] text-gray-600 uppercase tracking-widest font-bold font-mono hover:text-gray-400 transition-colors cursor-pointer mb-3"
                >
                  Rhetorical Craft Breakdown
                  {craftExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {craftExpanded && (
                  <div className="space-y-3 pl-4 border-l border-gray-800">
                    {parseCraftDevices(sections.rhetoricalCraft).map((device, idx) => (
                      <div key={idx}>
                        <div className="text-xs font-semibold text-gray-400 mb-0.5">{device.label}</div>
                        <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line">{device.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Fallback: raw content */
          <div className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
            {concept.content}
          </div>
        )}

        {/* Originality */}
        {concept.originalityCheck && (
          <div className={`mt-5 p-3 text-sm ${
            concept.originalityCheck.isOriginal
              ? 'bg-emerald-950/30 border border-emerald-800/40 text-emerald-400'
              : 'bg-yellow-950/30 border border-yellow-800/40 text-yellow-400'
          }`}>
            <span className="font-medium">
              Originality: {(concept.originalityCheck.confidence * 100).toFixed(1)}% confident
            </span>
            <span className="text-gray-400 ml-2">
              -- {concept.originalityCheck.isOriginal ? 'Original' : 'Similar content found'}
            </span>
          </div>
        )}

        {/* Rating + Meta */}
        {showRating && (
          <div className="flex items-center justify-between pt-5 mt-5 border-t border-gray-800/40 flex-wrap gap-2">
            <div className="flex items-center gap-2" role="group" aria-label="Rate this concept">
              <Button
                variant={currentRating === 'more_like_this' ? "default" : "outline"}
                size="sm"
                onClick={() => handleRate('more_like_this')}
                className="text-xs"
                aria-pressed={currentRating === 'more_like_this'}
              >
                <ThumbsUp className="w-3.5 h-3.5 mr-1.5" />
                More like this
              </Button>
              <Button
                variant={currentRating === 'less_like_this' ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleRate('less_like_this')}
                className="text-xs"
                aria-pressed={currentRating === 'less_like_this'}
              >
                <ThumbsDown className="w-3.5 h-3.5 mr-1.5" />
                Less like this
              </Button>
            </div>

            <div className="text-[11px] text-gray-600 font-mono tabular-nums">
              {concept.tokens} tokens -- {concept.processingTime}
            </div>
          </div>
        )}
      </div>
    </article>
  );
});

export default ConceptCard;
