/**
 * Divergent Thinking Engine
 * Implements constraint-free ideation with persona-augmented sampling
 * NOW WITH: Rhetorical device injection for forced creative diversity
 *
 * Integration: Called BEFORE rhetorical constraints are applied
 * Location: server/utils/divergentExplorer.ts
 */

import OpenAI from 'openai';
import { getEmbedding, cosineSimilarity } from './embeddingSimilarity';
import { loadAllRhetoricalDevices, getAllAvailableDeviceIds, getDeviceDefinition } from './tropeConstraints';

// ============================================
// RHETORICAL DEVICE INJECTION
// ============================================

/**
 * Get a random selection of lesser-known rhetorical devices
 * Avoids the common ones (metaphor, simile, hyperbole, etc.)
 */
function getUncommonDevices(count: number): Array<{ id: string; name: string; definition: string }> {
  const commonDevices = new Set([
    'metaphor', 'simile', 'hyperbole', 'personification', 'alliteration',
    'onomatopoeia', 'oxymoron', 'irony', 'paradox', 'analogy',
    'antithesis', 'juxtaposition', 'repetition', 'rhetorical_question'
  ]);

  const allDevices = loadAllRhetoricalDevices();
  const allIds = Object.keys(allDevices);

  // Filter to uncommon devices
  const uncommonIds = allIds.filter(id => !commonDevices.has(id));

  // Shuffle and pick
  const shuffled = uncommonIds.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map(id => ({
    id,
    name: id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    definition: allDevices[id] || getDeviceDefinition(id) || 'A rhetorical device'
  }));
}

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

/**
 * Build exploration prompt with optional rhetorical device anchor
 * The device anchor forces divergent thinking by grounding exploration
 * in a specific, often unusual rhetorical approach
 */
