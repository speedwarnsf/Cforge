// Optimized corpus search for fast and accurate retrieval

export interface CorpusEntry {
  id: string;
  content: string;
  rhetorical_device: string;
  category: string;
  tags: string[];
  quality_score: number;
  embedding?: number[];
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  categories?: string[];
  rhetorical_devices?: string[];
  quality_filter?: number;
  fuzzy_search?: boolean;
}

class OptimizedCorpusSearch {
  private index = new Map<string, CorpusEntry>();
  private categoryIndex = new Map<string, Set<string>>();
  private deviceIndex = new Map<string, Set<string>>();
  private tagIndex = new Map<string, Set<string>>();
  private textSearchIndex = new Map<string, Set<string>>();
  private isIndexed = false;

  constructor(private corpus: CorpusEntry[]) {
    this.buildIndices();
  }

  private buildIndices(): void {
    console.log(`📚 Building optimized corpus indices for ${this.corpus.length} entries`);
    
    for (const entry of this.corpus) {
      this.index.set(entry.id, entry);
      
      // Category index
      if (!this.categoryIndex.has(entry.category)) {
        this.categoryIndex.set(entry.category, new Set());
      }
      this.categoryIndex.get(entry.category)!.add(entry.id);
      
      // Device index
      if (!this.deviceIndex.has(entry.rhetorical_device)) {
        this.deviceIndex.set(entry.rhetorical_device, new Set());
      }
      this.deviceIndex.get(entry.rhetorical_device)!.add(entry.id);
      
      // Tag index
      for (const tag of entry.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(entry.id);
      }
      
      // Text search index (simple word-based)
      const words = this.extractWords(entry.content);
      for (const word of words) {
        if (!this.textSearchIndex.has(word)) {
          this.textSearchIndex.set(word, new Set());
        }
        this.textSearchIndex.get(word)!.add(entry.id);
      }
    }
    
    this.isIndexed = true;
    console.log(`Corpus indices built successfully`);
  }

  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2) // Filter out very short words
      .slice(0, 50); // Limit to prevent index bloat
  }

  // Fast exact search using indices
  searchExact(query: string, options: SearchOptions = {}): CorpusEntry[] {
    if (!this.isIndexed) return [];

    const {
      limit = 10,
      categories,
      rhetorical_devices,
      quality_filter = 0
    } = options;

    let candidateIds = new Set<string>();
    let isFirstFilter = true;

    // Category filter
    if (categories && categories.length > 0) {
      const categoryMatches = new Set<string>();
      for (const category of categories) {
        const ids = this.categoryIndex.get(category);
        if (ids) {
          ids.forEach(id => categoryMatches.add(id));
        }
      }
      candidateIds = categoryMatches;
      isFirstFilter = false;
    }

    // Device filter
    if (rhetorical_devices && rhetorical_devices.length > 0) {
      const deviceMatches = new Set<string>();
      for (const device of rhetorical_devices) {
        const ids = this.deviceIndex.get(device);
        if (ids) {
          ids.forEach(id => deviceMatches.add(id));
        }
      }
      
      if (isFirstFilter) {
        candidateIds = deviceMatches;
        isFirstFilter = false;
      } else {
        candidateIds = new Set([...candidateIds].filter(id => deviceMatches.has(id)));
      }
    }

    // Text search
    if (query.trim()) {
      const words = this.extractWords(query);
      const textMatches = new Set<string>();
      
      for (const word of words) {
        const ids = this.textSearchIndex.get(word);
        if (ids) {
          ids.forEach(id => textMatches.add(id));
        }
      }
      
      if (isFirstFilter) {
        candidateIds = textMatches;
      } else {
        candidateIds = new Set([...candidateIds].filter(id => textMatches.has(id)));
      }
    }

    // If no filters applied, use all entries
    if (isFirstFilter) {
      candidateIds = new Set(this.index.keys());
    }

    // Convert to entries, apply quality filter, and sort
    const results = [...candidateIds]
      .map(id => this.index.get(id)!)
      .filter(entry => entry.quality_score >= quality_filter)
      .sort((a, b) => b.quality_score - a.quality_score)
      .slice(0, limit);

    return results;
  }

  // Semantic search using embeddings (when available)
  async searchSemantic(query: string, options: SearchOptions = {}): Promise<CorpusEntry[]> {
    if (!this.isIndexed) return [];

    const {
      limit = 10,
      threshold = 0.7,
      quality_filter = 0
    } = options;

    // First, get embedding for query
    const queryEmbedding = await this.getEmbedding(query);
    if (!queryEmbedding) {
      console.warn('Could not get embedding for query, falling back to exact search');
      return this.searchExact(query, options);
    }

    // Calculate similarities
    const similarities = this.corpus
      .filter(entry => entry.embedding && entry.quality_score >= quality_filter)
      .map(entry => ({
        entry,
        similarity: this.cosineSimilarity(queryEmbedding, entry.embedding!)
      }))
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities.map(item => item.entry);
  }

  // Hybrid search combining exact and semantic
  async searchHybrid(query: string, options: SearchOptions = {}): Promise<CorpusEntry[]> {
    if (!this.isIndexed) return [];

    const { limit = 10 } = options;
    const halfLimit = Math.ceil(limit / 2);

    // Get results from both methods
    const exactResults = this.searchExact(query, { ...options, limit: halfLimit });
    const semanticResults = await this.searchSemantic(query, { ...options, limit: halfLimit });

    // Combine and deduplicate
    const seen = new Set<string>();
    const combined: CorpusEntry[] = [];

    // Add exact matches first (they're usually more precise)
    for (const entry of exactResults) {
      if (!seen.has(entry.id) && combined.length < limit) {
        combined.push(entry);
        seen.add(entry.id);
      }
    }

    // Add semantic matches
    for (const entry of semanticResults) {
      if (!seen.has(entry.id) && combined.length < limit) {
        combined.push(entry);
        seen.add(entry.id);
      }
    }

    return combined;
  }

  // Fuzzy search for typo tolerance
  searchFuzzy(query: string, options: SearchOptions = {}): CorpusEntry[] {
    if (!this.isIndexed) return [];

    const { limit = 10 } = options;
    const queryWords = this.extractWords(query);
    const matches = new Map<string, number>();

    for (const word of queryWords) {
      // Find similar words in index
      for (const indexedWord of this.textSearchIndex.keys()) {
        const distance = this.levenshteinDistance(word, indexedWord);
        const similarity = 1 - (distance / Math.max(word.length, indexedWord.length));
        
        if (similarity > 0.7) { // 70% similarity threshold
          const ids = this.textSearchIndex.get(indexedWord);
          if (ids) {
            for (const id of ids) {
              matches.set(id, (matches.get(id) || 0) + similarity);
            }
          }
        }
      }
    }

    // Sort by relevance score
    const results = [...matches.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.index.get(id)!);

    return results;
  }

  // Get search suggestions
  getSuggestions(partial: string, limit: number = 5): string[] {
    const suggestions = new Set<string>();
    const lowerPartial = partial.toLowerCase();

    // Search in device names
    for (const device of this.deviceIndex.keys()) {
      if (device.toLowerCase().includes(lowerPartial)) {
        suggestions.add(device);
      }
    }

    // Search in tags
    for (const tag of this.tagIndex.keys()) {
      if (tag.toLowerCase().includes(lowerPartial)) {
        suggestions.add(tag);
      }
    }

    // Search in text index
    for (const word of this.textSearchIndex.keys()) {
      if (word.startsWith(lowerPartial)) {
        suggestions.add(word);
      }
    }

    return [...suggestions].slice(0, limit);
  }

  // Performance metrics
  getStats(): {
    total_entries: number;
    indexed_categories: number;
    indexed_devices: number;
    indexed_tags: number;
    indexed_words: number;
  } {
    return {
      total_entries: this.corpus.length,
      indexed_categories: this.categoryIndex.size,
      indexed_devices: this.deviceIndex.size,
      indexed_tags: this.tagIndex.size,
      indexed_words: this.textSearchIndex.size
    };
  }

  // Utility methods
  private async getEmbedding(text: string): Promise<number[] | null> {
    try {
      // This would integrate with your embedding service
      // Placeholder for actual embedding API call
      console.log('Getting embedding for:', text);
      return null; // Return actual embedding
    } catch (error) {
      console.warn('Failed to get embedding:', error);
      return null;
    }
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

  private levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // insertion
          matrix[j - 1][i] + 1,     // deletion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }
}

export default OptimizedCorpusSearch;