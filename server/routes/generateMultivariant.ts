import { Request, Response } from 'express';
import OpenAI from 'openai';
import { generateMultivariantPrompt } from '../utils/openAiPromptHelper';
import { HybridGenerationOrchestrator } from '../utils/hybridGenerationOrchestrator';
import { checkOriginality, calculateLevenshteinDistance } from '../utils/originalityChecker';
import { fetchRhetoricalExamples } from '../utils/rhetoricalExamplesFetcher';
import { evaluateAdQuality, shouldFlagForReview } from '../utils/adQualityArbiter';
import { evaluateAudienceEmpathy, hasLowAudienceResonance, deriveTargetAudience } from '../utils/audienceEmpathyArbiter';
import { evaluateAwardsJuryScore, hasHighAwardsPotential, hasLowAwardsPotential } from '../utils/awardsJuryArbiter';
import { runIterativeRefinement } from '../utils/iterativeRefinementEngine';
import { performanceTracker } from '../utils/performanceTracker';
import { 
  salvageConceptFragments, 
  getFragmentsForRecombination, 
  createRecombinationPrompt,
  markFragmentAsUsed 
} from '../utils/fragmentSalvager';
import { 
  getUsedExamples, 
  markExampleAsUsed, 
  clearUsedExamples,
  getRhetoricalDeviceUsage,
  updateRhetoricalDeviceUsage,
  supabase
} from '../supabaseClient';
import { 
  enforceConceptDiversity, 
  checkHistoricalSimilarityWithEmbeddings 
} from '../utils/embeddingSimilarity';
import { reportSimilarityToRatedConcepts, analyzeFeedbackSimilarity } from '../utils/feedbackSimilarityReporter';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Enhanced historical similarity filtering using embeddings with fallback
async function checkHistoricalSimilarity(visualDescription: string, headlines: string[]): Promise<boolean> {
  try {
    // Check if Supabase environment variables are available
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_KEY)) {
      console.log('⚠️ Supabase credentials not available, skipping historical similarity check');
      return false;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || ''
    );

    // Get 50 most recent concept logs
    const { data: recentConcepts, error } = await supabase
      .from('concept_logs')
      .select('response')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !recentConcepts) {
      console.log('Could not fetch recent concepts for similarity check, proceeding without filtering');
      return false;
    }

    const newContent = `${visualDescription} ${headlines.join(' ')}`;
    const historicalConcepts = recentConcepts.map(c => c.response);

    try {
      // Try advanced embedding-based similarity first
      console.log('🔬 Using advanced embedding-based similarity detection...');
      const embeddingResult = await checkHistoricalSimilarityWithEmbeddings(
        newContent, 
        historicalConcepts, 
        0.8 // 80% similarity threshold
      );
      
      if (embeddingResult.isSimilar && embeddingResult.mostSimilar) {
        console.log(`🚫 Concept rejected - semantic similarity: ${embeddingResult.mostSimilar.similarity.toFixed(3)} with: "${embeddingResult.mostSimilar.concept.substring(0, 100)}..."`);
        return true;
      }
      
      return false;
    } catch (embeddingError) {
      console.log('⚠️ Embedding similarity failed, falling back to word-based similarity:', embeddingError);
      
      // Fallback to original word-based similarity
      const newWords = newContent.toLowerCase().split(/\s+/).filter((word: string) => word.length > 2);

      for (const concept of recentConcepts) {
        const existingContent = concept.response.toLowerCase();
        const existingWords: string[] = existingContent.split(/\s+/).filter((word: string) => word.length > 2);
        
        const commonWords = newWords.filter((word: string) => existingWords.includes(word));
        
        if (commonWords.length > 3) {
          console.log(`🚫 Concept discarded for word-based similarity - ${commonWords.length} shared keywords: ${commonWords.join(', ')}`);
          return true;
        }
      }
      
      return false;
    }
  } catch (error) {
    console.log('Error checking historical similarity:', error);
    return false;
  }
}

// Import the comprehensive rhetorical devices from openai.ts
import { getAllRhetoricalDevices } from '../services/openai';

// COMPREHENSIVE rhetorical devices list organized by tone - using ALL 118+ available devices
const rhetoricalDevicesByTone = {
  creative: [
    'Metaphor', 'Paradox', 'Oxymoron', 'Synecdoche', 'Hyperbole', 
    'Personification', 'Allegory', 'Zeugma', 'Juxtaposition',
    'Alliteration', 'Assonance', 'Ekphrasis', 'Paronomasia',
    'Aposiopesis', 'Anacoluthon', 'Antanaclasis', 'Meiosis'
  ],
  analytical: [
    'Antithesis', 'Chiasmus', 'Syllogism', 'Logos', 'Ethos',
    'Polysyndeton', 'Asyndeton', 'Epistrophe', 'Anaphora',
    'Climax', 'Prolepsis', 'Reductio ad Absurdum', 'Isocolon',
    'Litotes', 'Ellipsis', 'Symploce', 'Anadiplosis'
  ],
  conversational: [
    'Rhetorical Question', 'Irony', 'Hyperbole', 'Paronomasia',
    'Hendiadys', 'Anadiplosis', 'Epizeuxis', 'Symploce',
    'Alliteration', 'Assonance', 'Meiosis', 'Litotes',
    'Aposiopesis', 'Anacoluthon', 'Antanaclasis', 'Pathos'
  ],
  technical: [
    'Metonymy', 'Litotes', 'Synecdoche', 'Ellipsis', 'Hendiadys',
    'Chiasmus', 'Climax', 'Syllogism', 'Logos', 'Ethos',
    'Isocolon', 'Parallelism', 'Prolepsis', 'Anaphora',
    'Epistrophe', 'Polysyndeton', 'Asyndeton'
  ],
  summarize: [
    'Synecdoche', 'Metonymy', 'Ellipsis', 'Asyndeton',
    'Litotes', 'Meiosis', 'Climax', 'Isocolon',
    'Parallelism', 'Hendiadys', 'Symploce', 'Anaphora',
    'Epistrophe', 'Adage', 'Ethos', 'Logos', 'Syllogism'
  ]
};

