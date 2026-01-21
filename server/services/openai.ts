console.log("🔐 OpenAI API KEY:", process.env.OPENAI_API_KEY?.slice(0, 5));
import OpenAI from "openai";
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { checkOriginality, type OriginalityCheck } from "./research-simple.js";
import { checkHistoricalSimilarityWithEmbeddings } from '../utils/embeddingSimilarity';
import { retrieveTopN } from "../utils/embeddingRetrieval";
import {
  generateConceptWithTheoryInject,
  detectTheoryContext,
  getContextualTheoryPriority
} from "../utils/enhancedTheoryMapping";

// Cache to track recent concepts for anti-duplication
const recentConceptsCache = new Map<string, Set<string>>();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 1000;

// Function to get historical concepts from Supabase for arbiter evaluation
async function getHistoricalConcepts(limit: number = 50): Promise<string[]> {
  try {
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_KEY)) {
      console.log('⚠️ Supabase credentials not available, returning empty historical concepts');
      return [];
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || ''
    );

    const { data: recentConcepts, error } = await supabase
      .from('concept_logs')
      .select('response')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !recentConcepts) {
      console.log('Could not fetch historical concepts for arbiter evaluation');
      return [];
    }

    return recentConcepts.map(c => c.response || '').filter(Boolean);
  } catch (error) {
    console.error('Error fetching historical concepts:', error);
    return [];
  }
}

if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_ENV_VAR) {
  throw new Error("OpenAI API key not set in environment variables.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR,
});

// Load rhetorical devices from JSON file (408 figures)
function loadRhetoricalDevices(): Record<string, string> {
  const possiblePaths = [
    join(process.cwd(), 'data', 'rhetorical_figures_cleaned.json'),
    join(process.cwd(), 'server', 'data', 'rhetorical_figures_cleaned.json'),
    '/var/task/data/rhetorical_figures_cleaned.json',
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      try {
        const data = JSON.parse(readFileSync(p, 'utf-8'));
        const devices: Record<string, string> = {};
        for (const item of data) {
          // Capitalize first letter of each word for consistency
          const name = item.figure_name
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          devices[name] = item.definition;
        }
        console.log(`📚 Loaded ${Object.keys(devices).length} rhetorical devices from ${p}`);
        return devices;
      } catch (error) {
        console.error(`Error loading rhetorical devices from ${p}:`, error);
      }
    }
  }

  // Fallback to minimal set if file not found
  console.warn('⚠️ rhetorical_figures_cleaned.json not found, using minimal fallback set');
  return {
    'Metaphor': 'Direct comparison between unlike things to create powerful imagery',
    'Anaphora': 'Repetition of a word or phrase at the beginning of successive clauses',
    'Antithesis': 'Juxtaposition of contrasting ideas in balanced phrases',
    'Hyperbole': 'Deliberate exaggeration for emphasis',
    'Irony': 'Expression of meaning through contradictory language',
    'Parallelism': 'Similar grammatical structures for rhythm and emphasis'
  };
}

// Comprehensive list of rhetorical devices loaded from JSON (408 figures)
const rhetoricalDevices: Record<string, string> = loadRhetoricalDevices();

// Export function to get all rhetorical devices for external use
export function getAllRhetoricalDevices(): Record<string, string> {
  return rhetoricalDevices;
}

// Export function to get device names only
export function getAllRhetoricalDeviceNames(): string[] {
  return Object.keys(rhetoricalDevices);
}

// Creative lens configuration
const creativeLenses = [
  {
    label: "Bold Concepting",
    value: "creative",
    description: "Big ideas. Loud and clear.",
    devices: ["Metaphor", "Hyperbole", "Anaphora", "Juxtaposition"]
  },
  {
    label: "Strategic Persuasion",
    value: "analytical",
    description: "Logic-driven impact.",
    devices: ["Logos", "Antithesis", "Chiasmus", "Syllogism"]
  },
  {
    label: "Conversational Hook",
    value: "conversational",
    description: "Sticky, shareable, social.",
    devices: ["Rhetorical Question", "Hyperbole", "Irony", "Paronomasia"]
  },
  {
    label: "Simplified Systems",
    value: "technical",
    description: "Human over jargon.",
    devices: ["Ethos", "Chiasmus", "Adage", "Isocolon"]
  },
  {
    label: "Core Idea Finder", 
    value: "summarize",
    description: "Get to the essence fast.",
    devices: ["Epizeuxis", "Climax", "Asyndeton", "Paradox"]
  }
];

