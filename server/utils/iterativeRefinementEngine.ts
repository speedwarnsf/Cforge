import { evaluateOriginalityConfidence, passesOriginalityThreshold } from './originalityArbiter';
import { evaluateAudienceResonance, passesAudienceThreshold } from './audienceArbiter';
import { evaluateAwardPotential, passesAwardThreshold } from './awardPotentialArbiter';
import { evaluateRelevance } from './relevanceArbiter';
import { generateMultivariantPrompt } from './openAiPromptHelper';
import { performanceTracker } from './performanceTracker';
import { parseOpenAIResponse } from '../routes/generateMultivariant';
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ConceptEvaluation {
  originality_confidence: number;
  originality_feedback: string;
  audience_resonance: string;
  audience_feedback: string;
  award_potential: string;
  award_feedback: string;
  relevance_score: number;
  relevance_feedback: string;
  passes_all_thresholds: boolean;
  failed_criteria: string[];
}

interface IterationResult {
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  evaluation: ConceptEvaluation;
  iteration_number: number;
  final_status: 'Passed' | 'Needs Review' | 'Failed';
}

export async function runIterativeRefinement(
  initialConcept: {
    visualDescription: string;
    headlines: string[];
    rhetoricalDevice: string;
    tone: string;
    targetAudience: string;
  },
  context: {
    query: string;
    tone: string;
    avoidCliches: boolean;
    rhetoricalExample?: any;
  },
  enabled: boolean = true
): Promise<IterationResult> {
  
  if (!enabled) {
    // Skip iterative refinement, return initial concept
    const evaluation = await evaluateConcept(initialConcept, context.query);
    return {
      visualDescription: initialConcept.visualDescription,
      headlines: initialConcept.headlines,
      rhetoricalDevice: initialConcept.rhetoricalDevice,
      evaluation,
      iteration_number: 1,
      final_status: evaluation.passes_all_thresholds ? 'Passed' : 'Needs Review'
    };
  }

  console.log(`🔄 Starting iterative refinement for concept...`);
  
  // Iteration 1: Evaluate initial concept
  let currentConcept = initialConcept;
  let evaluation = await evaluateConcept(currentConcept, context.query);
  
  console.log(`📊 Iteration 1 Results: Originality ${evaluation.originality_confidence}/100, Audience ${evaluation.audience_resonance}, Awards ${evaluation.award_potential}, Relevance ${evaluation.relevance_score}/100`);
  
  if (evaluation.passes_all_thresholds) {
    console.log(`Concept passed all thresholds on iteration 1`);
    return {
      visualDescription: currentConcept.visualDescription,
      headlines: currentConcept.headlines,
      rhetoricalDevice: currentConcept.rhetoricalDevice,
      evaluation,
      iteration_number: 1,
      final_status: 'Passed'
    };
  }

  // Iteration 2: Attempt refinement
  console.log(`🔄 Iteration 1 failed criteria: ${evaluation.failed_criteria.join(', ')}. Attempting refinement...`);
  
  const refinedConcept = await refineConcept(currentConcept, evaluation, context);
  
  if (!refinedConcept) {
    console.log(`Refinement failed, keeping original concept`);
    return {
      visualDescription: currentConcept.visualDescription,
      headlines: currentConcept.headlines,
      rhetoricalDevice: currentConcept.rhetoricalDevice,
      evaluation,
      iteration_number: 1,
      final_status: 'Needs Review'
    };
  }

  // Evaluate refined concept
  const refinedEvaluation = await evaluateConcept({
    ...refinedConcept,
    tone: context.tone,
    targetAudience: currentConcept.targetAudience
  }, context.query);
  
  console.log(`📊 Iteration 2 Results: Originality ${refinedEvaluation.originality_confidence}/100, Audience ${refinedEvaluation.audience_resonance}, Awards ${refinedEvaluation.award_potential}, Relevance ${refinedEvaluation.relevance_score}/100`);
  
  const finalStatus = refinedEvaluation.passes_all_thresholds ? 'Passed' : 'Needs Review';
  
  console.log(`Final Status: ${finalStatus}`);
  
  return {
    visualDescription: refinedConcept.visualDescription,
    headlines: refinedConcept.headlines,
    rhetoricalDevice: refinedConcept.rhetoricalDevice,
    evaluation: refinedEvaluation,
    iteration_number: 2,
    final_status: finalStatus
  };
}

