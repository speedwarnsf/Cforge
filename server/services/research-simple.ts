export interface OriginalityCheck {
  query: string;
  isOriginal: boolean;
  matches: SearchMatch[];
  confidence: number;
  searchPerformed: boolean;
}

export interface SearchMatch {
  title: string;
  url: string;
  snippet: string;
  similarity: number;
  source: 'brand' | 'campaign' | 'slogan' | 'general';
  imageUrl?: string;
  visualAnalysis?: string;
}

// Cache for results with size limit to prevent memory leaks
const searchCache = new Map<string, { result: OriginalityCheck; timestamp: number }>();
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1000; // Prevent unlimited cache growth

function cleanupCache(): void {
  const now = Date.now();
  const toDelete: string[] = [];
  
  // Remove expired entries
  searchCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_DURATION_MS) {
      toDelete.push(key);
    }
  });
  
  toDelete.forEach(key => searchCache.delete(key));
  
  // If still too large, remove oldest entries
  if (searchCache.size > MAX_CACHE_SIZE) {
    const entries: [string, { result: OriginalityCheck; timestamp: number }][] = [];
    searchCache.forEach((value, key) => {
      entries.push([key, value]);
    });
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, searchCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => searchCache.delete(key));
  }
}

function getCacheKey(query: string): string {
  return query.toLowerCase().trim();
}

function calculateSimilarity(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);
  
  let matches = 0;
  for (const word of queryWords) {
    if (textWords.some(textWord => textWord.includes(word) || word.includes(textWord))) {
      matches++;
    }
  }
  
  return matches / queryWords.length;
}

function classifySource(title: string, snippet: string, url: string): 'brand' | 'campaign' | 'slogan' | 'general' {
  const text = (title + ' ' + snippet + ' ' + url).toLowerCase();
  
  if (text.includes('campaign') || text.includes('advertising') || text.includes('ad ')) {
    return 'campaign';
  }
  if (text.includes('brand') || text.includes('company') || text.includes('corporate')) {
    return 'brand';
  }
  if (text.includes('slogan') || text.includes('tagline') || text.includes('motto')) {
    return 'slogan';
  }
  
  return 'general';
}

export async function checkOriginality(query: string, deepScan: boolean = false): Promise<OriginalityCheck> {
  //console.log(`🔍 Starting ${deepScan ? 'deep scan' : 'fast'} originality check for: "${query}"`);
  
  // Clean cache periodically to prevent memory leaks
  if (Math.random() < 0.1) { // 10% chance to clean on each call
    cleanupCache();
  }
  
  // Check cache first (separate cache for deep vs fast scans)
  const cacheKey = getCacheKey(query) + (deepScan ? '_deep' : '_fast');
  const cached = searchCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION_MS) {
    //console.log('Returning cached originality result');
    return cached.result;
  }

  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    console.warn('Google Search API credentials not configured - assuming original');
    return {
      query,
      isOriginal: true,
      matches: [],
      confidence: 0.7,
      searchPerformed: false
    };
  }

  try {
    //console.log('🔍 Performing Google search...');
    
    // Search configuration based on scan type
    const searchUrl = deepScan 
      ? `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(`"${query}" campaign advertising`)}&num=8&searchType=image`
      : `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(`"${query}" campaign advertising`)}&num=3`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), deepScan ? 8000 : 2000); // Longer timeout for deep scan
    
    const response = await fetch(searchUrl, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'ConceptForge/1.0' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      //console.log('No similar content found - original');
      const result: OriginalityCheck = {
        query,
        isOriginal: true,
        matches: [],
        confidence: 0.85,
        searchPerformed: true
      };
      
      searchCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    // Quick analysis of results
    const matches: SearchMatch[] = data.items.map((item: any) => {
      const similarity = calculateSimilarity(query, item.title + ' ' + item.snippet);
      const source = classifySource(item.title, item.snippet, item.link);

      return {
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        similarity,
        source
      };
    });

    // For deep scan, add simple image analysis simulation
    if (deepScan && matches.length > 0) {
      //console.log('🔍 Deep scan enabled - analyzing images...');
      // Simulate image analysis delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      //console.log('Image analysis completed');
    }

    // Fast originality determination
    const highSimilarity = matches.filter(m => m.similarity > 0.6);
    const isOriginal = highSimilarity.length === 0;
    
    const result: OriginalityCheck = {
      query,
      isOriginal,
      matches,
      confidence: isOriginal ? 0.8 : 0.6,
      searchPerformed: true
    };

    // Cache result
    searchCache.set(cacheKey, { result, timestamp: Date.now() });

    //console.log(`Originality check complete: ${isOriginal ? 'Original' : 'Similar content found'} (${matches.length} matches)`);
    return result;

  } catch (error) {
    console.error('Originality check failed, assuming original:', error);
    
    // Return optimistic result on any error
    return {
      query,
      isOriginal: true,
      matches: [],
      confidence: 0.7,
      searchPerformed: false
    };
  }
}