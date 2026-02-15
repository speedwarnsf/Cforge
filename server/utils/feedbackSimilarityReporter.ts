// ===============================================
// CREATE: server/utils/feedbackSimilarityReporter.ts
// ===============================================
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY,
  baseURL: process.env.GEMINI_API_KEY ? 'https://generativelanguage.googleapis.com/v1beta/openai/' : undefined,
});

/**
 * Fetch rated concepts and their embeddings.
 * Note: Uses Supabase schema with concept_ratings table
 */
async function getRatedConcepts(projectId: string): Promise<{
  conceptId: string;
  rating: "more_like_this" | "less_like_this";
  embedding: number[];
}[]> {
  // First get the concept ratings for this project
  const { data: ratings, error: ratingsError } = await supabase
    .from("concept_ratings")
    .select("concept_id, rating")
    .eq("project_id", projectId);

  if (ratingsError) {
    console.warn("Failed to fetch ratings:", ratingsError.message);
    return [];
  }

  if (!ratings || ratings.length === 0) {
    console.log("ℹ️ No rated concepts found for project:", projectId);
    return [];
  }

  // Get concept IDs that have ratings
  const conceptIds = ratings.map(r => r.concept_id);
  
  // Fetch the concept logs with embeddings for those rated concepts
  const { data: concepts, error: conceptsError } = await supabase
    .from("concept_logs")
    .select("id, embedding")
    .in("id", conceptIds);

  if (conceptsError) {
    console.warn("Failed to fetch concept embeddings:", conceptsError.message);
    return [];
  }

  // Combine ratings with embeddings
  const result = ratings
    .map(rating => {
      const concept = concepts?.find(c => c.id === rating.concept_id);
      if (concept && Array.isArray(concept.embedding)) {
        return {
          conceptId: rating.concept_id,
          rating: rating.rating as "more_like_this" | "less_like_this",
          embedding: concept.embedding
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
      conceptId: string;
      rating: "more_like_this" | "less_like_this";
      embedding: number[];
    }>;

  return result;
}

/**
 * Generate embedding for new text.
 */
async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: process.env.GEMINI_API_KEY ? "gemini-embedding-001" : "text-embedding-3-large",
    input: text
  });
  return response.data[0].embedding;
}

/**
 * Compute cosine similarity.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

/**
 * Report similarity to rated concepts (does not affect scoring).
 */
export async function reportSimilarityToRatedConcepts(
  projectId: string,
  newConceptText: string,
  similarityThreshold = 0.75
): Promise<void> {
  const ratedConcepts = await getRatedConcepts(projectId);
  if (ratedConcepts.length === 0) {
    console.log("ℹ️ No rated concepts found.");
    return;
  }

  const newEmbedding = await getEmbedding(newConceptText);

  ratedConcepts.forEach((rated) => {
    const similarity = cosineSimilarity(newEmbedding, rated.embedding);
    if (similarity >= similarityThreshold) {
      console.log(
        `🔍 Similarity to rated concept ${rated.conceptId}: ${(similarity * 100).toFixed(1)}% (${rated.rating})`
      );
    }
  });
}

/**
 * Enhanced feedback similarity analysis with detailed reporting
 */
