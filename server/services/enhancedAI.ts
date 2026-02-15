import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY, baseURL: !process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined });

interface ConceptOutput {
  headline: string;
  tagline: string;
  bodyCopy: string;
  visualConcept: string;
  rhetoricalCraft: { device: string; explanation: string }[];
  strategicImpact: string;
}

interface GenerationRequest {
  query: string;
  tone: string;
  sessionHistory?: string[];
  recentConcepts?: string[];
}

// Cultural similarity knowledge base - key campaigns to avoid mimicking
const CULTURAL_REFERENCE_BASE = [
  // Health/HIV campaigns
  { name: "(RED)", elements: ["red color", "parentheses branding", "elimination messaging"] },
  { name: "Love Positive", elements: ["positive messaging", "heart symbolism", "empowerment"] },
  { name: "Undetectable = Untransmittable", elements: ["equals sign", "scientific messaging", "equation format"] },
  
  // Iconic brand campaigns  
  { name: "Just Do It", elements: ["imperative verb", "three words", "action orientation"] },
  { name: "Think Different", elements: ["verb + adjective", "intellectual appeal", "creative class targeting"] },
  { name: "Share a Coke", elements: ["personalization", "sharing concept", "name customization"] },
  { name: "Dove Real Beauty", elements: ["authentic beauty", "real people", "self-acceptance"] },
  { name: "Break the Internet", elements: ["disruption language", "digital metaphors", "viral intent"] },
  
  // Health awareness patterns
  { name: "Tapestry/Thread campaigns", elements: ["weaving metaphors", "interconnection", "fabric imagery"] },
  { name: "Rising Voices", elements: ["elevation metaphors", "voice amplification", "empowerment language"] },
  { name: "Breaking Chains", elements: ["liberation imagery", "freedom metaphors", "chain breaking"] }
];

// Cliché detection patterns
const RHETORICAL_CLICHES = [
  "red ribbon", "breaking barriers", "lifting voices", "threads of", "tapestry of",
  "rising above", "breaking free", "shining light", "bridge the gap", "stand together",
  "speak your truth", "find your voice", "breaking silence", "rainbow of", "spectrum of"
];

// Enhanced cultural similarity checker
function assessCulturalSimilarity(concept: ConceptOutput): { isSimilar: boolean; matches: string[]; score: number } {
  const matches: string[] = [];
  let totalSimilarity = 0;
  
  const conceptText = `${concept.headline} ${concept.tagline} ${concept.bodyCopy} ${concept.visualConcept}`.toLowerCase();
  
  CULTURAL_REFERENCE_BASE.forEach(reference => {
    let referenceScore = 0;
    reference.elements.forEach(element => {
      if (conceptText.includes(element.toLowerCase())) {
        referenceScore += 0.4;
        matches.push(`${reference.name}: ${element}`);
      }
    });
    
    // Check for structural similarity
    if (reference.name === "Just Do It" && concept.headline.split(' ').length === 3 && concept.headline.includes(' ')) {
      referenceScore += 0.3;
      matches.push(`${reference.name}: three-word imperative structure`);
    }
    
    totalSimilarity = Math.max(totalSimilarity, referenceScore);
  });
  
  return {
    isSimilar: totalSimilarity > 0.3,
    matches,
    score: totalSimilarity
  };
}

// Cliché detection
function detectCliches(concept: ConceptOutput): { hasCliches: boolean; found: string[] } {
  const conceptText = `${concept.headline} ${concept.tagline} ${concept.bodyCopy} ${concept.visualConcept}`.toLowerCase();
  const found = RHETORICAL_CLICHES.filter(cliche => conceptText.includes(cliche));
  
  return {
    hasCliches: found.length > 0,
    found
  };
}

// Repetition checker
function checkRepetition(concept: ConceptOutput, sessionHistory: string[] = [], recentConcepts: string[] = []): { isRepetitive: boolean; similarity: number } {
  const currentContent = `${concept.headline} ${concept.tagline} ${concept.visualConcept}`.toLowerCase();
  const allHistory = [...sessionHistory, ...recentConcepts];
  
  let maxSimilarity = 0;
  
  allHistory.forEach(historical => {
    const historicalLower = historical.toLowerCase();
    const currentWords = currentContent.split(/\s+/);
    const historicalWords = historicalLower.split(/\s+/);
    
    const commonWords = currentWords.filter(word => 
      word.length > 3 && historicalWords.includes(word)
    );
    
    const similarity = commonWords.length / Math.max(currentWords.length, historicalWords.length);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  });
  
  return {
    isRepetitive: maxSimilarity > 0.4,
    similarity: maxSimilarity
  };
}