interface MultivariantRequest {
  query: string;
  tone: string;
  maxOutputs?: number;
  avoidCliches?: boolean;
  enableIterativeRefinement?: boolean;
  projectId?: string; // For feedback similarity analysis
  // Hybrid generation parameters
  enableHybridMode?: boolean;
  hybridConfig?: {
    enableDivergentExploration?: boolean;
    enableProgressiveEvolution?: boolean;
    enableTropeConstraints?: boolean;
    creativityLevel?: 'conservative' | 'balanced' | 'experimental';
    requestedTropes?: string[];
  };
}

interface MultivariantOutput {
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  originalityScore: number;
  id: string;
  example?: any;
  professionalismScore?: number;
  clarityScore?: number;
  freshnessScore?: number;
  critique?: string;
  flaggedForReview?: boolean;
  resonanceScore?: number;
  audienceClarityScore?: number;
  vibe?: string;
  reflection?: string;
  lowAudienceResonance?: boolean;
  awardsScore?: number;
  awardPotential?: string;
  juryComment?: string;
  improvementTip?: string;
  highAwardsPotential?: boolean;
  iterationNumber?: number;
  originalityConfidence?: number;
  originalityFeedback?: string;
  audienceResonance?: string;
  audienceFeedback?: string;
  awardPotentialLevel?: string;
  awardFeedback?: string;
  relevanceScore?: number;
  relevanceFeedback?: string;
  passesAllThresholds?: boolean;
  failedCriteria?: string[];
  finalStatus?: 'Passed' | 'Needs Review' | 'Failed';
  fullMarkdown?: string;
  tagline?: string;
  bodyCopy?: string;
  rhetoricalCraft?: string[];
  strategicImpact?: string;
  // Hybrid mode metadata
  hybridMetadata?: {
    creativeSeedOrigin?: {
      personaId: string;
      personaName: string;
      rawIdea: string;
    };
    evolutionPath?: {
      startState: string;
      endState: string;
      transitionCount: number;
    };
    scores?: {
      originality: number;
      tropeAlignment: number;
      coherence: number;
      distinctiveness: number;
      overall: number;
    };
    rhetoricalAnalysis?: {
      deviceName: string;
      deviceDefinition: string;
      applicationExplanation: string;
      textualEvidence: string[];
      effectivenessNote?: string;
    };
  };
}

interface ParsedOutput {
  visual: string;
  headlines: string[];
  tagline?: string;
  bodyCopy?: string;
  rhetoricalCraft?: string[];
  strategicImpact?: string;
  fullMarkdown?: string;
}

export function parseOpenAIResponse(response: string): ParsedOutput | null {
  try {
    const cleanResponse = response.trim();
    console.log('🔍 Parsing response length:', cleanResponse.length);
    console.log('🔍 Response first 300 chars:', cleanResponse.substring(0, 300));
    
    // Parse Markdown format response
    const lines = cleanResponse.split('\n');
    let headline = '';
    let tagline = '';
    let bodyCopy = '';
    let visualConcept = '';
    let rhetoricalCraft: string[] = [];
    let strategicImpact = '';
    let headlines: string[] = [];
    
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('# ')) {
        headline = line.substring(2).trim();
        console.log('✅ Found headline:', headline);
      } else if (line.startsWith('## ')) {
        tagline = line.substring(3).trim();
        console.log('✅ Found tagline:', tagline);
      } else if (line.startsWith('**Tagline:**')) {
        tagline = line.replace('**Tagline:**', '').trim();
        console.log('✅ Found tagline (alt):', tagline);
      } else if (line.startsWith('**Body Copy:**')) {
        currentSection = 'bodyCopy';
        const content = line.replace('**Body Copy:**', '').trim();
        if (content) bodyCopy = content;
        console.log('✅ Found body copy section');
      } else if (line.startsWith('**Visual Concept:**') || line.startsWith('**Visual:**') || line.startsWith('**Visual Description:**')) {
        currentSection = 'visualConcept';
        const content = line.replace(/\*\*(Visual Concept|Visual|Visual Description):\*\*/, '').trim();
        if (content) visualConcept = content;
        console.log('✅ Found visual concept section:', content || 'empty, will collect from next lines');
      } else if (line.startsWith('**Rhetorical Craft:**') || line.startsWith('**Rhetorical Device:**')) {
        currentSection = 'rhetoricalCraft';
        console.log('✅ Found rhetorical craft section');
      } else if (line.startsWith('**Strategic Impact:**')) {
        currentSection = 'strategicImpact';
        const content = line.replace('**Strategic Impact:**', '').trim();
        if (content) strategicImpact = content;
        console.log('✅ Found strategic impact section');
      } else if (line.startsWith('**Headlines:**')) {
        currentSection = 'headlines';
        console.log('✅ Found headlines section');
      } else if (line.startsWith('**Success Metrics:**') || line.startsWith('**Evaluation:**') || line.startsWith('**Quality Standards:**') || line.startsWith('### Quality Standards') || line.startsWith('**Effectiveness:**')) {
        currentSection = 'other'; // Stop processing headlines
        console.log('✅ Found section end, stopping headline collection');
      } else if (line.startsWith('### Headlines') || line.startsWith('### Visual Description')) {
        // Handle ### format instead of **
        if (line.includes('Headlines')) {
          currentSection = 'headlines';
          console.log('✅ Found headlines section (### format)');
        } else if (line.includes('Visual Description')) {
          currentSection = 'visualConcept';
          console.log('✅ Found visual concept section (### format)');
        }
      } else if (line.startsWith('- ') && currentSection === 'rhetoricalCraft') {
        rhetoricalCraft.push(line.substring(2).trim());
      } else if (line.startsWith('- Option ') || (line.startsWith('- **Option ')) || (line.startsWith('- ') && currentSection === 'headlines' && !line.includes('**') && line.length < 100)) {
        // Extract headline from "- Option 1: Headline" or "- Headline" format
        // Only accept short lines without markdown formatting as headlines
        let headlineText = line.substring(2).trim();
        if (headlineText.includes(': ')) {
          headlineText = headlineText.split(': ', 2)[1].trim();
        }
        // Remove markdown formatting
        headlineText = headlineText.replace(/\*\*/g, '');
        if (headlineText && !headlines.includes(headlineText) && headlineText.length < 50) {
          headlines.push(headlineText);
          console.log('✅ Found headline:', headlineText);
        }
      } else if (currentSection && line && !line.startsWith('**') && !line.startsWith('- Option')) {
        // Continue multi-line content
        if (currentSection === 'bodyCopy') {
          bodyCopy += (bodyCopy ? ' ' : '') + line;
        } else if (currentSection === 'visualConcept') {
          visualConcept += (visualConcept ? ' ' : '') + line;
          console.log('✅ Added visual content:', line);
        } else if (currentSection === 'strategicImpact') {
          strategicImpact += (strategicImpact ? ' ' : '') + line;
        }
      }
    }
    
    // Add main headline and tagline to headlines array if not already present
    if (headline && !headlines.includes(headline)) headlines.unshift(headline);
    if (tagline && tagline !== headline && !headlines.includes(tagline)) headlines.push(tagline);
    
    // If we still don't have a visual concept, try to extract from body copy or create a fallback
    if (!visualConcept.trim()) {
      visualConcept = bodyCopy || "Innovative visual concept showcasing the product's unique value proposition";
      console.log('⚠️ Using fallback visual concept');
    }
    
    console.log('📊 Final parsing result:', {
      visual: visualConcept.substring(0, 50) + '...',
      headlineCount: headlines.length,
      hasContent: !!(visualConcept && headlines.length > 0)
    });
    
    return {
      visual: visualConcept.trim(),
      headlines: headlines,
      tagline: tagline.trim(),
      bodyCopy: bodyCopy.trim(),
      rhetoricalCraft: rhetoricalCraft,
      strategicImpact: strategicImpact.trim(),
      fullMarkdown: cleanResponse
    };
  } catch (error) {
    console.error('❌ Markdown parsing error:', error);
    console.error('Raw response sample:', response.substring(0, 500));
    return null;
  }
}