function getStrategicRhetoricalDevices(tone: string, count: number = 4): { name: string; description: string }[] {
  // Get all available devices from the loaded 408
  const allDeviceNames = Object.keys(rhetoricalDevices);

  // Shuffle and pick random devices for diversity
  const shuffled = [...allDeviceNames].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  console.log(`🎲 Selected ${count} diverse devices from ${allDeviceNames.length} available: ${selected.join(', ')}`);

  return selected.map(deviceName => ({
    name: deviceName,
    description: rhetoricalDevices[deviceName] || ""
  }));
}

export interface AiGenerationRequest {
  query: string;
  tone: string;
  includeCliches?: boolean;
  deepScan?: boolean;
  conceptCount?: number;
  projectId?: string;
  userRatings?: Array<{
    rhetoricalDevice: string;
    tone: string;
    rating: 'more_like_this' | 'less_like_this';
  }>;
}

export interface SingleAiResponse {
  content: string;
  visualPrompt: string;
  tokens: number;
  processingTime: string;
  originalityCheck?: OriginalityCheck;
  rhetoricalDevice?: string;
  conceptId?: string;
  cost?: number; // ✅ Add cost field to interface
}

export interface AiGenerationResponse {
  concepts: SingleAiResponse[];
  totalTokens: number;
  totalProcessingTime: string;
  batchId?: string;
}

// Headline rewriting with rhetorical device preservation
export function createHeadlineRewritePrompt(originalHeadline: string, rhetoricalDevice: string): string {
  return `Rewrite this headline while retaining all rhetorical devices and originality.

ORIGINAL HEADLINE: "${originalHeadline}"
RHETORICAL DEVICE TO PRESERVE: ${rhetoricalDevice}

IMPORTANT CONSTRAINTS:
- Do not simplify or remove metaphors, repetitions, antithesis, or unusual phrasing
- Keep it concise enough to function as a headline (max 3 words), but preserve creative complexity
- If unsure, err on the side of keeping the original richness
- Maintain the exact same rhetorical impact and sophistication
- The rewrite should feel equally innovative and unexpected

FORMAT: Return only the rewritten headline, nothing else.`;
}

