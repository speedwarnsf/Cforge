// Enhanced caching system for ConceptForge

import { createHash } from 'crypto';

export interface CacheConfig {
  maxSize: number;
  ttlMinutes: number;
  cleanupIntervalMinutes: number;
}

export interface CachedConcept {
  id: string;
  brief: string;
  tone: string;
  headline: string;
  content: string;
  visualPrompt: string;
  rhetorical_device: string;
  tokens_used: number;
  cost: number;
  timestamp: number;
  expiry: number;
  usage_count: number;
  last_accessed: number;
}

export interface CachedGeneration {
  key: string;
  concepts: CachedConcept[];
  generation_params: {
    brief: string;
    tone: string;
    concept_count: number;
    devices: string[];
  };
  timestamp: number;
  expiry: number;
  usage_count: number;
}

class ConceptCacheManager {
  private cache = new Map<string, CachedGeneration>();
  private recentBriefs = new Map<string, string[]>(); // brief -> recent headlines
  private config: CacheConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: CacheConfig = {
    maxSize: 1000,
    ttlMinutes: 120, // 2 hours default TTL
    cleanupIntervalMinutes: 30
  }) {
    this.config = config;
    this.startCleanupProcess();
  }

  // Generate cache key from request parameters
  private generateCacheKey(brief: string, tone: string, conceptCount: number, devices: string[]): string {
    const normalized = {
      brief: brief.toLowerCase().trim(),
      tone: tone.toLowerCase(),
      conceptCount,
      devices: devices.sort().map(d => d.toLowerCase())
    };
    
    const keyString = JSON.stringify(normalized);
    return createHash('md5').update(keyString).digest('hex');
  }

  // Check if we have a valid cached result
  getCachedGeneration(brief: string, tone: string, conceptCount: number, devices: string[]): CachedGeneration | null {
    const key = this.generateCacheKey(brief, tone, conceptCount, devices);
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    cached.usage_count++;
    cached.concepts.forEach(concept => {
      concept.usage_count++;
      concept.last_accessed = Date.now();
    });

    console.log(`Cache hit for key: ${key} (used ${cached.usage_count} times)`);
    return cached;
  }

  // Cache a generation result
  setCachedGeneration(
    brief: string,
    tone: string,
    conceptCount: number,
    devices: string[],
    concepts: Omit<CachedConcept, 'timestamp' | 'expiry' | 'usage_count' | 'last_accessed'>[]
  ): void {
    const key = this.generateCacheKey(brief, tone, conceptCount, devices);
    const now = Date.now();
    const expiry = now + (this.config.ttlMinutes * 60 * 1000);

    const cachedConcepts: CachedConcept[] = concepts.map(concept => ({
      ...concept,
      timestamp: now,
      expiry,
      usage_count: 0,
      last_accessed: now
    }));

    const cached: CachedGeneration = {
      key,
      concepts: cachedConcepts,
      generation_params: {
        brief,
        tone,
        concept_count: conceptCount,
        devices
      },
      timestamp: now,
      expiry,
      usage_count: 0
    };

    this.cache.set(key, cached);

    // Also track recent headlines for this brief
    this.addRecentHeadlines(brief, concepts.map(c => c.headline));

    // Cleanup if cache is too large
    if (this.cache.size > this.config.maxSize) {
      this.cleanupOldEntries();
    }

    console.log(`💾 Cached generation for key: ${key} with ${concepts.length} concepts`);
  }

  // Get recent headlines for a brief to avoid duplication
  getRecentHeadlines(brief: string, limit: number = 10): string[] {
    const normalizedBrief = brief.toLowerCase().trim();
    const recent = this.recentBriefs.get(normalizedBrief) || [];
    return recent.slice(0, limit);
  }

  // Add recent headlines for duplication detection
  private addRecentHeadlines(brief: string, headlines: string[]): void {
    const normalizedBrief = brief.toLowerCase().trim();
    const existing = this.recentBriefs.get(normalizedBrief) || [];
    
    // Add new headlines and keep only the most recent 20
    const updated = [...headlines.map(h => h.toLowerCase().trim()), ...existing]
      .slice(0, 20);
    
    this.recentBriefs.set(normalizedBrief, updated);
  }

  // Check if a headline is too similar to recent ones
  isDuplicateHeadline(brief: string, headline: string, threshold: number = 0.8): boolean {
    const recent = this.getRecentHeadlines(brief);
    const normalizedHeadline = headline.toLowerCase().trim();
    
    return recent.some(recentHeadline => {
      const similarity = this.calculateSimilarity(normalizedHeadline, recentHeadline);
      return similarity >= threshold;
    });
  }

  // Simple similarity calculation
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Get cache statistics
  getCacheStats(): {
    total_entries: number;
    total_concepts: number;
    cache_hit_rate: number;
    memory_usage_mb: number;
    most_used_briefs: Array<{ brief: string; usage_count: number }>;
  } {
    const totalEntries = this.cache.size;
    const totalConcepts = Array.from(this.cache.values())
      .reduce((sum, cached) => sum + cached.concepts.length, 0);
    
    const totalRequests = Array.from(this.cache.values())
      .reduce((sum, cached) => sum + Math.max(1, cached.usage_count), 0);
    const cacheHits = Array.from(this.cache.values())
      .reduce((sum, cached) => sum + cached.usage_count, 0);
    const hitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;

    // Rough memory usage calculation
    const memoryUsage = JSON.stringify(Array.from(this.cache.values())).length / (1024 * 1024);

    // Most used briefs
    const briefUsage = new Map<string, number>();
    for (const cached of this.cache.values()) {
      const brief = cached.generation_params.brief;
      briefUsage.set(brief, (briefUsage.get(brief) || 0) + cached.usage_count);
    }
    const mostUsedBriefs = Array.from(briefUsage.entries())
      .map(([brief, count]) => ({ brief, usage_count: count }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10);

    return {
      total_entries: totalEntries,
      total_concepts: totalConcepts,
      cache_hit_rate: hitRate,
      memory_usage_mb: memoryUsage,
      most_used_briefs: mostUsedBriefs
    };
  }

  // Clean up expired and least-used entries
  private cleanupOldEntries(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // Remove expired entries first
    const expired = entries.filter(([, cached]) => now > cached.expiry);
    expired.forEach(([key]) => this.cache.delete(key));
    
    // If still too large, remove least recently used
    if (this.cache.size > this.config.maxSize * 0.9) {
      const remaining = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.usage_count - b.usage_count)
        .slice(0, this.cache.size - this.config.maxSize * 0.8);
      
      this.cache.clear();
      remaining.forEach(([key, cached]) => this.cache.set(key, cached));
    }

    console.log(`Cache cleanup: removed ${expired.length} expired entries, ${this.cache.size} remaining`);
  }

  // Start periodic cleanup
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldEntries();
    }, this.config.cleanupIntervalMinutes * 60 * 1000);
  }

  // Stop cleanup process
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  // Clear all cache (for testing or reset)
  clear(): void {
    this.cache.clear();
    this.recentBriefs.clear();
    console.log('🗑️ Cache cleared completely');
  }

  // Warm up cache with popular concepts
  async warmupCache(popularBriefs: Array<{ brief: string; tone: string }>): Promise<void> {
    console.log(`Warming up cache with ${popularBriefs.length} popular briefs...`);
    // Implementation would depend on your generation service
    // This is a placeholder for the warmup process
  }
}

// Export singleton instance
export const conceptCache = new ConceptCacheManager();

// Graceful shutdown
process.on('SIGINT', () => {
  conceptCache.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  conceptCache.destroy();
  process.exit(0);
});