async function evaluateConcept(concept: {
  visualDescription: string;
  headlines: string[];
  rhetoricalDevice: string;
  tone: string;
  targetAudience: string;
}, userQuery?: string): Promise<ConceptEvaluation> {
  
  // Run all four arbiters in parallel with performance tracking
  const arbiterStartTime = Date.now();
  const [originalityResult, audienceResult, awardResult, relevanceResult] = await Promise.all([
    evaluateOriginalityConfidence(concept),
    evaluateAudienceResonance(concept),
    evaluateAwardPotential(concept),
    userQuery ? evaluateRelevance(concept, userQuery) : Promise.resolve({ score: 75, explanation: "No user query provided", needsRefinement: false })
  ]);
  const arbiterEndTime = Date.now();
  
  performanceTracker.trackOperation(
    'Four Arbiter Evaluation',
    arbiterStartTime,
    arbiterEndTime
  );

  // Determine which criteria failed
  const failed_criteria: string[] = [];
  
  if (!passesOriginalityThreshold(originalityResult.originality_confidence)) {
    failed_criteria.push('Originality');
  }
  
  if (!passesAudienceThreshold(audienceResult.audience_resonance)) {
    failed_criteria.push('Audience Resonance');
  }
  
  if (!passesAwardThreshold(awardResult.award_potential)) {
    failed_criteria.push('Award Potential');
  }
  
  if (relevanceResult.needsRefinement) {
    failed_criteria.push('Relevance');
  }

  return {
    originality_confidence: originalityResult.originality_confidence,
    originality_feedback: originalityResult.originality_feedback,
    audience_resonance: audienceResult.audience_resonance,
    audience_feedback: audienceResult.audience_feedback,
    award_potential: awardResult.award_potential,
    award_feedback: awardResult.award_feedback,
    relevance_score: relevanceResult.score,
    relevance_feedback: relevanceResult.explanation,
    passes_all_thresholds: failed_criteria.length === 0,
    failed_criteria
  };
}

async function refineConcept(
  concept: {
    visualDescription: string;
    headlines: string[];
    rhetoricalDevice: string;
  },
  evaluation: ConceptEvaluation,
  context: {
    query: string;
    tone: string;
    avoidCliches: boolean;
    rhetoricalExample?: any;
  }
): Promise<{ visualDescription: string; headlines: string[]; rhetoricalDevice: string } | null> {
  
  // Build refinement prompt based on failed criteria
  let refinementInstructions = "Revise this concept to address the following issues:\n";
  
  if (evaluation.failed_criteria.includes('Originality')) {
    refinementInstructions += `- ORIGINALITY (${evaluation.originality_confidence}/100): ${evaluation.originality_feedback}\n`;
  }
  
  if (evaluation.failed_criteria.includes('Audience Resonance')) {
    refinementInstructions += `- AUDIENCE RESONANCE (${evaluation.audience_resonance}): ${evaluation.audience_feedback}\n`;
  }
  
  if (evaluation.failed_criteria.includes('Award Potential')) {
    refinementInstructions += `- AWARD POTENTIAL (${evaluation.award_potential}): ${evaluation.award_feedback}\n`;
  }
  
  if (evaluation.failed_criteria.includes('Relevance')) {
    refinementInstructions += `- RELEVANCE (${evaluation.relevance_score}/100): ${evaluation.relevance_feedback}\n`;
  }

  const refinementPrompt = `${generateMultivariantPrompt({
    rhetoricalDevice: concept.rhetoricalDevice,
    secondRhetoricalDevice: concept.rhetoricalDevice, // Keep same device for consistency
    userQuery: context.query,
    avoidCliches: context.avoidCliches,
    rhetoricalExample: context.rhetoricalExample
  })}

REFINEMENT INSTRUCTIONS:
${refinementInstructions}

Previous concept to improve:
Visual: ${concept.visualDescription}
Headlines: ${concept.headlines.join(' / ')}

Generate an improved version that specifically addresses all the failed criteria above.

Return your response as JSON with this structure:
{
  "visual": "detailed visual description",
  "headlines": ["headline1", "headline2", "headline3"]
}`;

  try {
    const refinementStartTime = Date.now();
    const response = await openai.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      messages: [{ role: "user", content: refinementPrompt }],
      temperature: 1.2, // Slightly higher temperature for creative refinement
      max_completion_tokens: 500,
      response_format: { type: "json_object" }
    });
    const refinementEndTime = Date.now();
    
    performanceTracker.trackOperation(
      'OpenAI Refinement',
      refinementStartTime,
      refinementEndTime,
      response.usage
    );

    const parsed = parseOpenAIResponse(response.choices[0].message.content || '');
    
    if (parsed && parsed.visual && parsed.headlines.length > 0) {
      return {
        visualDescription: parsed.visual,
        headlines: parsed.headlines,
        rhetoricalDevice: concept.rhetoricalDevice
      };
    }
    
    return null;
  } catch (error) {
    console.error("Failed to refine concept:", error);
    return null;
  }
}

// Export parse function for use in the route
export { parseOpenAIResponse };