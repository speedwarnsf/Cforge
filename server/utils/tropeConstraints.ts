/**
 * Trope Constraint Satisfaction Engine
 * Maps rhetorical devices to structural validation rules
 *
 * Supports ALL 411 rhetorical devices from the corpus with:
 * - Pattern-based validation for common devices (fast)
 * - AI-powered validation for all devices (comprehensive)
 *
 * Integration: Called during convergent phase to validate creative seeds
 * Location: server/utils/tropeConstraints.ts
 */

import OpenAI from 'openai';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getEmbedding, cosineSimilarity } from './embeddingSimilarity';

// ============================================
// DYNAMIC RHETORICAL DEVICE LOADING (411 devices)
// ============================================

interface RhetoricalDevice {
  figure_name: string;
  definition: string;
  examples?: string[];
}

let _allRhetoricalDevices: Record<string, string> | null = null;

/**
 * Load all 411 rhetorical devices from the corpus
 */
export function loadAllRhetoricalDevices(): Record<string, string> {
  if (_allRhetoricalDevices) return _allRhetoricalDevices;

  const possiblePaths = [
    join(process.cwd(), 'data', 'rhetorical_figures_cleaned.json'),
    join(process.cwd(), 'server', 'data', 'rhetorical_figures_cleaned.json'),
    '/var/task/data/rhetorical_figures_cleaned.json',
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      try {
        const data: RhetoricalDevice[] = JSON.parse(readFileSync(p, 'utf-8'));
        const devices: Record<string, string> = {};
        for (const item of data) {
          // Normalize name: lowercase with underscores for ID
          const id = item.figure_name.toLowerCase().replace(/\s+/g, '_');
          devices[id] = item.definition;
        }
        console.log(`📚 TropeConstraints: Loaded ${Object.keys(devices).length} rhetorical devices from ${p}`);
        _allRhetoricalDevices = devices;
        return devices;
      } catch (error) {
        console.error(`Error loading rhetorical devices from ${p}:`, error);
      }
    }
  }

  console.warn('⚠️ rhetorical_figures_cleaned.json not found, using pattern-based devices only');
  _allRhetoricalDevices = {};
  return _allRhetoricalDevices;
}

/**
 * Get all available rhetorical device IDs
 */
export function getAllAvailableDeviceIds(): string[] {
  const devices = loadAllRhetoricalDevices();
  const patternIds = Object.keys(TROPE_PATTERNS);
  const corpusIds = Object.keys(devices);

  // Combine and deduplicate
  return Array.from(new Set([...patternIds, ...corpusIds]));
}

/**
 * Get device definition by ID (checks both patterns and corpus)
 */
export function getDeviceDefinition(deviceId: string): string | undefined {
  const normalizedId = deviceId.toLowerCase().replace(/\s+/g, '_');

  // Check pattern-based definitions first
  const pattern = TROPE_PATTERNS[normalizedId];
  if (pattern) return pattern.description;

  // Check full corpus
  const devices = loadAllRhetoricalDevices();
  return devices[normalizedId];
}

// ============================================
// TROPE PATTERN DEFINITIONS
// ============================================

export interface TropePattern {
  id: string;
  name: string;
  description: string;
  structuralPatterns: RegExp[];
  vocabularyIndicators: string[];
  examplePhrases: string[];
  minimumConfidence: number;
}

