import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Grid3X3, Zap, Target, MessageCircle, Search, BookOpen, History, Eye, Shield, Brain, Database, Vault } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link, useLocation } from "wouter";
import SessionHistory from "./session-history";
import PromptRefinementPanel from "./PromptRefinementPanel";
import LoadingWindow from "./LoadingWindow";
import ResultsDisplay from "./ResultsDisplay";
import BriefHistory from "./BriefHistory";
import { useVideo } from "@/hooks/use-video";
import { apiClient, handleAPIError } from "@/lib/apiClient";
import { useViewport, useTouchFeedback } from "@/hooks/useMobileOptimizations";
import { toast } from "@/hooks/use-toast";
import { saveConceptsToHistory, resultToStoredConcept } from "@/lib/conceptStorage";



interface ConceptForgeIdeationSectionProps {
  onSubmit: () => Promise<void>;
  onGenerateComplete?: (result: any) => void;
}

export default function ConceptForgeIdeationSection({ onSubmit, onGenerateComplete }: ConceptForgeIdeationSectionProps) {
  const [location] = useLocation();
  const { startForgeLoop, stopForgeLoop, generationStatus, setGenerationStatus, addGenerationLog, clearGenerationLogs } = useVideo();
  const [brief, setBrief] = useState("");
  const [selectedLens, setSelectedLens] = useState("bold");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  
  // Persist mode in localStorage to prevent reset after generation
  const [mode, setMode] = useState<"single" | "multi">(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('conceptForge_mode');
      return (savedMode === 'multi' || savedMode === 'single') ? savedMode : 'single';
    }
    return 'single';
  });
  
  const [variantCount, setVariantCount] = useState(5);
  const [imageAnalysisEnabled, setImageAnalysisEnabled] = useState(false);
  const [allowCliches, setAllowCliches] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

  // Carousel data - focused on the rhetorical craft
  const carouselItems = [
    {
      icon: Target,
      title: "290+ rhetorical devices at your fingertips",
      subtitle: "From antithesis to zeugma. Classical rhetoric meets modern advertising.",
      gradient: "from-blue-500 to-blue-600",
      textGradient: "linear-gradient(to right, #60a5fa, #a78bfa)"
    },
    {
      icon: Search,
      title: "4-arbiter quality scoring",
      subtitle: "Originality, resonance, professionalism, and award potential. Every concept evaluated.",
      gradient: "from-purple-500 to-purple-600",
      textGradient: "linear-gradient(to right, #a78bfa, #f472b6)"
    },
    {
      icon: BookOpen,
      title: "245+ campaign corpus",
      subtitle: "Real-world examples from major brands. Data-driven creative intelligence.",
      gradient: "from-green-500 to-green-600",
      textGradient: "linear-gradient(to right, #4ade80, #60a5fa)"
    }
  ];

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prev) => (prev + 1) % carouselItems.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);



  const conceptLenses = [
    {
      id: "bold",
      name: "Bold Concepting",
      icon: Zap,
      description: "Big ideas. Loud and clear.",
      color: "from-orange-500 to-red-500"
    },
    {
      id: "strategic",
      name: "Strategic Persuasion",
      icon: Target,
      description: "Logic meets emotion. Precision targeting.",
      color: "from-blue-500 to-indigo-500"
    },
    {
      id: "conversational",
      name: "Conversational Hook",
      icon: MessageCircle,
      description: "Natural. Engaging. Human-centered.",
      color: "from-green-500 to-teal-500"
    },
    {
      id: "simplified",
      name: "Simplified Systems",
      icon: Eye,
      description: "Clarity through reduction. Essential focus.",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: "core",
      name: "Core Idea Finder",
      icon: BookOpen,
      description: "Distilled essence. Pure concept.",
      color: "from-yellow-500 to-orange-500"
    }
  ];

  const handleGenerate = async () => {
    console.log('Enhanced generation starting');
    setIsLoading(true);
    setResults([]);

    // Validate input
    if (!brief.trim()) {
      toast({
        variant: 'destructive',
        title: 'Brief Required',
        description: 'Please enter a creative brief before generating concepts.'
      });
      setIsLoading(false);
      return;
    }

    // Start forge animation and set initial state
    try {
      startForgeLoop();
      setGenerationStatus({ step: 'analyzing', progress: 5, detail: 'Analyzing your creative brief...' });
      clearGenerationLogs();
      addGenerationLog('Initializing enhanced generation pipeline...');
    } catch (e) {
      console.warn('Animation start failed:', e);
    }

    const data = {
      query: selectedPrompt || brief,
      tone: selectedLens,
      includeCliches: allowCliches,
      deepScan: imageAnalysisEnabled,
      conceptCount: mode === 'multi' ? variantCount : 1,
      projectId: "concept_forge_session"
    };

    const isMultivariant = data.conceptCount > 1;

    try {
      if (isMultivariant) {
        // Enhanced multivariant generation with streaming
        addGenerationLog(`Requesting ${data.conceptCount} concepts with hybrid mode`);
        setGenerationStatus(prev => ({ ...prev!, step: 'exploring', progress: 15, detail: 'Exploring creative directions...' }));

        const finalResult = await apiClient.streamGeneration(
          '/api/generate-multivariant-stream',
          { ...data, enableHybridMode: true },
          (event) => {
            switch (event.type) {
              case 'progress':
                setGenerationStatus(prev => ({
                  ...prev!,
                  step: event.data.step,
                  progress: event.data.progress,
                  detail: event.data.detail
                }));
                break;

              case 'log':
                const cleanMessage = event.data.message.replace(/^\[.*?\]\s*/, '');
                addGenerationLog(cleanMessage);
                break;

              case 'variant':
                const headline = event.data.variant.headlines?.[0];
                if (headline) {
                  addGenerationLog(`Generated variant ${event.data.index + 1}: "${headline.substring(0, 40)}${headline.length > 40 ? '...' : ''}"`);
                }
                break;

              case 'complete':
                addGenerationLog(`Complete -- ${event.data.outputs?.length || 0} concepts generated`);
                break;
            }
          }
        );

        if (finalResult?.outputs) {
          const parsedConcepts = finalResult.outputs.map((output: any, idx: number) => ({
            id: output.id || `concept-${idx}`,
            headline: output.headlines?.[0] || `Concept ${idx + 1}`,
            tagline: output.tagline || output.headlines?.[1] || '',
            bodyCopy: output.bodyCopy || '',
            visualConcept: output.visualDescription || '',
            devices: output.rhetoricalDevice || 'metaphor',
            rationale: output.visualDescription?.substring(0, 100) + (output.visualDescription?.length > 100 ? '...' : '') || 'Generated concept',
            originalityScore: (output.originalityCheck?.confidence || 0) * 100
          }));

          setResults(parsedConcepts);
          setGenerationStatus(prev => ({
            ...prev!,
            step: 'complete',
            progress: 100,
            detail: `${finalResult.outputs.length} breakthrough concepts ready!`
          }));

          // Auto-save to gallery
          try {
            const storedConcepts = parsedConcepts.map((c: any) =>
              resultToStoredConcept(c, brief, selectedLens)
            );
            saveConceptsToHistory(storedConcepts);
          } catch (e) {
            console.warn('Failed to save concepts to gallery:', e);
          }

          // Success feedback
          toast({
            title: 'Concepts Generated!',
            description: `Successfully created ${finalResult.outputs.length} unique concepts. Saved to Gallery.`
          });

          if (onGenerateComplete) {
            onGenerateComplete(finalResult);
          }
        } else {
          throw new Error('No valid concepts received from generation service');
        }

      } else {
        // Enhanced single concept generation
        addGenerationLog('Requesting premium single concept generation');
        setGenerationStatus(prev => ({ ...prev!, step: 'exploring', progress: 25, detail: 'Exploring creative directions...' }));

        const result = await apiClient.post<any>('/api/generate', data);

        addGenerationLog('Evaluating concept quality...');
        setGenerationStatus(prev => ({ ...prev!, step: 'evaluating', progress: 75, detail: 'Running quality analysis...' }));

        if (!result || result.error) {
          throw new Error(result?.error || 'Invalid response from generation service');
        }

        // Enhanced content parsing
        const content = result.content || '';
        // Handle both **HEADLINE:** and **HEADLINE** formats (with or without colon)
        // Also handle markdown fenced blocks: ```markdown\n**HEADLINE**\n...```
        const cleanContent = content.replace(/```markdown\s*/g, '').replace(/```/g, '');
        const headlineMatch = cleanContent.match(/\*\*HEADLINE:?\*\*\s*(.+?)(?:\n|\*\*)/i);
        const devicesMatch = cleanContent.match(/\*\*RHETORICAL CRAFT.*?\*\*\s*([\s\S]*?)(?:\*\*STRATEGIC|$)/i);
        const taglineMatch = cleanContent.match(/\*\*TAGLINE:?\*\*\s*(.+?)(?:\n|\*\*)/i);
        const bodyCopyMatch = cleanContent.match(/\*\*BODY COPY:?\*\*\s*([\s\S]*?)(?=\*\*VISUAL|\*\*RHETORICAL|$)/i);
        const visualMatch = cleanContent.match(/\*\*VISUAL CONCEPT:?\*\*\s*([\s\S]*?)(?=\*\*RHETORICAL|$)/i);
        
        const headline = headlineMatch?.[1]?.trim() || 'No headline found';
        const devices = devicesMatch?.[1]?.trim() || 'No devices found';

        const parsedConcept = {
          id: result.conceptId || `concept-${Date.now()}`,
          headline,
          tagline: taglineMatch?.[1]?.trim() || '',
          bodyCopy: bodyCopyMatch?.[1]?.trim() || '',
          visualConcept: visualMatch?.[1]?.trim() || '',
          devices,
          content: cleanContent,
          rationale: result.processingTime ? `Generated in ${result.processingTime}` : 'Generated concept',
          originalityScore: (result.originalityCheck?.confidence || 0) * 100
        };

        setResults([parsedConcept]);
        
        addGenerationLog('Concept ready.');
        setGenerationStatus(prev => ({ ...prev!, step: 'complete', progress: 100, detail: 'Breakthrough concept created.' }));

        // Auto-save to gallery
        try {
          const stored = resultToStoredConcept(parsedConcept, brief, selectedLens);
          saveConceptsToHistory([stored]);
        } catch (e) {
          console.warn('Failed to save concept to gallery:', e);
        }

        // Success feedback
        toast({
          title: 'Concept Created!',
          description: `"${headline}" - Saved to Gallery.`
        });

        if (onGenerateComplete) {
          onGenerateComplete(result);
        }
      }

    } catch (error) {
      console.error('Enhanced generation failed:', error);
      handleAPIError(error);
      
      // Set error state with helpful message
      const errorHeadline = error instanceof Error ? error.message : 'Generation failed';
      setResults([{
        id: 'error',
        headline: 'Generation Error',
        devices: errorHeadline,
        rationale: 'Please try again or adjust your brief for better results.',
        originalityScore: 0
      }]);

    } finally {
      try {
        stopForgeLoop();
        setGenerationStatus(null);
      } catch (e) {
        console.warn('Animation cleanup failed:', e);
      }
      setIsLoading(false);
    }
  };

  const handleFeedback = async (index: number, type: string) => {
    try {
      const concept = results[index];
      if (!concept) return;

      await apiClient.post('/api/feedback', {
        conceptId: concept.id || `concept-${index}`,
        feedbackType: type,
        brief: brief,
        tone: selectedLens
      });

      // Optimistic UI feedback
      toast({
        title: type === 'like' ? 'Feedback Saved' : 'Noted',
        description: type === 'like' ? 'We\'ll generate similar concepts in the future.' : 'We\'ll avoid similar approaches.',
        duration: 2000
      });

    } catch (error) {
      console.warn('Feedback submission failed:', error);
      // Don't show error toast for feedback - it's not critical
    }
  };


  return (
    <div id="ideation-section" className="min-h-screen relative py-20" style={{ zIndex: 30000 }}>
      {/* Content Container */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        
        {/* Single Item Carousel - Raised 75px higher, adjusted size */}
        <div className="text-center mb-16" style={{ marginTop: '-115px', transform: 'scale(1.0)' }}>
          <div className="relative h-36 flex items-center justify-center overflow-hidden">
            {carouselItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === currentCarouselIndex;
              
              return (
                <div
                  key={index}
                  className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ${
                    isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  <div 
                    className={`bg-gradient-to-r ${item.gradient} flex items-center justify-center mx-auto mb-4`}
                    style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '0px',
                      border: 'none',
                      flexShrink: 0
                    }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="text-base font-semibold mb-2">
                    <span 
                      style={{
                        background: item.textGradient,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        color: '#60a5fa',
                        display: 'inline-block'
                      }}
                    >
                      {item.title}
                    </span>
                  </h4>
                  <p 
                    className="text-gray-400 max-w-xl mx-auto text-sm"
                  >{item.subtitle}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Generation Mode Toggle */}
        <div className="flex justify-center gap-3 sm:gap-4 mb-12" style={{ marginTop: '90px' }}>
          <Button
            onClick={() => {
              setMode("single");
              localStorage.setItem('conceptForge_mode', 'single');
            }}
            className={`px-5 sm:px-8 py-3 sm:py-4 rounded-none text-base sm:text-lg font-semibold transition-all ${
              mode === "single" 
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-2 border-blue-600" 
                : "bg-gray-800 border-2 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"
            }`}
          >
            <Lightbulb className="w-5 h-5 mr-2" />
            Single Concept
          </Button>
          <Button
            onClick={() => {
              setMode("multi");
              localStorage.setItem('conceptForge_mode', 'multi');
            }}
            className={`px-5 sm:px-8 py-3 sm:py-4 rounded-none text-base sm:text-lg font-semibold transition-all ${
              mode === "multi" 
                ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg border-2 border-purple-600" 
                : "bg-gray-800 border-2 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"
            }`}
          >
            <Grid3X3 className="w-5 h-5 mr-2" />
            Multi-Variant
          </Button>
        </div>

        {/* Mode-Specific Interface */}
        {mode === "single" ? (
          // SINGLE CONCEPT MODE
          <div className="grid lg:grid-cols-2 gap-12 items-start w-full">
            
            {/* Left Column - Input */}
            <div className="space-y-8">
              
              {/* Creative Brief Input */}
              <Card className="bg-gray-800/30 backdrop-blur-sm border-gray-700">
                <CardContent className="p-6">
                  <label htmlFor="creative-brief-single" className="text-xl font-semibold text-white mb-4 block">Your Creative Brief</label>
                  <Textarea
                    id="creative-brief-single"
                    name="creative-brief-single"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="Describe your campaign challenge, product, or creative brief. Be specific about your audience, goals, and key messages..."
                    className="min-h-32 bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-400 resize-none focus:border-blue-500 focus:ring-blue-500"
                    aria-describedby="brief-length-single"
                  />

                  {/* Brief History - Load previous briefs */}
                  <div className="mt-4">
                    <BriefHistory
                      currentQuery={brief}
                      onSelectBrief={(selectedBrief) => {
                        setBrief(selectedBrief.query);
                        setSelectedLens(selectedBrief.tone);
                      }}
                    />
                  </div>

                  <div id="brief-length-single" className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      {brief.length}/1000 characters
                    </span>
                    <div className="text-xs text-gray-500">
                      {brief.length > 50 ? "Good length" : "Add more detail for better results"}
                    </div>
                  </div>

                  {/* Prompt Refinement Panel */}
                  <PromptRefinementPanel
                    query={brief}
                    onSelect={(text) => setBrief(text)}
                  />
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!brief.trim() || isLoading}
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 text-lg font-semibold rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-none h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Generating Concept...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Generate Concept
                  </>
                )}
              </Button>
            </div>

            {/* Right Column - Concept Lenses */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-6">Choose Your Creative Lens</h3>
              
              <div className="grid gap-4">
                {conceptLenses.map((lens) => {
                  const IconComponent = lens.icon;
                  return (
                    <Card
                      key={lens.id}
                      className={`cursor-pointer transition-all duration-200 transform hover:scale-[1.02] ${
                        selectedLens === lens.id
                          ? "bg-gradient-to-r " + lens.color + " border-transparent shadow-lg"
                          : "bg-gray-800/30 border-gray-700 hover:border-gray-600"
                      }`}
                      onClick={() => setSelectedLens(lens.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-none ${
                            selectedLens === lens.id ? "bg-white/20" : "bg-gray-700"
                          }`}>
                            <IconComponent className={`h-5 w-5 ${
                              selectedLens === lens.id ? "text-white" : "text-gray-400"
                            }`} />
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-semibold ${
                              selectedLens === lens.id ? "text-white" : "text-gray-200"
                            }`}>
                              {lens.name}
                            </h4>
                            <p className={`text-sm ${
                              selectedLens === lens.id ? "text-gray-100" : "text-gray-400"
                            }`}>
                              {lens.description}
                            </p>
                          </div>
                          <div className={`w-3 h-3 rounded-none ${
                            selectedLens === lens.id ? "bg-white" : "bg-gray-600"
                          }`}></div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          // MULTI-VARIANT MODE
          <div className="grid lg:grid-cols-2 gap-12 items-start w-full">
            
            {/* Left Column - Input */}
            <div className="space-y-8">
              
              {/* Creative Brief Input */}
              <Card className="bg-gray-800/30 backdrop-blur-sm border-gray-700">
                <CardContent className="p-6">
                  <label htmlFor="creative-brief-multi" className="text-xl font-semibold text-white mb-4 block">Your Creative Brief</label>
                  <Textarea
                    id="creative-brief-multi"
                    name="creative-brief-multi"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder="Describe your campaign challenge, product, or creative brief. Be specific about your audience, goals, and key messages..."
                    className="min-h-32 bg-gray-900/50 border-gray-600 text-white placeholder:text-gray-400 resize-none focus:border-purple-500 focus:ring-purple-500"
                    aria-describedby="brief-length-multi"
                  />

                  {/* Brief History - Load previous briefs */}
                  <div className="mt-4">
                    <BriefHistory
                      currentQuery={brief}
                      onSelectBrief={(selectedBrief) => {
                        setBrief(selectedBrief.query);
                        setSelectedLens(selectedBrief.tone);
                        if (selectedBrief.concept_count > 1) {
                          setVariantCount(selectedBrief.concept_count);
                        }
                      }}
                    />
                  </div>

                  <div id="brief-length-multi" className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      {brief.length}/1000 characters
                    </span>
                    <div className="text-xs text-gray-500">
                      {brief.length > 50 ? "Good length for variants" : "Add more detail for better variant results"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Variant Count Selection */}
              <Card className="bg-gray-800/30 backdrop-blur-sm border-gray-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Number of Variants</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[3, 5, 8, 10].map((count) => (
                      <Button
                        key={count}
                        variant={count === variantCount ? "default" : "outline"}
                        size="sm"
                        onClick={() => setVariantCount(count)}
                        className={`${
                          count === variantCount 
                            ? "bg-purple-600 hover:bg-purple-700 text-white" 
                            : "border-gray-600 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {count}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Selected: {variantCount} variants{variantCount === 5 ? ' (recommended for optimal diversity)' : ''}</p>
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={!brief.trim() || isLoading}
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 text-lg font-semibold rounded-none disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-none h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Generating Variants...
                  </>
                ) : (
                  <>
                    <Grid3X3 className="mr-2 h-5 w-5" />
                    Generate Variants
                  </>
                )}
              </Button>
            </div>

            {/* Right Column - Strategy Options */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-6">Variant Strategy</h3>
              
              <div className="grid gap-4">
                <Card className="bg-gradient-to-r from-purple-600 to-pink-600 border-transparent shadow-lg cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-none bg-white/20 flex-shrink-0">
                        <Grid3X3 className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white mb-1">Diverse Exploration</h4>
                        <p className="text-sm text-gray-100 leading-relaxed">
                          Generate variants across all creative lenses for maximum diversity
                        </p>
                      </div>
                      <div className="w-3 h-3 rounded-none bg-white flex-shrink-0 mt-1"></div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-800/30 border-gray-700 hover:border-gray-600 cursor-pointer opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-none bg-gray-700 flex-shrink-0">
                        <Target className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-200 mb-1">Focused Variants</h4>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          Multiple variations within a single creative lens (Coming Soon)
                        </p>
                      </div>
                      <div className="w-3 h-3 rounded-none bg-gray-600 flex-shrink-0 mt-1"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Tools */}
        <div className="mt-12 mb-16">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center gap-4">
              {/* Image Analysis Toggle */}
              <div className={`bg-gray-800/20 backdrop-blur-sm border rounded-none p-4 transition-all duration-200 ${
                imageAnalysisEnabled ? 'border-green-400 bg-green-900/20' : 'border-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Eye className={`w-4 h-4 ${imageAnalysisEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                    <h4 className={`text-sm font-bold ${imageAnalysisEnabled ? 'text-green-400' : 'text-white'}`}>
                      Image Analysis
                    </h4>
                  </div>
                  <Switch 
                    checked={imageAnalysisEnabled}
                    onCheckedChange={setImageAnalysisEnabled}
                  />
                </div>
                <p className="text-gray-400 text-xs">
                  Use advanced Google Image Search API to scan for visuals that match your concept
                </p>
                {imageAnalysisEnabled && (
                  <p className="text-yellow-400 text-xs mt-2 font-medium">
                    Increases API costs & processing time +30s
                  </p>
                )}
              </div>

              {/* Cliché Detection Toggle */}
              <div className={`bg-gray-800/20 backdrop-blur-sm border rounded-none p-4 transition-all duration-200 ${
                allowCliches ? 'border-purple-400 bg-purple-900/20' : 'border-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${allowCliches ? 'text-purple-400' : 'text-gray-400'}`} />
                    <h4 className={`text-sm font-bold ${allowCliches ? 'text-purple-400' : 'text-white'}`}>
                      Allow Cliches
                    </h4>
                  </div>
                  <Switch 
                    checked={allowCliches}
                    onCheckedChange={setAllowCliches}
                  />
                </div>
                <p className="text-gray-400 text-xs">
                  Cliché filter active by default. This override lets tired phrases back into results
                </p>
                {allowCliches && (
                  <p className="text-yellow-400 text-xs mt-2 font-medium">
                    May reduce concept originality
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Session History - Full width to outer edges */}
          <div className="mt-8 bg-gray-800/20 backdrop-blur-sm border border-gray-700 rounded-none w-full">
            <SessionHistory />
          </div>
        </div>

        {/* Bottom spacing to ensure page ends appropriately after Session History */}
        <div className="h-8"></div>

      </div>

      {/* Loading Window */}
      <LoadingWindow isLoading={isLoading} onClose={() => setIsLoading(false)} progress={generationStatus} />
      
      {/* Results Display */}
      <ResultsDisplay results={results} onFeedback={(index, type) => fetch('/api/feedback', { method: 'POST', body: JSON.stringify({ type, conceptId: index }) })} />
    </div>
  );
}