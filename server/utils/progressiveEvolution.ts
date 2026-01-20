/**
 * Progressive Token Evolution Engine
 * Implements EvoToken-DLM four-stage state machine
 *
 * States: [MASK] -> Soft([MASK]∪V) -> Soft(V) -> [Decode]
 * Location: server/utils/progressiveEvolution.ts
 */

import OpenAI from 'openai';
import { getEmbedding, cosineSimilarity } from './embeddingSimilarity';
import { CreativeSeed } from './divergentExplorer';

// ============================================
// TOKEN STATE DEFINITIONS
// ============================================

export enum TokenState {
  MASK = 'MASK',
  SOFT_MASK_V = 'SOFT_MASK_V',
  SOFT_V = 'SOFT_V',
  DECODED = 'DECODED'
}

export interface SoftToken {
  state: TokenState;
  position: number;
  distribution: Map<string, number>;
  embedding: number[];
  alpha: number;
  committed: boolean;
}

export interface ConceptBlock {
  id: string;
  name: 'headline' | 'tagline' | 'bodyCopy' | 'visualConcept' | 'rhetoricalCraft';
  tokens: SoftToken[];
  state: TokenState;
  currentState: TokenState; // Alias for compatibility
  tropeConstraints: string[];
  coherenceScore: number;
  committed: boolean;
  content: string;
}

export interface EvolutionResult {
  blocks: ConceptBlock[];
  cycles: number;
  globalCoherence: number;
  finalOutput: string;
  tropeValidation: {
    tropeId: string;
    satisfied: boolean;
    confidence: number;
  }[];
}

export interface ArbiterEvaluation {
  originalityScore: number;
  relevanceScore: number;
  culturalSensitivityScore: number;
  audienceResonance: 'Low' | 'Medium' | 'High';
  passed: boolean;
  feedback: string[];
}

export interface EvolutionState {
  blocks: ConceptBlock[];
  globalCoherence: number;
  iterationCount: number;
  alphaSchedule: number[];
  arbiterHistory: ArbiterEvaluation[];
  creativeSeed: CreativeSeed;
}

// ============================================
// ALPHA SCHEDULER
// ============================================

export class AlphaScheduler {
  private schedule: number[];
  private currentStep: number = 0;

  constructor(totalSteps: number = 5, decayType: 'linear' | 'exponential' | 'cosine' = 'cosine') {
    this.schedule = this.generateSchedule(totalSteps, decayType);
  }

  private generateSchedule(steps: number, type: string): number[] {
    const schedule: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;

      switch (type) {
        case 'linear':
          schedule.push(1 - t);
          break;
        case 'exponential':
          schedule.push(Math.exp(-3 * t));
          break;
        case 'cosine':
          schedule.push(0.5 * (1 + Math.cos(Math.PI * t)));
          break;
        default:
          schedule.push(1 - t);
      }
    }

    return schedule;
  }

  getCurrentAlpha(): number {
    return this.schedule[Math.min(this.currentStep, this.schedule.length - 1)];
  }

  advance(): number {
    this.currentStep++;
    return this.getCurrentAlpha();
  }

  reset(): void {
    this.currentStep = 0;
  }

  getSchedule(): number[] {
    return [...this.schedule];
  }
}

// ============================================
// SOFT TOKEN OPERATIONS
// ============================================

export async function initializeSoftTokens(
  seed: CreativeSeed,
  blockName: string,
  tropeConstraint: string
): Promise<SoftToken[]> {
  // Initialize with mask embeddings
  const maskEmbedding = await getEmbedding('[MASK]');

  // Estimate token count based on block type
  const tokenCounts: Record<string, number> = {
    headline: 5,
    tagline: 8,
    bodyCopy: 50,
    visualConcept: 30,
    rhetoricalCraft: 40
  };

  const count = tokenCounts[blockName] || 20;
  const tokens: SoftToken[] = [];

  for (let i = 0; i < count; i++) {
    tokens.push({
      state: TokenState.MASK,
      position: i,
      distribution: new Map([['[MASK]', 1.0]]),
      embedding: [...maskEmbedding],
      alpha: 1.0,
      committed: false
    });
  }

  return tokens;
}

