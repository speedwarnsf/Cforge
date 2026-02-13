// 📂 server/utils/enhancedTheoryMapping.ts
// Enhanced Theory Injection with Expanded Keyword-to-Theory Mapping

import { performance } from 'perf_hooks';
import { appendFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load JSON at runtime to avoid esbuild resolution issues
function loadRetrievalCorpus() {
  const possiblePaths = [
    join(process.cwd(), 'data', 'retrieval-corpus.json'),
    join(process.cwd(), 'server', 'data', 'retrieval-corpus.json'),
    '/var/task/data/retrieval-corpus.json',
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf-8'));
    }
  }
  console.warn('retrieval-corpus.json not found, using empty corpus');
  return { campaigns: [] };
}

interface CorpusEntry {
  campaign: string;
  brand: string;
  year: number;
  headline: string;
  rhetoricalDevices: string[];
  rationale: string;
  outcome: string;
  whenToUse: string;
  whenNotToUse: string;
}

const retrievalCorpusData = loadRetrievalCorpus();
const retrievalCorpus: CorpusEntry[] = retrievalCorpusData.campaigns || [];

// Performance caching for theory queries
const corpusQueryCache = new Map<string, any[]>();

// Auto-pre-warm cache with common theories at startup
export function preWarmTheoryCache(): void {
  const commonTheories = ['Burke', 'Barthes', 'Messaris', 'Tufte', 'Lupton', 'Phillips & McQuarrie', 'Forceville', 'Kress', 'Aristotle'];
  
  console.log('Pre-warming theory cache with common frameworks...');
  
  for (const theory of commonTheories) {
    const startTime = performance.now();
    const matches = queryCachedCorpusForTheory(theory);
    const duration = Math.round(performance.now() - startTime);
    console.log(`  - ${theory}: ${matches.length} matches cached in ${duration}ms`);
  }
  
  console.log(`Theory cache pre-warmed: ${corpusQueryCache.size} theories ready`);
}

// A/B testing configuration
const AB_TEST_MODE = false; // Set to true for empirical testing

// Enhanced logging for theory injection debugging
function logTheoryInjection(query: string, detectedKeywords: string[], selectedTheories: Set<string>, theoryInjection: string) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    query,
    detectedKeywords,
    selectedTheories: Array.from(selectedTheories),
    injectionLength: theoryInjection.length,
    theoriesApplied: Array.from(selectedTheories).length
  };
  
  try {
    appendFileSync('./theory_inject.log', `${JSON.stringify(logEntry)}\n`);
    console.log(`🧠 THEORY INJECTION LOG: ${selectedTheories.size} theories applied for query: "${query.substring(0, 50)}..."`);
  } catch (error) {
    console.log('Theory injection logging error:', error);
  }
}

// Cached corpus query function for performance
function queryCachedCorpusForTheory(theory: string): any[] {
  const cacheKey = theory.toLowerCase();
  
  if (corpusQueryCache.has(cacheKey)) {
    console.log(`📚 CACHE HIT: Retrieved ${theory} theory examples from cache`);
    return corpusQueryCache.get(cacheKey) || [];
  }
  
  const matches = retrievalCorpus.filter(entry => 
    entry.rationale?.toLowerCase().includes(cacheKey) ||
    entry.whenToUse?.toLowerCase().includes(cacheKey) ||
    JSON.stringify(entry).toLowerCase().includes(cacheKey)
  );
  
  corpusQueryCache.set(cacheKey, matches);
  console.log(`📚 CACHE MISS: Loaded ${matches.length} examples for ${theory} theory`);
  
  return matches;
}