export const TROPE_PATTERNS: Record<string, TropePattern> = {
  antithesis: {
    id: 'antithesis',
    name: 'Antithesis',
    description: 'Juxtaposition of contrasting ideas in balanced phrases',
    structuralPatterns: [
      /\b(\w+)\s+(?:but|yet|while|whereas)\s+(\w+)\b/i,
      /\bnot\s+(\w+)[,;]\s*but\s+(\w+)\b/i,
      /\b(\w+)\s+versus\s+(\w+)\b/i,
      /\b(\w+)\s+against\s+(\w+)\b/i,
      /\b(\w+)\s+and\s+(\w+)\s+clash/i
    ],
    vocabularyIndicators: ['but', 'yet', 'while', 'whereas', 'versus', 'against', 'contrast', 'oppose'],
    examplePhrases: [
      'One small step for man, one giant leap for mankind',
      'Speech is silver, but silence is golden',
      'Love is an ideal thing, marriage a real thing'
    ],
    minimumConfidence: 0.6
  },

  paradox: {
    id: 'paradox',
    name: 'Paradox',
    description: 'Self-contradictory statement that reveals deeper truth',
    structuralPatterns: [
      /\b(\w+)\s+(?:is|are|was|were)\s+(?:the\s+)?(?:only|true|real)\s+(\w+)\b/i,
      /\bless\s+is\s+more\b/i,
      /\bmore\s+is\s+less\b/i,
      /\bto\s+(\w+)\s+(?:is\s+)?to\s+(\w+)\b/i,
      /\bthe\s+(\w+)\s+of\s+(\w+)\b.*\bthe\s+\2\s+of\s+\1\b/i
    ],
    vocabularyIndicators: ['paradox', 'contradiction', 'impossibly', 'yet', 'strange', 'truth'],
    examplePhrases: [
      'The only constant is change',
      'Less is more',
      'I must be cruel to be kind'
    ],
    minimumConfidence: 0.65
  },

  metaphor: {
    id: 'metaphor',
    name: 'Metaphor',
    description: 'Direct comparison stating one thing is another',
    structuralPatterns: [
      /\b(\w+)\s+(?:is|are|was|were)\s+(?:a|an|the)\s+(\w+)\b/i,
      /\b(\w+)\s+of\s+(\w+)\b/i,
      /\bthe\s+(\w+)\s+(\w+ed)\b/i,
      /\b(\w+)\s+becomes?\s+(\w+)\b/i,
      /\btransforms?\s+into\s+(\w+)\b/i
    ],
    vocabularyIndicators: ['is', 'becomes', 'transforms', 'embodies', 'represents'],
    examplePhrases: [
      'Time is money',
      'Life is a journey',
      'The world is a stage'
    ],
    minimumConfidence: 0.5
  },

  hyperbole: {
    id: 'hyperbole',
    name: 'Hyperbole',
    description: 'Deliberate exaggeration for emphasis',
    structuralPatterns: [
      /\b(?:never|always|forever|infinite|endless|eternal)\b/i,
      /\b(?:million|billion|trillion|thousand)\s+(?:times|years|miles)\b/i,
      /\b(?:the\s+)?(?:best|worst|greatest|smallest|biggest)\s+(?:ever|in\s+the\s+world|of\s+all\s+time)\b/i,
      /\bso\s+(\w+)\s+(?:that|it)\b/i,
      /\b(?:nothing|everything|everyone|no\s+one)\s+(?:can|will|could)\b/i
    ],
    vocabularyIndicators: ['never', 'always', 'forever', 'infinite', 'endless', 'ultimate', 'absolute', 'every', 'nothing'],
    examplePhrases: [
      'I have told you a million times',
      'This bag weighs a ton',
      'I am so hungry I could eat a horse'
    ],
    minimumConfidence: 0.55
  },

  chiasmus: {
    id: 'chiasmus',
    name: 'Chiasmus',
    description: 'Reversal of grammatical structures in successive phrases (ABBA pattern)',
    structuralPatterns: [
      /\b(\w+)\s+(\w+)[,;]\s+\2\s+\1\b/i,
      /\b(\w+)\s+to\s+(\w+)[,;]\s+\2\s+to\s+\1\b/i,
      /\bwhen\s+(\w+)\s+(\w+)[,;]\s+\2\s+\1\b/i,
      /\b(\w+)\s+the\s+(\w+)[,;]\s+\2\s+the\s+\1\b/i
    ],
    vocabularyIndicators: ['not', 'but', 'first', 'last', 'begin', 'end', 'rise', 'fall'],
    examplePhrases: [
      'Ask not what your country can do for you, ask what you can do for your country',
      'Never let a fool kiss you or a kiss fool you',
      'One should eat to live, not live to eat'
    ],
    minimumConfidence: 0.7
  },

  oxymoron: {
    id: 'oxymoron',
    name: 'Oxymoron',
    description: 'Combination of contradictory terms',
    structuralPatterns: [
      /\b(silent|loud)\s+(scream|whisper|noise|sound)\b/i,
      /\b(beautiful|ugly)\s+(disaster|mess|chaos)\b/i,
      /\b(dark|bright)\s+(light|darkness|shadow)\b/i,
      /\b(living|dead)\s+(death|life|corpse)\b/i,
      /\b(bitter|sweet)\s+(sweet|bitter|taste)\b/i,
      /\b(cruel|kind)\s+(kindness|cruelty)\b/i
    ],
    vocabularyIndicators: ['silent scream', 'deafening silence', 'living dead', 'bittersweet', 'alone together'],
    examplePhrases: [
      'Deafening silence',
      'Bittersweet',
      'Living dead',
      'Cruel kindness'
    ],
    minimumConfidence: 0.75
  },

  personification: {
    id: 'personification',
    name: 'Personification',
    description: 'Attribution of human qualities to non-human entities',
    structuralPatterns: [
      /\b(?:the\s+)?(\w+)\s+(?:whispers?|speaks?|breathes?|lives?|dies?|sleeps?|wakes?)\b/i,
      /\b(?:the\s+)?(\w+)\s+(?:feels?|thinks?|knows?|wants?|loves?|hates?)\b/i,
      /\b(?:the\s+)?(\w+)\s+(?:dances?|sings?|cries?|laughs?|smiles?)\b/i,
      /\b(?:the\s+)?(\w+)\s+(?:reaches?|grabs?|embraces?|touches?)\b/i
    ],
    vocabularyIndicators: ['whisper', 'speaks', 'breathes', 'lives', 'feels', 'dances', 'cries', 'heart'],
    examplePhrases: [
      'The wind whispered secrets',
      'Time waits for no one',
      'The sun smiled down on us'
    ],
    minimumConfidence: 0.6
  },

  juxtaposition: {
    id: 'juxtaposition',
    name: 'Juxtaposition',
    description: 'Placing contrasting elements side by side',
    structuralPatterns: [
      /\bside\s+by\s+side\b/i,
      /\b(\w+)\s+(?:meets?|and)\s+(\w+)\b/i,
      /\bcollision\s+of\s+(\w+)\b/i,
      /\bbetween\s+(\w+)\s+and\s+(\w+)\b/i,
      /\b(\w+)\s+(?:alongside|beside|next\s+to)\s+(\w+)\b/i
    ],
    vocabularyIndicators: ['side by side', 'together', 'collision', 'meets', 'between', 'contrast'],
    examplePhrases: [
      'Youth and age',
      'Rich and poor side by side',
      'The collision of old and new'
    ],
    minimumConfidence: 0.55
  },

  anaphora: {
    id: 'anaphora',
    name: 'Anaphora',
    description: 'Repetition of a word or phrase at the beginning of successive clauses',
    structuralPatterns: [
      /^(\w+\s+\w+)[^.!?]*[.!?]\s*\1/im,
      /\b(I\s+\w+)[^.!?]*[.!?]\s*\1/i,
      /\b(We\s+\w+)[^.!?]*[.!?]\s*\1/i,
      /\b(Every\s+\w+)[^.!?]*[.!?]\s*\1/i
    ],
    vocabularyIndicators: ['I', 'We', 'Every', 'With', 'Through'],
    examplePhrases: [
      'I have a dream... I have a dream... I have a dream',
      'We shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields'
    ],
    minimumConfidence: 0.7
  },

  epistrophe: {
    id: 'epistrophe',
    name: 'Epistrophe',
    description: 'Repetition of a word or phrase at the end of successive clauses',
    structuralPatterns: [
      /(\w+)[.!?]\s*[^.!?]*\1[.!?]/i,
      /\b\w+\s+(\w+)[,;.!?]\s*\w+\s+\1[,;.!?]/i
    ],
    vocabularyIndicators: ['again', 'forever', 'always', 'never'],
    examplePhrases: [
      'See no evil, hear no evil, speak no evil',
      'Government of the people, by the people, for the people'
    ],
    minimumConfidence: 0.7
  },

  synecdoche: {
    id: 'synecdoche',
    name: 'Synecdoche',
    description: 'Part represents the whole or vice versa',
    structuralPatterns: [
      /\b(?:all\s+)?(?:hands|heads|eyes|ears|hearts|souls|minds)\s+(?:on\s+deck|in\s+the|together)\b/i,
      /\b(?:boots|wheels|sails)\s+on\s+the\s+ground\b/i,
      /\bunder\s+(?:my|your|one)\s+roof\b/i
    ],
    vocabularyIndicators: ['hands', 'heads', 'wheels', 'boots', 'roof', 'bread'],
    examplePhrases: [
      'All hands on deck',
      'Nice wheels (referring to a car)',
      'Give us this day our daily bread'
    ],
    minimumConfidence: 0.6
  },

  metonymy: {
    id: 'metonymy',
    name: 'Metonymy',
    description: 'Substitution of related concept for another',
    structuralPatterns: [
      /\bthe\s+(?:crown|throne|white\s+house|pentagon|kremlin|hollywood)\b/i,
      /\bthe\s+(?:pen|sword|press|stage)\b/i,
      /\bsuits?\b.*\b(?:business|corporate|office)\b/i
    ],
    vocabularyIndicators: ['crown', 'throne', 'pen', 'sword', 'Hollywood', 'Wall Street', 'Washington'],
    examplePhrases: [
      'The pen is mightier than the sword',
      'The crown announced new policies',
      'Hollywood released another blockbuster'
    ],
    minimumConfidence: 0.6
  }
};

