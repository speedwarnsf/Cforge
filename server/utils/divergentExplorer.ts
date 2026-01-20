/**
 * Divergent Thinking Engine
 * Implements constraint-free ideation with persona-augmented sampling
 *
 * Integration: Called BEFORE rhetorical constraints are applied
 * Location: server/utils/divergentExplorer.ts
 */

import OpenAI from 'openai';
import { getEmbedding, cosineSimilarity } from './embeddingSimilarity';

// ============================================
// PERSONA DEFINITIONS
// ============================================

export interface CreativePersona {
  id: string;
  name: string;
  perspective: string;
  vocabularyBias: string[];
  temperatureModifier: number;
  systemPromptOverride: string;
}

export const CREATIVE_PERSONAS: CreativePersona[] = [
  {
    id: 'maverick',
    name: 'Maverick Creative',
    perspective: 'Category disruption and shock value',
    vocabularyBias: ['unexpected', 'provocative', 'disruptive', 'radical'],
    temperatureModifier: 0.3,
    systemPromptOverride: `You are a rebellious creative director who believes the best
advertising breaks every rule. You seek concepts that make people uncomfortable before
they make them think. Your ideas should feel dangerous and unprecedented.`
  },
  {
    id: 'anthropologist',
    name: 'Cultural Anthropologist',
    perspective: 'Deep human insights and behavioral patterns',
    vocabularyBias: ['ritual', 'identity', 'belonging', 'transformation'],
    temperatureModifier: 0.1,
    systemPromptOverride: `You are a cultural anthropologist studying human behavior.
You see advertising as artifacts that reveal deeper truths about society. Your concepts
tap into universal human needs: belonging, identity, transformation, meaning.`
  },
  {
    id: 'poet',
    name: 'Visual Poet',
    perspective: 'Metaphorical imagery and sensory language',
    vocabularyBias: ['luminous', 'whisper', 'cascade', 'dissolve'],
    temperatureModifier: 0.2,
    systemPromptOverride: `You are a visual poet who believes every image tells a story
and every word paints a picture. Your concepts are sensory experiences first, messages
second. Beauty is the vehicle for meaning.`
  },
  {
    id: 'provocateur',
    name: 'Strategic Provocateur',
    perspective: 'Business logic with creative tension',
    vocabularyBias: ['paradox', 'tension', 'counterintuitive', 'leverage'],
    temperatureModifier: 0.15,
    systemPromptOverride: `You are a strategic provocateur who finds the tension between
business objectives and creative expression. Your concepts are paradoxes that resolve
into powerful positioning. You make brands memorable by making them uncomfortable.`
  },
  {
    id: 'empath',
    name: 'Empathy Engineer',
    perspective: 'Emotional resonance and human connection',
    vocabularyBias: ['intimate', 'vulnerable', 'authentic', 'tender'],
    temperatureModifier: 0.05,
    systemPromptOverride: `You are an empathy engineer who designs emotional experiences.
You believe the best advertising doesn't sell products—it creates moments of genuine
human connection. Your concepts make people feel seen and understood.`
  }
];

// ============================================
// CREATIVE SEED INTERFACE
// ============================================

export interface CreativeSeed {
  id: string;
  rawIdea: string;
  persona: CreativePersona;
  embedding: number[];
  distinctivenessScore: number;
  thematicCoherence: number;
  tropeCompatibility: string[];
  timestamp: Date;
}

export interface DivergentPool {
  seeds: CreativeSeed[];
  userBrief: string;
  theme: string;
  generationMetrics: {
    totalGenerated: number;
    uniqueAfterDedup: number;
    averageDistinctiveness: number;
    personaDistribution: Record<string, number>;
  };
}

// ============================================
// DIVERGENT EXPLORATION PROMPT
// ============================================

