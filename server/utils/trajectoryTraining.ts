/**
 * Trajectory Training Pipeline
 * Implements cumulative loss calculation and KV-caching for EvoToken-DLM
 *
 * Integration: Used for fine-tuning and trajectory capture during generation
 * Location: server/utils/trajectoryTraining.ts
 */

import OpenAI from 'openai';
import { TokenState, SoftToken, ConceptBlock } from './progressiveEvolution';
import { TropeValidationResult } from './tropeConstraints';
import { supabase } from '../supabaseClient';

// ============================================
// TRAJECTORY INTERFACES
// ============================================

export interface TrajectoryStep {
  stepIndex: number;
  timestamp: Date;
  blockId: string;
  previousState: TokenState;
  newState: TokenState;
  alpha: number;
  arbiterScore: number;
  tropeValidation: TropeValidationResult[];
  tokenDistributions: Map<number, Map<string, number>>;
  selectedTokens: string[];
  loss: number;
  gradientNorm?: number;
}

export interface Trajectory {
  id: string;
  sessionId: string;
  userBrief: string;
  theme: string;
  creativeSeedId: string;
  steps: TrajectoryStep[];
  finalOutput: string;
  finalScore: number;
  totalLoss: number;
  metadata: {
    modelVersion: string;
    startTime: Date;
    endTime?: Date;
    totalTokens: number;
    evolutionCycles: number;
    regressionCount: number;
  };
}

export interface TrainingBatch {
  trajectories: Trajectory[];
  batchLoss: number;
  averageFinalScore: number;
  gradientStats: {
    mean: number;
    variance: number;
    maxNorm: number;
  };
}

// ============================================
// KV CACHE MANAGER
// ============================================

export interface CachedKVState {
  keys: Float32Array[];
  values: Float32Array[];
  tokenPositions: number[];
  blockStates: Map<string, TokenState>;
  timestamp: Date;
  hitCount: number;
}

export class KVCacheManager {
  private cache: Map<string, CachedKVState>;
  private maxCacheSize: number;
  private ttlMs: number;