// ============================================
// VALIDATION INTERFACES
// ============================================

export type ValidationStrength = 'loose' | 'moderate' | 'strict';

export interface TropeValidationResult {
  tropeId: string;
  tropeName: string;
  satisfied: boolean;
  confidence: number;
  matchedPatterns: string[];
  suggestions: string[];
  validationMethod: 'pattern' | 'ai' | 'hybrid';
}

export interface ValidationOptions {
  strength: ValidationStrength;
  useAIFallback: boolean;
  minimumConfidenceOverride?: number;
  requiredTropes?: string[];
}

export interface ConstraintViolation {
  tropeId: string;
  reason: string;
  severity: 'warning' | 'error';
  suggestion: string;
}

// ============================================
// TROPE CONSTRAINT ENGINE CLASS
// ============================================

export class TropeConstraintEngine {
  private openai: OpenAI;
  private validationCache: Map<string, TropeValidationResult>;
  private tropeEmbeddings: Map<string, number[]>;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.validationCache = new Map();
    this.tropeEmbeddings = new Map();
  }

  /**
   * Initialize trope embeddings for semantic matching
   */
  async initialize(): Promise<void> {
    console.log('🎭 Initializing TropeConstraintEngine...');

    for (const [tropeId, pattern] of Object.entries(TROPE_PATTERNS)) {
      const tropeDescription = `${pattern.name}: ${pattern.description}. Examples: ${pattern.examplePhrases.join('; ')}`;
      const embedding = await getEmbedding(tropeDescription);
      this.tropeEmbeddings.set(tropeId, embedding);
    }

    console.log(`   ✅ Initialized ${this.tropeEmbeddings.size} trope embeddings`);
  }

  /**
   * Validate content against a specific trope
   * Supports all 411 rhetorical devices from the corpus
   */
  async validateTropeSatisfaction(
    content: string,
    tropeId: string,
    options: ValidationOptions = {
      strength: 'moderate',
      useAIFallback: true
    }
  ): Promise<TropeValidationResult> {
    // Normalize the trope ID for consistent lookup
    const normalizedId = tropeId.toLowerCase().replace(/\s+/g, '_');
    const cacheKey = `${normalizedId}:${content.substring(0, 100)}:${options.strength}`;

    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    // Check for pattern-based validation (fast path for common devices)
    const tropePattern = TROPE_PATTERNS[normalizedId];

    if (!tropePattern) {
      // Check if device exists in full 411-device corpus
      const corpusDefinition = getDeviceDefinition(normalizedId);

      if (corpusDefinition || options.useAIFallback) {
        // Device found in corpus OR AI fallback enabled - use AI validation
        const aiResult = await this.validateWithAI(content, tropeId, options);
        this.validationCache.set(cacheKey, aiResult);
        return aiResult;
      }

      // Device not found anywhere
      return {
        tropeId: normalizedId,
        tropeName: tropeId,
        satisfied: false,
        confidence: 0,
        matchedPatterns: [],
        suggestions: [`Unknown rhetorical device: ${tropeId}. Available devices: ${getAllAvailableDeviceIds().length}`],
        validationMethod: 'pattern'
      };
    }

    // Pattern-based validation
    const patternResult = this.validateWithPatterns(content, tropePattern, options);

    // Determine if AI fallback is needed
    const confidenceThreshold = this.getConfidenceThreshold(options);
    const needsAIValidation =
      options.useAIFallback &&
      patternResult.confidence < confidenceThreshold &&
      patternResult.confidence > 0.2; // Only use AI if there's some signal

    if (needsAIValidation) {
      const aiResult = await this.validateWithAI(content, tropeId, options);

      // Combine results
      const hybridResult: TropeValidationResult = {
        tropeId,
        tropeName: tropePattern.name,
        satisfied: patternResult.satisfied || aiResult.satisfied,
        confidence: Math.max(patternResult.confidence, aiResult.confidence * 0.9),
        matchedPatterns: [...patternResult.matchedPatterns, ...aiResult.matchedPatterns],
        suggestions: aiResult.suggestions,
        validationMethod: 'hybrid'
      };

      this.validationCache.set(cacheKey, hybridResult);
      return hybridResult;
    }

    this.validationCache.set(cacheKey, patternResult);
    return patternResult;
  }

  /**
   * Validate content against multiple tropes
   */
  async validateMultipleTropes(
    content: string,
    tropeIds: string[],
    options: ValidationOptions = { strength: 'moderate', useAIFallback: true }
  ): Promise<{
    results: TropeValidationResult[];
    overallSatisfaction: number;
    violations: ConstraintViolation[];
  }> {
    const results: TropeValidationResult[] = [];
    const violations: ConstraintViolation[] = [];

    for (const tropeId of tropeIds) {
      const result = await this.validateTropeSatisfaction(content, tropeId, options);
      results.push(result);

      if (!result.satisfied) {
        violations.push({
          tropeId,
          reason: `Content does not satisfy ${result.tropeName} constraints`,
          severity: options.requiredTropes?.includes(tropeId) ? 'error' : 'warning',
          suggestion: result.suggestions[0] || `Consider restructuring to incorporate ${result.tropeName}`
        });
      }
    }

    const overallSatisfaction = results.length > 0
      ? results.filter(r => r.satisfied).length / results.length
      : 0;

    return { results, overallSatisfaction, violations };
  }

  /**
   * Get vocabulary bias for token generation based on trope
   */
  getVocabularyBias(tropeId: string): Map<string, number> {
    const bias = new Map<string, number>();
    const tropePattern = TROPE_PATTERNS[tropeId];

    if (!tropePattern) return bias;

    // Boost vocabulary indicators
    for (const word of tropePattern.vocabularyIndicators) {
      bias.set(word.toLowerCase(), 1.5);
    }

    // Add structural keywords from patterns
    for (const pattern of tropePattern.structuralPatterns) {
      const patternStr = pattern.source;
      const keywords = patternStr.match(/\b[a-z]{3,}\b/gi) || [];
      for (const keyword of keywords) {
        if (!bias.has(keyword.toLowerCase())) {
          bias.set(keyword.toLowerCase(), 1.2);
        }
      }
    }

    return bias;
  }

  /**
   * Suggest tropes that match content semantically
   */
  async suggestMatchingTropes(
    content: string,
    topK: number = 3
  ): Promise<{ tropeId: string; similarity: number }[]> {
    const contentEmbedding = await getEmbedding(content);

    const similarities: { tropeId: string; similarity: number }[] = [];

    Array.from(this.tropeEmbeddings.entries()).forEach(([tropeId, tropeEmbedding]) => {
      const similarity = cosineSimilarity(contentEmbedding, tropeEmbedding);
      similarities.push({ tropeId, similarity });
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Generate trope-constrained variations of content
   */
  async generateConstrainedVariations(
    content: string,
    tropeId: string,
    count: number = 3
  ): Promise<string[]> {
    const tropePattern = TROPE_PATTERNS[tropeId];

    if (!tropePattern) {
      throw new Error(`Unknown trope: ${tropeId}`);
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-5.2-pro',
      messages: [{
        role: 'system',
        content: `You are an expert in rhetorical devices. Your task is to rewrite content
to strongly exhibit the ${tropePattern.name} rhetorical device.

${tropePattern.name}: ${tropePattern.description}

Examples of ${tropePattern.name}:
${tropePattern.examplePhrases.map(p => `- "${p}"`).join('\n')}

Vocabulary to incorporate: ${tropePattern.vocabularyIndicators.join(', ')}`
      }, {
        role: 'user',
        content: `Rewrite this content ${count} different ways, each strongly using ${tropePattern.name}:

"${content}"

Return each variation on a new line, numbered 1-${count}.`
      }],
      temperature: 0.8,
      max_tokens: 500
    });

    const responseText = response.choices[0]?.message?.content || '';
    const variations = responseText
      .split(/\n\d+\.\s*/)
      .map(v => v.trim())
      .filter(v => v.length > 10);

    return variations.slice(0, count);
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private validateWithPatterns(
    content: string,
    tropePattern: TropePattern,
    options: ValidationOptions
  ): TropeValidationResult {
    const matchedPatterns: string[] = [];
    let patternScore = 0;
    let vocabularyScore = 0;

    // Check structural patterns
    for (const pattern of tropePattern.structuralPatterns) {
      if (pattern.test(content)) {
        matchedPatterns.push(pattern.source);
        patternScore += 1;
      }
    }

    // Check vocabulary indicators
    const contentLower = content.toLowerCase();
    const matchedVocab = tropePattern.vocabularyIndicators.filter(
      word => contentLower.includes(word.toLowerCase())
    );
    vocabularyScore = matchedVocab.length / tropePattern.vocabularyIndicators.length;

    // Calculate combined confidence
    const patternConfidence = Math.min(patternScore / 2, 1.0);
    const vocabConfidence = vocabularyScore;
    const confidence = patternConfidence * 0.7 + vocabConfidence * 0.3;

    // Determine satisfaction based on strength
    const threshold = this.getConfidenceThreshold(options);
    const satisfied = confidence >= threshold;

    // Generate suggestions
    const suggestions: string[] = [];
    if (!satisfied) {
      if (patternScore === 0) {
        suggestions.push(`Try using structural patterns like: ${tropePattern.examplePhrases[0]}`);
      }
      if (matchedVocab.length < 2) {
        suggestions.push(`Consider incorporating words like: ${tropePattern.vocabularyIndicators.slice(0, 5).join(', ')}`);
      }
    }

    return {
      tropeId: tropePattern.id,
      tropeName: tropePattern.name,
      satisfied,
      confidence,
      matchedPatterns,
      suggestions,
      validationMethod: 'pattern'
    };
  }

  private async validateWithAI(
    content: string,
    tropeId: string,
    options: ValidationOptions
  ): Promise<TropeValidationResult> {
    const normalizedId = tropeId.toLowerCase().replace(/\s+/g, '_');
    const tropePattern = TROPE_PATTERNS[normalizedId];

    // Get definition from pattern OR from full 411-device corpus
    let tropeName = tropePattern?.name || tropeId;
    let tropeDescription = tropePattern?.description;

    if (!tropeDescription) {
      // Look up in full corpus
      const corpusDefinition = getDeviceDefinition(normalizedId);
      if (corpusDefinition) {
        tropeDescription = corpusDefinition;
        // Format the name nicely
        tropeName = tropeId.split(/[_\s]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      } else {
        tropeDescription = `The rhetorical device known as ${tropeId}`;
      }
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5.2-pro',
        messages: [{
          role: 'user',
          content: `Analyze if this content exhibits the rhetorical device "${tropeName}":

${tropeDescription}

Content: "${content}"

Respond in JSON format:
{
  "satisfied": boolean,
  "confidence": number (0.0 to 1.0),
  "explanation": "brief explanation",
  "improvements": ["suggestion 1", "suggestion 2"]
}`
        }],
        temperature: 0.2,
        max_tokens: 300
      });

      const responseText = response.choices[0]?.message?.content || '{}';

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          tropeId,
          tropeName,
          satisfied: parsed.satisfied || false,
          confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
          matchedPatterns: parsed.explanation ? [parsed.explanation] : [],
          suggestions: parsed.improvements || [],
          validationMethod: 'ai'
        };
      }
    } catch (error) {
      console.error(`AI validation failed for ${tropeId}:`, error);
    }

    // Return default on failure
    return {
      tropeId,
      tropeName,
      satisfied: false,
      confidence: 0,
      matchedPatterns: [],
      suggestions: ['AI validation failed, using pattern matching only'],
      validationMethod: 'ai'
    };
  }

  private getConfidenceThreshold(options: ValidationOptions): number {
    if (options.minimumConfidenceOverride !== undefined) {
      return options.minimumConfidenceOverride;
    }

    switch (options.strength) {
      case 'loose':
        return 0.3;
      case 'moderate':
        return 0.5;
      case 'strict':
        return 0.7;
      default:
        return 0.5;
    }
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }
}

