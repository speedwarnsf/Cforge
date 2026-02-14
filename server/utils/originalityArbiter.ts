import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function evaluateOriginalityConfidence(concept: {
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  tone: string;
}) {
  const prompt = `You are an originality expert evaluating advertising concepts for creative freshness and uniqueness.

Evaluate this concept's originality based on:
- Uniqueness of the creative approach
- Freshness of the visual metaphor
- Novelty of the headline construction
- Avoidance of clichéd advertising tropes
- Innovation in rhetorical device application

Concept Details:
Visual: ${concept.visualDescription}
Headlines: ${concept.headlines.join(" / ")}
Rhetorical Device: ${concept.rhetoricalDevice}
Tone: ${concept.tone}

Return your assessment as a JSON object:
{
  "originality_confidence": (number from 0-100 representing how original this concept is),
  "originality_feedback": "Brief explanation of why this score was given"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o", // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      max_completion_tokens: 300,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
    
    // Validate and sanitize response
    json.originality_confidence = Math.max(0, Math.min(100, json.originality_confidence || 50));
    json.originality_feedback = json.originality_feedback || "Originality evaluation unavailable";
    
    console.log(`Originality Score: ${json.originality_confidence}/100`);
    
    return json;
  } catch (error) {
    console.error("Failed to evaluate originality:", error);
    return {
      originality_confidence: 50,
      originality_feedback: "Originality evaluation unavailable due to processing error"
    };
  }
}

export function passesOriginalityThreshold(score: number): boolean {
  return score >= 75;
}