const DIVERGENT_EXPLORATION_PROMPT = `
You are in PURE EXPLORATION MODE. Your task is to generate surprising, unconventional,
and unexpected creative directions for the given theme.

CRITICAL RULES FOR THIS PHASE:
1. IGNORE all advertising conventions and best practices
2. DO NOT think about rhetorical devices or persuasion techniques
3. DO NOT optimize for clarity or commercial viability
4. EMBRACE strange connections, unusual metaphors, and unexpected angles
5. PRIORITIZE surprise and distinctiveness over everything else

Theme to explore: {theme}

Generate 5 radically different creative directions. For each:
- Start from an unexpected entry point (NOT the obvious angle)
- Make surprising connections to unrelated domains
- Propose imagery or scenarios that feel fresh and unprecedented
- Express the core tension or insight in a single provocative phrase

Format each as:
DIRECTION [N]:
Entry Point: [unexpected starting perspective]
Connection: [surprising link to unrelated domain]
Core Tension: [the paradox or insight at the heart]
Provocative Phrase: [single memorable expression]
Visual Spark: [unexpected imagery]

Remember: The goal is DIVERGENCE. Generate ideas that would make a traditional
creative director uncomfortable. We'll refine later—now we explore.
`;

// ============================================
// MAIN DIVERGENT EXPLORATION FUNCTION
// ============================================