  constructor(options: { maxCacheSize?: number; ttlMs?: number } = {}) {
    this.cache = new Map();
    this.maxCacheSize = options.maxCacheSize || 100;
    this.ttlMs = options.ttlMs || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Generate cache key from block states
   */
  private generateCacheKey(blocks: ConceptBlock[]): string {
    const stateSignature = blocks.map(b =>
      `${b.id}:${b.tokens.map(t => `${t.state}:${t.alpha.toFixed(2)}`).join(',')}`
    ).join('|');

    return Buffer.from(stateSignature).toString('base64').substring(0, 64);
  }

  /**
   * Store KV state in cache
   */
  store(
    blocks: ConceptBlock[],
    keys: Float32Array[],
    values: Float32Array[],
    tokenPositions: number[]
  ): string {
    const cacheKey = this.generateCacheKey(blocks);

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    const blockStates = new Map<string, TokenState>();
    for (const block of blocks) {
      blockStates.set(block.id, block.currentState);
    }

    this.cache.set(cacheKey, {
      keys,
      values,
      tokenPositions,
      blockStates,
      timestamp: new Date(),
      hitCount: 0
    });

    return cacheKey;
  }

  /**
   * Retrieve cached KV state
   */
  retrieve(blocks: ConceptBlock[]): CachedKVState | null {
    const cacheKey = this.generateCacheKey(blocks);
    const cached = this.cache.get(cacheKey);

    if (!cached) return null;

    // Check TTL
    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.ttlMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Update hit count
    cached.hitCount++;
    return cached;
  }

  /**
   * Check if state is cached
   */
  has(blocks: ConceptBlock[]): boolean {
    const cacheKey = this.generateCacheKey(blocks);
    const cached = this.cache.get(cacheKey);

    if (!cached) return false;

    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.ttlMs) {
      this.cache.delete(cacheKey);
      return false;
    }

    return true;
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    Array.from(this.cache.entries()).forEach(([key, state]) => {
      if (state.timestamp.getTime() < oldestTime) {
        oldestTime = state.timestamp.getTime();
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear all cached states
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    totalHits: number;
    averageHitRate: number;
  } {
    let totalHits = 0;
    Array.from(this.cache.values()).forEach(state => {
      totalHits += state.hitCount;
    });

    return {
      size: this.cache.size,
      totalHits,
      averageHitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0
    };
  }
}

// ============================================
// TRAJECTORY CAPTURE CLASS
// ============================================

export class TrajectoryCapture {
  private currentTrajectory: Trajectory | null;
  private kvCache: KVCacheManager;
  private stepBuffer: TrajectoryStep[];
  private lossWeights: {
    stateTransition: number;
    tropeAlignment: number;
    coherence: number;
    distinctiveness: number;
  };

  constructor(options: {
    kvCacheSize?: number;
    lossWeights?: {
      stateTransition?: number;
      tropeAlignment?: number;
      coherence?: number;
      distinctiveness?: number;
    };
  } = {}) {
    this.currentTrajectory = null;
    this.kvCache = new KVCacheManager({ maxCacheSize: options.kvCacheSize });
    this.stepBuffer = [];
    this.lossWeights = {
      stateTransition: options.lossWeights?.stateTransition ?? 0.25,
      tropeAlignment: options.lossWeights?.tropeAlignment ?? 0.30,
      coherence: options.lossWeights?.coherence ?? 0.25,
      distinctiveness: options.lossWeights?.distinctiveness ?? 0.20
    };
  }

  /**
   * Start capturing a new trajectory
   */
  startCapture(
    sessionId: string,
    userBrief: string,
    theme: string,
    creativeSeedId: string
  ): void {
    this.currentTrajectory = {
      id: `traj_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      sessionId,
      userBrief,
      theme,
      creativeSeedId,
      steps: [],
      finalOutput: '',
      finalScore: 0,
      totalLoss: 0,
      metadata: {
        modelVersion: 'evotoken-dlm-v1',
        startTime: new Date(),
        totalTokens: 0,
        evolutionCycles: 0,
        regressionCount: 0
      }
    };

    this.stepBuffer = [];
    console.log(`📊 Started trajectory capture: ${this.currentTrajectory.id}`);
  }

  /**
   * Record a trajectory step
   */
  recordStep(
    block: ConceptBlock,
    previousState: TokenState,
    arbiterScore: number,
    tropeValidation: TropeValidationResult[],
    selectedTokens: string[]
  ): void {
    if (!this.currentTrajectory) {
      console.warn('No active trajectory capture');
      return;
    }

    // Calculate step loss
    const loss = this.calculateStepLoss(
      previousState,
      block.currentState,
      arbiterScore,
      tropeValidation
    );

    // Extract token distributions
    const tokenDistributions = new Map<number, Map<string, number>>();
    for (const token of block.tokens) {
      tokenDistributions.set(token.position, new Map(token.distribution));
    }

    const step: TrajectoryStep = {
      stepIndex: this.stepBuffer.length,
      timestamp: new Date(),
      blockId: block.id,
      previousState,
      newState: block.currentState,
      alpha: block.tokens[0]?.alpha ?? 0,
      arbiterScore,
      tropeValidation,
      tokenDistributions,
      selectedTokens,
      loss
    };

    this.stepBuffer.push(step);

    // Update metadata
    this.currentTrajectory.metadata.totalTokens += selectedTokens.length;

    if (block.currentState !== previousState) {
      this.currentTrajectory.metadata.evolutionCycles++;
    }

    // Track regressions (going backwards in state machine)
    const stateOrder = [TokenState.MASK, TokenState.SOFT_MASK_V, TokenState.SOFT_V, TokenState.DECODED];
    const prevIndex = stateOrder.indexOf(previousState);
    const newIndex = stateOrder.indexOf(block.currentState);
    if (newIndex < prevIndex) {
      this.currentTrajectory.metadata.regressionCount++;
    }
  }

  /**
   * Calculate loss for a single step
   */
  private calculateStepLoss(
    previousState: TokenState,
    newState: TokenState,
    arbiterScore: number,
    tropeValidation: TropeValidationResult[]
  ): number {
    const stateOrder = [TokenState.MASK, TokenState.SOFT_MASK_V, TokenState.SOFT_V, TokenState.DECODED];
    const prevIndex = stateOrder.indexOf(previousState);
    const newIndex = stateOrder.indexOf(newState);

    // State transition loss (penalize regressions, reward progress)
    const stateTransitionLoss = prevIndex >= newIndex
      ? (prevIndex - newIndex) * 0.5  // Regression penalty
      : 0;  // Progress is not penalized

    // Trope alignment loss
    const tropeScore = tropeValidation.length > 0
      ? tropeValidation.reduce((sum, v) => sum + v.confidence, 0) / tropeValidation.length
      : 0;
    const tropeAlignmentLoss = 1 - tropeScore;

    // Coherence loss (inverse of arbiter score)
    const coherenceLoss = 1 - arbiterScore;

    // Combined weighted loss
    const totalLoss =
      stateTransitionLoss * this.lossWeights.stateTransition +
      tropeAlignmentLoss * this.lossWeights.tropeAlignment +
      coherenceLoss * this.lossWeights.coherence;

    return totalLoss;
  }

  /**
   * End capture and calculate cumulative loss
   */
  endCapture(
    finalOutput: string,
    finalScore: number
  ): Trajectory | null {
    if (!this.currentTrajectory) {
      console.warn('No active trajectory capture to end');
      return null;
    }

    // Transfer buffered steps
    this.currentTrajectory.steps = [...this.stepBuffer];
    this.currentTrajectory.finalOutput = finalOutput;
    this.currentTrajectory.finalScore = finalScore;
    this.currentTrajectory.metadata.endTime = new Date();

    // Calculate cumulative loss with temporal weighting
    this.currentTrajectory.totalLoss = this.calculateCumulativeLoss();

    console.log(`📊 Ended trajectory capture: ${this.currentTrajectory.id}`);
    console.log(`   Steps: ${this.currentTrajectory.steps.length}`);
    console.log(`   Total Loss: ${this.currentTrajectory.totalLoss.toFixed(4)}`);
    console.log(`   Final Score: ${finalScore.toFixed(4)}`);

    const completed = this.currentTrajectory;
    this.currentTrajectory = null;
    this.stepBuffer = [];

    return completed;
  }

  /**
   * Calculate cumulative loss across all steps
   * Uses temporal weighting to emphasize later steps
   */
  private calculateCumulativeLoss(): number {
    if (this.stepBuffer.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < this.stepBuffer.length; i++) {
      // Temporal weight increases for later steps
      const temporalWeight = 1 + (i / this.stepBuffer.length);
      weightedSum += this.stepBuffer[i].loss * temporalWeight;
      totalWeight += temporalWeight;
    }

    return weightedSum / totalWeight;
  }

  /**
   * Get current trajectory state
   */
  getCurrentState(): {
    trajectoryId: string | null;
    stepCount: number;
    runningLoss: number;
  } {
    if (!this.currentTrajectory) {
      return { trajectoryId: null, stepCount: 0, runningLoss: 0 };
    }

    const runningLoss = this.stepBuffer.length > 0
      ? this.stepBuffer.reduce((sum, s) => sum + s.loss, 0) / this.stepBuffer.length
      : 0;

    return {
      trajectoryId: this.currentTrajectory.id,
      stepCount: this.stepBuffer.length,
      runningLoss
    };
  }

  /**
   * Get KV cache manager
   */
  getKVCache(): KVCacheManager {
    return this.kvCache;
  }
}

// ============================================
// TRAINING BATCH PROCESSOR
// ============================================

export class TrainingBatchProcessor {
  private batchSize: number;
  private trajectoryBuffer: Trajectory[];
  private processedBatches: number;

  constructor(batchSize: number = 8) {
    this.batchSize = batchSize;
    this.trajectoryBuffer = [];
    this.processedBatches = 0;
  }

  /**
   * Add trajectory to batch
   */
  addTrajectory(trajectory: Trajectory): boolean {
    this.trajectoryBuffer.push(trajectory);
    return this.trajectoryBuffer.length >= this.batchSize;
  }

  /**
   * Process current batch
   */
  processBatch(): TrainingBatch | null {
    if (this.trajectoryBuffer.length === 0) return null;

    const trajectories = this.trajectoryBuffer.splice(0, this.batchSize);

    // Calculate batch statistics
    const batchLoss = trajectories.reduce((sum, t) => sum + t.totalLoss, 0) / trajectories.length;
    const averageFinalScore = trajectories.reduce((sum, t) => sum + t.finalScore, 0) / trajectories.length;

    // Calculate gradient statistics (simulated)
    const gradientNorms = trajectories.map(t =>
      t.steps.reduce((sum, s) => sum + s.loss, 0) / Math.max(t.steps.length, 1)
    );

    const mean = gradientNorms.reduce((sum, n) => sum + n, 0) / gradientNorms.length;
    const variance = gradientNorms.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / gradientNorms.length;
    const maxNorm = Math.max(...gradientNorms);

    this.processedBatches++;

    const batch: TrainingBatch = {
      trajectories,
      batchLoss,
      averageFinalScore,
      gradientStats: { mean, variance, maxNorm }
    };

    console.log(`🎓 Processed training batch ${this.processedBatches}:`);
    console.log(`   Trajectories: ${trajectories.length}`);
    console.log(`   Batch Loss: ${batchLoss.toFixed(4)}`);
    console.log(`   Avg Final Score: ${averageFinalScore.toFixed(4)}`);

    return batch;
  }

  /**
   * Get buffer status
   */
  getBufferStatus(): { buffered: number; batchSize: number; batches: number } {
    return {
      buffered: this.trajectoryBuffer.length,
      batchSize: this.batchSize,
      batches: this.processedBatches
    };
  }
}

// ============================================
// TRAJECTORY PERSISTENCE
// ============================================

export class TrajectoryStorage {
  /**
   * Save trajectory to database
   */
  async saveTrajectory(trajectory: Trajectory): Promise<boolean> {
    if (!supabase) {
      console.log('⚠️ Supabase not configured, skipping trajectory save');
      return false;
    }
    try {
      const { error } = await supabase.from('evolution_trajectories').insert({
        id: trajectory.id,
        session_id: trajectory.sessionId,
        user_brief: trajectory.userBrief,
        theme: trajectory.theme,
        creative_seed_id: trajectory.creativeSeedId,
        steps: JSON.stringify(trajectory.steps.map(s => ({
          ...s,
          tokenDistributions: Object.fromEntries(
            Array.from(s.tokenDistributions.entries()).map(([k, v]) => [k, Object.fromEntries(v)])
          )
        }))),
        final_output: trajectory.finalOutput,
        final_score: trajectory.finalScore,
        total_loss: trajectory.totalLoss,
        metadata: trajectory.metadata,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Failed to save trajectory:', error);
        return false;
      }

      console.log(`💾 Saved trajectory ${trajectory.id} to database`);
      return true;
    } catch (error) {
      console.error('Trajectory save error:', error);
      return false;
    }
  }

  /**
   * Load trajectories for training
   */
  async loadTrajectories(options: {
    limit?: number;
    minScore?: number;
    sessionId?: string;
  } = {}): Promise<Trajectory[]> {
    if (!supabase) {
      console.log('⚠️ Supabase not configured, returning empty trajectories');
      return [];
    }
    try {
      let query = supabase
        .from('evolution_trajectories')
        .select('*')
        .order('created_at', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.minScore !== undefined) {
        query = query.gte('final_score', options.minScore);
      }

      if (options.sessionId) {
        query = query.eq('session_id', options.sessionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to load trajectories:', error);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        sessionId: row.session_id,
        userBrief: row.user_brief,
        theme: row.theme,
        creativeSeedId: row.creative_seed_id,
        steps: JSON.parse(row.steps || '[]').map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp),
          tokenDistributions: new Map(
            Object.entries(s.tokenDistributions || {}).map(([k, v]: [string, any]) => [
              parseInt(k),
              new Map(Object.entries(v))
            ])
          )
        })),
        finalOutput: row.final_output,
        finalScore: row.final_score,
        totalLoss: row.total_loss,
        metadata: {
          ...row.metadata,
          startTime: new Date(row.metadata.startTime),
          endTime: row.metadata.endTime ? new Date(row.metadata.endTime) : undefined
        }
      }));
    } catch (error) {
      console.error('Trajectory load error:', error);
      return [];
    }
  }

  /**
   * Get training statistics
   */
  async getTrainingStats(): Promise<{
    totalTrajectories: number;
    averageLoss: number;
    averageScore: number;
    averageSteps: number;
  }> {
    if (!supabase) {
      return { totalTrajectories: 0, averageLoss: 0, averageScore: 0, averageSteps: 0 };
    }
    try {
      const { data, error } = await supabase
        .from('evolution_trajectories')
        .select('total_loss, final_score, steps');

      if (error || !data) {
        return {
          totalTrajectories: 0,
          averageLoss: 0,
          averageScore: 0,
          averageSteps: 0
        };
      }

      const totalTrajectories = data.length;
      const averageLoss = data.reduce((sum, t) => sum + t.total_loss, 0) / totalTrajectories;
      const averageScore = data.reduce((sum, t) => sum + t.final_score, 0) / totalTrajectories;
      const averageSteps = data.reduce((sum, t) => {
        const steps = JSON.parse(t.steps || '[]');
        return sum + steps.length;
      }, 0) / totalTrajectories;

      return {
        totalTrajectories,
        averageLoss,
        averageScore,
        averageSteps
      };
    } catch (error) {
      console.error('Stats calculation error:', error);
      return {
        totalTrajectories: 0,
        averageLoss: 0,
        averageScore: 0,
        averageSteps: 0
      };
    }
  }
}

// ============================================
// LOSS FUNCTIONS
// ============================================

/**
 * Cross-entropy loss for token prediction
 */
export function crossEntropyLoss(
  predictions: Map<string, number>,
  targetToken: string
): number {
  const prob = predictions.get(targetToken) || 1e-10;
  return -Math.log(prob);
}

/**
 * KL divergence between distributions
 */
export function klDivergence(
  p: Map<string, number>,
  q: Map<string, number>
): number {
  let divergence = 0;

  Array.from(p.entries()).forEach(([token, pProb]) => {
    const qProb = q.get(token) || 1e-10;
    if (pProb > 0) {
      divergence += pProb * Math.log(pProb / qProb);
    }
  });

  return divergence;
}

/**
 * Contrastive loss for distinctiveness
 */
export function contrastiveLoss(
  embedding: number[],
  positiveEmbeddings: number[][],
  negativeEmbeddings: number[][],
  margin: number = 0.5
): number {
  // Calculate average distance to positives (should be small)
  const avgPosDistance = positiveEmbeddings.length > 0
    ? positiveEmbeddings.reduce((sum, pos) => {
        const dist = Math.sqrt(
          embedding.reduce((s, v, i) => s + Math.pow(v - pos[i], 2), 0)
        );
        return sum + dist;
      }, 0) / positiveEmbeddings.length
    : 0;

  // Calculate average distance to negatives (should be large)
  const avgNegDistance = negativeEmbeddings.length > 0
    ? negativeEmbeddings.reduce((sum, neg) => {
        const dist = Math.sqrt(
          embedding.reduce((s, v, i) => s + Math.pow(v - neg[i], 2), 0)
        );
        return sum + dist;
      }, 0) / negativeEmbeddings.length
    : margin;

  // Loss: positives should be close, negatives should be far
  return Math.max(0, avgPosDistance - avgNegDistance + margin);
}

// ============================================
// EXPORTS
// ============================================

export default {
  TrajectoryCapture,
  TrainingBatchProcessor,
  TrajectoryStorage,
  KVCacheManager,
  crossEntropyLoss,
  klDivergence,
  contrastiveLoss
};
