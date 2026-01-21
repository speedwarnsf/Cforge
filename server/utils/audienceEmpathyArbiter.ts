import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function evaluateAudienceEmpathy(concept: {
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  rhetoricalExample: string;
  tone: string;
  targetAudience: string;
}) {
  const prompt = `
You are roleplaying as a member of this audience:
"${concept.targetAudience}"

Imagine seeing this advertisement in real life. Reflect on how it feels to you personally.

Return a JSON object with:
- resonance_score: integer (0-100) – how strongly this concept would appeal to you
- clarity_score: integer (0-100) – how clear the idea feels to you as a viewer
- vibe: short 1-2 words summarizing the emotional vibe (e.g., "Inspiring", "Confusing", "Cool")
- reflection: 1-2 sentence personal reaction as if you were this person

ONLY return JSON in this format:

{
  "resonance_score": ...,
  "clarity_score": ...,
  "vibe": "...",
  "reflection": "..."
}

Concept:
Visual: ${concept.visualDescription}
Headlines: ${concept.headlines.join(" / ")}
Rhetorical Device: ${concept.rhetoricalDevice}
Inspired By: ${concept.rhetoricalExample}
Tone: ${concept.tone}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2", // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1, // Low temperature for consistent scoring
      max_tokens: 200,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
    
    // Validate the response has required fields
    if (typeof json.resonance_score !== 'number' || 
        typeof json.clarity_score !== 'number' || 
        typeof json.vibe !== 'string' || 
        typeof json.reflection !== 'string') {
      throw new Error('Invalid response format from audience empathy arbiter');
    }
    
    // Ensure scores are within valid range
    json.resonance_score = Math.max(0, Math.min(100, json.resonance_score));
    json.clarity_score = Math.max(0, Math.min(100, json.clarity_score));
    
    console.log(`🎭 Audience Empathy - Resonance: ${json.resonance_score}, Clarity: ${json.clarity_score}, Vibe: ${json.vibe}`);
    
    return json;
  } catch (error) {
    console.error("Failed to evaluate audience empathy:", error);
    return {
      resonance_score: 75, // Default fallback scores
      clarity_score: 75,
      vibe: "Evaluation Error",
      reflection: "Audience empathy evaluation unavailable due to processing error"
    };
  }
}

export function hasLowAudienceResonance(resonanceScore: number): boolean {
  return resonanceScore < 70;
}

// Function to derive target audience from query and tone
export function deriveTargetAudience(query: string, tone: string): string {
  // Extract key audience indicators from the query
  const audienceMap: Record<string, string> = {
    // Tech products
    'app': 'tech-savvy millennials and Gen Z users',
    'software': 'business professionals and technology adopters',
    'AI': 'early technology adopters and professionals',
    'smartwatch': 'health-conscious professionals and fitness enthusiasts',
    'fitness tracker': 'active individuals focused on health and wellness',
    
    // Lifestyle products
    'sustainable': 'environmentally conscious consumers',
    'eco-friendly': 'sustainability-minded individuals',
    'organic': 'health-conscious and environmentally aware consumers',
    'luxury': 'affluent consumers seeking premium experiences',
    'premium': 'discerning consumers with higher disposable income',
    
    // Business services
    'B2B': 'business decision-makers and executives',
    'enterprise': 'corporate leaders and IT professionals',
    'startup': 'entrepreneurs and small business owners',
    'freelancer': 'independent professionals and gig workers',
    
    // Health & wellness
    'health': 'health-conscious individuals and families',
    'wellness': 'people focused on holistic well-being',
    'mental health': 'individuals seeking emotional support and balance',
    
    // Demographics
    'millennials': 'millennials aged 25-40',
    'Gen Z': 'Gen Z consumers aged 18-26',
    'professional': 'working professionals and career-focused individuals',
    'family': 'families with children and household decision-makers'
  };
  
  // Check for matches in the query
  const queryLower = query.toLowerCase();
  for (const [keyword, audience] of Object.entries(audienceMap)) {
    if (queryLower.includes(keyword.toLowerCase())) {
      return audience;
    }
  }
  
  // Fallback based on tone
  const toneAudienceMap: Record<string, string> = {
    'creative': 'creative professionals and design-conscious consumers',
    'analytical': 'data-driven professionals and business decision-makers',
    'conversational': 'everyday consumers seeking relatable brands',
    'technical': 'technical professionals and early adopters',
    'summarize': 'busy professionals seeking clear, concise information'
  };
  
  return toneAudienceMap[tone] || 'general consumers interested in quality products and services';
}