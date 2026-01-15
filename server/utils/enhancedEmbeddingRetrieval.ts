/**
 * Enhanced embedding retrieval with diversity scoring and better performance
 */

import OpenAI from 'openai';
import fs from 'fs/promises';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

interface CampaignEntry {
  campaign: string;
  brand: string;
  year: number;
  headline: string;
  rhetoricalDevices: string[];
  rationale: string;
  outcome: string;
  whenToUse: string;
  whenNotToUse: string;
  award?: string;
  impactMetric?: string;
}

interface EmbeddingCache {
  [key: string]: number[];
}

interface RetrievalResult {
  campaign: CampaignEntry;
  similarity: number;
  diversityScore: number;
}

interface RetrievalCacheRecord {
  topCampaigns: RetrievalResult[];
  usedPairs: number;
  lastUsed: number;
}

class EnhancedEmbeddingRetrieval {
  private corpus: CampaignEntry[] = [];
  private embeddings: EmbeddingCache = {};
  private embeddingsReady = false;
  private retrievalCache = new Map<string, RetrievalCacheRecord>();
  private cacheFile = 'corpus-embeddings-cache.json';

  async initialize(): Promise<void> {
    console.log('🔄 Initializing enhanced embedding retrieval...');
    
    try {
      // Load corpus
      await this.loadCorpus();
      
      // Load or compute embeddings
      await this.loadOrComputeEmbeddings();
      
      this.embeddingsReady = true;
      console.log('✅ Enhanced embedding retrieval ready');
    } catch (error) {
      console.error('❌ Failed to initialize embedding retrieval:', error);
      this.embeddingsReady = false;
    }
  }

  private async loadCorpus(): Promise<void> {
    try {
      const data = await fs.readFile('data/retrieval-corpus.json', 'utf8');
      const parsed = JSON.parse(data);
      this.corpus = parsed.campaigns || [];
      console.log(`📚 Loaded ${this.corpus.length} campaigns`);
    } catch (error) {
      console.error('❌ Failed to load corpus:', error);
      this.corpus = [];
    }
  }

  private async loadOrComputeEmbeddings(): Promise<void> {
    try {
      // Try to load cached embeddings
      const cacheData = await fs.readFile(this.cacheFile, 'utf8');
      this.embeddings = JSON.parse(cacheData);
      
      // Verify cache completeness
      const missingEmbeddings = this.corpus.filter(
        (_, index) => !this.embeddings[index.toString()]
      );
      
      if (missingEmbeddings.length > 0) {
        console.log(`🔄 Computing ${missingEmbeddings.length} missing embeddings...`);
        await this.computeMissingEmbeddings(missingEmbeddings);
      } else {
        console.log('✅ Using cached embeddings');
      }
    } catch (error) {
      console.log('🔄 Computing all embeddings (no cache found)...');
      await this.computeAllEmbeddings();
    }
  }

  private async computeAllEmbeddings(): Promise<void> {
    this.embeddings = {};
    
    for (let i = 0; i < this.corpus.length; i++) {
      const campaign = this.corpus[i];
      const text = this.createEmbeddingText(campaign);
      
      try {
        const embedding = await this.getEmbedding(text);
        this.embeddings[i.toString()] = embedding;
        
        if ((i + 1) % 10 === 0) {
          console.log(`📊 Computed ${i + 1}/${this.corpus.length} embeddings`);
        }
        
        // Small delay to respect rate limits
        await this.delay(100);
      } catch (error) {
        console.error(`❌ Failed to compute embedding for campaign ${i}:`, error);
      }
    }
    
    // Save cache
    await this.saveEmbeddingsCache();
  }

  private async computeMissingEmbeddings(missingCampaigns: CampaignEntry[]): Promise<void> {
    for (const campaign of missingCampaigns) {
      const index = this.corpus.indexOf(campaign);
      const text = this.createEmbeddingText(campaign);
      
      try {
        const embedding = await this.getEmbedding(text);
        this.embeddings[index.toString()] = embedding;
        await this.delay(100);
      } catch (error) {
        console.error(`❌ Failed to compute missing embedding:`, error);
      }
    }
    
    await this.saveEmbeddingsCache();
  }

