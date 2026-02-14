import { createHash } from 'crypto';
import OpenAI from 'openai';

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

interface GoogleSearchResult {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
    pagemap?: {
      cse_image?: Array<{
        src: string;
      }>;
      metatags?: Array<{
        'og:image'?: string;
        'twitter:image'?: string;
      }>;
    };
  }>;
}

interface BingSearchResult {
  webPages?: {
    value: Array<{
      name: string;
      url: string;
      snippet: string;
    }>;
  };
}

// In-memory cache for search results (24 hour TTL)
const searchCache = new Map<string, { result: OriginalityCheck; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Common brand/campaign indicators
const BRAND_INDICATORS = [
  'slogan', 'tagline', 'campaign', 'advertising', 'brand', 'trademark',
  'nike', 'apple', 'coca-cola', 'mcdonald', 'pepsi', 'ford', 'toyota',
  'marketing', 'commercial', 'ad campaign', 'brand message'
];

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined,
});

function getCacheKey(query: string): string {
  return createHash('md5').update(query.toLowerCase().trim()).digest('hex');
}

function cleanupCache(): void {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
}

function calculateSimilarity(query: string, text: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);
  
  // Exact match
  if (text.toLowerCase().includes(query.toLowerCase())) {
    return 1.0;
  }
  
  // Word overlap similarity
  const intersection = queryWords.filter(word => 
    textWords.some(textWord => textWord.includes(word) || word.includes(textWord))
  );
  
  return intersection.length / Math.max(queryWords.length, textWords.length);
}

function classifySource(title: string, snippet: string, url: string): 'brand' | 'campaign' | 'slogan' | 'general' {
  const combined = `${title} ${snippet} ${url}`.toLowerCase();
  
  if (BRAND_INDICATORS.some(indicator => combined.includes(indicator))) {
    if (combined.includes('slogan') || combined.includes('tagline')) {
      return 'slogan';
    }
    if (combined.includes('campaign') || combined.includes('advertising')) {
      return 'campaign';
    }
    return 'brand';
  }
  
  return 'general';
}

function extractImageUrl(result: any): string | undefined {
  // Try to get image from pagemap
  if (result.pagemap?.cse_image?.[0]?.src) {
    return result.pagemap.cse_image[0].src;
  }
  
  // Try to get from Open Graph meta tags
  if (result.pagemap?.metatags?.[0]) {
    const meta = result.pagemap.metatags[0];
    return meta['og:image'] || meta['twitter:image'];
  }
  
  return undefined;
}

async function analyzeImageWithVision(imageUrl: string, headline: string): Promise<string | undefined> {
  if (!process.env.OPENAI_API_KEY) {
    return undefined;
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o", // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image for marketing/advertising content. Look for text, slogans, brand elements, or campaign messaging that might be similar to the headline: "${headline}". Describe any relevant marketing text or branding visible in the image.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "low" // Use low detail for cost efficiency
              }
            }
          ],
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content || undefined;
  } catch (error) {
    console.error('Error analyzing image with Vision API:', error);
    return undefined;
  }
}

