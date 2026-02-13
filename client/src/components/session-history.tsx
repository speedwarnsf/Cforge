import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Search, ChevronDown, ChevronUp, History, Star, StarOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { H2, BodyText, Caption } from "./Typography";
import { useDebounce } from "@/hooks/use-debounce";
import { ApiErrorDisplay } from "./ErrorBoundary";

interface HistoryEntry {
  id: string;
  prompt: string;
  content: string;
  visualPrompt?: string;
  tone: string;
  timestamp: string;
  tokens?: number;
  processingTime?: string;
  isFavorite?: boolean;
  iterationType?: 'original' | 'reforge_headline' | 'reforge_tagline' | 'reforge_body' | 'reforge_full';
  originalityConfidence?: number;
  originalityMatches?: number;
  deepScanUsed?: boolean;
}

interface SessionHistoryProps {
  currentResponse?: HistoryEntry | null;
  onAddToHistory?: (entry: HistoryEntry) => void;
}

export default function SessionHistory({ currentResponse, onAddToHistory }: SessionHistoryProps) {
  const [sessionEntries, setSessionEntries] = useState<HistoryEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const debouncedSearch = useDebounce(searchTerm, 250);

  // Fetch permanent history from Supabase
  const { data: permanentHistory, error: historyError, refetch: refetchHistory } = useQuery({
    queryKey: ['/api/history'],
    queryFn: async () => {
      const response = await fetch('/api/history');
      if (!response.ok) throw new Error(`Failed to load history (${response.status})`);
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Add current response to session history when it changes
  useEffect(() => {
    if (currentResponse && !sessionEntries.find(entry => entry.id === currentResponse.id)) {
      setSessionEntries(prev => [currentResponse, ...prev]);
      onAddToHistory?.(currentResponse);
    }
  }, [currentResponse]);

  // Filter and search entries (using debounced search for performance)
  const filteredEntries = [...sessionEntries, ...(permanentHistory || [])]
    .filter(entry => {
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase();
      return entry.prompt.toLowerCase().includes(q) || entry.content.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());



  const handleSelectEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const toggleFavorite = async (entryId: string) => {
    try {
      const response = await fetch('/api/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId })
      });

      if (response.ok) {
        // Update local state for session entries
        setSessionEntries(prev => 
          prev.map(entry => 
            entry.id === entryId 
              ? { ...entry, isFavorite: !entry.isFavorite }
              : entry
          )
        );
        toast({
          title: "Success",
          description: "Favorite status updated",
        });
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const exportSelected = async () => {
    const selectedData = filteredEntries.filter(entry => selectedEntries.has(entry.id));
    
    if (selectedData.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select entries to export",
        variant: "destructive",
      });
      return;
    }

    await exportEntries(selectedData, `concept-forge-selected-${selectedData.length}-entries`);
  };

  const exportAll = async () => {
    if (filteredEntries.length === 0) {
      toast({
        title: "No Data",
        description: "No entries to export",
        variant: "destructive",
      });
      return;
    }

    await exportEntries(filteredEntries, `concept-forge-session-history`);
  };

  const handleCleanupHistory = async () => {
    try {
      const response = await fetch('/api/cleanup-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        throw new Error('Cleanup failed');
      }

      const result = await response.json();
      
      toast({
        title: "Cleanup Complete",
        description: `Deleted ${result.deleted || 0} entries, kept ${result.kept || 0}`,
      });

      // Clear session entries and refresh permanent history
      setSessionEntries([]);
      
      // The history will refresh automatically on next interval
      window.location.reload();

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cleanup history",
        variant: "destructive",
      });
    }
  };

  const exportEntries = async (entries: HistoryEntry[], filename: string) => {
    try {
      // Create simplified text content for Google Docs
      let textContent = `Concept Forge - Session History Export\n`;
      textContent += `Generated on ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}\n\n`;
      textContent += `═══════════════════════════════════════════════\n\n`;

      entries.forEach((entry, index) => {
        textContent += `Concept ${index + 1}\n`;
        textContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (entry.prompt) {
          textContent += `Original Brief:\n`;
          textContent += `"${entry.prompt}"\n\n`;
        }
        
        // Enhanced metadata
        const metadata = [];
        if (entry.tone) {
          const toneNames: Record<string, string> = {
            'creative': 'Bold Concepting',
            'analytical': 'Strategic Persuasion', 
            'conversational': 'Conversational Hook',
            'technical': 'Simplified Systems',
            'summarize': 'Core Idea Finder'
          };
          metadata.push(`Lens: ${toneNames[entry.tone] || entry.tone}`);
        }

        if (entry.iterationType && entry.iterationType !== 'original') {
          const iterationNames: Record<string, string> = {
            'reforge_headline': 'Reforged Headline',
            'reforge_tagline': 'Reforged Tagline', 
            'reforge_body': 'Reforged Body Copy',
            'reforge_full': 'Full Reforge'
          };
          metadata.push(`Type: ${iterationNames[entry.iterationType] || entry.iterationType}`);
        }

        if (entry.originalityConfidence !== undefined) {
          const confidence = Math.round(entry.originalityConfidence * 100);
          metadata.push(`Originality: ${confidence}%`);
        }

        if (entry.timestamp) {
          const date = new Date(entry.timestamp);
          metadata.push(`Created: ${date.toLocaleDateString()}`);
        }

        if (metadata.length > 0) {
          textContent += `${metadata.join(' • ')}\n\n`;
        }
        
        // Content
        if (entry.content) {
          textContent += `Campaign Concept:\n`;
          
          // Process content with proper spacing - add extra space after paragraphs but not headlines
          const contentLines = entry.content.split('\n');
          for (let i = 0; i < contentLines.length; i++) {
            const line = contentLines[i].trim();
            if (line) {
              textContent += `${line}\n`;
              // Add extra space after paragraphs (non-headline lines) but not after headlines
              if (!line.startsWith('**') && i < contentLines.length - 1 && contentLines[i + 1].trim()) {
                textContent += `\n`;
              }
            }
          }
          textContent += `\n`;
        }
        
        // Visual prompt
        if (entry.visualPrompt) {
          textContent += `MidJourney Visual Prompt:\n`;
          textContent += `${entry.visualPrompt}\n\n`;
        }
        
        if (index < entries.length - 1) {
          textContent += `\n`;
        }
      });

      textContent += `\n═══════════════════════════════════════════════\n`;
      textContent += `${entries.length} concepts exported • Generated by Concept Forge`;

      // Create a data URI that can be opened directly as a Google Doc
      let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Concept Forge - Session History Export</title>
    <style>
        body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.6; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px 20px; 
            color: #333;
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px; 
            border-bottom: 2px solid #333; 
            padding-bottom: 20px; 
        }
        .header h1 { 
            font-size: 28px; 
            color: #333; 
            margin-bottom: 8px; 
        }
        .header .subtitle { 
            color: #666; 
            font-style: italic; 
        }
        .concept { 
            margin-bottom: 40px; 
            border-left: 4px solid #666; 
            padding-left: 20px; 
        }
        .concept-header { 
            font-size: 20px; 
            font-weight: bold; 
            color: #333; 
            margin-bottom: 12px; 
        }
        .prompt { 
            font-style: italic; 
            color: #666; 
            margin-bottom: 16px; 
            background: #f8f9fa; 
            padding: 12px; 
            border-radius: 0; 
        }
        .metadata { 
            color: #666; 
            font-size: 14px; 
            margin-bottom: 16px; 
        }
        .content { 
            margin-bottom: 24px; 
            line-height: 1.7; 
        }
        p.content {
            margin-bottom: 20px;
            text-align: justify;
        }
        .section-header { 
            font-weight: bold; 
            margin: 20px 0 4px 0; 
            color: #333; 
        }
        .visual-prompt { 
            background: #f8f9fa; 
            padding: 16px; 
            border-left: 4px solid #666; 
            margin: 16px 0; 
            border-radius: 0; 
        }
        .visual-prompt-label { 
            font-weight: bold; 
            color: #333; 
            margin-bottom: 8px; 
        }
        .visual-prompt-text { 
            font-style: italic; 
            color: #555; 
        }
        .separator { 
            border-bottom: 1px solid #e0e0e0; 
            margin: 30px 0; 
        }
      </style>
</head>
<body>
    <div class="header">
        <h1>Concept Forge - Session History Export</h1>
        <div class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</div>
    </div>
`;

      entries.forEach((entry, index) => {
        htmlContent += `<div class="concept">`;
        htmlContent += `<div class="concept-header">Concept ${index + 1}</div>`;
        
        if (entry.prompt) {
          htmlContent += `<div class="prompt">"${entry.prompt.replace(/"/g, '&quot;')}"</div>`;
        }
        
        // Enhanced metadata
        const metadata = [];
        if (entry.tone) {
          const toneNames: Record<string, string> = {
            'creative': 'Bold Concepting',
            'analytical': 'Strategic Persuasion', 
            'conversational': 'Conversational Hook',
            'technical': 'Simplified Systems',
            'summarize': 'Core Idea Finder'
          };
          metadata.push(`Lens: ${toneNames[entry.tone] || entry.tone}`);
        }

        if (entry.iterationType && entry.iterationType !== 'original') {
          const iterationNames: Record<string, string> = {
            'reforge_headline': 'Reforged Headline',
            'reforge_tagline': 'Reforged Tagline', 
            'reforge_body': 'Reforged Body Copy',
            'reforge_full': 'Full Reforge'
          };
          metadata.push(`Type: ${iterationNames[entry.iterationType] || entry.iterationType}`);
        }

        if (entry.originalityConfidence !== undefined) {
          const confidence = Math.round(entry.originalityConfidence * 100);
          metadata.push(`Originality: ${confidence}%`);
        }

        if (entry.timestamp) {
          const date = new Date(entry.timestamp);
          metadata.push(`Created: ${date.toLocaleDateString()}`);
        }

        if (metadata.length > 0) {
          htmlContent += `<div class="metadata">${metadata.join(' • ')}</div>`;
        }
        
        // Process content with proper HTML formatting
        if (entry.content) {
          // Split by major sections first (headers marked with **)
          const sections = entry.content.split(/(?=\*\*[^*]+\*\*)/);
          
          for (const section of sections) {
            if (!section.trim()) continue;
            
            const lines = section.split('\n').filter(line => line.trim());
            if (lines.length === 0) continue;
            
            // Check if first line is a header
            const firstLine = lines[0].trim();
            if (firstLine.startsWith('**') && firstLine.endsWith('**')) {
              // Add header
              const headerText = firstLine.replace(/\*\*/g, '').trim();
              htmlContent += `<div class="section-header">${headerText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
              
              // Process remaining lines as content
              const contentLines = lines.slice(1);
              if (contentLines.length > 0) {
                const contentText = contentLines.map(line => line.trim()).join(' ').trim();
                if (contentText) {
                  htmlContent += `<p class="content">${contentText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
                }
              }
            } else {
              // No header, treat as regular content paragraph
              const contentText = lines.map(line => line.trim()).join(' ').trim();
              if (contentText) {
                htmlContent += `<p class="content">${contentText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
              }
            }
          }
        }
        
        // Visual prompt
        if (entry.visualPrompt) {
          const cleanVisualPrompt = entry.visualPrompt.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          htmlContent += `
            <div class="visual-prompt">
              <div class="visual-prompt-label">MidJourney Visual Prompt</div>
              <div class="visual-prompt-text">${cleanVisualPrompt}</div>
            </div>
          `;
        }
        
        htmlContent += `</div>`;
        
        if (index < entries.length - 1) {
          htmlContent += `<div class="separator"></div>`;
        }
      });

      htmlContent += `
    <div style="text-align: center; margin-top: 40px; color: #666; font-size: 14px;">
      ${entries.length} concepts exported • Generated by Concept Forge
    </div>
</body>
</html>`;

      // Create a blob and download as HTML file that can be imported to Google Docs
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `concept-forge-export-${Date.now()}.html`;
      a.click();
      window.URL.revokeObjectURL(url);

      // Also open Google Docs import page
      setTimeout(() => {
        window.open('https://docs.google.com/document/create', '_blank');
      }, 500);

      toast({
        title: "Google Docs Export Complete!",
        description: `HTML file downloaded. Use File > Open in the new Google Doc to import with full formatting.`,
      });

    } catch (error) {
      // Fallback: download as text file  
      try {
        const textContent = entries.map((entry, index) => 
          `Concept ${index + 1}\n` +
          `Brief: "${entry.prompt}"\n` +
          `Content: ${entry.content}\n` +
          (entry.visualPrompt ? `Visual: ${entry.visualPrompt}\n` : '') +
          '\n---\n'
        ).join('\n');

        const blob = new Blob([textContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.replace('.docx', '.txt');
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
          title: "Fallback Export",
          description: "Downloaded as text file. Import to Google Docs using File > Open.",
        });
      } catch (fallbackError) {
        toast({
          title: "Error",
          description: "Failed to export entries",
          variant: "destructive",
        });
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };



  return (
    <div className="session-history">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            style={{
              backgroundColor: isOpen ? '#059669' : 'transparent',
              background: isOpen ? 'linear-gradient(to right, #059669, #047857)' : 'transparent',
              borderRadius: '0',
              transition: 'all 0.3s ease'
            }}
            className={`w-full justify-between py-6 text-white rounded-none transition-all duration-300 ${
              isOpen 
                ? "hover:opacity-90" 
                : "hover:bg-white/10"
            }`}
          >
            <div className="flex items-center space-x-3">
              <History className="w-5 h-5" />
              <span className="text-lg font-bold uppercase tracking-wide">SESSION HISTORY</span>
              <Badge variant="outline" className="text-xs rounded-none text-slate-400 border-slate-500">
                {filteredEntries.length} entries
              </Badge>
            </div>
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-6 pt-6">
          {/* Search Controls */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search prompts and responses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 backdrop-blur-sm border-0 text-white placeholder-gray-400 rounded-none w-full focus:border-0 focus:ring-0"
              aria-label="Search session history"
              type="search"
            />
          </div>

          {/* Error display for history loading */}
          {historyError && (
            <ApiErrorDisplay 
              error={historyError instanceof Error ? historyError : new Error(String(historyError))} 
              onRetry={() => refetchHistory()} 
              message="Failed to load session history" 
            />
          )}

          {/* Export Controls - Responsive Layout - Cache Bust v1752940350 */}
          <div data-cache-bust="1752940350">
            <div className="flex flex-wrap gap-2 mb-3">
              <Button
                variant="outline"
                onClick={exportSelected}
                disabled={selectedEntries.size === 0}
                style={{ backgroundColor: 'rgba(107, 114, 128, 0.7)', borderColor: 'rgba(107, 114, 128, 0.7)' }}
                className="border-0 text-white hover:opacity-80 disabled:opacity-30 rounded-none text-xs px-2 py-0.5 h-6 min-w-fit"
              >
                <Download className="w-3 h-3 mr-1" />
                Export ({selectedEntries.size})
              </Button>
              
              <Button
                variant="outline"
                onClick={exportAll}
                disabled={filteredEntries.length === 0}
                style={{ backgroundColor: 'rgba(107, 114, 128, 0.7)', borderColor: 'rgba(107, 114, 128, 0.7)' }}
                className="border-0 text-white hover:opacity-80 disabled:opacity-30 rounded-none text-xs px-2 py-0.5 h-6 min-w-fit"
              >
                <Download className="w-3 h-3 mr-1" />
                G-Doc ({filteredEntries.length})
              </Button>

              <Button
                variant="outline"
                onClick={handleCleanupHistory}
                disabled={filteredEntries.length <= 1}
                style={{ backgroundColor: 'rgba(107, 114, 128, 0.7)', borderColor: 'rgba(107, 114, 128, 0.7)' }}
                className="border-0 text-white hover:opacity-80 disabled:opacity-30 rounded-none text-xs px-2 py-0.5 h-6 min-w-fit"
              >
                Keep Latest Only
              </Button>
            </div>
          </div>

          {/* History Entries */}
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No entries found</p>
                  <p className="text-sm mt-2">Generate some concepts to see them here</p>
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <Card key={entry.id} className="bg-white/10 backdrop-blur-sm border-0 rounded-none session-history-card">
                    <CardHeader className="pb-3">
                      <div className="session-history-layout">
                        <div className="session-history-checkbox">
                          <Checkbox
                            checked={selectedEntries.has(entry.id)}
                            onCheckedChange={() => handleSelectEntry(entry.id)}
                            className="border-0 data-[state=checked]:bg-white data-[state=checked]:text-slate-900"
                          />
                        </div>
                        <div className="session-history-content" style={{ userSelect: 'text', WebkitUserSelect: 'text', cursor: 'text' }}>
                          <p className="text-sm text-slate-400 italic leading-tight" style={{ userSelect: 'text', WebkitUserSelect: 'text', cursor: 'text' }}>
                            "{entry.prompt}"
                          </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs text-slate-400 border-0 bg-white/20">
                                {entry.tone}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {formatTimestamp(entry.timestamp)}
                              </span>
                              {entry.tokens && (
                                <span className="text-xs text-slate-500">
                                  {entry.tokens} tokens
                                </span>
                              )}
                              {entry.processingTime && (
                                <span className="text-xs text-slate-500">
                                  {entry.processingTime}
                                </span>
                              )}
                            </div>
                        </div>
                        <div className="session-history-star">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(entry.id)}
                            className="text-slate-400 hover:text-yellow-400 p-1"
                          >
                            {entry.isFavorite ? 
                              <Star className="w-4 h-4 fill-current" /> : 
                              <StarOff className="w-4 h-4" />
                            }
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                      <div className="text-sm text-slate-300 space-y-3 overflow-hidden" style={{ userSelect: 'text', WebkitUserSelect: 'text', cursor: 'text' }}>
                        {entry.content.split(/\*\*([^:]+):\*\*/).map((section: string, index: number) => {
                          if (index % 2 === 1) {
                            return (
                              <div key={index} className="font-semibold text-white text-xs tracking-wider uppercase break-words">
                                {section}:
                              </div>
                            );
                          } else if (section.trim()) {
                            return (
                              <div 
                                key={index} 
                                className="leading-relaxed break-words overflow-wrap-anywhere"
                                style={{ 
                                  userSelect: 'text', 
                                  WebkitUserSelect: 'text', 
                                  cursor: 'text',
                                  pointerEvents: 'auto'
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                              >
                                {section.trim()}
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}