  private createEmbeddingText(campaign: CampaignEntry): string {
    const devices = campaign.rhetoricalDevices?.join(', ') || '';
    const award = campaign.award ? ` Award: ${campaign.award}.` : '';
    const impact = campaign.impactMetric ? ` Impact: ${campaign.impactMetric}.` : '';
    
    return `Campaign: ${campaign.campaign}. Brand: ${campaign.brand}. ` +
           `Headline: ${campaign.headline}. Rhetorical Devices: ${devices}. ` +
           `Rationale: ${campaign.rationale}.${award}${impact}`;
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      encoding_format: 'float'
    });
    
    return response.data[0].embedding;
  }

  private async saveEmbeddingsCache(): Promise<void> {
    try {
      await fs.writeFile(this.cacheFile, JSON.stringify(this.embeddings, null, 2));
      console.log('💾 Embeddings cache saved');
    } catch (error) {
      console.error('❌ Failed to save embeddings cache:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateDiversityScore(campaign: CampaignEntry, selectedCampaigns: CampaignEntry[]): number {
    if (selectedCampaigns.length === 0) return 1.0;
    
    let diversityScore = 1.0;
    
    for (const selected of selectedCampaigns) {
      // Brand diversity
      if (campaign.brand === selected.brand) {
        diversityScore *= 0.7;
      }
      
      // Year diversity (prefer different decades)
      const yearDiff = Math.abs(campaign.year - selected.year);
      if (yearDiff < 5) {
        diversityScore *= 0.8;
      } else if (yearDiff < 10) {
        diversityScore *= 0.9;
      }
      
      // Rhetorical device diversity
      const deviceOverlap = campaign.rhetoricalDevices.filter(
        device => selected.rhetoricalDevices.includes(device)
      ).length;
      
      if (deviceOverlap > 0) {
        diversityScore *= Math.pow(0.9, deviceOverlap);
      }
    }
    
    return Math.max(diversityScore, 0.1); // Minimum diversity score
  }

  async retrieveTopN(prompt: string, n: number = 2): Promise<CampaignEntry[]> {
    if (!this.embeddingsReady || this.corpus.length === 0) {
      console.log('⚠️ Embeddings not ready, using fallback');
      return this.getFallbackCampaigns(n);
    }

    try {
      // Create cache key
      const promptHash = crypto.createHash('md5').update(prompt).digest('hex').substring(0, 8);
      
      // Check cache
      let cacheRecord = this.retrievalCache.get(promptHash);
      
      if (!cacheRecord) {
        // Compute new retrieval
        const queryEmbedding = await this.getEmbedding(prompt);
        const results: RetrievalResult[] = [];
        
        for (let i = 0; i < this.corpus.length; i++) {
          const embedding = this.embeddings[i.toString()];
          if (!embedding) continue;
          
          const similarity = this.cosineSimilarity(queryEmbedding, embedding);
          results.push({
            campaign: this.corpus[i],
            similarity,
            diversityScore: 1.0 // Will be calculated later
          });
        }
        
        // Sort by similarity
        results.sort((a, b) => b.similarity - a.similarity);
        
        // Take top 10 and calculate diversity scores
        const top10 = results.slice(0, 10);
        const selectedCampaigns: CampaignEntry[] = [];
        
        for (const result of top10) {
          result.diversityScore = this.calculateDiversityScore(result.campaign, selectedCampaigns);
          selectedCampaigns.push(result.campaign);
        }
        
        cacheRecord = {
          topCampaigns: top10,
          usedPairs: 0,
          lastUsed: Date.now()
        };
        
        this.retrievalCache.set(promptHash, cacheRecord);
        console.log(`🔍 New retrieval cached for prompt hash: ${promptHash}`);
      }
      
      // Select diverse campaigns using round-robin with diversity scoring
      const selected = this.selectDiverseCampaigns(cacheRecord, n);
      
      console.log(`📊 Retrieved ${selected.length} diverse campaigns (used pairs: ${cacheRecord.usedPairs})`);
      return selected;
      
    } catch (error) {
      console.error('❌ Retrieval failed:', error);
      return this.getFallbackCampaigns(n);
    }
  }

  private selectDiverseCampaigns(cacheRecord: RetrievalCacheRecord, n: number): CampaignEntry[] {
    const { topCampaigns } = cacheRecord;
    
    if (cacheRecord.usedPairs < 5) {
      // Round-robin pairs for first 5 requests
      const startIndex = cacheRecord.usedPairs * 2;
      const selected = topCampaigns.slice(startIndex, startIndex + n).map(r => r.campaign);
      cacheRecord.usedPairs++;
      return selected;
    } else {
      // Diversity-based selection for subsequent requests
      const selected: CampaignEntry[] = [];
      const available = [...topCampaigns];
      
      while (selected.length < n && available.length > 0) {
        // Calculate combined score (similarity + diversity)
        let bestIndex = 0;
        let bestScore = 0;
        
        for (let i = 0; i < available.length; i++) {
          const result = available[i];
          const diversityScore = this.calculateDiversityScore(result.campaign, selected);
          const combinedScore = (result.similarity * 0.6) + (diversityScore * 0.4);
          
          if (combinedScore > bestScore) {
            bestScore = combinedScore;
            bestIndex = i;
          }
        }
        
        selected.push(available[bestIndex].campaign);
        available.splice(bestIndex, 1);
      }
      
      return selected;
    }
  }

  private getFallbackCampaigns(n: number): CampaignEntry[] {
    if (this.corpus.length === 0) return [];
    
    // Return diverse campaigns as fallback
    const shuffled = [...this.corpus].sort(() => Math.random() - 0.5);
    const selected: CampaignEntry[] = [];
    const usedBrands = new Set<string>();
    
    for (const campaign of shuffled) {
      if (selected.length >= n) break;
      
      if (!usedBrands.has(campaign.brand)) {
        selected.push(campaign);
        usedBrands.add(campaign.brand);
      }
    }
    
    // Fill remaining slots if needed
    while (selected.length < n && selected.length < this.corpus.length) {
      const remaining = shuffled.filter(c => !selected.includes(c));
      if (remaining.length > 0) {
        selected.push(remaining[0]);
      } else {
        break;
      }
    }
    
    return selected;
  }

  // Clean up old cache entries
  cleanCache(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, record] of this.retrievalCache.entries()) {
      if (now - record.lastUsed > maxAge) {
        this.retrievalCache.delete(key);
      }
    }
  }

  getStats(): object {
    return {
      corpusSize: this.corpus.length,
      embeddingsReady: this.embeddingsReady,
      cacheSize: this.retrievalCache.size,
      embeddingsCached: Object.keys(this.embeddings).length
    };
  }
}

// Singleton instance
const enhancedRetrieval = new EnhancedEmbeddingRetrieval();

export async function initializeEnhancedRetrieval(): Promise<void> {
  await enhancedRetrieval.initialize();
}

export async function retrieveEnhancedCampaigns(prompt: string, count: number = 2): Promise<CampaignEntry[]> {
  return enhancedRetrieval.retrieveTopN(prompt, count);
}

export function getEnhancedRetrievalStats(): object {
  return enhancedRetrieval.getStats();
}

export function cleanRetrievalCache(): void {
  enhancedRetrieval.cleanCache();
}