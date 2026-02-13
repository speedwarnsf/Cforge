import OpenAI from "openai";
import { performanceTracker } from './performanceTracker';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function evaluateRelevance(concept: any, userPrompt: string) {
  const relevancePrompt = `
You are the **Relevance Arbiter**, an expert strategist evaluating whether this concept connects clearly to the user's prompt.

**Instructions:**
- Confirm the concept has a clear, understandable connection to:
  - The user's prompt and product/service
  - The target audience
  - The desired tone
- Creative metaphors are acceptable if plausibly linked.
- If the connection is extremely weak, assign a low score and recommend re-iteration.

**Concept to Evaluate:**
${JSON.stringify(concept, null, 2)}

**Original User Prompt:**
"${userPrompt}"

**Output Format:**
Relevance Score: {0–100}
Alignment Explanation: {1–2 sentences explaining the connection or lack thereof}
Recommendation: {Only if score <70, suggest how to improve relevance}

**Scoring Guide:**
90–100: Very clear alignment.
70–89: Mostly aligned, minor adjustments suggested.
40–69: Weak alignment, re-iteration recommended.
0–39: No meaningful alignment, re-iteration required.
  `;

  try {
    const arbiterStartTime = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-5.2", // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: relevancePrompt }],
      temperature: 0.3
    });
    const arbiterEndTime = Date.now();
    
    performanceTracker.trackOperation(
      'Relevance Arbiter',
      arbiterStartTime,
      arbiterEndTime,
      response.usage
    );

    const responseText = response.choices[0].message.content?.trim() || "";
    const match = responseText.match(/Relevance Score:\s*(\d+)/);
    const score = match ? parseInt(match[1], 10) : 0;

    // Extract explanation
    const explanationMatch = responseText.match(/Alignment Explanation:\s*([^\n]+)/);
    const explanation = explanationMatch ? explanationMatch[1] : "No explanation provided";

    // Extract recommendation if score is low
    const recommendationMatch = responseText.match(/Recommendation:\s*([^\n]+)/);
    const recommendation = recommendationMatch ? recommendationMatch[1] : "";

    console.log(`Relevance Score: ${score}/100`);

    return {
      raw: responseText,
      score,
      explanation,
      recommendation,
      needsRefinement: score < 70
    };
  } catch (error) {
    console.error("Relevance Arbiter Error:", error);
    return { 
      score: 0, 
      explanation: "Error evaluating relevance.", 
      recommendation: "Retry evaluation.",
      needsRefinement: true,
      raw: "Error occurred during evaluation"
    };
  }
}