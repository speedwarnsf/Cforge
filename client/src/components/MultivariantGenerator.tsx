import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lightbulb, ChevronDown, Copy, X, Star, Download, LayoutGrid } from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { H2, BodyText, Caption } from "./Typography";
import ArbiterScoreViz from "./ArbiterScoreViz";
import { saveConceptsToHistory, toggleFavorite as toggleLocalFavorite, StoredConcept } from "@/lib/conceptStorage";
import { exportConceptsAsPDF, exportConceptsAsPresentation } from "@/lib/conceptExport";
import SessionHistory from "./session-history";
import LoadingWindow from "./LoadingWindow";
import ResultsDisplay from './ResultsDisplay';
import { useScrollReveal } from "../hooks/use-scroll-reveal";
import { z } from "zod";
import SharedLayout from "./SharedLayout";
import { BrandLogo } from "./brand-logo";

// Prompt Refinement Panel Component - Always visible when query exists
const PromptRefinementPanel = ({ query, onSelect }: { query: string, onSelect: (text: string) => void }) => {
  const [refinements, setRefinements] = useState<Array<{text: string, rationale: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Load preferred refinement from session storage on mount
  React.useEffect(() => {
    const initial = sessionStorage.getItem('preferredRefinement');
    if (initial && query !== initial) {
      // Auto-populate if we have a stored preference different from current query
      console.log('Found stored refinement preference:', initial);
    }
  }, []);

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

  // Rating function for refinement feedback
  const logRating = (index: number, value: string) => {
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'rate_refine',
        id: index,
        score: parseInt(value),
        refinement_text: refinements[index]?.text || '',
        timestamp: Date.now()
      })
    }).catch(err => console.error('Rating feedback error:', err));
  };

  if (!query || query.trim().length === 0) return null;

  return (
    <div className="mt-3 p-2 border border-gray-600 bg-gray-800/50">
      <div className="flex gap-2 mb-2">
        <button 
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Hide prompt refinements' : 'Show prompt refinements'}
          className="flex-1 p-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-sm text-gray-200 transition-colors"
        >
          {expanded ? 'Hide Refinements' : 'Refine Prompt (3 Options)'}
        </button>
        
        {/* Quick Refine Button */}
        <button 
          onClick={() => {
            if (refinements.length > 0) {
              const randomRef = refinements[Math.floor(Math.random() * refinements.length)];
              // Save to session storage and feedback
              sessionStorage.setItem('preferredRefinement', randomRef.text);
              fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  type: 'refine_select', 
                  selected: randomRef.text, 
                  original: query,
                  method: 'quick_random'
                })
              }).catch(err => console.error('Feedback error:', err));
              onSelect(randomRef.text);
              setExpanded(false);
            } else {
              fetch('/api/refine-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
              })
              .then(res => res.json())
              .then(data => {
                const randomRef = data.rewrites[Math.floor(Math.random() * data.rewrites.length)];
                sessionStorage.setItem('preferredRefinement', randomRef.text);
                fetch('/api/feedback', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    type: 'refine_select', 
                    selected: randomRef.text, 
                    original: query,
                    method: 'quick_fetch_random'
                  })
                }).catch(err => console.error('Feedback error:', err));
                onSelect(randomRef.text);
              })
              .catch(err => console.error('Quick refine error:', err));
            }
          }}
          aria-label="Apply random refinement quickly"
          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs border border-green-500 transition-colors"
          style={{ touchAction: 'manipulation' }}
        >
          ⚡ Quick
        </button>
      </div>
      
      {expanded && (
        <div className="mt-3">
          {/* Suggest Keywords Button */}
          <button 
            onClick={() => {
              const suggested = query.match(/\b(self-love|bold|edgy|visual|stigma|treatment|empowerment|confidence|authentic|urban|street|rebellion|unapologetic|fierce|raw|vulnerable|strength|resilience)\b/gi) || [];
              alert(`Suggested Keywords for Theory Detection: ${suggested.join(', ') || 'None detected - try adding: empowerment, authenticity, or rebellion'}`);
            }}
            className="w-full mb-3 p-2 bg-blue-600 hover:bg-blue-700 text-white text-sm border border-blue-500 transition-colors"
          >
            💡 Suggest Keywords for Better Theory Detection
          </button>

          {loading ? (
            <p className="text-center text-gray-300 py-4">Generating refinements...</p>
          ) : (
            <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-3 md:gap-2">
              {refinements.map((ref, i) => (
                <div 
                  key={i}
                  role="button"
                  aria-label={`Select refinement: ${ref.text}`}
                  onClick={() => { 
                    // Save selection to session storage for cross-mode persistence
                    sessionStorage.setItem('preferredRefinement', ref.text);
                    // Send feedback for preference learning
                    fetch('/api/feedback', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        type: 'refine_select', 
                        selected: ref.text, 
                        original: query,
                        method: 'manual_select'
                      })
                    }).catch(err => console.error('Feedback error:', err));
                    onSelect(ref.text); 
                    setExpanded(false); 
                  }}
                  className="cursor-pointer p-3 border border-gray-600 hover:border-blue-500 hover:bg-gray-700 transition-colors bg-gray-800"
                  style={{ touchAction: 'manipulation', padding: '12px' }}
                >
                  <p className="text-sm mb-2 text-white">{ref.text}</p>
                  <small className="text-xs text-gray-300">{ref.rationale}</small>
                  
                  {/* Rating Slider for Refinement Feedback */}
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <label className="text-xs text-gray-400 block mb-1">
                      Rate Quality (1-5):
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        defaultValue="3"
                        className="w-full mt-1 accent-blue-500"
                        onChange={(e) => {
                          e.stopPropagation(); // Prevent card click
                          logRating(i, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent card click
                      />
                    </label>
                  </div>
                </div>
              ))}
              
              <div className="md:col-span-3 mt-3 flex flex-col space-y-2">
                <button 
                  onClick={() => { 
                    sessionStorage.setItem('preferredRefinement', query);
                    onSelect(query); 
                    setExpanded(false); 
                  }}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-sm transition-colors text-white"
                >
                  Use Original
                </button>
                <input 
                  type="text" 
                  placeholder="Custom edit..." 
                  aria-label="Custom prompt edit"
                  className="w-full p-2 border border-gray-600 bg-gray-800 text-white placeholder-gray-400 text-sm"
                  style={{ touchAction: 'manipulation' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      sessionStorage.setItem('preferredRefinement', e.currentTarget.value);
                      // Send feedback for custom edits
                      fetch('/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          type: 'refine_select', 
                          selected: e.currentTarget.value, 
                          original: query,
                          method: 'custom_edit'
                        })
                      }).catch(err => console.error('Feedback error:', err));
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

// Enhanced Progress Indicator Component
const ProgressIndicator = ({ step, onStepChange, isActive }: { 
  step: number, 
  onStepChange: (stepUpdate: number | ((prev: number) => number)) => void,
  isActive: boolean 
}) => {
  const steps = [
    'Warming Theory Cache',
    'Detecting Keywords', 
    'Querying Corpus Database',
    'Generating AI Concepts',
    'Evaluating Quality Arbiters',
    'Finalizing Results'
  ];

  React.useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      onStepChange((prev) => (prev + 1) % steps.length);
    }, 8000); // 8 second intervals for 48s total cycle
    
    return () => clearInterval(interval);
  }, [isActive, onStepChange]);

  if (!isActive) return null;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-3">Forging Creative Concepts...</h3>
        <p className="text-slate-300 text-base leading-relaxed mb-4">
          Processing: {steps[step]}...
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-700 rounded-full h-2 mb-6">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000 ease-in-out"
          style={{ width: `${(step / steps.length) * 100}%` }}
        />
      </div>

      {/* Step List */}
      <div className="space-y-3">
        {steps.map((stepName, index) => (
          <div key={index} className="flex items-center justify-center space-x-3">
            <div 
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === step 
                  ? 'bg-blue-400 animate-pulse scale-125' 
                  : index < step 
                    ? 'bg-green-400' 
                    : 'bg-slate-600'
              }`}
            />
            <span className={`text-sm ${
              index === step ? 'text-white font-medium' : 
              index < step ? 'text-green-300' : 'text-slate-400'
            }`}>
              {stepName}
            </span>
          </div>
        ))}
      </div>

      {/* System Status */}
      <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <p className="text-slate-400 text-sm">
          <strong className="text-white">System Status:</strong> Running 5-arbiter quality evaluation with theoretical framework integration
        </p>
        <p className="text-slate-500 text-xs mt-1">
          Advanced optimization suite active: cache pre-warming, token efficiency, parallel processing
        </p>
      </div>
    </div>
  );
};

interface MultivariantOutput {
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  originalityScore: number;
  id: string;
  tagline?: string;
  bodyCopy?: string;
  fullMarkdown?: string;
  professionalismScore?: number;
  clarityScore?: number;
  freshnessScore?: number;
  resonanceScore?: number;
  awardsScore?: number;
  finalStatus?: string;
  passesAllThresholds?: boolean;
  example?: {
    campaign_name: string;
    brand: string;
    year: string;
    headline: string;
    verbal_device: string;
    visual_device: string;
    tone: string;
  } | null;
}

interface MultivariantRequest {
  query: string;
  tone: string;
  maxOutputs: number;
  avoidCliches: boolean;
}

// Form schema
const multivariantFormSchema = z.object({
  query: z.string().min(1, "Query is required"),
  tone: z.string().min(1, "Tone is required"),
  maxOutputs: z.number().min(1).max(8),
  avoidCliches: z.boolean(),
  deepScan: z.boolean()
});

type MultivariantForm = z.infer<typeof multivariantFormSchema>;

interface MultivariantGeneratorProps {
  onSubmit?: () => Promise<void>;
}

export default function MultivariantGenerator({ onSubmit }: MultivariantGeneratorProps) {
  const [results, setResults] = useState<MultivariantOutput[]>([]);
  const [briefCollapsed, setBriefCollapsed] = useState(false);
  const [contentFadingOut, setContentFadingOut] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [selectedPrompt, setSelectedPrompt] = useState('');

  // **Step 3: handleFeedback Function**
  async function handleFeedback(conceptId: string, feedbackType: "more_like_this" | "less_like_this") {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId, feedbackType })
      });

      const variantResponse = await fetch("/api/generate-variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId, feedbackType })
      });

      if (variantResponse.ok) {
        const variantData = await variantResponse.json();
        toast({
          title: feedbackType === "more_like_this" ? "Similar variant generated!" : "Different variant generated!",
          description: "Check your session history for the new concept",
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: "Feedback failed",
        description: "Please try again",
        variant: "destructive",
        duration: 2000,
      });
    }
  }
  const { toast } = useToast();
  
  // Scroll reveal hooks
  const briefReveal = useScrollReveal({ threshold: 0.2 });
  const toolsReveal = useScrollReveal({ threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  const form = useForm<MultivariantForm>({
    resolver: zodResolver(multivariantFormSchema),
    defaultValues: {
      query: "",
      tone: "creative",
      maxOutputs: 3,
      avoidCliches: true,
      deepScan: false
    }
  });

  const [isLoadingWindowOpen, setIsLoadingWindowOpen] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async (data: MultivariantRequest) => {
      setIsLoadingWindowOpen(true);
      const response = await fetch('/api/generate-multivariant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate variants');
      }
      
      const json = await response.json();
      // Handle both hybrid {success, outputs} and legacy array format
      return (json.outputs || json) as MultivariantOutput[];
    },
    onSuccess: (data) => {
      setIsLoadingWindowOpen(false);
      setResults(data);
      setBriefCollapsed(true);
      setContentFadingOut(false);
      
      // Save to localStorage history
      const stored: StoredConcept[] = data.map(r => ({
        id: r.id,
        timestamp: new Date().toISOString(),
        prompt: form.getValues('query'),
        tone: form.getValues('tone'),
        headlines: r.headlines,
        tagline: r.tagline,
        bodyCopy: r.bodyCopy,
        visualDescription: r.visualDescription,
        rhetoricalDevice: r.rhetoricalDevice,
        originalityScore: r.originalityScore,
        fullMarkdown: r.fullMarkdown,
        professionalismScore: r.professionalismScore,
        clarityScore: r.clarityScore,
        freshnessScore: r.freshnessScore,
        resonanceScore: r.resonanceScore,
        awardsScore: r.awardsScore,
        finalStatus: r.finalStatus,
        isFavorite: false,
      }));
      saveConceptsToHistory(stored);
      
      toast({
        title: "Variants Generated",
        description: `Generated ${data.length} creative variants`,
        duration: 3000,
      });
    },
    onError: (error) => {
      setIsLoadingWindowOpen(false);
      setContentFadingOut(false);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
        duration: 3000,
      });
    }
  });

  const handleFormSubmit = async (data: MultivariantForm) => {
    setContentFadingOut(true);
    if (onSubmit) {
      await onSubmit();
    }
    // Use selected prompt or original query
    const finalData = {
      ...data,
      query: selectedPrompt || data.query
    };
    generateMutation.mutate(finalData);
  };

  const clearResponse = () => {
    setResults([]);
    setBriefCollapsed(false);
    setContentFadingOut(false);
  };

  return (
    <SharedLayout>
      <div className="relative">
      {/* Enhanced Loading Animation */}
      {generateMutation.isPending && (
        <div className="fixed inset-0 bg-slate-900/95 text-white z-50 flex items-center justify-center">
          <div className="text-center max-w-2xl px-4 sm:px-8">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {/* Animated brand logo */}
              <BrandLogo size="lg" animate={true} className="mb-8" />
              
              <div className="text-center mb-8">
                <div className="text-3xl font-black text-white tracking-wide mb-2">CONCEPT FORGE</div>
                <div className="text-sm text-slate-400 font-mono tracking-widest">MULTI-VARIANT GENERATOR</div>
              </div>
              
              {/* Progress indicators */}
              <div className="space-y-6 w-full">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-3">Forging Creative Concepts...</h3>
                  <p className="text-slate-300 text-base leading-relaxed">
                    Running sophisticated AI evaluation system with 5-arbiter quality assessment
                  </p>
                </div>

                {/* Enhanced Progress Indicator */}
                <ProgressIndicator 
                  step={progressStep} 
                  onStepChange={setProgressStep}
                  isActive={generateMutation.isPending}
                />

                {/* Time estimate */}
                <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-slate-400 text-sm">
                    <strong className="text-white">Processing Time:</strong> ~20-30 seconds for quality evaluation
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    This ensures theoretically-grounded, original concepts with professional impact assessment
                  </p>
                </div>

                {/* Spinning progress indicator */}
                <div className="flex justify-center mt-6">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold uppercase tracking-wider text-white mb-4">CREATIVE BRIEF</h2>
            {!briefCollapsed && (
              <BodyText className="text-gray-300 mt-2 font-sans">
                Generate multiple fundamentally different creative directions. Each variant explores a unique conceptual approach to your challenge.
              </BodyText>
            )}
          </div>
        </div>

        {/* Controls Section */}
        <div className={`space-y-6 transition-all duration-700 ${
          toolsReveal.isVisible ? '' : 'opacity-0 translate-y-4'
        }`}>
          {/* Concept Lens Dropdown */}
          <div className="mt-6" ref={toolsReveal.ref as any}>
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
                    onClick={() => form.setValue("tone", option.value)}
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

          {/* Variant Count Dropdown */}
          <div className="mt-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full px-4 py-3 border border-gray-600 focus:border-gray-500 focus:outline-none text-sm font-sans bg-gray-800 text-white text-left flex items-center justify-between">
                  <span>{form.watch("maxOutputs")} Variants (Multi-Variant)</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="p-0 rounded-none z-50 bg-gray-800 border border-gray-600 shadow-lg" style={{ width: 'var(--radix-dropdown-menu-trigger-width)' }}>
                {[
                  { value: 1, label: "1 Variant" },
                  { value: 3, label: "3 Variants" },
                  { value: 5, label: "5 Variants" },
                  { value: 8, label: "8 Variants" }
                ].map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => form.setValue("maxOutputs", option.value)}
                    className="cursor-pointer px-4 py-3 rounded-none hover:bg-gray-700 focus:bg-gray-700 text-white"
                  >
                    <span className="text-sm font-sans whitespace-nowrap">{option.label}</span>
                  </DropdownMenuItem>
                ))}
                
                {/* Separator */}
                <div className="border-t border-gray-600"></div>
                
                {/* Single Concept Generator Link */}
                <Link href="/">
                  <DropdownMenuItem className="cursor-pointer px-4 py-3 rounded-none hover:bg-gray-700 focus:bg-gray-700 text-white">
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="w-4 h-4" />
                      <div>
                        <div className="text-sm font-sans whitespace-nowrap">Single Concept Generator</div>
                        <div className="text-xs text-gray-300">Same idea, different execution</div>
                      </div>
                    </div>
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Multi-Variant Mode Info */}
          <div className="bg-gray-800 border border-gray-600 p-4 rounded-none mt-6">
            <div className="text-sm">
              <span className="font-medium text-white">Multi-Variant Mode:</span>
              <span className="text-gray-300 ml-1">Generates fundamentally different creative directions using diverse rhetorical strategies and originality checking.</span>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="mt-8">
            {/* Text Input */}
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <textarea
                        placeholder="Type in the ask. Who's it for? What do they need to know? Why does it matter?"
                        className="multivariant-textarea w-full h-32 px-4 py-3 border border-gray-600 focus:border-gray-500 focus:outline-none resize-none text-sm font-sans text-white bg-gray-800 placeholder-gray-400"
                        style={{ 
                          color: '#ffffff !important',
                          backgroundColor: '#1f2937 !important',
                          WebkitTextFillColor: '#ffffff !important'
                        }}
                        disabled={generateMutation.isPending}
                        maxLength={500}
                        {...field}
                      />
                      <div className="absolute bottom-3 right-3 text-xs text-gray-400 font-mono bg-gray-700 px-2 py-1 rounded">
                        {field.value?.length || 0}/500
                      </div>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Prompt Refinement Panel - Outside FormField for better visibility */}
            <PromptRefinementPanel 
              query={form.watch("query") || ''} 
              onSelect={(text) => {
                setSelectedPrompt(text);
                form.setValue("query", text);
              }} 
            />

            {/* Extra spacing after refinement panel */}
            <div className="mt-4"></div>



            {/* Cliché Toggle */}
            <FormField
              control={form.control}
              name="avoidCliches"
              render={({ field }) => (
                <FormItem className="w-full rounded-none border border-gray-600 px-2 py-1 bg-gray-800 mt-6">
                  <div className="flex flex-row items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-sans font-medium text-white">Include clichés?</label>
                      <div className="text-sm text-gray-400 font-sans">
                        Enable familiar tropes and expected imagery in concepts
                      </div>
                    </div>
                    <FormControl>
                      <div style={{ paddingRight: '12px' }}>
                        <button
                          type="button"
                          onClick={() => field.onChange(!field.value)}
                          className={`text-xs font-mono rounded-none border border-gray-300 transition-colors ${
                            !field.value ? 'bg-black text-white' : 'bg-gray-50 text-gray-500'
                          }`}
                          style={{ padding: '4px 8px', width: '72px' }}
                        >
                          {!field.value ? 'YES' : 'NO'}
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
                <FormItem className="w-full rounded-none border border-gray-600 px-2 py-1 bg-gray-800 mt-6">
                  <div className="flex flex-row items-center justify-between">
                    <div className="flex-1">
                      <label className="text-sm font-sans font-medium text-white">Deep Scan Originality Check</label>
                      <div className="text-sm text-gray-400 font-sans block">
                        Include image analysis for visual similarities
                        <span className="block text-xs text-gray-500 mt-1">May take 10-15 seconds longer to complete</span>
                      </div>
                    </div>
                    <FormControl>
                      <div style={{ paddingRight: '12px' }}>
                        <button
                          type="button"
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
            <button
              type="submit"
              disabled={generateMutation.isPending || !form.watch("query")?.trim() || !form.watch("tone")}
              className="w-full bg-black hover:bg-gray-800 text-white font-bold py-2 px-8 text-lg rounded-none font-sans tracking-wide uppercase mt-6"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  FORGING
                </>
              ) : (
                'FORGE'
              )}
            </button>
            
            {results.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={clearResponse}
                className="bg-transparent border-gray-300 text-neutral-900 hover:bg-gray-50 px-4 py-4 mt-4"
              >
                Clear
              </Button>
            )}
          </form>
        </Form>
      </div>

      {/* Example Prompts - Only show when no results */}
      {!results.length && !briefCollapsed && (
        <div className="tone-cards-container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { tone: "creative", query: "Launch campaign for sustainable sneakers made from ocean plastic" },
            { tone: "analytical", query: "B2B software that reduces energy costs by 40%" },
            { tone: "conversational", query: "New coffee subscription service for busy professionals" },
            { tone: "technical", query: "AI-powered project management tool for remote teams" },
            { tone: "summarize", query: "Premium meal kit service with locally-sourced ingredients" }
          ].map((example, index) => (
            <button
              key={`example-${example.tone}-${index}`}
              type="button"
              onClick={() => form.setValue("tone", example.tone)}
              className="p-6 bg-gray-800 border border-gray-700 hover:border-gray-500 text-left transition-all duration-200 shadow-lg hover:shadow-xl group rounded-none"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-3 h-3" style={{ 
                  backgroundColor: example.tone === "creative" ? "#FF6B47" : 
                                 example.tone === "analytical" ? "#4285F4" : 
                                 example.tone === "conversational" ? "#FFD23F" : 
                                 example.tone === "technical" ? "#1A1A1A" : "#888888" 
                }}></div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide font-mono">
                  {example.tone === "creative" ? "Bold Concepting" :
                   example.tone === "analytical" ? "Strategic Persuasion" :
                   example.tone === "conversational" ? "Conversational Hook" :
                   example.tone === "technical" ? "Simplified Systems" : "Core Idea Finder"}
                </span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed font-sans">
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
        currentResponse={results.length > 0 ? {
          id: `mvg-${Date.now()}`,
          prompt: form.watch("query") || "",
          content: results.map(r => r.headlines.join(', ')).join('\n\n'),
          visualPrompt: results.map(r => r.visualDescription).join('\n\n'),
          tone: form.watch("tone") || "",
          timestamp: new Date().toISOString(),
          tokens: undefined,
          processingTime: undefined,
        } : null}
      />

      {/* Results - Unified with single concept format */}
      {results.length > 0 && (
        <div className="fixed inset-0 bg-slate-900 text-white z-50 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 sm:p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">
                {results.length} Variants Generated
              </h1>
              <BodyText className="text-slate-400">
                Creative directions ranked by originality and diversity
              </BodyText>
            </div>
            
            <div className="space-y-8">
              {results.map((result, index) => (
                <div key={result.id} className="space-y-6">
                      <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-4">
                          Variant {index + 1}
                        </h3>
                        
                        {/* Headlines */}
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">Headlines</h4>
                          {result.headlines.map((headline, hIndex) => (
                            <p key={hIndex} className="text-lg font-semibold text-white mb-1">
                              {headline}
                            </p>
                          ))}
                        </div>
                        
                        {/* Visual Description */}
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">Visual Concept</h4>
                          <p className="text-gray-200 leading-relaxed">
                            {result.visualDescription}
                          </p>
                        </div>
                        
                        {/* Rhetorical Device */}
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2">Rhetorical Device</h4>
                          <p className="text-gray-200">
                            {result.rhetoricalDevice}
                          </p>
                        </div>
                        
                        {/* Arbiter Score Visualization */}
                        <ArbiterScoreViz
                          originalityScore={Math.round(result.originalityScore)}
                          professionalismScore={result.professionalismScore}
                          clarityScore={result.clarityScore}
                          freshnessScore={result.freshnessScore}
                          resonanceScore={result.resonanceScore}
                          awardsScore={result.awardsScore}
                          finalStatus={result.finalStatus}
                        />
                      </div>
                      
                      {/* **Step 3: Rhetorical Example Metadata Display** */}
                      {result.example && (
                        <p className="mt-2 text-xs italic text-neutral-500">
                          Inspired by: {result.example.campaign_name} – {result.example.brand} ({result.example.year}) – "{result.example.headline}"
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-2 sm:gap-3 pt-4 border-t border-gray-600">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const text = result.headlines.join('\n') + '\n\nVisual: ' + result.visualDescription;
                            navigator.clipboard.writeText(text);
                            toast({ title: "Copied to clipboard", duration: 2000 });
                          }}
                          className="bg-transparent border-gray-500 text-gray-300 hover:bg-gray-800 text-xs"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1.5" />
                          Copy
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const nowFav = toggleLocalFavorite(result.id);
                            toast({ title: nowFav ? '⭐ Favorited' : 'Unfavorited', duration: 1500 });
                          }}
                          className="bg-transparent border-amber-600 text-amber-300 hover:bg-amber-900/30 text-xs"
                        >
                          <Star className="w-3.5 h-3.5 mr-1.5" />
                          Favorite
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback(result.id, "more_like_this")}
                          className="bg-transparent border-green-500 text-green-300 hover:bg-green-800 text-xs"
                        >
                          👍 More
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback(result.id, "less_like_this")}
                          className="bg-transparent border-red-500 text-red-300 hover:bg-red-800 text-xs"
                        >
                          👎 Less
                        </Button>
                      </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-8 pt-8">
                <Button
                  variant="ghost"
                  onClick={clearResponse}
                  className="bg-transparent border-0 text-white hover:bg-gray-800 hover:text-white px-4 py-3"
                >
                  <X className="w-4 h-4 mr-2" />
                  New Brief
                </Button>
                <Link href="/gallery">
                  <Button variant="outline" className="bg-transparent border-gray-500 text-gray-300 hover:bg-gray-800">
                    <LayoutGrid className="w-4 h-4 mr-2" />
                    Gallery
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => {
                    const stored: StoredConcept[] = results.map(r => ({
                      id: r.id, timestamp: new Date().toISOString(), prompt: form.getValues('query'),
                      tone: form.getValues('tone'), headlines: r.headlines, tagline: r.tagline,
                      bodyCopy: r.bodyCopy, visualDescription: r.visualDescription,
                      rhetoricalDevice: r.rhetoricalDevice, originalityScore: r.originalityScore,
                      professionalismScore: r.professionalismScore, clarityScore: r.clarityScore,
                      freshnessScore: r.freshnessScore, resonanceScore: r.resonanceScore,
                      awardsScore: r.awardsScore, finalStatus: r.finalStatus, isFavorite: false,
                    }));
                    exportConceptsAsPDF(stored);
                  }}
                  className="bg-transparent border-gray-500 text-gray-300 hover:bg-gray-800"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF Export
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const stored: StoredConcept[] = results.map(r => ({
                      id: r.id, timestamp: new Date().toISOString(), prompt: form.getValues('query'),
                      tone: form.getValues('tone'), headlines: r.headlines, tagline: r.tagline,
                      bodyCopy: r.bodyCopy, visualDescription: r.visualDescription,
                      rhetoricalDevice: r.rhetoricalDevice, originalityScore: r.originalityScore,
                      professionalismScore: r.professionalismScore, clarityScore: r.clarityScore,
                      freshnessScore: r.freshnessScore, resonanceScore: r.resonanceScore,
                      awardsScore: r.awardsScore, finalStatus: r.finalStatus, isFavorite: false,
                    }));
                    exportConceptsAsPresentation(stored);
                  }}
                  className="bg-transparent border-gray-500 text-gray-300 hover:bg-gray-800"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Deck Export
                </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Window */}
      <LoadingWindow 
        isLoading={isLoadingWindowOpen} 
        onClose={() => setIsLoadingWindowOpen(false)}
      />

      {/* Results Display Component */}
      {results && results.length > 0 && (
        <ResultsDisplay 
          results={results.map(result => ({
            headline: result.headlines?.[0] || 'Untitled Concept',
            devices: result.rhetoricalDevice || 'None',
            rationale: result.visualDescription || 'No rationale available',
            content: `Originality Score: ${result.originalityScore}`,
            visualPrompt: result.visualDescription,
            id: result.id
          }))} 
          onFeedback={(index: number, type: string) => {
            const result = results[index];
            if (result && type !== 'favorite') {
              handleFeedback(result.id, type as "more_like_this" | "less_like_this");
            } else if (type === 'favorite') {
              // Handle favorite action
              console.log('Favorited concept:', result?.id);
            }
          }}
        />
      )}
      </div>
    </SharedLayout>
  );
}