// ============================================
// STANDALONE VALIDATION FUNCTIONS
// ============================================

/**
 * Quick validation without engine instantiation
 */
export function validateTropePattern(
  content: string,
  tropeId: string
): { matched: boolean; patterns: string[] } {
  const tropePattern = TROPE_PATTERNS[tropeId];

  if (!tropePattern) {
    return { matched: false, patterns: [] };
  }

  const matchedPatterns: string[] = [];

  for (const pattern of tropePattern.structuralPatterns) {
    if (pattern.test(content)) {
      matchedPatterns.push(pattern.source);
    }
  }

  return {
    matched: matchedPatterns.length > 0,
    patterns: matchedPatterns
  };
}

/**
 * Check vocabulary alignment with trope
 */
export function checkVocabularyAlignment(
  content: string,
  tropeId: string
): { score: number; matchedWords: string[] } {
  const tropePattern = TROPE_PATTERNS[tropeId];

  if (!tropePattern) {
    return { score: 0, matchedWords: [] };
  }

  const contentLower = content.toLowerCase();
  const matchedWords = tropePattern.vocabularyIndicators.filter(
    word => contentLower.includes(word.toLowerCase())
  );

  return {
    score: matchedWords.length / tropePattern.vocabularyIndicators.length,
    matchedWords
  };
}