// EXHAUSTIVE THEORY_MAP: Expanded with nuances, edge cases, cross-overlaps
const THEORY_MAP: { [key: string]: string[] } = {
  // Burke: Identification, motives, dramatism
  'identification': ['Burke'],
  'consubstantiality': ['Burke'],
  'motives': ['Burke'],
  'pentad': ['Burke'],
  'dramatism': ['Burke'],
  'hierarchy': ['Burke', 'Lupton'],
  'scapegoat': ['Burke'],
  'terministic screens': ['Burke'],
  'symbolic action': ['Burke'],
  'unity': ['Burke'],
  'shared identity': ['Burke'],
  'empowerment': ['Burke'],
  'self-love': ['Burke'],
  'self love': ['Burke'],
  'unapologetic': ['Burke'],
  'bold': ['Burke', 'Messaris'],
  'treatment': ['Burke'],  // Edge: Motives in health adherence
  'life': ['Burke'],  // Bold unapologetic life
  'narrative': ['Burke', 'Aristotle'],  // Overlap with ethos/pathos stories
  'persuasion through unity': ['Burke'],
  'healing': ['Burke'],
  'community': ['Burke'],
  'identity': ['Burke'],
  'belonging': ['Burke'],

  // Barthes: Semiotics, myth, image rhetoric
  'semiotics': ['Barthes'],
  'denotation': ['Barthes'],
  'connotation': ['Barthes'],
  'signified': ['Barthes'],
  'signifier': ['Barthes'],
  'myth': ['Barthes'],
  'polysemy': ['Barthes'],
  'anchorage': ['Barthes'],
  'relay': ['Barthes'],
  'linguistic message': ['Barthes'],
  'iconic message': ['Barthes'],
  'stigma': ['Barthes'],
  'cultural': ['Barthes'],
  'reclaim': ['Barthes'],
  'layered meanings': ['Barthes'],
  'image rhetoric': ['Barthes'],
  'coded': ['Barthes'],
  'non-coded': ['Barthes'],  // Edge: Naturalized myths in health ads
  'stereotype': ['Barthes'],
  'cultural myths': ['Barthes'],
  'social meaning': ['Barthes'],
  'symbol': ['Barthes'],
  'decode': ['Barthes'],

  // Messaris: Visual persuasion, analogical, indexicality
  'visual persuasion': ['Messaris'],
  'analogical thinking': ['Messaris'],
  'indexicality': ['Messaris'],
  'iconicity': ['Messaris'],
  'syntactic indeterminacy': ['Messaris'],
  'visual syntax': ['Messaris'],
  'pro-filmic': ['Messaris'],
  'hidden editing': ['Messaris'],
  'subconscious influence': ['Messaris'],
  'visual': ['Messaris', 'Tufte', 'Phillips & McQuarrie'],
  'imagery': ['Messaris', 'Phillips & McQuarrie'],
  'persuasion': ['Messaris', 'Burke', 'Aristotle'],
  'ironic': ['Messaris'],
  'edgy': ['Messaris', 'Lupton'],
  'sexy': ['Messaris'],
  'nyc edge': ['Messaris', 'Lupton'],
  'cross-cultural': ['Messaris'],  // Edge: Global health visuals
  'provocative': ['Messaris'],
  'striking': ['Messaris'],
  'visual rhetoric': ['Messaris', 'Phillips & McQuarrie', 'Foss'],

  // Lupton: Typography, design theory, grids
  'typography': ['Lupton'],
  'design theory': ['Lupton'],
  'grid': ['Lupton'],
  'modular': ['Lupton'],
  'deconstruction': ['Lupton'],
  'accessibility': ['Lupton'],
  'voice': ['Lupton'],
  'contrast': ['Lupton'],
  'repetition': ['Lupton'],
  'alignment': ['Lupton'],
  'design': ['Lupton'],
  'graphic': ['Lupton'],
  'inclusive': ['Lupton'],  // Edge: Diverse spokesmodels in ads
  'typeface': ['Lupton'],
  'layout': ['Lupton'],
  'modern': ['Lupton'],
  'clean': ['Lupton'],

  // Tufte: Quantitative display, data-ink
  'quantitative': ['Tufte'],
  'data-ink': ['Tufte'],
  'chartjunk': ['Tufte'],
  'small multiples': ['Tufte'],
  'sparklines': ['Tufte'],
  'graphical integrity': ['Tufte'],
  'lie factor': ['Tufte'],
  'data visualization': ['Tufte'],
  'display': ['Tufte'],
  'data': ['Tufte'],
  'infographics': ['Tufte'],  // Niche: Data-heavy health briefs
  'health stats': ['Tufte'],  // Edge: Visualizing HIV treatment adherence
  'information': ['Tufte'],
  'clarity': ['Tufte'],
  'statistical': ['Tufte'],
  'evidence': ['Tufte'],

  // Phillips & McQuarrie: Visual rhetoric typology
  'typology': ['Phillips & McQuarrie'],
  'figures': ['Phillips & McQuarrie'],
  'schemes': ['Phillips & McQuarrie'],
  'tropes': ['Phillips & McQuarrie'],
  'connection': ['Phillips & McQuarrie'],
  'juxtaposition': ['Phillips & McQuarrie'],
  'fusion': ['Phillips & McQuarrie'],
  'replacement': ['Phillips & McQuarrie'],
  'comparison': ['Phillips & McQuarrie'],
  'similarity': ['Phillips & McQuarrie'],
  'opposition': ['Phillips & McQuarrie'],
  'deviation': ['Phillips & McQuarrie'],
  'rhyme': ['Phillips & McQuarrie'],
  'reversal': ['Phillips & McQuarrie'],
  'hyperbole': ['Phillips & McQuarrie'],
  'complexity': ['Phillips & McQuarrie'],
  'ambiguity': ['Phillips & McQuarrie'],
  'linguistic': ['Phillips & McQuarrie'],
  'wordplay': ['Phillips & McQuarrie'],
  'verbal': ['Phillips & McQuarrie'],

  // Additional theoretical frameworks (reaching 15)
  'logos': ['Aristotle'],
  'pathos': ['Aristotle'],
  'ethos': ['Aristotle'],
  'artistic proofs': ['Aristotle'],
  'persuasive appeals': ['Aristotle', 'Messaris'],
  'multimodal': ['Forceville', 'Kress'],
  'metaphor': ['Forceville'],
  'decoding': ['Williamson'],
  'ideology': ['Williamson'],
  'product as hero': ['Scott'],
  'visual product': ['Foss', 'Scott'],
  'rhetorical perspective': ['Foss'],
  'framing': ['General Framing Theory'],
  'gestalt': ['Gestalt Theory'],
  'perception': ['Gestalt Theory', 'Messaris'],

  // Cross-framework keywords & overlaps
  'rhetoric': ['Burke', 'Barthes', 'Aristotle', 'Phillips & McQuarrie'],
  'health': ['Burke', 'Barthes', 'Tufte'],
  'advertising': ['Messaris', 'Phillips & McQuarrie', 'Williamson'],
  'campaign': ['Messaris', 'Phillips & McQuarrie'],
  'creative': ['Lupton', 'Messaris'],
  'audience': ['Burke', 'Barthes'],
  'message': ['Phillips & McQuarrie', 'Messaris'],

  // HIV/Public Health specific
  'hiv': ['Burke', 'Barthes'],
  'aids': ['Burke', 'Barthes'],
  'prevention': ['Burke'],
  'awareness': ['Barthes', 'Messaris'],
  'public health': ['Burke', 'Barthes'],
  'medical': ['Burke'],
  'wellness': ['Burke']
};