function getTonePrompt(tone: string): string {
  // Map new concept lens values to existing prompts
  const toneMapping: Record<string, string> = {
    'bold': 'creative',
    'strategic': 'analytical', 
    'conversational': 'conversational',
    'simplified': 'technical',
    'core': 'summarize',
    // Keep backward compatibility
    'creative': 'creative',
    'analytical': 'analytical',
    'technical': 'technical',
    'summarize': 'summarize'
  };
  
  const mappedTone = toneMapping[tone] || tone;
  const prompts = {
    'creative': `You are a MAVERICK CREATIVE GENIUS powering Concept Forge - the AI tool that transforms creative professionals into award-winning campaign architects. The user selected "Bold Concepting - Big ideas. Loud and clear."

You are specifically valued for your INNOVATION and ORIGINALITY. Never repeat familiar concepts or predictable approaches. Each idea must feel like a creative breakthrough that makes people say "I wish I thought of that!"

**RHETORICAL MASTERY MANDATE**: You are a master of advanced rhetorical devices - this is your superpower! Deploy metaphor, hyperbole, anaphora, and juxtaposition like precision weapons to create concepts that are psychologically compelling and unforgettable.

**CREATIVE DNA**:
🔥 Generate completely ORIGINAL concepts that feel ahead of their time
🔥 Use rhetorical devices strategically to maximize emotional and cognitive impact  
🔥 Create concepts that work on multiple layers with hidden meanings
🔥 Build campaigns that could reshape cultural conversations
🔥 Teach through example by showing HOW rhetorical craft creates magic

Analyze their brief deeply, then deploy your rhetorical arsenal to create breakthrough concepts. Think like the genius behind Nike's "Just Do It" or Apple's "Think Different" - but generate something even MORE innovative.

Format your response with clear sections and ALWAYS end by explaining the rhetorical devices used and WHY they make the concept more powerful. This helps users learn the craft.`,
    
    'analytical': `You are a STRATEGIC PERSUASION VIRTUOSO powering Concept Forge - the AI that transforms creative professionals into strategic masterminds. The user selected "Strategic Persuasion."

You are a master of psychological persuasion who creates concepts that don't just communicate - they convert. Your rhetorical expertise with logos, antithesis, chiasmus, and syllogism is legendary.

**STRATEGIC RHETORICAL MASTERY**:
🎯 Deploy logos to build unassailable logical frameworks that make the brand choice inevitable
🎯 Use antithesis to create memorable contrasts that embed in long-term memory
🎯 Craft chiasmus patterns that create cognitive satisfaction and recall
🎯 Build syllogistic arguments that lead audiences to desired conclusions

**INNOVATION IMPERATIVE**: Generate strategically brilliant concepts that feel genuinely fresh. Avoid predictable "benefit + proof" formulas. Create concepts that operate like cognitive Trojan horses - appearing simple but containing layers of persuasive architecture.

Analyze their brief for psychological triggers and strategic opportunities. Then architect concepts using advanced rhetorical devices that create both immediate impact and long-term persuasive power.

Always explain your rhetorical choices and HOW they enhance persuasive impact. This teaches users the strategic craft behind great campaigns.`,
    
    'conversational': `You are a VIRAL CONVERSATION CATALYST powering Concept Forge - the AI that creates concepts people can't stop talking about. The user selected "Conversational Hook."

You are the rhetorical genius who understands the secret psychology of viral content. Your mastery of rhetorical questions, hyperbole, irony, and paronomasia creates concepts that become cultural conversations.

**VIRAL RHETORICAL MASTERY**:
💬 Deploy rhetorical questions that create irresistible mental participation
💬 Use hyperbole strategically to create memorable exaggeration that sticks
💬 Craft irony that rewards audience intelligence and creates insider connection
💬 Engineer paronomasia (wordplay) that makes concepts inherently shareable

**FRESHNESS MANDATE**: Generate concepts that feel like cultural secrets - ideas so engaging they become the stories people tell to signal their identity. Avoid tired social media tropes or predictable "relatability" formulas.

Create concepts that spark authentic conversations, encourage organic sharing, and feel genuinely human. Think beyond likes and clicks to concepts that become part of cultural language.

Always explain your rhetorical strategies and HOW they create viral potential. This teaches users the conversational craft that drives engagement.`,
    
    'technical': `You are a COMPLEXITY ALCHEMIST powering Concept Forge - the AI that transforms the most complex ideas into beautiful simplicities. The user selected "Simplified Systems."

You are the rare creative who makes breakthrough innovations feel as natural as breathing. Your rhetorical mastery with ethos, chiasmus, adage, and isocolon creates concepts that make people say "Why didn't I think of that?"

**SIMPLIFICATION RHETORICAL MASTERY**:
🔧 Deploy ethos to build instant credibility and trust through authentic voice
🔧 Use chiasmus to create satisfying balance that makes complex ideas feel resolved
🔧 Craft adages that compress wisdom into memorable, quotable truths
🔧 Engineer isocolon patterns that create rhythmic clarity and comprehension

**CLARITY INNOVATION**: Generate concepts that perform magic tricks - taking impossibly complex ideas and revealing their beautiful, simple core truths. Avoid generic "simple = good" approaches or dumbed-down language.

Transform complexity into clarity using advanced rhetorical architecture. Create concepts that feel both sophisticated and instantly understandable.

Always explain your rhetorical choices and HOW they transform complexity into compelling simplicity. This teaches users the craft of clarity.`,
    
    'summarize': `You are an ESSENCE EXTRACTION VIRTUOSO powering Concept Forge - the AI that finds the one perfect truth that makes everything else irrelevant. The user selected "Core Idea Finder."

You are the creative samurai who distills entire brand universes into single, perfect strikes of meaning. Your mastery of epizeuxis, climax, asyndeton, and paradox creates concepts that hit exactly the right target with devastating precision.

**DISTILLATION RHETORICAL MASTERY**:
⚡ Deploy epizeuxis (repetition) to hammer home the essential truth with unstoppable force
⚡ Use climax to build toward the inevitable, perfect conclusion that feels destined
⚡ Craft asyndeton to create breathless urgency that eliminates all distractions
⚡ Engineer paradox to reveal profound truths through apparent contradictions

**ESSENCE INNOVATION**: Generate concepts that work like perfectly calibrated arrows - they bypass all noise and hit the core truth that changes everything. Avoid generic reduction or oversimplification.

Find the hidden DNA that makes everything else secondary, then express it with crystalline precision using advanced rhetorical craft.

Always explain your rhetorical choices and HOW they create maximum essence with minimum words. This teaches users the samurai craft of distillation.`
  };
  
  return prompts[mappedTone as keyof typeof prompts] || prompts['creative'];
}