// Enhanced concept generation with filtering
export async function generateEnhancedConcept(request: GenerationRequest): Promise<ConceptOutput> {
  const maxAttempts = 5;
  let attempts = 0;
  
  const systemPrompt = `You are Concept Forge, an AI ideation system trained to produce original advertising concepts while referencing your vast knowledge of global campaigns and public health messaging.

CRITICAL REQUIREMENTS:

1. CULTURAL SIMILARITY ASSESSMENT: Internally compare ideas to historical campaigns. If >30% similar in visual metaphor, slogan, or structure to known campaigns (e.g., (RED), Dove Real Beauty, Share a Coke, Just Do It), you must discard and regenerate.

2. RHETORICAL CLICHÉ DETECTION: Automatically avoid concepts that:
- Lean heavily on red color symbolism for HIV
- Use over-familiar metaphors like tapestry, threads, rising voices, or breaking chains  
- Incorporate obvious rhetorical tropes without innovation

3. INNOVATION REQUIREMENT: Generate concepts that feel genuinely fresh and unexpected while maintaining strategic relevance.

Return ONLY a single JSON object in this exact format:
{
  "headline": "...",
  "tagline": "...", 
  "bodyCopy": "...",
  "visualConcept": "...",
  "rhetoricalCraft": [
    {"device":"...","explanation":"..."},
    {"device":"...","explanation":"..."}
  ],
  "strategicImpact": "..."
}

Do not include any commentary, references to this process, or extra text.`;

  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const completion = await openai.chat.completions.create({
        model: !process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate an original advertising concept for: ${request.query}\n\nTone: ${request.tone}\n\nAvoid ALL references to color symbolism, ribbons, tapestry, threads, rising voices, or breaking chains. Create something genuinely innovative.` }
        ],
        temperature: 0.9,
        max_tokens: 1200
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('Empty response from OpenAI');
      }

      const concept: ConceptOutput = JSON.parse(responseContent);
      
      // Validate required fields
      if (!concept.headline || !concept.tagline || !concept.bodyCopy || !concept.visualConcept) {
        throw new Error('Missing required fields in generated concept');
      }

      // Run quality checks
      const culturalCheck = assessCulturalSimilarity(concept);
      const clicheCheck = detectCliches(concept);
      const repetitionCheck = checkRepetition(concept, request.sessionHistory, request.recentConcepts);

      console.log(`🔍 Attempt ${attempts} Quality Check:
        Cultural Similarity: ${culturalCheck.score.toFixed(2)} (${culturalCheck.isSimilar ? 'FLAGGED' : 'PASS'})
        Clichés: ${clicheCheck.found.length} found (${clicheCheck.hasCliches ? 'FLAGGED' : 'PASS'})
        Repetition: ${(repetitionCheck.similarity * 100).toFixed(1)}% (${repetitionCheck.isRepetitive ? 'FLAGGED' : 'PASS'})`);

      // If concept passes all checks, return it
      if (!culturalCheck.isSimilar && !clicheCheck.hasCliches && !repetitionCheck.isRepetitive) {
        console.log(`Enhanced concept generated successfully on attempt ${attempts}`);
        return concept;
      }

      // Log specific issues for regeneration
      if (culturalCheck.isSimilar) {
        console.log(`🚫 Cultural similarity detected: ${culturalCheck.matches.join(', ')}`);
      }
      if (clicheCheck.hasCliches) {
        console.log(`🚫 Clichés detected: ${clicheCheck.found.join(', ')}`);
      }
      if (repetitionCheck.isRepetitive) {
        console.log(`🚫 Repetition detected: ${(repetitionCheck.similarity * 100).toFixed(1)}% similarity`);
      }

    } catch (error) {
      console.error(`Error on attempt ${attempts}:`, error);
    }
  }

  throw new Error(`Failed to generate acceptable concept after ${maxAttempts} attempts`);
}

// Example generator for confirmation
export async function generateExampleConcept(): Promise<ConceptOutput> {
  return generateEnhancedConcept({
    query: "HIV awareness campaign that avoids color symbolism, ribbons, tapestry, or threads",
    tone: "creative"
  });
}