interface TheoryInjectionResult {
  detectedKeywords: string[];
  selectedTheories: string[];
  theoryInjection: string;
  enhancedPrompt: string;
}

/**
 * Dynamically detects query elements, maps to theories, queries corpus for tailored details
 * and injects them into the prompt for full theoretical advantage
 */
export function generateConceptWithTheoryInject(
  basePrompt: string, 
  query: string, 
  retrievedExamples: any[] = []
): TheoryInjectionResult {
  
  const queryLower = query.toLowerCase();
  
  // Detect keywords in query
  const detectedKeywords = Object.keys(THEORY_MAP).filter(keyword => 
    queryLower.includes(keyword)
  );
  
  // Map keywords to theories (deduplicated)
  const selectedTheories = Array.from(new Set(
    detectedKeywords.flatMap(keyword => THEORY_MAP[keyword])
  ));
  
  console.log(`ENHANCED THEORY MAPPING: Detected "${detectedKeywords.join(', ')}" → Selected theories: ${selectedTheories.join(', ')}`);
  
  // Generate theory injection text
  let theoryInjection = "";
  const selectedTheoriesSet = new Set(selectedTheories);
  
  for (const theory of selectedTheories) {
    // Use cached corpus query for performance
    const matches = queryCachedCorpusForTheory(theory);
    
    if (matches.length > 0) {
      // Select random sample if multiple matches
      const sample = matches[Math.floor(Math.random() * matches.length)];
      const rationale = sample.rationale || '';
      const usage = sample.whenToUse || '';
      const notUsage = sample.whenNotToUse || '';
      const examples = sample.examples || '';
      const awards = sample.awards || '';
      const headline = sample.headline || '';
      
      // Token optimization: Truncate lengthy content to reduce 78% prompt overhead
      const truncatedRationale = rationale.length > 200 ? rationale.substring(0, 200) + "..." : rationale;
      const truncatedUsage = usage.length > 150 ? usage.substring(0, 150) + "..." : usage;
      const truncatedExamples = examples.length > 150 ? examples.substring(0, 150) + "..." : examples;
      
      theoryInjection += `\nPrioritize ${theory} Framework: ${truncatedRationale}. Usage: ${truncatedUsage}. ` +
        `Examples: ${truncatedExamples}. Awards: ${awards.substring(0, 100)}. ` +
        `Avoid if: ${notUsage.substring(0, 100)} or quantitative distortion.`;
    } else {
      // Fallback theoretical guidance with nuanced application
      theoryInjection += `\nApply ${theory} theoretical framework for sophisticated concept development. ` +
        `Balance theoretical rigor with practical application, avoiding ambiguity in health messaging.`;
    }
  }
  
  // Add fallback if no theory injection generated
  if (!theoryInjection && selectedTheories.length === 0) {
    theoryInjection = "\nApply general rhetorical principles: Balance logos/pathos/ethos, avoid ambiguity in health messaging, maintain theoretical sophistication.";
  }

  // Token optimization: Cap total injection to reduce overhead from 78% to ~60%
  if (theoryInjection.length > 5000) {
    theoryInjection = theoryInjection.substring(0, 5000) + "... [Truncated for efficiency]";
  }

  // Log theory injection for debugging and analysis
  logTheoryInjection(query, detectedKeywords, selectedTheoriesSet, theoryInjection);

  // Create enhanced prompt with optimized theory injection
  const enhancedPrompt = `${basePrompt}\n${theoryInjection}\n` +
    `Retrieved examples: ${JSON.stringify(retrievedExamples).substring(0, 1000)}\n` +
    `Generate transformative concept preserving devices, originality, and theoretical grounding with nuanced application.`;
  
  return {
    detectedKeywords,
    selectedTheories,
    theoryInjection,
    enhancedPrompt
  };
}