async function performGoogleSearch(query: string): Promise<SearchMatch[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    console.log('Google Search API credentials not available, skipping originality check');
    return [];
  }

  try {
    // Search for exact phrase and variations
    const searches = [
      `"${query}"`, // Exact phrase
      `${query} slogan`,
      `${query} tagline`,
      `${query} campaign`,
      `${query} brand`
    ];

    const allMatches: SearchMatch[] = [];

    for (const searchQuery of searches) {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(searchQuery)}&num=10`
      );

      if (!response.ok) {
        console.error(`Google Search API error: ${response.status}`);
        continue;
      }

      const data: GoogleSearchResult = await response.json();
      
      if (data.items) {
        for (const result of data.items) {
          const similarity = calculateSimilarity(query, `${result.title} ${result.snippet}`);
          
          // Only include results with meaningful similarity
          if (similarity > 0.3) {
            const imageUrl = extractImageUrl(result);
            let visualAnalysis: string | undefined;
            
            // Analyze image if available and it's a brand/campaign source
            const source = classifySource(result.title, result.snippet, result.link);
            if (imageUrl && (source === 'brand' || source === 'campaign' || source === 'slogan')) {
              visualAnalysis = await analyzeImageWithVision(imageUrl, query);
            }
            
            allMatches.push({
              title: result.title,
              url: result.link,
              snippet: result.snippet,
              similarity,
              source,
              imageUrl,
              visualAnalysis
            });
          }
        }
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Sort by similarity and remove duplicates
    const uniqueMatches = Array.from(
      new Map(allMatches.map(match => [match.url, match])).values()
    ).sort((a, b) => b.similarity - a.similarity);

    return uniqueMatches.slice(0, 5); // Return top 5 matches

  } catch (error) {
    console.error('Error performing Google search:', error);
    return [];
  }
}

async function performBingSearch(query: string): Promise<SearchMatch[]> {
  const apiKey = process.env.BING_SEARCH_API_KEY;
  
  if (!apiKey) {
    return [];
  }

  try {
    // Search for exact phrase and variations
    const searches = [
      `"${query}"`, // Exact phrase
      `${query} slogan`,
      `${query} tagline`,
      `${query} campaign`,
      `${query} brand`
    ];

    const allMatches: SearchMatch[] = [];

    for (const searchQuery of searches) {
      const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(searchQuery)}&count=10`, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
        },
      });

      if (!response.ok) {
        console.error(`Bing Search API error: ${response.status}`);
        continue;
      }

      const data: BingSearchResult = await response.json();
      
      if (data.webPages?.value) {
        for (const result of data.webPages.value) {
          const similarity = calculateSimilarity(query, `${result.name} ${result.snippet}`);
          
          // Only include results with meaningful similarity
          if (similarity > 0.3) {
            allMatches.push({
              title: result.name,
              url: result.url,
              snippet: result.snippet,
              similarity,
              source: classifySource(result.name, result.snippet, result.url)
            });
          }
        }
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Sort by similarity and remove duplicates
    const uniqueMatches = Array.from(
      new Map(allMatches.map(match => [match.url, match])).values()
    ).sort((a, b) => b.similarity - a.similarity);

    return uniqueMatches.slice(0, 5); // Return top 5 matches

  } catch (error) {
    console.error('Error performing Bing search:', error);
    return [];
  }
}

export async function checkOriginality(query: string): Promise<OriginalityCheck> {
  // Clean query (extract headline if structured)
  const cleanQuery = query.replace(/^\*\*HEADLINE:\*\*\s*/i, '').trim();
  
  if (cleanQuery.length < 3) {
    return {
      query: cleanQuery,
      isOriginal: true,
      matches: [],
      confidence: 1.0,
      searchPerformed: false
    };
  }

  // Check cache first
  const cacheKey = getCacheKey(cleanQuery);
  const cached = searchCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.result;
  }

  // Cleanup old cache entries
  cleanupCache();

  // Perform search (try Google first, fallback to Bing)
  let matches: SearchMatch[] = [];
  let searchPerformed = false;

  if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
    matches = await performGoogleSearch(cleanQuery);
    searchPerformed = true;
  } else if (process.env.BING_SEARCH_API_KEY) {
    matches = await performBingSearch(cleanQuery);
    searchPerformed = true;
  }
  
  // Calculate originality score
  let confidence = 1.0;
  let isOriginal = true;

  if (matches.length > 0) {
    const highestSimilarity = Math.max(...matches.map(m => m.similarity));
    
    // Flag as potentially unoriginal if high similarity with brand/campaign content
    if (highestSimilarity > 0.8 && matches.some(m => m.source !== 'general')) {
      isOriginal = false;
      confidence = 1 - highestSimilarity;
    } else if (highestSimilarity > 0.6) {
      confidence = 1 - (highestSimilarity * 0.5); // Moderate confidence reduction
    }
  }

  const result: OriginalityCheck = {
    query: cleanQuery,
    isOriginal,
    matches,
    confidence,
    searchPerformed
  };

  // Cache result
  searchCache.set(cacheKey, { result, timestamp: Date.now() });

  return result;
}

export function getSearchCacheStats(): { size: number; oldestEntry: number } {
  const now = Date.now();
  let oldestTime = now;
  
  for (const [, value] of searchCache.entries()) {
    if (value.timestamp < oldestTime) {
      oldestTime = value.timestamp;
    }
  }
  
  return {
    size: searchCache.size,
    oldestEntry: now - oldestTime
  };
}