export async function blendWithVocabulary(
  token: SoftToken,
  vocabularyDistribution: Map<string, number>,
  alpha: number,
  tropeConstraint: string
): Promise<SoftToken> {
  // Get mask embedding
  const maskEmbedding = await getEmbedding('[MASK]');

  // Calculate weighted distribution embedding
  let distEmbedding = new Array(maskEmbedding.length).fill(0);

  // Sample top words from distribution to avoid too many embedding calls
  const topEntries = Array.from(vocabularyDistribution.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [word, prob] of topEntries) {
    const wordEmbedding = await getEmbedding(word);
    for (let i = 0; i < distEmbedding.length; i++) {
      distEmbedding[i] += prob * wordEmbedding[i];
    }
  }

  // Apply trope constraint bias
  const biasedDistribution = applyTropeConstraint(
    vocabularyDistribution,
    tropeConstraint
  );

  // Blend: e_current = alpha * e_mask + (1-alpha) * e_dist
  const blendedEmbedding = maskEmbedding.map((m, i) =>
    alpha * m + (1 - alpha) * distEmbedding[i]
  );

  return {
    ...token,
    state: alpha > 0.5 ? TokenState.SOFT_MASK_V : TokenState.SOFT_V,
    distribution: biasedDistribution,
    embedding: blendedEmbedding,
    alpha
  };
}

function applyTropeConstraint(
  distribution: Map<string, number>,
  trope: string
): Map<string, number> {
  // Trope-specific vocabulary biases
  const tropeBiases: Record<string, string[]> = {
    'Antithesis': ['yet', 'but', 'while', 'versus', 'against', 'however'],
    'Paradox': ['contradiction', 'impossible', 'yet', 'somehow'],
    'Metaphor': ['like', 'becomes', 'transforms', 'is'],
    'Hyperbole': ['never', 'always', 'infinite', 'ultimate', 'every'],
    'Chiasmus': ['first', 'last', 'begin', 'end'],
    'Oxymoron': ['silent', 'loud', 'dark', 'light', 'bitter', 'sweet']
  };

  const biasWords = tropeBiases[trope] || [];
  const biased = new Map(distribution);

  // Boost probabilities for trope-compatible words
  for (const word of biasWords) {
    const current = biased.get(word) || 0.01;
    biased.set(word, Math.min(current * 1.5, 0.3));
  }

  // Renormalize
  const total = Array.from(biased.values()).reduce((sum, p) => sum + p, 0);
  Array.from(biased.entries()).forEach(([word, prob]) => {
    biased.set(word, prob / total);
  });

  return biased;
}

// ============================================
// MAIN EVOLUTION ENGINE
// ============================================

export interface EvolutionEngineOptions {
  maxCycles?: number;
  blockSize?: number;
  decayType?: 'linear' | 'exponential' | 'cosine';
}

export class ProgressiveEvolutionEngine {
  private openai: OpenAI;
  private alphaScheduler: AlphaScheduler;
  private state: EvolutionState | null;
  private options: EvolutionEngineOptions;

