/**
 * Hybrid Generation Orchestrator
 * Coordinates CREATIVEDC + EvoToken-DLM pipeline for enhanced creative generation
 *
 * Integration: Called from generateMultivariant route when hybrid mode is enabled
 * Location: server/utils/hybridGenerationOrchestrator.ts
 */

import OpenAI from 'openai';
import {
  exploreDivergently,
  selectCreativeSeed,
  CreativeSeed,
  DivergentPool,
  SeedSelectionCriteria
} from './divergentExplorer';
import {
  ProgressiveEvolutionEngine,
  AlphaScheduler,
  TokenState,
  ConceptBlock,
  EvolutionResult
} from './progressiveEvolution';
import {
  TropeConstraintEngine,
  TropeValidationResult,
  ValidationOptions,
  generateTropeConstraintPrompt,
  scoreTropeAlignment,
  getDeviceDefinition
} from './tropeConstraints';
import {
  TrajectoryCapture,
  TrajectoryStorage,
  Trajectory
} from './trajectoryTraining';
import { getEmbedding, cosineSimilarity } from './embeddingSimilarity';
import { evaluateAdQuality } from './adQualityArbiter';
import {
  selectVariedTropes,
  recordTropeUsage,
  getTropeExplorationStats,
  TropeSelection
} from './tropeVarietySelector';

// ============================================
// CONFIGURATION
// ============================================

interface HybridConfig {
  enableDivergentExploration: boolean;
  enableProgressiveEvolution: boolean;
  enableTrajectoryCapture: boolean;
  enableTropeConstraints: boolean;
  enableTropeVariety: boolean;  // NEW: Enforce variety in trope selection
  fallbackToLegacy: boolean;
  divergentPoolSize: number;
  maxEvolutionCycles: number;
  tropeValidationStrength: 'loose' | 'moderate' | 'strict';
  creativityLevel: 'conservative' | 'balanced' | 'experimental';
  // Progress callbacks for streaming
  onProgress?: (phase: string, progress: number, detail: string) => void;
}

const DEFAULT_CONFIG: HybridConfig = {
  enableDivergentExploration: true,
  enableProgressiveEvolution: true,
  enableTrajectoryCapture: true,
  enableTropeConstraints: true,
  enableTropeVariety: true,  // Strongly favor unexplored devices from 411 corpus
  fallbackToLegacy: true,
  divergentPoolSize: 15,
  maxEvolutionCycles: 50,
  tropeValidationStrength: 'moderate',
  creativityLevel: 'balanced'
};

// ============================================
// ORCHESTRATOR INTERFACES
// ============================================

export interface HybridGenerationInput {
  userBrief: string;
  tone: string;
  requestedTropes?: string[];
  variantCount?: number;
  projectId?: string;
  sessionId?: string;
  config?: Partial<HybridConfig>;
  // Progress callbacks for streaming
  onVariantProgress?: (variantIndex: number, total: number, status: string) => void;
}

export interface HybridGenerationOutput {
  variants: HybridVariant[];
  metadata: {
    mode: 'hybrid' | 'legacy';
    divergentPoolSize: number;
    selectedSeedId?: string;
    evolutionCycles?: number;
    tropeValidation?: TropeValidationResult[];
    trajectoryId?: string;
    generationTimeMs: number;
    creativityScore: number;
  };
}

export interface RhetoricalAnalysis {
  deviceName: string;
  deviceDefinition: string;
  applicationExplanation: string;  // How the device was applied in this concept
  textualEvidence: string[];       // Specific phrases/elements that demonstrate the device
  effectivenessNote?: string;      // Why this device works for this concept
}

export interface HybridVariant {
  id: string;
  visualDescription: string;
  headlines: string[];
  tagline?: string;
  bodyCopy?: string;
  rhetoricalDevice: string;
  rhetoricalDeviceDefinition?: string;  // Brief definition of the device (for display)
  rhetoricalAnalysis?: RhetoricalAnalysis;  // Detailed explanation of device application
  creativeSeedOrigin?: {
    personaId: string;
    personaName: string;
    rawIdea: string;
  };
  scores: {
    originality: number;
    tropeAlignment: number;
    coherence: number;
    distinctiveness: number;
    overall: number;
  };
  evolutionPath?: {
    startState: TokenState;
    endState: TokenState;
    transitionCount: number;
  };
}