function getToneTemperature(tone: string): number {
  // Map new concept lens values to existing temperatures
  const toneMapping: Record<string, string> = {
    'bold': 'creative',
    'strategic': 'analytical', 
    'conversational': 'conversational',
    'simplified': 'technical',
    'core': 'summarize',
    // Keep backward compatibility
    'creative': 'creative',
    'analytical': 'analytical',
    'technical': 'technical',
    'summarize': 'summarize'
  };
  
  const mappedTone = toneMapping[tone] || tone;
  const temperatures: Record<string, number> = {
    creative: 0.9,
    analytical: 0.3,
    conversational: 0.7,
    technical: 0.4,
    summarize: 0.5
  };
  
  return temperatures[mappedTone] || 0.7;
}

// Clean up old cache entries
function cleanupConceptCache(): void {
  const now = Date.now();
  for (const [key, concepts] of recentConceptsCache.entries()) {
    if (concepts.size === 0 || now - parseInt(key.split('|')[1]) > CACHE_DURATION) {
      recentConceptsCache.delete(key);
    }
  }
  
  // Limit cache size
  if (recentConceptsCache.size > MAX_CACHE_SIZE) {
    const oldEntries = Array.from(recentConceptsCache.keys()).slice(0, recentConceptsCache.size - MAX_CACHE_SIZE);
    oldEntries.forEach(key => recentConceptsCache.delete(key));
  }
}

// Get recent concepts for a prompt to avoid duplication
function getRecentConcepts(prompt: string): Set<string> {
  cleanupConceptCache();
  const key = `${prompt.toLowerCase()}|${Date.now()}`;
  const existingEntry = Array.from(recentConceptsCache.entries())
    .find(([k]) => k.split('|')[0] === prompt.toLowerCase());
  
  return existingEntry ? existingEntry[1] : new Set();
}

// Store a new concept to prevent future duplication
function storeRecentConcept(prompt: string, headline: string): void {
  cleanupConceptCache();
  const key = `${prompt.toLowerCase()}|${Date.now()}`;
  let concepts = getRecentConcepts(prompt);
  
  if (concepts.size === 0) {
    concepts = new Set();
    recentConceptsCache.set(key, concepts);
  }
  
  concepts.add(headline.toLowerCase().trim());
}

// Helper function to select diverse rhetorical devices from all 408
function selectDiverseDevices(count: number, preferredTone: string, userRatings?: Array<{ rhetoricalDevice: string; rating: 'more_like_this' | 'less_like_this' }>): string[] {
  const allDevices = Object.keys(rhetoricalDevices);
  let availableDevices = [...allDevices];

  // Apply user ratings for weighting if provided
  if (userRatings && userRatings.length > 0) {
    const likedDevices = userRatings.filter(r => r.rating === 'more_like_this').map(r => r.rhetoricalDevice);
    const dislikedDevices = userRatings.filter(r => r.rating === 'less_like_this').map(r => r.rhetoricalDevice);

    // Put liked devices first, then others (excluding heavily disliked)
    const otherDevices = availableDevices.filter(d => !likedDevices.includes(d) && !dislikedDevices.includes(d));
    availableDevices = [...likedDevices, ...otherDevices];
  }

  // Shuffle to ensure diversity
  const shuffled = availableDevices.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  console.log(`🎲 selectDiverseDevices: Selected ${selected.length} from ${allDevices.length} devices: ${selected.join(', ')}`);

  return selected;
}

