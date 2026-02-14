import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GEMINI_API_KEY ? 'https://generativelanguage.googleapis.com/v1beta/openai/' : undefined,
});

/**
 * Sanitizes text by removing stray unicode and normalizing whitespace.
 */
function sanitizeText(text: string): string {
  return text
    // Replace smart quotes
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Remove non-breaking spaces
    .replace(/\u00A0/g, " ")
    // Remove control characters except newline and tab
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    // Normalize whitespace
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Generates an embedding vector for a given text input.
 */
async function getEmbedding(text: string): Promise<number[]> {
  try {
    // Sanitize input text before generating embedding
    const sanitizedText = sanitizeText(text);
    const response = await openai.embeddings.create({
      model: process.env.GEMINI_API_KEY ? "text-embedding-004" : "text-embedding-3-large",
      input: sanitizedText
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embedding:', error);
    throw new Error('Embedding generation failed');
  }
}

/**
 * Computes the cosine similarity between two embedding vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}

/**
 * Checks if any generated concepts are too similar to each other.
 * Returns true if all concepts pass similarity threshold.
 */
async function checkConceptDiversity(concepts: string[], similarityThreshold = 0.85): Promise<boolean> {
  console.log(`🔍 Checking semantic diversity for ${concepts.length} concepts...`);
  
  const embeddings = await Promise.all(concepts.map(c => getEmbedding(c)));
  
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      console.log(`🔍 Semantic similarity between concept ${i + 1} and ${j + 1}: ${similarity.toFixed(3)}`);
      
      if (similarity >= similarityThreshold) {
        console.warn(`Concepts ${i + 1} and ${j + 1} are semantically too similar (similarity=${similarity.toFixed(3)}).`);
        return false;
      }
    }
  }
  
  console.log(`All concepts pass semantic diversity check (threshold: ${similarityThreshold})`);
  return true;
}

/**
 * Enhanced historical similarity check using embeddings
 */
async function checkHistoricalSimilarityWithEmbeddings(
  newConcept: string, 
  historicalConcepts: string[], 
  similarityThreshold = 0.8
): Promise<{ isSimilar: boolean; mostSimilar?: { concept: string; similarity: number } }> {
  
  if (historicalConcepts.length === 0) {
    return { isSimilar: false };
  }

  console.log(`🔍 Checking semantic similarity against ${historicalConcepts.length} historical concepts...`);
  
  const newEmbedding = await getEmbedding(newConcept);
  const historicalEmbeddings = await Promise.all(historicalConcepts.map(c => getEmbedding(c)));
  
  let maxSimilarity = 0;
  let mostSimilarConcept = '';
  
  for (let i = 0; i < historicalEmbeddings.length; i++) {
    const similarity = cosineSimilarity(newEmbedding, historicalEmbeddings[i]);
    
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarConcept = historicalConcepts[i];
    }
  }
  
  console.log(`🔍 Highest semantic similarity: ${maxSimilarity.toFixed(3)} (threshold: ${similarityThreshold})`);
  
  if (maxSimilarity >= similarityThreshold) {
    console.warn(`New concept is semantically too similar to historical concept (similarity=${maxSimilarity.toFixed(3)})`);
    return { 
      isSimilar: true, 
      mostSimilar: { concept: mostSimilarConcept, similarity: maxSimilarity }
    };
  }
  
  return { isSimilar: false };
}

/**
 * Integration function for enforcing concept diversity with regeneration
 */
export async function enforceConceptDiversity(
  concepts: string[], 
  regenerateCallback: () => Promise<string[]>,
  similarityThreshold = 0.85
): Promise<string[]> {
  let attempt = 1;
  let currentConcepts = [...concepts];
  
  while (attempt <= 3) {
    try {
      const isDiverse = await checkConceptDiversity(currentConcepts, similarityThreshold);
      if (isDiverse) {
        console.log(`All concepts passed semantic diversity check on attempt ${attempt}.`);
        return currentConcepts;
      }
      
      console.log(`🔄 Regenerating concepts (attempt ${attempt + 1}) due to high semantic similarity.`);
      currentConcepts = await regenerateCallback();
      attempt++;
    } catch (error) {
      console.error(`Error during diversity check attempt ${attempt}:`, error);
      // Fall back to basic word-based similarity on embedding failure
      console.log('🔄 Falling back to word-based similarity check...');
      return currentConcepts;
    }
  }
  
  console.log(`Returning concepts despite similarity after ${attempt - 1} attempts.`);
  return currentConcepts;
}

/**
 * Generates advertising concepts with semantic diversity enforcement and sanitization.
 */
export async function generateAiResponse(options: {
  prompt: string;
  model?: string;
  maxAttempts?: number;
  similarityThreshold?: number;
}): Promise<string[]> {
  const model = options.model || "gpt-5.2";
  const maxAttempts = options.maxAttempts || 3;
  const similarityThreshold = options.similarityThreshold || 0.85;

  let attempt = 1;
  let concepts: string[] = [];
  let diversityPassed = false;

  while (attempt <= maxAttempts && !diversityPassed) {
    console.log(`Generating concepts (Attempt ${attempt})`);

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a creative AI specializing in rhetorical advertising concepts." },
        { role: "user", content: options.prompt }
      ]
    });

    const rawContent = completion.choices[0].message.content || "";

    // Split concepts by double line breaks and sanitize
    concepts = rawContent
      .split(/\n\s*\n/)
      .map(c => sanitizeText(c))
      .filter(Boolean);

    console.log(`Generated ${concepts.length} concepts.`);

    diversityPassed = await checkConceptDiversity(concepts, similarityThreshold);

    if (!diversityPassed) {
      console.warn(`Concepts too similar on attempt ${attempt}. Retrying...`);
    }

    attempt++;
  }

  if (!diversityPassed) {
    console.warn(`Returning concepts after ${maxAttempts} attempts despite similarity.`);
  } else {
    console.log(`🎉 Diversity check passed.`);
  }

  return concepts;
}

export { 
  getEmbedding, 
  cosineSimilarity, 
  checkConceptDiversity, 
  checkHistoricalSimilarityWithEmbeddings,
  sanitizeText
};