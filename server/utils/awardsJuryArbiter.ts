import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function evaluateAwardsJuryScore(concept: {
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  tone: string;
  targetAudience: string;
}) {
  const prompt = `You are an award jury panelist evaluating advertising concepts for global creative awards such as Cannes Lions, D&AD, Clio, and The One Show. 

You will judge each concept according to the past 30 years of award-winning campaigns and their common hallmarks:

✅ Originality and freshness of the idea
✅ Cultural relevance and resonance
✅ Exceptional craft and execution quality
✅ Simplicity and clarity of the concept
✅ Emotional impact on the audience
✅ Relevance to the brand's identity and goals

Use the following criteria with weights in your judgment:

- Idea Originality: 25%
- Cultural Resonance: 20%
- Craft & Execution: 20%
- Simplicity & Clarity: 15%
- Emotional Impact: 15%
- Brand Relevance: 5%

For each concept you review, return your assessment as a JSON object in the following format:

{
  "awards_score": (number from 0–100 reflecting the overall award-worthiness),
  "award_potential": "High" or "Moderate" or "Low",
  "jury_comment": "Concise comment describing why you rated it this way.",
  "improvement_tip": "Specific suggestion for improving award potential."
}

Concept Details:
Visual: ${concept.visualDescription}
Headlines: ${concept.headlines.join(" / ")}
Rhetorical Device: ${concept.rhetoricalDevice}
Tone: ${concept.tone}
Target Audience: ${concept.targetAudience}

Be rigorous in your evaluation, referencing the standards of globally awarded campaigns. Consider whether this work would likely be shortlisted or win in a top-tier creative competition.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1, // Low temperature for consistent scoring
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
    
    // Validate the response has required fields
    if (typeof json.awards_score !== 'number' || 
        typeof json.award_potential !== 'string' || 
        typeof json.jury_comment !== 'string' ||
        typeof json.improvement_tip !== 'string') {
      throw new Error('Invalid response format from awards jury arbiter');
    }
    
    // Ensure score is within valid range
    json.awards_score = Math.max(0, Math.min(100, json.awards_score));
    
    // Validate award potential values
    if (!['High', 'Moderate', 'Low'].includes(json.award_potential)) {
      json.award_potential = 'Moderate';
    }
    
    console.log(`🏆 Awards Jury Score: ${json.awards_score}/100, Potential: ${json.award_potential}`);
    
    return json;
  } catch (error) {
    console.error("Failed to evaluate awards jury score:", error);
    return {
      awards_score: 65, // Default fallback score
      award_potential: "Moderate",
      jury_comment: "Awards evaluation unavailable due to processing error",
      improvement_tip: "Ensure concept has clear originality and strong cultural relevance"
    };
  }
}

export function hasHighAwardsPotential(awardsScore: number): boolean {
  return awardsScore >= 80;
}

export function hasLowAwardsPotential(awardsScore: number): boolean {
  return awardsScore < 60;
}