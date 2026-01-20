// 📂 server/utils/embeddingRetrieval.ts
// ✅ Round-Robin Pairs Retrieval with Fallback Randomization

import OpenAI from "openai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { cosineSimilarity } from "./embeddingSimilarity";
import { performanceMonitor, measureAsync } from "./performanceMonitor";
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const openai = new OpenAI();

// Lazy-initialize Supabase client only when needed and env vars are available
let supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (!supabase && process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  }
  return supabase;
}

// Load JSON at runtime to avoid esbuild resolution issues
function loadRetrievalCorpus() {
  const possiblePaths = [
    join(process.cwd(), 'data', 'retrieval-corpus.json'),
    join(process.cwd(), 'server', 'data', 'retrieval-corpus.json'),
    '/var/task/data/retrieval-corpus.json',
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, 'utf-8'));
    }
  }
  console.warn('retrieval-corpus.json not found, using empty corpus');
  return { campaigns: [] };
}

const retrievalCorpusData = loadRetrievalCorpus();
const retrievalCorpus = retrievalCorpusData.campaigns;

interface CorpusEntry {
  campaign: string;
  brand: string;
  year: number;
  headline: string;
  rhetoricalDevices: string[];
  rationale: string;
  outcome: string;
  whenToUse: string;
  whenNotToUse: string;
}

interface RetrievalCacheRecord {
  promptHash: string;
  top10: CorpusEntry[];
  usedPairs: number;
}

const corpusEmbeddings: { [id: string]: number[] } = {};
const retrievalCache: { [hash: string]: RetrievalCacheRecord } = {};

export async function precomputeCorpusEmbeddings() {
  return measureAsync('precompute_embeddings', async () => {
    console.log("🔄 Precomputing corpus embeddings...");
    let computed = 0;
    
    for (const entry of retrievalCorpus) {
      const key = `${entry.campaign}-${entry.brand}`;
      if (!corpusEmbeddings[key]) {
        const enhancedText = createEnhancedEmbeddingText(entry);
        const embedding = await getEmbedding(enhancedText);
        corpusEmbeddings[key] = embedding;
        computed++;
        
        if (computed % 20 === 0) {
          console.log(`📊 Computed ${computed}/${retrievalCorpus.length} embeddings`);
        }
      }
    }
    
    console.log(`✅ Corpus embeddings precomputed (${computed} new, ${Object.keys(corpusEmbeddings).length} total).`);
    return computed;
  }, { corpusSize: retrievalCorpus.length });
}

function createEnhancedEmbeddingText(entry: any): string {
  const devices = entry.rhetoricalDevices?.join(', ') || '';
  const award = entry.award ? ` Award: ${entry.award}.` : '';
  const impact = entry.impactMetric ? ` Impact: ${entry.impactMetric}.` : '';
  
  return `Campaign: ${entry.campaign}. Brand: ${entry.brand}. ` +
         `Headline: ${entry.headline}. Rhetorical Devices: ${devices}. ` +
         `Rationale: ${entry.rationale}.${award}${impact}`;
}