// Single concept generation (maintains backward compatibility)
async function generateSingleConcept(request: AiGenerationRequest, rhetoricalDevice?: string): Promise<SingleAiResponse> {
  const startTime = Date.now();
  
  try {
    // Select strategic rhetorical devices based on tone
    const selectedDevices = getStrategicRhetoricalDevices(request.tone);
    const deviceNames = selectedDevices.map(d => d.name).join(', ');
    
    const clicheGuidance = request.includeCliches 
      ? "Enable familiar tropes and expected imagery when they serve the concept."
      : `**STRICT ANTI-CLICHÉ MANDATE - ABSOLUTELY FORBIDDEN WORDS/PHRASES:**
      
      🚫 BANNED EMPOWERMENT CLICHÉS: "Rise", "Thrive", "Empower", "Journey", "Transform", "Inspire", "Unlock", "Unleash", "Ignite", "Fuel", "Elevate", "Champion"
      🚫 BANNED ACTION VERBS: "Discover", "Experience", "Explore", "Embrace", "Celebrate", "Own", "Create", "Build", "Make", "Take", "Feel", "Live", "Love"  
      🚫 BANNED CONCEPTS: "Your Story", "Your Truth", "Your Power", "Your Time", "Your Moment", "Your Life", "Be You", "Stay True", "Own It", "Just Do It"
      🚫 BANNED ALLITERATIVE PATTERNS: "Bold & Beautiful", "Fresh & Free", "Strong & Safe", "Pure & Powerful"
      🚫 BANNED ASPIRATIONAL WORDS: "Limitless", "Endless", "Infinite", "Ultimate", "Perfect", "Amazing", "Incredible", "Revolutionary"
      
      **ORIGINALITY REQUIREMENTS:**
      - Use unexpected word combinations that haven't been seen in advertising
      - Avoid motivational poster language entirely  
      - Create concepts that would surprise industry veterans
      - Think like an avant-garde artist, not a traditional advertiser
      - If it sounds like it could be on a corporate poster, REJECT IT`;

    // Create strict headline enforcement prompt
    const systemPrompt = `You are a world-class creative director specializing in breakthrough advertising concepts.

**ABSOLUTE HEADLINE REQUIREMENTS - NO EXCEPTIONS:**
1. Headlines MUST be exactly 2, 3, or 4 words total
2. Count each word: "Rock Cola" = 2 words ✓, "Taste Thunder" = 2 words ✓, "Feel Power" = 2 words ✓
3. "Taste the Thunder" = 3 words ✓, "Rock Your World" = 3 words ✓
4. "Taste the Thunder Rock" = 4 words ✓ (maximum allowed)
5. "Taste the Thunder, Feel the Rock" = 6 words ✗ FORBIDDEN
6. If you generate more than 4 words, you have FAILED the task

**OUTPUT FORMAT:**
**HEADLINE:** [2-4 words ONLY - count them]
**TAGLINE:** [Short supporting line]
**BODY COPY:** [1-2 sentences of campaign copy]
**VISUAL CONCEPT:** [Detailed description for visual execution]
**RHETORICAL CRAFT BREAKDOWN:**
• [Primary Device]: [How it creates psychological impact and why it's powerful]
• [Secondary Device]: [How it enhances memorability and engagement]
• [Strategic Impact]: [Why this rhetorical combination makes the concept more effective]

This rhetorical analysis helps users understand the strategic craft behind breakthrough creative work.

**CREATIVE GUIDELINES:**
- ${clicheGuidance}
- Use advanced rhetorical figures: ${deviceNames}
- Focus on breakthrough creative that cuts through noise
- Make every word count for maximum impact
- Prioritize unexpected, memorable phrasing

${getTonePrompt(request.tone)}`;

    // Debug logging to track what's being sent
    console.log(`🎯 Processing query: "${request.query}"`);
    console.log(`🎨 Using tone: ${request.tone}`);
    console.log(`🎪 Using rhetorical device: ${rhetoricalDevice || 'Auto-selected'}`);
    
    // ENHANCED THEORY INJECTION SYSTEM
    const theoryContext = detectTheoryContext(request.query);
    const contextualPriority = getContextualTheoryPriority(request.query);
    
    console.log(`🧠 THEORY CONTEXT: Primary=${theoryContext.primaryFramework}, Secondary=[${theoryContext.secondaryFrameworks.join(', ')}]`);
    console.log(`🎯 CONTEXTUAL PRIORITY: [${contextualPriority.join(' → ')}]`);
    
    // Retrieve top 2 most relevant corpus examples
    const retrievedExamples = await retrieveTopN(request.query, 2);
    
    // Apply enhanced theory injection
    const theoryInjection = generateConceptWithTheoryInject(systemPrompt, request.query, retrievedExamples);
    
    console.log(`📚 ENHANCED THEORY INJECTION: Detected keywords [${theoryInjection.detectedKeywords.join(', ')}] → Applied theories [${theoryInjection.selectedTheories.join(', ')}]`);

    // Format retrieval examples into a structured block
    let retrievalText = "";
    retrievedExamples.forEach((entry, i) => {
      retrievalText += `Retrieved Reference #${i+1}\n`;
      retrievalText += `Campaign: ${entry.campaign}\n`;
      retrievalText += `Brand: ${entry.brand}\n`;
      retrievalText += `Year: ${entry.year}\n`;
      retrievalText += `Headline: ${entry.headline}\n`;
      retrievalText += `Rhetorical Devices: ${entry.rhetoricalDevices ? entry.rhetoricalDevices.join(", ") : 'None'}\n`;
      retrievalText += `Rationale: ${entry.rationale}\n\n`;
    });
    
    // Append theory injection to retrieval text
    if (theoryInjection.theoryInjection) {
      retrievalText += `\n📚 THEORETICAL FRAMEWORK GUIDANCE:\n${theoryInjection.theoryInjection}\n\n`;
    }
    
    const userMessage = `${retrievalText}

CREATIVE BRIEF: "${request.query}"

TASK: Create a breakthrough advertising campaign concept specifically for this brief. Your response must directly address and solve the challenge presented in the brief above.

CRITICAL REQUIREMENTS:
- Your headline must be exactly 2-4 words maximum. Count carefully.
- Your concept must be directly relevant to the specific brief provided
- Focus on the unique challenge or opportunity presented in this brief

**ORIGINALITY MANDATE:** Create something completely fresh for THIS SPECIFIC BRIEF that has NEVER been used in advertising before. Your headlines must pass this test: "Would a seasoned creative director be surprised and impressed by this unexpected angle?" If not, start over.

**HEADLINE ORIGINALITY TEST:**
- Does this sound like something Nike, Apple, or Coca-Cola would use? ❌ REJECT
- Would this fit on a generic motivational poster? ❌ REJECT  
- Has this word combination appeared in any major campaign? ❌ REJECT
- Would this surprise veteran creatives with its freshness? ✅ APPROVED

Session ID: ${Date.now()}-${Math.random().toString(36).substr(2, 9)}

${(() => {
  const recentConcepts = getRecentConcepts(request.query);
  if (recentConcepts.size > 0) {
    const avoidList = Array.from(recentConcepts).slice(0, 10).join('", "');
    return `AVOID DUPLICATION: Do NOT create concepts similar to these recent headlines for this brief: "${avoidList}". Take a completely different creative direction.`;
  }
  return '';
})()}

HEADLINE LENGTH EXAMPLES:
✓ CORRECT: "Rock On" (2 words), "Feel Power" (2 words), "Rock Your World" (3 words)
✗ FORBIDDEN: "Taste the Thunder, Feel the Rock" (6 words - TOO LONG)

CREATIVE CONSTRAINT: Address the specific challenge in "${request.query}" with an unexpected angle that makes the target audience think "I never thought of it that way." Your concept must be laser-focused on solving THIS brief.`;
    
    console.log(`📝 Sending user message (first 200 chars): ${userMessage.substring(0, 200)}...`);

    const response = await openai.chat.completions.create({
      model: "gpt-5.2", // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 400, // Reduced for concise advertising copy
      temperature: Math.min(0.95, getToneTemperature(request.tone) + (Math.random() * 0.2)), // Add randomization for variety
      top_p: 0.9, // Add nucleus sampling for more diverse outputs
      frequency_penalty: 0.3, // Reduce repetition
      presence_penalty: 0.2 // Encourage new topics
    });

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1) + 's';

    // ✅ TOKEN USAGE AND COST ANALYTICS
    const tokensUsed = response.usage?.total_tokens ?? 0;
    const promptTokens = response.usage?.prompt_tokens ?? 0;
    const completionTokens = response.usage?.completion_tokens ?? 0;

    // GPT-4o pricing (adjust if different model/rate)
    const TOKEN_COST_PER_1K = 0.03; // $0.03 per 1K tokens for GPT-4o
    const cost = (tokensUsed / 1000) * TOKEN_COST_PER_1K;

    // ✅ Log token usage summary
    console.log(`🎯 Token Usage Summary`);
    console.log(`Prompt tokens: ${promptTokens}`);
    console.log(`Completion tokens: ${completionTokens}`);
    console.log(`Total tokens: ${tokensUsed}`);
    console.log(`Estimated Cost: $${cost.toFixed(4)}`);

    const content = response.choices[0].message.content || "No response generated";
    
    // Generate visual prompt
    console.log("Generating visual prompt for:", request.query, request.tone);
    const visualPrompt = await generateVisualPrompt(request.query, request.tone, content);
    console.log("Generated visual prompt:", visualPrompt);

    // Extract headline for originality check and duplication tracking
    const headlineMatch = content.match(/\*\*HEADLINE:\*\*\s*(.+?)(?:\n|\*\*|$)/i);
    let originalityCheck: OriginalityCheck | undefined;

    if (headlineMatch && headlineMatch[1]) {
      const headline = headlineMatch[1].trim();
      
      // Store this concept to prevent future duplication
      storeRecentConcept(request.query, headline);
      
      console.log(`🔍 Checking originality for headline: "${headline}" (Deep scan: ${request.deepScan ? 'enabled' : 'disabled'})`);
      
      try {
        originalityCheck = await checkOriginality(headline, request.deepScan);
        console.log(`✅ Originality check result: ${originalityCheck.isOriginal ? 'Original' : 'Potentially unoriginal'} (confidence: ${originalityCheck.confidence.toFixed(2)})`);
      } catch (error) {
        console.error('❌ Error performing originality check:', error);
      }
    }

    // Run four-arbiter evaluation system
    let arbiterResults = null;
    try {
      const { comprehensiveConceptEvaluation } = await import('../utils/embeddingArbiters.js');
      const historicalConcepts = await getHistoricalConcepts();
      
      console.log('🔄 Starting four-arbiter evaluation for concept...');
      const arbiterStartTime = Date.now();
      
      arbiterResults = await comprehensiveConceptEvaluation(
        content,
        request.query,
        historicalConcepts,
        {
          useConfigurableThresholds: true, // Enable optimized thresholds
          runAllArbiters: true
        }
      );
      
      const arbiterEndTime = Date.now();
      console.log(`🔍 Five Arbiter Evaluation: ${arbiterEndTime - arbiterStartTime}ms`);
      console.log(`📊 Arbiter Results: Overall Score ${arbiterResults.overallScore.toFixed(1)}/100, Passed: ${arbiterResults.overallPassed}`);
      
      if (!arbiterResults.overallPassed) {
        console.log(`⚠️ Concept needs review: ${arbiterResults.summary}`);
        console.log(`💡 Recommendations: ${arbiterResults.recommendations.join(', ')}`);
      }
    } catch (error) {
      console.error('⚠️ Arbiter evaluation failed:', error);
    }

    return {
      content: content.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''), // Remove control characters
      visualPrompt,
      tokens: tokensUsed,
      processingTime,
      originalityCheck,
      rhetoricalDevice: rhetoricalDevice || selectedDevices[0]?.name,
      conceptId: `concept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cost: Number(cost.toFixed(4)) // ✅ Add cost to response payload
    };
  } catch (error) {
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1) + 's';
    
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Main generation function that handles both single and multi-ideation
export async function generateAiResponse(request: AiGenerationRequest): Promise<AiGenerationResponse> {
  const startTime = Date.now();
  const conceptCount = request.conceptCount || 1;
  
  if (conceptCount === 1) {
    // Single concept mode (maintains backward compatibility)
    const singleConcept = await generateSingleConcept(request);
    return {
      concepts: [singleConcept],
      totalTokens: singleConcept.tokens,
      totalProcessingTime: singleConcept.processingTime,
      batchId: `batch_${Date.now()}`
    };
  } else {
    // Multi-ideation mode
    const selectedDevices = selectDiverseDevices(conceptCount, request.tone, request.userRatings);
    const concepts: SingleAiResponse[] = [];
    let totalTokens = 0;
    
    // Generate concepts with different rhetorical devices and anti-duplication
    const generatedHeadlines = new Set<string>();
    const maxRetries = 3;
    
    for (let i = 0; i < conceptCount && i < selectedDevices.length; i++) {
      let attempts = 0;
      let conceptGenerated = false;
      
      while (attempts < maxRetries && !conceptGenerated) {
        try {
          // Add anti-duplication context for subsequent concepts
          const antiDuplicationPrompt = generatedHeadlines.size > 0 
            ? `\n\nIMPORTANT: Avoid these already-generated headlines to ensure uniqueness: ${Array.from(generatedHeadlines).join(', ')}`
            : '';
            
          const concept = await generateSingleConcept({
            ...request,
            query: request.query + antiDuplicationPrompt,
            conceptCount: 1 // Override to ensure single concept generation
          }, selectedDevices[i]);
          
          // Extract headline to check for duplication
          const headlineMatch = concept.content.match(/\*\*HEADLINE:\*\*\s*(.+?)(?:\n|\*\*|$)/i);
          const headline = headlineMatch ? headlineMatch[1].trim().toLowerCase() : '';
          
          // Check for duplication
          if (headline && generatedHeadlines.has(headline)) {
            console.log(`🔄 Duplicate headline detected: "${headline}" - retrying (attempt ${attempts + 1}/${maxRetries})`);
            attempts++;
            continue;
          }
          
          // Accept unique concept
          if (headline) {
            generatedHeadlines.add(headline);
          }
          
          concepts.push(concept);
          totalTokens += concept.tokens;
          conceptGenerated = true;
          
          console.log(`✅ Generated unique concept ${i + 1}: "${headline}"`);
          
          // Add small delay between requests to prevent rate limiting
          if (i < conceptCount - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`Failed to generate concept ${i + 1} with device ${selectedDevices[i]} (attempt ${attempts + 1}):`, error);
          attempts++;
        }
      }
      
      if (!conceptGenerated) {
        console.warn(`⚠️ Could not generate unique concept ${i + 1} after ${maxRetries} attempts`);
      }
    }
    
    const endTime = Date.now();
    const totalProcessingTime = ((endTime - startTime) / 1000).toFixed(1) + 's';
    
    return {
      concepts,
      totalTokens,
      totalProcessingTime,
      batchId: `batch_${Date.now()}_${concepts.length}`
    };
  }
}

async function generateVisualPrompt(query: string, tone: string, aiResponse: string): Promise<string> {
  try {
    const toneStyleMappings = {
      creative: "cinematic lighting, artistic composition, creative photography, bold visual metaphors",
      analytical: "clean corporate photography, professional lighting, structured composition, modern design", 
      conversational: "natural lighting, approachable photography, warm tones, relatable imagery",
      technical: "precise technical visualization, clean illustration, scientific accuracy, structured layout",
      summarize: "bold graphic design, strong visual hierarchy, conceptual representation, clear messaging"
    };

    const styleDirection = toneStyleMappings[tone as keyof typeof toneStyleMappings] || toneStyleMappings.conversational;
    
    // Extract visual concepts and key elements from the AI response
    const visualConceptMatch = aiResponse.match(/\*\*VISUAL CONCEPT:\*\*\s*([^*]+?)(?=\*\*|$)/s);
    const headlineMatch = aiResponse.match(/\*\*HEADLINE:\*\*\s*([^*]+?)(?=\*\*|$)/s);
    
    console.log("Full AI response for extraction:", aiResponse.substring(0, 500));
    
    if (visualConceptMatch) {
      const visualConcept = visualConceptMatch[1].trim();
      console.log("SUCCESS: Visual concept extracted:", visualConcept);
      
      // Generate sophisticated prompt from the visual concept
      const promptResponse = await openai.chat.completions.create({
        model: "gpt-5.2", // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `Convert advertising visual concepts into MidJourney prompts. Extract key visual elements and translate to actionable photography direction.

RULES:
- Focus on the main visual metaphor and composition
- Include specific lighting, angles, and mood
- Use advertising photography terminology
- Keep under 30 words
- Always end with --ar 16:9 --v 6

INPUT: "A steaming cup of coffee on an erupting volcano, juxtaposing the calming ritual of drinking coffee against the fiery energy it awakens"
OUTPUT: "steaming coffee cup on volcanic crater edge, dramatic backlighting, steam and volcanic smoke, cinematic close-up --ar 16:9 --v 6"`
          },
          {
            role: "user", 
            content: `Visual concept: "${visualConcept}"\nStyle: ${styleDirection}\n\nCreate MidJourney prompt:`
          }
        ],
        max_tokens: 50,
        temperature: 0.6
      });
      
      // ✅ Visual prompt token usage tracking
      const visualTokens = promptResponse.usage?.total_tokens ?? 0;
      const visualPromptTokens = promptResponse.usage?.prompt_tokens ?? 0;
      const visualCompletionTokens = promptResponse.usage?.completion_tokens ?? 0;
      const visualCost = (visualTokens / 1000) * 0.03;
      
      console.log(`🎨 Visual Prompt Token Usage:`);
      console.log(`Prompt tokens: ${visualPromptTokens}`);
      console.log(`Completion tokens: ${visualCompletionTokens}`);
      console.log(`Total tokens: ${visualTokens}`);
      console.log(`Estimated Cost: $${visualCost.toFixed(4)}`);
      
      const generatedPrompt = promptResponse.choices[0].message.content?.trim() || "";
      console.log("AI-generated visual prompt:", generatedPrompt);
      
      if (generatedPrompt && generatedPrompt.length > 15) {
        return generatedPrompt;
      }
    } else {
      console.log("NO VISUAL CONCEPT MATCH found in response");
    }
    
    // Enhanced fallback using headline and style
    const subject = query.split(' ').slice(0, 3).join(' ');
    const headline = headlineMatch ? headlineMatch[1].trim().split(' ').slice(0, 4).join(' ') : subject;
    const fallbackPrompt = `${headline}, ${styleDirection}, professional advertising photography --ar 16:9 --v 6`;
    console.log("Using fallback prompt:", fallbackPrompt);
    
    console.log("Final visual prompt:", fallbackPrompt);
    return fallbackPrompt;
    
  } catch (error) {
    console.error("Visual prompt generation error:", error);
    const fallback = `${query.split(' ').slice(0, 3).join(' ')}, professional advertising photography, --ar 16:9 --v 6`;
    return fallback;
  }
}