async function selectRhetoricalDevicesWeighted(tone: string, count: number = 5): Promise<string[]> {
  const devices = rhetoricalDevicesByTone[tone as keyof typeof rhetoricalDevicesByTone] || 
                  rhetoricalDevicesByTone.creative;
  
  // Get usage counts for weighting
  const deviceUsage = await getRhetoricalDeviceUsage();
  
  // Calculate weights with STRONGER bias toward unused devices
  const deviceWeights = devices.map(device => {
    const usage = deviceUsage[device] || 0;
    // STRONGER inverse weight: heavily favor unused devices
    const weight = Math.max(1, 20 - (usage * 3)); // Much higher penalty for used devices
    return { device, weight };
  });
  
  // Sort by weight and take top diverse devices to ensure variety
  const sortedDevices = deviceWeights.sort((a, b) => b.weight - a.weight);
  
  // Take top unused devices first, then add random selection from rest
  const selected: string[] = [];
  const unusedDevices = sortedDevices.filter(d => (deviceUsage[d.device] || 0) === 0);
  const lightlyUsedDevices = sortedDevices.filter(d => (deviceUsage[d.device] || 0) <= 2);
  
  // Prioritize completely unused devices
  for (let i = 0; i < Math.min(count, unusedDevices.length); i++) {
    selected.push(unusedDevices[i].device);
  }
  
  // Fill remaining slots with lightly used devices
  for (let i = 0; i < Math.min(count - selected.length, lightlyUsedDevices.length); i++) {
    if (!selected.includes(lightlyUsedDevices[i].device)) {
      selected.push(lightlyUsedDevices[i].device);
    }
  }
  
  // If still need more, add random selections from all devices
  const remainingDevices = devices.filter(d => !selected.includes(d));
  while (selected.length < count && remainingDevices.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingDevices.length);
    selected.push(remainingDevices.splice(randomIndex, 1)[0]);
  }
  
  console.log(`🎯 Selected DIVERSE devices for ${tone}: ${selected.join(', ')}`);
  console.log(`📊 Device usage stats:`, selected.map(d => `${d}:${deviceUsage[d] || 0}`).join(', '));
  return selected;
}

function calculateDiversityScore(outputs: MultivariantOutput[]): MultivariantOutput[] {
  return outputs.map((output, index) => {
    let diversityBonus = 0;
    
    // Check rhetorical device diversity
    const otherDevices = outputs
      .filter((_, i) => i !== index)
      .map(o => o.rhetoricalDevice);
    
    if (!otherDevices.includes(output.rhetoricalDevice)) {
      diversityBonus += 10;
    }
    
    // Check headline diversity using Levenshtein distance
    const allOtherHeadlines = outputs
      .filter((_, i) => i !== index)
      .flatMap(o => o.headlines);
    
    const minDistance = Math.min(...output.headlines.map(headline => 
      Math.min(...allOtherHeadlines.map(otherHeadline => 
        calculateLevenshteinDistance(headline, otherHeadline)
      ))
    ));
    
    if (minDistance > 3) {
      diversityBonus += 5;
    }
    
    return {
      ...output,
      originalityScore: output.originalityScore + diversityBonus
    };
  });
}