export async function analyzeFeedbackSimilarity(
  projectId: string,
  newConceptText: string,
  options: {
    similarityThreshold?: number;
    detailedReport?: boolean;
    includeScoring?: boolean;
  } = {}
): Promise<{
  moreLikeThis: Array<{ conceptId: string; similarity: number }>;
  lessLikeThis: Array<{ conceptId: string; similarity: number }>;
  overallScore: number;
  recommendation: string;
}> {
  const {
    similarityThreshold = 0.75,
    detailedReport = false,
    includeScoring = true
  } = options;

  const ratedConcepts = await getRatedConcepts(projectId);
  
  if (ratedConcepts.length === 0) {
    return {
      moreLikeThis: [],
      lessLikeThis: [],
      overallScore: 0,
      recommendation: "No feedback history available for comparison"
    };
  }

  const newEmbedding = await getEmbedding(newConceptText);
  
  const moreLikeThis: Array<{ conceptId: string; similarity: number }> = [];
  const lessLikeThis: Array<{ conceptId: string; similarity: number }> = [];

  ratedConcepts.forEach((rated) => {
    const similarity = cosineSimilarity(newEmbedding, rated.embedding);
    
    if (similarity >= similarityThreshold) {
      if (rated.rating === "more_like_this") {
        moreLikeThis.push({ conceptId: rated.conceptId, similarity });
      } else if (rated.rating === "less_like_this") {
        lessLikeThis.push({ conceptId: rated.conceptId, similarity });
      }
    }
  });

  // Calculate overall feedback alignment score
  let overallScore = 0;
  let recommendation = "";

  if (includeScoring) {
    const positiveScore = moreLikeThis.reduce((sum, item) => sum + item.similarity, 0);
    const negativeScore = lessLikeThis.reduce((sum, item) => sum + item.similarity, 0);
    
    overallScore = positiveScore - negativeScore;
    
    if (overallScore > 0.5) {
      recommendation = "Strong alignment with preferred concepts";
    } else if (overallScore > 0) {
      recommendation = "Moderate alignment with preferences";
    } else if (overallScore > -0.5) {
      recommendation = "Neutral - mixed feedback alignment";
    } else {
      recommendation = "Similar to previously rejected concepts";
    }
  }

  if (detailedReport) {
    console.log(`📊 Feedback Similarity Analysis for Project ${projectId}`);
    console.log(`Similar to ${moreLikeThis.length} preferred concepts`);
    console.log(`Similar to ${lessLikeThis.length} rejected concepts`);
    console.log(`Overall feedback score: ${overallScore.toFixed(3)}`);
    console.log(`Recommendation: ${recommendation}`);
  }

  return {
    moreLikeThis,
    lessLikeThis,
    overallScore,
    recommendation
  };
}

/**
 * Store embedding for a concept in the database
 */
export async function storeConceptEmbedding(
  conceptId: string,
  conceptText: string
): Promise<void> {
  try {
    const embedding = await getEmbedding(conceptText);
    
    // For now, simulate embedding storage since Supabase schema may not have embedding column
    console.log(`📊 Generated embedding for concept ${conceptId} (${embedding.length} dimensions)`);
    
    // Note: This would work once the embedding column is added to concept_logs table in Supabase
    // const { error } = await supabase
    //   .from("concept_logs")
    //   .update({ embedding })
    //   .eq("id", conceptId);

    // if (error) {
    //   console.warn(`Failed to store embedding for concept ${conceptId}:`, error.message);
    // } else {
    //   console.log(`Stored embedding for concept ${conceptId}`);
    // }
    
    // For testing, just log success
    console.log(`Embedding ready for concept ${conceptId} (storage pending schema update)`);
    
  } catch (error) {
    console.warn(`Error generating embedding for concept ${conceptId}:`, error);
  }
}

/**
 * Create a concept rating entry in the database
 */
export async function createConceptRating(
  projectId: string,
  conceptId: string,
  rating: "more_like_this" | "less_like_this",
  rhetoricalDevice: string = "unknown",
  tone: string = "creative"
): Promise<void> {
  try {
    const { error } = await supabase
      .from("concept_ratings")
      .insert({
        project_id: projectId,
        concept_id: conceptId,
        rating,
        rhetorical_device: rhetoricalDevice,
        tone
      });

    if (error) {
      console.warn(`Failed to store rating for concept ${conceptId}:`, error.message);
    } else {
      console.log(`Stored ${rating} rating for concept ${conceptId}`);
    }
  } catch (error) {
    console.warn(`Error storing concept rating:`, error);
  }
}

export default {
  reportSimilarityToRatedConcepts,
  analyzeFeedbackSimilarity,
  storeConceptEmbedding,
  getRatedConcepts,
  getEmbedding,
  cosineSimilarity
};