/**
 * Get all available trope IDs
 */
/**
 * Get all available trope IDs (patterns + full 411-device corpus)
 */
export function getAvailableTropes(): string[] {
  return getAllAvailableDeviceIds();
}

/**
 * Get trope details by ID (checks patterns first, then full corpus)
 */
export function getTropeDetails(tropeId: string): TropePattern | undefined {
  const normalizedId = tropeId.toLowerCase().replace(/\s+/g, '_');

  // Check pattern-based definitions first
  if (TROPE_PATTERNS[normalizedId]) {
    return TROPE_PATTERNS[normalizedId];
  }

  // Check full corpus and create a minimal TropePattern
  const definition = getDeviceDefinition(normalizedId);
  if (definition) {
    const formattedName = tropeId.split(/[_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return {
      id: normalizedId,
      name: formattedName,
      description: definition,
      structuralPatterns: [], // No patterns for corpus-only devices
      vocabularyIndicators: [],
      examplePhrases: [],
      minimumConfidence: 0.5
    };
  }

  return undefined;
}

// ============================================
// CONSTRAINT GENERATION HELPERS
// ============================================

/**
 * Generate constraint prompt for LLM based on tropes
 * Supports all 411 rhetorical devices from the corpus
 */
export function generateTropeConstraintPrompt(tropeIds: string[]): string {
  const constraints: string[] = [];

  for (const tropeId of tropeIds) {
    // Use getTropeDetails which checks both patterns and corpus
    const details = getTropeDetails(tropeId);
    if (details) {
      const examplePart = details.examplePhrases && details.examplePhrases.length > 0
        ? `\n  Example: "${details.examplePhrases[0]}"`
        : '';
      constraints.push(`- ${details.name}: ${details.description}${examplePart}`);
    } else {
      // Even if not found, include the requested device name
      const formattedName = tropeId.split(/[_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      constraints.push(`- ${formattedName}`);
    }
  }

  if (constraints.length === 0) {
    return '';
  }

  return `Your response MUST incorporate these rhetorical devices:

${constraints.join('\n\n')}

Ensure the rhetorical structure is clear and effective.`;
}

/**
 * Score content against multiple tropes for ranking
 */
export function scoreTropeAlignment(
  content: string,
  tropeIds: string[]
): number {
  let totalScore = 0;

  for (const tropeId of tropeIds) {
    const patternResult = validateTropePattern(content, tropeId);
    const vocabResult = checkVocabularyAlignment(content, tropeId);

    const tropeScore = (patternResult.matched ? 0.7 : 0) + (vocabResult.score * 0.3);
    totalScore += tropeScore;
  }

  return tropeIds.length > 0 ? totalScore / tropeIds.length : 0;
}

// ============================================
// EXPORTS
// ============================================

export default {
  TropeConstraintEngine,
  TROPE_PATTERNS,
  validateTropePattern,
  checkVocabularyAlignment,
  getAvailableTropes,
  getTropeDetails,
  generateTropeConstraintPrompt,
  scoreTropeAlignment
};