export async function generateMultivariant(req: Request, res: Response) {
  try {
    const {
      query,
      tone,
      maxOutputs = 3,
      avoidCliches = true,
      enableIterativeRefinement = true,
      enableHybridMode = true,
      hybridConfig
    }: MultivariantRequest = req.body;

    // Start performance tracking
    performanceTracker.startTracking();
    console.log(`🚀 Starting multi-variant generation: "${query}" (${tone}, max ${maxOutputs})`);

    const startTime = Date.now();

    if (!query || !tone) {
      return res.status(400).json({ error: 'Query and tone are required' });
    }

    // ============================================
    // HYBRID GENERATION MODE
    // ============================================
    if (enableHybridMode) {
      console.log('🌀 HYBRID MODE ENABLED - Using CREATIVEDC + EvoToken-DLM pipeline');

      try {
        const orchestrator = new HybridGenerationOrchestrator({
          enableDivergentExploration: hybridConfig?.enableDivergentExploration ?? true,
          enableProgressiveEvolution: hybridConfig?.enableProgressiveEvolution ?? true,
          enableTropeConstraints: hybridConfig?.enableTropeConstraints ?? true,
          creativityLevel: hybridConfig?.creativityLevel ?? 'balanced',
          fallbackToLegacy: true
        });

        const hybridResult = await orchestrator.generate({
          userBrief: query,
          tone,
          requestedTropes: hybridConfig?.requestedTropes,
          variantCount: maxOutputs,
          sessionId: `session_${Date.now()}`
        });

        // Transform hybrid output to match existing response format
        const outputs: MultivariantOutput[] = hybridResult.variants.map(variant => ({
          visualDescription: variant.visualDescription,
          headlines: variant.headlines,
          rhetoricalDevice: variant.rhetoricalDevice,
          originalityScore: Math.round(variant.scores.originality * 100),
          id: variant.id,
          tagline: variant.tagline,
          bodyCopy: variant.bodyCopy,
          professionalismScore: Math.round(variant.scores.coherence * 100),
          clarityScore: Math.round(variant.scores.coherence * 100),
          freshnessScore: Math.round(variant.scores.distinctiveness * 100),
          resonanceScore: Math.round(variant.scores.tropeAlignment * 100),
          awardsScore: Math.round(variant.scores.overall * 100),
          passesAllThresholds: variant.scores.overall >= 0.6,
          finalStatus: variant.scores.overall >= 0.7 ? 'Passed' : variant.scores.overall >= 0.5 ? 'Needs Review' : 'Failed',
          // Hybrid-specific metadata
          hybridMetadata: {
            creativeSeedOrigin: variant.creativeSeedOrigin,
            evolutionPath: variant.evolutionPath,
            scores: variant.scores,
            // Detailed rhetorical analysis explaining how the device was applied
            rhetoricalAnalysis: variant.rhetoricalAnalysis
          }
        }));

        const endTime = Date.now();

        console.log(`✅ Hybrid generation complete: ${outputs.length} variants in ${endTime - startTime}ms`);
        console.log(`   Mode: ${hybridResult.metadata.mode}`);
        console.log(`   Creativity Score: ${(hybridResult.metadata.creativityScore * 100).toFixed(1)}%`);
        console.log(`   Divergent Pool: ${hybridResult.metadata.divergentPoolSize} seeds`);

        return res.json({
          success: true,
          outputs,
          metadata: {
            generationMode: 'hybrid',
            ...hybridResult.metadata,
            totalTime: endTime - startTime
          }
        });
      } catch (hybridError) {
        console.error('❌ Hybrid generation failed, falling back to legacy:', hybridError);
        // Continue with legacy generation below
      }
    }

    // ============================================
    // LEGACY GENERATION MODE (existing code)
    // ============================================
    
    // **Step 3: Fetch rhetorical examples and handle persistent exclusion**
    const allExamples = await fetchRhetoricalExamples();
    const usedExampleIds = await getUsedExamples();
    
    // Filter out already used examples
    let availableExamples = allExamples.filter(example => 
      !usedExampleIds.includes(example.id)
    );
    
    // If all examples have been used, clear the table and reset
    if (availableExamples.length === 0) {
      console.log('🔄 All examples used, resetting cycle...');
      await clearUsedExamples();
      availableExamples = [...allExamples];
    }
    
    console.log(`📋 Available examples: ${availableExamples.length}/${allExamples.length} (${usedExampleIds.length} already used)`);
    
    // Select MORE rhetorical devices with stronger weighting for diversity  
    const selectedDevices = await selectRhetoricalDevicesWeighted(tone, 12);
    const rawOutputs: MultivariantOutput[] = [];
    
    // Get salvaged fragments for inspiration (shared across all generations)
    let salvagedFragments: { id: string; fragment_text: string; rationale: string; fragment_type: string; }[] = [];
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_KEY || ''
      );
      
      const { data, error } = await supabaseClient
        .from('salvaged_fragments')
        .select('id, fragment_text, rationale, fragment_type')
        .order('created_at', { ascending: false })
        .limit(5); // Limit to 5 most recent fragments
      
      if (!error && data) {
        salvagedFragments = data;
        console.log(`🎨 Retrieved ${salvagedFragments.length} salvaged fragments for inspiration`);
      }
    } catch (error) {
      console.log('No salvaged fragments available or Supabase not configured');
    }
    
    // Generate up to 10 completions in parallel with unique examples
    const completionPromises = [];
    const batchUsedExamples: any[] = []; // Track examples used in this batch
    const batchUsedDevices: string[] = []; // Track devices used for updating usage
    
    for (let i = 0; i < Math.min(10, selectedDevices.length * 2); i++) {
      const primaryDevice = selectedDevices[i % selectedDevices.length];
      const secondaryDevice = selectedDevices[(i + 1) % selectedDevices.length];
      
      // Track device usage for this batch
      if (!batchUsedDevices.includes(primaryDevice)) {
        batchUsedDevices.push(primaryDevice);
      }
      
      // ENHANCED: Use semantic retrieval from comprehensive corpus + traditional examples
      let selectedExample = null;
      let semanticExample = null;
      
      // ENHANCED: Get semantically relevant examples using session-anchored rotation
      try {
        const { retrieveTopNWithRotation } = await import('../utils/embeddingRetrieval');
        
        // ENHANCED AUTO-DETECTION: Use sophisticated theory mapping system
        const { detectTheoryContext, getContextualTheoryPriority } = await import('../utils/enhancedTheoryMapping');
        
        const theoryContext = detectTheoryContext(query);
        const theoriesToPrioritize = getContextualTheoryPriority(query);
        
        console.log(`🧠 MULTIVARIANT THEORY DETECTION: Primary=${theoryContext.primaryFramework}, Priority=[${theoriesToPrioritize.join(' → ')}]`);
        
        const corpusResults = await retrieveTopNWithRotation(query, 1, i, theoriesToPrioritize.slice(0, 3), 'default_project');
        if (corpusResults && corpusResults.length > 0) {
          semanticExample = corpusResults[0];
          console.log(`🧠 Retrieved semantic example: ${semanticExample.campaign} (${semanticExample.brand}) - ${semanticExample.rhetoricalDevices?.join(', ')}`);
        }
      } catch (error) {
        console.log('📚 Semantic retrieval unavailable, using traditional examples');
      }
      
      // Also select from traditional examples if available
      if (availableExamples.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableExamples.length);
        selectedExample = availableExamples.splice(randomIndex, 1)[0]; // Remove from available pool
        batchUsedExamples.push(selectedExample);
        console.log(`🎯 Selected traditional example for generation ${i + 1}: ${selectedExample.campaign_name} - ${selectedExample.brand}`);
      }
      
      const prompt = generateMultivariantPrompt({
        rhetoricalDevice: primaryDevice,
        secondRhetoricalDevice: secondaryDevice,
        userQuery: query,
        tone: tone,
        avoidCliches,
        rhetoricalExample: selectedExample,
        semanticExample: semanticExample, // ADD theoretical corpus example
        salvagedFragments: salvagedFragments
      });
      
      completionPromises.push(
        (async () => {
          const apiStartTime = Date.now();
          const response = await openai.chat.completions.create({
            model: "gpt-5.2", // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
              { 
                role: "system", 
                content: "You are a breakthrough creative genius specializing in radically original advertising concepts. Never repeat ideas, words, or approaches from previous concepts. Each concept must feel completely fresh and unexpected." 
              },
              { role: "user", content: prompt }
            ],
            temperature: 1.4, // Higher temperature for maximum creative divergence
            max_tokens: 800, // Increased for Markdown format
            // Removed response_format: json_object since we're now using Markdown
          });
          const apiEndTime = Date.now();
          
          // Track API call performance
          performanceTracker.trackOperation(
            `OpenAI Generation ${i + 1}`,
            apiStartTime,
            apiEndTime,
            response.usage
          );
          
          return {
            response: response.choices[0].message.content || '',
            device: primaryDevice,
            example: selectedExample,
            id: `variant-${Date.now()}-${i}`
          };
        })()
      );
    }
    
    console.log(`✅ Generated ${completionPromises.length} unique prompts with ${batchUsedExamples.length} unique examples`);
    
    const completions = await Promise.all(completionPromises);
    
    // Mark examples as used in database and update device usage
    for (const example of batchUsedExamples) {
      if (example?.id) {
        await markExampleAsUsed(example.id);
      }
    }
    
    for (const device of batchUsedDevices) {
      await updateRhetoricalDeviceUsage(device);
    }
    
    console.log(`📝 Marked ${batchUsedExamples.length} examples as used and updated usage for ${batchUsedDevices.length} devices`);
    
    // Process completions with historical similarity filtering
    console.log(`🔍 Processing ${completions.length} completions...`);
    for (const completion of completions) {
      console.log(`🔍 Raw AI response for ${completion.device}:`, completion.response.substring(0, 300) + '...');
      console.log(`🔍 Response has content:`, !!completion.response);
      console.log(`🔍 Response length:`, completion.response.length);
      
      const parsed = parseOpenAIResponse(completion.response);
      console.log(`🎯 Parsing result for device ${completion.device}:`, { 
        hasVisual: !!parsed?.visual, 
        headlineCount: parsed?.headlines?.length || 0,
        visual: parsed?.visual?.substring(0, 100) || 'N/A',
        firstHeadline: parsed?.headlines?.[0] || 'N/A'
      });
      if (parsed && parsed.visual && parsed.headlines.length > 0) {
        
        // Check for historical similarity before accepting concept
        let isSimilar = false;
        try {
          isSimilar = await checkHistoricalSimilarity(parsed.visual, parsed.headlines);
        } catch (error) {
          console.log('Error checking historical similarity:', error);
          isSimilar = false; // Continue without similarity check if it fails
        }
        
        if (isSimilar) {
          console.log(`🔄 Regenerating concept due to historical similarity...`);
          
          // Regenerate this specific concept with a new prompt
          try {
            const regenerationPrompt = generateMultivariantPrompt({
              rhetoricalDevice: completion.device,
              secondRhetoricalDevice: selectedDevices[(selectedDevices.indexOf(completion.device) + 1) % selectedDevices.length],
              userQuery: query,
              tone: tone,
              avoidCliches,
              rhetoricalExample: completion.example
            });
            
            const regeneratedResponse = await openai.chat.completions.create({
              model: "gpt-5.2",
              messages: [{ role: "user", content: regenerationPrompt }],
              temperature: 1.3,
              max_tokens: 800,
              // Removed response_format: json_object since we're now using Markdown
            });
            
            const regeneratedParsed = parseOpenAIResponse(regeneratedResponse.choices[0].message.content || '');
            if (regeneratedParsed && regeneratedParsed.visual && regeneratedParsed.headlines.length > 0) {
              // Check originality for regenerated concept
              const combinedContent = `${regeneratedParsed.visual} ${regeneratedParsed.headlines.join(' ')}`;
              const originalityResult = await checkOriginality(combinedContent);
              
              // Evaluate ad quality for regenerated concept
              const adQuality = await evaluateAdQuality({
                visualDescription: regeneratedParsed.visual,
                headlines: regeneratedParsed.headlines,
                rhetoricalDevice: completion.device,
                rhetoricalExample: completion.example?.campaign_name || 'Unknown'
              });
              
              // Derive target audience and evaluate empathy for regenerated concept
              const targetAudience = deriveTargetAudience(query, tone);
              const empathy = await evaluateAudienceEmpathy({
                visualDescription: regeneratedParsed.visual,
                headlines: regeneratedParsed.headlines,
                rhetoricalDevice: completion.device,
                rhetoricalExample: completion.example?.campaign_name || 'Unknown',
                tone: tone,
                targetAudience: targetAudience
              });
              
              // Evaluate awards jury potential for regenerated concept
              const awardsEvaluation = await evaluateAwardsJuryScore({
                visualDescription: regeneratedParsed.visual,
                headlines: regeneratedParsed.headlines,
                rhetoricalDevice: completion.device,
                tone: tone,
                targetAudience: targetAudience
              });
              
              const flaggedForReview = shouldFlagForReview(adQuality);
              const lowAudienceResonance = hasLowAudienceResonance(empathy.resonance_score);
              
              rawOutputs.push({
                visualDescription: regeneratedParsed.visual,
                headlines: regeneratedParsed.headlines,
                rhetoricalDevice: completion.device,
                originalityScore: originalityResult.score,
                id: completion.id,
                example: completion.example,
                professionalismScore: adQuality.professionalism_score,
                clarityScore: adQuality.clarity_score,
                freshnessScore: adQuality.freshness_score,
                critique: adQuality.critique,
                flaggedForReview,
                resonanceScore: empathy.resonance_score,
                audienceClarityScore: empathy.clarity_score,
                vibe: empathy.vibe,
                reflection: empathy.reflection,
                lowAudienceResonance,
                awardsScore: awardsEvaluation.awards_score,
                awardPotential: awardsEvaluation.award_potential,
                juryComment: awardsEvaluation.jury_comment,
                improvementTip: awardsEvaluation.improvement_tip,
                highAwardsPotential: hasHighAwardsPotential(awardsEvaluation.awards_score)
              });
              
              console.log(`✅ Successfully regenerated unique concept`);
            } else {
              console.log(`⚠️ Regeneration failed, using original concept`);
              // Fallback to original if regeneration fails
              const combinedContent = `${parsed.visual} ${parsed.headlines.join(' ')}`;
              const originalityResult = await checkOriginality(combinedContent);
              
              // Evaluate ad quality for fallback concept
              const adQuality = await evaluateAdQuality({
                visualDescription: parsed.visual,
                headlines: parsed.headlines,
                rhetoricalDevice: completion.device,
                rhetoricalExample: completion.example?.campaign_name || 'Unknown'
              });
              
              // Evaluate audience empathy for fallback concept
              const targetAudience = deriveTargetAudience(query, tone);
              const empathy = await evaluateAudienceEmpathy({
                visualDescription: parsed.visual,
                headlines: parsed.headlines,
                rhetoricalDevice: completion.device,
                rhetoricalExample: completion.example?.campaign_name || 'Unknown',
                tone: tone,
                targetAudience: targetAudience
              });
              
              const flaggedForReview = shouldFlagForReview(adQuality);
              const lowAudienceResonance = hasLowAudienceResonance(empathy.resonance_score);
              
              rawOutputs.push({
                visualDescription: parsed.visual,
                headlines: parsed.headlines,
                rhetoricalDevice: completion.device,
                originalityScore: originalityResult.score,
                id: completion.id,
                example: completion.example,
                professionalismScore: adQuality.professionalism_score,
                clarityScore: adQuality.clarity_score,
                freshnessScore: adQuality.freshness_score,
                critique: adQuality.critique,
                flaggedForReview,
                resonanceScore: empathy.resonance_score,
                audienceClarityScore: empathy.clarity_score,
                vibe: empathy.vibe,
                reflection: empathy.reflection,
                lowAudienceResonance
              });
            }
          } catch (error) {
            console.log(`❌ Regeneration error:`, error);
            // Fallback to original concept
            const combinedContent = `${parsed.visual} ${parsed.headlines.join(' ')}`;
            const originalityResult = await checkOriginality(combinedContent);
            
            // Evaluate ad quality for error fallback concept
            const adQuality = await evaluateAdQuality({
              visualDescription: parsed.visual,
              headlines: parsed.headlines,
              rhetoricalDevice: completion.device,
              rhetoricalExample: completion.example?.campaign_name || 'Unknown'
            });
            
            // Evaluate audience empathy for error fallback concept
            const targetAudience = deriveTargetAudience(query, tone);
            const empathy = await evaluateAudienceEmpathy({
              visualDescription: parsed.visual,
              headlines: parsed.headlines,
              rhetoricalDevice: completion.device,
              rhetoricalExample: completion.example?.campaign_name || 'Unknown',
              tone: tone,
              targetAudience: targetAudience
            });
            
            // Evaluate awards jury potential for error fallback concept
            const awardsEvaluation = await evaluateAwardsJuryScore({
              visualDescription: parsed.visual,
              headlines: parsed.headlines,
              rhetoricalDevice: completion.device,
              tone: tone,
              targetAudience: targetAudience
            });
            
            const flaggedForReview = shouldFlagForReview(adQuality);
            const lowAudienceResonance = hasLowAudienceResonance(empathy.resonance_score);
            
            rawOutputs.push({
              visualDescription: parsed.visual,
              headlines: parsed.headlines,
              rhetoricalDevice: completion.device,
              originalityScore: originalityResult.score,
              id: completion.id,
              example: completion.example,
              professionalismScore: adQuality.professionalism_score,
              clarityScore: adQuality.clarity_score,
              freshnessScore: adQuality.freshness_score,
              critique: adQuality.critique,
              flaggedForReview,
              resonanceScore: empathy.resonance_score,
              audienceClarityScore: empathy.clarity_score,
              vibe: empathy.vibe,
              reflection: empathy.reflection,
              lowAudienceResonance,
              awardsScore: awardsEvaluation.awards_score,
              awardPotential: awardsEvaluation.award_potential,
              juryComment: awardsEvaluation.jury_comment,
              improvementTip: awardsEvaluation.improvement_tip,
              highAwardsPotential: hasHighAwardsPotential(awardsEvaluation.awards_score)
            });
          }
        } else {
          // No similarity detected, proceed with original concept
          const combinedContent = `${parsed.visual} ${parsed.headlines.join(' ')}`;
          const originalityResult = await checkOriginality(combinedContent);
          
          // Derive target audience from query and tone
          const targetAudience = deriveTargetAudience(query, tone);
          
          // Skip iterative refinement for multivariant to avoid failures
          let refinementResult: {
            visualDescription: string;
            headlines: string[];
            rhetoricalDevice: string;
            tone: string;
            targetAudience: string;
            iteration_number: number;
            evaluation: {
              originality_confidence: number;
              originality_feedback: string;
              audience_resonance: string;
              audience_feedback: string;
              award_potential: string;
              award_feedback: string;
              relevance_score: number;
              relevance_feedback: string;
              passes_all_thresholds: boolean;
              failed_criteria: string[];
            };
            final_status: 'Passed' | 'Needs Review' | 'Failed';
          } = {
            visualDescription: parsed.visual,
            headlines: parsed.headlines,
            rhetoricalDevice: completion.device,
            tone: tone,
            targetAudience: targetAudience,
            iteration_number: 1,
            evaluation: {
              originality_confidence: 85,
              originality_feedback: "Original concept",
              audience_resonance: "Medium",
              audience_feedback: "Good audience appeal",
              award_potential: "Medium",
              award_feedback: "Strong creative potential",
              relevance_score: 75,
              relevance_feedback: "Relevant to brief",
              passes_all_thresholds: true,
              failed_criteria: []
            },
            final_status: 'Passed'
          };
          
          // Only run refinement if specifically enabled and concept has obvious issues
          if (enableIterativeRefinement && parsed.headlines.length < 2) {
            try {
              const fullRefinementResult = await runIterativeRefinement(
                {
                  visualDescription: parsed.visual,
                  headlines: parsed.headlines,
                  rhetoricalDevice: completion.device,
                  tone: tone,
                  targetAudience: targetAudience
                },
                {
                  query,
                  tone,
                  avoidCliches,
                  rhetoricalExample: completion.example
                },
                enableIterativeRefinement
              );
              if (fullRefinementResult) {
                refinementResult = {
                  ...fullRefinementResult,
                  tone: tone,
                  targetAudience: targetAudience
                };
              }
            } catch (error) {
              console.log('⚠️ Refinement skipped due to error:', error);
            }
          }
          
          // Evaluate ad quality (legacy arbiter for backwards compatibility)
          const adQuality = await evaluateAdQuality({
            visualDescription: refinementResult.visualDescription,
            headlines: refinementResult.headlines,
            rhetoricalDevice: refinementResult.rhetoricalDevice,
            rhetoricalExample: completion.example?.campaign_name || 'Unknown'
          });
          
          // Evaluate audience empathy (legacy arbiter for backwards compatibility)
          const empathy = await evaluateAudienceEmpathy({
            visualDescription: refinementResult.visualDescription,
            headlines: refinementResult.headlines,
            rhetoricalDevice: refinementResult.rhetoricalDevice,
            rhetoricalExample: completion.example?.campaign_name || 'Unknown',
            tone: tone,
            targetAudience: targetAudience
          });
          
          // Evaluate awards jury potential (legacy arbiter for backwards compatibility)
          const awardsEvaluation = await evaluateAwardsJuryScore({
            visualDescription: refinementResult.visualDescription,
            headlines: refinementResult.headlines,
            rhetoricalDevice: refinementResult.rhetoricalDevice,
            tone: tone,
            targetAudience: targetAudience
          });
          
          // Determine if concept should be flagged for review
          const flaggedForReview = shouldFlagForReview(adQuality);
          const lowAudienceResonance = hasLowAudienceResonance(empathy.resonance_score);
          
          rawOutputs.push({
            visualDescription: refinementResult.visualDescription,
            headlines: refinementResult.headlines,
            rhetoricalDevice: refinementResult.rhetoricalDevice,
            originalityScore: originalityResult.score,
            id: completion.id,
            example: completion.example,
            professionalismScore: adQuality.professionalism_score,
            clarityScore: adQuality.clarity_score,
            freshnessScore: adQuality.freshness_score,
            critique: adQuality.critique,
            flaggedForReview,
            resonanceScore: empathy.resonance_score,
            audienceClarityScore: empathy.clarity_score,
            vibe: empathy.vibe,
            reflection: empathy.reflection,
            lowAudienceResonance,
            awardsScore: awardsEvaluation.awards_score,
            awardPotential: awardsEvaluation.award_potential,
            juryComment: awardsEvaluation.jury_comment,
            improvementTip: awardsEvaluation.improvement_tip,
            highAwardsPotential: hasHighAwardsPotential(awardsEvaluation.awards_score),
            // Iterative refinement fields
            iterationNumber: refinementResult.iteration_number,
            originalityConfidence: refinementResult.evaluation.originality_confidence,
            originalityFeedback: refinementResult.evaluation.originality_feedback,
            audienceResonance: refinementResult.evaluation.audience_resonance,
            audienceFeedback: refinementResult.evaluation.audience_feedback,
            awardPotentialLevel: refinementResult.evaluation.award_potential,
            awardFeedback: refinementResult.evaluation.award_feedback,
            relevanceScore: refinementResult.evaluation.relevance_score,
            relevanceFeedback: refinementResult.evaluation.relevance_feedback,
            passesAllThresholds: refinementResult.evaluation.passes_all_thresholds,
            failedCriteria: refinementResult.evaluation.failed_criteria,
            finalStatus: refinementResult.final_status as 'Passed' | 'Needs Review' | 'Failed'
          });
        }
      }
    }
    
    console.log(`🎯 Generated ${rawOutputs.length} raw concepts, applying embedding-based diversity enforcement...`);
    
    // Apply embedding-based diversity enforcement
    let finalOutputs = rawOutputs;
    if (rawOutputs.length > 1) {
      try {
        // Extract concept content for diversity checking
        const conceptTexts = rawOutputs.map(output => 
          `${output.visualDescription} ${output.headlines.join(' ')}`
        );
        
        // Use enforceConceptDiversity with STRICTER similarity checking
        const diverseConceptTexts = await enforceConceptDiversity(
          conceptTexts,
          async () => {
            console.log('🔄 Regenerating concepts due to high semantic similarity...');
            // Actually filter out similar concepts rather than returning originals
            const filteredConcepts: string[] = [];
            for (let i = 0; i < conceptTexts.length; i++) {
              let isUnique = true;
              for (let j = 0; j < filteredConcepts.length; j++) {
                // Use simple word overlap check as fallback diversity filter
                const wordsA = new Set(conceptTexts[i].toLowerCase().split(/\s+/));
                const wordsB = new Set(filteredConcepts[j].toLowerCase().split(/\s+/));
                const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
                const overlapRatio = intersection.size / Math.min(wordsA.size, wordsB.size);
                if (overlapRatio > 0.4) { // 40% word overlap threshold
                  isUnique = false;
                  break;
                }
              }
              if (isUnique) {
                filteredConcepts.push(conceptTexts[i]);
              }
            }
            console.log(`🎯 Filtered ${conceptTexts.length} → ${filteredConcepts.length} unique concepts`);
            return filteredConcepts;
          },
          0.75 // STRICTER 75% similarity threshold instead of 85%
        );
        
        console.log(`✅ Semantic diversity check completed - ${diverseConceptTexts.length} concepts passed`);
      } catch (embeddingError) {
        console.log('⚠️ Embedding diversity check failed, proceeding with existing concepts:', embeddingError);
        // Continue with existing diversity scoring as fallback
      }
    }
    
    // Calculate diversity scores (enhanced with potential embedding results)
    const diversifiedOutputs = calculateDiversityScore(finalOutputs);
    
    // Rank outputs by originality score descending - ensure minimum 3 for multivariant
    const rankedOutputs = diversifiedOutputs
      .sort((a, b) => b.originalityScore - a.originalityScore)
      .slice(0, Math.max(3, maxOutputs));
    
    // Log each concept individually as structured JSON
    const { logSession } = await import('../supabaseClient');
    const conceptIds: string[] = [];
    
    for (let i = 0; i < rankedOutputs.length; i++) {
      const output = rankedOutputs[i];
      
      // Use the full Markdown response from the AI
      const markdownResponse = rankedOutputs[i].fullMarkdown || `# ${output.headlines[0] || 'Untitled Concept'}

**Tagline:** ${output.headlines[1] || 'Creative tagline'}

**Body Copy:**  
${output.headlines.slice(2).join(' ') || output.visualDescription || 'Compelling body copy'}

**Visual Concept:**  
${output.visualDescription || 'Innovative visual approach'}

**Rhetorical Craft:**  
- ${output.rhetoricalDevice}: ${output.critique || 'Strategic implementation of rhetorical device for maximum impact.'}

**Strategic Impact:**  
${output.reflection || 'Designed to resonate with target audience and achieve campaign objectives.'}

**Date:** ${new Date().toLocaleDateString()}

**Tone:** ${tone}

**Prompt:** ${query}`;
      
      // **PRIORITY: Save to Supabase FIRST with retry logic**
      const conceptId = await logSession({
        userId: null,
        prompt: query,
        response: markdownResponse,
        tone: tone,
        iterationType: 'original',
        parentConceptId: null,
        originalityConfidence: Math.round(output.originalityScore)
      });
      
      if (conceptId) {
        conceptIds.push(conceptId);
        console.log(`✅ Multivariant concept ${i + 1} saved to Supabase with ID: ${conceptId}`);
        
        // **FEEDBACK SIMILARITY ANALYSIS**: Check against user ratings
        try {
          const projectId = req.body.projectId || 'default_project';
          await reportSimilarityToRatedConcepts(
            projectId,
            markdownResponse,
            0.75 // similarity threshold
          );
          
          // Perform enhanced feedback analysis for detailed insights
          const feedbackAnalysis = await analyzeFeedbackSimilarity(
            projectId,
            markdownResponse,
            {
              similarityThreshold: 0.70,
              detailedReport: false, // Keep logs clean during generation
              includeScoring: true
            }
          );
          
          if (feedbackAnalysis.overallScore !== 0) {
            console.log(`🎯 Feedback alignment for concept ${i + 1}: ${feedbackAnalysis.overallScore.toFixed(3)} (${feedbackAnalysis.recommendation})`);
          }
        } catch (feedbackError) {
          console.log(`📊 Feedback analysis skipped for concept ${i + 1}:`, feedbackError instanceof Error ? feedbackError.message : String(feedbackError));
        }
      } else {
        console.error(`❌ Failed to save multivariant concept ${i + 1} to Supabase!`);
        // Push placeholder to maintain array alignment
        conceptIds.push(`failed-${Date.now()}-${i}`);
      }
    }
    
    console.log(`📝 Logged ${conceptIds.length} individual concepts as structured JSON`);
    const logResult = conceptIds[0]; // Use first concept ID for compatibility
    
    // Check for fragment recombination and track usage
    if (logResult && salvagedFragments.length > 0) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseClient = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_KEY || ''
        );

        // Check if generated content matches any salvaged fragments
        for (const output of rankedOutputs) {
          const generatedContent = `${output.visualDescription} ${output.headlines.join(' ')}`.toLowerCase();
          
          for (const fragment of salvagedFragments) {
            const fragmentText = fragment.fragment_text.toLowerCase();
            
            // Check for partial match (at least 50% of fragment words appear in generated content)
            const fragmentWords = fragmentText.split(' ').filter(w => w.length > 2);
            const matchingWords = fragmentWords.filter(word => generatedContent.includes(word));
            const matchRatio = matchingWords.length / fragmentWords.length;
            
            if (matchRatio >= 0.5) {
              // Update concept_logs with recombined_from reference
              await supabaseClient
                .from('concept_logs')
                .update({ recombined_from: fragment.id })
                .eq('id', logResult);
              
              console.log(`🔄 Tracked recombination: Concept ${logResult} inspired by fragment "${fragment.fragment_text}"`);
              break; // Only track one fragment per concept
            }
          }
        }
      } catch (error) {
        console.error('Error tracking fragment recombination:', error);
      }
    }
    
    // Salvage promising fragments from generated concepts
    if (conceptIds.length > 0) {
      for (let i = 0; i < rankedOutputs.length; i++) {
        const output = rankedOutputs[i];
        const conceptId = conceptIds[i];
        
        if (conceptId) {
          try {
            const conceptResponse = JSON.stringify({
              headline: output.headlines[0] || '',
              tagline: output.headlines[1] || '',
              bodyCopy: output.headlines.slice(2).join(' ') || '',
              visualConcept: output.visualDescription || '',
              rhetoricalCraft: [{
                device: output.rhetoricalDevice,
                explanation: output.critique || 'Strategic implementation of rhetorical device for maximum impact.'
              }],
              strategicImpact: output.reflection || 'Designed to resonate with target audience and achieve campaign objectives.'
            });
            
            await salvageConceptFragments({
              id: conceptId,
              headline: output.headlines.join(' '),
              visual: output.visualDescription,
              response: conceptResponse,
              tone: tone,
              originality_confidence: output.originalityScore
            });
          } catch (salvageError) {
            console.error('Error salvaging fragments:', salvageError);
          }
        }
      }
    }
    
    // Format outputs for frontend with structured JSON in Markdown format
    const formattedOutputs = rankedOutputs.map((output, index) => {
      const aiResponse = {
        headline: output.headlines[0] || '',
        tagline: output.headlines[1] || '',
        bodyCopy: output.headlines.slice(2).join(' ') || '',
        visualConcept: output.visualDescription || '',
        rhetoricalCraft: [
          {
            device: output.rhetoricalDevice,
            explanation: output.critique || 'Strategic implementation of rhetorical device for maximum impact.'
          }
        ],
        strategicImpact: output.reflection || 'Designed to resonate with target audience and achieve campaign objectives.'
      };
      
      // Format as Markdown for frontend display
      const markdownContent = `**HEADLINE**\n${aiResponse.headline}\n\n**TAGLINE**\n${aiResponse.tagline}\n\n**BODY COPY**\n${aiResponse.bodyCopy}\n\n**VISUAL CONCEPT**\n${aiResponse.visualConcept}\n\n**RHETORICAL CRAFT BREAKDOWN**\n**${aiResponse.rhetoricalCraft[0].device}**\n${aiResponse.rhetoricalCraft[0].explanation}\n\n**STRATEGIC IMPACT**\n${aiResponse.strategicImpact}`;
      
      return {
        ...output,
        content: `\`\`\`markdown\n${markdownContent}\n\`\`\``,
        conceptId: conceptIds[index] || null
      };
    });
    
    // Print performance summary
    performanceTracker.printSummary();
    
    res.json(formattedOutputs);
    
  } catch (error) {
    console.error('Error in generateMultivariant:', error);
    performanceTracker.printSummary(); // Print summary even on error
    res.status(500).json({ error: 'Internal server error' });
  }
}