  constructor(seedOrOptions?: CreativeSeed | EvolutionEngineOptions, refinementSteps: number = 5) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Handle both constructor signatures for backward compatibility
    if (seedOrOptions && 'rawIdea' in seedOrOptions) {
      // Old constructor: (seed, refinementSteps)
      this.options = { maxCycles: refinementSteps, blockSize: 8 };
      this.alphaScheduler = new AlphaScheduler(refinementSteps, 'cosine');
      this.state = {
        blocks: [],
        globalCoherence: 0,
        iterationCount: 0,
        alphaSchedule: this.alphaScheduler.getSchedule(),
        arbiterHistory: [],
        creativeSeed: seedOrOptions as CreativeSeed
      };
    } else {
      // New constructor: (options)
      const opts = (seedOrOptions as EvolutionEngineOptions) || {};
      this.options = {
        maxCycles: opts.maxCycles ?? 50,
        blockSize: opts.blockSize ?? 8,
        decayType: opts.decayType ?? 'cosine'
      };
      this.alphaScheduler = new AlphaScheduler(this.options.maxCycles!, this.options.decayType);
      this.state = null; // Will be initialized when evolve is called
    }
  }

  /**
   * Simplified evolve method for external use
   */
  async evolve(blocks: ConceptBlock[]): Promise<EvolutionResult> {
    console.log(`🔄 Starting evolution with ${blocks.length} blocks`);

    const maxCycles = this.options.maxCycles || 50;
    let cycles = 0;

    // Initialize blocks with required properties if missing
    const normalizedBlocks = blocks.map((block, idx) => ({
      ...block,
      id: block.id || `block_${idx}`,
      currentState: block.currentState || block.state || TokenState.MASK,
      state: block.state || TokenState.MASK,
      tropeConstraints: block.tropeConstraints || [],
      coherenceScore: block.coherenceScore || 0,
      committed: block.committed || false,
      content: block.content || ''
    }));

    // Evolution loop (simplified for external blocks)
    while (cycles < maxCycles) {
      const alpha = this.alphaScheduler.getCurrentAlpha();

      // Process each block
      for (const block of normalizedBlocks) {
        if (block.committed) continue;

        // Update alpha for all tokens
        for (const token of block.tokens) {
          token.alpha = alpha;
        }

        // State transition based on alpha
        if (alpha < 0.3) {
          block.state = TokenState.SOFT_V;
          block.currentState = TokenState.SOFT_V;
        } else if (alpha < 0.7) {
          block.state = TokenState.SOFT_MASK_V;
          block.currentState = TokenState.SOFT_MASK_V;
        }

        // Calculate block coherence
        block.coherenceScore = this.calculateSimpleCoherence(block);

        // Check if ready to commit
        if (alpha < 0.1 && block.coherenceScore > 0.6) {
          block.state = TokenState.DECODED;
          block.currentState = TokenState.DECODED;
          block.committed = true;
        }
      }

      cycles++;
      this.alphaScheduler.advance();

      // Check if all committed
      if (normalizedBlocks.every(b => b.committed)) {
        break;
      }
    }

    // Calculate global coherence
    const globalCoherence = this.calculateGlobalCoherenceSync(normalizedBlocks);

    // Generate final output
    const finalOutput = normalizedBlocks
      .map(b => b.content || this.extractContentFromTokens(b))
      .filter(c => c)
      .join('\n\n');

    console.log(`✅ Evolution complete: ${cycles} cycles, coherence: ${(globalCoherence * 100).toFixed(1)}%`);

    return {
      blocks: normalizedBlocks,
      cycles,
      globalCoherence,
      finalOutput,
      tropeValidation: []
    };
  }

  private calculateSimpleCoherence(block: ConceptBlock): number {
    // Simple coherence based on token commitment
    const committedRatio = block.tokens.filter(t => t.alpha < 0.5).length / block.tokens.length;
    return Math.min(1.0, committedRatio + 0.3);
  }

  private calculateGlobalCoherenceSync(blocks: ConceptBlock[]): number {
    const coherences = blocks.map(b => b.coherenceScore);
    return coherences.reduce((sum, c) => sum + c, 0) / coherences.length;
  }

  private extractContentFromTokens(block: ConceptBlock): string {
    return block.tokens
      .map(t => {
        const sorted = Array.from(t.distribution.entries())
          .sort((a, b) => b[1] - a[1]);
        return sorted[0]?.[0] || '';
      })
      .filter(w => w && w !== '[MASK]')
      .join(' ');
  }

  async initialize(): Promise<void> {
    const blockNames: ConceptBlock['name'][] = [
      'headline', 'tagline', 'bodyCopy', 'visualConcept', 'rhetoricalCraft'
    ];

    for (const name of blockNames) {
      const tokens = await initializeSoftTokens(
        this.state.creativeSeed,
        name,
        this.state.creativeSeed.tropeCompatibility[0] || 'Metaphor'
      );

      this.state!.blocks.push({
        id: `block_${name}_${Date.now()}`,
        name,
        tokens,
        state: TokenState.MASK,
        currentState: TokenState.MASK,
        tropeConstraints: [this.state!.creativeSeed.tropeCompatibility[0] || 'Metaphor'],
        coherenceScore: 0,
        committed: false,
        content: ''
      });
    }

    console.log(`🔄 Evolution engine initialized with ${this.state.blocks.length} blocks`);
  }

  async evolveBlock(blockIndex: number): Promise<ConceptBlock> {
    const block = this.state.blocks[blockIndex];
    const alpha = this.alphaScheduler.getCurrentAlpha();
    const trope = this.state.creativeSeed.tropeCompatibility[0] || 'Metaphor';

    console.log(`   Evolving block "${block.name}" (alpha=${alpha.toFixed(3)})`);

    // Stage 1->2: Generate vocabulary distribution from LLM
    const vocabDistribution = await this.generateVocabularyDistribution(
      block,
      this.state.creativeSeed
    );

    // Stage 2->3: Blend tokens with vocabulary (sample a few tokens for efficiency)
    const sampleSize = Math.min(5, block.tokens.length);
    for (let i = 0; i < sampleSize; i++) {
      const tokenIndex = Math.floor(i * block.tokens.length / sampleSize);
      block.tokens[tokenIndex] = await blendWithVocabulary(
        block.tokens[tokenIndex],
        vocabDistribution,
        alpha,
        trope
      );
    }

    // Update block state
    if (alpha < 0.3) {
      block.state = TokenState.SOFT_V;
    } else if (alpha < 0.7) {
      block.state = TokenState.SOFT_MASK_V;
    }

    // Calculate coherence
    block.coherenceScore = await this.calculateBlockCoherence(block);

    return block;
  }

  async attemptDecode(
    blockIndex: number,
    arbiterEvaluation: ArbiterEvaluation
  ): Promise<{ success: boolean; content: string }> {
    const block = this.state.blocks[blockIndex];

    // Check if arbiter requirements are met
    if (!arbiterEvaluation.passed) {
      console.log(`   ⚠️ Block "${block.name}" failed arbiter check`);
      this.state.arbiterHistory.push(arbiterEvaluation);
      return { success: false, content: '' };
    }

    // Decode: Sample from distributions
    const decodedContent = await this.sampleFromDistributions(block);

    block.state = TokenState.DECODED;
    block.committed = true;
    block.content = decodedContent;

    for (const token of block.tokens) {
      token.state = TokenState.DECODED;
      token.committed = true;
    }

    console.log(`   ✅ Block "${block.name}" decoded: "${decodedContent.substring(0, 50)}..."`);

    return { success: true, content: decodedContent };
  }

  async regressBlock(
    blockIndex: number,
    regressionDepth: 'soft' | 'full'
  ): Promise<void> {
    const block = this.state.blocks[blockIndex];

    if (regressionDepth === 'soft') {
      // Regress to SOFT_MASK_V (re-blend with higher alpha)
      block.state = TokenState.SOFT_MASK_V;
      for (const token of block.tokens) {
        token.state = TokenState.SOFT_MASK_V;
        token.alpha = Math.min(token.alpha + 0.2, 0.8);
      }
      console.log(`   ↩️ Soft regression for block "${block.name}"`);
    } else {
      // Full regression to MASK
      block.state = TokenState.MASK;
      const maskEmbedding = await getEmbedding('[MASK]');
      for (const token of block.tokens) {
        token.state = TokenState.MASK;
        token.alpha = 1.0;
        token.distribution = new Map([['[MASK]', 1.0]]);
        token.embedding = [...maskEmbedding];
      }
      console.log(`   ↩️ Full regression for block "${block.name}"`);
    }

    block.committed = false;
    block.content = '';
  }

  private async generateVocabularyDistribution(
    block: ConceptBlock,
    seed: CreativeSeed
  ): Promise<Map<string, number>> {
    const prompt = `Given the creative seed: "${seed.rawIdea}"
And the block type: ${block.name}
Using the rhetorical device: ${seed.tropeCompatibility[0] || 'Metaphor'}

Generate a probability distribution over vocabulary words that could appear in this ${block.name}.
Return as JSON: {"word1": 0.15, "word2": 0.12, ...}
Include 20-30 words with probabilities summing to 1.0.
Focus on words that serve the rhetorical device and creative direction.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    });

    try {
      const content = response.choices[0]?.message?.content || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || '{}');

      return new Map(Object.entries(parsed));
    } catch {
      // Fallback distribution
      return new Map([
        ['the', 0.1], ['a', 0.08], ['is', 0.07], ['of', 0.06],
        ['and', 0.05], ['to', 0.05], ['in', 0.04], ['for', 0.04]
      ]);
    }
  }

  private async calculateBlockCoherence(block: ConceptBlock): Promise<number> {
    // Calculate average embedding similarity within block
    const embeddings = block.tokens
      .filter(t => t.embedding.length > 0)
      .map(t => t.embedding);

    if (embeddings.length < 2) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < Math.min(embeddings.length - 1, 5); i++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[i + 1]);
      totalSimilarity += sim;
      comparisons++;
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 1.0;
  }

  private async sampleFromDistributions(block: ConceptBlock): Promise<string> {
    // Use LLM to generate coherent text from token distributions
    const topTokens = block.tokens.slice(0, 10).map(t => {
      const sorted = Array.from(t.distribution.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      return sorted.map(([word]) => word);
    });

    const prompt = `Generate a ${block.name} for an advertising concept.
Use these vocabulary hints for each position: ${JSON.stringify(topTokens)}
Creative seed: "${this.state.creativeSeed.rawIdea}"
Rhetorical device: ${this.state.creativeSeed.tropeCompatibility[0]}

Generate ONLY the ${block.name} text, nothing else.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: block.name === 'bodyCopy' ? 200 : 50
    });

    return response.choices[0]?.message?.content?.trim() || '';
  }

  advanceAlpha(): number {
    this.state.iterationCount++;
    return this.alphaScheduler.advance();
  }

  getState(): EvolutionState {
    return { ...this.state };
  }

  async runFullEvolution(
    evaluateBlock: (block: ConceptBlock, index: number) => Promise<ArbiterEvaluation>
  ): Promise<EvolutionState> {
    await this.initialize();

    const MAX_ITERATIONS = 5;
    const MAX_REGRESSIONS_PER_BLOCK = 2;
    const regressionCounts = new Map<number, number>();

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      console.log(`\n🔄 Evolution iteration ${iteration + 1}/${MAX_ITERATIONS} (alpha=${this.alphaScheduler.getCurrentAlpha().toFixed(3)})`);

      for (let i = 0; i < this.state.blocks.length; i++) {
        const block = this.state.blocks[i];

        if (block.committed) {
          console.log(`   ⏭️ Block "${block.name}" already committed, skipping`);
          continue;
        }

        // Evolve the block
        await this.evolveBlock(i);

        // Evaluate with arbiters
        const evaluation = await evaluateBlock(block, i);

        // Attempt decode
        const { success } = await this.attemptDecode(i, evaluation);

        if (!success) {
          const regressions = regressionCounts.get(i) || 0;

          if (regressions >= MAX_REGRESSIONS_PER_BLOCK) {
            console.log(`   ⚠️ Max regressions reached for "${block.name}", forcing decode`);
            block.committed = true;
            block.content = await this.sampleFromDistributions(block);
          } else {
            const depth = regressions === 0 ? 'soft' : 'full';
            await this.regressBlock(i, depth);
            regressionCounts.set(i, regressions + 1);
          }
        }
      }

      // Check if all blocks committed
      const allCommitted = this.state.blocks.every(b => b.committed);
      if (allCommitted) {
        console.log(`\n✅ All blocks committed after ${iteration + 1} iterations`);
        break;
      }

      this.advanceAlpha();
    }

    // Calculate final global coherence
    this.state.globalCoherence = await this.calculateGlobalCoherence();

    return this.state;
  }

  private async calculateGlobalCoherence(): Promise<number> {
    const contents = this.state.blocks.map(b => b.content).filter(c => c);
    if (contents.length < 2) return 1.0;

    const embeddings = await Promise.all(contents.map(c => getEmbedding(c)));

    let totalSim = 0;
    let count = 0;

    for (let i = 0; i < embeddings.length - 1; i++) {
      totalSim += cosineSimilarity(embeddings[i], embeddings[i + 1]);
      count++;
    }

    return count > 0 ? totalSim / count : 1.0;
  }
}

export default ProgressiveEvolutionEngine;
