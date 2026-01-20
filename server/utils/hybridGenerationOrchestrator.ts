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
  scoreTropeAlignment
} from './tropeConstraints';
import {
  TrajectoryCapture,
  TrajectoryStorage,
  Trajectory
} from './trajectoryTraining';
import { getEmbedding, cosineSimilarity } from './embeddingSimilarity';
import { evaluateAdQuality } from './adQualityArbiter';

// ============================================
// CONFIGURATION
// ============================================

interface HybridConfig {
  enableDivergentExploration: boolean;
  enableProgressiveEvolution: boolean;
  enableTrajectoryCapture: boolean;
  enableTropeConstraints: boolean;
  fallbackToLegacy: boolean;
  divergentPoolSize: number;
  maxEvolutionCycles: number;
  tropeValidationStrength: 'loose' | 'moderate' | 'strict';
  creativityLevel: 'conservative' | 'balanced' | 'experimental';
}

const DEFAULT_CONFIG: HybridConfig = {
  enableDivergentExploration: true,
  enableProgressiveEvolution: true,
  enableTrajectoryCapture: true,
  enableTropeConstraints: true,
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

export interface HybridVariant {
  id: string;
  visualDescription: string;
  headlines: string[];
  tagline?: string;
  bodyCopy?: string;
  rhetoricalDevice: string;
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

    console.log('🎨 Starting hybrid generation pipeline...');
    console.log(`   Brief: "${input.userBrief.substring(0, 50)}..."`);
    console.log(`   Tone: ${input.tone}`);
    console.log(`   Requested tropes: ${input.requestedTropes?.join(', ') || 'auto-detect'}`);

    try {
      // Ensure initialized
      await this.initialize();

      // PHASE 1: Divergent Exploration
      let divergentPool: DivergentPool | null = null;
      let selectedSeed: CreativeSeed | null = null;

      if (effectiveConfig.enableDivergentExploration) {
        console.log('📚 PHASE 1: Divergent Exploration');

        divergentPool = await exploreDivergently(input.userBrief, {
          poolSize: effectiveConfig.divergentPoolSize,
          personaRotation: 'weighted',
          maxTemperature: this.getMaxTemperature(effectiveConfig.creativityLevel)
        });

        // Select best seed
        selectedSeed = await selectCreativeSeed(divergentPool, {
          distinctivenessWeight: 0.4,
          coherenceWeight: 0.3,
          tropeCompatibilityWeight: 0.3,
          minimumDistinctiveness: 0.3,
          minimumCoherence: 0.5
        });

        console.log(`   ✅ Selected seed from ${selectedSeed.persona.name}: "${selectedSeed.rawIdea.substring(0, 60)}..."`);
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

        const evolutionEngine = new ProgressiveEvolutionEngine({
          maxCycles: effectiveConfig.maxEvolutionCycles,
          blockSize: 8
        });

        // Create initial concept block from seed
        const initialBlocks = this.createConceptBlocks(selectedSeed.rawIdea);

        // Run evolution
        evolutionResult = await evolutionEngine.evolve(initialBlocks);

        console.log(`   ✅ Evolution complete: ${evolutionResult.cycles} cycles, coherence: ${(evolutionResult.globalCoherence * 100).toFixed(1)}%`);
      }

      // PHASE 3: Convergent Generation with Trope Constraints
      console.log('🎯 PHASE 3: Convergent Generation');

      const variants = await this.generateVariants(
        input,
        selectedSeed,
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
    evolution: EvolutionResult | null,
    config: HybridConfig
  ): Promise<HybridVariant[]> {
    const variantCount = input.variantCount || 3;
    const variants: HybridVariant[] = [];

    // Determine tropes to use
    const tropesToUse = input.requestedTropes ||
      (seed?.tropeCompatibility.slice(0, 2)) ||
      ['metaphor', 'antithesis'];

    // Generate constraint prompt
    const tropeConstraint = generateTropeConstraintPrompt(tropesToUse);

    // Build seed-informed prompt
    const seedContext = seed ? `
Creative Direction (from ${seed.persona.name}):
"${seed.rawIdea}"

Build upon this creative seed while developing the full concept.
` : '';

    // Generate multiple variants
    for (let i = 0; i < variantCount; i++) {
      const prompt = this.buildGenerationPrompt(
        input.userBrief,
        input.tone,
        seedContext,
        tropeConstraint,
        i
      );

      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an award-winning creative director generating breakthrough advertising concepts.
Your concepts should be unexpected, memorable, and emotionally resonant.
${seed?.persona.systemPromptOverride || ''}`
            },
            { role: 'user', content: prompt }
          ],
          temperature: this.getTemperature(config.creativityLevel, i),
          max_tokens: 800
        });

        const content = response.choices[0]?.message?.content || '';
        const parsed = this.parseResponse(content);

        if (parsed) {
          // Calculate scores
          const combinedContent = `${parsed.visual} ${parsed.headlines.join(' ')}`;
          const embedding = await getEmbedding(combinedContent);

          // Check distinctiveness against other variants
          const otherEmbeddings = await Promise.all(
            variants.map(v =>
              getEmbedding(`${v.visualDescription} ${v.headlines.join(' ')}`)
            )
          );

          const distinctiveness = this.calculateDistinctiveness(embedding, otherEmbeddings);

          // Get arbiter score for coherence
          let coherence = 0.7; // Default
          try {
            const quality = await evaluateAdQuality({
              visualDescription: parsed.visual,
              headlines: parsed.headlines,
              rhetoricalDevice: tropesToUse[0] || 'metaphor',
              rhetoricalExample: seed?.rawIdea || ''
            });
            coherence = (quality.professionalismScore + quality.clarityScore + quality.freshnessScore) / 300;
          } catch (e) {
            console.log('Quality evaluation skipped');
          }

          const variant: HybridVariant = {
            id: `hybrid_${Date.now()}_${i}`,
            visualDescription: parsed.visual,
            headlines: parsed.headlines,
            tagline: parsed.tagline,
            bodyCopy: parsed.bodyCopy,
            rhetoricalDevice: tropesToUse[i % tropesToUse.length] || 'metaphor',
            creativeSeedOrigin: seed ? {
              personaId: seed.persona.id,
              personaName: seed.persona.name,
              rawIdea: seed.rawIdea
            } : undefined,
            scores: {
              originality: distinctiveness,
              tropeAlignment: scoreTropeAlignment(combinedContent, tropesToUse),
              coherence,
              distinctiveness,
              overall: 0 // Calculated below
            },
            evolutionPath: evolution ? {
              startState: TokenState.MASK,
              endState: TokenState.DECODED,
              transitionCount: evolution.cycles
            } : undefined
          };

          variant.scores.overall = this.calculateOverallScore(variant.scores);
          variants.push(variant);
        }
      } catch (error) {
        console.error(`Failed to generate variant ${i}:`, error);
      }
    }

    return variants;
  }

  /**
   * Build generation prompt
   */
  private buildGenerationPrompt(
    brief: string,
    tone: string,
    seedContext: string,
    tropeConstraint: string,
    variantIndex: number
  ): string {
    return `Create a breakthrough advertising concept for:

**Brief:** ${brief}
**Tone:** ${tone}

${seedContext}

${tropeConstraint}

Generate a complete concept with:

# [Compelling Headline]

## [Memorable Tagline]

**Visual Concept:**
[Describe the visual in vivid, unexpected detail]

**Body Copy:**
[2-3 sentences of persuasive copy]

**Headlines:**
- Option 1: [First headline variation]
- Option 2: [Second headline variation]
- Option 3: [Third headline variation]

**Strategic Impact:**
[One sentence on why this concept will resonate]

Make this variant ${variantIndex === 0 ? 'the boldest and most unexpected' :
        variantIndex === 1 ? 'emotionally resonant and human' :
          'strategically sharp and memorable'}.`;
  }

  /**
   * Parse generation response
   */
  private parseResponse(content: string): {
    visual: string;
    headlines: string[];
    tagline?: string;
    bodyCopy?: string;
  } | null {
    try {
      const lines = content.split('\n');
      let headline = '';
      let tagline = '';
      let visual = '';
      let bodyCopy = '';
      const headlines: string[] = [];
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('# ')) {
          headline = trimmed.substring(2).trim();
        } else if (trimmed.startsWith('## ')) {
          tagline = trimmed.substring(3).trim();
        } else if (trimmed.startsWith('**Visual Concept:**') || trimmed.startsWith('**Visual:**')) {
          currentSection = 'visual';
          const match = trimmed.match(/\*\*Visual.*?:\*\*\s*(.*)/);
          if (match && match[1]) visual = match[1];
        } else if (trimmed.startsWith('**Body Copy:**')) {
          currentSection = 'bodyCopy';
          const match = trimmed.match(/\*\*Body Copy:\*\*\s*(.*)/);
          if (match && match[1]) bodyCopy = match[1];
        } else if (trimmed.startsWith('**Headlines:**')) {
          currentSection = 'headlines';
        } else if (trimmed.startsWith('**Strategic Impact:**')) {
          currentSection = 'other';
        } else if (trimmed.startsWith('- Option') || (currentSection === 'headlines' && trimmed.startsWith('- '))) {
          const headlineText = trimmed.replace(/^-\s*(Option\s*\d+:\s*)?/, '').replace(/\*\*/g, '').trim();
          if (headlineText && headlineText.length < 100) {
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

      return {
        visual: visual.trim(),
        headlines,
        tagline: tagline || undefined,
        bodyCopy: bodyCopy.trim() || undefined
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
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `Create an advertising concept for: ${input.userBrief}\nTone: ${input.tone}\n\nProvide a visual description and 3 headline options.`
        }],
        temperature: 1.0,
        max_tokens: 500
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
