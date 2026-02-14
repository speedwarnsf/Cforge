import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined,
});

export async function evaluateAudienceResonance(concept: {
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  tone: string;
  targetAudience: string;
}) {
  const prompt = `You are an audience insights expert evaluating how well advertising concepts resonate with their target audience.

Evaluate this concept's audience resonance based on:
- Relevance to target audience's values and interests
- Emotional connection potential
- Cultural appropriateness and sensitivity
- Message clarity for the intended demographic
- Likelihood to drive engagement and action

Concept Details:
Visual: ${concept.visualDescription}
Headlines: ${concept.headlines.join(" / ")}
Rhetorical Device: ${concept.rhetoricalDevice}
Tone: ${concept.tone}
Target Audience: ${concept.targetAudience}

Return your assessment as a JSON object:
{
  "audience_resonance": "Low" | "Medium" | "High",
  "audience_feedback": "Brief explanation of the resonance level and specific audience considerations"
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
    if (!['Low', 'Medium', 'High'].includes(json.audience_resonance)) {
      json.audience_resonance = 'Medium';
    }
    json.audience_feedback = json.audience_feedback || "Audience evaluation unavailable";
    
    console.log(`👥 Audience Resonance: ${json.audience_resonance}`);
    
    return json;
  } catch (error) {
    console.error("Failed to evaluate audience resonance:", error);
    return {
      audience_resonance: "Medium",
      audience_feedback: "Audience evaluation unavailable due to processing error"
    };
  }
}

export function passesAudienceThreshold(resonance: string): boolean {
  return resonance !== 'Low';
}