function buildExplorationPrompt(theme: string, device?: { name: string; definition: string }): string {
  const deviceAnchor = device ? `
**CREATIVE ANCHOR - Use this rhetorical device as your starting point:**
Device: ${device.name}
Definition: ${device.definition}

Your creative directions MUST explore how this device could be applied unexpectedly.
Think about: What visual metaphors does this device suggest? What unexpected domains
could this device connect to? How could this device create tension or surprise?

` : '';

  return `You are in PURE EXPLORATION MODE. Your task is to generate surprising, unconventional,
and unexpected creative directions for the given theme.

CRITICAL RULES FOR THIS PHASE:
1. Each direction must explore a COMPLETELY DIFFERENT conceptual territory
2. AVOID legal/forensic/courtroom imagery (overused)
3. AVOID medical/clinical imagery (overused)
4. EMBRACE strange connections to: food, music, architecture, astronomy, textiles, geology, botany, dance, mathematics, weather
5. PRIORITIZE surprise and distinctiveness over everything else
6. Each direction should feel like it came from a different creative mind

${deviceAnchor}Theme to explore: ${theme}

Generate 5 radically different creative directions. Each must be THEMATICALLY DISTINCT from the others.

Format each as:
DIRECTION [N]:
Entry Point: [unexpected starting perspective - NOT legal, medical, or forensic]
Connection: [surprising link to an unrelated domain like music, architecture, food, nature, astronomy]
Core Tension: [the paradox or insight at the heart]
Provocative Phrase: [single memorable expression]
Visual Spark: [unexpected imagery - be specific and visual]

Remember: The goal is MAXIMUM DIVERGENCE. If two directions feel similar, one of them is wrong.
Each direction should feel like it could anchor an entirely different campaign.`;
}

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

  const personaCounts: Record<string, number> = {};

  // Extract theme from user brief
  const theme = await extractTheme(userBrief, openai);

  console.log(`🌀 Starting divergent exploration for theme: "${theme}"`);
  console.log(`   Pool size target: ${poolSize}`);
  console.log(`   Persona rotation: ${personaRotation}`);

  // Generate raw ideas across personas
  const iterationsNeeded = Math.ceil(poolSize / 5); // Each persona generates ~5 ideas

  // Get uncommon rhetorical devices to anchor each persona's exploration
  // This forces creative diversity by grounding each exploration in different rhetorical territory
  const deviceAnchors = getUncommonDevices(iterationsNeeded);
  console.log(`   🎭 Anchoring exploration with ${deviceAnchors.length} uncommon rhetorical devices:`);
  deviceAnchors.forEach((d, i) => console.log(`      ${i + 1}. ${d.name}: "${d.definition.substring(0, 60)}..."`));

  // PARALLEL OPTIMIZATION: Run all persona iterations in parallel
  console.log(`   🚀 Running ${iterationsNeeded} persona iterations in parallel...`);

  const personaIterations = Array.from({ length: iterationsNeeded }, (_, i) => {
    const persona = selectPersona(i, personaRotation, personaCounts);
    personaCounts[persona.id] = (personaCounts[persona.id] || 0) + 1;
    const temperature = Math.min(1.0 + persona.temperatureModifier, maxTemperature);
    const device = deviceAnchors[i]; // Each persona gets a different device
    return { persona, temperature, device };
  });

  // Generate all raw ideas in parallel across all personas
  const ideaGenerationPromises = personaIterations.map(async ({ persona, temperature, device }) => {
    try {
      console.log(`   🎨 ${persona.name} exploring with device: ${device?.name || 'none'}`);
      const rawIdeas = await generateRawIdeas(openai, theme, persona, temperature, device);
      return rawIdeas.map(idea => ({ idea, persona }));
    } catch (error) {
      console.error(`   ⚠️ Failed generation for persona ${persona.name}:`, error);
      return [];
    }
  });

  const allIdeaResults = await Promise.all(ideaGenerationPromises);
  const allIdeas = allIdeaResults.flat().slice(0, poolSize);

  console.log(`   📝 Generated ${allIdeas.length} raw ideas, now processing in parallel...`);

  // PARALLEL OPTIMIZATION: Process all ideas (embedding + coherence) in parallel
  const seedPromises = allIdeas.map(async ({ idea, persona }, index) => {
    try {
      // Run embedding and coherence check in parallel for each idea
      const [embedding, coherence] = await Promise.all([
        getEmbedding(idea),
        checkThematicCoherence(idea, userBrief, openai)
      ]);

      const compatibleTropes = identifyCompatibleTropes(idea);

      return {
        id: `seed_${Date.now()}_${index}`,
        rawIdea: idea,
        persona,
        embedding,
        distinctivenessScore: 0, // Will be calculated after all embeddings are ready
        thematicCoherence: coherence,
        tropeCompatibility: compatibleTropes,
        timestamp: new Date()
      } as CreativeSeed;
    } catch (error) {
      console.error(`   ⚠️ Failed processing idea ${index}:`, error);
      return null;
    }
  });

  const seedResults = await Promise.all(seedPromises);
  const seeds = seedResults.filter((s): s is CreativeSeed => s !== null);

  // Calculate distinctiveness now that we have all embeddings
  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const otherEmbeddings = seeds.filter((_, j) => j !== i).map(s => s.embedding);
    seed.distinctivenessScore = calculateDistinctiveness(
      seed.embedding,
      otherEmbeddings,
      historicalEmbeddings
    );
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
    model: 'gpt-5.2',
    messages: [{
      role: 'user',
      content: `Extract the core theme/subject from this creative brief in 3-5 words:
"${brief}"

Return ONLY the theme, nothing else.`
    }],
    temperature: 0.3,
    max_completion_tokens: 20
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
  temperature: number,
  device?: { id: string; name: string; definition: string }
): Promise<string[]> {
  // Use the new prompt builder with optional device anchor
  const prompt = buildExplorationPrompt(theme, device);

  const response = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      { role: 'system', content: persona.systemPromptOverride },
      { role: 'user', content: prompt }
    ],
    temperature,
    max_completion_tokens: 1500
  });

  const content = response.choices[0]?.message?.content || '';

  // Parse directions from response
  const directions = content.split(/DIRECTION \[\d+\]:/).filter(d => d.trim());

  return directions.map(d => {
    const phrase = d.match(/Provocative Phrase:\s*(.+?)(?=\n|$)/)?.[1] || '';
    const visual = d.match(/Visual Spark:\s*(.+?)(?=\n|$)/)?.[1] || '';
    const tension = d.match(/Core Tension:\s*(.+?)(?=\n|$)/)?.[1] || '';
    const connection = d.match(/Connection:\s*(.+?)(?=\n|$)/)?.[1] || '';
    // Include connection to capture the domain link
    return `${phrase} | ${tension} | ${visual} | ${connection}`.trim();
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
    model: 'gpt-5.2',
    messages: [{
      role: 'user',
      content: `Rate how well this creative idea relates to the original brief (0.0 to 1.0):

Brief: "${brief}"
Idea: "${idea}"

Consider: Does the idea serve the brief's goals even if the approach is unconventional?
Return ONLY a decimal number between 0.0 and 1.0.`
    }],
    temperature: 0.2,
    max_completion_tokens: 10
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

/**
 * Extract key themes/concepts from a seed idea for collision detection
 */
function extractThemes(idea: string): Set<string> {
  const themes = new Set<string>();
  const lowerIdea = idea.toLowerCase();

  // Theme clusters - if ANY word from a cluster appears, the whole theme is flagged
  const themeClusters: Record<string, string[]> = {
    'legal/forensic': ['court', 'trial', 'evidence', 'verdict', 'guilty', 'innocent', 'judge', 'jury', 'witness', 'testimony', 'forensic', 'suspect', 'accused', 'prosecution', 'defense', 'alibi', 'confession', 'interrogat', 'detective', 'crime', 'mugshot', 'fingerprint'],
    'medical/clinical': ['doctor', 'hospital', 'surgery', 'diagnosis', 'patient', 'clinical', 'medical', 'prescription', 'symptom', 'cure', 'treatment', 'autopsy', 'morgue', 'surgical', 'operating'],
    'military/war': ['battle', 'soldier', 'army', 'war', 'combat', 'weapon', 'mission', 'tactical', 'strategic', 'victory', 'defeat', 'enemy', 'troops', 'military'],
    'religious/spiritual': ['church', 'temple', 'prayer', 'sacred', 'divine', 'holy', 'spiritual', 'ritual', 'worship', 'blessing', 'sermon', 'confession', 'redemption', 'salvation'],
    'nature/organic': ['garden', 'forest', 'ocean', 'mountain', 'river', 'flower', 'tree', 'seed', 'bloom', 'harvest', 'organic', 'natural', 'wildlife', 'ecosystem'],
    'technology/digital': ['code', 'algorithm', 'digital', 'software', 'hardware', 'computer', 'data', 'network', 'cyber', 'virtual', 'pixel', 'binary', 'upload', 'download'],
    'art/museum': ['gallery', 'museum', 'canvas', 'sculpture', 'exhibition', 'masterpiece', 'artistic', 'curator', 'collection', 'frame', 'portrait'],
    'theater/performance': ['stage', 'actor', 'script', 'audience', 'curtain', 'spotlight', 'performance', 'drama', 'scene', 'rehearsal', 'applause'],
    'food/culinary': ['recipe', 'ingredient', 'kitchen', 'chef', 'taste', 'flavor', 'cook', 'restaurant', 'menu', 'dish', 'appetite'],
    'sports/competition': ['champion', 'athlete', 'race', 'score', 'team', 'compete', 'victory', 'trophy', 'training', 'coach', 'stadium'],
  };

  for (const [theme, keywords] of Object.entries(themeClusters)) {
    if (keywords.some(kw => lowerIdea.includes(kw))) {
      themes.add(theme);
    }
  }

  return themes;
}

/**
 * Check if two seeds have overlapping themes (thematic collision)
 */
function hasThematicCollision(seed1: string, seed2: string): boolean {
  const themes1 = extractThemes(seed1);
  const themes2 = extractThemes(seed2);

  // Check for intersection
  for (const theme of themes1) {
    if (themes2.has(theme)) {
      return true;
    }
  }
  return false;
}

function deduplicateSeeds(seeds: CreativeSeed[]): CreativeSeed[] {
  const unique: CreativeSeed[] = [];
  const EMBEDDING_SIMILARITY_THRESHOLD = 0.75; // Lowered from 0.85 to catch more semantic overlap

  for (const seed of seeds) {
    // Check 1: Embedding similarity (catches paraphrases)
    const isSimilarEmbedding = unique.some(
      existing => cosineSimilarity(seed.embedding, existing.embedding) > EMBEDDING_SIMILARITY_THRESHOLD
    );

    // Check 2: Thematic collision (catches same conceptual territory)
    const hasThemeCollision = unique.some(
      existing => hasThematicCollision(seed.rawIdea, existing.rawIdea)
    );

    // Only add if BOTH checks pass (not similar AND different theme)
    if (!isSimilarEmbedding && !hasThemeCollision) {
      unique.push(seed);
      console.log(`   ✅ Seed accepted: "${seed.rawIdea.substring(0, 50)}..." (themes: ${[...extractThemes(seed.rawIdea)].join(', ') || 'none'})`);
    } else if (isSimilarEmbedding) {
      console.log(`   ⚠️ Seed rejected (embedding similarity): "${seed.rawIdea.substring(0, 50)}..."`);
    } else if (hasThemeCollision) {
      console.log(`   ⚠️ Seed rejected (theme collision): "${seed.rawIdea.substring(0, 50)}..." collides with existing theme`);
    }
  }

  // If we have too few unique seeds after dedup, warn
  if (unique.length < 3) {
    console.warn(`   ⚠️ Only ${unique.length} unique seeds after deduplication - consider regenerating with different prompts`);
  }

  return unique;
}

export default {
  exploreDivergently,
  selectCreativeSeed,
  CREATIVE_PERSONAS
};
