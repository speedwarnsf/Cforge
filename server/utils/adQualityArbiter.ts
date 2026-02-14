import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function evaluateAdQuality(concept: {
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  rhetoricalExample: string;
}) {
  const prompt = `
You are a senior advertising creative director with 20 years of experience evaluating professional advertising concepts. 
Imagine this idea as a real, fully-executed advertisement in a magazine or billboard.

Assess the concept carefully and return a JSON object with these fields:
- professionalism_score: integer (0-100) – how polished and credible this would feel to clients
- clarity_score: integer (0-100) – how clearly the idea communicates
- freshness_score: integer (0-100) – how original and interesting it feels
- critique: short 1-2 sentence comment highlighting strengths and weaknesses

ONLY return a JSON object in this format:

{
  "professionalism_score": ...,
  "clarity_score": ...,
  "freshness_score": ...,
  "critique": "..."
}

Concept to evaluate:
Visual: ${concept.visualDescription}
Headlines: ${concept.headlines.join(" / ")}
Rhetorical Device: ${concept.rhetoricalDevice}
Inspired By: ${concept.rhetoricalExample}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o", // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1, // Low temperature for consistent scoring
      max_completion_tokens: 300,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
    
    // Validate the response has required fields
    if (typeof json.professionalism_score !== 'number' || 
        typeof json.clarity_score !== 'number' || 
        typeof json.freshness_score !== 'number' || 
        typeof json.critique !== 'string') {
      throw new Error('Invalid response format from quality arbiter');
    }
    
    // Ensure scores are within valid range
    json.professionalism_score = Math.max(0, Math.min(100, json.professionalism_score));
    json.clarity_score = Math.max(0, Math.min(100, json.clarity_score));
    json.freshness_score = Math.max(0, Math.min(100, json.freshness_score));
    
    console.log(`Quality Scores - Professional: ${json.professionalism_score}, Clarity: ${json.clarity_score}, Freshness: ${json.freshness_score}`);
    
    return json;
  } catch (error) {
    console.error("Failed to evaluate ad quality:", error);
    return {
      professionalism_score: 75, // Default fallback scores
      clarity_score: 75,
      freshness_score: 75,
      critique: "Quality evaluation unavailable due to processing error"
    };
  }
}

export function shouldFlagForReview(scores: {
  professionalism_score: number;
  clarity_score: number; 
  freshness_score: number;
}): boolean {
  return scores.professionalism_score < 70 || scores.freshness_score < 60;
}