import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY, baseURL: !process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : undefined });

export async function evaluateAwardPotential(concept: {
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  tone: string;
  targetAudience: string;
}) {
  const prompt = `You are a creative awards judge evaluating concepts for global advertising competitions like Cannes Lions, D&AD, Clio, and The One Show.

Evaluate this concept's award potential based on established criteria:
- Creative breakthrough and innovation
- Cultural impact and relevance
- Craft excellence and execution quality
- Simplicity and memorability
- Emotional resonance and storytelling
- Strategic effectiveness for the brand

Consider past award-winning campaigns and their common characteristics.

Concept Details:
Visual: ${concept.visualDescription}
Headlines: ${concept.headlines.join(" / ")}
Rhetorical Device: ${concept.rhetoricalDevice}
Tone: ${concept.tone}
Target Audience: ${concept.targetAudience}

Return your assessment as a JSON object:
{
  "award_potential": "Low" | "Medium" | "High",
  "award_feedback": "Brief explanation of the award potential and specific strengths/weaknesses"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: !process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o", // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
    
    // Validate and sanitize response
    if (!['Low', 'Medium', 'High'].includes(json.award_potential)) {
      json.award_potential = 'Medium';
    }
    json.award_feedback = json.award_feedback || "Award potential evaluation unavailable";
    
    //console.log(`🏆 Award Potential: ${json.award_potential}`);
    
    return json;
  } catch (error) {
    console.error("Failed to evaluate award potential:", error);
    return {
      award_potential: "Medium",
      award_feedback: "Award potential evaluation unavailable due to processing error"
    };
  }
}

export function passesAwardThreshold(potential: string): boolean {
  return potential !== 'Low';
}