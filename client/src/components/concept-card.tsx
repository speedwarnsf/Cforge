import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThumbsUp, ThumbsDown, Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { H2, BodyText, Caption } from './Typography';

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



const ConceptCard = React.memo(function ConceptCard({ concept, onRate, showRating = true, index }: ConceptCardProps) {
  const { toast } = useToast();
  const [currentRating, setCurrentRating] = useState<'more_like_this' | 'less_like_this' | null>(null);

  // Function to parse content that may have missing line breaks
  const parseMarkdownContent = (markdownContent: string, elements: React.ReactNode[], currentIndex: number) => {
    let index = currentIndex;
    
    // Parse using regex to extract sections more reliably
    const sections = {
      headline: '',
      tagline: '',
      bodyCopy: '',
      visualConcept: '',
      rhetoricalCraft: ''
    };
    
    // Extract headline
    const headlineMatch = markdownContent.match(/\*\*HEADLINE:?\*\*\s*([^*]+?)(?=\*\*|$)/i);
    if (headlineMatch) {
      sections.headline = headlineMatch[1].trim();
    }
    
    // Extract tagline
    const taglineMatch = markdownContent.match(/\*\*TAGLINE:?\*\*\s*([^*]+?)(?=\*\*|$)/i);
    if (taglineMatch) {
      sections.tagline = taglineMatch[1].trim();
    }
    
    // Extract body copy
    const bodyCopyMatch = markdownContent.match(/\*\*BODY COPY:?\*\*\s*([^*]+?)(?=\*\*|$)/i);
    if (bodyCopyMatch) {
      sections.bodyCopy = bodyCopyMatch[1].trim();
    }
    
    // Extract visual concept (handle case where it runs into rhetorical craft)
    const visualMatch = markdownContent.match(/\*\*VISUAL CONCEPT:?\*\*\s*(.*?)(?=\*\*RHETORICAL CRAFT|$)/is);
    if (visualMatch) {
      sections.visualConcept = visualMatch[1].trim();
    }
    
    // Extract rhetorical craft content
    const rhetoricalMatch = markdownContent.match(/\*\*RHETORICAL CRAFT BREAKDOWN?:?\*\*\s*(.*?)$/is);
    if (rhetoricalMatch) {
      sections.rhetoricalCraft = rhetoricalMatch[1].trim();
    }
    
    // Render headline
    if (sections.headline) {
      elements.push(
        <h2 key={index++} className="text-xl font-bold mt-6 first:mt-0 mb-2">
          {sections.headline}
        </h2>
      );
    }
    
    // Render tagline
    if (sections.tagline) {
      elements.push(
        <h3 key={index++} className="text-lg italic mt-4 mb-2">
          {sections.tagline}
        </h3>
      );
    }
    
    // Render body copy
    if (sections.bodyCopy) {
      elements.push(
        <div key={index++} className="mt-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Body Copy</h4>
          <p className="text-base leading-relaxed whitespace-pre-line break-words">
            {sections.bodyCopy}
          </p>
        </div>
      );
    }
    
    // Render visual concept
    if (sections.visualConcept) {
      elements.push(
        <div key={index++} className="mt-4 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Visual Concept</h4>
          <p className="text-base leading-relaxed whitespace-pre-line break-words">
            {sections.visualConcept}
          </p>
        </div>
      );
    }
    
    // Render rhetorical craft
    if (sections.rhetoricalCraft) {
      elements.push(
        <div key={index++} className="mt-6 mb-4">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Rhetorical Craft Breakdown
          </h4>
        </div>
      );
      
      // Parse rhetorical devices
      const devices = [
        { label: 'Primary Device', regex: /Primary Device:\s*([^S]+?)(?=Secondary Device:|Strategic Impact:|$)/is },
        { label: 'Secondary Device', regex: /Secondary Device:\s*([^S]+?)(?=Strategic Impact:|$)/is },
        { label: 'Strategic Impact', regex: /Strategic Impact:\s*(.*?)$/is }
      ];
      
      devices.forEach(device => {
        const match = sections.rhetoricalCraft.match(device.regex);
        if (match) {
          const content = match[1].trim();
          if (content) {
            elements.push(
              <div key={index++} className="mb-4">
                <h5 className="text-sm font-bold text-gray-800 mb-1">{device.label}</h5>
                <p className="text-base leading-relaxed whitespace-pre-line break-words">
                  {content}
                </p>
              </div>
            );
          }
        }
      });
    }
    
    return index;
  };

  // Function to parse and format structured content (JSON or Markdown)
  const parseContentWithProperSpacing = (content: string) => {
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;

    // First, try to extract Markdown fenced code block
    const markdownMatch = content.match(/```markdown\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      const markdownContent = markdownMatch[1];
      parseMarkdownContent(markdownContent, elements, currentIndex);
      return elements;
    }
    
    // Try to parse directly as Markdown content (no fenced code block)
    if (content.includes('**HEADLINE') || content.includes('**TAGLINE') || content.includes('**BODY COPY')) {
      parseMarkdownContent(content, elements, currentIndex);
      return elements;
    }

    try {
      // Try to parse as JSON (legacy format)
      const jsonData = JSON.parse(content);
      
      if (jsonData.headline) {
        elements.push(
          <h2 key={currentIndex++} className="text-xl font-bold mt-6 first:mt-0">
            {jsonData.headline}
          </h2>
        );
      }

      if (jsonData.tagline) {
        elements.push(
          <h3 key={currentIndex++} className="text-lg italic mt-4">
            {jsonData.tagline}
          </h3>
        );
      }

      if (jsonData.bodyCopy) {
        elements.push(
          <p key={currentIndex++} className="text-base whitespace-pre-line break-words mt-4">
            {jsonData.bodyCopy}
          </p>
        );
      }

      if (jsonData.visualConcept) {
        elements.push(
          <p key={currentIndex++} className="text-base whitespace-pre-line break-words mt-4">
            {jsonData.visualConcept}
          </p>
        );
      }

      if (jsonData.rhetoricalCraft && Array.isArray(jsonData.rhetoricalCraft)) {
        elements.push(
          <h4 key={currentIndex++} className="text-md font-semibold mt-4">
            Rhetorical Craft Breakdown
          </h4>
        );
        
        jsonData.rhetoricalCraft.forEach((craft: any) => {
          elements.push(
            <h4 key={currentIndex++} className="text-md font-semibold mt-4">
              {craft.device}
            </h4>
          );
          elements.push(
            <p key={currentIndex++} className="text-base whitespace-pre-line break-words">
              {craft.explanation}
            </p>
          );
        });
      }

      if (jsonData.strategicImpact) {
        elements.push(
          <h4 key={currentIndex++} className="text-md font-semibold mt-4">
            Strategic Impact
          </h4>
        );
        elements.push(
          <p key={currentIndex++} className="text-base whitespace-pre-line break-words">
            {jsonData.strategicImpact}
          </p>
        );
      }

      if (elements.length > 0) {
        return elements;
      }
    } catch (error) {
      // Fall back to legacy parsing for older content
      console.log('Using legacy parsing for content:', content.substring(0, 100));
    }

    // Legacy parsing for older content format
    const cleanContent = content
      .replace(/\*\*/g, '')
      .replace(/•\s*/g, '')
      .replace(/•/g, '')
      .replace(/⚡\s*/g, '')
      .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25E6\u26A1]/g, '')
      .replace(/^\s*[-\*\+\•⚡]\s*/gm, '')
      // Don't remove numbered lines - they contain headlines!
      .replace(/^\s*[a-zA-Z]\.\s*/gm, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+/gm, '')
      .trim();

    // Match both singular and plural forms
    const sections = cleanContent.split(/(HEADLINES?:|TAGLINE:|BODY COPY:|VISUAL CONCEPT:|RHETORICAL DEVICE:)/gi);
    
    for (let i = 1; i < sections.length; i += 2) {
      const headerText = sections[i].replace(':', '').trim().toUpperCase();
      const bodyText = sections[i + 1]?.trim();
      
      if (bodyText) {
        elements.push(
          <div key={currentIndex++} className={`${elements.length > 0 ? 'mt-6' : ''}`}>
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-1 font-mono section-header-transparent">
              {headerText}
            </div>
            <div className="text-white leading-relaxed">
              {headerText === 'HEADLINE' ? (
                <h2 className="text-lg font-bold">{bodyText}</h2>
              ) : headerText === 'TAGLINE' ? (
                <h3 className="text-base font-medium">{bodyText}</h3>
              ) : (
                <div className="text-sm whitespace-pre-line break-words">{bodyText}</div>
              )}
            </div>
          </div>
        );
      }
    }
    
    // If no sections found, display as plain text
    if (elements.length === 0) {
      return (
        <div className="text-white leading-relaxed whitespace-pre-line break-words text-sm">
          {content}
        </div>
      );
    }
    
    return elements;
  };

  const handleRate = (rating: 'more_like_this' | 'less_like_this') => {
    if (concept.conceptId && onRate) {
      onRate(concept.conceptId, rating);
      setCurrentRating(rating);
      
      toast({
        title: rating === 'more_like_this' ? "Marked as preferred!" : "Marked as less preferred",
        description: "Your feedback will improve future concepts",
        duration: 2000,
      });
    }
  };

  const copyToClipboard = async () => {
    let formattedContent = '';
    
    // First, check if content is in Markdown fenced code block format
    const markdownMatch = concept.content.match(/```markdown\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      // Extract the clean Markdown content from inside the code block
      formattedContent = markdownMatch[1].trim();
    } else {
      try {
        // Try to parse as structured JSON (legacy format)
        const jsonData = JSON.parse(concept.content);
        
        if (jsonData.headline) {
          formattedContent += `HEADLINE: ${jsonData.headline}\n\n`;
        }
        
        if (jsonData.tagline) {
          formattedContent += `TAGLINE: ${jsonData.tagline}\n\n`;
        }
        
        if (jsonData.bodyCopy) {
          formattedContent += `BODY COPY: ${jsonData.bodyCopy}\n\n`;
        }
        
        if (jsonData.visualConcept) {
          formattedContent += `VISUAL CONCEPT: ${jsonData.visualConcept}\n\n`;
        }
        
        if (jsonData.rhetoricalCraft && Array.isArray(jsonData.rhetoricalCraft)) {
          formattedContent += `RHETORICAL CRAFT:\n`;
          jsonData.rhetoricalCraft.forEach((craft: any) => {
            formattedContent += `• ${craft.device}: ${craft.explanation}\n`;
          });
          formattedContent += '\n';
        }
        
        if (jsonData.strategicImpact) {
          formattedContent += `STRATEGIC IMPACT: ${jsonData.strategicImpact}\n\n`;
        }
        
      } catch (error) {
        // Fallback to copying original content
        formattedContent = concept.content.replace(/\*\*/g, '').trim();
      }
    }
    
    try {
      await navigator.clipboard.writeText(formattedContent);
      toast({
        title: "Copied to clipboard!",
        description: "Content ready to paste in Notes, Word, or Google Docs",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const downloadAsDoc = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Concept ${index ? index + 1 : ''} - Concept Forge Export</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1a1a1a; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">
          Concept ${index ? index + 1 : ''} Export
        </h1>
        <div style="margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #666;">
          <p style="margin: 0; font-weight: 600; color: #374151;">
            ${concept.rhetoricalDevice ? `Rhetorical Device: ${concept.rhetoricalDevice}` : ''}
          </p>
          <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">
            Generated: ${concept.timestamp} • Processing: ${concept.processingTime} • Tokens: ${concept.tokens}
          </p>
        </div>
        <div style="white-space: pre-wrap; margin: 20px 0;">
          ${concept.content.replace(/\n/g, '<br>')}
        </div>
        ${concept.originalityCheck ? `
        <div style="margin: 20px 0; padding: 15px; background: ${concept.originalityCheck.isOriginal ? '#f0fdf4' : '#fef2f2'}; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; color: ${concept.originalityCheck.isOriginal ? '#166534' : '#dc2626'};">
            Originality Check
          </h3>
          <p style="margin: 0; color: #374151;">
            Confidence: ${(concept.originalityCheck.confidence * 100).toFixed(1)}% • 
            Status: ${concept.originalityCheck.isOriginal ? 'Original' : 'Similar content found'}
          </p>
        </div>
        ` : ''}
        <div style="margin: 30px 0 0 0; padding: 15px; background: #f3f4f6;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">Visual Direction</h3>
          <p style="margin: 0; color: #6b7280; font-style: italic;">
            ${concept.visualPrompt}
          </p>
        </div>
        <div style="margin: 20px 0 0 0; text-align: center; color: #9ca3af; font-size: 12px;">
          Generated by Concept Forge • Advanced Creative Ideation System
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `concept-${index ? index + 1 : 'export'}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Concept exported!",
      description: "HTML file downloaded. Open with Google Docs via File > Open > Upload",
      duration: 3000,
    });
  };

  return (
    <article 
      className="concept-card bg-gray-900 border border-gray-700 p-4 sm:p-6 overflow-hidden" 
      style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', wordWrap: 'break-word', overflowWrap: 'break-word' }}
      aria-label={`Concept ${index !== undefined ? index + 1 : ''}: ${concept.rhetoricalDevice || 'creative concept'}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-3">
            {index !== undefined && (
              <div className="w-8 h-8 bg-white text-gray-900 flex items-center justify-center text-sm font-bold" aria-hidden="true">
                {index + 1}
              </div>
            )}
            {concept.rhetoricalDevice && (
              <Badge variant="outline" className="text-xs">
                {concept.rhetoricalDevice.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Badge>
            )}
          </div>
          {concept.rhetoricalDeviceDefinition && (
            <p className="text-xs text-gray-400 italic ml-11 max-w-md">
              {concept.rhetoricalDeviceDefinition}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2" role="group" aria-label="Concept actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="text-gray-300 hover:text-white min-w-[36px] min-h-[36px]"
            aria-label="Copy concept to clipboard"
          >
            <Copy className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadAsDoc}
            className="text-gray-300 hover:text-white min-w-[36px] min-h-[36px]"
            aria-label="Download concept as HTML file"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="mb-6 overflow-hidden" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }}>
        {parseContentWithProperSpacing(concept.content)}
      </div>

      {concept.originalityCheck && (
        <div className={`mb-4 p-3 ${
          concept.originalityCheck.isOriginal 
            ? 'bg-green-900 border border-green-700' 
            : 'bg-yellow-900 border border-yellow-700'
        }`}>
          <div className="text-sm">
            <span className="font-medium text-white">
              Originality: {(concept.originalityCheck.confidence * 100).toFixed(1)}% confident
            </span>
            <span className="text-gray-300 ml-2">
              • {concept.originalityCheck.isOriginal ? 'Original' : 'Similar content found'}
            </span>
          </div>
        </div>
      )}

      {showRating && (
        <div className="flex items-center justify-between pt-4 flex-wrap gap-2">
          <div className="flex items-center space-x-3" role="group" aria-label="Rate this concept">
            <Button
              variant={currentRating === 'more_like_this' ? "default" : "outline"}
              size="sm"
              onClick={() => handleRate('more_like_this')}
              className="flex items-center space-x-2 min-h-[36px]"
              aria-pressed={currentRating === 'more_like_this'}
              aria-label="I want more concepts like this"
            >
              <ThumbsUp className="w-4 h-4" aria-hidden="true" />
              <span>More like this</span>
            </Button>
            <Button
              variant={currentRating === 'less_like_this' ? "destructive" : "outline"}
              size="sm"
              onClick={() => handleRate('less_like_this')}
              className="flex items-center space-x-2 min-h-[36px]"
              aria-pressed={currentRating === 'less_like_this'}
              aria-label="I want fewer concepts like this"
            >
              <ThumbsDown className="w-4 h-4" aria-hidden="true" />
              <span>Less like this</span>
            </Button>
          </div>
          
          <div className="text-xs text-gray-400" aria-label={`${concept.tokens} tokens, ${concept.processingTime} processing time`}>
            {concept.tokens} tokens • {concept.processingTime}
          </div>
        </div>
      )}
    </article>
  );
});

export default ConceptCard;