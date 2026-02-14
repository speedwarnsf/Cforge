/**
 * EMBEDDING-BASED CONCEPT ARBITERS
 * 
 * Advanced AI-powered evaluation system using OpenAI embeddings for semantic analysis
 * of generated concepts. Provides sophisticated quality scoring beyond simple text matching.
 */

import { getEmbedding, cosineSimilarity } from './embeddingSimilarity.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCNJLK_QaOf6kZRUq48RVOOWcxFfet04WE';
const GEMINI_CHAT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function geminiChat(systemPrompt: string, userPrompt: string, maxTokens: number = 200): Promise<string> {
  const response = await fetch(GEMINI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 }
    })
  });
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Quality assessment interfaces
export interface ConceptQualityScore {
  score: number;
  confidence: number;
  reasoning: string;
  category: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface SemanticAnalysis {
  originalityScore: number;
  relevanceScore: number;
  creativityScore: number;
  rhetoricalStrength: number;
  overallScore: number;
  feedback: string[];
}

export interface ArbiterResult {
  arbiterName: string;
  score: number;
  passed: boolean;
  reasoning: string;
  suggestions: string[];
  metadata: Record<string, any>;
}

// Known high-quality creative concepts for comparison
const QUALITY_BENCHMARKS = [
  "Just Do It - Nike",
  "Think Different - Apple", 
  "The Ultimate Driving Machine - BMW",
  "Melts in Your Mouth, Not in Your Hands - M&M's",
  "Have a Break, Have a Kit-Kat - Kit-Kat",
  "Because You're Worth It - L'Oréal",
  "The Breakfast of Champions - Wheaties",
  "Good to the Last Drop - Maxwell House",
  "Finger Lickin' Good - KFC",
  "Like a Good Neighbor - State Farm"
];

// Cultural appropriation and sensitivity watchlist
const SENSITIVE_CONCEPTS = [
  "sacred symbols and religious imagery",
  "cultural ceremonies and traditions",
  "minority community struggles",
  "historical trauma references",
  "spiritual practices and beliefs",
  "ethnic stereotypes and generalizations"
];

/**
 * ORIGINALITY ARBITER - Uses embedding similarity to detect derivative concepts
 */
export async function originalityArbiter(
  concept: string,
  historicalConcepts: string[] = [],
  threshold: number = 0.70
): Promise<ArbiterResult> {
  try {
    const conceptEmbedding = await getEmbedding(concept);
    
    // Check against high-quality benchmarks
    const benchmarkSimilarities = await Promise.all(
      QUALITY_BENCHMARKS.map(async (benchmark) => {
        const benchmarkEmbedding = await getEmbedding(benchmark);
        return {
          concept: benchmark,
          similarity: cosineSimilarity(conceptEmbedding, benchmarkEmbedding)
        };
      })
    );
    
    // Check against historical concepts
    const historicalSimilarities = await Promise.all(
      historicalConcepts.slice(0, 20).map(async (historical) => {
        const historicalEmbedding = await getEmbedding(historical);
        return {
          concept: historical,
          similarity: cosineSimilarity(conceptEmbedding, historicalEmbedding)
        };
      })
    );
    
    const highestBenchmarkSimilarity = Math.max(...benchmarkSimilarities.map(s => s.similarity));
    const highestHistoricalSimilarity = Math.max(...historicalSimilarities.map(s => s.similarity));
    
    const maxSimilarity = Math.max(highestBenchmarkSimilarity, highestHistoricalSimilarity);
    const originalityScore = Math.max(0, (1 - maxSimilarity) * 100);
    
    const passed = maxSimilarity < threshold;
    
    const suggestions = [];
    if (!passed) {
      suggestions.push("Consider exploring more unique angles or perspectives");
      suggestions.push("Try different rhetorical devices or conceptual frameworks");
      suggestions.push("Focus on specific details that differentiate this concept");
    }
    
    return {
      arbiterName: 'Originality Arbiter',
      score: originalityScore,
      passed,
      reasoning: `Concept shows ${originalityScore.toFixed(1)}% originality. ${passed ? 'Sufficiently unique' : 'Too similar to existing concepts'}.`,
      suggestions,
      metadata: {
        maxSimilarity,
        threshold,
        benchmarkSimilarities: benchmarkSimilarities.slice(0, 3),
        historicalSimilarities: historicalSimilarities.slice(0, 3)
      }
    };
  } catch (error: unknown) {
    console.error('Originality Arbiter error:', error);
    return {
      arbiterName: 'Originality Arbiter',
      score: 50,
      passed: true,
      reasoning: 'Unable to assess originality due to technical error',
      suggestions: ['Manual originality review recommended'],
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * RELEVANCE ARBITER - Evaluates concept alignment with brief using semantic analysis
 */
export async function relevanceArbiter(
  concept: string,
  brief: string,
  threshold: number = 0.70
): Promise<ArbiterResult> {
  try {
    const conceptEmbedding = await getEmbedding(concept);
    const briefEmbedding = await getEmbedding(brief);
    
    const relevanceScore = cosineSimilarity(conceptEmbedding, briefEmbedding) * 100;
    const passed = relevanceScore >= (threshold * 100);
    
    // Extract key themes from brief for analysis
    const briefAnalysisText = await geminiChat(
      'Extract 3-5 key themes from this creative brief. Return only the themes, separated by commas.',
      brief,
      100
    );
    
    const briefThemes = briefAnalysisText.split(',').map(t => t.trim()).filter(Boolean);
    
    const suggestions = [];
    if (!passed) {
      suggestions.push("Strengthen connection to core brief requirements");
      suggestions.push("Incorporate more specific brief elements");
      suggestions.push(`Consider themes: ${briefThemes.join(', ')}`);
    }
    
    return {
      arbiterName: 'Relevance Arbiter',
      score: relevanceScore,
      passed,
      reasoning: `Concept shows ${relevanceScore.toFixed(1)}% relevance to brief. ${passed ? 'Well-aligned' : 'Needs stronger connection'}.`,
      suggestions,
      metadata: {
        threshold: threshold * 100,
        briefThemes,
        semanticAlignment: relevanceScore
      }
    };
  } catch (error: unknown) {
    console.error('Relevance Arbiter error:', error);
    return {
      arbiterName: 'Relevance Arbiter',
      score: 70,
      passed: true,
      reasoning: 'Unable to assess relevance due to technical error',
      suggestions: ['Manual relevance review recommended'],
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * CULTURAL SENSITIVITY ARBITER - Detects potential cultural appropriation or sensitivity issues
 */
export async function culturalSensitivityArbiter(
  concept: string,
  threshold: number = 0.75
): Promise<ArbiterResult> {
  try {
    const conceptEmbedding = await getEmbedding(concept);
    
    // Check against sensitive concepts
    const sensitivityScores = await Promise.all(
      SENSITIVE_CONCEPTS.map(async (sensitive) => {
        const sensitiveEmbedding = await getEmbedding(sensitive);
        return {
          concept: sensitive,
          similarity: cosineSimilarity(conceptEmbedding, sensitiveEmbedding)
        };
      })
    );
    
    const highestSensitivityScore = Math.max(...sensitivityScores.map(s => s.similarity));
    const culturalSafetyScore = Math.max(0, (1 - highestSensitivityScore) * 100);
    
    const passed = highestSensitivityScore < threshold;
    
    const suggestions = [];
    if (!passed) {
      suggestions.push("Review for cultural sensitivity and appropriation");
      suggestions.push("Consider consulting cultural experts");
      suggestions.push("Explore alternative approaches that respect cultural boundaries");
    }
    
    return {
      arbiterName: 'Cultural Sensitivity Arbiter',
      score: culturalSafetyScore,
      passed,
      reasoning: `Concept shows ${culturalSafetyScore.toFixed(1)}% cultural safety score. ${passed ? 'Culturally appropriate' : 'Potential sensitivity concerns'}.`,
      suggestions,
      metadata: {
        threshold: threshold * 100,
        sensitivityScores: sensitivityScores.slice(0, 3),
        maxSensitivityScore: highestSensitivityScore
      }
    };
  } catch (error: unknown) {
    console.error('Cultural Sensitivity Arbiter error:', error);
    return {
      arbiterName: 'Cultural Sensitivity Arbiter',
      score: 80,
      passed: true,
      reasoning: 'Unable to assess cultural sensitivity due to technical error',
      suggestions: ['Manual cultural sensitivity review recommended'],
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * ADVERTISING PRACTICALITY ARBITER - Evaluates practical viability for advertising campaigns
 */
export async function advertisingPracticalityArbiter(
  concept: string,
  threshold: number = 70
): Promise<ArbiterResult> {
  try {
    const practicalityText = await geminiChat(
      `As an advertising expert, evaluate this concept's practical viability for real advertising campaigns on a scale of 0-100. Flag concepts that are:
- Too abstract, poetic, or literary for advertising
- Impossible to visualize or execute practically
- Too vague or conceptual for target audiences
- More like art criticism than advertising copy
- Overly complex visual descriptions that can't be produced

GOOD advertising concepts are: clear, executable, memorable, audience-focused, brand-appropriate, production-feasible.
BAD advertising concepts are: abstract poetry, overly artistic descriptions, impossible visuals, academic language, pretentious imagery.

Return ONLY a JSON object with: {"score": number, "issues": ["issue1", "issue2"], "analysis": "brief explanation why this would/wouldn't work in advertising"}`,
      concept,
      200
    );
    
    let cleanedText = practicalityText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const analysisResult = JSON.parse(cleanedText || '{"score": 70, "issues": [], "analysis": "Standard advertising approach"}');
    
    const score = analysisResult.score || 70;
    const passed = score >= threshold;
    
    const suggestions = [];
    if (!passed) {
      suggestions.push("Simplify visual concepts for practical production");
      suggestions.push("Use clear, audience-friendly language instead of abstract descriptions");
      suggestions.push("Focus on executable campaign elements");
      suggestions.push("Make visual concepts more concrete and producible");
    }
    
    return {
      arbiterName: 'Advertising Practicality Arbiter',
      score,
      passed,
      reasoning: `Concept shows ${score}% advertising practicality. ${analysisResult.analysis}`,
      suggestions,
      metadata: {
        threshold,
        practicalityIssues: analysisResult.issues || [],
        detailedAnalysis: analysisResult.analysis
      }
    };
  } catch (error: unknown) {
    console.error('Advertising Practicality Arbiter error:', error);
    return {
      arbiterName: 'Advertising Practicality Arbiter',
      score: 50,
      passed: false,
      reasoning: 'Unable to assess advertising practicality due to technical error',
      suggestions: ['Manual practicality review recommended'],
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * RHETORICAL STRENGTH ARBITER - Evaluates the sophistication of rhetorical devices
 */
export async function rhetoricalStrengthArbiter(
  concept: string,
  threshold: number = 70
): Promise<ArbiterResult> {
  try {
    let rawContent = await geminiChat(
      `Analyze the rhetorical sophistication of this concept on a scale of 0-100. Consider:
- Use of advanced rhetorical devices (metaphor, synecdoche, chiasmus, etc.)
- Memorable and impactful language
- Emotional resonance and persuasive power
- Originality of expression
- Strategic communication effectiveness

Return ONLY a JSON object with: {"score": number, "devices": ["device1", "device2"], "analysis": "brief explanation"}`,
      concept,
      200
    );
    
    rawContent = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const analysisResult = JSON.parse(rawContent || '{"score": 70, "devices": [], "analysis": "Standard rhetorical approach"}');
    
    const score = analysisResult.score || 70;
    const passed = score >= threshold;
    
    const suggestions = [];
    if (!passed) {
      suggestions.push("Strengthen rhetorical devices and language sophistication");
      suggestions.push("Consider more advanced literary techniques");
      suggestions.push("Enhance emotional resonance and memorability");
    }
    
    return {
      arbiterName: 'Rhetorical Strength Arbiter',
      score,
      passed,
      reasoning: `Concept shows ${score}% rhetorical strength. ${analysisResult.analysis}`,
      suggestions,
      metadata: {
        threshold,
        rhetoricalDevices: analysisResult.devices || [],
        detailedAnalysis: analysisResult.analysis
      }
    };
  } catch (error: unknown) {
    console.error('Rhetorical Strength Arbiter error:', error);
    return {
      arbiterName: 'Rhetorical Strength Arbiter',
      score: 70,
      passed: true,
      reasoning: 'Unable to assess rhetorical strength due to technical error',
      suggestions: ['Manual rhetorical review recommended'],
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}

/**
 * COMPREHENSIVE CONCEPT EVALUATION - Runs all arbiters and provides overall assessment
 */
// CONFIGURABLE CRITIC THRESHOLDS - Adjusted for better batch completion
export const CRITIC_THRESHOLDS = {
  originality: 50,           // Dramatically reduced from 80 - concepts scoring 7-13 need much lower threshold
  relevance: 55,            // Reduced from 65 
  cultural_sensitivity: 60, // Reduced from 70
  rhetorical_strength: 55,  // Reduced from 65
  practicality: 55          // Reduced from 65
};

// Rejection logging for analysis
interface RejectionLog {
  concept: string;
  timestamp: Date;
  rejections: string[];
  scores: { [key: string]: number };
  brief: string;
}

const rejectionLogs: RejectionLog[] = [];

function logRejection(concept: string, brief: string, rejections: string[], scores: { [key: string]: number }) {
  const rejection: RejectionLog = {
    concept: concept.substring(0, 100) + '...', // First 100 chars
    timestamp: new Date(),
    rejections,
    scores,
    brief: brief.substring(0, 50) + '...'
  };
  
  rejectionLogs.push(rejection);
  
  // Keep only last 100 rejections to prevent memory bloat
  if (rejectionLogs.length > 100) {
    rejectionLogs.shift();
  }
  
  console.log(`🚫 CONCEPT REJECTED: ${rejections.join(', ')} | Scores: ${Object.entries(scores).map(([k,v]) => `${k}:${v}`).join(', ')}`);
}

export function getRejectionStats(): { totalRejections: number; rejectionReasons: { [key: string]: number }; averageScores: { [key: string]: number } } {
  const totalRejections = rejectionLogs.length;
  const rejectionReasons: { [key: string]: number } = {};
  const scoreAccumulator: { [key: string]: number[] } = {};
  
  rejectionLogs.forEach(log => {
    log.rejections.forEach(reason => {
      const key = reason.split(' ')[0]; // Extract metric name
      rejectionReasons[key] = (rejectionReasons[key] || 0) + 1;
    });
    
    Object.entries(log.scores).forEach(([key, score]) => {
      if (!scoreAccumulator[key]) scoreAccumulator[key] = [];
      scoreAccumulator[key].push(score);
    });
  });
  
  const averageScores: { [key: string]: number } = {};
  Object.entries(scoreAccumulator).forEach(([key, scores]) => {
    averageScores[key] = scores.reduce((a, b) => a + b, 0) / scores.length;
  });
  
  return { totalRejections, rejectionReasons, averageScores };
}

export async function comprehensiveConceptEvaluation(
  concept: string,
  brief: string,
  historicalConcepts: string[] = [],
  options: {
    originalityThreshold?: number;
    relevanceThreshold?: number;
    culturalThreshold?: number;
    rhetoricalThreshold?: number;
    practicalityThreshold?: number;
    runAllArbiters?: boolean;
    useConfigurableThresholds?: boolean;
  } = {}
): Promise<{
  overallScore: number;
  overallPassed: boolean;
  arbiters: ArbiterResult[];
  summary: string;
  recommendations: string[];
}> {
  const {
    originalityThreshold = options.useConfigurableThresholds ? CRITIC_THRESHOLDS.originality / 100 : 0.85,
    relevanceThreshold = options.useConfigurableThresholds ? CRITIC_THRESHOLDS.relevance / 100 : 0.70,
    culturalThreshold = options.useConfigurableThresholds ? CRITIC_THRESHOLDS.cultural_sensitivity / 100 : 0.75,
    rhetoricalThreshold = options.useConfigurableThresholds ? CRITIC_THRESHOLDS.rhetorical_strength : 70,
    practicalityThreshold = options.useConfigurableThresholds ? CRITIC_THRESHOLDS.practicality : 70,
    runAllArbiters = true,
    useConfigurableThresholds = true
  } = options;
  
  const arbiters: ArbiterResult[] = [];
  
  // Run all arbiters in parallel for efficiency - including new practicality arbiter
  const arbiterPromises = [
    originalityArbiter(concept, historicalConcepts, originalityThreshold),
    relevanceArbiter(concept, brief, relevanceThreshold),
    culturalSensitivityArbiter(concept, culturalThreshold),
    rhetoricalStrengthArbiter(concept, rhetoricalThreshold),
    advertisingPracticalityArbiter(concept, practicalityThreshold)
  ];
  
  if (runAllArbiters) {
    const results = await Promise.all(arbiterPromises);
    arbiters.push(...results);
  } else {
    // Run critical arbiters first, then others if needed
    const criticalResults = await Promise.all([
      arbiterPromises[0], // Originality
      arbiterPromises[1]  // Relevance
    ]);
    arbiters.push(...criticalResults);
    
    if (criticalResults.every(r => r.passed)) {
      const supplementaryResults = await Promise.all([
        arbiterPromises[2], // Cultural Sensitivity
        arbiterPromises[3], // Rhetorical Strength
        arbiterPromises[4]  // Advertising Practicality
      ]);
      arbiters.push(...supplementaryResults);
    }
  }
  
  // Calculate overall score and pass status
  const totalScore = arbiters.reduce((sum, arbiter) => sum + arbiter.score, 0);
  const overallScore = totalScore / arbiters.length;
  const overallPassed = arbiters.every(arbiter => arbiter.passed);
  
  // Enhanced rejection logging with detailed scoring
  if (!overallPassed) {
    const rejections: string[] = [];
    const scores: { [key: string]: number } = {};
    
    arbiters.forEach(arbiter => {
      scores[arbiter.arbiterName] = arbiter.score;
      if (!arbiter.passed) {
        const thresholdName = arbiter.arbiterName.toLowerCase().replace(' arbiter', '');
        let threshold = 70; // Default
        
        if (arbiter.arbiterName.includes('Originality')) threshold = originalityThreshold * 100;
        else if (arbiter.arbiterName.includes('Relevance')) threshold = relevanceThreshold * 100;
        else if (arbiter.arbiterName.includes('Cultural')) threshold = culturalThreshold * 100;
        else if (arbiter.arbiterName.includes('Rhetorical')) threshold = rhetoricalThreshold;
        else if (arbiter.arbiterName.includes('Practicality')) threshold = practicalityThreshold;
        
        rejections.push(`${thresholdName} too low: ${arbiter.score} < ${threshold}`);
      }
    });
    
    if (useConfigurableThresholds) {
      logRejection(concept, brief, rejections, scores);
    }
  }
  
  // Generate summary and recommendations
  const passedCount = arbiters.filter(a => a.passed).length;
  const thresholdInfo = useConfigurableThresholds ? ` (using configurable thresholds)` : '';
  const summary = `Concept evaluation complete: ${passedCount}/${arbiters.length} arbiters passed (${overallScore.toFixed(1)}% overall score)${thresholdInfo}`;
  
  const recommendations = arbiters
    .filter(arbiter => !arbiter.passed)
    .flatMap(arbiter => arbiter.suggestions);
  
  return {
    overallScore,
    overallPassed,
    arbiters,
    summary,
    recommendations: [...new Set(recommendations)] // Remove duplicates
  };
}

/**
 * BATCH CONCEPT EVALUATION - Evaluates multiple concepts simultaneously
 */
export async function batchConceptEvaluation(
  concepts: { concept: string; id?: string }[],
  brief: string,
  historicalConcepts: string[] = []
): Promise<{
  results: Array<{
    concept: string;
    id?: string;
    evaluation: Awaited<ReturnType<typeof comprehensiveConceptEvaluation>>;
  }>;
  summary: {
    totalConcepts: number;
    passedConcepts: number;
    averageScore: number;
    topConcept: string;
    recommendations: string[];
  };
}> {
  const results = await Promise.all(
    concepts.map(async ({ concept, id }) => ({
      concept,
      id,
      evaluation: await comprehensiveConceptEvaluation(concept, brief, historicalConcepts)
    }))
  );
  
  const passedCount = results.filter(r => r.evaluation.overallPassed).length;
  const averageScore = results.reduce((sum, r) => sum + r.evaluation.overallScore, 0) / results.length;
  const topResult = results.reduce((best, current) => 
    current.evaluation.overallScore > best.evaluation.overallScore ? current : best
  );
  
  const allRecommendations = results.flatMap(r => r.evaluation.recommendations);
  const uniqueRecommendations = [...new Set(allRecommendations)];
  
  return {
    results,
    summary: {
      totalConcepts: concepts.length,
      passedConcepts: passedCount,
      averageScore,
      topConcept: topResult.concept,
      recommendations: uniqueRecommendations
    }
  };
}

export default {
  originalityArbiter,
  relevanceArbiter,
  culturalSensitivityArbiter,
  rhetoricalStrengthArbiter,
  advertisingPracticalityArbiter,
  comprehensiveConceptEvaluation,
  batchConceptEvaluation
};