import { useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { aiRequestFormSchema, type AiRequestForm } from "@shared/schema";
import { exampleQueries, type ExampleQuery } from "@shared/constants";

import { Copy, X, ArrowRight, Lightbulb, Sparkles, FileText, ChevronDown, Download, Grid3X3 } from "lucide-react";
import { Link } from "wouter";
import SessionHistory from "./session-history";
import SharedLayout from "./SharedLayout";
import ConceptCard from "./concept-card";
import LoadingWindow from "./LoadingWindow";
import ResultsDisplay from './ResultsDisplay';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useVideo } from "@/hooks/use-video";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { H2, BodyText, Caption } from "./Typography";
import { BrandLogo } from "./brand-logo";
import React from "react";

// Prompt Refinement Panel Component
const PromptRefinementPanel = ({ query, onSelect }: { query: string, onSelect: (text: string) => void }) => {
  const [refinements, setRefinements] = useState<Array<{text: string, rationale: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  React.useEffect(() => {
    if (query && expanded && query.trim().length > 3) {
      setLoading(true);
      fetch('/api/refine-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      .then(res => res.json())
      .then(data => {
        setRefinements(data.rewrites || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Refinement error:', err);
        setLoading(false);
      });
    }
  }, [query, expanded]);

  if (!query || query.trim().length === 0) return null;

  return (
    <div className="mt-3 p-2 border border-gray-200 bg-gray-50">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2 bg-white hover:bg-gray-100 border border-gray-200 text-sm text-gray-700 transition-colors"
      >
        {expanded ? 'Hide Refinements' : 'Refine Prompt (3 Options)'}
      </button>
      
      {expanded && (
        <div className="mt-3">
          {loading ? (
            <p className="text-center text-gray-600 py-4">Generating refinements...</p>
          ) : (
            <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-3 md:gap-2">
              {refinements.map((ref, i) => (
                <div 
                  key={i}
                  onClick={() => { onSelect(ref.text); setExpanded(false); }}
                  className="cursor-pointer p-3 border border-gray-200 hover:border-gray-400 hover:bg-gray-100 transition-colors bg-white"
                >
                  <p className="text-sm mb-2">{ref.text}</p>
                  <small className="text-xs text-gray-500">{ref.rationale}</small>
                </div>
              ))}
              
              <div className="md:col-span-3 mt-3 flex flex-col space-y-2">
                <button 
                  onClick={() => { onSelect(query); setExpanded(false); }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-sm transition-colors"
                >
                  Use Original
                </button>
                <input 
                  type="text" 
                  placeholder="Custom edit..." 
                  className="w-full p-2 border border-gray-200 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      onSelect(e.currentTarget.value);
                      setExpanded(false);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface OriginalityCheck {
  query: string;
  isOriginal: boolean;
  matches: Array<{
    title: string;
    url: string;
    snippet: string;
    similarity: number;
    source: 'brand' | 'campaign' | 'slogan' | 'general';
    imageUrl?: string;
    visualAnalysis?: string;
  }>;
  confidence: number;
  searchPerformed: boolean;
}

interface SingleConcept {
  id: number;
  conceptId?: string;
  content: string;
  visualPrompt: string;
  tone: string;
  tokens: number;
  processingTime: string;
  timestamp: string;
  originalityCheck?: OriginalityCheck;
  rhetoricalDevice?: string;
  rhetoricalDeviceDefinition?: string;
  iterationType?: 'original' | 'reforge_headline' | 'reforge_tagline' | 'reforge_body' | 'reforge_full';
}

interface AiResponse {
  // Legacy single concept format (for backward compatibility)
  id?: number;
  conceptId?: string;
  content?: string;
  visualPrompt?: string;
  tone?: string;
  tokens?: number;
  processingTime?: string;
  timestamp?: string;
  originalityCheck?: OriginalityCheck;
  iterationType?: 'original' | 'reforge_headline' | 'reforge_tagline' | 'reforge_body' | 'reforge_full';
  
  // Multi-concept format
  concepts?: SingleConcept[];
  totalTokens?: number;
  totalProcessingTime?: string;
  batchId?: string;
}

interface AiGeneratorProps {
  onSubmit?: () => Promise<void>;
}

interface AiGeneratorRef {
  triggerGeneration: (data: any) => void;
}

const AiGenerator = forwardRef<AiGeneratorRef, AiGeneratorProps>(({ onSubmit }, ref) => {
  const [response, setResponse] = useState<AiResponse | null>(null);
  const [currentConcepts, setCurrentConcepts] = useState<SingleConcept[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [briefCollapsed, setBriefCollapsed] = useState(false);
  const [contentFadingOut, setContentFadingOut] = useState(false);
  const [isLoadingWindowOpen, setIsLoadingWindowOpen] = useState(false);
  const [currentProject] = useState("concept_forge_session"); // Default project for rating persistence
  const [completionCallback, setCompletionCallback] = useState<(() => void) | null>(null);
  const [processingSteps, setProcessingSteps] = useState({
    aiGeneration: { status: 'pending' as 'pending' | 'active' | 'complete' | 'failed', startTime: null as number | null },
    webSearch: { status: 'pending' as 'pending' | 'active' | 'complete' | 'failed', startTime: null as number | null },
    imageAnalysis: { status: 'pending' as 'pending' | 'active' | 'complete' | 'failed', startTime: null as number | null },
    verification: { status: 'pending' as 'pending' | 'active' | 'complete' | 'failed', startTime: null as number | null }
  });
  const { toast } = useToast();
  
  // Scroll reveal hooks
  const briefReveal = useScrollReveal({ threshold: 0.2 });
  const toolsReveal = useScrollReveal({ threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  const form = useForm<AiRequestForm>({
    resolver: zodResolver(aiRequestFormSchema),
    defaultValues: {
      query: "",
      tone: "creative",
      includeCliches: false,
      deepScan: false,
      conceptCount: 1,
      projectId: "concept_forge_session", // Use consistent project ID for ratings
    },
  });

  // Expose the triggerGeneration method to parent components
  useImperativeHandle(ref, () => ({
    triggerGeneration: (data: any) => {
      console.log('🎯 AiGenerator received generation data:', data);

      // Store the completion callback for later use
      setCompletionCallback(() => data.onCompleteCallback);

      // Check if this is already a completed result (multivariant response)
      if (data.success && data.outputs) {
        console.log('🎯 AiGenerator: Received pre-generated multivariant results');
        // Transform multivariant outputs to concept format and display them
        const concepts = data.outputs.map((output: any, index: number) => ({
          id: output.conceptId || `multi_${Date.now()}_${index}`,
          content: output.content || `**HEADLINE**\n${output.headlines?.[0] || 'Generated Concept'}\n\n**VISUAL CONCEPT**\n${output.visualDescription || 'Visual concept'}`,
          tone: output.tone || data.metadata?.tone || 'bold',
          visualPrompt: output.visualDescription || '',
          tokens: 0,
          processingTime: data.metadata?.totalTime ? `${data.metadata.totalTime}ms` : 'N/A',
          originalityCheck: { confidence: (output.originalityScore || 50) / 100 },
          rhetoricalDevice: output.rhetoricalDevice || 'metaphor',
          rhetoricalDeviceDefinition: output.rhetoricalDeviceDefinition
        }));

        setCurrentConcepts(concepts);
        setBriefCollapsed(true);
        setIsGenerating(false);
        setIsLoadingWindowOpen(false);

        // Call completion callback
        if (data.onCompleteCallback) {
          data.onCompleteCallback();
        }
        return;
      }

      // Check if this is a single concept response (already generated)
      if (data.content && data.conceptId) {
        console.log('🎯 AiGenerator: Received pre-generated single concept');
        setCurrentConcepts([{
          id: data.conceptId,
          content: data.content,
          tone: data.tone,
          visualPrompt: data.visualPrompt,
          tokens: data.tokens,
          processingTime: data.processingTime,
          originalityCheck: data.originalityCheck
        }]);
        setBriefCollapsed(true);
        setIsGenerating(false);
        setIsLoadingWindowOpen(false);

        // Call completion callback
        if (data.onCompleteCallback) {
          data.onCompleteCallback();
        }
        return;
      }

      // Otherwise, trigger a new generation
      setIsLoadingWindowOpen(true);
      setIsGenerating(true);
      setCurrentConcepts([]); // Clear previous results

      // Update the form with the data from ConceptForgeIdeationSection
      form.reset({
        query: data.query,
        tone: data.tone,
        includeCliches: data.includeCliches,
        deepScan: data.deepScan,
        conceptCount: data.conceptCount,
        projectId: "concept_forge_session"
      });

      // Trigger the generation
      generateMutation.mutate({
        query: data.query,
        tone: data.tone,
        includeCliches: data.includeCliches,
        deepScan: data.deepScan,
        conceptCount: data.conceptCount,
        projectId: "concept_forge_session"
      });
    }
  }));

  const generateMutation = useMutation({
    mutationFn: async (data: AiRequestForm) => {
      console.log('🎯 STARTING GENERATION: Setting states...');
      setIsGenerating(true);
      setIsLoadingWindowOpen(true);
      setBriefCollapsed(true);
      console.log('🎯 LoadingWindow should now be visible (isLoadingWindowOpen=true)');
      
      // Reset processing steps
      setProcessingSteps({
        aiGeneration: { status: 'pending', startTime: null },
        webSearch: { status: 'pending', startTime: null },
        imageAnalysis: { status: 'pending', startTime: null },
        verification: { status: 'pending', startTime: null }
      });
      
      // Start AI generation step
      setProcessingSteps(prev => ({
        ...prev,
        aiGeneration: { status: 'active', startTime: Date.now() }
      }));
      
      // Input validation
      if (!data.query?.trim()) {
        throw new Error("Please provide a creative brief");
      }
      if (!data.tone) {
        throw new Error("Please select a concept lens");
      }
      if (data.query.length > 5000) {
        throw new Error("Creative brief is too long (max 5000 characters)");
      }
      
      // Progress to web search step after a delay
      setTimeout(() => {
        setProcessingSteps(prev => ({
          ...prev,
          aiGeneration: { status: 'complete', startTime: prev.aiGeneration.startTime },
          webSearch: { status: 'active', startTime: Date.now() }
        }));
      }, 1500);
      
      // Progress to image analysis step
      setTimeout(() => {
        setProcessingSteps(prev => ({
          ...prev,
          webSearch: { status: 'complete', startTime: prev.webSearch.startTime },
          imageAnalysis: { status: 'active', startTime: Date.now() }
        }));
      }, 3000);
      
      // Progress to verification step
      setTimeout(() => {
        setProcessingSteps(prev => ({
          ...prev,
          imageAnalysis: { status: 'complete', startTime: prev.imageAnalysis.startTime },
          verification: { status: 'active', startTime: Date.now() }
        }));
      }, 5000);
      
      // Debug logging to track what's being sent from frontend
      console.log("🎯 FRONTEND SENDING QUERY:", data.query);
      console.log("🎨 FRONTEND SENDING TONE:", data.tone);
      console.log("📝 FRONTEND FULL DATA:", JSON.stringify(data, null, 2));

      const response = await fetch(`/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Generation failed: ${response.status} ${errorText}`);
      }
      
      const result = await response.json() as AiResponse;
      
      // Complete final step
      setProcessingSteps(prev => ({
        ...prev,
        verification: { status: 'complete', startTime: prev.verification.startTime }
      }));
      
      if (!result) {
        throw new Error("Invalid response received from server");
      }

      return result;
    },
    onSuccess: (data: AiResponse) => {
      console.log('🎯 SUCCESS: Generation completed, processing response...', data);
      setResponse(data);
      
      // Handle both single and multi-concept responses
      if (data.concepts && data.concepts.length > 0) {
        // Multi-concept response
        console.log('🎯 Setting current concepts:', data.concepts.length, 'concepts');
        setCurrentConcepts(data.concepts);
        setBriefCollapsed(true);
        setIsGenerating(false);
        console.log('🎯 Closing LoadingWindow...');
        setIsLoadingWindowOpen(false);
        setContentFadingOut(false);
        
        toast({
          title: `${data.concepts.length} concepts forged successfully!`,
          description: `Generated in ${data.totalProcessingTime}`,
          className: "fixed bottom-4 right-4 w-80 bg-green-50 border-green-200 text-green-800",
          duration: 2000,
        });
      } else {
        // Single concept response (legacy format)
        if (data.content) {
          const singleConcept: SingleConcept = {
            id: data.id || Date.now(),
            conceptId: data.conceptId,
            content: data.content,
            visualPrompt: data.visualPrompt || '',
            tone: data.tone || '',
            tokens: data.tokens || 0,
            processingTime: data.processingTime || '',
            timestamp: data.timestamp || '',
            originalityCheck: data.originalityCheck,
            iterationType: data.iterationType
          };
          setCurrentConcepts([singleConcept]);
        }
        
        setBriefCollapsed(true);
        setIsGenerating(false);
        setIsLoadingWindowOpen(false);
        setContentFadingOut(false);
        
        // Call completion callback if it exists
        if (completionCallback) {
          console.log('🎯 AiGenerator: Calling completion callback');
          completionCallback();
          setCompletionCallback(null); // Clear it after use
        }
        
        toast({
          title: "Concept forged successfully!",
          description: `Generated in ${data.processingTime}`,
          className: "fixed bottom-4 right-4 w-80 bg-green-50 border-green-200 text-green-800",
          duration: 2000,
        });
      }
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      setIsLoadingWindowOpen(false);
      setContentFadingOut(false);
      
      // Call completion callback if it exists (even on error)
      if (completionCallback) {
        console.log('🎯 AiGenerator: Calling completion callback (error case)');
        completionCallback();
        setCompletionCallback(null); // Clear it after use
      }
      
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
        className: "fixed bottom-4 right-4 w-80",
        duration: 4000,
      });
    },
  });

  const handleFormSubmit = async (data: AiRequestForm) => {
    setContentFadingOut(true);
    if (onSubmit) {
      await onSubmit();
    }
    generateMutation.mutate(data);
  };

  const handleExampleClick = (example: ExampleQuery) => {
    form.setValue("query", example.query);
    form.setValue("tone", example.tone as any);
  };

  const handleToneSelect = (tone: string) => {
    form.setValue("tone", tone as any);
    // Don't change the query - keep user's input
  };


  const clearResponse = () => {
    setResponse(null);
    setCurrentConcepts([]);
    setBriefCollapsed(false);
    setContentFadingOut(false);
  };

  const handleFeedback = async (index: number, type: string) => {
    try {
      const concept = currentConcepts[index];
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          conceptId: concept?.conceptId || concept?.id, 
          feedbackType: type 
        })
      });
      
      if (type === 'favorite') {
        console.log('Favorited concept:', concept?.conceptId || concept?.id);
      }
      
      toast({
        title: "Feedback recorded",
        description: `Marked concept as "${type.replace('_', ' ')}"`,
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Feedback failed",
        description: "Please try again",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  return (
    <SharedLayout>
      <div className="relative">
      {/* Loading Animation with White Square Logo */}
      {isGenerating && (
        <div className="fixed inset-0 bg-slate-900/90 text-white z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {/* ConceptForge Logo */}
              <div className="mb-6">
                <img 
                  src="/attached_assets/Headline_1752875122000.png" 
                  alt="ConceptForge" 
                  className="w-64 h-auto mx-auto opacity-90"
                  style={{
                    filter: 'drop-shadow(0 8px 25px rgba(0, 0, 0, 0.9))',
                    maxWidth: '320px'
                  }}
                />
              </div>
              
              <div className="text-center">
                <div className="text-xs text-slate-400 font-mono tracking-widest mt-1">ORIGINALITY RESEARCH MODULE</div>
              </div>
              
              <BodyText className="text-slate-300 mt-6 text-lg font-sans">Forging concepts...</BodyText>
            </div>
            
            {/* Sequential process status indicators */}
            <div className="space-y-3 text-sm text-slate-300 max-w-lg mx-auto mt-8">
              {/* Step 1: AI Generation */}
              <div className={`flex items-center space-x-3 transition-all duration-500 ${
                processingSteps.aiGeneration.status === 'active' ? '' : 
                processingSteps.aiGeneration.status !== 'pending' ? 'opacity-100' : 'opacity-0'
              }`}>
                <div className={`w-3 h-3 flex-shrink-0 ${
                  processingSteps.aiGeneration.status === 'active' ? 'animate-pulse' :
                  processingSteps.aiGeneration.status === 'complete' ? '' :
                  processingSteps.aiGeneration.status === 'failed' ? 'bg-red-500' : 'bg-slate-600'
                }`} style={{
                  backgroundColor: processingSteps.aiGeneration.status === 'active' ? '#FF6B47' :
                                 processingSteps.aiGeneration.status === 'complete' ? '#4CAF50' :
                                 processingSteps.aiGeneration.status === 'failed' ? '#EF4444' : '#64748B'
                }}></div>
                <span>
                  {processingSteps.aiGeneration.status === 'active' ? 'Generating creative concept with AI' :
                   processingSteps.aiGeneration.status === 'complete' ? 'AI concept generation complete' :
                   processingSteps.aiGeneration.status === 'failed' ? 'Generation failed' :
                   'Preparing AI generation...'}
                </span>
              </div>
              
              {/* Step 2: Web Search */}
              <div className={`flex items-center space-x-3 transition-all duration-500 ${
                processingSteps.webSearch.status === 'active' ? '' : 
                processingSteps.webSearch.status !== 'pending' ? 'opacity-100' : 'opacity-30'
              }`}>
                <div className={`w-3 h-3 flex-shrink-0 ${
                  processingSteps.webSearch.status === 'active' ? 'animate-pulse' :
                  processingSteps.webSearch.status === 'complete' ? '' :
                  processingSteps.webSearch.status === 'failed' ? 'bg-red-500' : 'bg-slate-600'
                }`} style={{
                  backgroundColor: processingSteps.webSearch.status === 'active' ? '#4285F4' :
                                 processingSteps.webSearch.status === 'complete' ? '#4CAF50' :
                                 processingSteps.webSearch.status === 'failed' ? '#EF4444' : '#64748B'
                }}></div>
                <span>
                  {processingSteps.webSearch.status === 'active' ? 'Scanning global campaigns for originality' :
                   processingSteps.webSearch.status === 'complete' ? 'Campaign research complete' :
                   processingSteps.webSearch.status === 'failed' ? 'Search failed' :
                   'Queuing originality research...'}
                </span>
              </div>
              
              {/* Step 3: Image Analysis */}
              <div className={`flex items-center space-x-3 transition-all duration-500 ${
                processingSteps.imageAnalysis.status === 'active' ? '' : 
                processingSteps.imageAnalysis.status !== 'pending' ? 'opacity-100' : 'opacity-30'
              }`}>
                <div className={`w-3 h-3 flex-shrink-0 ${
                  processingSteps.imageAnalysis.status === 'active' ? 'animate-pulse' :
                  processingSteps.imageAnalysis.status === 'complete' ? '' :
                  processingSteps.imageAnalysis.status === 'failed' ? 'bg-red-500' : 'bg-slate-600'
                }`} style={{
                  backgroundColor: processingSteps.imageAnalysis.status === 'active' ? '#FFD23F' :
                                 processingSteps.imageAnalysis.status === 'complete' ? '#4CAF50' :
                                 processingSteps.imageAnalysis.status === 'failed' ? '#EF4444' : '#64748B'
                }}></div>
                <span>
                  {processingSteps.imageAnalysis.status === 'active' ? 'Analyzing campaign visuals with AI vision' :
                   processingSteps.imageAnalysis.status === 'complete' ? 'Visual analysis complete' :
                   processingSteps.imageAnalysis.status === 'failed' ? 'Analysis failed' :
                   'Preparing visual analysis...'}
                </span>
              </div>
              
              {/* Step 4: Verification */}
              <div className={`flex items-center space-x-3 transition-all duration-500 ${
                processingSteps.verification.status === 'active' ? '' : 
                processingSteps.verification.status !== 'pending' ? 'opacity-100' : 'opacity-30'
              }`}>
                <div className={`w-3 h-3 flex-shrink-0 ${
                  processingSteps.verification.status === 'active' ? 'animate-pulse' :
                  processingSteps.verification.status === 'complete' ? '' :
                  processingSteps.verification.status === 'failed' ? 'bg-red-500' : 'bg-slate-600'
                }`} style={{
                  backgroundColor: processingSteps.verification.status === 'active' ? '#4CAF50' :
                                 processingSteps.verification.status === 'complete' ? '#4CAF50' :
                                 processingSteps.verification.status === 'failed' ? '#EF4444' : '#64748B'
                }}></div>
                <span>
                  {processingSteps.verification.status === 'active' ? 'Verifying originality & compiling results' :
                   processingSteps.verification.status === 'complete' ? 'Originality verification complete' :
                   processingSteps.verification.status === 'failed' ? 'Verification failed' :
                   'Finalizing results...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show full-screen results when response exists */}
      {(response || currentConcepts.length > 0) && !isGenerating && (
        <div className="fixed inset-0 bg-slate-900 text-white z-50 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-8">
            {currentConcepts.length > 1 ? (
              // Multi-concept display using ConceptCard
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-white mb-2">
                    {currentConcepts.length} Concepts Generated
                  </h1>
                  <BodyText className="text-slate-400">
                    Each concept explores a different rhetorical approach
                  </BodyText>
                </div>
                
                <div className="grid gap-6">
                  {currentConcepts.map((concept, index) => (
                    <div key={concept.conceptId || concept.id} className="bg-white">
                      <ConceptCard
                        concept={concept}
                        onRate={async (conceptId, rating) => {
                          try {
                            // Store rating in the current project
                            await fetch('/api/ratings', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                projectId: currentProject,
                                conceptId,
                                rhetoricalDevice: concept.rhetoricalDevice || 'unknown',
                                tone: concept.tone,
                                rating
                              })
                            });
                            
                            console.log(`✅ Rating stored: ${conceptId} -> ${rating} (project: ${currentProject})`);
                            
                            toast({
                              title: rating === 'more_like_this' ? "Feedback saved!" : "Feedback noted",
                              description: "Future concepts will reflect your preferences",
                              duration: 2000,
                            });
                          } catch (error) {
                            console.error('Failed to store rating:', error);
                            toast({
                              title: "Failed to save feedback",
                              description: "Please try again",
                              variant: "destructive",
                              duration: 2000,
                            });
                          }
                        }}
                        showRating={true}
                        index={index}
                      />
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-center space-x-4 mt-8 pt-8">
                  <Button
                    variant="ghost"
                    onClick={clearResponse}
                    className="bg-transparent border-0 text-white hover:bg-white hover:text-neutral-900 px-4 py-3"
                  >
                    <X className="w-4 h-4 mr-2" />
                    New Brief
                  </Button>
                </div>
              </div>
            ) : (
              // Single concept display (legacy format)
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Concept Generated
                  </h1>
                  <BodyText className="text-slate-400">
                    Single concept display
                  </BodyText>
                </div>
                {response?.content && (
                  <div className="bg-white p-12 space-y-8 ">
                    {(() => {
                      const sections = response.content.split(/(\*\*[^*]+\*\*)/);
                      const elements = [];
                      
                      for (let i = 0; i < sections.length; i++) {
                        const section = sections[i];
                        
                        if (section.match(/^\*\*[^*]+\*\*$/)) {
                          // This is a header
                          const headerText = section.replace(/\*\*/g, '');
                          const isHeadline = headerText.toUpperCase().includes('HEADLINE');
                          const isTagline = headerText.toUpperCase().includes('TAGLINE');
                          const isBody = headerText.toUpperCase().includes('BODY');
                          const isVisual = headerText.toUpperCase().includes('VISUAL');
                          
                          elements.push(
                            <div key={i} className={`space-y-3 ${i > 0 ? 'mt-8' : ''}`}>
                              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-2">
                                {headerText}
                              </h3>
                              {/* Process next section as content for this header */}
                              {i + 1 < sections.length && (
                                <div className={`${
                                  isHeadline ? 'text-3xl md:text-4xl font-bold leading-tight text-white' :
                                  isTagline ? 'text-xl font-medium text-gray-700' :
                                  isBody ? 'text-base leading-relaxed text-gray-800' :
                                  isVisual ? 'text-sm text-gray-600 italic' :
                                  'text-base text-gray-800'
                                }`}>
                                  {sections[i + 1].trim()}
                                </div>
                              )}
                            </div>
                          );
                          i++; // Skip next section since we processed it
                        } else if (section.trim() && !sections[i - 1]?.match(/^\*\*[^*]+\*\*$/)) {
                          // Regular content not preceded by a header
                          elements.push(
                            <div key={i} className="text-base leading-relaxed text-gray-800">
                              {section.trim()}
                            </div>
                          );
                        }
                      }
                      
                      return elements;
                    })()}
                  </div>
                )}

                <div className="flex items-center justify-center space-x-4 mt-16 pt-12 ">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (response?.content) {
                        navigator.clipboard.writeText(response.content);
                        toast({
                          title: "Copied to clipboard",
                          description: "Concept copied successfully",
                          className: "fixed bottom-4 right-4 w-80 bg-green-50 border-green-200 text-green-800",
                          duration: 2000,
                        });
                      }
                    }}
                    className="bg-transparent border-0 text-white hover:bg-white hover:text-slate-900 px-4 py-3 rounded-none"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Response
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={clearResponse}
                    className="bg-transparent border-0 text-slate-300 hover:bg-slate-700 hover:text-white px-4 py-3 rounded-none"
                  >
                    <X className="w-4 h-4 mr-2" />
                    New Brief
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Form - Hidden when response is showing */}
      {!response && !currentConcepts.length && (
        <div 
          ref={briefReveal.ref as React.RefObject<HTMLDivElement>}
          className={`transition-all duration-500 ${
            contentFadingOut ? 'opacity-0' : 'opacity-100'
          } ${briefCollapsed ? 'transform scale-95' : ''} ${
            briefReveal.isVisible ? '' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            <div className="mb-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-4">CREATIVE BRIEF</h2>
                {!briefCollapsed && (
                  <BodyText className="text-gray-300 mt-2 font-sans">
                    What's your challenge? Enter your objectives, audience, and ambition below, select a hammer and strike the forge to generate campaign ideas, headlines, and messaging.
                  </BodyText>
                )}
              </div>
              
              {/* Creative Lens Menu */}
              <div 
                ref={toolsReveal.ref as React.RefObject<HTMLDivElement>}
                className={`relative z-50 transition-all duration-500 mt-6 ${
                  toolsReveal.isVisible ? '' : 'opacity-0 translate-y-4'
                }`}
              >
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full px-4 py-3 border border-gray-600 focus:border-gray-500 focus:outline-none text-sm font-sans bg-gray-800 text-white text-left flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3" style={{ 
                        backgroundColor: form.watch("tone") === "creative" ? "#FF6B47" : 
                                       form.watch("tone") === "analytical" ? "#4285F4" : 
                                       form.watch("tone") === "conversational" ? "#FFD23F" : 
                                       form.watch("tone") === "technical" ? "#1A1A1A" : 
                                       form.watch("tone") === "summarize" ? "#888888" : "#FF6B47"
                      }}></div>
                      <span>
                        {form.watch("tone") === "creative" ? "Bold Concepting" :
                         form.watch("tone") === "analytical" ? "Strategic Persuasion" :
                         form.watch("tone") === "conversational" ? "Conversational Hook" :
                         form.watch("tone") === "technical" ? "Simplified Systems" :
                         form.watch("tone") === "summarize" ? "Core Idea Finder" : "Select a Hammer"}
                      </span>
                    </div>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="p-0 rounded-none z-50 bg-gray-800 border border-gray-600 shadow-lg" style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}>
                  {[
                    { value: "creative", label: "Bold Concepting", color: "#FF6B47", description: "Big ideas. Loud and clear." },
                    { value: "analytical", label: "Strategic Persuasion", color: "#4285F4", description: "Logic-driven impact." },
                    { value: "conversational", label: "Conversational Hook", color: "#FFD23F", description: "Sticky, shareable, social." },
                    { value: "technical", label: "Simplified Systems", color: "#1A1A1A", description: "Human over jargon." },
                    { value: "summarize", label: "Core Idea Finder", color: "#888888", description: "Get to the essence fast." }
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => form.setValue("tone", option.value as any)}
                      className="flex items-start space-x-3 cursor-pointer px-4 py-3 rounded-none hover:bg-gray-700 focus:bg-gray-700 text-white"
                    >
                      <div className="w-3 h-3 mt-1" style={{ backgroundColor: option.color }}></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-sans whitespace-nowrap font-medium">{option.label}</span>
                        <span className="text-xs text-gray-300 leading-tight">{option.description}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Multi-Ideation Control */}
              <div className="mt-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full px-4 py-3 border border-gray-600 focus:border-gray-500 focus:outline-none text-sm font-sans bg-gray-800 text-white text-left flex items-center justify-between">
                      <span>
                        {form.watch("conceptCount") === 1 ? "1 (Single Concept)" :
                         form.watch("conceptCount") === 5 ? "5 (Batch Mode)" :
                         form.watch("conceptCount") === 10 ? "10 (Batch Mode)" :
                         form.watch("conceptCount") === 20 ? "20 (Batch Mode)" : "Select Count"}
                      </span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="p-0 rounded-none z-50 bg-gray-800 border border-gray-600 shadow-lg" style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}>
                    {[
                      { value: 1, label: "1 (Single Concept)" },
                      { value: 5, label: "5 (Batch Mode)" },
                      { value: 10, label: "10 (Batch Mode)" },
                      { value: 20, label: "20 (Batch Mode)" }
                    ].map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => form.setValue("conceptCount", option.value)}
                        className="cursor-pointer px-4 py-3 rounded-none hover:bg-gray-700 focus:bg-gray-700 text-white"
                      >
                        <span className="text-sm font-sans whitespace-nowrap">{option.label}</span>
                      </DropdownMenuItem>
                    ))}
                    
                    {/* Separator */}
                    <div className="border-t border-gray-200"></div>
                    
                    {/* Multi-Variant Generator Link */}
                    <Link href="/multivariant">
                      <DropdownMenuItem className="cursor-pointer px-4 py-3 rounded-none hover:bg-gray-700 focus:bg-gray-700 text-white">
                        <div className="flex items-center space-x-2">
                          <Grid3X3 className="w-4 h-4" />
                          <div>
                            <div className="text-sm font-sans whitespace-nowrap">Multi-Variant Generator</div>
                            <div className="text-xs text-gray-300">Different creative directions</div>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {form.watch("conceptCount") > 1 && (
                <div className="text-xs text-gray-500 bg-gray-50 p-3 border-l-4 border-gray-300 mt-6">
                  <strong>Batch Mode:</strong> Multiple ways to execute the same creative direction using different rhetorical techniques (metaphor, paradox, alliteration, etc.).
                </div>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="mt-6">
                {/* Simplified Creative Brief Input */}
                <FormField
                  control={form.control}
                  name="query"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <textarea
                            id="ai-generator-query"
                            name="query"
                            placeholder="Type in the ask. Who's it for? What do they need to know? Why does it matter?"
                            className={`w-full px-4 py-3 border border-gray-600 focus:border-gray-500 focus:outline-none resize-none transition-colors duration-200 text-white placeholder-gray-400 bg-gray-800 leading-relaxed rounded-none ${
                              briefCollapsed ? 'min-h-[60px] text-sm' : 'min-h-[120px] text-sm'
                            }`}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            maxLength={500}
                            aria-label="Creative brief"
                          />
                          <div className={`absolute text-xs font-mono rounded border border-gray-300 ${(field.value?.length || 0) > 400 ? 'bg-red-100 text-red-600' : 'bg-white text-gray-600'}`} style={{ right: '20px', bottom: '20px', padding: '4px 8px', width: '72px' }}>
                            {(field.value?.length || 0)}/500
                          </div>
                        </div>
                      </FormControl>
                      
                      {/* Add refinement panel outside FormControl */}
                      <PromptRefinementPanel 
                        query={form.watch("query") || ''} 
                        onSelect={(text) => {
                          form.setValue("query", text);
                          field.onChange(text);
                        }} 
                      />
                      
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Include Clichés Toggle */}
                <FormField
                  control={form.control}
                  name="includeCliches"
                  render={({ field }) => (
                    <FormItem className="w-full rounded-none border border-gray-300 px-2 py-1 bg-white mt-6">
                      <div className="flex flex-row items-center justify-between">
                        <div className="flex-1">
                          <label htmlFor="include-cliches-toggle" className="text-sm font-sans font-medium cursor-pointer">Include clichés?</label>
                          <FormDescription className="text-sm text-gray-600 font-sans block">
                            Enable familiar tropes and expected imagery in concepts
                          </FormDescription>
                        </div>
                        <FormControl>
                          <div style={{ paddingRight: '12px' }}>
                            <button
                              id="include-cliches-toggle"
                              type="button"
                              role="switch"
                              aria-checked={field.value}
                              onClick={() => field.onChange(!field.value)}
                              className={`text-xs font-mono rounded-none border border-gray-300 transition-colors ${
                                field.value ? 'bg-black text-white' : 'bg-gray-50 text-gray-500'
                              }`}
                              style={{ padding: '4px 8px', width: '72px' }}
                            >
                              {field.value ? 'YES' : 'NO'}
                            </button>
                          </div>
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="deepScan"
                  render={({ field }) => (
                    <FormItem className="w-full rounded-none border border-gray-300 px-2 py-1 bg-white mt-6">
                      <div className="flex flex-row items-center justify-between">
                        <div className="flex-1">
                          <label htmlFor="deep-scan-toggle" className="text-sm font-sans font-medium cursor-pointer">Deep Scan Originality Check</label>
                          <FormDescription className="text-sm text-gray-600 font-sans block">
                            Include image analysis for visual similarities
                            <span className="block text-xs text-gray-400 mt-1">May take 10-15 seconds longer to complete</span>
                          </FormDescription>
                        </div>
                        <FormControl>
                          <div style={{ paddingRight: '12px' }}>
                            <button
                              id="deep-scan-toggle"
                              type="button"
                              role="switch"
                              aria-checked={field.value}
                              onClick={() => field.onChange(!field.value)}
                              className={`text-xs font-mono rounded-none border border-gray-300 transition-colors ${
                                field.value ? 'bg-black text-white' : 'bg-gray-50 text-gray-500'
                              }`}
                              style={{ padding: '4px 8px', width: '72px' }}
                            >
                              {field.value ? 'YES' : 'NO'}
                            </button>
                          </div>
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 px-8 text-lg rounded-none font-sans tracking-wide uppercase mt-6"
                >
                  {isGenerating ? "Forging..." : "Forge"}
                </Button>
              </form>
            </Form>



          </div>
        </div>
      )}

      {/* Example Prompts - Only show when no response */}
      {!response && !briefCollapsed && (
        <div className="tone-cards-container">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exampleQueries.map((example, index) => (
                <button
                  key={`example-${example.tone}-${index}`}
                  type="button"
                  onClick={() => form.setValue("tone", example.tone)}
                  className="p-6 bg-white border border-gray-100 hover:border-gray-300 text-left transition-all duration-200 shadow-lg hover:shadow-xl group rounded-none"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div 
                      className="w-3 h-3 flex-shrink-0" 
                      style={{ 
                        backgroundColor: example.tone === "creative" ? "#FF6B47" : 
                                       example.tone === "analytical" ? "#4285F4" : 
                                       example.tone === "conversational" ? "#FF9500" : 
                                       example.tone === "technical" ? "#1A1A1A" : "#888888",
                        minWidth: "12px",
                        minHeight: "12px"
                      }}
                    ></div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide font-mono">
                      {example.tone === "creative" ? "Bold Concepting" :
                       example.tone === "analytical" ? "Strategic Persuasion" :
                       example.tone === "conversational" ? "Conversational Hook" :
                       example.tone === "technical" ? "Simplified Systems" : "Core Idea Finder"}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed font-sans">
                    {example.tone === "creative" ? "Big ideas. Loud and clear." :
                     example.tone === "analytical" ? "Logic-driven impact." :
                     example.tone === "conversational" ? "Sticky, shareable, social." :
                     example.tone === "technical" ? "Human over jargon." :
                     example.tone === "summarize" ? "Get to the essence fast." : ""}
                  </p>
                </button>
              ))}
            </div>
        </div>
      )}

      {/* Session History */}
      <SessionHistory
        currentResponse={response ? {
          id: `${response.id || Date.now()}`,
          prompt: form.watch("query") || "",
          content: response.content || "",
          visualPrompt: response.visualPrompt,
          tone: response.tone || "",
          timestamp: response.timestamp || new Date().toISOString(),
          tokens: response.tokens,
          processingTime: response.processingTime,
        } : null}
      />



      {/* Loading Window - Debug State */}
      <LoadingWindow
        isLoading={isLoadingWindowOpen}
        onClose={() => setIsLoadingWindowOpen(false)}
      />

      {/* Results Display Component */}
      {currentConcepts && currentConcepts.length > 0 && (
        <div className="mt-6 max-w-6xl mx-auto px-4">
          <ResultsDisplay 
            results={currentConcepts.map(concept => ({
              headline: concept.content?.split('\n')[0]?.replace(/^#+\s*/, '') || 'Untitled Concept',
              devices: 'Various rhetorical devices',
              rationale: concept.content || 'No content available',
              content: concept.content,
              visualPrompt: concept.visualPrompt,
              id: concept.id?.toString()
            }))} 
            onFeedback={handleFeedback}
          />
        </div>
      )}
      </div>
    </SharedLayout>
  );
});

AiGenerator.displayName = "AiGenerator";

export default AiGenerator;