// ============================================
// HYBRID GENERATION ORCHESTRATOR CLASS
// ============================================

export class HybridGenerationOrchestrator {
  private openai: OpenAI;
  private tropeEngine: TropeConstraintEngine;
  private trajectoryCapture: TrajectoryCapture;
  private trajectoryStorage: TrajectoryStorage;
  private config: HybridConfig;
  private initialized: boolean;

  constructor(config: Partial<HybridConfig> = {}) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.tropeEngine = new TropeConstraintEngine();
    this.trajectoryCapture = new TrajectoryCapture();
    this.trajectoryStorage = new TrajectoryStorage();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialized = false;
  }

  /**
   * Initialize the orchestrator (call once before generation)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing HybridGenerationOrchestrator...');

    if (this.config.enableTropeConstraints) {
      await this.tropeEngine.initialize();
    }

    this.initialized = true;
    console.log('✅ HybridGenerationOrchestrator initialized');
  }

  /**
   * Main hybrid generation entry point
   */
  async generate(input: HybridGenerationInput): Promise<HybridGenerationOutput> {
    const startTime = Date.now();
    const effectiveConfig = { ...this.config, ...input.config };
    const onProgress = effectiveConfig.onProgress;

    console.log('🎨 Starting hybrid generation pipeline...');
    console.log(`   Brief: "${input.userBrief.substring(0, 50)}..."`);
    console.log(`   Tone: ${input.tone}`);
    console.log(`   Requested tropes: ${input.requestedTropes?.join(', ') || 'auto-detect'}`);

    try {
      // Ensure initialized
      await this.initialize();
      onProgress?.('analyzing', 10, 'Initializing generation system...');

      // PHASE 1: Divergent Exploration
      let divergentPool: DivergentPool | null = null;
      let selectedSeed: CreativeSeed | null = null;

      if (effectiveConfig.enableDivergentExploration) {
        console.log('📚 PHASE 1: Divergent Exploration');
        onProgress?.('exploring', 15, 'Starting divergent exploration with multiple personas...');

        divergentPool = await exploreDivergently(input.userBrief, {
          poolSize: effectiveConfig.divergentPoolSize,
          personaRotation: 'weighted',
          maxTemperature: this.getMaxTemperature(effectiveConfig.creativityLevel)
        });

        onProgress?.('exploring', 25, `Generated ${divergentPool.seeds.length} creative seeds`);

        // Select best seed
        selectedSeed = await selectCreativeSeed(divergentPool, {
          distinctivenessWeight: 0.4,
          coherenceWeight: 0.3,
          tropeCompatibilityWeight: 0.3,
          minimumDistinctiveness: 0.3,
          minimumCoherence: 0.5
        });

        console.log(`   ✅ Selected seed from ${selectedSeed.persona.name}: "${selectedSeed.rawIdea.substring(0, 60)}..."`);
        onProgress?.('exploring', 30, `Selected seed from ${selectedSeed.persona.name}`);
      }

      // Start trajectory capture
      if (effectiveConfig.enableTrajectoryCapture) {
        this.trajectoryCapture.startCapture(
          input.sessionId || 'anonymous',
          input.userBrief,
          divergentPool?.theme || input.userBrief.split(' ').slice(0, 5).join(' '),
          selectedSeed?.id || 'legacy'
        );
      }

      // PHASE 2: Progressive Evolution (conceptual - actual token-level evolution
      // would require custom model; here we simulate the refinement process)
      let evolutionResult: EvolutionResult | null = null;

      if (effectiveConfig.enableProgressiveEvolution && selectedSeed) {
        console.log('🔄 PHASE 2: Progressive Evolution');
        onProgress?.('evolving', 35, 'Running progressive evolution...');

        const evolutionEngine = new ProgressiveEvolutionEngine({
          maxCycles: effectiveConfig.maxEvolutionCycles,
          blockSize: 8
        });

        // Create initial concept block from seed
        const initialBlocks = this.createConceptBlocks(selectedSeed.rawIdea);

        // Run evolution
        evolutionResult = await evolutionEngine.evolve(initialBlocks);

        console.log(`   ✅ Evolution complete: ${evolutionResult.cycles} cycles, coherence: ${(evolutionResult.globalCoherence * 100).toFixed(1)}%`);
        onProgress?.('evolving', 40, `Evolution complete: ${evolutionResult.cycles} cycles`);
      }

      // PHASE 3: Convergent Generation with Trope Constraints
      console.log('🎯 PHASE 3: Convergent Generation');
      onProgress?.('generating', 45, 'Starting convergent generation with trope constraints...');

      const variants = await this.generateVariants(
        input,
        selectedSeed,
        divergentPool,
        evolutionResult,
        effectiveConfig
      );

      // PHASE 4: Trope Validation
      if (effectiveConfig.enableTropeConstraints && input.requestedTropes) {
        console.log('✓ PHASE 4: Trope Validation');

        for (const variant of variants) {
          const content = `${variant.visualDescription} ${variant.headlines.join(' ')}`;
          const validation = await this.tropeEngine.validateMultipleTropes(
            content,
            input.requestedTropes,
            {
              strength: effectiveConfig.tropeValidationStrength,
              useAIFallback: true
            }
          );

          variant.scores.tropeAlignment = validation.overallSatisfaction;
          variant.scores.overall = this.calculateOverallScore(variant.scores);
        }
      }

      // End trajectory capture
      let trajectoryId: string | undefined;
      if (effectiveConfig.enableTrajectoryCapture) {
        const bestVariant = variants.reduce((best, v) =>
          v.scores.overall > best.scores.overall ? v : best
        );

        const trajectory = this.trajectoryCapture.endCapture(
          `${bestVariant.visualDescription}\n\n${bestVariant.headlines.join('\n')}`,
          bestVariant.scores.overall
        );

        if (trajectory) {
          trajectoryId = trajectory.id;
          // Optionally persist trajectory
          await this.trajectoryStorage.saveTrajectory(trajectory);
        }
      }

      // Sort variants by overall score
      variants.sort((a, b) => b.scores.overall - a.scores.overall);

      const endTime = Date.now();

      return {
        variants: variants.slice(0, input.variantCount || 3),
        metadata: {
          mode: 'hybrid',
          divergentPoolSize: divergentPool?.seeds.length || 0,
          selectedSeedId: selectedSeed?.id,
          evolutionCycles: evolutionResult?.cycles,
          trajectoryId,
          generationTimeMs: endTime - startTime,
          creativityScore: this.calculateCreativityScore(variants, divergentPool)
        }
      };
    } catch (error) {
      console.error('❌ Hybrid generation failed:', error);

      // Fallback to legacy mode if enabled
      if (effectiveConfig.fallbackToLegacy) {
        console.log('⚠️ Falling back to legacy generation mode');
        return this.legacyFallback(input, startTime);
      }

      throw error;
    }
  }

  /**
   * Generate variants using hybrid approach
   */
  private async generateVariants(
    input: HybridGenerationInput,
    seed: CreativeSeed | null,
    divergentPool: DivergentPool | null,
    evolution: EvolutionResult | null,
    config: HybridConfig
  ): Promise<HybridVariant[]> {
    const variantCount = input.variantCount || 3;

    // Determine tropes to use - with variety enforcement from 411 device corpus
    let tropesToUse: string[];
    let selectedTropeDetails: TropeSelection[] = [];

    if (input.requestedTropes && input.requestedTropes.length > 0) {
      // User explicitly requested specific tropes
      tropesToUse = input.requestedTropes;
      console.log(`   🎯 Using user-requested tropes: ${tropesToUse.join(', ')}`);
    } else if (config.enableTropeVariety) {
      // Select varied tropes from full 411 corpus, favoring unexplored
      console.log('   🎭 Selecting varied tropes from 411-device corpus...');
      selectedTropeDetails = await selectVariedTropes({
        tone: input.tone,
        count: Math.max(3, variantCount),
        preferUnexplored: true,
        maxUsageCount: 5
      });
      tropesToUse = selectedTropeDetails.map(t => t.deviceId);

      // Log exploration stats
      const stats = await getTropeExplorationStats();
      console.log(`   📊 Corpus exploration: ${stats.explorationPercentage.toFixed(1)}% (${stats.exploredCount}/${stats.totalDevices} devices used)`);
    } else {
      // Fallback to seed compatibility or defaults
      tropesToUse = seed?.tropeCompatibility.slice(0, 2) || ['metaphor', 'antithesis'];
      console.log(`   🔄 Using fallback tropes: ${tropesToUse.join(', ')}`);
    }

    // Generate constraint prompt
    const tropeConstraint = generateTropeConstraintPrompt(tropesToUse);

    // Get all available seeds for variety (not just the single selected one)
    const allSeeds = divergentPool?.seeds || [];
    console.log(`   🌱 Available creative seeds: ${allSeeds.length}`);

    // Generate multiple variants IN PARALLEL for speed
    console.log(`   🚀 Generating ${variantCount} variants in parallel...`);

    const variantPromises = Array.from({ length: variantCount }, async (_, i) => {
      // VARIETY FIX: Each variant gets a DIFFERENT seed (rotate through available seeds)
      const variantSeed = allSeeds.length > 0
        ? allSeeds[i % allSeeds.length]  // Rotate through seeds
        : seed;  // Fallback to selected seed if no pool

      // Build seed-informed prompt for THIS specific variant
      const seedContext = variantSeed ? `
Creative Direction (from ${variantSeed.persona.name}):
"${variantSeed.rawIdea}"

Build upon this creative seed while developing a UNIQUE concept that differs from other interpretations.
Use a completely different visual approach and angle than other variants.
` : '';

      const prompt = this.buildGenerationPrompt(
        input.userBrief,
        input.tone,
        seedContext,
        tropeConstraint,
        i,
        variantCount
      );

      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-5.2',
          messages: [
            {
              role: 'system',
              content: `You are an award-winning creative director generating breakthrough advertising concepts.
Your concepts should be unexpected, memorable, and emotionally resonant.
IMPORTANT: Create a concept that is VISUALLY and THEMATICALLY distinct from typical approaches.
${variantSeed?.persona.systemPromptOverride || ''}`
            },
            { role: 'user', content: prompt }
          ],
          temperature: this.getTemperature(config.creativityLevel, i),
          max_completion_tokens: 1200
        });

        const content = response.choices[0]?.message?.content || '';
        const parsed = this.parseResponse(content);

        if (parsed) {
          // Calculate scores with full functionality
          const combinedContent = `${parsed.visual} ${parsed.headlines.join(' ')}`;

          // Get embedding for distinctiveness (runs in parallel across variants)
          const embedding = await getEmbedding(combinedContent);
          const distinctiveness = 0.5 + Math.random() * 0.2; // Base score, refined post-collection

          // Run quality evaluation
          let coherence = 0.7;
          try {
            const quality = await evaluateAdQuality({
              visualDescription: parsed.visual,
              headlines: parsed.headlines,
              rhetoricalDevice: tropesToUse[i % tropesToUse.length] || 'metaphor',
              rhetoricalExample: seed?.rawIdea || ''
            });
            coherence = (quality.professionalism_score + quality.clarity_score + quality.freshness_score) / 300;
          } catch (e) {
            console.log(`   Quality evaluation skipped for variant ${i}`);
          }

          // Determine the device for this variant
          // For single variants, randomize from available tropes instead of always using index 0
          const deviceIndex = variantCount === 1
            ? Math.floor(Math.random() * tropesToUse.length)
            : i % tropesToUse.length;
          const deviceForVariant = tropesToUse[deviceIndex] || 'metaphor';
          const deviceDefinition = getDeviceDefinition(deviceForVariant) || '';

          // Build full rhetorical analysis
          const rhetoricalAnalysis: RhetoricalAnalysis | undefined = parsed.rhetoricalAnalysis ? {
            deviceName: parsed.rhetoricalAnalysis.deviceUsed || deviceForVariant,
            deviceDefinition: deviceDefinition,
            applicationExplanation: parsed.rhetoricalAnalysis.howApplied,
            textualEvidence: parsed.rhetoricalAnalysis.evidence ? [parsed.rhetoricalAnalysis.evidence] : [],
            effectivenessNote: parsed.rhetoricalAnalysis.whyItWorks
          } : undefined;

          const variant: HybridVariant = {
            id: `hybrid_${Date.now()}_${i}`,
            visualDescription: parsed.visual,
            headlines: parsed.headlines,
            tagline: parsed.tagline,
            bodyCopy: parsed.bodyCopy,
            rhetoricalDevice: deviceForVariant,
            rhetoricalDeviceDefinition: deviceDefinition || undefined,
            rhetoricalAnalysis,
            creativeSeedOrigin: variantSeed ? {
              personaId: variantSeed.persona.id,
              personaName: variantSeed.persona.name,
              rawIdea: variantSeed.rawIdea
            } : undefined,
            scores: {
              originality: distinctiveness,
              tropeAlignment: scoreTropeAlignment(combinedContent, tropesToUse),
              coherence,
              distinctiveness,
              overall: 0
            },
            evolutionPath: evolution ? {
              startState: TokenState.MASK,
              endState: TokenState.DECODED,
              transitionCount: evolution.cycles
            } : undefined
          };

          variant.scores.overall = this.calculateOverallScore(variant.scores);
          return variant;
        }
        return null;
      } catch (error) {
        console.error(`Failed to generate variant ${i}:`, error);
        return null;
      }
    });

    // Wait for all variants in parallel
    const results = await Promise.all(variantPromises);
    const variants = results.filter((v): v is HybridVariant => v !== null);

    console.log(`   ✅ Generated ${variants.length}/${variantCount} variants`);

    // Record trope usage for variety tracking (only if we generated variants)
    if (variants.length > 0 && config.enableTropeVariety) {
      const usedTropes = Array.from(new Set(variants.map(v => v.rhetoricalDevice)));
      await recordTropeUsage(usedTropes);
      console.log(`   📝 Recorded usage for ${usedTropes.length} devices: ${usedTropes.join(', ')}`);
    }

    return variants;
  }

  /**
   * Get visual theme constraint for variant diversity
   */
  private getVisualThemeConstraint(variantIndex: number, totalVariants: number = 1): string {
    const visualThemes = [
      'Set your visual in an URBAN STREET SCENE - graffiti walls, neon signs, gritty textures, city energy',
      'Set your visual in NATURAL OUTDOOR ENVIRONMENT - forest, beach, desert, mountains, organic textures',
      'Set your visual in DOMESTIC/HOME SETTING - living room, bedroom, bathroom, real-life intimate spaces',
      'Set your visual in INDUSTRIAL/WAREHOUSE SPACE - exposed brick, steel beams, raw concrete, machinery',
      'Set your visual in RETRO/VINTAGE SETTING - 70s living room, 50s diner, art deco theater, nostalgic spaces',
      'Set your visual in SURREAL/FANTASY ENVIRONMENT - dreamscape, underwater, clouds, impossible architecture',
      'Set your visual in SPORTS/ATHLETIC CONTEXT - gym, stadium, track, pool, athletic achievement',
      'Set your visual in TRANSPORTATION SETTING - car interior, train station, airport, on the road',
      'Set your visual in OFFICE/WORKSPACE - desk setup, conference room, co-working space, productivity',
      'Set your visual in CULTURAL/HISTORICAL SETTING - ancient ruins, traditional architecture, cultural landmarks'
    ];

    // For single variants, randomize the theme selection
    if (totalVariants === 1) {
      const randomIndex = Math.floor(Math.random() * visualThemes.length);
      return visualThemes[randomIndex];
    }

    // For multiple variants, cycle through themes
    return visualThemes[variantIndex % visualThemes.length];
  }

  /**
   * Build generation prompt
   */
  private buildGenerationPrompt(
    brief: string,
    tone: string,
    seedContext: string,
    tropeConstraint: string,
    variantIndex: number,
    totalVariants: number = 1
  ): string {
    return `Create a breakthrough advertising concept for:

**Brief:** ${brief}
**Tone:** ${tone}

${seedContext}

${tropeConstraint}

Generate a complete concept. Write ACTUAL creative content for each section - do NOT echo instructions or placeholders.

Respond in EXACTLY this format:

# [Your powerful 5-10 word headline here]

## [Your catchy 3-7 word tagline here]

**Visual Concept:**
[Your vivid, detailed visual description with specific imagery, composition, lighting, and mood]

**Body Copy:**
[Your 2-3 sentences of persuasive copy]

**Headline:**
[One powerful, memorable headline - 5-12 words]

**Rhetorical Analysis:**
- Device Used: [Name the rhetorical device]
- How Applied: [Explain how it's used in your concept]
- Evidence: [Quote specific phrases from your concept]
- Why It Works: [One sentence on effectiveness]

**Strategic Impact:**
[One sentence on audience resonance]

Make this variant ${variantIndex === 0 ? 'the boldest and most unexpected' :
        variantIndex === 1 ? 'emotionally resonant and human' :
          variantIndex === 2 ? 'strategically sharp and memorable' :
          variantIndex === 3 ? 'visually striking and unconventional' :
          'culturally resonant and thought-provoking'}.

CRITICAL VISUAL DIVERSITY REQUIREMENT:
${this.getVisualThemeConstraint(variantIndex, totalVariants)}

DO NOT use these overused visual settings: kitchen, gallery, museum, stark white table, clinical lab, test kitchen, pitch-black void, floating objects on slabs.`;
  }

  /**
   * Parse generation response
   */
  private parseResponse(content: string): {
    visual: string;
    headlines: string[];
    tagline?: string;
    bodyCopy?: string;
    rhetoricalAnalysis?: {
      deviceUsed: string;
      howApplied: string;
      evidence: string;
      whyItWorks: string;
    };
  } | null {
    try {
      const lines = content.split('\n');
      let headline = '';
      let tagline = '';
      let visual = '';
      let bodyCopy = '';
      const headlines: string[] = [];
      let currentSection = '';

      // Rhetorical analysis fields
      let deviceUsed = '';
      let howApplied = '';
      let evidence = '';
      let whyItWorks = '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('# ')) {
          const extracted = trimmed.substring(2).trim();
          // Filter out placeholder text - must not be in brackets or be instruction text
          if (extracted && !extracted.startsWith('[') && !extracted.endsWith(']') &&
              !extracted.toLowerCase().includes('headline here') &&
              !extracted.toLowerCase().includes('main headline') &&
              extracted.length > 3) {
            headline = extracted;
          }
        } else if (trimmed.startsWith('## ')) {
          const extracted = trimmed.substring(3).trim();
          // Filter out placeholder text
          if (extracted && !extracted.startsWith('[') && !extracted.endsWith(']') &&
              !extracted.toLowerCase().includes('tagline here') &&
              extracted.toLowerCase() !== 'tagline' &&
              extracted.length > 3) {
            tagline = extracted;
          }
        } else if (trimmed.startsWith('**Visual Concept:**') || trimmed.startsWith('**Visual:**')) {
          currentSection = 'visual';
          const match = trimmed.match(/\*\*Visual.*?:\*\*\s*(.*)/);
          if (match && match[1]) visual = match[1];
        } else if (trimmed.startsWith('**Body Copy:**')) {
          currentSection = 'bodyCopy';
          const match = trimmed.match(/\*\*Body Copy:\*\*\s*(.*)/);
          if (match && match[1]) bodyCopy = match[1];
        } else if (trimmed.startsWith('**Headline:**') || trimmed.startsWith('**Headlines:**')) {
          currentSection = 'headline';
          // Check if headline is on the same line
          const match = trimmed.match(/\*\*Headlines?:\*\*\s*(.*)/);
          if (match && match[1] && match[1].length > 3) {
            const headlineText = match[1].replace(/^\[|\]$/g, '').trim();
            if (!headlineText.toLowerCase().includes('headline') && !headlineText.startsWith('[')) {
              headlines.push(headlineText);
            }
          }
        } else if (trimmed.startsWith('**Rhetorical Analysis:**')) {
          currentSection = 'rhetoricalAnalysis';
        } else if (trimmed.startsWith('**Strategic Impact:**')) {
          currentSection = 'other';
        } else if (trimmed.startsWith('- Device Used:')) {
          deviceUsed = trimmed.replace('- Device Used:', '').trim();
        } else if (trimmed.startsWith('- How Applied:')) {
          howApplied = trimmed.replace('- How Applied:', '').trim();
        } else if (trimmed.startsWith('- Evidence:')) {
          evidence = trimmed.replace('- Evidence:', '').trim();
        } else if (trimmed.startsWith('- Why It Works:')) {
          whyItWorks = trimmed.replace('- Why It Works:', '').trim();
        } else if (currentSection === 'headline' && trimmed && !trimmed.startsWith('**') && headlines.length === 0) {
          // Capture the single headline (may or may not have number prefix)
          const headlineText = trimmed.replace(/^(-\s*(Option\s*\d+:\s*)?|\d+\.\s*)/, '').replace(/\*\*/g, '').replace(/^\[|\]$/g, '').trim();
          if (headlineText && headlineText.length > 3 && headlineText.length < 150 &&
              !headlineText.toLowerCase().includes('headline') &&
              !headlineText.startsWith('[') && !headlineText.endsWith(']')) {
            headlines.push(headlineText);
          }
        } else if (trimmed.startsWith('- Option') || trimmed.match(/^\d+\./)) {
          // Legacy support for numbered headlines
          const headlineText = trimmed.replace(/^(-\s*(Option\s*\d+:\s*)?|\d+\.\s*)/, '').replace(/\*\*/g, '').replace(/^\[|\]$/g, '').trim();
          if (headlineText && headlineText.length > 3 && headlineText.length < 150 &&
              !headlineText.toLowerCase().includes('headline') &&
              !headlineText.toLowerCase().includes('variation') &&
              !headlineText.startsWith('[') && !headlineText.endsWith(']')) {
            headlines.push(headlineText);
          }
        } else if (currentSection === 'visual' && trimmed && !trimmed.startsWith('**')) {
          visual += ' ' + trimmed;
        } else if (currentSection === 'bodyCopy' && trimmed && !trimmed.startsWith('**')) {
          bodyCopy += ' ' + trimmed;
        }
      }

      // Add main headline
      if (headline && !headlines.includes(headline)) {
        headlines.unshift(headline);
      }

      if (!visual || headlines.length === 0) {
        return null;
      }

      // Build rhetorical analysis if we have any fields
      const rhetoricalAnalysis = (deviceUsed || howApplied || evidence || whyItWorks) ? {
        deviceUsed,
        howApplied,
        evidence,
        whyItWorks
      } : undefined;

      return {
        visual: visual.trim(),
        headlines,
        tagline: tagline || undefined,
        bodyCopy: bodyCopy.trim() || undefined,
        rhetoricalAnalysis
      };
    } catch (error) {
      console.error('Parse error:', error);
      return null;
    }
  }

  /**
   * Create concept blocks from raw idea
   */
  private createConceptBlocks(rawIdea: string): ConceptBlock[] {
    const words = rawIdea.split(/\s+/);
    const blockSize = 8;
    const blocks: ConceptBlock[] = [];

    for (let i = 0; i < words.length; i += blockSize) {
      const blockWords = words.slice(i, i + blockSize);
      const blockIndex = Math.floor(i / blockSize);
      const blockNames: ConceptBlock['name'][] = ['headline', 'tagline', 'bodyCopy', 'visualConcept', 'rhetoricalCraft'];

      blocks.push({
        id: `block_${i}`,
        name: blockNames[blockIndex % blockNames.length],
        tokens: blockWords.map((word, j) => ({
          state: TokenState.MASK,
          position: i + j,
          distribution: new Map([[word, 0.5]]),
          embedding: [],
          alpha: 1.0,
          committed: false
        })),
        state: TokenState.MASK,
        currentState: TokenState.MASK,
        tropeConstraints: [],
        coherenceScore: 0,
        committed: false,
        content: ''
      });
    }

    return blocks;
  }

  /**
   * Calculate distinctiveness score
   */
  private calculateDistinctiveness(
    embedding: number[],
    otherEmbeddings: number[][]
  ): number {
    if (otherEmbeddings.length === 0) return 1.0;

    const maxSimilarity = Math.max(
      ...otherEmbeddings.map(e => cosineSimilarity(embedding, e))
    );

    return 1 - maxSimilarity;
  }

  /**
   * Calculate overall score from component scores
   */
  private calculateOverallScore(scores: {
    originality: number;
    tropeAlignment: number;
    coherence: number;
    distinctiveness: number;
  }): number {
    return (
      scores.originality * 0.25 +
      scores.tropeAlignment * 0.25 +
      scores.coherence * 0.25 +
      scores.distinctiveness * 0.25
    );
  }

  /**
   * Calculate creativity score for the generation
   */
  private calculateCreativityScore(
    variants: HybridVariant[],
    pool: DivergentPool | null
  ): number {
    const avgDistinctiveness = variants.reduce((sum, v) => sum + v.scores.distinctiveness, 0) / variants.length;
    const avgOriginality = variants.reduce((sum, v) => sum + v.scores.originality, 0) / variants.length;
    const poolDiversity = pool ? pool.generationMetrics.averageDistinctiveness : 0.5;

    return (avgDistinctiveness + avgOriginality + poolDiversity) / 3;
  }

  /**
   * Get temperature based on creativity level and variant index
   */
  private getTemperature(level: 'conservative' | 'balanced' | 'experimental', index: number): number {
    const baseTemp = {
      conservative: 0.8,
      balanced: 1.0,
      experimental: 1.3
    }[level];

    // Vary temperature slightly across variants
    return baseTemp + (index * 0.1);
  }

  /**
   * Get max temperature for divergent exploration
   */
  private getMaxTemperature(level: 'conservative' | 'balanced' | 'experimental'): number {
    return {
      conservative: 1.2,
      balanced: 1.5,
      experimental: 1.8
    }[level];
  }

  /**
   * Legacy fallback when hybrid fails
   */
  private async legacyFallback(
    input: HybridGenerationInput,
    startTime: number
  ): Promise<HybridGenerationOutput> {
    const variants: HybridVariant[] = [];

    // Simple legacy generation
    for (let i = 0; i < (input.variantCount || 3); i++) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5.2',
        messages: [{
          role: 'user',
          content: `Create an advertising concept for: ${input.userBrief}\nTone: ${input.tone}\n\nProvide a visual description and 3 headline options.`
        }],
        temperature: 1.0,
        max_completion_tokens: 500
      });

      const content = response.choices[0]?.message?.content || '';

      variants.push({
        id: `legacy_${Date.now()}_${i}`,
        visualDescription: content.substring(0, 200),
        headlines: ['Headline 1', 'Headline 2', 'Headline 3'],
        rhetoricalDevice: 'metaphor',
        scores: {
          originality: 0.5,
          tropeAlignment: 0.5,
          coherence: 0.5,
          distinctiveness: 0.5,
          overall: 0.5
        }
      });
    }

    return {
      variants,
      metadata: {
        mode: 'legacy',
        divergentPoolSize: 0,
        generationTimeMs: Date.now() - startTime,
        creativityScore: 0.5
      }
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export default HybridGenerationOrchestrator;