/**
 * A/B testing wrapper for empirical theory impact measurement
 */
export function abTestGenerate(basePrompt: string, query: string, retrievedExamples: any[] = []) {
  if (AB_TEST_MODE) {
    const startTime = performance.now();
    
    // Version without theory injection
    const noTheoryPrompt = `${basePrompt}\nRetrieved examples: ${JSON.stringify(retrievedExamples)}\nGenerate without theory focus.`;
    
    // Version with theory injection
    const withTheoryResult = generateConceptWithTheoryInject(basePrompt, query, retrievedExamples);
    
    const endTime = performance.now();
    const processingTime = Math.round(endTime - startTime);
    
    console.log(`🧪 A/B TEST MODE: Generated both variants in ${processingTime}ms. Theories applied: ${withTheoryResult.selectedTheories.join(', ')}`);
    
    return {
      withTheory: withTheoryResult.enhancedPrompt,
      noTheory: noTheoryPrompt,
      theoryData: withTheoryResult,
      processingTime
    };
  } else {
    return generateConceptWithTheoryInject(basePrompt, query, retrievedExamples);
  }
}

/**
 * Advanced theory detection with pattern matching for complex queries
 */
export function detectTheoryContext(query: string): {
  primaryFramework: string | null;
  secondaryFrameworks: string[];
  contextualHints: string[];
} {
  const queryLower = query.toLowerCase();
  
  // Advanced pattern detection
  const patterns = {
    'Burke': /\b(empowerment|identity|community|belonging|treatment|healing|self-love)\b/g,
    'Barthes': /\b(stigma|myth|cultural|stereotype|decode|symbol|reclaim)\b/g,
    'Messaris': /\b(visual|imagery|provocative|striking|edgy|sexy|persuasion)\b/g,
    'Lupton': /\b(typography|design|graphic|typeface|layout|modern|clean)\b/g,
    'Tufte': /\b(data|quantitative|information|clarity|evidence|statistical)\b/g,
    'Phillips & McQuarrie': /\b(rhetoric|wordplay|linguistic|verbal|typology)\b/g
  };
  
  const matches: { [theory: string]: number } = {};
  const contextualHints: string[] = [];
  
  for (const [theory, pattern] of Object.entries(patterns)) {
    const foundMatches = queryLower.match(pattern);
    if (foundMatches) {
      matches[theory] = foundMatches.length;
      contextualHints.push(...foundMatches);
    }
  }
  
  // Sort theories by match count
  const sortedTheories = Object.entries(matches)
    .sort(([,a], [,b]) => b - a)
    .map(([theory]) => theory);
  
  return {
    primaryFramework: sortedTheories[0] || null,
    secondaryFrameworks: sortedTheories.slice(1),
    contextualHints: Array.from(new Set(contextualHints))
  };
}

/**
 * Context-aware theory prioritization for specific campaign types
 */
export function getContextualTheoryPriority(query: string): string[] {
  const queryLower = query.toLowerCase();
  
  // HIV/Public Health campaigns
  if (queryLower.includes('hiv') || queryLower.includes('aids') || queryLower.includes('public health')) {
    return ['Burke', 'Barthes', 'Messaris']; // Identification + Semiotics + Visual Persuasion
  }
  
  // Visual/Design heavy campaigns
  if (queryLower.includes('visual') || queryLower.includes('design') || queryLower.includes('edgy')) {
    return ['Messaris', 'Lupton', 'Phillips & McQuarrie'];
  }
  
  // Data/Information campaigns
  if (queryLower.includes('data') || queryLower.includes('statistics') || queryLower.includes('evidence')) {
    return ['Tufte', 'Messaris', 'Phillips & McQuarrie'];
  }
  
  // Empowerment/Identity campaigns
  if (queryLower.includes('empowerment') || queryLower.includes('identity') || queryLower.includes('self')) {
    return ['Burke', 'Barthes', 'Messaris'];
  }
  
  // Default balanced approach
  return ['Burke', 'Barthes', 'Messaris', 'Lupton', 'Phillips & McQuarrie'];
}

export { THEORY_MAP };