export async function retrieveTopNWithRotation(
  promptText: string,
  count: number = 2,
  sessionCounter: number = 0,
  theoriesToPrioritize: string[] = [],
  projectId?: string
): Promise<CorpusEntry[]> {
  try {
    // Parse query for theory hints (e.g., detect 'visual', 'edgy' → ['Messaris', 'Lupton'])
    const queryLower = promptText.toLowerCase();
    const autoPrioritize: string[] = [];
    
    if (queryLower.includes('visual') || queryLower.includes('edgy') || 
        queryLower.includes('sexy') || queryLower.includes('nyc edge')) {
      autoPrioritize.push('Messaris', 'Lupton');
    }
    if (queryLower.includes('hiv') || queryLower.includes('aids') || 
        queryLower.includes('health') || queryLower.includes('stigma')) {
      autoPrioritize.push('Burke', 'Barthes'); // Identification theory, semiotics for reclamation
    }
    if (queryLower.includes('bold') || queryLower.includes('confidence') || 
        queryLower.includes('empowerment')) {
      autoPrioritize.push('Burke', 'Messaris');
    }
    
    // Dedupe and combine prioritized theories
    const combinedTheories = [...new Set([...theoriesToPrioritize, ...autoPrioritize])];

    // Load feedback bias weights if project provided
    let feedbackBiases: Array<{ conceptId: string; bias: number; feedbackType: string }> = [];
    if (projectId) {
      try {
        const { getBiasedConcepts } = await import('./feedbackInfluenceSystem');
        feedbackBiases = await getBiasedConcepts(projectId);
        if (feedbackBiases.length > 0) {
          console.log(`🎯 Loaded ${feedbackBiases.length} feedback biases for retrieval influence`);
        }
      } catch (error) {
        console.log('📊 Could not load feedback biases, continuing without influence');
      }
    }

    // Check if embeddings are ready
    if (Object.keys(corpusEmbeddings).length === 0) {
      console.log("⚠️ Embeddings not ready yet, using enhanced fallback with theory prioritization");
      return fallbackWithTheoryPrioritization(promptText, count, combinedTheories);
    }

    const promptHash = crypto
      .createHash("sha256")
      .update(promptText + combinedTheories.join(','))
      .digest("hex");

    let cacheRecord = retrievalCache[promptHash];

    if (!cacheRecord) {
      console.log(`🔍 Computing enhanced retrieval with theory prioritization: [${combinedTheories.join(', ')}]`);
      const promptEmbedding = await getEmbedding(promptText);

      // Filter relevant entries by query keywords in rationale
      const relevantEntries = retrievalCorpus.filter(entry => {
        const rationale = entry.rationale?.toLowerCase() || '';
        const campaign = entry.campaign?.toLowerCase() || '';
        return rationale.includes(queryLower.slice(0, 20)) || // First 20 chars for context
               queryLower.split(' ').some(word => word.length > 3 && rationale.includes(word));
      });

      const entriesToProcess = relevantEntries.length > 10 ? relevantEntries : retrievalCorpus;

      const similarities = entriesToProcess.map((entry) => {
        const entryEmbedding = corpusEmbeddings[`${entry.campaign}-${entry.brand}`];
        
        if (!entryEmbedding || !Array.isArray(entryEmbedding)) {
          return { entry, similarity: 0 };
        }
        
        return {
          entry,
          similarity: cosineSimilarity(promptEmbedding, entryEmbedding),
        };
      });

      // Sort by similarity first
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Apply feedback influence biases if available
      if (feedbackBiases.length > 0) {
        similarities.forEach(sim => {
          const bias = feedbackBiases.find(fb => 
            sim.entry.campaign === fb.conceptId || 
            sim.entry.headline?.includes(fb.conceptId)
          );
          if (bias) {
            sim.similarity *= bias.bias; // Apply bias multiplier
            console.log(`🎯 Applied ${bias.feedbackType} bias (${bias.bias}x) to ${sim.entry.campaign}`);
          }
        });
        // Re-sort after applying biases
        similarities.sort((a, b) => b.similarity - a.similarity);
      }
      
      // Then prioritize by theory: entries matching theories get boosted
      if (combinedTheories.length > 0) {
        const prioritized = similarities.sort((a, b) => {
          const aHasTheory = combinedTheories.some(theory => 
            (a.entry.brand?.toLowerCase() || '').includes(theory.toLowerCase()) ||
            (a.entry.campaign?.toLowerCase() || '').includes(theory.toLowerCase()) ||
            (a.entry.rationale?.toLowerCase() || '').includes(theory.toLowerCase())
          );
          const bHasTheory = combinedTheories.some(theory => 
            (b.entry.brand?.toLowerCase() || '').includes(theory.toLowerCase()) ||
            (b.entry.campaign?.toLowerCase() || '').includes(theory.toLowerCase()) ||
            (b.entry.rationale?.toLowerCase() || '').includes(theory.toLowerCase())
          );
          
          if (aHasTheory && !bHasTheory) return -1;
          if (!aHasTheory && bHasTheory) return 1;
          return b.similarity - a.similarity; // Fall back to similarity
        });
        
        console.log(`🎯 Theory prioritization applied: ${prioritized.slice(0, 3).map(s => s.entry.campaign).join(', ')}`);
      }

      const top10 = similarities.slice(0, 10).map((s) => s.entry);

      cacheRecord = {
        promptHash,
        top10,
        usedPairs: 0,
      };

      retrievalCache[promptHash] = cacheRecord;
    }

    // Session-anchored rotation: Offset based on sessionCounter
    const rotationOffset = sessionCounter % cacheRecord.top10.length;
    const rotated = [...cacheRecord.top10.slice(rotationOffset), ...cacheRecord.top10.slice(0, rotationOffset)];

    // Sample from rotated list
    const shuffledRotated = [...rotated].sort(() => 0.5 - Math.random());
    const retrieved = shuffledRotated.slice(0, Math.min(count, rotated.length));

    console.log(
      `🔄 Enhanced retrieval (session ${sessionCounter}, theories: [${combinedTheories.join(', ')}], biases: ${feedbackBiases.length}) - ` +
      `rotation offset: ${rotationOffset}, retrieved: ${retrieved.map(r => r.campaign).join(', ')}`
    );

    return retrieved as CorpusEntry[];
  } catch (error) {
    console.error("❌ Error in retrieveTopNWithRotation:", error);
    return fallbackWithTheoryPrioritization(promptText, count, theoriesToPrioritize);
  }
}

function fallbackWithTheoryPrioritization(
  promptText: string,
  count: number,
  theoriesToPrioritize: string[]
): CorpusEntry[] {
  if (theoriesToPrioritize.length === 0) {
    const shuffled = [...retrievalCorpus].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count) as CorpusEntry[];
  }

  // Prioritize theory-matching entries even in fallback
  const prioritized = retrievalCorpus.filter(entry =>
    theoriesToPrioritize.some(theory =>
      (entry.brand?.toLowerCase() || '').includes(theory.toLowerCase()) ||
      (entry.campaign?.toLowerCase() || '').includes(theory.toLowerCase()) ||
      (entry.rationale?.toLowerCase() || '').includes(theory.toLowerCase())
    )
  );

  const remaining = retrievalCorpus.filter(entry => !prioritized.includes(entry));
  const combined = [...prioritized, ...remaining];
  const shuffled = combined.sort(() => 0.5 - Math.random());
  
  console.log(`📋 Fallback with theory prioritization: ${theoriesToPrioritize.join(', ')}`);
  return shuffled.slice(0, count) as CorpusEntry[];
}

// Keep the original function for backward compatibility
export async function retrieveTopN(
  promptText: string,
  count: number = 2
): Promise<CorpusEntry[]> {
  return retrieveTopNWithRotation(promptText, count, 0, []);
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
  });
  return response.data[0].embedding;
}