export async function exploreDivergently(
  userBrief: string,
  options: {
    poolSize?: number;
    personaRotation?: 'sequential' | 'random' | 'weighted';
    maxTemperature?: number;
    historicalEmbeddings?: number[][];
  } = {}
): Promise<DivergentPool> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const {
    poolSize = 15,
    personaRotation = 'weighted',
    maxTemperature = 1.5,
    historicalEmbeddings = []
  } = options;

  const seeds: CreativeSeed[] = [];
  const personaCounts: Record<string, number> = {};

  // Extract theme from user brief
  const theme = await extractTheme(userBrief, openai);

  console.log(`🌀 Starting divergent exploration for theme: "${theme}"`);
  console.log(`   Pool size target: ${poolSize}`);
  console.log(`   Persona rotation: ${personaRotation}`);

  // Generate raw ideas across personas
  const iterationsNeeded = Math.ceil(poolSize / 5); // Each persona generates ~5 ideas

  for (let i = 0; i < iterationsNeeded; i++) {
    const persona = selectPersona(i, personaRotation, personaCounts);
    personaCounts[persona.id] = (personaCounts[persona.id] || 0) + 1;

    const temperature = Math.min(
      1.0 + persona.temperatureModifier,
      maxTemperature
    );

    try {
      const rawIdeas = await generateRawIdeas(
        openai,
        theme,
        persona,
        temperature
      );

      for (const idea of rawIdeas) {
        if (seeds.length >= poolSize) break;

        const embedding = await getEmbedding(idea);

        // Calculate distinctiveness against existing seeds and history
        const distinctiveness = calculateDistinctiveness(
          embedding,
          seeds.map(s => s.embedding),
          historicalEmbeddings
        );

        // Check thematic coherence with original brief
        const coherence = await checkThematicCoherence(
          idea,
          userBrief,
          openai
        );

        // Identify compatible rhetorical tropes
        const compatibleTropes = identifyCompatibleTropes(idea);

        seeds.push({
          id: `seed_${Date.now()}_${seeds.length}`,
          rawIdea: idea,
          persona,
          embedding,
          distinctivenessScore: distinctiveness,
          thematicCoherence: coherence,
          tropeCompatibility: compatibleTropes,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error(`   ⚠️ Failed generation for persona ${persona.name}:`, error);
    }

    if (seeds.length >= poolSize) break;
  }

  // Deduplicate seeds
  const uniqueSeeds = deduplicateSeeds(seeds);

  // Calculate pool metrics
  const metrics = {
    totalGenerated: seeds.length,
    uniqueAfterDedup: uniqueSeeds.length,
    averageDistinctiveness: uniqueSeeds.length > 0
      ? uniqueSeeds.reduce((sum, s) => sum + s.distinctivenessScore, 0) / uniqueSeeds.length
      : 0,
    personaDistribution: personaCounts
  };

  console.log(`✅ Divergent exploration complete:`);
  console.log(`   Total seeds: ${metrics.totalGenerated}`);
  console.log(`   Unique seeds: ${metrics.uniqueAfterDedup}`);
  console.log(`   Avg distinctiveness: ${(metrics.averageDistinctiveness * 100).toFixed(1)}%`);

  return {
    seeds: uniqueSeeds,
    userBrief,
    theme,
    generationMetrics: metrics
  };
}

// ============================================
// CREATIVE SEED SELECTION
// ============================================

export interface SeedSelectionCriteria {
  distinctivenessWeight: number;
  coherenceWeight: number;
  tropeCompatibilityWeight: number;
  minimumDistinctiveness: number;
  minimumCoherence: number;
}

export async function selectCreativeSeed(
  pool: DivergentPool,
  criteria: SeedSelectionCriteria = {
    distinctivenessWeight: 0.4,
    coherenceWeight: 0.3,
    tropeCompatibilityWeight: 0.3,
    minimumDistinctiveness: 0.3,
    minimumCoherence: 0.5
  }
): Promise<CreativeSeed> {
  // Filter seeds meeting minimum thresholds
  const eligibleSeeds = pool.seeds.filter(seed =>
    seed.distinctivenessScore >= criteria.minimumDistinctiveness &&
    seed.thematicCoherence >= criteria.minimumCoherence &&
    seed.tropeCompatibility.length > 0
  );

  if (eligibleSeeds.length === 0) {
    console.warn('⚠️ No seeds met minimum criteria, using best available');
    // Fall back to highest combined score
    return pool.seeds.reduce((best, current) => {
      const bestScore = best.distinctivenessScore + best.thematicCoherence;
      const currentScore = current.distinctivenessScore + current.thematicCoherence;
      return currentScore > bestScore ? current : best;
    });
  }

  // Score each eligible seed
  const scoredSeeds = eligibleSeeds.map(seed => ({
    seed,
    score:
      seed.distinctivenessScore * criteria.distinctivenessWeight +
      seed.thematicCoherence * criteria.coherenceWeight +
      (seed.tropeCompatibility.length / 5) * criteria.tropeCompatibilityWeight
  }));

  // Sort by score and select top
  scoredSeeds.sort((a, b) => b.score - a.score);

  const selected = scoredSeeds[0].seed;

  console.log(`🎯 Selected creative seed:`);
  console.log(`   Persona: ${selected.persona.name}`);
  console.log(`   Distinctiveness: ${(selected.distinctivenessScore * 100).toFixed(1)}%`);
  console.log(`   Coherence: ${(selected.thematicCoherence * 100).toFixed(1)}%`);
  console.log(`   Compatible tropes: ${selected.tropeCompatibility.join(', ')}`);
  console.log(`   Raw idea: "${selected.rawIdea.substring(0, 100)}..."`);

  return selected;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function extractTheme(brief: string, openai: OpenAI): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Extract the core theme/subject from this creative brief in 3-5 words:
"${brief}"

Return ONLY the theme, nothing else.`
    }],
    temperature: 0.3,
    max_tokens: 20
  });

  return response.choices[0]?.message?.content?.trim() || brief.split(' ').slice(0, 5).join(' ');
}

function selectPersona(
  index: number,
  rotation: 'sequential' | 'random' | 'weighted',
  counts: Record<string, number>
): CreativePersona {
  switch (rotation) {
    case 'sequential':
      return CREATIVE_PERSONAS[index % CREATIVE_PERSONAS.length];

    case 'random':
      return CREATIVE_PERSONAS[Math.floor(Math.random() * CREATIVE_PERSONAS.length)];

    case 'weighted':
      // Favor less-used personas
      const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0) || 1;
      const weights = CREATIVE_PERSONAS.map(p => {
        const usageRatio = (counts[p.id] || 0) / totalCount;
        return 1 - usageRatio;
      });
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) return CREATIVE_PERSONAS[i];
      }
      return CREATIVE_PERSONAS[0];

    default:
      return CREATIVE_PERSONAS[index % CREATIVE_PERSONAS.length];
  }
}

async function generateRawIdeas(
  openai: OpenAI,
  theme: string,
  persona: CreativePersona,
  temperature: number
): Promise<string[]> {
  const prompt = DIVERGENT_EXPLORATION_PROMPT.replace('{theme}', theme);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: persona.systemPromptOverride },
      { role: 'user', content: prompt }
    ],
    temperature,
    max_tokens: 1500
  });

  const content = response.choices[0]?.message?.content || '';

  // Parse directions from response
  const directions = content.split(/DIRECTION \[\d+\]:/).filter(d => d.trim());

  return directions.map(d => {
    const phrase = d.match(/Provocative Phrase:\s*(.+?)(?=\n|$)/)?.[1] || '';
    const visual = d.match(/Visual Spark:\s*(.+?)(?=\n|$)/)?.[1] || '';
    const tension = d.match(/Core Tension:\s*(.+?)(?=\n|$)/)?.[1] || '';
    return `${phrase} | ${tension} | ${visual}`.trim();
  }).filter(idea => idea.length > 10);
}

function calculateDistinctiveness(
  embedding: number[],
  existingEmbeddings: number[][],
  historicalEmbeddings: number[][]
): number {
  if (existingEmbeddings.length === 0 && historicalEmbeddings.length === 0) {
    return 1.0;
  }

  const allEmbeddings = [...existingEmbeddings, ...historicalEmbeddings];

  // Calculate max similarity to any existing concept
  const maxSimilarity = Math.max(
    ...allEmbeddings.map(e => cosineSimilarity(embedding, e))
  );

  // Distinctiveness is inverse of similarity
  return 1 - maxSimilarity;
}

async function checkThematicCoherence(
  idea: string,
  brief: string,
  openai: OpenAI
): Promise<number> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Rate how well this creative idea relates to the original brief (0.0 to 1.0):

Brief: "${brief}"
Idea: "${idea}"

Consider: Does the idea serve the brief's goals even if the approach is unconventional?
Return ONLY a decimal number between 0.0 and 1.0.`
    }],
    temperature: 0.2,
    max_tokens: 10
  });

  const score = parseFloat(response.choices[0]?.message?.content || '0.5');
  return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
}

function identifyCompatibleTropes(idea: string): string[] {
  // Pattern matching for rhetorical device compatibility
  const tropePatterns: Record<string, RegExp[]> = {
    'Paradox': [/contradict/i, /opposite/i, /yet/i, /but/i, /tension/i],
    'Metaphor': [/like/i, /as if/i, /becomes/i, /transforms/i],
    'Antithesis': [/versus/i, /against/i, /contrast/i, /between/i],
    'Hyperbole': [/never/i, /always/i, /every/i, /ultimate/i, /infinite/i],
    'Oxymoron': [/silent.*loud/i, /beautiful.*ugly/i, /dark.*light/i],
    'Personification': [/whisper/i, /speaks/i, /breathes/i, /lives/i],
    'Chiasmus': [/first.*last/i, /begin.*end/i, /rise.*fall/i],
    'Juxtaposition': [/side by side/i, /together/i, /collision/i]
  };

  const compatible: string[] = [];
  const ideaLower = idea.toLowerCase();

  for (const [trope, patterns] of Object.entries(tropePatterns)) {
    if (patterns.some(p => p.test(ideaLower))) {
      compatible.push(trope);
    }
  }

  // If no patterns matched, suggest universal tropes
  if (compatible.length === 0) {
    compatible.push('Metaphor', 'Hyperbole');
  }

  return compatible.slice(0, 5);
}

function deduplicateSeeds(seeds: CreativeSeed[]): CreativeSeed[] {
  const unique: CreativeSeed[] = [];
  const SIMILARITY_THRESHOLD = 0.85;

  for (const seed of seeds) {
    const isDuplicate = unique.some(
      existing => cosineSimilarity(seed.embedding, existing.embedding) > SIMILARITY_THRESHOLD
    );

    if (!isDuplicate) {
      unique.push(seed);
    }
  }

  return unique;
}

export default {
  exploreDivergently,
  selectCreativeSeed,
  CREATIVE_PERSONAS
};
