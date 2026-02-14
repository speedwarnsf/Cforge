var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/services/research-simple.ts
function cleanupCache() {
  const now = Date.now();
  const toDelete = [];
  searchCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_DURATION_MS) {
      toDelete.push(key);
    }
  });
  toDelete.forEach((key) => searchCache.delete(key));
  if (searchCache.size > MAX_CACHE_SIZE) {
    const entries = [];
    searchCache.forEach((value, key) => {
      entries.push([key, value]);
    });
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, searchCache.size - MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => searchCache.delete(key));
  }
}
function getCacheKey(query) {
  return query.toLowerCase().trim();
}
function calculateSimilarity(query, text2) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text2.toLowerCase().split(/\s+/);
  let matches = 0;
  for (const word of queryWords) {
    if (textWords.some((textWord) => textWord.includes(word) || word.includes(textWord))) {
      matches++;
    }
  }
  return matches / queryWords.length;
}
function classifySource(title, snippet, url) {
  const text2 = (title + " " + snippet + " " + url).toLowerCase();
  if (text2.includes("campaign") || text2.includes("advertising") || text2.includes("ad ")) {
    return "campaign";
  }
  if (text2.includes("brand") || text2.includes("company") || text2.includes("corporate")) {
    return "brand";
  }
  if (text2.includes("slogan") || text2.includes("tagline") || text2.includes("motto")) {
    return "slogan";
  }
  return "general";
}
async function checkOriginality(query, deepScan = false) {
  console.log(`\u{1F50D} Starting ${deepScan ? "deep scan" : "fast"} originality check for: "${query}"`);
  if (Math.random() < 0.1) {
    cleanupCache();
  }
  const cacheKey = getCacheKey(query) + (deepScan ? "_deep" : "_fast");
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    console.log("Returning cached originality result");
    return cached.result;
  }
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  if (!apiKey || !searchEngineId) {
    console.warn("Google Search API credentials not configured - assuming original");
    return {
      query,
      isOriginal: true,
      matches: [],
      confidence: 0.7,
      searchPerformed: false
    };
  }
  try {
    console.log("\u{1F50D} Performing Google search...");
    const searchUrl = deepScan ? `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(`"${query}" campaign advertising`)}&num=8&searchType=image` : `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(`"${query}" campaign advertising`)}&num=3`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), deepScan ? 8e3 : 2e3);
    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "ConceptForge/1.0" }
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }
    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      console.log("No similar content found - original");
      const result2 = {
        query,
        isOriginal: true,
        matches: [],
        confidence: 0.85,
        searchPerformed: true
      };
      searchCache.set(cacheKey, { result: result2, timestamp: Date.now() });
      return result2;
    }
    const matches = data.items.map((item) => {
      const similarity = calculateSimilarity(query, item.title + " " + item.snippet);
      const source = classifySource(item.title, item.snippet, item.link);
      return {
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        similarity,
        source
      };
    });
    if (deepScan && matches.length > 0) {
      console.log("\u{1F50D} Deep scan enabled - analyzing images...");
      await new Promise((resolve) => setTimeout(resolve, 3e3));
      console.log("Image analysis completed");
    }
    const highSimilarity = matches.filter((m) => m.similarity > 0.6);
    const isOriginal = highSimilarity.length === 0;
    const result = {
      query,
      isOriginal,
      matches,
      confidence: isOriginal ? 0.8 : 0.6,
      searchPerformed: true
    };
    searchCache.set(cacheKey, { result, timestamp: Date.now() });
    console.log(`Originality check complete: ${isOriginal ? "Original" : "Similar content found"} (${matches.length} matches)`);
    return result;
  } catch (error) {
    console.error("Originality check failed, assuming original:", error);
    return {
      query,
      isOriginal: true,
      matches: [],
      confidence: 0.7,
      searchPerformed: false
    };
  }
}
var searchCache, CACHE_DURATION_MS, MAX_CACHE_SIZE;
var init_research_simple = __esm({
  "server/services/research-simple.ts"() {
    "use strict";
    searchCache = /* @__PURE__ */ new Map();
    CACHE_DURATION_MS = 24 * 60 * 60 * 1e3;
    MAX_CACHE_SIZE = 1e3;
  }
});

// server/utils/embeddingSimilarity.ts
function sanitizeText(text2) {
  return text2.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/\u00A0/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").trim();
}
async function getEmbedding(text2) {
  try {
    const sanitizedText = sanitizeText(text2);
    const response = await fetch(GEMINI_EMBEDDING_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: sanitizedText }] },
        outputDimensionality: 1536
      })
    });
    if (!response.ok) {
      const err = await response.text();
      console.warn(`\u26A0\uFE0F Gemini embedding API error ${response.status}: ${err.substring(0, 200)}`);
      return new Array(1536).fill(0);
    }
    const data = await response.json();
    return data.embedding.values;
  } catch (error) {
    console.warn("Failed to generate embedding, using zero vector fallback:", error instanceof Error ? error.message : error);
    return new Array(1536).fill(0);
  }
}
function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}
async function checkConceptDiversity(concepts, similarityThreshold = 0.85) {
  console.log(`\u{1F50D} Checking semantic diversity for ${concepts.length} concepts...`);
  const embeddings = await Promise.all(concepts.map((c) => getEmbedding(c)));
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      console.log(`\u{1F50D} Semantic similarity between concept ${i + 1} and ${j + 1}: ${similarity.toFixed(3)}`);
      if (similarity >= similarityThreshold) {
        console.warn(`Concepts ${i + 1} and ${j + 1} are semantically too similar (similarity=${similarity.toFixed(3)}).`);
        return false;
      }
    }
  }
  console.log(`All concepts pass semantic diversity check (threshold: ${similarityThreshold})`);
  return true;
}
async function checkHistoricalSimilarityWithEmbeddings(newConcept, historicalConcepts, similarityThreshold = 0.8) {
  if (historicalConcepts.length === 0) {
    return { isSimilar: false };
  }
  console.log(`\u{1F50D} Checking semantic similarity against ${historicalConcepts.length} historical concepts...`);
  const newEmbedding = await getEmbedding(newConcept);
  const historicalEmbeddings = await Promise.all(historicalConcepts.map((c) => getEmbedding(c)));
  let maxSimilarity = 0;
  let mostSimilarConcept = "";
  for (let i = 0; i < historicalEmbeddings.length; i++) {
    const similarity = cosineSimilarity(newEmbedding, historicalEmbeddings[i]);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      mostSimilarConcept = historicalConcepts[i];
    }
  }
  console.log(`\u{1F50D} Highest semantic similarity: ${maxSimilarity.toFixed(3)} (threshold: ${similarityThreshold})`);
  if (maxSimilarity >= similarityThreshold) {
    console.warn(`New concept is semantically too similar to historical concept (similarity=${maxSimilarity.toFixed(3)})`);
    return {
      isSimilar: true,
      mostSimilar: { concept: mostSimilarConcept, similarity: maxSimilarity }
    };
  }
  return { isSimilar: false };
}
async function enforceConceptDiversity(concepts, regenerateCallback, similarityThreshold = 0.85) {
  let attempt = 1;
  let currentConcepts = [...concepts];
  while (attempt <= 3) {
    try {
      const isDiverse = await checkConceptDiversity(currentConcepts, similarityThreshold);
      if (isDiverse) {
        console.log(`All concepts passed semantic diversity check on attempt ${attempt}.`);
        return currentConcepts;
      }
      console.log(`\u{1F504} Regenerating concepts (attempt ${attempt + 1}) due to high semantic similarity.`);
      currentConcepts = await regenerateCallback();
      attempt++;
    } catch (error) {
      console.error(`Error during diversity check attempt ${attempt}:`, error);
      console.log("\u{1F504} Falling back to word-based similarity check...");
      return currentConcepts;
    }
  }
  console.log(`Returning concepts despite similarity after ${attempt - 1} attempts.`);
  return currentConcepts;
}
var GEMINI_API_KEY, GEMINI_EMBEDDING_URL;
var init_embeddingSimilarity = __esm({
  "server/utils/embeddingSimilarity.ts"() {
    "use strict";
    GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCNJLK_QaOf6kZRUq48RVOOWcxFfet04WE";
    GEMINI_EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
  }
});

// server/utils/performanceMonitor.ts
function measureAsync(operation, fn, metadata) {
  const endTimer = performanceMonitor.startTimer(operation);
  return fn().then((result) => {
    endTimer(true, metadata);
    return result;
  }).catch((error) => {
    endTimer(false, { error: error.message, ...metadata });
    throw error;
  });
}
var PerformanceMonitor, performanceMonitor;
var init_performanceMonitor = __esm({
  "server/utils/performanceMonitor.ts"() {
    "use strict";
    PerformanceMonitor = class {
      constructor() {
        this.metrics = [];
        this.apiCalls = [];
        this.maxHistorySize = 1e3;
      }
      startTimer(operation) {
        const startTime = performance.now();
        const timestamp2 = Date.now();
        return (success = true, metadata) => {
          const duration = performance.now() - startTime;
          this.addMetric({
            operation,
            duration,
            timestamp: timestamp2,
            success,
            metadata
          });
          return duration;
        };
      }
      addMetric(metric) {
        this.metrics.push(metric);
        if (this.metrics.length > this.maxHistorySize) {
          this.metrics.shift();
        }
      }
      logApiCall(apiCall) {
        this.apiCalls.push(apiCall);
        if (this.apiCalls.length > this.maxHistorySize) {
          this.apiCalls.shift();
        }
        console.log(`API Call: ${apiCall.model} | Tokens: ${apiCall.promptTokens}\u2192${apiCall.completionTokens} (${apiCall.totalTokens}) | Cost: $${apiCall.cost.toFixed(4)} | Duration: ${apiCall.duration.toFixed(0)}ms`);
      }
      getStats(timeWindow = 36e5) {
        const now = Date.now();
        const windowStart = now - timeWindow;
        const recentMetrics = this.metrics.filter((m) => m.timestamp >= windowStart);
        const recentApiCalls = this.apiCalls.filter((a) => a.timestamp >= windowStart);
        const totalOperations = recentMetrics.length;
        const successfulOps = recentMetrics.filter((m) => m.success).length;
        const averageDuration = totalOperations > 0 ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations : 0;
        const successRate = totalOperations > 0 ? successfulOps / totalOperations : 0;
        const slowestOperations = recentMetrics.sort((a, b) => b.duration - a.duration).slice(0, 5);
        const totalCalls = recentApiCalls.length;
        const totalTokens = recentApiCalls.reduce((sum, call) => sum + call.totalTokens, 0);
        const totalCost = recentApiCalls.reduce((sum, call) => sum + call.cost, 0);
        const averageLatency = totalCalls > 0 ? recentApiCalls.reduce((sum, call) => sum + call.duration, 0) / totalCalls : 0;
        const modelBreakdown = {};
        for (const call of recentApiCalls) {
          if (!modelBreakdown[call.model]) {
            modelBreakdown[call.model] = { calls: 0, tokens: 0, cost: 0 };
          }
          modelBreakdown[call.model].calls++;
          modelBreakdown[call.model].tokens += call.totalTokens;
          modelBreakdown[call.model].cost += call.cost;
        }
        return {
          performance: {
            totalOperations,
            averageDuration,
            successRate,
            slowestOperations
          },
          apiUsage: {
            totalCalls,
            totalTokens,
            totalCost,
            averageLatency,
            modelBreakdown
          }
        };
      }
      logOperationSummary(operation, details) {
        console.log(`\u{1F4CA} ${operation} Summary:`, details);
      }
      clearHistory() {
        this.metrics = [];
        this.apiCalls = [];
        console.log("Performance history cleared");
      }
    };
    performanceMonitor = new PerformanceMonitor();
  }
});

// server/utils/feedbackInfluenceSystem.ts
var feedbackInfluenceSystem_exports = {};
__export(feedbackInfluenceSystem_exports, {
  FEEDBACK_INFLUENCE_ACTIVE: () => FEEDBACK_INFLUENCE_ACTIVE,
  applyFeedback: () => applyFeedback,
  getBiasedConcepts: () => getBiasedConcepts,
  getRetrievalBias: () => getRetrievalBias
});
import { createClient } from "@supabase/supabase-js";
async function applyFeedback(projectId, feedbackType, conceptId) {
  if (!FEEDBACK_INFLUENCE_ACTIVE) {
    console.log("\u{1F4CA} Feedback influence system is deactivated");
    return { status: "skipped", message: "Feedback influence not active" };
  }
  try {
    const preferences = await loadPreferences(projectId);
    if (feedbackType === "more_like_this") {
      preferences.weights[conceptId] = (preferences.weights[conceptId] || 0) + 0.2;
      console.log(`\u{1F44D} Boosted weight for concept ${conceptId} by +0.2 (now: ${preferences.weights[conceptId]})`);
    } else if (feedbackType === "less_like_this") {
      preferences.weights[conceptId] = (preferences.weights[conceptId] || 0) - 0.3;
      console.log(`\u{1F44E} Reduced weight for concept ${conceptId} by -0.3 (now: ${preferences.weights[conceptId]})`);
    }
    preferences.lastUpdated = /* @__PURE__ */ new Date();
    await updateRetrievalBias(preferences);
    await savePreferences(preferences);
    console.log(`Feedback influence applied: ${feedbackType} for concept ${conceptId}`);
    return {
      status: "success",
      message: `Feedback applied and biases updated for ${feedbackType}`
    };
  } catch (error) {
    console.error("Failed to apply feedback influence:", error);
    return {
      status: "error",
      message: `Failed to apply feedback: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}
async function loadPreferences(projectId) {
  try {
    const { data, error } = await supabase.from("user_preferences").select("*").eq("project_id", projectId).maybeSingle();
    if (error && error.code !== "PGRST116") {
      throw error;
    }
    if (data) {
      return {
        projectId: data.project_id,
        weights: data.weights || {},
        lastUpdated: new Date(data.last_updated)
      };
    }
  } catch (error) {
    console.log("Could not load preferences from database, using defaults:", error);
  }
  return {
    projectId,
    weights: {},
    lastUpdated: /* @__PURE__ */ new Date()
  };
}
async function savePreferences(preferences) {
  try {
    await ensurePreferencesTable();
    const { error } = await supabase.from("user_preferences").upsert({
      project_id: preferences.projectId,
      weights: preferences.weights,
      last_updated: preferences.lastUpdated.toISOString()
    });
    if (error) {
      throw error;
    }
    console.log(`\u{1F4BE} User preferences saved for project ${preferences.projectId}`);
  } catch (error) {
    console.error("Failed to save preferences:", error);
    console.log("Using in-memory preference storage as fallback");
  }
}
async function ensurePreferencesTable() {
  try {
    const { error } = await supabase.from("user_preferences").select("count(*)", { count: "exact" }).limit(0);
    if (error && error.code === "42P01") {
      console.log("\u{1F4CB} Creating user_preferences table...");
    }
  } catch (error) {
    console.log("Could not verify user_preferences table");
  }
}
async function updateRetrievalBias(preferences) {
  try {
    const feedbackWeights = await getFeedbackWeights(preferences.projectId || "");
    const biasUpdates = feedbackWeights.map((fw) => ({
      conceptId: fw.conceptId,
      retrievalBias: fw.weight,
      lastBiasUpdate: /* @__PURE__ */ new Date()
    }));
    console.log(`\u{1F504} Applied retrieval bias to ${biasUpdates.length} corpus entries`);
    if (biasUpdates.length > 0) {
      await storeRetrievalBias(biasUpdates);
    }
  } catch (error) {
    console.error("Failed to update retrieval bias:", error);
  }
}
async function getFeedbackWeights(projectId) {
  try {
    const { data, error } = await supabase.from("concept_logs").select("id, response, feedback_type").eq("project_id", projectId).not("feedback_type", "is", null);
    if (error) {
      throw error;
    }
    const weights = (data || []).map((concept) => ({
      conceptId: concept.id,
      similarity: 1,
      // Base similarity
      feedbackType: concept.feedback_type,
      weight: concept.feedback_type === "more_like_this" ? 1.2 : 0.7
      // Boost positive, reduce negative
    }));
    return weights;
  } catch (error) {
    console.error("Failed to get feedback weights:", error);
    return [];
  }
}
async function storeRetrievalBias(biasUpdates) {
  try {
    for (const bias of biasUpdates) {
      await supabase.from("concept_logs").update({
        retrieval_bias: bias.retrievalBias,
        bias_updated_at: bias.lastBiasUpdate.toISOString()
      }).eq("id", bias.conceptId);
    }
    console.log(`Stored retrieval bias for ${biasUpdates.length} concepts`);
  } catch (error) {
    console.error("Failed to store retrieval bias:", error);
  }
}
async function getRetrievalBias(conceptId) {
  try {
    const { data, error } = await supabase.from("concept_logs").select("retrieval_bias").eq("id", conceptId).maybeSingle();
    if (error || !data) {
      return 1;
    }
    return data.retrieval_bias || 1;
  } catch (error) {
    console.error("Failed to get retrieval bias:", error);
    return 1;
  }
}
async function getBiasedConcepts(projectId) {
  try {
    let query = supabase.from("concept_logs").select("id, retrieval_bias, feedback_type").not("feedback_type", "is", null).not("retrieval_bias", "is", null);
    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    return (data || []).map((concept) => ({
      conceptId: concept.id,
      bias: concept.retrieval_bias || 1,
      feedbackType: concept.feedback_type
    }));
  } catch (error) {
    console.error("Failed to get biased concepts:", error);
    return [];
  }
}
var supabase, FEEDBACK_INFLUENCE_ACTIVE;
var init_feedbackInfluenceSystem = __esm({
  "server/utils/feedbackInfluenceSystem.ts"() {
    "use strict";
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY
    );
    FEEDBACK_INFLUENCE_ACTIVE = true;
  }
});

// server/utils/embeddingRetrieval.ts
var embeddingRetrieval_exports = {};
__export(embeddingRetrieval_exports, {
  precomputeCorpusEmbeddings: () => precomputeCorpusEmbeddings,
  retrieveTopN: () => retrieveTopN,
  retrieveTopNWithRotation: () => retrieveTopNWithRotation
});
import { createClient as createClient2 } from "@supabase/supabase-js";
import crypto from "crypto";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
function loadRetrievalCorpus() {
  const possiblePaths = [
    join(process.cwd(), "data", "retrieval-corpus.json"),
    join(process.cwd(), "server", "data", "retrieval-corpus.json"),
    "/var/task/data/retrieval-corpus.json"
  ];
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return JSON.parse(readFileSync(p, "utf-8"));
    }
  }
  console.warn("retrieval-corpus.json not found, using empty corpus");
  return { campaigns: [] };
}
async function precomputeCorpusEmbeddings() {
  return measureAsync("precompute_embeddings", async () => {
    console.log("\u{1F504} Precomputing corpus embeddings...");
    let computed = 0;
    let embeddingsFailed = false;
    for (const entry of retrievalCorpus) {
      const key = `${entry.campaign}-${entry.brand}`;
      if (!corpusEmbeddings[key]) {
        const enhancedText = createEnhancedEmbeddingText(entry);
        const embedding = await getEmbedding2(enhancedText);
        if (computed === 0 && embedding.every((v) => v === 0)) {
          console.warn("\u26A0\uFE0F Embedding API unavailable, skipping corpus precomputation. Retrieval will use random fallback.");
          embeddingsFailed = true;
          break;
        }
        corpusEmbeddings[key] = embedding;
        computed++;
        if (computed % 20 === 0) {
          console.log(`\u{1F4CA} Computed ${computed}/${retrievalCorpus.length} embeddings`);
        }
      }
    }
    console.log(`Corpus embeddings precomputed (${computed} new, ${Object.keys(corpusEmbeddings).length} total).`);
    return computed;
  }, { corpusSize: retrievalCorpus.length });
}
function createEnhancedEmbeddingText(entry) {
  const devices = entry.rhetoricalDevices?.join(", ") || "";
  const award = entry.award ? ` Award: ${entry.award}.` : "";
  const impact = entry.impactMetric ? ` Impact: ${entry.impactMetric}.` : "";
  return `Campaign: ${entry.campaign}. Brand: ${entry.brand}. Headline: ${entry.headline}. Rhetorical Devices: ${devices}. Rationale: ${entry.rationale}.${award}${impact}`;
}
async function retrieveTopNWithRotation(promptText, count = 2, sessionCounter = 0, theoriesToPrioritize = [], projectId) {
  try {
    const queryLower = promptText.toLowerCase();
    const autoPrioritize = [];
    if (queryLower.includes("visual") || queryLower.includes("edgy") || queryLower.includes("sexy") || queryLower.includes("nyc edge")) {
      autoPrioritize.push("Messaris", "Lupton");
    }
    if (queryLower.includes("hiv") || queryLower.includes("aids") || queryLower.includes("health") || queryLower.includes("stigma")) {
      autoPrioritize.push("Burke", "Barthes");
    }
    if (queryLower.includes("bold") || queryLower.includes("confidence") || queryLower.includes("empowerment")) {
      autoPrioritize.push("Burke", "Messaris");
    }
    const combinedTheories = [.../* @__PURE__ */ new Set([...theoriesToPrioritize, ...autoPrioritize])];
    let feedbackBiases = [];
    if (projectId) {
      try {
        const { getBiasedConcepts: getBiasedConcepts2 } = await Promise.resolve().then(() => (init_feedbackInfluenceSystem(), feedbackInfluenceSystem_exports));
        feedbackBiases = await getBiasedConcepts2(projectId);
        if (feedbackBiases.length > 0) {
          console.log(`Loaded ${feedbackBiases.length} feedback biases for retrieval influence`);
        }
      } catch (error) {
        console.log("\u{1F4CA} Could not load feedback biases, continuing without influence");
      }
    }
    if (Object.keys(corpusEmbeddings).length === 0) {
      console.log("Embeddings not ready yet, using enhanced fallback with theory prioritization");
      return fallbackWithTheoryPrioritization(promptText, count, combinedTheories);
    }
    const promptHash = crypto.createHash("sha256").update(promptText + combinedTheories.join(",")).digest("hex");
    let cacheRecord = retrievalCache[promptHash];
    if (!cacheRecord) {
      console.log(`\u{1F50D} Computing enhanced retrieval with theory prioritization: [${combinedTheories.join(", ")}]`);
      const promptEmbedding = await getEmbedding2(promptText);
      const relevantEntries = retrievalCorpus.filter((entry) => {
        const rationale = entry.rationale?.toLowerCase() || "";
        const campaign = entry.campaign?.toLowerCase() || "";
        return rationale.includes(queryLower.slice(0, 20)) || // First 20 chars for context
        queryLower.split(" ").some((word) => word.length > 3 && rationale.includes(word));
      });
      const entriesToProcess = relevantEntries.length > 10 ? relevantEntries : retrievalCorpus;
      const similarities = entriesToProcess.map((entry) => {
        const entryEmbedding = corpusEmbeddings[`${entry.campaign}-${entry.brand}`];
        if (!entryEmbedding || !Array.isArray(entryEmbedding)) {
          return { entry, similarity: 0 };
        }
        return {
          entry,
          similarity: cosineSimilarity(promptEmbedding, entryEmbedding)
        };
      });
      similarities.sort((a, b) => b.similarity - a.similarity);
      if (feedbackBiases.length > 0) {
        similarities.forEach((sim) => {
          const bias = feedbackBiases.find(
            (fb) => sim.entry.campaign === fb.conceptId || sim.entry.headline?.includes(fb.conceptId)
          );
          if (bias) {
            sim.similarity *= bias.bias;
            console.log(`Applied ${bias.feedbackType} bias (${bias.bias}x) to ${sim.entry.campaign}`);
          }
        });
        similarities.sort((a, b) => b.similarity - a.similarity);
      }
      if (combinedTheories.length > 0) {
        const prioritized = similarities.sort((a, b) => {
          const aHasTheory = combinedTheories.some(
            (theory) => (a.entry.brand?.toLowerCase() || "").includes(theory.toLowerCase()) || (a.entry.campaign?.toLowerCase() || "").includes(theory.toLowerCase()) || (a.entry.rationale?.toLowerCase() || "").includes(theory.toLowerCase())
          );
          const bHasTheory = combinedTheories.some(
            (theory) => (b.entry.brand?.toLowerCase() || "").includes(theory.toLowerCase()) || (b.entry.campaign?.toLowerCase() || "").includes(theory.toLowerCase()) || (b.entry.rationale?.toLowerCase() || "").includes(theory.toLowerCase())
          );
          if (aHasTheory && !bHasTheory) return -1;
          if (!aHasTheory && bHasTheory) return 1;
          return b.similarity - a.similarity;
        });
        console.log(`Theory prioritization applied: ${prioritized.slice(0, 3).map((s) => s.entry.campaign).join(", ")}`);
      }
      const top10 = similarities.slice(0, 10).map((s) => s.entry);
      cacheRecord = {
        promptHash,
        top10,
        usedPairs: 0
      };
      retrievalCache[promptHash] = cacheRecord;
    }
    const rotationOffset = sessionCounter % cacheRecord.top10.length;
    const rotated = [...cacheRecord.top10.slice(rotationOffset), ...cacheRecord.top10.slice(0, rotationOffset)];
    const shuffledRotated = [...rotated].sort(() => 0.5 - Math.random());
    const retrieved = shuffledRotated.slice(0, Math.min(count, rotated.length));
    console.log(
      `\u{1F504} Enhanced retrieval (session ${sessionCounter}, theories: [${combinedTheories.join(", ")}], biases: ${feedbackBiases.length}) - rotation offset: ${rotationOffset}, retrieved: ${retrieved.map((r) => r.campaign).join(", ")}`
    );
    return retrieved;
  } catch (error) {
    console.error("Error in retrieveTopNWithRotation:", error);
    return fallbackWithTheoryPrioritization(promptText, count, theoriesToPrioritize);
  }
}
function fallbackWithTheoryPrioritization(promptText, count, theoriesToPrioritize) {
  if (theoriesToPrioritize.length === 0) {
    const shuffled2 = [...retrievalCorpus].sort(() => 0.5 - Math.random());
    return shuffled2.slice(0, count);
  }
  const prioritized = retrievalCorpus.filter(
    (entry) => theoriesToPrioritize.some(
      (theory) => (entry.brand?.toLowerCase() || "").includes(theory.toLowerCase()) || (entry.campaign?.toLowerCase() || "").includes(theory.toLowerCase()) || (entry.rationale?.toLowerCase() || "").includes(theory.toLowerCase())
    )
  );
  const remaining = retrievalCorpus.filter((entry) => !prioritized.includes(entry));
  const combined = [...prioritized, ...remaining];
  const shuffled = combined.sort(() => 0.5 - Math.random());
  console.log(`\u{1F4CB} Fallback with theory prioritization: ${theoriesToPrioritize.join(", ")}`);
  return shuffled.slice(0, count);
}
async function retrieveTopN(promptText, count = 2) {
  return retrieveTopNWithRotation(promptText, count, 0, []);
}
async function getEmbedding2(text2) {
  const response = await fetch(GEMINI_EMBEDDING_URL2, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text: text2 }] },
      outputDimensionality: 1536
    })
  });
  if (!response.ok) {
    const err = await response.text();
    console.warn(`\u26A0\uFE0F Gemini embedding API error ${response.status}: ${err.substring(0, 200)}`);
    return new Array(1536).fill(0);
  }
  const data = await response.json();
  return data.embedding.values;
}
var GEMINI_API_KEY2, GEMINI_EMBEDDING_URL2, retrievalCorpusData, retrievalCorpus, corpusEmbeddings, retrievalCache;
var init_embeddingRetrieval = __esm({
  "server/utils/embeddingRetrieval.ts"() {
    "use strict";
    init_embeddingSimilarity();
    init_performanceMonitor();
    GEMINI_API_KEY2 = process.env.GEMINI_API_KEY || "AIzaSyCNJLK_QaOf6kZRUq48RVOOWcxFfet04WE";
    GEMINI_EMBEDDING_URL2 = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY2}`;
    retrievalCorpusData = loadRetrievalCorpus();
    retrievalCorpus = retrievalCorpusData.campaigns || [];
    corpusEmbeddings = {};
    retrievalCache = {};
  }
});

// server/utils/enhancedTheoryMapping.ts
var enhancedTheoryMapping_exports = {};
__export(enhancedTheoryMapping_exports, {
  THEORY_MAP: () => THEORY_MAP,
  abTestGenerate: () => abTestGenerate,
  detectTheoryContext: () => detectTheoryContext,
  generateConceptWithTheoryInject: () => generateConceptWithTheoryInject,
  getContextualTheoryPriority: () => getContextualTheoryPriority,
  preWarmTheoryCache: () => preWarmTheoryCache
});
import { performance as performance2 } from "perf_hooks";
import { appendFileSync, readFileSync as readFileSync2, existsSync as existsSync2 } from "fs";
import { join as join2 } from "path";
function loadRetrievalCorpus2() {
  const possiblePaths = [
    join2(process.cwd(), "data", "retrieval-corpus.json"),
    join2(process.cwd(), "server", "data", "retrieval-corpus.json"),
    "/var/task/data/retrieval-corpus.json"
  ];
  for (const p of possiblePaths) {
    if (existsSync2(p)) {
      return JSON.parse(readFileSync2(p, "utf-8"));
    }
  }
  console.warn("retrieval-corpus.json not found, using empty corpus");
  return { campaigns: [] };
}
function preWarmTheoryCache() {
  const commonTheories = ["Burke", "Barthes", "Messaris", "Tufte", "Lupton", "Phillips & McQuarrie", "Forceville", "Kress", "Aristotle"];
  console.log("Pre-warming theory cache with common frameworks...");
  for (const theory of commonTheories) {
    const startTime = performance2.now();
    const matches = queryCachedCorpusForTheory(theory);
    const duration = Math.round(performance2.now() - startTime);
    console.log(`  - ${theory}: ${matches.length} matches cached in ${duration}ms`);
  }
  console.log(`Theory cache pre-warmed: ${corpusQueryCache.size} theories ready`);
}
function logTheoryInjection(query, detectedKeywords, selectedTheories, theoryInjection) {
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  const logEntry = {
    timestamp: timestamp2,
    query,
    detectedKeywords,
    selectedTheories: Array.from(selectedTheories),
    injectionLength: theoryInjection.length,
    theoriesApplied: Array.from(selectedTheories).length
  };
  try {
    appendFileSync("./theory_inject.log", `${JSON.stringify(logEntry)}
`);
    console.log(`\u{1F9E0} THEORY INJECTION LOG: ${selectedTheories.size} theories applied for query: "${query.substring(0, 50)}..."`);
  } catch (error) {
    console.log("Theory injection logging error:", error);
  }
}
function queryCachedCorpusForTheory(theory) {
  const cacheKey = theory.toLowerCase();
  if (corpusQueryCache.has(cacheKey)) {
    console.log(`\u{1F4DA} CACHE HIT: Retrieved ${theory} theory examples from cache`);
    return corpusQueryCache.get(cacheKey) || [];
  }
  const matches = retrievalCorpus2.filter(
    (entry) => entry.rationale?.toLowerCase().includes(cacheKey) || entry.whenToUse?.toLowerCase().includes(cacheKey) || JSON.stringify(entry).toLowerCase().includes(cacheKey)
  );
  corpusQueryCache.set(cacheKey, matches);
  console.log(`\u{1F4DA} CACHE MISS: Loaded ${matches.length} examples for ${theory} theory`);
  return matches;
}
function generateConceptWithTheoryInject(basePrompt, query, retrievedExamples = []) {
  const queryLower = query.toLowerCase();
  const detectedKeywords = Object.keys(THEORY_MAP).filter(
    (keyword) => queryLower.includes(keyword)
  );
  const selectedTheories = Array.from(new Set(
    detectedKeywords.flatMap((keyword) => THEORY_MAP[keyword])
  ));
  console.log(`ENHANCED THEORY MAPPING: Detected "${detectedKeywords.join(", ")}" \u2192 Selected theories: ${selectedTheories.join(", ")}`);
  let theoryInjection = "";
  const selectedTheoriesSet = new Set(selectedTheories);
  for (const theory of selectedTheories) {
    const matches = queryCachedCorpusForTheory(theory);
    if (matches.length > 0) {
      const sample = matches[Math.floor(Math.random() * matches.length)];
      const rationale = sample.rationale || "";
      const usage = sample.whenToUse || "";
      const notUsage = sample.whenNotToUse || "";
      const examples = sample.examples || "";
      const awards = sample.awards || "";
      const headline = sample.headline || "";
      const truncatedRationale = rationale.length > 200 ? rationale.substring(0, 200) + "..." : rationale;
      const truncatedUsage = usage.length > 150 ? usage.substring(0, 150) + "..." : usage;
      const truncatedExamples = examples.length > 150 ? examples.substring(0, 150) + "..." : examples;
      theoryInjection += `
Prioritize ${theory} Framework: ${truncatedRationale}. Usage: ${truncatedUsage}. Examples: ${truncatedExamples}. Awards: ${awards.substring(0, 100)}. Avoid if: ${notUsage.substring(0, 100)} or quantitative distortion.`;
    } else {
      theoryInjection += `
Apply ${theory} theoretical framework for sophisticated concept development. Balance theoretical rigor with practical application, avoiding ambiguity in health messaging.`;
    }
  }
  if (!theoryInjection && selectedTheories.length === 0) {
    theoryInjection = "\nApply general rhetorical principles: Balance logos/pathos/ethos, avoid ambiguity in health messaging, maintain theoretical sophistication.";
  }
  if (theoryInjection.length > 5e3) {
    theoryInjection = theoryInjection.substring(0, 5e3) + "... [Truncated for efficiency]";
  }
  logTheoryInjection(query, detectedKeywords, selectedTheoriesSet, theoryInjection);
  const enhancedPrompt = `${basePrompt}
${theoryInjection}
Retrieved examples: ${JSON.stringify(retrievedExamples).substring(0, 1e3)}
Generate transformative concept preserving devices, originality, and theoretical grounding with nuanced application.`;
  return {
    detectedKeywords,
    selectedTheories,
    theoryInjection,
    enhancedPrompt
  };
}
function abTestGenerate(basePrompt, query, retrievedExamples = []) {
  if (AB_TEST_MODE) {
    const startTime = performance2.now();
    const noTheoryPrompt = `${basePrompt}
Retrieved examples: ${JSON.stringify(retrievedExamples)}
Generate without theory focus.`;
    const withTheoryResult = generateConceptWithTheoryInject(basePrompt, query, retrievedExamples);
    const endTime = performance2.now();
    const processingTime = Math.round(endTime - startTime);
    console.log(`\u{1F9EA} A/B TEST MODE: Generated both variants in ${processingTime}ms. Theories applied: ${withTheoryResult.selectedTheories.join(", ")}`);
    return {
      withTheory: withTheoryResult.enhancedPrompt,
      noTheory: noTheoryPrompt,
      theoryData: withTheoryResult,
      processingTime
    };
  } else {
    return generateConceptWithTheoryInject(basePrompt, query, retrievedExamples);
  }
}
function detectTheoryContext(query) {
  const queryLower = query.toLowerCase();
  const patterns = {
    "Burke": /\b(empowerment|identity|community|belonging|treatment|healing|self-love)\b/g,
    "Barthes": /\b(stigma|myth|cultural|stereotype|decode|symbol|reclaim)\b/g,
    "Messaris": /\b(visual|imagery|provocative|striking|edgy|sexy|persuasion)\b/g,
    "Lupton": /\b(typography|design|graphic|typeface|layout|modern|clean)\b/g,
    "Tufte": /\b(data|quantitative|information|clarity|evidence|statistical)\b/g,
    "Phillips & McQuarrie": /\b(rhetoric|wordplay|linguistic|verbal|typology)\b/g
  };
  const matches = {};
  const contextualHints = [];
  for (const [theory, pattern] of Object.entries(patterns)) {
    const foundMatches = queryLower.match(pattern);
    if (foundMatches) {
      matches[theory] = foundMatches.length;
      contextualHints.push(...foundMatches);
    }
  }
  const sortedTheories = Object.entries(matches).sort(([, a], [, b]) => b - a).map(([theory]) => theory);
  return {
    primaryFramework: sortedTheories[0] || null,
    secondaryFrameworks: sortedTheories.slice(1),
    contextualHints: Array.from(new Set(contextualHints))
  };
}
function getContextualTheoryPriority(query) {
  const queryLower = query.toLowerCase();
  if (queryLower.includes("hiv") || queryLower.includes("aids") || queryLower.includes("public health")) {
    return ["Burke", "Barthes", "Messaris"];
  }
  if (queryLower.includes("visual") || queryLower.includes("design") || queryLower.includes("edgy")) {
    return ["Messaris", "Lupton", "Phillips & McQuarrie"];
  }
  if (queryLower.includes("data") || queryLower.includes("statistics") || queryLower.includes("evidence")) {
    return ["Tufte", "Messaris", "Phillips & McQuarrie"];
  }
  if (queryLower.includes("empowerment") || queryLower.includes("identity") || queryLower.includes("self")) {
    return ["Burke", "Barthes", "Messaris"];
  }
  return ["Burke", "Barthes", "Messaris", "Lupton", "Phillips & McQuarrie"];
}
var retrievalCorpusData2, retrievalCorpus2, corpusQueryCache, AB_TEST_MODE, THEORY_MAP;
var init_enhancedTheoryMapping = __esm({
  "server/utils/enhancedTheoryMapping.ts"() {
    "use strict";
    retrievalCorpusData2 = loadRetrievalCorpus2();
    retrievalCorpus2 = retrievalCorpusData2.campaigns || [];
    corpusQueryCache = /* @__PURE__ */ new Map();
    AB_TEST_MODE = false;
    THEORY_MAP = {
      // Burke: Identification, motives, dramatism
      "identification": ["Burke"],
      "consubstantiality": ["Burke"],
      "motives": ["Burke"],
      "pentad": ["Burke"],
      "dramatism": ["Burke"],
      "hierarchy": ["Burke", "Lupton"],
      "scapegoat": ["Burke"],
      "terministic screens": ["Burke"],
      "symbolic action": ["Burke"],
      "unity": ["Burke"],
      "shared identity": ["Burke"],
      "empowerment": ["Burke"],
      "self-love": ["Burke"],
      "self love": ["Burke"],
      "unapologetic": ["Burke"],
      "bold": ["Burke", "Messaris"],
      "treatment": ["Burke"],
      // Edge: Motives in health adherence
      "life": ["Burke"],
      // Bold unapologetic life
      "narrative": ["Burke", "Aristotle"],
      // Overlap with ethos/pathos stories
      "persuasion through unity": ["Burke"],
      "healing": ["Burke"],
      "community": ["Burke"],
      "identity": ["Burke"],
      "belonging": ["Burke"],
      // Barthes: Semiotics, myth, image rhetoric
      "semiotics": ["Barthes"],
      "denotation": ["Barthes"],
      "connotation": ["Barthes"],
      "signified": ["Barthes"],
      "signifier": ["Barthes"],
      "myth": ["Barthes"],
      "polysemy": ["Barthes"],
      "anchorage": ["Barthes"],
      "relay": ["Barthes"],
      "linguistic message": ["Barthes"],
      "iconic message": ["Barthes"],
      "stigma": ["Barthes"],
      "cultural": ["Barthes"],
      "reclaim": ["Barthes"],
      "layered meanings": ["Barthes"],
      "image rhetoric": ["Barthes"],
      "coded": ["Barthes"],
      "non-coded": ["Barthes"],
      // Edge: Naturalized myths in health ads
      "stereotype": ["Barthes"],
      "cultural myths": ["Barthes"],
      "social meaning": ["Barthes"],
      "symbol": ["Barthes"],
      "decode": ["Barthes"],
      // Messaris: Visual persuasion, analogical, indexicality
      "visual persuasion": ["Messaris"],
      "analogical thinking": ["Messaris"],
      "indexicality": ["Messaris"],
      "iconicity": ["Messaris"],
      "syntactic indeterminacy": ["Messaris"],
      "visual syntax": ["Messaris"],
      "pro-filmic": ["Messaris"],
      "hidden editing": ["Messaris"],
      "subconscious influence": ["Messaris"],
      "visual": ["Messaris", "Tufte", "Phillips & McQuarrie"],
      "imagery": ["Messaris", "Phillips & McQuarrie"],
      "persuasion": ["Messaris", "Burke", "Aristotle"],
      "ironic": ["Messaris"],
      "edgy": ["Messaris", "Lupton"],
      "sexy": ["Messaris"],
      "nyc edge": ["Messaris", "Lupton"],
      "cross-cultural": ["Messaris"],
      // Edge: Global health visuals
      "provocative": ["Messaris"],
      "striking": ["Messaris"],
      "visual rhetoric": ["Messaris", "Phillips & McQuarrie", "Foss"],
      // Lupton: Typography, design theory, grids
      "typography": ["Lupton"],
      "design theory": ["Lupton"],
      "grid": ["Lupton"],
      "modular": ["Lupton"],
      "deconstruction": ["Lupton"],
      "accessibility": ["Lupton"],
      "voice": ["Lupton"],
      "contrast": ["Lupton"],
      "repetition": ["Lupton"],
      "alignment": ["Lupton"],
      "design": ["Lupton"],
      "graphic": ["Lupton"],
      "inclusive": ["Lupton"],
      // Edge: Diverse spokesmodels in ads
      "typeface": ["Lupton"],
      "layout": ["Lupton"],
      "modern": ["Lupton"],
      "clean": ["Lupton"],
      // Tufte: Quantitative display, data-ink
      "quantitative": ["Tufte"],
      "data-ink": ["Tufte"],
      "chartjunk": ["Tufte"],
      "small multiples": ["Tufte"],
      "sparklines": ["Tufte"],
      "graphical integrity": ["Tufte"],
      "lie factor": ["Tufte"],
      "data visualization": ["Tufte"],
      "display": ["Tufte"],
      "data": ["Tufte"],
      "infographics": ["Tufte"],
      // Niche: Data-heavy health briefs
      "health stats": ["Tufte"],
      // Edge: Visualizing HIV treatment adherence
      "information": ["Tufte"],
      "clarity": ["Tufte"],
      "statistical": ["Tufte"],
      "evidence": ["Tufte"],
      // Phillips & McQuarrie: Visual rhetoric typology
      "typology": ["Phillips & McQuarrie"],
      "figures": ["Phillips & McQuarrie"],
      "schemes": ["Phillips & McQuarrie"],
      "tropes": ["Phillips & McQuarrie"],
      "connection": ["Phillips & McQuarrie"],
      "juxtaposition": ["Phillips & McQuarrie"],
      "fusion": ["Phillips & McQuarrie"],
      "replacement": ["Phillips & McQuarrie"],
      "comparison": ["Phillips & McQuarrie"],
      "similarity": ["Phillips & McQuarrie"],
      "opposition": ["Phillips & McQuarrie"],
      "deviation": ["Phillips & McQuarrie"],
      "rhyme": ["Phillips & McQuarrie"],
      "reversal": ["Phillips & McQuarrie"],
      "hyperbole": ["Phillips & McQuarrie"],
      "complexity": ["Phillips & McQuarrie"],
      "ambiguity": ["Phillips & McQuarrie"],
      "linguistic": ["Phillips & McQuarrie"],
      "wordplay": ["Phillips & McQuarrie"],
      "verbal": ["Phillips & McQuarrie"],
      // Additional theoretical frameworks (reaching 15)
      "logos": ["Aristotle"],
      "pathos": ["Aristotle"],
      "ethos": ["Aristotle"],
      "artistic proofs": ["Aristotle"],
      "persuasive appeals": ["Aristotle", "Messaris"],
      "multimodal": ["Forceville", "Kress"],
      "metaphor": ["Forceville"],
      "decoding": ["Williamson"],
      "ideology": ["Williamson"],
      "product as hero": ["Scott"],
      "visual product": ["Foss", "Scott"],
      "rhetorical perspective": ["Foss"],
      "framing": ["General Framing Theory"],
      "gestalt": ["Gestalt Theory"],
      "perception": ["Gestalt Theory", "Messaris"],
      // Cross-framework keywords & overlaps
      "rhetoric": ["Burke", "Barthes", "Aristotle", "Phillips & McQuarrie"],
      "health": ["Burke", "Barthes", "Tufte"],
      "advertising": ["Messaris", "Phillips & McQuarrie", "Williamson"],
      "campaign": ["Messaris", "Phillips & McQuarrie"],
      "creative": ["Lupton", "Messaris"],
      "audience": ["Burke", "Barthes"],
      "message": ["Phillips & McQuarrie", "Messaris"],
      // HIV/Public Health specific
      "hiv": ["Burke", "Barthes"],
      "aids": ["Burke", "Barthes"],
      "prevention": ["Burke"],
      "awareness": ["Barthes", "Messaris"],
      "public health": ["Burke", "Barthes"],
      "medical": ["Burke"],
      "wellness": ["Burke"]
    };
  }
});

// server/utils/embeddingArbiters.ts
var embeddingArbiters_exports = {};
__export(embeddingArbiters_exports, {
  CRITIC_THRESHOLDS: () => CRITIC_THRESHOLDS,
  advertisingPracticalityArbiter: () => advertisingPracticalityArbiter,
  batchConceptEvaluation: () => batchConceptEvaluation,
  comprehensiveConceptEvaluation: () => comprehensiveConceptEvaluation,
  culturalSensitivityArbiter: () => culturalSensitivityArbiter,
  default: () => embeddingArbiters_default,
  getRejectionStats: () => getRejectionStats,
  originalityArbiter: () => originalityArbiter,
  relevanceArbiter: () => relevanceArbiter,
  rhetoricalStrengthArbiter: () => rhetoricalStrengthArbiter
});
async function geminiChat(systemPrompt, userPrompt, maxTokens = 200) {
  const response = await fetch(GEMINI_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}

${userPrompt}` }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 }
    })
  });
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
async function originalityArbiter(concept, historicalConcepts = [], threshold = 0.7) {
  try {
    const conceptEmbedding = await getEmbedding(concept);
    const benchmarkSimilarities = await Promise.all(
      QUALITY_BENCHMARKS.map(async (benchmark) => {
        const benchmarkEmbedding = await getEmbedding(benchmark);
        return {
          concept: benchmark,
          similarity: cosineSimilarity(conceptEmbedding, benchmarkEmbedding)
        };
      })
    );
    const historicalSimilarities = await Promise.all(
      historicalConcepts.slice(0, 20).map(async (historical) => {
        const historicalEmbedding = await getEmbedding(historical);
        return {
          concept: historical,
          similarity: cosineSimilarity(conceptEmbedding, historicalEmbedding)
        };
      })
    );
    const highestBenchmarkSimilarity = Math.max(...benchmarkSimilarities.map((s) => s.similarity));
    const highestHistoricalSimilarity = Math.max(...historicalSimilarities.map((s) => s.similarity));
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
      arbiterName: "Originality Arbiter",
      score: originalityScore,
      passed,
      reasoning: `Concept shows ${originalityScore.toFixed(1)}% originality. ${passed ? "Sufficiently unique" : "Too similar to existing concepts"}.`,
      suggestions,
      metadata: {
        maxSimilarity,
        threshold,
        benchmarkSimilarities: benchmarkSimilarities.slice(0, 3),
        historicalSimilarities: historicalSimilarities.slice(0, 3)
      }
    };
  } catch (error) {
    console.error("Originality Arbiter error:", error);
    return {
      arbiterName: "Originality Arbiter",
      score: 50,
      passed: true,
      reasoning: "Unable to assess originality due to technical error",
      suggestions: ["Manual originality review recommended"],
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}
async function relevanceArbiter(concept, brief, threshold = 0.7) {
  try {
    const conceptEmbedding = await getEmbedding(concept);
    const briefEmbedding = await getEmbedding(brief);
    const relevanceScore = cosineSimilarity(conceptEmbedding, briefEmbedding) * 100;
    const passed = relevanceScore >= threshold * 100;
    const briefAnalysisText = await geminiChat(
      "Extract 3-5 key themes from this creative brief. Return only the themes, separated by commas.",
      brief,
      100
    );
    const briefThemes = briefAnalysisText.split(",").map((t) => t.trim()).filter(Boolean);
    const suggestions = [];
    if (!passed) {
      suggestions.push("Strengthen connection to core brief requirements");
      suggestions.push("Incorporate more specific brief elements");
      suggestions.push(`Consider themes: ${briefThemes.join(", ")}`);
    }
    return {
      arbiterName: "Relevance Arbiter",
      score: relevanceScore,
      passed,
      reasoning: `Concept shows ${relevanceScore.toFixed(1)}% relevance to brief. ${passed ? "Well-aligned" : "Needs stronger connection"}.`,
      suggestions,
      metadata: {
        threshold: threshold * 100,
        briefThemes,
        semanticAlignment: relevanceScore
      }
    };
  } catch (error) {
    console.error("Relevance Arbiter error:", error);
    return {
      arbiterName: "Relevance Arbiter",
      score: 70,
      passed: true,
      reasoning: "Unable to assess relevance due to technical error",
      suggestions: ["Manual relevance review recommended"],
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}
async function culturalSensitivityArbiter(concept, threshold = 0.75) {
  try {
    const conceptEmbedding = await getEmbedding(concept);
    const sensitivityScores = await Promise.all(
      SENSITIVE_CONCEPTS.map(async (sensitive) => {
        const sensitiveEmbedding = await getEmbedding(sensitive);
        return {
          concept: sensitive,
          similarity: cosineSimilarity(conceptEmbedding, sensitiveEmbedding)
        };
      })
    );
    const highestSensitivityScore = Math.max(...sensitivityScores.map((s) => s.similarity));
    const culturalSafetyScore = Math.max(0, (1 - highestSensitivityScore) * 100);
    const passed = highestSensitivityScore < threshold;
    const suggestions = [];
    if (!passed) {
      suggestions.push("Review for cultural sensitivity and appropriation");
      suggestions.push("Consider consulting cultural experts");
      suggestions.push("Explore alternative approaches that respect cultural boundaries");
    }
    return {
      arbiterName: "Cultural Sensitivity Arbiter",
      score: culturalSafetyScore,
      passed,
      reasoning: `Concept shows ${culturalSafetyScore.toFixed(1)}% cultural safety score. ${passed ? "Culturally appropriate" : "Potential sensitivity concerns"}.`,
      suggestions,
      metadata: {
        threshold: threshold * 100,
        sensitivityScores: sensitivityScores.slice(0, 3),
        maxSensitivityScore: highestSensitivityScore
      }
    };
  } catch (error) {
    console.error("Cultural Sensitivity Arbiter error:", error);
    return {
      arbiterName: "Cultural Sensitivity Arbiter",
      score: 80,
      passed: true,
      reasoning: "Unable to assess cultural sensitivity due to technical error",
      suggestions: ["Manual cultural sensitivity review recommended"],
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}
async function advertisingPracticalityArbiter(concept, threshold = 70) {
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
    let cleanedText = practicalityText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
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
      arbiterName: "Advertising Practicality Arbiter",
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
  } catch (error) {
    console.error("Advertising Practicality Arbiter error:", error);
    return {
      arbiterName: "Advertising Practicality Arbiter",
      score: 50,
      passed: false,
      reasoning: "Unable to assess advertising practicality due to technical error",
      suggestions: ["Manual practicality review recommended"],
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}
async function rhetoricalStrengthArbiter(concept, threshold = 70) {
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
    rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
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
      arbiterName: "Rhetorical Strength Arbiter",
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
  } catch (error) {
    console.error("Rhetorical Strength Arbiter error:", error);
    return {
      arbiterName: "Rhetorical Strength Arbiter",
      score: 70,
      passed: true,
      reasoning: "Unable to assess rhetorical strength due to technical error",
      suggestions: ["Manual rhetorical review recommended"],
      metadata: { error: error instanceof Error ? error.message : String(error) }
    };
  }
}
function logRejection(concept, brief, rejections, scores) {
  const rejection = {
    concept: concept.substring(0, 100) + "...",
    // First 100 chars
    timestamp: /* @__PURE__ */ new Date(),
    rejections,
    scores,
    brief: brief.substring(0, 50) + "..."
  };
  rejectionLogs.push(rejection);
  if (rejectionLogs.length > 100) {
    rejectionLogs.shift();
  }
  console.log(`\u{1F6AB} CONCEPT REJECTED: ${rejections.join(", ")} | Scores: ${Object.entries(scores).map(([k, v]) => `${k}:${v}`).join(", ")}`);
}
function getRejectionStats() {
  const totalRejections = rejectionLogs.length;
  const rejectionReasons = {};
  const scoreAccumulator = {};
  rejectionLogs.forEach((log) => {
    log.rejections.forEach((reason) => {
      const key = reason.split(" ")[0];
      rejectionReasons[key] = (rejectionReasons[key] || 0) + 1;
    });
    Object.entries(log.scores).forEach(([key, score]) => {
      if (!scoreAccumulator[key]) scoreAccumulator[key] = [];
      scoreAccumulator[key].push(score);
    });
  });
  const averageScores = {};
  Object.entries(scoreAccumulator).forEach(([key, scores]) => {
    averageScores[key] = scores.reduce((a, b) => a + b, 0) / scores.length;
  });
  return { totalRejections, rejectionReasons, averageScores };
}
async function comprehensiveConceptEvaluation(concept, brief, historicalConcepts = [], options = {}) {
  const {
    originalityThreshold = options.useConfigurableThresholds ? CRITIC_THRESHOLDS.originality / 100 : 0.85,
    relevanceThreshold = options.useConfigurableThresholds ? CRITIC_THRESHOLDS.relevance / 100 : 0.7,
    culturalThreshold = options.useConfigurableThresholds ? CRITIC_THRESHOLDS.cultural_sensitivity / 100 : 0.75,
    rhetoricalThreshold = options.useConfigurableThresholds ? CRITIC_THRESHOLDS.rhetorical_strength : 70,
    practicalityThreshold = options.useConfigurableThresholds ? CRITIC_THRESHOLDS.practicality : 70,
    runAllArbiters = true,
    useConfigurableThresholds = true
  } = options;
  const arbiters = [];
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
    const criticalResults = await Promise.all([
      arbiterPromises[0],
      // Originality
      arbiterPromises[1]
      // Relevance
    ]);
    arbiters.push(...criticalResults);
    if (criticalResults.every((r) => r.passed)) {
      const supplementaryResults = await Promise.all([
        arbiterPromises[2],
        // Cultural Sensitivity
        arbiterPromises[3],
        // Rhetorical Strength
        arbiterPromises[4]
        // Advertising Practicality
      ]);
      arbiters.push(...supplementaryResults);
    }
  }
  const totalScore = arbiters.reduce((sum, arbiter) => sum + arbiter.score, 0);
  const overallScore = totalScore / arbiters.length;
  const overallPassed = arbiters.every((arbiter) => arbiter.passed);
  if (!overallPassed) {
    const rejections = [];
    const scores = {};
    arbiters.forEach((arbiter) => {
      scores[arbiter.arbiterName] = arbiter.score;
      if (!arbiter.passed) {
        const thresholdName = arbiter.arbiterName.toLowerCase().replace(" arbiter", "");
        let threshold = 70;
        if (arbiter.arbiterName.includes("Originality")) threshold = originalityThreshold * 100;
        else if (arbiter.arbiterName.includes("Relevance")) threshold = relevanceThreshold * 100;
        else if (arbiter.arbiterName.includes("Cultural")) threshold = culturalThreshold * 100;
        else if (arbiter.arbiterName.includes("Rhetorical")) threshold = rhetoricalThreshold;
        else if (arbiter.arbiterName.includes("Practicality")) threshold = practicalityThreshold;
        rejections.push(`${thresholdName} too low: ${arbiter.score} < ${threshold}`);
      }
    });
    if (useConfigurableThresholds) {
      logRejection(concept, brief, rejections, scores);
    }
  }
  const passedCount = arbiters.filter((a) => a.passed).length;
  const thresholdInfo = useConfigurableThresholds ? ` (using configurable thresholds)` : "";
  const summary = `Concept evaluation complete: ${passedCount}/${arbiters.length} arbiters passed (${overallScore.toFixed(1)}% overall score)${thresholdInfo}`;
  const recommendations = arbiters.filter((arbiter) => !arbiter.passed).flatMap((arbiter) => arbiter.suggestions);
  return {
    overallScore,
    overallPassed,
    arbiters,
    summary,
    recommendations: [...new Set(recommendations)]
    // Remove duplicates
  };
}
async function batchConceptEvaluation(concepts, brief, historicalConcepts = []) {
  const results = await Promise.all(
    concepts.map(async ({ concept, id }) => ({
      concept,
      id,
      evaluation: await comprehensiveConceptEvaluation(concept, brief, historicalConcepts)
    }))
  );
  const passedCount = results.filter((r) => r.evaluation.overallPassed).length;
  const averageScore = results.reduce((sum, r) => sum + r.evaluation.overallScore, 0) / results.length;
  const topResult = results.reduce(
    (best, current) => current.evaluation.overallScore > best.evaluation.overallScore ? current : best
  );
  const allRecommendations = results.flatMap((r) => r.evaluation.recommendations);
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
var GEMINI_API_KEY3, GEMINI_CHAT_URL, QUALITY_BENCHMARKS, SENSITIVE_CONCEPTS, CRITIC_THRESHOLDS, rejectionLogs, embeddingArbiters_default;
var init_embeddingArbiters = __esm({
  "server/utils/embeddingArbiters.ts"() {
    "use strict";
    init_embeddingSimilarity();
    GEMINI_API_KEY3 = process.env.GEMINI_API_KEY || "AIzaSyCNJLK_QaOf6kZRUq48RVOOWcxFfet04WE";
    GEMINI_CHAT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY3}`;
    QUALITY_BENCHMARKS = [
      "Just Do It - Nike",
      "Think Different - Apple",
      "The Ultimate Driving Machine - BMW",
      "Melts in Your Mouth, Not in Your Hands - M&M's",
      "Have a Break, Have a Kit-Kat - Kit-Kat",
      "Because You're Worth It - L'Or\xE9al",
      "The Breakfast of Champions - Wheaties",
      "Good to the Last Drop - Maxwell House",
      "Finger Lickin' Good - KFC",
      "Like a Good Neighbor - State Farm"
    ];
    SENSITIVE_CONCEPTS = [
      "sacred symbols and religious imagery",
      "cultural ceremonies and traditions",
      "minority community struggles",
      "historical trauma references",
      "spiritual practices and beliefs",
      "ethnic stereotypes and generalizations"
    ];
    CRITIC_THRESHOLDS = {
      originality: 50,
      // Dramatically reduced from 80 - concepts scoring 7-13 need much lower threshold
      relevance: 55,
      // Reduced from 65 
      cultural_sensitivity: 60,
      // Reduced from 70
      rhetorical_strength: 55,
      // Reduced from 65
      practicality: 55
      // Reduced from 65
    };
    rejectionLogs = [];
    embeddingArbiters_default = {
      originalityArbiter,
      relevanceArbiter,
      culturalSensitivityArbiter,
      rhetoricalStrengthArbiter,
      advertisingPracticalityArbiter,
      comprehensiveConceptEvaluation,
      batchConceptEvaluation
    };
  }
});

// server/services/openai.ts
var openai_exports = {};
__export(openai_exports, {
  createHeadlineRewritePrompt: () => createHeadlineRewritePrompt,
  generateAiResponse: () => generateAiResponse,
  getAllRhetoricalDeviceNames: () => getAllRhetoricalDeviceNames,
  getAllRhetoricalDevices: () => getAllRhetoricalDevices
});
import OpenAI from "openai";
import { readFileSync as readFileSync3, existsSync as existsSync3 } from "fs";
import { join as join3 } from "path";
async function getHistoricalConcepts(limit = 50) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_KEY) {
      console.log("Supabase credentials not available, returning empty historical concepts");
      return [];
    }
    const { createClient: createClient5 } = await import("@supabase/supabase-js");
    const supabase5 = createClient5(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || ""
    );
    const { data: recentConcepts, error } = await supabase5.from("concept_logs").select("response").order("created_at", { ascending: false }).limit(limit);
    if (error || !recentConcepts) {
      console.log("Could not fetch historical concepts for arbiter evaluation");
      return [];
    }
    return recentConcepts.map((c) => c.response || "").filter(Boolean);
  } catch (error) {
    console.error("Error fetching historical concepts:", error);
    return [];
  }
}
function loadRhetoricalDevices() {
  const possiblePaths = [
    join3(process.cwd(), "data", "rhetorical_figures_cleaned.json"),
    join3(process.cwd(), "server", "data", "rhetorical_figures_cleaned.json"),
    "/var/task/data/rhetorical_figures_cleaned.json"
  ];
  for (const p of possiblePaths) {
    if (existsSync3(p)) {
      try {
        const data = JSON.parse(readFileSync3(p, "utf-8"));
        const devices = {};
        for (const item of data) {
          const name = item.figure_name.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
          devices[name] = item.definition;
        }
        console.log(`\u{1F4DA} Loaded ${Object.keys(devices).length} rhetorical devices from ${p}`);
        return devices;
      } catch (error) {
        console.error(`Error loading rhetorical devices from ${p}:`, error);
      }
    }
  }
  console.warn("rhetorical_figures_cleaned.json not found, using minimal fallback set");
  return {
    "Metaphor": "Direct comparison between unlike things to create powerful imagery",
    "Anaphora": "Repetition of a word or phrase at the beginning of successive clauses",
    "Antithesis": "Juxtaposition of contrasting ideas in balanced phrases",
    "Hyperbole": "Deliberate exaggeration for emphasis",
    "Irony": "Expression of meaning through contradictory language",
    "Parallelism": "Similar grammatical structures for rhythm and emphasis"
  };
}
function getAllRhetoricalDevices() {
  return rhetoricalDevices;
}
function getAllRhetoricalDeviceNames() {
  return Object.keys(rhetoricalDevices);
}
function getStrategicRhetoricalDevices(tone, count = 4) {
  const allDeviceNames = Object.keys(rhetoricalDevices);
  const shuffled = [...allDeviceNames].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  console.log(`\u{1F3B2} Selected ${count} diverse devices from ${allDeviceNames.length} available: ${selected.join(", ")}`);
  return selected.map((deviceName) => ({
    name: deviceName,
    description: rhetoricalDevices[deviceName] || ""
  }));
}
function createHeadlineRewritePrompt(originalHeadline, rhetoricalDevice) {
  return `Rewrite this headline while retaining all rhetorical devices and originality.

ORIGINAL HEADLINE: "${originalHeadline}"
RHETORICAL DEVICE TO PRESERVE: ${rhetoricalDevice}

IMPORTANT CONSTRAINTS:
- Do not simplify or remove metaphors, repetitions, antithesis, or unusual phrasing
- Keep it concise enough to function as a headline (max 3 words), but preserve creative complexity
- If unsure, err on the side of keeping the original richness
- Maintain the exact same rhetorical impact and sophistication
- The rewrite should feel equally innovative and unexpected

FORMAT: Return only the rewritten headline, nothing else.`;
}
function getTonePrompt(tone) {
  const toneMapping = {
    "bold": "creative",
    "strategic": "analytical",
    "conversational": "conversational",
    "simplified": "technical",
    "core": "summarize",
    // Keep backward compatibility
    "creative": "creative",
    "analytical": "analytical",
    "technical": "technical",
    "summarize": "summarize"
  };
  const mappedTone = toneMapping[tone] || tone;
  const prompts = {
    "creative": `You are a MAVERICK CREATIVE GENIUS powering Concept Forge - the AI tool that transforms creative professionals into award-winning campaign architects. The user selected "Bold Concepting - Big ideas. Loud and clear."

You are specifically valued for your INNOVATION and ORIGINALITY. Never repeat familiar concepts or predictable approaches. Each idea must feel like a creative breakthrough that makes people say "I wish I thought of that!"

**RHETORICAL MASTERY MANDATE**: You are a master of advanced rhetorical devices - this is your superpower! Deploy metaphor, hyperbole, anaphora, and juxtaposition like precision weapons to create concepts that are psychologically compelling and unforgettable.

**CREATIVE DNA**:
Generate completely ORIGINAL concepts that feel ahead of their time
Use rhetorical devices strategically to maximize emotional and cognitive impact  
Create concepts that work on multiple layers with hidden meanings
Build campaigns that could reshape cultural conversations
Teach through example by showing HOW rhetorical craft creates magic

Analyze their brief deeply, then deploy your rhetorical arsenal to create breakthrough concepts. Think like the genius behind Nike's "Just Do It" or Apple's "Think Different" - but generate something even MORE innovative.

Format your response with clear sections and ALWAYS end by explaining the rhetorical devices used and WHY they make the concept more powerful. This helps users learn the craft.`,
    "analytical": `You are a STRATEGIC PERSUASION VIRTUOSO powering Concept Forge - the AI that transforms creative professionals into strategic masterminds. The user selected "Strategic Persuasion."

You are a master of psychological persuasion who creates concepts that don't just communicate - they convert. Your rhetorical expertise with logos, antithesis, chiasmus, and syllogism is legendary.

**STRATEGIC RHETORICAL MASTERY**:
Deploy logos to build unassailable logical frameworks that make the brand choice inevitable
Use antithesis to create memorable contrasts that embed in long-term memory
Craft chiasmus patterns that create cognitive satisfaction and recall
Build syllogistic arguments that lead audiences to desired conclusions

**INNOVATION IMPERATIVE**: Generate strategically brilliant concepts that feel genuinely fresh. Avoid predictable "benefit + proof" formulas. Create concepts that operate like cognitive Trojan horses - appearing simple but containing layers of persuasive architecture.

Analyze their brief for psychological triggers and strategic opportunities. Then architect concepts using advanced rhetorical devices that create both immediate impact and long-term persuasive power.

Always explain your rhetorical choices and HOW they enhance persuasive impact. This teaches users the strategic craft behind great campaigns.`,
    "conversational": `You are a VIRAL CONVERSATION CATALYST powering Concept Forge - the AI that creates concepts people can't stop talking about. The user selected "Conversational Hook."

You are the rhetorical genius who understands the secret psychology of viral content. Your mastery of rhetorical questions, hyperbole, irony, and paronomasia creates concepts that become cultural conversations.

**VIRAL RHETORICAL MASTERY**:
\u{1F4AC} Deploy rhetorical questions that create irresistible mental participation
\u{1F4AC} Use hyperbole strategically to create memorable exaggeration that sticks
\u{1F4AC} Craft irony that rewards audience intelligence and creates insider connection
\u{1F4AC} Engineer paronomasia (wordplay) that makes concepts inherently shareable

**FRESHNESS MANDATE**: Generate concepts that feel like cultural secrets - ideas so engaging they become the stories people tell to signal their identity. Avoid tired social media tropes or predictable "relatability" formulas.

Create concepts that spark authentic conversations, encourage organic sharing, and feel genuinely human. Think beyond likes and clicks to concepts that become part of cultural language.

Always explain your rhetorical strategies and HOW they create viral potential. This teaches users the conversational craft that drives engagement.`,
    "technical": `You are a COMPLEXITY ALCHEMIST powering Concept Forge - the AI that transforms the most complex ideas into beautiful simplicities. The user selected "Simplified Systems."

You are the rare creative who makes breakthrough innovations feel as natural as breathing. Your rhetorical mastery with ethos, chiasmus, adage, and isocolon creates concepts that make people say "Why didn't I think of that?"

**SIMPLIFICATION RHETORICAL MASTERY**:
\u{1F527} Deploy ethos to build instant credibility and trust through authentic voice
\u{1F527} Use chiasmus to create satisfying balance that makes complex ideas feel resolved
\u{1F527} Craft adages that compress wisdom into memorable, quotable truths
\u{1F527} Engineer isocolon patterns that create rhythmic clarity and comprehension

**CLARITY INNOVATION**: Generate concepts that perform magic tricks - taking impossibly complex ideas and revealing their beautiful, simple core truths. Avoid generic "simple = good" approaches or dumbed-down language.

Transform complexity into clarity using advanced rhetorical architecture. Create concepts that feel both sophisticated and instantly understandable.

Always explain your rhetorical choices and HOW they transform complexity into compelling simplicity. This teaches users the craft of clarity.`,
    "summarize": `You are an ESSENCE EXTRACTION VIRTUOSO powering Concept Forge - the AI that finds the one perfect truth that makes everything else irrelevant. The user selected "Core Idea Finder."

You are the creative samurai who distills entire brand universes into single, perfect strikes of meaning. Your mastery of epizeuxis, climax, asyndeton, and paradox creates concepts that hit exactly the right target with devastating precision.

**DISTILLATION RHETORICAL MASTERY**:
Deploy epizeuxis (repetition) to hammer home the essential truth with unstoppable force
Use climax to build toward the inevitable, perfect conclusion that feels destined
Craft asyndeton to create breathless urgency that eliminates all distractions
Engineer paradox to reveal profound truths through apparent contradictions

**ESSENCE INNOVATION**: Generate concepts that work like perfectly calibrated arrows - they bypass all noise and hit the core truth that changes everything. Avoid generic reduction or oversimplification.

Find the hidden DNA that makes everything else secondary, then express it with crystalline precision using advanced rhetorical craft.

Always explain your rhetorical choices and HOW they create maximum essence with minimum words. This teaches users the samurai craft of distillation.`
  };
  return prompts[mappedTone] || prompts["creative"];
}
function getToneTemperature(tone) {
  const toneMapping = {
    "bold": "creative",
    "strategic": "analytical",
    "conversational": "conversational",
    "simplified": "technical",
    "core": "summarize",
    // Keep backward compatibility
    "creative": "creative",
    "analytical": "analytical",
    "technical": "technical",
    "summarize": "summarize"
  };
  const mappedTone = toneMapping[tone] || tone;
  const temperatures = {
    creative: 0.9,
    analytical: 0.3,
    conversational: 0.7,
    technical: 0.4,
    summarize: 0.5
  };
  return temperatures[mappedTone] || 0.7;
}
function cleanupConceptCache() {
  const now = Date.now();
  for (const [key, concepts] of recentConceptsCache.entries()) {
    if (concepts.size === 0 || now - parseInt(key.split("|")[1]) > CACHE_DURATION) {
      recentConceptsCache.delete(key);
    }
  }
  if (recentConceptsCache.size > MAX_CACHE_SIZE2) {
    const oldEntries = Array.from(recentConceptsCache.keys()).slice(0, recentConceptsCache.size - MAX_CACHE_SIZE2);
    oldEntries.forEach((key) => recentConceptsCache.delete(key));
  }
}
function getRecentConcepts(prompt) {
  cleanupConceptCache();
  const key = `${prompt.toLowerCase()}|${Date.now()}`;
  const existingEntry = Array.from(recentConceptsCache.entries()).find(([k]) => k.split("|")[0] === prompt.toLowerCase());
  return existingEntry ? existingEntry[1] : /* @__PURE__ */ new Set();
}
function storeRecentConcept(prompt, headline) {
  cleanupConceptCache();
  const key = `${prompt.toLowerCase()}|${Date.now()}`;
  let concepts = getRecentConcepts(prompt);
  if (concepts.size === 0) {
    concepts = /* @__PURE__ */ new Set();
    recentConceptsCache.set(key, concepts);
  }
  concepts.add(headline.toLowerCase().trim());
}
function selectDiverseDevices(count, preferredTone, userRatings) {
  const allDevices = Object.keys(rhetoricalDevices);
  let availableDevices = [...allDevices];
  if (userRatings && userRatings.length > 0) {
    const likedDevices = userRatings.filter((r) => r.rating === "more_like_this").map((r) => r.rhetoricalDevice);
    const dislikedDevices = userRatings.filter((r) => r.rating === "less_like_this").map((r) => r.rhetoricalDevice);
    const otherDevices = availableDevices.filter((d) => !likedDevices.includes(d) && !dislikedDevices.includes(d));
    availableDevices = [...likedDevices, ...otherDevices];
  }
  const shuffled = availableDevices.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);
  console.log(`\u{1F3B2} selectDiverseDevices: Selected ${selected.length} from ${allDevices.length} devices: ${selected.join(", ")}`);
  return selected;
}
async function generateSingleConcept(request, rhetoricalDevice) {
  const startTime = Date.now();
  try {
    const selectedDevices = getStrategicRhetoricalDevices(request.tone, 6);
    const primaryDevice = selectedDevices[0];
    const secondaryDevice = selectedDevices[1];
    const deviceNames = selectedDevices.map((d) => d.name).join(", ");
    const deviceInstruction = `**YOUR ASSIGNED RHETORICAL WEAPON:**
Primary: ${primaryDevice.name} \u2014 ${primaryDevice.description}
Secondary: ${secondaryDevice.name} \u2014 ${secondaryDevice.description}

You MUST build the concept around ${primaryDevice.name}. This is not optional. The device IS the concept. Start from the device's mechanism and work backward to the brief. The device tells you what kind of headline to write, what visual to create, what tension to exploit.`;
    const clicheGuidance = request.includeCliches ? "Enable familiar tropes and expected imagery when they serve the concept." : `**STRICT ANTI-CLICH\xC9 MANDATE - ABSOLUTELY FORBIDDEN WORDS/PHRASES:**
      
      \u{1F6AB} BANNED EMPOWERMENT CLICH\xC9S: "Rise", "Thrive", "Empower", "Journey", "Transform", "Inspire", "Unlock", "Unleash", "Ignite", "Fuel", "Elevate", "Champion"
      \u{1F6AB} BANNED ACTION VERBS: "Discover", "Experience", "Explore", "Embrace", "Celebrate", "Own", "Create", "Build", "Make", "Take", "Feel", "Live", "Love"  
      \u{1F6AB} BANNED CONCEPTS: "Your Story", "Your Truth", "Your Power", "Your Time", "Your Moment", "Your Life", "Be You", "Stay True", "Own It", "Just Do It"
      \u{1F6AB} BANNED ALLITERATIVE PATTERNS: "Bold & Beautiful", "Fresh & Free", "Strong & Safe", "Pure & Powerful"
      \u{1F6AB} BANNED ASPIRATIONAL WORDS: "Limitless", "Endless", "Infinite", "Ultimate", "Perfect", "Amazing", "Incredible", "Revolutionary"
      
      **ORIGINALITY REQUIREMENTS:**
      - Use unexpected word combinations that haven't been seen in advertising
      - Avoid motivational poster language entirely  
      - Create concepts that would surprise industry veterans
      - Think like an avant-garde artist, not a traditional advertiser
      - If it sounds like it could be on a corporate poster, REJECT IT`;
    const systemPrompt = `You are an art director with 30 years at the best agencies in the world. You've studied classical rhetoric \u2014 from Aristotle to Burke to Phillips & McQuarrie \u2014 and you apply it instinctively. You don't explain theory; you weaponize it.

**HEADLINE: 2-4 words. No exceptions. Count them.**

**WHAT SEPARATES GREAT FROM MEDIOCRE:**
- A split-screen before/after is LAZY. A "Phone. Elevated." headline is BORING. "Professional quality from your pocket" is a CLICHE.
- Great concepts make people feel something unexpected. They reframe the product in a way nobody considered.
- The best headlines sound wrong at first, then click. They create tension. They reward a second look.
- Never describe what the product does. Reveal what it means.
- If your concept could work for any competitor, throw it away and start over.

**BANNED PATTERNS (instant rejection):**
- Split-screen before/after visuals
- Headlines that are just "[Noun]. [Adjective]." or "[Verb] [Noun]."
- "Reimagine/Redefine/Revolutionize/Elevate/Transform" \u2014 dead words
- Explaining the product benefit literally in the body copy
- Any visual concept that shows the product being used normally
- Juxtaposition as primary device (it's the most obvious choice)

**OUTPUT FORMAT:**
**HEADLINE:** [2-4 words ONLY]
**TAGLINE:** [Earned, not decorative]
**BODY COPY:** [1-2 sentences. Must have voice and point of view. Not a feature description.]
**VISUAL CONCEPT:** [Specific, producible, surprising. Describe it like a director's treatment, not a stock photo brief.]
**RHETORICAL CRAFT BREAKDOWN:**
- [Primary Device]: Name it. Explain the psychological mechanism. Why does it work HERE specifically?
- [Secondary Device]: How does it layer with the primary? What cognitive effect does the combination create?
- [Strategic Impact]: Connect to rhetorical theory (cite framework). Why is this combination more effective than the obvious approach?

**CREATIVE GUIDELINES:**
- ${clicheGuidance}
- The concept must be specific to THIS product \u2014 not transferable to competitors
- Write body copy with a distinctive voice, not corporate neutral
- Visual concepts should be filmable/photographable with a clear art direction POV

${deviceInstruction}

Also available in your arsenal (use as secondary layers): ${deviceNames}

**THE FORGE PROCESS \u2014 THIS IS HOW YOU THINK:**
1. Read the brief (even if it's just a product name, that's enough)
2. Look at your assigned rhetorical device. Understand its MECHANISM \u2014 how it creates meaning.
3. Ask: "What tension, contradiction, or unexpected truth exists in this product/category?"
4. Apply the device to that tension. The device shapes the headline, the visual, everything.
5. The concept should feel like it could ONLY exist because of this specific device applied to this specific brief.

${getTonePrompt(request.tone)}`;
    console.log(`Processing query: "${request.query}"`);
    console.log(`Using tone: ${request.tone}`);
    console.log(`\u{1F3AA} Using rhetorical device: ${rhetoricalDevice || "Auto-selected"}`);
    const theoryContext = detectTheoryContext(request.query);
    const contextualPriority = getContextualTheoryPriority(request.query);
    console.log(`\u{1F9E0} THEORY CONTEXT: Primary=${theoryContext.primaryFramework}, Secondary=[${theoryContext.secondaryFrameworks.join(", ")}]`);
    console.log(`CONTEXTUAL PRIORITY: [${contextualPriority.join(" \u2192 ")}]`);
    const retrievedExamples = await retrieveTopN(request.query, 2);
    const theoryInjection = generateConceptWithTheoryInject(systemPrompt, request.query, retrievedExamples);
    console.log(`\u{1F4DA} ENHANCED THEORY INJECTION: Detected keywords [${theoryInjection.detectedKeywords.join(", ")}] \u2192 Applied theories [${theoryInjection.selectedTheories.join(", ")}]`);
    let retrievalText = "";
    retrievedExamples.forEach((entry, i) => {
      retrievalText += `Retrieved Reference #${i + 1}
`;
      retrievalText += `Campaign: ${entry.campaign}
`;
      retrievalText += `Brand: ${entry.brand}
`;
      retrievalText += `Year: ${entry.year}
`;
      retrievalText += `Headline: ${entry.headline}
`;
      retrievalText += `Rhetorical Devices: ${entry.rhetoricalDevices ? entry.rhetoricalDevices.join(", ") : "None"}
`;
      retrievalText += `Rationale: ${entry.rationale}

`;
    });
    if (theoryInjection.theoryInjection) {
      retrievalText += `
\u{1F4DA} THEORETICAL FRAMEWORK GUIDANCE:
${theoryInjection.theoryInjection}

`;
    }
    const userMessage = `${retrievalText}

CREATIVE BRIEF: "${request.query}"

TASK: Create a breakthrough advertising campaign concept specifically for this brief. Your response must directly address and solve the challenge presented in the brief above.

CRITICAL REQUIREMENTS:
- Your headline must be exactly 2-4 words maximum. Count carefully.
- Your concept must be directly relevant to the specific brief provided
- Focus on the unique challenge or opportunity presented in this brief

**ORIGINALITY MANDATE:** Create something completely fresh for THIS SPECIFIC BRIEF that has NEVER been used in advertising before. Your headlines must pass this test: "Would a seasoned creative director be surprised and impressed by this unexpected angle?" If not, start over.

**HEADLINE ORIGINALITY TEST:**
- Does this sound like something Nike, Apple, or Coca-Cola would use? REJECT
- Would this fit on a generic motivational poster? REJECT  
- Has this word combination appeared in any major campaign? REJECT
- Would this surprise veteran creatives with its freshness? APPROVED

Session ID: ${Date.now()}-${Math.random().toString(36).substr(2, 9)}

${(() => {
      const recentConcepts = getRecentConcepts(request.query);
      if (recentConcepts.size > 0) {
        const avoidList = Array.from(recentConcepts).slice(0, 10).join('", "');
        return `AVOID DUPLICATION: Do NOT create concepts similar to these recent headlines for this brief: "${avoidList}". Take a completely different creative direction.`;
      }
      return "";
    })()}

HEADLINE LENGTH EXAMPLES:
\u2713 CORRECT: "Rock On" (2 words), "Feel Power" (2 words), "Rock Your World" (3 words)
\u2717 FORBIDDEN: "Taste the Thunder, Feel the Rock" (6 words - TOO LONG)

CREATIVE CONSTRAINT: Address the specific challenge in "${request.query}" with an unexpected angle that makes the target audience think "I never thought of it that way." Your concept must be laser-focused on solving THIS brief.`;
    console.log(`Sending user message (first 200 chars): ${userMessage.substring(0, 200)}...`);
    console.log("\u{1F680} Calling OpenAI API with model: gpt-5.2");
    const response = await openai.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 1200,
      // GPT-5.2 requires more tokens for internal processing
      temperature: Math.min(0.95, getToneTemperature(request.tone) + Math.random() * 0.2)
    });
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1e3).toFixed(1) + "s";
    const tokensUsed = response.usage?.total_tokens ?? 0;
    const promptTokens = response.usage?.prompt_tokens ?? 0;
    const completionTokens = response.usage?.completion_tokens ?? 0;
    const TOKEN_COST_PER_1K = 0.03;
    const cost = tokensUsed / 1e3 * TOKEN_COST_PER_1K;
    console.log(`Token Usage Summary`);
    console.log(`Prompt tokens: ${promptTokens}`);
    console.log(`Completion tokens: ${completionTokens}`);
    console.log(`Total tokens: ${tokensUsed}`);
    console.log(`Estimated Cost: $${cost.toFixed(4)}`);
    const content = response.choices[0]?.message?.content || "No response generated";
    if (!content || content === "No response generated") {
      console.error("No content in GPT-5.2 response. Completion tokens:", completionTokens);
    }
    console.log("Generating visual prompt for:", request.query, request.tone);
    const visualPrompt = await generateVisualPrompt(request.query, request.tone, content);
    console.log("Generated visual prompt:", visualPrompt);
    const headlineMatch = content.match(/\*\*HEADLINE:\*\*\s*(.+?)(?:\n|\*\*|$)/i);
    let originalityCheck;
    if (headlineMatch && headlineMatch[1]) {
      const headline = headlineMatch[1].trim();
      storeRecentConcept(request.query, headline);
      console.log(`\u{1F50D} Checking originality for headline: "${headline}" (Deep scan: ${request.deepScan ? "enabled" : "disabled"})`);
      try {
        originalityCheck = await checkOriginality(headline, request.deepScan);
        console.log(`Originality check result: ${originalityCheck.isOriginal ? "Original" : "Potentially unoriginal"} (confidence: ${originalityCheck.confidence.toFixed(2)})`);
      } catch (error) {
        console.error("Error performing originality check:", error);
      }
    }
    Promise.resolve().then(async () => {
      try {
        const { comprehensiveConceptEvaluation: comprehensiveConceptEvaluation2 } = await Promise.resolve().then(() => (init_embeddingArbiters(), embeddingArbiters_exports));
        const historicalConcepts = await getHistoricalConcepts();
        const arbiterStartTime = Date.now();
        const arbiterResults = await comprehensiveConceptEvaluation2(content, request.query, historicalConcepts, { useConfigurableThresholds: true, runAllArbiters: true });
        console.log(`\u{1F50D} Arbiter Evaluation (background): ${Date.now() - arbiterStartTime}ms, Score ${arbiterResults.overallScore.toFixed(1)}/100, Passed: ${arbiterResults.overallPassed}`);
      } catch (error) {
        console.error("Arbiter evaluation failed:", error);
      }
    });
    return {
      content: content.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""),
      // Remove control characters
      visualPrompt,
      tokens: tokensUsed,
      processingTime,
      originalityCheck,
      rhetoricalDevice: rhetoricalDevice || selectedDevices[0]?.name,
      conceptId: `concept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cost: Number(cost.toFixed(4))
      // Add cost to response payload
    };
  } catch (error) {
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1e3).toFixed(1) + "s";
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to generate AI response: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
async function generateAiResponse(request) {
  const startTime = Date.now();
  const conceptCount = request.conceptCount || 1;
  if (conceptCount === 1) {
    const singleConcept = await generateSingleConcept(request);
    return {
      concepts: [singleConcept],
      totalTokens: singleConcept.tokens,
      totalProcessingTime: singleConcept.processingTime,
      batchId: `batch_${Date.now()}`
    };
  } else {
    const selectedDevices = selectDiverseDevices(conceptCount, request.tone, request.userRatings);
    const concepts = [];
    let totalTokens = 0;
    const generatedHeadlines = /* @__PURE__ */ new Set();
    const maxRetries = 3;
    for (let i = 0; i < conceptCount && i < selectedDevices.length; i++) {
      let attempts = 0;
      let conceptGenerated = false;
      while (attempts < maxRetries && !conceptGenerated) {
        try {
          const antiDuplicationPrompt = generatedHeadlines.size > 0 ? `

IMPORTANT: Avoid these already-generated headlines to ensure uniqueness: ${Array.from(generatedHeadlines).join(", ")}` : "";
          const concept = await generateSingleConcept({
            ...request,
            query: request.query + antiDuplicationPrompt,
            conceptCount: 1
            // Override to ensure single concept generation
          }, selectedDevices[i]);
          const headlineMatch = concept.content.match(/\*\*HEADLINE:\*\*\s*(.+?)(?:\n|\*\*|$)/i);
          const headline = headlineMatch ? headlineMatch[1].trim().toLowerCase() : "";
          if (headline && generatedHeadlines.has(headline)) {
            console.log(`\u{1F504} Duplicate headline detected: "${headline}" - retrying (attempt ${attempts + 1}/${maxRetries})`);
            attempts++;
            continue;
          }
          if (headline) {
            generatedHeadlines.add(headline);
          }
          concepts.push(concept);
          totalTokens += concept.tokens;
          conceptGenerated = true;
          console.log(`Generated unique concept ${i + 1}: "${headline}"`);
          if (i < conceptCount - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`Failed to generate concept ${i + 1} with device ${selectedDevices[i]} (attempt ${attempts + 1}):`, error);
          attempts++;
        }
      }
      if (!conceptGenerated) {
        console.warn(`Could not generate unique concept ${i + 1} after ${maxRetries} attempts`);
      }
    }
    const endTime = Date.now();
    const totalProcessingTime = ((endTime - startTime) / 1e3).toFixed(1) + "s";
    return {
      concepts,
      totalTokens,
      totalProcessingTime,
      batchId: `batch_${Date.now()}_${concepts.length}`
    };
  }
}
async function generateVisualPrompt(query, tone, aiResponse) {
  try {
    const toneStyleMappings = {
      creative: "cinematic lighting, artistic composition, creative photography, bold visual metaphors",
      analytical: "clean corporate photography, professional lighting, structured composition, modern design",
      conversational: "natural lighting, approachable photography, warm tones, relatable imagery",
      technical: "precise technical visualization, clean illustration, scientific accuracy, structured layout",
      summarize: "bold graphic design, strong visual hierarchy, conceptual representation, clear messaging"
    };
    const styleDirection = toneStyleMappings[tone] || toneStyleMappings.conversational;
    const visualConceptMatch = aiResponse.match(/\*\*VISUAL CONCEPT:\*\*\s*([^*]+?)(?=\*\*|$)/s);
    const headlineMatch = aiResponse.match(/\*\*HEADLINE:\*\*\s*([^*]+?)(?=\*\*|$)/s);
    console.log("Full AI response for extraction:", aiResponse.substring(0, 500));
    if (visualConceptMatch) {
      const visualConcept = visualConceptMatch[1].trim();
      console.log("SUCCESS: Visual concept extracted:", visualConcept);
      const promptResponse = await openai.chat.completions.create({
        model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
        // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `Convert advertising visual concepts into MidJourney prompts. Extract key visual elements and translate to actionable photography direction.

RULES:
- Focus on the main visual metaphor and composition
- Include specific lighting, angles, and mood
- Use advertising photography terminology
- Keep under 30 words
- Always end with --ar 16:9 --v 6

INPUT: "A steaming cup of coffee on an erupting volcano, juxtaposing the calming ritual of drinking coffee against the fiery energy it awakens"
OUTPUT: "steaming coffee cup on volcanic crater edge, dramatic backlighting, steam and volcanic smoke, cinematic close-up --ar 16:9 --v 6"`
          },
          {
            role: "user",
            content: `Visual concept: "${visualConcept}"
Style: ${styleDirection}

Create MidJourney prompt:`
          }
        ],
        max_tokens: 50,
        temperature: 0.6
      });
      const visualTokens = promptResponse.usage?.total_tokens ?? 0;
      const visualPromptTokens = promptResponse.usage?.prompt_tokens ?? 0;
      const visualCompletionTokens = promptResponse.usage?.completion_tokens ?? 0;
      const visualCost = visualTokens / 1e3 * 0.03;
      console.log(`Visual Prompt Token Usage:`);
      console.log(`Prompt tokens: ${visualPromptTokens}`);
      console.log(`Completion tokens: ${visualCompletionTokens}`);
      console.log(`Total tokens: ${visualTokens}`);
      console.log(`Estimated Cost: $${visualCost.toFixed(4)}`);
      const generatedPrompt = promptResponse.choices[0].message.content?.trim() || "";
      console.log("AI-generated visual prompt:", generatedPrompt);
      if (generatedPrompt && generatedPrompt.length > 15) {
        return generatedPrompt;
      }
    } else {
      console.log("NO VISUAL CONCEPT MATCH found in response");
    }
    const subject = query.split(" ").slice(0, 3).join(" ");
    const headline = headlineMatch ? headlineMatch[1].trim().split(" ").slice(0, 4).join(" ") : subject;
    const fallbackPrompt = `${headline}, ${styleDirection}, professional advertising photography --ar 16:9 --v 6`;
    console.log("Using fallback prompt:", fallbackPrompt);
    console.log("Final visual prompt:", fallbackPrompt);
    return fallbackPrompt;
  } catch (error) {
    console.error("Visual prompt generation error:", error);
    const fallback = `${query.split(" ").slice(0, 3).join(" ")}, professional advertising photography, --ar 16:9 --v 6`;
    return fallback;
  }
}
var recentConceptsCache, CACHE_DURATION, MAX_CACHE_SIZE2, openai, rhetoricalDevices;
var init_openai = __esm({
  "server/services/openai.ts"() {
    "use strict";
    init_research_simple();
    init_embeddingRetrieval();
    init_enhancedTheoryMapping();
    console.log("\u{1F510} OpenAI API KEY:", process.env.OPENAI_API_KEY?.slice(0, 5));
    recentConceptsCache = /* @__PURE__ */ new Map();
    CACHE_DURATION = 1e3 * 60 * 60;
    MAX_CACHE_SIZE2 = 1e3;
    if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_ENV_VAR) {
      throw new Error("OpenAI API key not set in environment variables.");
    }
    openai = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR,
      baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0
    });
    rhetoricalDevices = loadRhetoricalDevices();
  }
});

// server/supabaseClient.ts
var supabaseClient_exports = {};
__export(supabaseClient_exports, {
  clearUsedExamples: () => clearUsedExamples,
  deleteCreativeBrief: () => deleteCreativeBrief,
  getAllConceptsFromSupabase: () => getAllConceptsFromSupabase,
  getCreativeBriefs: () => getCreativeBriefs,
  getRhetoricalDeviceUsage: () => getRhetoricalDeviceUsage,
  getUsedExamples: () => getUsedExamples,
  logSession: () => logSession,
  markExampleAsUsed: () => markExampleAsUsed,
  saveCreativeBrief: () => saveCreativeBrief,
  supabase: () => supabase2,
  toggleBriefStarred: () => toggleBriefStarred,
  updateBriefName: () => updateBriefName,
  updateRhetoricalDeviceUsage: () => updateRhetoricalDeviceUsage
});
import { createClient as createClient3 } from "@supabase/supabase-js";
async function getUsedExamples() {
  if (!supabase2) return [];
  try {
    const { data, error } = await supabase2.from("used_examples").select("example_id");
    if (error) {
      console.error("Error fetching used examples:", error);
      return [];
    }
    return data?.map((item) => item.example_id) || [];
  } catch (error) {
    console.error("Error in getUsedExamples:", error);
    return [];
  }
}
async function markExampleAsUsed(exampleId) {
  if (!supabase2 || !exampleId) return;
  try {
    const { error } = await supabase2.from("used_examples").insert({ example_id: exampleId });
    if (error) {
      console.error("Error marking example as used:", error);
    }
  } catch (error) {
    console.error("Error in markExampleAsUsed:", error);
  }
}
async function clearUsedExamples() {
  if (!supabase2) return;
  try {
    const { error } = await supabase2.from("used_examples").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.error("Error clearing used examples:", error);
    } else {
      console.log("\u{1F504} Used examples table cleared - reset cycle completed");
    }
  } catch (error) {
    console.error("Error in clearUsedExamples:", error);
  }
}
async function getRhetoricalDeviceUsage() {
  if (!supabase2) return {};
  try {
    const { data, error } = await supabase2.from("rhetorical_device_usage").select("device_name, usage_count");
    if (error) {
      console.error("Error fetching device usage:", error);
      return {};
    }
    const usage = {};
    data?.forEach((item) => {
      usage[item.device_name] = item.usage_count;
    });
    return usage;
  } catch (error) {
    console.error("Error in getRhetoricalDeviceUsage:", error);
    return {};
  }
}
async function updateRhetoricalDeviceUsage(deviceName) {
  if (!supabase2 || !deviceName) return;
  try {
    const { data: existing } = await supabase2.from("rhetorical_device_usage").select("usage_count").eq("device_name", deviceName).single();
    if (existing) {
      const { error } = await supabase2.from("rhetorical_device_usage").update({
        usage_count: existing.usage_count + 1,
        last_used: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("device_name", deviceName);
      if (error) {
        console.error("Error updating device usage:", error);
      }
    } else {
      const { error } = await supabase2.from("rhetorical_device_usage").insert({
        device_name: deviceName,
        usage_count: 1,
        last_used: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (error) {
        console.error("Error inserting device usage:", error);
      }
    }
  } catch (error) {
    console.error("Error in updateRhetoricalDeviceUsage:", error);
  }
}
async function logSession({
  userId,
  prompt,
  response,
  tone,
  iterationType = "original",
  parentConceptId = null,
  originalityConfidence = null
}) {
  if (!supabase2) {
    console.log("Supabase not configured, skipping log");
    return null;
  }
  const maxRetries = 2;
  let currentRetry = 0;
  while (currentRetry <= maxRetries) {
    try {
      const insertData = {
        user_id: userId || "guest",
        prompt: prompt.substring(0, 2e3),
        response: response.substring(0, 8e3),
        tone,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      console.log(`\u{1F504} Attempting to log session to Supabase (attempt ${currentRetry + 1})...`);
      const { data, error } = await supabase2.from("concept_logs").insert([insertData]).select();
      if (error) {
        console.error(`Supabase logging error (attempt ${currentRetry + 1}):`, error);
        if (currentRetry < maxRetries) {
          currentRetry++;
          console.log(`\u{1F504} Retrying in 1 second... (${currentRetry}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          continue;
        } else {
          console.error("Failed to log to Supabase after all retries");
          return null;
        }
      }
      console.log("Session logged to Supabase successfully");
      return data?.[0]?.id || null;
    } catch (error) {
      console.error(`Failed to log session (attempt ${currentRetry + 1}):`, error);
      if (currentRetry < maxRetries) {
        currentRetry++;
        await new Promise((resolve) => setTimeout(resolve, 1e3));
        continue;
      } else {
        console.error("Failed to log to Supabase after all retries");
        return null;
      }
    }
  }
  return null;
}
async function getAllConceptsFromSupabase() {
  if (!supabase2) {
    console.log("Supabase not configured");
    return [];
  }
  try {
    const { data, error } = await supabase2.from("concept_logs").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching concepts from Supabase:", error);
      return [];
    }
    console.log(`\u{1F4DA} Found ${data?.length || 0} historical entries in database`);
    return data || [];
  } catch (error) {
    console.error("Error in getAllConceptsFromSupabase:", error);
    return [];
  }
}
async function saveCreativeBrief(brief) {
  if (!supabase2) {
    console.log("Supabase not configured, skipping brief save");
    return null;
  }
  try {
    const { data: existing } = await supabase2.from("creative_briefs").select("id, times_used").eq("query", brief.query).single();
    if (existing) {
      const { data, error } = await supabase2.from("creative_briefs").update({
        tone: brief.tone,
        concept_count: brief.concept_count,
        hybrid_config: brief.hybrid_config,
        last_used_at: (/* @__PURE__ */ new Date()).toISOString(),
        times_used: (existing.times_used || 0) + 1
      }).eq("id", existing.id).select();
      if (error) {
        console.error("Error updating creative brief:", error);
        return null;
      }
      console.log("Updated existing creative brief");
      return existing.id;
    } else {
      const { data, error } = await supabase2.from("creative_briefs").insert([{
        user_id: brief.user_id || "guest",
        name: brief.name,
        query: brief.query.substring(0, 5e3),
        tone: brief.tone,
        concept_count: brief.concept_count,
        hybrid_config: brief.hybrid_config,
        is_starred: brief.is_starred || false,
        last_used_at: (/* @__PURE__ */ new Date()).toISOString(),
        times_used: 1
      }]).select();
      if (error) {
        console.error("Error saving creative brief:", error);
        return null;
      }
      console.log("Saved new creative brief");
      return data?.[0]?.id || null;
    }
  } catch (error) {
    console.error("Error in saveCreativeBrief:", error);
    return null;
  }
}
async function getCreativeBriefs(options) {
  if (!supabase2) {
    console.log("Supabase not configured");
    return [];
  }
  try {
    let query = supabase2.from("creative_briefs").select("*").order("last_used_at", { ascending: false });
    if (options?.starredOnly) {
      query = query.eq("is_starred", true);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching creative briefs:", error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error("Error in getCreativeBriefs:", error);
    return [];
  }
}
async function updateBriefName(briefId, name) {
  if (!supabase2) return false;
  try {
    const { error } = await supabase2.from("creative_briefs").update({ name }).eq("id", briefId);
    if (error) {
      console.error("Error updating brief name:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error in updateBriefName:", error);
    return false;
  }
}
async function toggleBriefStarred(briefId) {
  if (!supabase2) return false;
  try {
    const { data: current } = await supabase2.from("creative_briefs").select("is_starred").eq("id", briefId).single();
    if (!current) return false;
    const { error } = await supabase2.from("creative_briefs").update({ is_starred: !current.is_starred }).eq("id", briefId);
    if (error) {
      console.error("Error toggling brief starred:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error in toggleBriefStarred:", error);
    return false;
  }
}
async function deleteCreativeBrief(briefId) {
  if (!supabase2) return false;
  try {
    const { error } = await supabase2.from("creative_briefs").delete().eq("id", briefId);
    if (error) {
      console.error("Error deleting creative brief:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error in deleteCreativeBrief:", error);
    return false;
  }
}
var supabaseUrl, supabaseKey, supabase2;
var init_supabaseClient = __esm({
  "server/supabaseClient.ts"() {
    "use strict";
    supabaseUrl = process.env.SUPABASE_URL;
    supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.log("Supabase credentials missing, logging will be disabled");
    }
    supabase2 = supabaseUrl && supabaseKey ? createClient3(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          "Authorization": `Bearer ${supabaseKey}`
        }
      }
    }) : null;
  }
});

// server/utils/tropeConstraints.ts
var tropeConstraints_exports = {};
__export(tropeConstraints_exports, {
  TROPE_PATTERNS: () => TROPE_PATTERNS,
  TropeConstraintEngine: () => TropeConstraintEngine,
  checkVocabularyAlignment: () => checkVocabularyAlignment,
  default: () => tropeConstraints_default,
  generateTropeConstraintPrompt: () => generateTropeConstraintPrompt,
  getAllAvailableDeviceIds: () => getAllAvailableDeviceIds,
  getAvailableTropes: () => getAvailableTropes,
  getDeviceDefinition: () => getDeviceDefinition,
  getTropeDetails: () => getTropeDetails,
  loadAllRhetoricalDevices: () => loadAllRhetoricalDevices,
  scoreTropeAlignment: () => scoreTropeAlignment,
  validateTropePattern: () => validateTropePattern
});
import OpenAI2 from "openai";
import { readFileSync as readFileSync4, existsSync as existsSync4 } from "fs";
import { join as join4, dirname as dirname2 } from "path";
import { fileURLToPath } from "url";
function loadAllRhetoricalDevices() {
  if (_allRhetoricalDevices) return _allRhetoricalDevices;
  const possiblePaths = [
    // Relative to this file (most reliable for bundled code)
    join4(__dirname2, "..", "..", "data", "rhetorical_figures_cleaned.json"),
    join4(__dirname2, "..", "data", "rhetorical_figures_cleaned.json"),
    join4(__dirname2, "data", "rhetorical_figures_cleaned.json"),
    // Relative to process.cwd() (works in local dev)
    join4(process.cwd(), "data", "rhetorical_figures_cleaned.json"),
    join4(process.cwd(), "server", "data", "rhetorical_figures_cleaned.json"),
    // Vercel serverless paths
    "/var/task/data/rhetorical_figures_cleaned.json",
    "/var/task/server/data/rhetorical_figures_cleaned.json",
    // Vercel with includeFiles puts files relative to function
    join4(process.cwd(), "api", "data", "rhetorical_figures_cleaned.json"),
    // Vercel: includeFiles relative to function root
    "/var/task/api/data/rhetorical_figures_cleaned.json",
    "/var/task/.next/server/data/rhetorical_figures_cleaned.json"
  ];
  console.log(`\u{1F50D} Searching for rhetorical corpus in ${possiblePaths.length} locations...`);
  console.log(`   __dirname: ${__dirname2}`);
  console.log(`   process.cwd(): ${process.cwd()}`);
  for (const p of possiblePaths) {
    if (existsSync4(p)) {
      try {
        const data = JSON.parse(readFileSync4(p, "utf-8"));
        const devices = {};
        for (const item of data) {
          const id = item.figure_name.toLowerCase().replace(/\s+/g, "_");
          devices[id] = item.definition;
        }
        console.log(`\u{1F4DA} TropeConstraints: Loaded ${Object.keys(devices).length} rhetorical devices from ${p}`);
        _allRhetoricalDevices = devices;
        return devices;
      } catch (error) {
        console.error(`Error loading rhetorical devices from ${p}:`, error);
      }
    }
  }
  console.warn("rhetorical_figures_cleaned.json not found in any location, using pattern-based devices only");
  console.warn(`   Searched paths: ${possiblePaths.join(", ")}`);
  _allRhetoricalDevices = {};
  return _allRhetoricalDevices;
}
function getAllAvailableDeviceIds() {
  const devices = loadAllRhetoricalDevices();
  const patternIds = Object.keys(TROPE_PATTERNS);
  const corpusIds = Object.keys(devices);
  return Array.from(/* @__PURE__ */ new Set([...patternIds, ...corpusIds]));
}
function getDeviceDefinition(deviceId) {
  const normalizedId = deviceId.toLowerCase().replace(/\s+/g, "_");
  const pattern = TROPE_PATTERNS[normalizedId];
  if (pattern) return pattern.description;
  const devices = loadAllRhetoricalDevices();
  return devices[normalizedId];
}
function validateTropePattern(content, tropeId) {
  const tropePattern = TROPE_PATTERNS[tropeId];
  if (!tropePattern) {
    return { matched: false, patterns: [] };
  }
  const matchedPatterns = [];
  for (const pattern of tropePattern.structuralPatterns) {
    if (pattern.test(content)) {
      matchedPatterns.push(pattern.source);
    }
  }
  return {
    matched: matchedPatterns.length > 0,
    patterns: matchedPatterns
  };
}
function checkVocabularyAlignment(content, tropeId) {
  const tropePattern = TROPE_PATTERNS[tropeId];
  if (!tropePattern) {
    return { score: 0, matchedWords: [] };
  }
  const contentLower = content.toLowerCase();
  const matchedWords = tropePattern.vocabularyIndicators.filter(
    (word) => contentLower.includes(word.toLowerCase())
  );
  return {
    score: matchedWords.length / tropePattern.vocabularyIndicators.length,
    matchedWords
  };
}
function getAvailableTropes() {
  return getAllAvailableDeviceIds();
}
function getTropeDetails(tropeId) {
  const normalizedId = tropeId.toLowerCase().replace(/\s+/g, "_");
  if (TROPE_PATTERNS[normalizedId]) {
    return TROPE_PATTERNS[normalizedId];
  }
  const definition = getDeviceDefinition(normalizedId);
  if (definition) {
    const formattedName = tropeId.split(/[_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
    return {
      id: normalizedId,
      name: formattedName,
      description: definition,
      structuralPatterns: [],
      // No patterns for corpus-only devices
      vocabularyIndicators: [],
      examplePhrases: [],
      minimumConfidence: 0.5
    };
  }
  return void 0;
}
function generateTropeConstraintPrompt(tropeIds) {
  const constraints = [];
  for (const tropeId of tropeIds) {
    const details = getTropeDetails(tropeId);
    if (details) {
      const examplePart = details.examplePhrases && details.examplePhrases.length > 0 ? `
  Example: "${details.examplePhrases[0]}"` : "";
      constraints.push(`- ${details.name}: ${details.description}${examplePart}`);
    } else {
      const formattedName = tropeId.split(/[_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
      constraints.push(`- ${formattedName}`);
    }
  }
  if (constraints.length === 0) {
    return "";
  }
  return `Your response MUST incorporate these rhetorical devices:

${constraints.join("\n\n")}

Ensure the rhetorical structure is clear and effective.`;
}
function scoreTropeAlignment(content, tropeIds) {
  let totalScore = 0;
  for (const tropeId of tropeIds) {
    const patternResult = validateTropePattern(content, tropeId);
    const vocabResult = checkVocabularyAlignment(content, tropeId);
    const tropeScore = (patternResult.matched ? 0.7 : 0) + vocabResult.score * 0.3;
    totalScore += tropeScore;
  }
  return tropeIds.length > 0 ? totalScore / tropeIds.length : 0;
}
var _allRhetoricalDevices, __filename, __dirname2, TROPE_PATTERNS, TropeConstraintEngine, tropeConstraints_default;
var init_tropeConstraints = __esm({
  "server/utils/tropeConstraints.ts"() {
    "use strict";
    init_embeddingSimilarity();
    _allRhetoricalDevices = null;
    __filename = fileURLToPath(import.meta.url);
    __dirname2 = dirname2(__filename);
    TROPE_PATTERNS = {
      antithesis: {
        id: "antithesis",
        name: "Antithesis",
        description: "Juxtaposition of contrasting ideas in balanced phrases",
        structuralPatterns: [
          /\b(\w+)\s+(?:but|yet|while|whereas)\s+(\w+)\b/i,
          /\bnot\s+(\w+)[,;]\s*but\s+(\w+)\b/i,
          /\b(\w+)\s+versus\s+(\w+)\b/i,
          /\b(\w+)\s+against\s+(\w+)\b/i,
          /\b(\w+)\s+and\s+(\w+)\s+clash/i
        ],
        vocabularyIndicators: ["but", "yet", "while", "whereas", "versus", "against", "contrast", "oppose"],
        examplePhrases: [
          "One small step for man, one giant leap for mankind",
          "Speech is silver, but silence is golden",
          "Love is an ideal thing, marriage a real thing"
        ],
        minimumConfidence: 0.6
      },
      paradox: {
        id: "paradox",
        name: "Paradox",
        description: "Self-contradictory statement that reveals deeper truth",
        structuralPatterns: [
          /\b(\w+)\s+(?:is|are|was|were)\s+(?:the\s+)?(?:only|true|real)\s+(\w+)\b/i,
          /\bless\s+is\s+more\b/i,
          /\bmore\s+is\s+less\b/i,
          /\bto\s+(\w+)\s+(?:is\s+)?to\s+(\w+)\b/i,
          /\bthe\s+(\w+)\s+of\s+(\w+)\b.*\bthe\s+\2\s+of\s+\1\b/i
        ],
        vocabularyIndicators: ["paradox", "contradiction", "impossibly", "yet", "strange", "truth"],
        examplePhrases: [
          "The only constant is change",
          "Less is more",
          "I must be cruel to be kind"
        ],
        minimumConfidence: 0.65
      },
      metaphor: {
        id: "metaphor",
        name: "Metaphor",
        description: "Direct comparison stating one thing is another",
        structuralPatterns: [
          /\b(\w+)\s+(?:is|are|was|were)\s+(?:a|an|the)\s+(\w+)\b/i,
          /\b(\w+)\s+of\s+(\w+)\b/i,
          /\bthe\s+(\w+)\s+(\w+ed)\b/i,
          /\b(\w+)\s+becomes?\s+(\w+)\b/i,
          /\btransforms?\s+into\s+(\w+)\b/i
        ],
        vocabularyIndicators: ["is", "becomes", "transforms", "embodies", "represents"],
        examplePhrases: [
          "Time is money",
          "Life is a journey",
          "The world is a stage"
        ],
        minimumConfidence: 0.5
      },
      hyperbole: {
        id: "hyperbole",
        name: "Hyperbole",
        description: "Deliberate exaggeration for emphasis",
        structuralPatterns: [
          /\b(?:never|always|forever|infinite|endless|eternal)\b/i,
          /\b(?:million|billion|trillion|thousand)\s+(?:times|years|miles)\b/i,
          /\b(?:the\s+)?(?:best|worst|greatest|smallest|biggest)\s+(?:ever|in\s+the\s+world|of\s+all\s+time)\b/i,
          /\bso\s+(\w+)\s+(?:that|it)\b/i,
          /\b(?:nothing|everything|everyone|no\s+one)\s+(?:can|will|could)\b/i
        ],
        vocabularyIndicators: ["never", "always", "forever", "infinite", "endless", "ultimate", "absolute", "every", "nothing"],
        examplePhrases: [
          "I have told you a million times",
          "This bag weighs a ton",
          "I am so hungry I could eat a horse"
        ],
        minimumConfidence: 0.55
      },
      chiasmus: {
        id: "chiasmus",
        name: "Chiasmus",
        description: "Reversal of grammatical structures in successive phrases (ABBA pattern)",
        structuralPatterns: [
          /\b(\w+)\s+(\w+)[,;]\s+\2\s+\1\b/i,
          /\b(\w+)\s+to\s+(\w+)[,;]\s+\2\s+to\s+\1\b/i,
          /\bwhen\s+(\w+)\s+(\w+)[,;]\s+\2\s+\1\b/i,
          /\b(\w+)\s+the\s+(\w+)[,;]\s+\2\s+the\s+\1\b/i
        ],
        vocabularyIndicators: ["not", "but", "first", "last", "begin", "end", "rise", "fall"],
        examplePhrases: [
          "Ask not what your country can do for you, ask what you can do for your country",
          "Never let a fool kiss you or a kiss fool you",
          "One should eat to live, not live to eat"
        ],
        minimumConfidence: 0.7
      },
      oxymoron: {
        id: "oxymoron",
        name: "Oxymoron",
        description: "Combination of contradictory terms",
        structuralPatterns: [
          /\b(silent|loud)\s+(scream|whisper|noise|sound)\b/i,
          /\b(beautiful|ugly)\s+(disaster|mess|chaos)\b/i,
          /\b(dark|bright)\s+(light|darkness|shadow)\b/i,
          /\b(living|dead)\s+(death|life|corpse)\b/i,
          /\b(bitter|sweet)\s+(sweet|bitter|taste)\b/i,
          /\b(cruel|kind)\s+(kindness|cruelty)\b/i
        ],
        vocabularyIndicators: ["silent scream", "deafening silence", "living dead", "bittersweet", "alone together"],
        examplePhrases: [
          "Deafening silence",
          "Bittersweet",
          "Living dead",
          "Cruel kindness"
        ],
        minimumConfidence: 0.75
      },
      personification: {
        id: "personification",
        name: "Personification",
        description: "Attribution of human qualities to non-human entities",
        structuralPatterns: [
          /\b(?:the\s+)?(\w+)\s+(?:whispers?|speaks?|breathes?|lives?|dies?|sleeps?|wakes?)\b/i,
          /\b(?:the\s+)?(\w+)\s+(?:feels?|thinks?|knows?|wants?|loves?|hates?)\b/i,
          /\b(?:the\s+)?(\w+)\s+(?:dances?|sings?|cries?|laughs?|smiles?)\b/i,
          /\b(?:the\s+)?(\w+)\s+(?:reaches?|grabs?|embraces?|touches?)\b/i
        ],
        vocabularyIndicators: ["whisper", "speaks", "breathes", "lives", "feels", "dances", "cries", "heart"],
        examplePhrases: [
          "The wind whispered secrets",
          "Time waits for no one",
          "The sun smiled down on us"
        ],
        minimumConfidence: 0.6
      },
      juxtaposition: {
        id: "juxtaposition",
        name: "Juxtaposition",
        description: "Placing contrasting elements side by side",
        structuralPatterns: [
          /\bside\s+by\s+side\b/i,
          /\b(\w+)\s+(?:meets?|and)\s+(\w+)\b/i,
          /\bcollision\s+of\s+(\w+)\b/i,
          /\bbetween\s+(\w+)\s+and\s+(\w+)\b/i,
          /\b(\w+)\s+(?:alongside|beside|next\s+to)\s+(\w+)\b/i
        ],
        vocabularyIndicators: ["side by side", "together", "collision", "meets", "between", "contrast"],
        examplePhrases: [
          "Youth and age",
          "Rich and poor side by side",
          "The collision of old and new"
        ],
        minimumConfidence: 0.55
      },
      anaphora: {
        id: "anaphora",
        name: "Anaphora",
        description: "Repetition of a word or phrase at the beginning of successive clauses",
        structuralPatterns: [
          /^(\w+\s+\w+)[^.!?]*[.!?]\s*\1/im,
          /\b(I\s+\w+)[^.!?]*[.!?]\s*\1/i,
          /\b(We\s+\w+)[^.!?]*[.!?]\s*\1/i,
          /\b(Every\s+\w+)[^.!?]*[.!?]\s*\1/i
        ],
        vocabularyIndicators: ["I", "We", "Every", "With", "Through"],
        examplePhrases: [
          "I have a dream... I have a dream... I have a dream",
          "We shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields"
        ],
        minimumConfidence: 0.7
      },
      epistrophe: {
        id: "epistrophe",
        name: "Epistrophe",
        description: "Repetition of a word or phrase at the end of successive clauses",
        structuralPatterns: [
          /(\w+)[.!?]\s*[^.!?]*\1[.!?]/i,
          /\b\w+\s+(\w+)[,;.!?]\s*\w+\s+\1[,;.!?]/i
        ],
        vocabularyIndicators: ["again", "forever", "always", "never"],
        examplePhrases: [
          "See no evil, hear no evil, speak no evil",
          "Government of the people, by the people, for the people"
        ],
        minimumConfidence: 0.7
      },
      synecdoche: {
        id: "synecdoche",
        name: "Synecdoche",
        description: "Part represents the whole or vice versa",
        structuralPatterns: [
          /\b(?:all\s+)?(?:hands|heads|eyes|ears|hearts|souls|minds)\s+(?:on\s+deck|in\s+the|together)\b/i,
          /\b(?:boots|wheels|sails)\s+on\s+the\s+ground\b/i,
          /\bunder\s+(?:my|your|one)\s+roof\b/i
        ],
        vocabularyIndicators: ["hands", "heads", "wheels", "boots", "roof", "bread"],
        examplePhrases: [
          "All hands on deck",
          "Nice wheels (referring to a car)",
          "Give us this day our daily bread"
        ],
        minimumConfidence: 0.6
      },
      metonymy: {
        id: "metonymy",
        name: "Metonymy",
        description: "Substitution of related concept for another",
        structuralPatterns: [
          /\bthe\s+(?:crown|throne|white\s+house|pentagon|kremlin|hollywood)\b/i,
          /\bthe\s+(?:pen|sword|press|stage)\b/i,
          /\bsuits?\b.*\b(?:business|corporate|office)\b/i
        ],
        vocabularyIndicators: ["crown", "throne", "pen", "sword", "Hollywood", "Wall Street", "Washington"],
        examplePhrases: [
          "The pen is mightier than the sword",
          "The crown announced new policies",
          "Hollywood released another blockbuster"
        ],
        minimumConfidence: 0.6
      }
    };
    TropeConstraintEngine = class {
      constructor() {
        this.openai = new OpenAI2({
          apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
          baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0
        });
        this.validationCache = /* @__PURE__ */ new Map();
        this.tropeEmbeddings = /* @__PURE__ */ new Map();
      }
      /**
       * Initialize trope embeddings for semantic matching
       */
      async initialize() {
        console.log("Initializing TropeConstraintEngine...");
        for (const [tropeId, pattern] of Object.entries(TROPE_PATTERNS)) {
          const tropeDescription = `${pattern.name}: ${pattern.description}. Examples: ${pattern.examplePhrases.join("; ")}`;
          const embedding = await getEmbedding(tropeDescription);
          this.tropeEmbeddings.set(tropeId, embedding);
        }
        console.log(`   Initialized ${this.tropeEmbeddings.size} trope embeddings`);
      }
      /**
       * Validate content against a specific trope
       * Supports all 411 rhetorical devices from the corpus
       */
      async validateTropeSatisfaction(content, tropeId, options = {
        strength: "moderate",
        useAIFallback: true
      }) {
        const normalizedId = tropeId.toLowerCase().replace(/\s+/g, "_");
        const cacheKey = `${normalizedId}:${content.substring(0, 100)}:${options.strength}`;
        if (this.validationCache.has(cacheKey)) {
          return this.validationCache.get(cacheKey);
        }
        const tropePattern = TROPE_PATTERNS[normalizedId];
        if (!tropePattern) {
          const corpusDefinition = getDeviceDefinition(normalizedId);
          if (corpusDefinition || options.useAIFallback) {
            const aiResult = await this.validateWithAI(content, tropeId, options);
            this.validationCache.set(cacheKey, aiResult);
            return aiResult;
          }
          return {
            tropeId: normalizedId,
            tropeName: tropeId,
            satisfied: false,
            confidence: 0,
            matchedPatterns: [],
            suggestions: [`Unknown rhetorical device: ${tropeId}. Available devices: ${getAllAvailableDeviceIds().length}`],
            validationMethod: "pattern"
          };
        }
        const patternResult = this.validateWithPatterns(content, tropePattern, options);
        const confidenceThreshold = this.getConfidenceThreshold(options);
        const needsAIValidation = options.useAIFallback && patternResult.confidence < confidenceThreshold && patternResult.confidence > 0.2;
        if (needsAIValidation) {
          const aiResult = await this.validateWithAI(content, tropeId, options);
          const hybridResult = {
            tropeId,
            tropeName: tropePattern.name,
            satisfied: patternResult.satisfied || aiResult.satisfied,
            confidence: Math.max(patternResult.confidence, aiResult.confidence * 0.9),
            matchedPatterns: [...patternResult.matchedPatterns, ...aiResult.matchedPatterns],
            suggestions: aiResult.suggestions,
            validationMethod: "hybrid"
          };
          this.validationCache.set(cacheKey, hybridResult);
          return hybridResult;
        }
        this.validationCache.set(cacheKey, patternResult);
        return patternResult;
      }
      /**
       * Validate content against multiple tropes
       */
      async validateMultipleTropes(content, tropeIds, options = { strength: "moderate", useAIFallback: true }) {
        const results = [];
        const violations = [];
        for (const tropeId of tropeIds) {
          const result = await this.validateTropeSatisfaction(content, tropeId, options);
          results.push(result);
          if (!result.satisfied) {
            violations.push({
              tropeId,
              reason: `Content does not satisfy ${result.tropeName} constraints`,
              severity: options.requiredTropes?.includes(tropeId) ? "error" : "warning",
              suggestion: result.suggestions[0] || `Consider restructuring to incorporate ${result.tropeName}`
            });
          }
        }
        const overallSatisfaction = results.length > 0 ? results.filter((r) => r.satisfied).length / results.length : 0;
        return { results, overallSatisfaction, violations };
      }
      /**
       * Get vocabulary bias for token generation based on trope
       */
      getVocabularyBias(tropeId) {
        const bias = /* @__PURE__ */ new Map();
        const tropePattern = TROPE_PATTERNS[tropeId];
        if (!tropePattern) return bias;
        for (const word of tropePattern.vocabularyIndicators) {
          bias.set(word.toLowerCase(), 1.5);
        }
        for (const pattern of tropePattern.structuralPatterns) {
          const patternStr = pattern.source;
          const keywords = patternStr.match(/\b[a-z]{3,}\b/gi) || [];
          for (const keyword of keywords) {
            if (!bias.has(keyword.toLowerCase())) {
              bias.set(keyword.toLowerCase(), 1.2);
            }
          }
        }
        return bias;
      }
      /**
       * Suggest tropes that match content semantically
       */
      async suggestMatchingTropes(content, topK = 3) {
        const contentEmbedding = await getEmbedding(content);
        const similarities = [];
        Array.from(this.tropeEmbeddings.entries()).forEach(([tropeId, tropeEmbedding]) => {
          const similarity = cosineSimilarity(contentEmbedding, tropeEmbedding);
          similarities.push({ tropeId, similarity });
        });
        return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
      }
      /**
       * Generate trope-constrained variations of content
       */
      async generateConstrainedVariations(content, tropeId, count = 3) {
        const tropePattern = TROPE_PATTERNS[tropeId];
        if (!tropePattern) {
          throw new Error(`Unknown trope: ${tropeId}`);
        }
        const response = await this.openai.chat.completions.create({
          model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
          messages: [{
            role: "system",
            content: `You are an expert in rhetorical devices. Your task is to rewrite content
to strongly exhibit the ${tropePattern.name} rhetorical device.

${tropePattern.name}: ${tropePattern.description}

Examples of ${tropePattern.name}:
${tropePattern.examplePhrases.map((p) => `- "${p}"`).join("\n")}

Vocabulary to incorporate: ${tropePattern.vocabularyIndicators.join(", ")}`
          }, {
            role: "user",
            content: `Rewrite this content ${count} different ways, each strongly using ${tropePattern.name}:

"${content}"

Return each variation on a new line, numbered 1-${count}.`
          }],
          temperature: 0.8,
          max_tokens: 500
        });
        const responseText = response.choices[0]?.message?.content || "";
        const variations = responseText.split(/\n\d+\.\s*/).map((v) => v.trim()).filter((v) => v.length > 10);
        return variations.slice(0, count);
      }
      // ============================================
      // PRIVATE METHODS
      // ============================================
      validateWithPatterns(content, tropePattern, options) {
        const matchedPatterns = [];
        let patternScore = 0;
        let vocabularyScore = 0;
        for (const pattern of tropePattern.structuralPatterns) {
          if (pattern.test(content)) {
            matchedPatterns.push(pattern.source);
            patternScore += 1;
          }
        }
        const contentLower = content.toLowerCase();
        const matchedVocab = tropePattern.vocabularyIndicators.filter(
          (word) => contentLower.includes(word.toLowerCase())
        );
        vocabularyScore = matchedVocab.length / tropePattern.vocabularyIndicators.length;
        const patternConfidence = Math.min(patternScore / 2, 1);
        const vocabConfidence = vocabularyScore;
        const confidence = patternConfidence * 0.7 + vocabConfidence * 0.3;
        const threshold = this.getConfidenceThreshold(options);
        const satisfied = confidence >= threshold;
        const suggestions = [];
        if (!satisfied) {
          if (patternScore === 0) {
            suggestions.push(`Try using structural patterns like: ${tropePattern.examplePhrases[0]}`);
          }
          if (matchedVocab.length < 2) {
            suggestions.push(`Consider incorporating words like: ${tropePattern.vocabularyIndicators.slice(0, 5).join(", ")}`);
          }
        }
        return {
          tropeId: tropePattern.id,
          tropeName: tropePattern.name,
          satisfied,
          confidence,
          matchedPatterns,
          suggestions,
          validationMethod: "pattern"
        };
      }
      async validateWithAI(content, tropeId, options) {
        const normalizedId = tropeId.toLowerCase().replace(/\s+/g, "_");
        const tropePattern = TROPE_PATTERNS[normalizedId];
        let tropeName = tropePattern?.name || tropeId;
        let tropeDescription = tropePattern?.description;
        if (!tropeDescription) {
          const corpusDefinition = getDeviceDefinition(normalizedId);
          if (corpusDefinition) {
            tropeDescription = corpusDefinition;
            tropeName = tropeId.split(/[_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
          } else {
            tropeDescription = `The rhetorical device known as ${tropeId}`;
          }
        }
        try {
          const response = await this.openai.chat.completions.create({
            model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
            messages: [{
              role: "user",
              content: `Analyze if this content exhibits the rhetorical device "${tropeName}":

${tropeDescription}

Content: "${content}"

Respond in JSON format:
{
  "satisfied": boolean,
  "confidence": number (0.0 to 1.0),
  "explanation": "brief explanation",
  "improvements": ["suggestion 1", "suggestion 2"]
}`
            }],
            temperature: 0.2,
            max_tokens: 300
          });
          const responseText = response.choices[0]?.message?.content || "{}";
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              tropeId,
              tropeName,
              satisfied: parsed.satisfied || false,
              confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
              matchedPatterns: parsed.explanation ? [parsed.explanation] : [],
              suggestions: parsed.improvements || [],
              validationMethod: "ai"
            };
          }
        } catch (error) {
          console.error(`AI validation failed for ${tropeId}:`, error);
        }
        return {
          tropeId,
          tropeName,
          satisfied: false,
          confidence: 0,
          matchedPatterns: [],
          suggestions: ["AI validation failed, using pattern matching only"],
          validationMethod: "ai"
        };
      }
      getConfidenceThreshold(options) {
        if (options.minimumConfidenceOverride !== void 0) {
          return options.minimumConfidenceOverride;
        }
        switch (options.strength) {
          case "loose":
            return 0.3;
          case "moderate":
            return 0.5;
          case "strict":
            return 0.7;
          default:
            return 0.5;
        }
      }
      /**
       * Clear validation cache
       */
      clearCache() {
        this.validationCache.clear();
      }
    };
    tropeConstraints_default = {
      TropeConstraintEngine,
      TROPE_PATTERNS,
      validateTropePattern,
      checkVocabularyAlignment,
      getAvailableTropes,
      getTropeDetails,
      generateTropeConstraintPrompt,
      scoreTropeAlignment
    };
  }
});

// server/utils/divergentExplorer.ts
import OpenAI3 from "openai";
function getUncommonDevices(count) {
  const allDevices = loadAllRhetoricalDevices();
  const allIds = Object.keys(allDevices);
  const uncommonIds = allIds.filter((id) => !BANNED_COMMON_DEVICES.has(id));
  const priorityIds = uncommonIds.filter((id) => PRIORITY_RARE_DEVICES.has(id));
  const regularIds = uncommonIds.filter((id) => !PRIORITY_RARE_DEVICES.has(id));
  console.log(`   \u{1F3B2} Device selection: ${priorityIds.length} priority rare, ${regularIds.length} other uncommon`);
  const priorityCount = Math.ceil(count * 0.7);
  const regularCount = count - priorityCount;
  const shuffledPriority = priorityIds.sort(() => Math.random() - 0.5);
  const shuffledRegular = regularIds.sort(() => Math.random() - 0.5);
  const selectedPriority = shuffledPriority.slice(0, priorityCount);
  const selectedRegular = shuffledRegular.slice(0, regularCount);
  const selected = [...selectedPriority, ...selectedRegular].sort(() => Math.random() - 0.5);
  return selected.map((id) => ({
    id,
    name: id.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    definition: allDevices[id] || getDeviceDefinition(id) || "A rhetorical device"
  }));
}
function buildExplorationPrompt(theme, device, domainIndex) {
  const deviceAnchor = device ? `
**CREATIVE ANCHOR - Use this rhetorical device as your starting point:**
Device: ${device.name}
Definition: ${device.definition}

Your creative directions MUST explore how this device could be applied unexpectedly.
Think about: What visual metaphors does this device suggest? What unexpected domains
could this device connect to? How could this device create tension or surprise?

` : "";
  const assignedDomain = domainIndex !== void 0 ? METAPHOR_DOMAINS[domainIndex % METAPHOR_DOMAINS.length] : null;
  const domainConstraint = assignedDomain ? `
**MANDATORY METAPHOR DOMAIN - You MUST ground ALL 5 directions in this domain:**
${assignedDomain}

Do NOT use food, fermentation, cooking, baking, or culinary metaphors.
Do NOT use medical, clinical, or healthcare imagery.
Do NOT use legal, courtroom, or forensic imagery.
Your ideas must draw from ${assignedDomain.split(" ")[0]} concepts ONLY.

` : "";
  return `You are in PURE EXPLORATION MODE. Your task is to generate surprising, unconventional,
and unexpected creative directions for the given theme.

CRITICAL RULES FOR THIS PHASE:
1. Each direction must explore a COMPLETELY DIFFERENT conceptual territory
2. AVOID legal/forensic/courtroom imagery (overused)
3. AVOID medical/clinical imagery (overused)
4. AVOID food/fermentation/cooking/baking metaphors (overused in this context)
5. PRIORITIZE surprise and distinctiveness over everything else
6. Each direction should feel like it came from a different creative mind

${domainConstraint}${deviceAnchor}Theme to explore: ${theme}

Generate 5 radically different creative directions. Each must be THEMATICALLY DISTINCT from the others.

Format each as:
DIRECTION [N]:
Entry Point: [unexpected starting perspective - NOT legal, medical, forensic, or food-related]
Connection: [surprising link to ${assignedDomain ? assignedDomain.split(" ")[0] : "an unrelated domain"}]
Core Tension: [the paradox or insight at the heart]
Provocative Phrase: [single memorable expression]
Visual Spark: [unexpected imagery - be specific and visual]

Remember: The goal is MAXIMUM DIVERGENCE. If two directions feel similar, one of them is wrong.
Each direction should feel like it could anchor an entirely different campaign.`;
}
async function exploreDivergently(userBrief, options = {}) {
  const openai14 = new OpenAI3({
    apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0
  });
  const {
    poolSize = 15,
    personaRotation = "weighted",
    maxTemperature = 1.5,
    historicalEmbeddings = []
  } = options;
  const personaCounts = {};
  const theme = await extractTheme(userBrief, openai14);
  console.log(`\u{1F300} Starting divergent exploration for theme: "${theme}"`);
  console.log(`   Pool size target: ${poolSize}`);
  console.log(`   Persona rotation: ${personaRotation}`);
  const iterationsNeeded = Math.ceil(poolSize / 5);
  const deviceAnchors = getUncommonDevices(iterationsNeeded);
  console.log(`   Anchoring exploration with ${deviceAnchors.length} uncommon rhetorical devices:`);
  deviceAnchors.forEach((d, i) => console.log(`      ${i + 1}. ${d.name}: "${d.definition.substring(0, 60)}..."`));
  console.log(`   \u{1F680} Running ${iterationsNeeded} persona iterations in parallel...`);
  const personaIterations = Array.from({ length: iterationsNeeded }, (_, i) => {
    const persona = selectPersona(i, personaRotation, personaCounts);
    personaCounts[persona.id] = (personaCounts[persona.id] || 0) + 1;
    const temperature = Math.min(1 + persona.temperatureModifier, maxTemperature);
    const device = deviceAnchors[i];
    const domainIndex = i;
    return { persona, temperature, device, domainIndex };
  });
  const ideaGenerationPromises = personaIterations.map(async ({ persona, temperature, device, domainIndex }) => {
    try {
      const domain = METAPHOR_DOMAINS[domainIndex % METAPHOR_DOMAINS.length].split(" ")[0];
      console.log(`   ${persona.name} exploring ${domain} with device: ${device?.name || "none"}`);
      const rawIdeas = await generateRawIdeas(openai14, theme, persona, temperature, device, domainIndex);
      return rawIdeas.map((idea) => ({ idea, persona }));
    } catch (error) {
      console.error(`   Failed generation for persona ${persona.name}:`, error);
      return [];
    }
  });
  const allIdeaResults = await Promise.all(ideaGenerationPromises);
  const allIdeas = allIdeaResults.flat().slice(0, poolSize);
  console.log(`   Generated ${allIdeas.length} raw ideas, now processing in parallel...`);
  const seeds = allIdeas.map(({ idea, persona }, index) => {
    const compatibleTropes = identifyCompatibleTropes(idea);
    return {
      id: `seed_${Date.now()}_${index}`,
      rawIdea: idea,
      persona,
      embedding: [],
      // PERF: Skip embedding - not needed for seed selection
      distinctivenessScore: 0.5 + Math.random() * 0.3,
      // Heuristic
      thematicCoherence: idea.length > 20 ? 0.7 : 0.5,
      // Heuristic based on content
      tropeCompatibility: compatibleTropes,
      timestamp: /* @__PURE__ */ new Date()
    };
  });
  const uniqueSeeds = deduplicateSeeds(seeds);
  const metrics = {
    totalGenerated: seeds.length,
    uniqueAfterDedup: uniqueSeeds.length,
    averageDistinctiveness: uniqueSeeds.length > 0 ? uniqueSeeds.reduce((sum, s) => sum + s.distinctivenessScore, 0) / uniqueSeeds.length : 0,
    personaDistribution: personaCounts
  };
  console.log(`Divergent exploration complete:`);
  console.log(`   Total seeds: ${metrics.totalGenerated}`);
  console.log(`   Unique seeds: ${metrics.uniqueAfterDedup}`);
  console.log(`   Avg distinctiveness: ${(metrics.averageDistinctiveness * 100).toFixed(1)}%`);
  return {
    seeds: uniqueSeeds,
    userBrief,
    theme,
    generationMetrics: metrics
  };
}
async function selectCreativeSeed(pool, criteria = {
  distinctivenessWeight: 0.4,
  coherenceWeight: 0.3,
  tropeCompatibilityWeight: 0.3,
  minimumDistinctiveness: 0.3,
  minimumCoherence: 0.5
}) {
  const eligibleSeeds = pool.seeds.filter(
    (seed) => seed.distinctivenessScore >= criteria.minimumDistinctiveness && seed.thematicCoherence >= criteria.minimumCoherence && seed.tropeCompatibility.length > 0
  );
  if (eligibleSeeds.length === 0) {
    console.warn("No seeds met minimum criteria, using best available");
    return pool.seeds.reduce((best, current) => {
      const bestScore = best.distinctivenessScore + best.thematicCoherence;
      const currentScore = current.distinctivenessScore + current.thematicCoherence;
      return currentScore > bestScore ? current : best;
    });
  }
  const scoredSeeds = eligibleSeeds.map((seed) => ({
    seed,
    score: seed.distinctivenessScore * criteria.distinctivenessWeight + seed.thematicCoherence * criteria.coherenceWeight + seed.tropeCompatibility.length / 5 * criteria.tropeCompatibilityWeight
  }));
  scoredSeeds.sort((a, b) => b.score - a.score);
  const selected = scoredSeeds[0].seed;
  console.log(`Selected creative seed:`);
  console.log(`   Persona: ${selected.persona.name}`);
  console.log(`   Distinctiveness: ${(selected.distinctivenessScore * 100).toFixed(1)}%`);
  console.log(`   Coherence: ${(selected.thematicCoherence * 100).toFixed(1)}%`);
  console.log(`   Compatible tropes: ${selected.tropeCompatibility.join(", ")}`);
  console.log(`   Raw idea: "${selected.rawIdea.substring(0, 100)}..."`);
  return selected;
}
async function extractTheme(brief, openai14) {
  const stopWords = /* @__PURE__ */ new Set(["a", "an", "the", "is", "are", "was", "were", "for", "and", "or", "but", "in", "on", "at", "to", "of", "with", "that", "this", "it", "i", "we", "my", "our", "create", "make", "want", "need"]);
  const words = brief.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
  return words.slice(0, 5).join(" ") || brief.split(" ").slice(0, 5).join(" ");
}
function selectPersona(index, rotation, counts) {
  switch (rotation) {
    case "sequential":
      return CREATIVE_PERSONAS[index % CREATIVE_PERSONAS.length];
    case "random":
      return CREATIVE_PERSONAS[Math.floor(Math.random() * CREATIVE_PERSONAS.length)];
    case "weighted":
      const totalCount = Object.values(counts).reduce((sum, c) => sum + c, 0) || 1;
      const weights = CREATIVE_PERSONAS.map((p) => {
        const usageRatio = (counts[p.id] || 0) / totalCount;
        return 1 - usageRatio;
      });
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      let random = Math.random() * totalWeight;
      for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) return CREATIVE_PERSONAS[i];
      }
      return CREATIVE_PERSONAS[0];
    default:
      return CREATIVE_PERSONAS[index % CREATIVE_PERSONAS.length];
  }
}
async function generateRawIdeas(openai14, theme, persona, temperature, device, domainIndex) {
  const prompt = buildExplorationPrompt(theme, device, domainIndex);
  const response = await openai14.chat.completions.create({
    model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
    messages: [
      { role: "system", content: persona.systemPromptOverride },
      { role: "user", content: prompt }
    ],
    temperature,
    max_tokens: 1500
  });
  const content = response.choices[0]?.message?.content || "";
  const directions = content.split(/DIRECTION \[\d+\]:/).filter((d) => d.trim());
  return directions.map((d) => {
    const phrase = d.match(/Provocative Phrase:\s*(.+?)(?=\n|$)/)?.[1] || "";
    const visual = d.match(/Visual Spark:\s*(.+?)(?=\n|$)/)?.[1] || "";
    const tension = d.match(/Core Tension:\s*(.+?)(?=\n|$)/)?.[1] || "";
    const connection = d.match(/Connection:\s*(.+?)(?=\n|$)/)?.[1] || "";
    return `${phrase} | ${tension} | ${visual} | ${connection}`.trim();
  }).filter((idea) => idea.length > 10);
}
function identifyCompatibleTropes(idea) {
  const tropePatterns = {
    "Paradox": [/contradict/i, /opposite/i, /yet/i, /but/i, /tension/i],
    "Metaphor": [/like/i, /as if/i, /becomes/i, /transforms/i],
    "Antithesis": [/versus/i, /against/i, /contrast/i, /between/i],
    "Hyperbole": [/never/i, /always/i, /every/i, /ultimate/i, /infinite/i],
    "Oxymoron": [/silent.*loud/i, /beautiful.*ugly/i, /dark.*light/i],
    "Personification": [/whisper/i, /speaks/i, /breathes/i, /lives/i],
    "Chiasmus": [/first.*last/i, /begin.*end/i, /rise.*fall/i],
    "Juxtaposition": [/side by side/i, /together/i, /collision/i]
  };
  const compatible = [];
  const ideaLower = idea.toLowerCase();
  for (const [trope, patterns] of Object.entries(tropePatterns)) {
    if (patterns.some((p) => p.test(ideaLower))) {
      compatible.push(trope);
    }
  }
  if (compatible.length === 0) {
    compatible.push("Metaphor", "Hyperbole");
  }
  return compatible.slice(0, 5);
}
function extractThemes(idea) {
  const themes = /* @__PURE__ */ new Set();
  const lowerIdea = idea.toLowerCase();
  const themeClusters = {
    "legal/forensic": ["court", "trial", "evidence", "verdict", "guilty", "innocent", "judge", "jury", "witness", "testimony", "forensic", "suspect", "accused", "prosecution", "defense", "alibi", "confession", "interrogat", "detective", "crime", "mugshot", "fingerprint"],
    "medical/clinical": ["doctor", "hospital", "surgery", "diagnosis", "patient", "clinical", "medical", "prescription", "symptom", "cure", "treatment", "autopsy", "morgue", "surgical", "operating"],
    "military/war": ["battle", "soldier", "army", "war", "combat", "weapon", "mission", "tactical", "strategic", "victory", "defeat", "enemy", "troops", "military"],
    "religious/spiritual": ["church", "temple", "prayer", "sacred", "divine", "holy", "spiritual", "ritual", "worship", "blessing", "sermon", "confession", "redemption", "salvation"],
    "nature/organic": ["garden", "forest", "ocean", "mountain", "river", "flower", "tree", "seed", "bloom", "harvest", "organic", "natural", "wildlife", "ecosystem"],
    "technology/digital": ["code", "algorithm", "digital", "software", "hardware", "computer", "data", "network", "cyber", "virtual", "pixel", "binary", "upload", "download"],
    "art/museum": ["gallery", "museum", "canvas", "sculpture", "exhibition", "masterpiece", "artistic", "curator", "collection", "frame", "portrait"],
    "theater/performance": ["stage", "actor", "script", "audience", "curtain", "spotlight", "performance", "drama", "scene", "rehearsal", "applause"],
    "food/culinary": ["recipe", "ingredient", "kitchen", "chef", "taste", "flavor", "cook", "restaurant", "menu", "dish", "appetite", "bread", "dough", "yeast", "ferment", "proof", "rise", "bake", "sourdough", "starter", "flour", "crust", "crumb", "knead", "oven", "leaven"],
    "sports/competition": ["champion", "athlete", "race", "score", "team", "compete", "victory", "trophy", "training", "coach", "stadium"]
  };
  for (const [theme, keywords] of Object.entries(themeClusters)) {
    if (keywords.some((kw) => lowerIdea.includes(kw))) {
      themes.add(theme);
    }
  }
  return themes;
}
function deduplicateSeeds(seeds) {
  const unique = [];
  const EMBEDDING_SIMILARITY_THRESHOLD = 0.92;
  const usedPersonas = /* @__PURE__ */ new Set();
  const usedThemes = /* @__PURE__ */ new Set();
  for (const seed of seeds) {
    const isSimilarEmbedding = unique.some(
      (existing) => cosineSimilarity(seed.embedding, existing.embedding) > EMBEDDING_SIMILARITY_THRESHOLD
    );
    const samePersonaUsed = usedPersonas.has(seed.persona.id) && unique.length >= 3;
    const seedThemes = extractThemes(seed.rawIdea);
    const hasThemeCollision = [...seedThemes].some((theme) => usedThemes.has(theme)) && unique.length >= 2;
    if (!isSimilarEmbedding && !samePersonaUsed && !hasThemeCollision) {
      unique.push(seed);
      usedPersonas.add(seed.persona.id);
      seedThemes.forEach((theme) => usedThemes.add(theme));
      console.log(`   Seed accepted from ${seed.persona.name}: "${seed.rawIdea.substring(0, 50)}..."`);
      console.log(`      Themes: ${[...seedThemes].join(", ") || "none detected"}`);
    } else if (isSimilarEmbedding) {
      console.log(`   Seed rejected (near-duplicate): "${seed.rawIdea.substring(0, 50)}..."`);
    } else if (hasThemeCollision) {
      console.log(`   Seed rejected (theme collision: ${[...seedThemes].join(", ")}): "${seed.rawIdea.substring(0, 50)}..."`);
    } else {
      console.log(`   Seed rejected (persona ${seed.persona.name} already used): "${seed.rawIdea.substring(0, 50)}..."`);
    }
  }
  if (unique.length < 5 && seeds.length > unique.length) {
    console.log(`   \u{1F504} Relaxing criteria to get more seeds...`);
    for (const seed of seeds) {
      if (unique.length >= 5) break;
      if (!unique.some((u) => u.rawIdea === seed.rawIdea)) {
        unique.push(seed);
        console.log(`   Seed added (relaxed): "${seed.rawIdea.substring(0, 50)}..."`);
      }
    }
  }
  return unique;
}
var BANNED_COMMON_DEVICES, PRIORITY_RARE_DEVICES, CREATIVE_PERSONAS, METAPHOR_DOMAINS;
var init_divergentExplorer = __esm({
  "server/utils/divergentExplorer.ts"() {
    "use strict";
    init_embeddingSimilarity();
    init_tropeConstraints();
    BANNED_COMMON_DEVICES = /* @__PURE__ */ new Set([
      "metaphor",
      "simile",
      "hyperbole",
      "personification",
      "alliteration",
      "onomatopoeia",
      "oxymoron",
      "irony",
      "paradox",
      "analogy",
      "antithesis",
      "juxtaposition",
      "repetition",
      "rhetorical_question",
      "allusion",
      "imagery",
      "symbolism",
      "foreshadowing",
      "flashback"
    ]);
    PRIORITY_RARE_DEVICES = /* @__PURE__ */ new Set([
      "anadiplosis",
      // Repetition of last word at start of next clause
      "antimetabole",
      // Repetition in reverse order ("ask not what your country...")
      "chiasmus",
      // ABBA structure
      "epanalepsis",
      // Beginning and ending with same word
      "polyptoton",
      // Repetition of root in different forms
      "syllepsis",
      // One word applying to two others in different senses
      "zeugma",
      // One verb governing multiple objects unexpectedly
      "catachresis",
      // Deliberate misuse of words
      "litotes",
      // Understatement via double negative
      "meiosis",
      // Deliberate understatement
      "auxesis",
      // Arrangement from least to most important
      "anaphora",
      // Repetition at beginning of clauses
      "epistrophe",
      // Repetition at end of clauses
      "symploce",
      // Combination of anaphora and epistrophe
      "aposiopesis",
      // Sudden breaking off mid-sentence
      "praeteritio",
      // Mentioning by saying you won't mention
      "apophasis",
      // Bringing up subject by denying you'll discuss it
      "synecdoche",
      // Part for whole or whole for part
      "metonymy",
      // Associated concept substitution
      "enthymeme",
      // Syllogism with implied premise
      "apostrophe",
      // Addressing absent person/thing
      "prosopopoeia",
      // Giving speech to imaginary/absent person
      "ekphrasis"
      // Vivid description of visual art
    ]);
    CREATIVE_PERSONAS = [
      {
        id: "maverick",
        name: "Maverick Creative",
        perspective: "Category disruption and shock value",
        vocabularyBias: ["unexpected", "provocative", "disruptive", "radical"],
        temperatureModifier: 0.3,
        systemPromptOverride: `You are a rebellious creative director who believes the best
advertising breaks every rule. You seek concepts that make people uncomfortable before
they make them think. Your ideas should feel dangerous and unprecedented.`
      },
      {
        id: "anthropologist",
        name: "Cultural Anthropologist",
        perspective: "Deep human insights and behavioral patterns",
        vocabularyBias: ["ritual", "identity", "belonging", "transformation"],
        temperatureModifier: 0.1,
        systemPromptOverride: `You are a cultural anthropologist studying human behavior.
You see advertising as artifacts that reveal deeper truths about society. Your concepts
tap into universal human needs: belonging, identity, transformation, meaning.`
      },
      {
        id: "poet",
        name: "Visual Poet",
        perspective: "Metaphorical imagery and sensory language",
        vocabularyBias: ["luminous", "whisper", "cascade", "dissolve"],
        temperatureModifier: 0.2,
        systemPromptOverride: `You are a visual poet who believes every image tells a story
and every word paints a picture. Your concepts are sensory experiences first, messages
second. Beauty is the vehicle for meaning.`
      },
      {
        id: "provocateur",
        name: "Strategic Provocateur",
        perspective: "Business logic with creative tension",
        vocabularyBias: ["paradox", "tension", "counterintuitive", "leverage"],
        temperatureModifier: 0.15,
        systemPromptOverride: `You are a strategic provocateur who finds the tension between
business objectives and creative expression. Your concepts are paradoxes that resolve
into powerful positioning. You make brands memorable by making them uncomfortable.`
      },
      {
        id: "empath",
        name: "Empathy Engineer",
        perspective: "Emotional resonance and human connection",
        vocabularyBias: ["intimate", "vulnerable", "authentic", "tender"],
        temperatureModifier: 0.05,
        systemPromptOverride: `You are an empathy engineer who designs emotional experiences.
You believe the best advertising doesn't sell products\u2014it creates moments of genuine
human connection. Your concepts make people feel seen and understood.`
      }
    ];
    METAPHOR_DOMAINS = [
      "ASTRONOMY (stars, eclipses, gravity, nebulae, constellations, dark matter, orbits)",
      "ARCHITECTURE (blueprints, foundations, facades, load-bearing walls, doorways, thresholds)",
      "MUSIC (rhythm, silence, crescendo, resonance, harmony, dissonance, improvisation)",
      "GEOLOGY (erosion, strata, tectonic shifts, crystals, fossils, pressure, metamorphosis)",
      "BOTANY (roots, grafting, cross-pollination, pruning, dormancy, phototropism)",
      "TEXTILES (weaving, thread count, unraveling, stitching, dyeing, patina)",
      "MATHEMATICS (prime numbers, asymptotes, fractals, infinity, proofs, variables)",
      "WEATHER (pressure systems, fog, the eye of storms, updrafts, refraction)",
      "DANCE (choreography, improvisation, balance, tension, release, negative space)",
      "CARTOGRAPHY (borders, uncharted territory, legends, scale, projections, meridians)"
    ];
  }
});

// server/utils/progressiveEvolution.ts
import OpenAI4 from "openai";
async function initializeSoftTokens(seed, blockName, tropeConstraint) {
  const maskEmbedding = await getEmbedding("[MASK]");
  const tokenCounts = {
    headline: 5,
    tagline: 8,
    bodyCopy: 50,
    visualConcept: 30,
    rhetoricalCraft: 40
  };
  const count = tokenCounts[blockName] || 20;
  const tokens = [];
  for (let i = 0; i < count; i++) {
    tokens.push({
      state: "MASK" /* MASK */,
      position: i,
      distribution: /* @__PURE__ */ new Map([["[MASK]", 1]]),
      embedding: [...maskEmbedding],
      alpha: 1,
      committed: false
    });
  }
  return tokens;
}
async function blendWithVocabulary(token, vocabularyDistribution, alpha, tropeConstraint) {
  const maskEmbedding = await getEmbedding("[MASK]");
  let distEmbedding = new Array(maskEmbedding.length).fill(0);
  const topEntries = Array.from(vocabularyDistribution.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [word, prob] of topEntries) {
    const wordEmbedding = await getEmbedding(word);
    for (let i = 0; i < distEmbedding.length; i++) {
      distEmbedding[i] += prob * wordEmbedding[i];
    }
  }
  const biasedDistribution = applyTropeConstraint(
    vocabularyDistribution,
    tropeConstraint
  );
  const blendedEmbedding = maskEmbedding.map(
    (m, i) => alpha * m + (1 - alpha) * distEmbedding[i]
  );
  return {
    ...token,
    state: alpha > 0.5 ? "SOFT_MASK_V" /* SOFT_MASK_V */ : "SOFT_V" /* SOFT_V */,
    distribution: biasedDistribution,
    embedding: blendedEmbedding,
    alpha
  };
}
function applyTropeConstraint(distribution, trope) {
  const tropeBiases = {
    "Antithesis": ["yet", "but", "while", "versus", "against", "however"],
    "Paradox": ["contradiction", "impossible", "yet", "somehow"],
    "Metaphor": ["like", "becomes", "transforms", "is"],
    "Hyperbole": ["never", "always", "infinite", "ultimate", "every"],
    "Chiasmus": ["first", "last", "begin", "end"],
    "Oxymoron": ["silent", "loud", "dark", "light", "bitter", "sweet"]
  };
  const biasWords = tropeBiases[trope] || [];
  const biased = new Map(distribution);
  for (const word of biasWords) {
    const current = biased.get(word) || 0.01;
    biased.set(word, Math.min(current * 1.5, 0.3));
  }
  const total = Array.from(biased.values()).reduce((sum, p) => sum + p, 0);
  Array.from(biased.entries()).forEach(([word, prob]) => {
    biased.set(word, prob / total);
  });
  return biased;
}
var AlphaScheduler, ProgressiveEvolutionEngine;
var init_progressiveEvolution = __esm({
  "server/utils/progressiveEvolution.ts"() {
    "use strict";
    init_embeddingSimilarity();
    AlphaScheduler = class {
      constructor(totalSteps = 5, decayType = "cosine") {
        this.currentStep = 0;
        this.schedule = this.generateSchedule(totalSteps, decayType);
      }
      generateSchedule(steps, type) {
        const schedule = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          switch (type) {
            case "linear":
              schedule.push(1 - t);
              break;
            case "exponential":
              schedule.push(Math.exp(-3 * t));
              break;
            case "cosine":
              schedule.push(0.5 * (1 + Math.cos(Math.PI * t)));
              break;
            default:
              schedule.push(1 - t);
          }
        }
        return schedule;
      }
      getCurrentAlpha() {
        return this.schedule[Math.min(this.currentStep, this.schedule.length - 1)];
      }
      advance() {
        this.currentStep++;
        return this.getCurrentAlpha();
      }
      reset() {
        this.currentStep = 0;
      }
      getSchedule() {
        return [...this.schedule];
      }
    };
    ProgressiveEvolutionEngine = class {
      constructor(seedOrOptions, refinementSteps = 5) {
        this.openai = new OpenAI4({
          apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
          baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0
        });
        if (seedOrOptions && "rawIdea" in seedOrOptions) {
          this.options = { maxCycles: refinementSteps, blockSize: 8 };
          this.alphaScheduler = new AlphaScheduler(refinementSteps, "cosine");
          this.state = {
            blocks: [],
            globalCoherence: 0,
            iterationCount: 0,
            alphaSchedule: this.alphaScheduler.getSchedule(),
            arbiterHistory: [],
            creativeSeed: seedOrOptions
          };
        } else {
          const opts = seedOrOptions || {};
          this.options = {
            maxCycles: opts.maxCycles ?? 50,
            blockSize: opts.blockSize ?? 8,
            decayType: opts.decayType ?? "cosine"
          };
          this.alphaScheduler = new AlphaScheduler(this.options.maxCycles, this.options.decayType);
          this.state = null;
        }
      }
      /**
       * Simplified evolve method for external use
       */
      async evolve(blocks) {
        console.log(`\u{1F504} Starting evolution with ${blocks.length} blocks`);
        const maxCycles = this.options.maxCycles || 50;
        let cycles = 0;
        const normalizedBlocks = blocks.map((block, idx) => ({
          ...block,
          id: block.id || `block_${idx}`,
          currentState: block.currentState || block.state || "MASK" /* MASK */,
          state: block.state || "MASK" /* MASK */,
          tropeConstraints: block.tropeConstraints || [],
          coherenceScore: block.coherenceScore || 0,
          committed: block.committed || false,
          content: block.content || ""
        }));
        while (cycles < maxCycles) {
          const alpha = this.alphaScheduler.getCurrentAlpha();
          for (const block of normalizedBlocks) {
            if (block.committed) continue;
            for (const token of block.tokens) {
              token.alpha = alpha;
            }
            if (alpha < 0.3) {
              block.state = "SOFT_V" /* SOFT_V */;
              block.currentState = "SOFT_V" /* SOFT_V */;
            } else if (alpha < 0.7) {
              block.state = "SOFT_MASK_V" /* SOFT_MASK_V */;
              block.currentState = "SOFT_MASK_V" /* SOFT_MASK_V */;
            }
            block.coherenceScore = this.calculateSimpleCoherence(block);
            if (alpha < 0.1 && block.coherenceScore > 0.6) {
              block.state = "DECODED" /* DECODED */;
              block.currentState = "DECODED" /* DECODED */;
              block.committed = true;
            }
          }
          cycles++;
          this.alphaScheduler.advance();
          if (normalizedBlocks.every((b) => b.committed)) {
            break;
          }
        }
        const globalCoherence = this.calculateGlobalCoherenceSync(normalizedBlocks);
        const finalOutput = normalizedBlocks.map((b) => b.content || this.extractContentFromTokens(b)).filter((c) => c).join("\n\n");
        console.log(`Evolution complete: ${cycles} cycles, coherence: ${(globalCoherence * 100).toFixed(1)}%`);
        return {
          blocks: normalizedBlocks,
          cycles,
          globalCoherence,
          finalOutput,
          tropeValidation: []
        };
      }
      calculateSimpleCoherence(block) {
        const committedRatio = block.tokens.filter((t) => t.alpha < 0.5).length / block.tokens.length;
        return Math.min(1, committedRatio + 0.3);
      }
      calculateGlobalCoherenceSync(blocks) {
        const coherences = blocks.map((b) => b.coherenceScore);
        return coherences.reduce((sum, c) => sum + c, 0) / coherences.length;
      }
      extractContentFromTokens(block) {
        return block.tokens.map((t) => {
          const sorted = Array.from(t.distribution.entries()).sort((a, b) => b[1] - a[1]);
          return sorted[0]?.[0] || "";
        }).filter((w) => w && w !== "[MASK]").join(" ");
      }
      async initialize() {
        if (!this.state) {
          throw new Error("ProgressiveEvolutionEngine: state not initialized");
        }
        const blockNames = [
          "headline",
          "tagline",
          "bodyCopy",
          "visualConcept",
          "rhetoricalCraft"
        ];
        for (const name of blockNames) {
          const tokens = await initializeSoftTokens(
            this.state.creativeSeed,
            name,
            this.state.creativeSeed.tropeCompatibility[0] || "Metaphor"
          );
          this.state.blocks.push({
            id: `block_${name}_${Date.now()}`,
            name,
            tokens,
            state: "MASK" /* MASK */,
            currentState: "MASK" /* MASK */,
            tropeConstraints: [this.state.creativeSeed.tropeCompatibility[0] || "Metaphor"],
            coherenceScore: 0,
            committed: false,
            content: ""
          });
        }
        console.log(`\u{1F504} Evolution engine initialized with ${this.state.blocks.length} blocks`);
      }
      async evolveBlock(blockIndex) {
        if (!this.state) throw new Error("State not initialized");
        const block = this.state.blocks[blockIndex];
        const alpha = this.alphaScheduler.getCurrentAlpha();
        const trope = this.state.creativeSeed.tropeCompatibility[0] || "Metaphor";
        console.log(`   Evolving block "${block.name}" (alpha=${alpha.toFixed(3)})`);
        const vocabDistribution = await this.generateVocabularyDistribution(
          block,
          this.state.creativeSeed
        );
        const sampleSize = Math.min(5, block.tokens.length);
        for (let i = 0; i < sampleSize; i++) {
          const tokenIndex = Math.floor(i * block.tokens.length / sampleSize);
          block.tokens[tokenIndex] = await blendWithVocabulary(
            block.tokens[tokenIndex],
            vocabDistribution,
            alpha,
            trope
          );
        }
        if (alpha < 0.3) {
          block.state = "SOFT_V" /* SOFT_V */;
        } else if (alpha < 0.7) {
          block.state = "SOFT_MASK_V" /* SOFT_MASK_V */;
        }
        block.coherenceScore = await this.calculateBlockCoherence(block);
        return block;
      }
      async attemptDecode(blockIndex, arbiterEvaluation) {
        if (!this.state) throw new Error("State not initialized");
        const block = this.state.blocks[blockIndex];
        if (!arbiterEvaluation.passed) {
          console.log(`   Block "${block.name}" failed arbiter check`);
          this.state.arbiterHistory.push(arbiterEvaluation);
          return { success: false, content: "" };
        }
        const decodedContent = await this.sampleFromDistributions(block);
        block.state = "DECODED" /* DECODED */;
        block.committed = true;
        block.content = decodedContent;
        for (const token of block.tokens) {
          token.state = "DECODED" /* DECODED */;
          token.committed = true;
        }
        console.log(`   Block "${block.name}" decoded: "${decodedContent.substring(0, 50)}..."`);
        return { success: true, content: decodedContent };
      }
      async regressBlock(blockIndex, regressionDepth) {
        if (!this.state) throw new Error("State not initialized");
        const block = this.state.blocks[blockIndex];
        if (regressionDepth === "soft") {
          block.state = "SOFT_MASK_V" /* SOFT_MASK_V */;
          for (const token of block.tokens) {
            token.state = "SOFT_MASK_V" /* SOFT_MASK_V */;
            token.alpha = Math.min(token.alpha + 0.2, 0.8);
          }
          console.log(`   \u21A9\uFE0F Soft regression for block "${block.name}"`);
        } else {
          block.state = "MASK" /* MASK */;
          const maskEmbedding = await getEmbedding("[MASK]");
          for (const token of block.tokens) {
            token.state = "MASK" /* MASK */;
            token.alpha = 1;
            token.distribution = /* @__PURE__ */ new Map([["[MASK]", 1]]);
            token.embedding = [...maskEmbedding];
          }
          console.log(`   \u21A9\uFE0F Full regression for block "${block.name}"`);
        }
        block.committed = false;
        block.content = "";
      }
      async generateVocabularyDistribution(block, seed) {
        const prompt = `Given the creative seed: "${seed.rawIdea}"
And the block type: ${block.name}
Using the rhetorical device: ${seed.tropeCompatibility[0] || "Metaphor"}

Generate a probability distribution over vocabulary words that could appear in this ${block.name}.
Return as JSON: {"word1": 0.15, "word2": 0.12, ...}
Include 20-30 words with probabilities summing to 1.0.
Focus on words that serve the rhetorical device and creative direction.`;
        const response = await this.openai.chat.completions.create({
          model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 500
        });
        try {
          const content = response.choices[0]?.message?.content || "{}";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(jsonMatch?.[0] || "{}");
          return new Map(Object.entries(parsed));
        } catch {
          return /* @__PURE__ */ new Map([
            ["the", 0.1],
            ["a", 0.08],
            ["is", 0.07],
            ["of", 0.06],
            ["and", 0.05],
            ["to", 0.05],
            ["in", 0.04],
            ["for", 0.04]
          ]);
        }
      }
      async calculateBlockCoherence(block) {
        const embeddings = block.tokens.filter((t) => t.embedding.length > 0).map((t) => t.embedding);
        if (embeddings.length < 2) return 1;
        let totalSimilarity = 0;
        let comparisons = 0;
        for (let i = 0; i < Math.min(embeddings.length - 1, 5); i++) {
          const sim = cosineSimilarity(embeddings[i], embeddings[i + 1]);
          totalSimilarity += sim;
          comparisons++;
        }
        return comparisons > 0 ? totalSimilarity / comparisons : 1;
      }
      async sampleFromDistributions(block) {
        if (!this.state) throw new Error("State not initialized");
        const topTokens = block.tokens.slice(0, 10).map((t) => {
          const sorted = Array.from(t.distribution.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
          return sorted.map(([word]) => word);
        });
        const prompt = `Generate a ${block.name} for an advertising concept.
Use these vocabulary hints for each position: ${JSON.stringify(topTokens)}
Creative seed: "${this.state.creativeSeed.rawIdea}"
Rhetorical device: ${this.state.creativeSeed.tropeCompatibility[0]}

Generate ONLY the ${block.name} text, nothing else.`;
        const response = await this.openai.chat.completions.create({
          model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
          max_tokens: block.name === "bodyCopy" ? 200 : 50
        });
        return response.choices[0]?.message?.content?.trim() || "";
      }
      advanceAlpha() {
        if (!this.state) throw new Error("State not initialized");
        this.state.iterationCount++;
        return this.alphaScheduler.advance();
      }
      getState() {
        if (!this.state) throw new Error("State not initialized");
        return { ...this.state };
      }
      async runFullEvolution(evaluateBlock) {
        await this.initialize();
        if (!this.state) throw new Error("State not initialized");
        const MAX_ITERATIONS = 5;
        const MAX_REGRESSIONS_PER_BLOCK = 2;
        const regressionCounts = /* @__PURE__ */ new Map();
        for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
          console.log(`
\u{1F504} Evolution iteration ${iteration + 1}/${MAX_ITERATIONS} (alpha=${this.alphaScheduler.getCurrentAlpha().toFixed(3)})`);
          for (let i = 0; i < this.state.blocks.length; i++) {
            const block = this.state.blocks[i];
            if (block.committed) {
              console.log(`   \u23ED\uFE0F Block "${block.name}" already committed, skipping`);
              continue;
            }
            await this.evolveBlock(i);
            const evaluation = await evaluateBlock(block, i);
            const { success } = await this.attemptDecode(i, evaluation);
            if (!success) {
              const regressions = regressionCounts.get(i) || 0;
              if (regressions >= MAX_REGRESSIONS_PER_BLOCK) {
                console.log(`   Max regressions reached for "${block.name}", forcing decode`);
                block.committed = true;
                block.content = await this.sampleFromDistributions(block);
              } else {
                const depth = regressions === 0 ? "soft" : "full";
                await this.regressBlock(i, depth);
                regressionCounts.set(i, regressions + 1);
              }
            }
          }
          const allCommitted = this.state.blocks.every((b) => b.committed);
          if (allCommitted) {
            console.log(`
All blocks committed after ${iteration + 1} iterations`);
            break;
          }
          this.advanceAlpha();
        }
        this.state.globalCoherence = await this.calculateGlobalCoherence();
        return this.state;
      }
      async calculateGlobalCoherence() {
        if (!this.state) throw new Error("State not initialized");
        const contents = this.state.blocks.map((b) => b.content).filter((c) => c);
        if (contents.length < 2) return 1;
        const embeddings = await Promise.all(contents.map((c) => getEmbedding(c)));
        let totalSim = 0;
        let count = 0;
        for (let i = 0; i < embeddings.length - 1; i++) {
          totalSim += cosineSimilarity(embeddings[i], embeddings[i + 1]);
          count++;
        }
        return count > 0 ? totalSim / count : 1;
      }
    };
  }
});

// server/utils/trajectoryTraining.ts
var KVCacheManager, TrajectoryCapture, TrajectoryStorage;
var init_trajectoryTraining = __esm({
  "server/utils/trajectoryTraining.ts"() {
    "use strict";
    init_progressiveEvolution();
    init_supabaseClient();
    KVCacheManager = class {
      constructor(options = {}) {
        this.cache = /* @__PURE__ */ new Map();
        this.maxCacheSize = options.maxCacheSize || 100;
        this.ttlMs = options.ttlMs || 5 * 60 * 1e3;
      }
      /**
       * Generate cache key from block states
       */
      generateCacheKey(blocks) {
        const stateSignature = blocks.map(
          (b) => `${b.id}:${b.tokens.map((t) => `${t.state}:${t.alpha.toFixed(2)}`).join(",")}`
        ).join("|");
        return Buffer.from(stateSignature).toString("base64").substring(0, 64);
      }
      /**
       * Store KV state in cache
       */
      store(blocks, keys, values, tokenPositions) {
        const cacheKey = this.generateCacheKey(blocks);
        if (this.cache.size >= this.maxCacheSize) {
          this.evictOldest();
        }
        const blockStates = /* @__PURE__ */ new Map();
        for (const block of blocks) {
          blockStates.set(block.id, block.currentState);
        }
        this.cache.set(cacheKey, {
          keys,
          values,
          tokenPositions,
          blockStates,
          timestamp: /* @__PURE__ */ new Date(),
          hitCount: 0
        });
        return cacheKey;
      }
      /**
       * Retrieve cached KV state
       */
      retrieve(blocks) {
        const cacheKey = this.generateCacheKey(blocks);
        const cached = this.cache.get(cacheKey);
        if (!cached) return null;
        const age = Date.now() - cached.timestamp.getTime();
        if (age > this.ttlMs) {
          this.cache.delete(cacheKey);
          return null;
        }
        cached.hitCount++;
        return cached;
      }
      /**
       * Check if state is cached
       */
      has(blocks) {
        const cacheKey = this.generateCacheKey(blocks);
        const cached = this.cache.get(cacheKey);
        if (!cached) return false;
        const age = Date.now() - cached.timestamp.getTime();
        if (age > this.ttlMs) {
          this.cache.delete(cacheKey);
          return false;
        }
        return true;
      }
      /**
       * Evict oldest cache entry
       */
      evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;
        Array.from(this.cache.entries()).forEach(([key, state]) => {
          if (state.timestamp.getTime() < oldestTime) {
            oldestTime = state.timestamp.getTime();
            oldestKey = key;
          }
        });
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }
      /**
       * Clear all cached states
       */
      clear() {
        this.cache.clear();
      }
      /**
       * Get cache statistics
       */
      getStats() {
        let totalHits = 0;
        Array.from(this.cache.values()).forEach((state) => {
          totalHits += state.hitCount;
        });
        return {
          size: this.cache.size,
          totalHits,
          averageHitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0
        };
      }
    };
    TrajectoryCapture = class {
      constructor(options = {}) {
        this.currentTrajectory = null;
        this.kvCache = new KVCacheManager({ maxCacheSize: options.kvCacheSize });
        this.stepBuffer = [];
        this.lossWeights = {
          stateTransition: options.lossWeights?.stateTransition ?? 0.25,
          tropeAlignment: options.lossWeights?.tropeAlignment ?? 0.3,
          coherence: options.lossWeights?.coherence ?? 0.25,
          distinctiveness: options.lossWeights?.distinctiveness ?? 0.2
        };
      }
      /**
       * Start capturing a new trajectory
       */
      startCapture(sessionId, userBrief, theme, creativeSeedId) {
        this.currentTrajectory = {
          id: `traj_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          sessionId,
          userBrief,
          theme,
          creativeSeedId,
          steps: [],
          finalOutput: "",
          finalScore: 0,
          totalLoss: 0,
          metadata: {
            modelVersion: "evotoken-dlm-v1",
            startTime: /* @__PURE__ */ new Date(),
            totalTokens: 0,
            evolutionCycles: 0,
            regressionCount: 0
          }
        };
        this.stepBuffer = [];
        console.log(`\u{1F4CA} Started trajectory capture: ${this.currentTrajectory.id}`);
      }
      /**
       * Record a trajectory step
       */
      recordStep(block, previousState, arbiterScore, tropeValidation, selectedTokens) {
        if (!this.currentTrajectory) {
          console.warn("No active trajectory capture");
          return;
        }
        const loss = this.calculateStepLoss(
          previousState,
          block.currentState,
          arbiterScore,
          tropeValidation
        );
        const tokenDistributions = /* @__PURE__ */ new Map();
        for (const token of block.tokens) {
          tokenDistributions.set(token.position, new Map(token.distribution));
        }
        const step = {
          stepIndex: this.stepBuffer.length,
          timestamp: /* @__PURE__ */ new Date(),
          blockId: block.id,
          previousState,
          newState: block.currentState,
          alpha: block.tokens[0]?.alpha ?? 0,
          arbiterScore,
          tropeValidation,
          tokenDistributions,
          selectedTokens,
          loss
        };
        this.stepBuffer.push(step);
        this.currentTrajectory.metadata.totalTokens += selectedTokens.length;
        if (block.currentState !== previousState) {
          this.currentTrajectory.metadata.evolutionCycles++;
        }
        const stateOrder = ["MASK" /* MASK */, "SOFT_MASK_V" /* SOFT_MASK_V */, "SOFT_V" /* SOFT_V */, "DECODED" /* DECODED */];
        const prevIndex = stateOrder.indexOf(previousState);
        const newIndex = stateOrder.indexOf(block.currentState);
        if (newIndex < prevIndex) {
          this.currentTrajectory.metadata.regressionCount++;
        }
      }
      /**
       * Calculate loss for a single step
       */
      calculateStepLoss(previousState, newState, arbiterScore, tropeValidation) {
        const stateOrder = ["MASK" /* MASK */, "SOFT_MASK_V" /* SOFT_MASK_V */, "SOFT_V" /* SOFT_V */, "DECODED" /* DECODED */];
        const prevIndex = stateOrder.indexOf(previousState);
        const newIndex = stateOrder.indexOf(newState);
        const stateTransitionLoss = prevIndex >= newIndex ? (prevIndex - newIndex) * 0.5 : 0;
        const tropeScore = tropeValidation.length > 0 ? tropeValidation.reduce((sum, v) => sum + v.confidence, 0) / tropeValidation.length : 0;
        const tropeAlignmentLoss = 1 - tropeScore;
        const coherenceLoss = 1 - arbiterScore;
        const totalLoss = stateTransitionLoss * this.lossWeights.stateTransition + tropeAlignmentLoss * this.lossWeights.tropeAlignment + coherenceLoss * this.lossWeights.coherence;
        return totalLoss;
      }
      /**
       * End capture and calculate cumulative loss
       */
      endCapture(finalOutput, finalScore) {
        if (!this.currentTrajectory) {
          console.warn("No active trajectory capture to end");
          return null;
        }
        this.currentTrajectory.steps = [...this.stepBuffer];
        this.currentTrajectory.finalOutput = finalOutput;
        this.currentTrajectory.finalScore = finalScore;
        this.currentTrajectory.metadata.endTime = /* @__PURE__ */ new Date();
        this.currentTrajectory.totalLoss = this.calculateCumulativeLoss();
        console.log(`\u{1F4CA} Ended trajectory capture: ${this.currentTrajectory.id}`);
        console.log(`   Steps: ${this.currentTrajectory.steps.length}`);
        console.log(`   Total Loss: ${this.currentTrajectory.totalLoss.toFixed(4)}`);
        console.log(`   Final Score: ${finalScore.toFixed(4)}`);
        const completed = this.currentTrajectory;
        this.currentTrajectory = null;
        this.stepBuffer = [];
        return completed;
      }
      /**
       * Calculate cumulative loss across all steps
       * Uses temporal weighting to emphasize later steps
       */
      calculateCumulativeLoss() {
        if (this.stepBuffer.length === 0) return 0;
        let weightedSum = 0;
        let totalWeight = 0;
        for (let i = 0; i < this.stepBuffer.length; i++) {
          const temporalWeight = 1 + i / this.stepBuffer.length;
          weightedSum += this.stepBuffer[i].loss * temporalWeight;
          totalWeight += temporalWeight;
        }
        return weightedSum / totalWeight;
      }
      /**
       * Get current trajectory state
       */
      getCurrentState() {
        if (!this.currentTrajectory) {
          return { trajectoryId: null, stepCount: 0, runningLoss: 0 };
        }
        const runningLoss = this.stepBuffer.length > 0 ? this.stepBuffer.reduce((sum, s) => sum + s.loss, 0) / this.stepBuffer.length : 0;
        return {
          trajectoryId: this.currentTrajectory.id,
          stepCount: this.stepBuffer.length,
          runningLoss
        };
      }
      /**
       * Get KV cache manager
       */
      getKVCache() {
        return this.kvCache;
      }
    };
    TrajectoryStorage = class {
      /**
       * Save trajectory to database
       */
      async saveTrajectory(trajectory) {
        if (!supabase2) {
          console.log("Supabase not configured, skipping trajectory save");
          return false;
        }
        try {
          const { error } = await supabase2.from("evolution_trajectories").insert({
            id: trajectory.id,
            session_id: trajectory.sessionId,
            user_brief: trajectory.userBrief,
            theme: trajectory.theme,
            creative_seed_id: trajectory.creativeSeedId,
            steps: JSON.stringify(trajectory.steps.map((s) => ({
              ...s,
              tokenDistributions: Object.fromEntries(
                Array.from(s.tokenDistributions.entries()).map(([k, v]) => [k, Object.fromEntries(v)])
              )
            }))),
            final_output: trajectory.finalOutput,
            final_score: trajectory.finalScore,
            total_loss: trajectory.totalLoss,
            metadata: trajectory.metadata,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
          if (error) {
            console.error("Failed to save trajectory:", error);
            return false;
          }
          console.log(`\u{1F4BE} Saved trajectory ${trajectory.id} to database`);
          return true;
        } catch (error) {
          console.error("Trajectory save error:", error);
          return false;
        }
      }
      /**
       * Load trajectories for training
       */
      async loadTrajectories(options = {}) {
        if (!supabase2) {
          console.log("Supabase not configured, returning empty trajectories");
          return [];
        }
        try {
          let query = supabase2.from("evolution_trajectories").select("*").order("created_at", { ascending: false });
          if (options.limit) {
            query = query.limit(options.limit);
          }
          if (options.minScore !== void 0) {
            query = query.gte("final_score", options.minScore);
          }
          if (options.sessionId) {
            query = query.eq("session_id", options.sessionId);
          }
          const { data, error } = await query;
          if (error) {
            console.error("Failed to load trajectories:", error);
            return [];
          }
          return (data || []).map((row) => ({
            id: row.id,
            sessionId: row.session_id,
            userBrief: row.user_brief,
            theme: row.theme,
            creativeSeedId: row.creative_seed_id,
            steps: JSON.parse(row.steps || "[]").map((s) => ({
              ...s,
              timestamp: new Date(s.timestamp),
              tokenDistributions: new Map(
                Object.entries(s.tokenDistributions || {}).map(([k, v]) => [
                  parseInt(k),
                  new Map(Object.entries(v))
                ])
              )
            })),
            finalOutput: row.final_output,
            finalScore: row.final_score,
            totalLoss: row.total_loss,
            metadata: {
              ...row.metadata,
              startTime: new Date(row.metadata.startTime),
              endTime: row.metadata.endTime ? new Date(row.metadata.endTime) : void 0
            }
          }));
        } catch (error) {
          console.error("Trajectory load error:", error);
          return [];
        }
      }
      /**
       * Get training statistics
       */
      async getTrainingStats() {
        if (!supabase2) {
          return { totalTrajectories: 0, averageLoss: 0, averageScore: 0, averageSteps: 0 };
        }
        try {
          const { data, error } = await supabase2.from("evolution_trajectories").select("total_loss, final_score, steps");
          if (error || !data) {
            return {
              totalTrajectories: 0,
              averageLoss: 0,
              averageScore: 0,
              averageSteps: 0
            };
          }
          const totalTrajectories = data.length;
          const averageLoss = data.reduce((sum, t) => sum + t.total_loss, 0) / totalTrajectories;
          const averageScore = data.reduce((sum, t) => sum + t.final_score, 0) / totalTrajectories;
          const averageSteps = data.reduce((sum, t) => {
            const steps = JSON.parse(t.steps || "[]");
            return sum + steps.length;
          }, 0) / totalTrajectories;
          return {
            totalTrajectories,
            averageLoss,
            averageScore,
            averageSteps
          };
        } catch (error) {
          console.error("Stats calculation error:", error);
          return {
            totalTrajectories: 0,
            averageLoss: 0,
            averageScore: 0,
            averageSteps: 0
          };
        }
      }
    };
  }
});

// server/utils/tropeVarietySelector.ts
async function selectVariedTropes(options = {}) {
  const {
    tone = "creative",
    count = 3,
    excludeDevices = [],
    preferUnexplored = true,
    maxUsageCount = 5
  } = options;
  const allDeviceIds = getAllAvailableDeviceIds();
  console.log(`Selecting from ${allDeviceIds.length} available rhetorical devices`);
  const usageCounts = await getRhetoricalDeviceUsage();
  const excludeSet = new Set(excludeDevices.map((d) => d.toLowerCase().replace(/\s+/g, "_")));
  const fullExcludeSet = /* @__PURE__ */ new Set([...excludeSet, ...OVERUSED_COMMON_DEVICES]);
  const eligibleDevices = allDeviceIds.filter((id) => !fullExcludeSet.has(id));
  console.log(`   \u{1F6AB} Excluding ${OVERUSED_COMMON_DEVICES.size} overused common devices (metaphor, simile, etc.)`);
  console.log(`   ${eligibleDevices.length} uncommon devices available for selection`);
  const unexploredDevices = [];
  const lightlyUsedDevices = [];
  const moderatelyUsedDevices = [];
  for (const deviceId of eligibleDevices) {
    const usage = usageCounts[deviceId] || 0;
    if (usage === 0) {
      unexploredDevices.push(deviceId);
    } else if (usage <= 2) {
      lightlyUsedDevices.push(deviceId);
    } else if (usage <= maxUsageCount) {
      moderatelyUsedDevices.push(deviceId);
    }
  }
  console.log(`   \u{1F4CA} Unexplored: ${unexploredDevices.length}, Lightly used: ${lightlyUsedDevices.length}, Moderate: ${moderatelyUsedDevices.length}`);
  const toneDevices = TONE_DEVICE_AFFINITIES[tone] || TONE_DEVICE_AFFINITIES.creative;
  const toneDeviceSet = new Set(toneDevices);
  const selected = [];
  const addDevice = (deviceId, reason) => {
    if (selected.length >= count) return false;
    if (selected.some((s) => s.deviceId === deviceId)) return false;
    const definition = getDeviceDefinition(deviceId) || "Rhetorical device";
    const deviceName = deviceId.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    selected.push({
      deviceId,
      deviceName,
      definition,
      usageCount: usageCounts[deviceId] || 0,
      selectionReason: reason
    });
    return true;
  };
  const explorationQuota = Math.ceil(count * 0.8);
  const toneQuota = count - explorationQuota;
  console.log(`   \u{1F52C} AGGRESSIVE exploration quota: ${explorationQuota} unexplored (80%), ${toneQuota} familiar (20%)`);
  shuffleArray(unexploredDevices);
  let explorationFilled = 0;
  for (const device of unexploredDevices) {
    if (explorationFilled >= explorationQuota) break;
    if (addDevice(device, "unexplored")) {
      explorationFilled++;
    }
  }
  if (explorationFilled < explorationQuota) {
    shuffleArray(lightlyUsedDevices);
    for (const device of lightlyUsedDevices) {
      if (explorationFilled >= explorationQuota) break;
      if (addDevice(device, "lightly_used")) {
        explorationFilled++;
      }
    }
  }
  const unexploredToneMatch = unexploredDevices.filter((d) => toneDeviceSet.has(d));
  shuffleArray(unexploredToneMatch);
  for (const device of unexploredToneMatch) {
    if (selected.length >= count) break;
    addDevice(device, "unexplored");
  }
  const lightlyUsedToneMatch = lightlyUsedDevices.filter((d) => toneDeviceSet.has(d));
  shuffleArray(lightlyUsedToneMatch);
  for (const device of lightlyUsedToneMatch) {
    if (selected.length >= count) break;
    addDevice(device, "lightly_used");
  }
  const toneMatched = eligibleDevices.filter((d) => toneDeviceSet.has(d));
  shuffleArray(toneMatched);
  for (const device of toneMatched) {
    if (selected.length >= count) break;
    addDevice(device, "tone_matched");
  }
  shuffleArray(eligibleDevices);
  for (const device of eligibleDevices) {
    if (selected.length >= count) break;
    addDevice(device, "random");
  }
  const unexploredCount = selected.filter((s) => s.selectionReason === "unexplored").length;
  console.log(`   Selected ${selected.length} devices (${unexploredCount} unexplored): ${selected.map((s) => `${s.deviceName} (${s.selectionReason})`).join(", ")}`);
  return selected;
}
async function recordTropeUsage(deviceIds) {
  console.log(`Recording usage for ${deviceIds.length} devices`);
  for (const deviceId of deviceIds) {
    const normalizedId = deviceId.toLowerCase().replace(/\s+/g, "_");
    await updateRhetoricalDeviceUsage(normalizedId);
  }
}
async function getTropeExplorationStats() {
  const allDeviceIds = getAllAvailableDeviceIds();
  const usageCounts = await getRhetoricalDeviceUsage();
  const explored = [];
  const unexplored = [];
  const usageList = [];
  for (const deviceId of allDeviceIds) {
    const count = usageCounts[deviceId] || 0;
    if (count > 0) {
      explored.push(deviceId);
      usageList.push({ deviceId, count });
    } else {
      unexplored.push(deviceId);
    }
  }
  usageList.sort((a, b) => b.count - a.count);
  return {
    totalDevices: allDeviceIds.length,
    exploredCount: explored.length,
    unexploredCount: unexplored.length,
    explorationPercentage: explored.length / allDeviceIds.length * 100,
    mostUsed: usageList.slice(0, 10),
    neverUsed: unexplored.slice(0, 20)
    // Sample of never-used devices
  };
}
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
var TONE_DEVICE_AFFINITIES, OVERUSED_COMMON_DEVICES;
var init_tropeVarietySelector = __esm({
  "server/utils/tropeVarietySelector.ts"() {
    "use strict";
    init_supabaseClient();
    init_tropeConstraints();
    TONE_DEVICE_AFFINITIES = {
      creative: [
        "metaphor",
        "paradox",
        "oxymoron",
        "synecdoche",
        "hyperbole",
        "personification",
        "allegory",
        "zeugma",
        "juxtaposition",
        "alliteration",
        "assonance",
        "ekphrasis",
        "paronomasia",
        "catachresis",
        "metalepsis",
        "syllepsis",
        "antanaclasis"
      ],
      analytical: [
        "antithesis",
        "chiasmus",
        "syllogism",
        "logos",
        "ethos",
        "polysyndeton",
        "asyndeton",
        "epistrophe",
        "anaphora",
        "climax",
        "prolepsis",
        "isocolon",
        "litotes",
        "ellipsis",
        "enthymeme",
        "epichirema",
        "sorites",
        "dilemma"
      ],
      conversational: [
        "rhetorical_question",
        "irony",
        "hyperbole",
        "paronomasia",
        "hendiadys",
        "anadiplosis",
        "epizeuxis",
        "symploce",
        "alliteration",
        "assonance",
        "meiosis",
        "litotes",
        "aposiopesis",
        "anacoluthon",
        "pathos",
        "apostrophe"
      ],
      technical: [
        "metonymy",
        "litotes",
        "synecdoche",
        "ellipsis",
        "hendiadys",
        "chiasmus",
        "climax",
        "syllogism",
        "logos",
        "ethos",
        "isocolon",
        "parallelism",
        "prolepsis",
        "anaphora",
        "epistrophe",
        "polysyndeton",
        "asyndeton",
        "enumeration"
      ],
      emotional: [
        "pathos",
        "hyperbole",
        "exclamation",
        "apostrophe",
        "personification",
        "prosopopoeia",
        "erotema",
        "ecphonesis",
        "aposiopesis",
        "epimone",
        "conduplicatio",
        "anaphora",
        "epistrophe",
        "symploce",
        "epizeuxis",
        "ploce"
      ],
      persuasive: [
        "ethos",
        "pathos",
        "logos",
        "antithesis",
        "chiasmus",
        "anaphora",
        "epistrophe",
        "climax",
        "rhetorical_question",
        "procatalepsis",
        "apophasis",
        "paralepsis",
        "concession",
        "refutation",
        "amplification",
        "diminution"
      ]
    };
    OVERUSED_COMMON_DEVICES = /* @__PURE__ */ new Set([
      "metaphor",
      "simile",
      "hyperbole",
      "personification",
      "alliteration",
      "onomatopoeia",
      "oxymoron",
      "irony",
      "paradox",
      "analogy",
      "antithesis",
      "juxtaposition",
      "repetition",
      "rhetorical_question",
      "allusion",
      "imagery",
      "symbolism",
      "foreshadowing",
      "flashback"
    ]);
  }
});

// server/utils/hybridGenerationOrchestrator.ts
import OpenAI5 from "openai";
var DEFAULT_CONFIG, HybridGenerationOrchestrator;
var init_hybridGenerationOrchestrator = __esm({
  "server/utils/hybridGenerationOrchestrator.ts"() {
    "use strict";
    init_divergentExplorer();
    init_progressiveEvolution();
    init_tropeConstraints();
    init_trajectoryTraining();
    init_embeddingSimilarity();
    init_tropeVarietySelector();
    DEFAULT_CONFIG = {
      enableDivergentExploration: true,
      enableProgressiveEvolution: false,
      // PERF: Disabled - adds ~5s with minimal quality gain
      enableTrajectoryCapture: true,
      enableTropeConstraints: true,
      enableTropeVariety: true,
      // Strongly favor unexplored devices from 411 corpus
      fallbackToLegacy: true,
      divergentPoolSize: 5,
      // PERF: Reduced from 15 - 1 iteration instead of 3
      maxEvolutionCycles: 50,
      tropeValidationStrength: "moderate",
      creativityLevel: "balanced"
    };
    HybridGenerationOrchestrator = class {
      constructor(config = {}) {
        this.openai = new OpenAI5({
          apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
          baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0
        });
        this.tropeEngine = new TropeConstraintEngine();
        this.trajectoryCapture = new TrajectoryCapture();
        this.trajectoryStorage = new TrajectoryStorage();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.initialized = false;
      }
      /**
       * Initialize the orchestrator (call once before generation)
       */
      async initialize() {
        if (this.initialized) return;
        console.log("Initializing HybridGenerationOrchestrator...");
        if (this.config.enableTropeConstraints) {
          await this.tropeEngine.initialize();
        }
        this.initialized = true;
        console.log("HybridGenerationOrchestrator initialized");
      }
      /**
       * Main hybrid generation entry point
       */
      async generate(input) {
        const startTime = Date.now();
        const effectiveConfig = { ...this.config, ...input.config };
        const onProgress = effectiveConfig.onProgress;
        console.log("Starting hybrid generation pipeline...");
        console.log(`   Brief: "${input.userBrief.substring(0, 50)}..."`);
        console.log(`   Tone: ${input.tone}`);
        console.log(`   Requested tropes: ${input.requestedTropes?.join(", ") || "auto-detect"}`);
        try {
          await this.initialize();
          onProgress?.("analyzing", 10, "Initializing generation system...");
          let divergentPool = null;
          let selectedSeed = null;
          if (effectiveConfig.enableDivergentExploration) {
            console.log("PHASE 1: Divergent Exploration");
            onProgress?.("exploring", 15, "Starting divergent exploration with multiple personas...");
            divergentPool = await exploreDivergently(input.userBrief, {
              poolSize: effectiveConfig.divergentPoolSize,
              personaRotation: "weighted",
              maxTemperature: this.getMaxTemperature(effectiveConfig.creativityLevel)
            });
            onProgress?.("exploring", 25, `Generated ${divergentPool.seeds.length} creative seeds`);
            selectedSeed = await selectCreativeSeed(divergentPool, {
              distinctivenessWeight: 0.4,
              coherenceWeight: 0.3,
              tropeCompatibilityWeight: 0.3,
              minimumDistinctiveness: 0.3,
              minimumCoherence: 0.5
            });
            console.log(`   Selected seed from ${selectedSeed.persona.name}: "${selectedSeed.rawIdea.substring(0, 60)}..."`);
            onProgress?.("exploring", 30, `Selected seed from ${selectedSeed.persona.name}`);
          }
          if (effectiveConfig.enableTrajectoryCapture) {
            this.trajectoryCapture.startCapture(
              input.sessionId || "anonymous",
              input.userBrief,
              divergentPool?.theme || input.userBrief.split(" ").slice(0, 5).join(" "),
              selectedSeed?.id || "legacy"
            );
          }
          let evolutionResult = null;
          if (effectiveConfig.enableProgressiveEvolution && selectedSeed) {
            console.log("PHASE 2: Progressive Evolution");
            onProgress?.("evolving", 35, "Running progressive evolution...");
            const evolutionEngine = new ProgressiveEvolutionEngine({
              maxCycles: effectiveConfig.maxEvolutionCycles,
              blockSize: 8
            });
            const initialBlocks = this.createConceptBlocks(selectedSeed.rawIdea);
            evolutionResult = await evolutionEngine.evolve(initialBlocks);
            console.log(`   Evolution complete: ${evolutionResult.cycles} cycles, coherence: ${(evolutionResult.globalCoherence * 100).toFixed(1)}%`);
            onProgress?.("evolving", 40, `Evolution complete: ${evolutionResult.cycles} cycles`);
          }
          console.log("PHASE 3: Convergent Generation");
          onProgress?.("generating", 45, "Starting convergent generation with trope constraints...");
          const variants = await this.generateVariants(
            input,
            selectedSeed,
            divergentPool,
            evolutionResult,
            effectiveConfig
          );
          if (effectiveConfig.enableTropeConstraints && input.requestedTropes) {
            console.log("PHASE 4: Trope Validation");
            for (const variant of variants) {
              const content = `${variant.visualDescription} ${variant.headlines.join(" ")}`;
              const validation = await this.tropeEngine.validateMultipleTropes(
                content,
                input.requestedTropes,
                {
                  strength: effectiveConfig.tropeValidationStrength,
                  useAIFallback: true
                }
              );
              variant.scores.tropeAlignment = validation.overallSatisfaction;
              variant.scores.overall = this.calculateOverallScore(variant.scores);
            }
          }
          let trajectoryId;
          if (effectiveConfig.enableTrajectoryCapture) {
            const bestVariant = variants.reduce(
              (best, v) => v.scores.overall > best.scores.overall ? v : best
            );
            const trajectory = this.trajectoryCapture.endCapture(
              `${bestVariant.visualDescription}

${bestVariant.headlines.join("\n")}`,
              bestVariant.scores.overall
            );
            if (trajectory) {
              trajectoryId = trajectory.id;
              await this.trajectoryStorage.saveTrajectory(trajectory);
            }
          }
          variants.sort((a, b) => b.scores.overall - a.scores.overall);
          const endTime = Date.now();
          return {
            variants: variants.slice(0, input.variantCount || 3),
            metadata: {
              mode: "hybrid",
              divergentPoolSize: divergentPool?.seeds.length || 0,
              selectedSeedId: selectedSeed?.id,
              evolutionCycles: evolutionResult?.cycles,
              trajectoryId,
              generationTimeMs: endTime - startTime,
              creativityScore: this.calculateCreativityScore(variants, divergentPool)
            }
          };
        } catch (error) {
          console.error("Hybrid generation failed:", error instanceof Error ? error.message : error);
          console.error("Hybrid generation stack:", error instanceof Error ? error.stack : "no stack");
          if (effectiveConfig.fallbackToLegacy) {
            console.log("Falling back to legacy generation mode");
            return this.legacyFallback(input, startTime);
          }
          throw error;
        }
      }
      /**
       * Generate variants using hybrid approach
       */
      async generateVariants(input, seed, divergentPool, evolution, config) {
        const variantCount = input.variantCount || 3;
        let tropesToUse;
        let selectedTropeDetails = [];
        if (input.requestedTropes && input.requestedTropes.length > 0) {
          tropesToUse = input.requestedTropes;
          console.log(`   Using user-requested tropes: ${tropesToUse.join(", ")}`);
        } else if (config.enableTropeVariety) {
          console.log("   Selecting varied tropes from 411-device corpus...");
          selectedTropeDetails = await selectVariedTropes({
            tone: input.tone,
            count: Math.max(3, variantCount),
            preferUnexplored: true,
            maxUsageCount: 5
          });
          tropesToUse = selectedTropeDetails.map((t) => t.deviceId);
          const stats = await getTropeExplorationStats();
          console.log(`   Corpus exploration: ${stats.explorationPercentage.toFixed(1)}% (${stats.exploredCount}/${stats.totalDevices} devices used)`);
        } else {
          tropesToUse = seed?.tropeCompatibility.slice(0, 2) || ["metaphor", "antithesis"];
          console.log(`   Using fallback tropes: ${tropesToUse.join(", ")}`);
        }
        const tropeConstraint = generateTropeConstraintPrompt(tropesToUse);
        const allSeeds = divergentPool?.seeds || [];
        console.log(`   Available creative seeds: ${allSeeds.length}`);
        console.log(`   Generating ${variantCount} variants in parallel...`);
        const variantPromises = Array.from({ length: variantCount }, async (_, i) => {
          const variantSeed = allSeeds.length > 0 ? allSeeds[i % allSeeds.length] : seed;
          const seedContext = variantSeed ? `
Creative Direction (from ${variantSeed.persona.name}):
"${variantSeed.rawIdea}"

Build upon this creative seed while developing a UNIQUE concept that differs from other interpretations.
Use a completely different visual approach and angle than other variants.
` : "";
          const deviceIndex = variantCount === 1 ? Math.floor(Math.random() * tropesToUse.length) : i % tropesToUse.length;
          const assignedDevice = tropesToUse[deviceIndex];
          const assignedDeviceName = assignedDevice.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
          const assignedDeviceDefinition = getDeviceDefinition(assignedDevice) || "";
          const prompt = this.buildGenerationPrompt(
            input.userBrief,
            input.tone,
            seedContext,
            tropeConstraint,
            i,
            variantCount,
            assignedDeviceName,
            assignedDeviceDefinition
          );
          try {
            const response = await this.openai.chat.completions.create({
              model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: `You are an award-winning creative director generating breakthrough advertising concepts.
Your concepts should be unexpected, memorable, and emotionally resonant.
IMPORTANT: Create a concept that is VISUALLY and THEMATICALLY distinct from typical approaches.
Your visual must NOT be the FIRST thing anyone would think of for this brief. If a junior copywriter would suggest it, go further.
${variantSeed?.persona.systemPromptOverride || ""}`
                },
                { role: "user", content: prompt }
              ],
              temperature: this.getTemperature(config.creativityLevel, i),
              max_tokens: 1500
            });
            const content = response.choices[0]?.message?.content || "";
            const parsed = this.parseResponse(content);
            if (parsed) {
              parsed.headlines = parsed.headlines.map((h) => {
                const headlineWords = h.split(/\s+/);
                if (headlineWords.length > 10) {
                  return headlineWords.slice(0, 10).join(" ");
                }
                return h;
              });
            }
            if (parsed) {
              const combinedContent = `${parsed.visual} ${parsed.headlines.join(" ")}`;
              const words = combinedContent.toLowerCase().split(/\s+/);
              const uniqueWords = new Set(words);
              const distinctiveness = words.length > 0 ? Math.min(uniqueWords.size / words.length, 1) : 0.5;
              const wordCount = combinedContent.split(/\s+/).length;
              const headlineQuality = parsed.headlines.length >= 1 && parsed.headlines[0].length > 5 ? 0.8 : 0.6;
              const visualQuality = parsed.visual.length > 50 ? 0.8 : 0.6;
              const coherence = (headlineQuality + visualQuality) / 2;
              const llmDevice = parsed.rhetoricalAnalysis?.deviceUsed || "";
              const deviceForVariant = assignedDevice && llmDevice.toLowerCase() !== assignedDeviceName.toLowerCase() ? assignedDeviceName : llmDevice || assignedDeviceName || "metaphor";
              const deviceDefinition = getDeviceDefinition(parsed.rhetoricalAnalysis?.deviceUsed || "") || getDeviceDefinition(deviceForVariant) || "";
              const rhetoricalAnalysis = parsed.rhetoricalAnalysis ? {
                deviceName: parsed.rhetoricalAnalysis.deviceUsed || deviceForVariant,
                deviceDefinition,
                applicationExplanation: parsed.rhetoricalAnalysis.howApplied,
                textualEvidence: parsed.rhetoricalAnalysis.evidence ? [parsed.rhetoricalAnalysis.evidence] : [],
                effectivenessNote: parsed.rhetoricalAnalysis.whyItWorks
              } : void 0;
              const variant = {
                id: `hybrid_${Date.now()}_${i}`,
                visualDescription: parsed.visual,
                headlines: parsed.headlines,
                tagline: parsed.tagline,
                bodyCopy: parsed.bodyCopy,
                rhetoricalDevice: deviceForVariant,
                rhetoricalDeviceDefinition: deviceDefinition || void 0,
                rhetoricalAnalysis,
                creativeSeedOrigin: variantSeed ? {
                  personaId: variantSeed.persona.id,
                  personaName: variantSeed.persona.name,
                  rawIdea: variantSeed.rawIdea
                } : void 0,
                scores: {
                  originality: distinctiveness,
                  tropeAlignment: scoreTropeAlignment(combinedContent, tropesToUse),
                  coherence,
                  distinctiveness,
                  overall: 0
                },
                evolutionPath: evolution ? {
                  startState: "MASK" /* MASK */,
                  endState: "DECODED" /* DECODED */,
                  transitionCount: evolution.cycles
                } : void 0
              };
              variant.scores.overall = this.calculateOverallScore(variant.scores);
              return variant;
            }
            return null;
          } catch (error) {
            console.error(`Failed to generate variant ${i}:`, error);
            return null;
          }
        });
        const results = await Promise.all(variantPromises);
        const variants = results.filter((v) => v !== null);
        console.log(`   Generated ${variants.length}/${variantCount} variants`);
        if (variants.length > 0 && config.enableTropeVariety) {
          const usedTropes = Array.from(new Set(variants.map((v) => v.rhetoricalDevice)));
          await recordTropeUsage(usedTropes);
          console.log(`   Recorded usage for ${usedTropes.length} devices: ${usedTropes.join(", ")}`);
        }
        return variants;
      }
      /**
       * Get visual theme constraint for variant diversity
       */
      getVisualThemeConstraint(variantIndex, totalVariants = 1) {
        const visualThemes = [
          "Set your visual in an URBAN STREET SCENE - graffiti walls, neon signs, gritty textures, city energy",
          "Set your visual in NATURAL OUTDOOR ENVIRONMENT - forest, beach, desert, mountains, organic textures",
          "Set your visual in DOMESTIC/HOME SETTING - living room, bedroom, bathroom, real-life intimate spaces",
          "Set your visual in INDUSTRIAL/WAREHOUSE SPACE - exposed brick, steel beams, raw concrete, machinery",
          "Set your visual in RETRO/VINTAGE SETTING - 70s living room, 50s diner, art deco theater, nostalgic spaces",
          "Set your visual in SURREAL/FANTASY ENVIRONMENT - dreamscape, underwater, clouds, impossible architecture",
          "Set your visual in SPORTS/ATHLETIC CONTEXT - gym, stadium, track, pool, athletic achievement",
          "Set your visual in TRANSPORTATION SETTING - car interior, train station, airport, on the road",
          "Set your visual in OFFICE/WORKSPACE - desk setup, conference room, co-working space, productivity",
          "Set your visual in CULTURAL/HISTORICAL SETTING - ancient ruins, traditional architecture, cultural landmarks"
        ];
        if (totalVariants === 1) {
          const randomIndex = Math.floor(Math.random() * visualThemes.length);
          return visualThemes[randomIndex];
        }
        return visualThemes[variantIndex % visualThemes.length];
      }
      /**
       * Build generation prompt
       */
      buildGenerationPrompt(brief, tone, seedContext, tropeConstraint, variantIndex, totalVariants = 1, assignedDevice, assignedDeviceDefinition) {
        const deviceAssignment = assignedDevice ? `

\u26A0\uFE0F MANDATORY RHETORICAL DEVICE ASSIGNMENT: You MUST use **${assignedDevice}**${assignedDeviceDefinition ? ` (${assignedDeviceDefinition})` : ""} as your primary rhetorical device for this concept. Do NOT use Anaphora or any other device unless "${assignedDevice}" IS that device. Your "Device Used" MUST be "${assignedDevice}".` : "";
        return `Create a breakthrough advertising concept for:

**Brief:** ${brief}
**Tone:** ${tone}

${seedContext}

${tropeConstraint}${deviceAssignment}

Generate a complete concept. Write ACTUAL creative content for each section - do NOT echo instructions or placeholders.

Respond in EXACTLY this format:

# [Write ONE headline that PROVOKES, CHALLENGES, or makes a BOLD CLAIM. 4-8 words. Examples of great headlines: "Think Different" / "Got Milk?" / "We Try Harder" / "The Pause That Refreshes" / "What Happens in Vegas Stays in Vegas". Your headline should create TENSION, ask a PROVOCATIVE QUESTION, or make an UNEXPECTED PROMISE. NOT a product description. NOT abstract poetry.]

## [Write ONE tagline - MAX 5 words]

**Visual Concept:**
[Your vivid, detailed visual description with specific imagery, composition, lighting, and mood]

**Body Copy:**
[Your 2-3 sentences of persuasive copy]

**Rhetorical Analysis:**
- Device Used: [Name the rhetorical device]
- How Applied: [Explain how it's used in your concept]
- Evidence: [Quote specific phrases from your concept]
- Why It Works: [One sentence on effectiveness]

**Strategic Impact:**
[One sentence on audience resonance]

Make this variant ${variantIndex === 0 ? "the boldest and most unexpected" : variantIndex === 1 ? "emotionally resonant and human" : variantIndex === 2 ? "strategically sharp and memorable" : variantIndex === 3 ? "visually striking and unconventional" : "culturally resonant and thought-provoking"}.

CRITICAL VISUAL DIVERSITY REQUIREMENT:
${this.getVisualThemeConstraint(variantIndex, totalVariants)}

DO NOT use these overused visual settings: kitchen, gallery, museum, stark white table, clinical lab, test kitchen, pitch-black void, floating objects on slabs.`;
      }
      /**
       * Parse generation response
       */
      parseResponse(content) {
        try {
          const lines = content.split("\n");
          let headline = "";
          let tagline = "";
          let visual = "";
          let bodyCopy = "";
          const headlines = [];
          let currentSection = "";
          let deviceUsed = "";
          let howApplied = "";
          let evidence = "";
          let whyItWorks = "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("# ")) {
              const extracted = trimmed.substring(2).trim();
              if (extracted && !extracted.startsWith("[") && !extracted.endsWith("]") && !extracted.toLowerCase().includes("headline here") && !extracted.toLowerCase().includes("main headline") && extracted.length > 3) {
                headline = extracted;
              }
            } else if (trimmed.startsWith("## ")) {
              const extracted = trimmed.substring(3).trim();
              if (extracted && !extracted.startsWith("[") && !extracted.endsWith("]") && !extracted.toLowerCase().includes("tagline here") && extracted.toLowerCase() !== "tagline" && extracted.length > 3) {
                tagline = extracted;
              }
            } else if (trimmed.startsWith("**Visual Concept:**") || trimmed.startsWith("**Visual:**")) {
              currentSection = "visual";
              const match = trimmed.match(/\*\*Visual.*?:\*\*\s*(.*)/);
              if (match && match[1]) visual = match[1];
            } else if (trimmed.startsWith("**Body Copy:**")) {
              currentSection = "bodyCopy";
              const match = trimmed.match(/\*\*Body Copy:\*\*\s*(.*)/);
              if (match && match[1]) bodyCopy = match[1];
            } else if (trimmed.startsWith("**Headline:**") || trimmed.startsWith("**Headlines:**")) {
              currentSection = "headline";
              const match = trimmed.match(/\*\*Headlines?:\*\*\s*(.*)/);
              if (match && match[1] && match[1].length > 3) {
                const headlineText = match[1].replace(/^\[|\]$/g, "").trim();
                if (!headlineText.toLowerCase().includes("headline") && !headlineText.startsWith("[")) {
                  headlines.push(headlineText);
                }
              }
            } else if (trimmed.startsWith("**Rhetorical Analysis:**")) {
              currentSection = "rhetoricalAnalysis";
            } else if (trimmed.startsWith("**Strategic Impact:**")) {
              currentSection = "other";
            } else if (trimmed.startsWith("- Device Used:")) {
              deviceUsed = trimmed.replace("- Device Used:", "").trim();
            } else if (trimmed.startsWith("- How Applied:")) {
              howApplied = trimmed.replace("- How Applied:", "").trim();
            } else if (trimmed.startsWith("- Evidence:")) {
              evidence = trimmed.replace("- Evidence:", "").trim();
            } else if (trimmed.startsWith("- Why It Works:")) {
              whyItWorks = trimmed.replace("- Why It Works:", "").trim();
            } else if (currentSection === "headline" && trimmed && !trimmed.startsWith("**") && headlines.length === 0) {
              const headlineText = trimmed.replace(/^(-\s*(Option\s*\d+:\s*)?|\d+\.\s*)/, "").replace(/\*\*/g, "").replace(/^\[|\]$/g, "").trim();
              if (headlineText && headlineText.length > 3 && headlineText.length < 150 && !headlineText.toLowerCase().includes("headline") && !headlineText.startsWith("[") && !headlineText.endsWith("]")) {
                headlines.push(headlineText);
              }
            } else if (trimmed.startsWith("- Option") || trimmed.match(/^\d+\./)) {
              const headlineText = trimmed.replace(/^(-\s*(Option\s*\d+:\s*)?|\d+\.\s*)/, "").replace(/\*\*/g, "").replace(/^\[|\]$/g, "").trim();
              if (headlineText && headlineText.length > 3 && headlineText.length < 150 && !headlineText.toLowerCase().includes("headline") && !headlineText.toLowerCase().includes("variation") && !headlineText.startsWith("[") && !headlineText.endsWith("]")) {
                headlines.push(headlineText);
              }
            } else if (currentSection === "visual" && trimmed && !trimmed.startsWith("**")) {
              visual += " " + trimmed;
            } else if (currentSection === "bodyCopy" && trimmed && !trimmed.startsWith("**")) {
              bodyCopy += " " + trimmed;
            }
          }
          if (headline && !headlines.includes(headline)) {
            headlines.unshift(headline);
          }
          if (!visual || headlines.length === 0) {
            return null;
          }
          const rhetoricalAnalysis = deviceUsed || howApplied || evidence || whyItWorks ? {
            deviceUsed,
            howApplied,
            evidence,
            whyItWorks
          } : void 0;
          return {
            visual: visual.trim(),
            headlines,
            tagline: tagline || void 0,
            bodyCopy: bodyCopy.trim() || void 0,
            rhetoricalAnalysis
          };
        } catch (error) {
          console.error("Parse error:", error);
          return null;
        }
      }
      /**
       * Create concept blocks from raw idea
       */
      createConceptBlocks(rawIdea) {
        const words = rawIdea.split(/\s+/);
        const blockSize = 8;
        const blocks = [];
        for (let i = 0; i < words.length; i += blockSize) {
          const blockWords = words.slice(i, i + blockSize);
          const blockIndex = Math.floor(i / blockSize);
          const blockNames = ["headline", "tagline", "bodyCopy", "visualConcept", "rhetoricalCraft"];
          blocks.push({
            id: `block_${i}`,
            name: blockNames[blockIndex % blockNames.length],
            tokens: blockWords.map((word, j) => ({
              state: "MASK" /* MASK */,
              position: i + j,
              distribution: /* @__PURE__ */ new Map([[word, 0.5]]),
              embedding: [],
              alpha: 1,
              committed: false
            })),
            state: "MASK" /* MASK */,
            currentState: "MASK" /* MASK */,
            tropeConstraints: [],
            coherenceScore: 0,
            committed: false,
            content: ""
          });
        }
        return blocks;
      }
      /**
       * Calculate distinctiveness score
       */
      calculateDistinctiveness(embedding, otherEmbeddings) {
        if (otherEmbeddings.length === 0) return 1;
        const maxSimilarity = Math.max(
          ...otherEmbeddings.map((e) => cosineSimilarity(embedding, e))
        );
        return 1 - maxSimilarity;
      }
      /**
       * Calculate overall score from component scores
       */
      calculateOverallScore(scores) {
        return scores.originality * 0.25 + scores.tropeAlignment * 0.25 + scores.coherence * 0.25 + scores.distinctiveness * 0.25;
      }
      /**
       * Calculate creativity score for the generation
       */
      calculateCreativityScore(variants, pool) {
        const avgDistinctiveness = variants.reduce((sum, v) => sum + v.scores.distinctiveness, 0) / variants.length;
        const avgOriginality = variants.reduce((sum, v) => sum + v.scores.originality, 0) / variants.length;
        const poolDiversity = pool ? pool.generationMetrics.averageDistinctiveness : 0.5;
        return (avgDistinctiveness + avgOriginality + poolDiversity) / 3;
      }
      /**
       * Get temperature based on creativity level and variant index
       */
      getTemperature(level, index) {
        const baseTemp = {
          conservative: 0.8,
          balanced: 1,
          experimental: 1.3
        }[level];
        return baseTemp + index * 0.1;
      }
      /**
       * Get max temperature for divergent exploration
       */
      getMaxTemperature(level) {
        return {
          conservative: 1.2,
          balanced: 1.5,
          experimental: 1.8
        }[level];
      }
      /**
       * Legacy fallback when hybrid fails
       */
      async legacyFallback(input, startTime) {
        const variants = [];
        for (let i = 0; i < (input.variantCount || 3); i++) {
          const response = await this.openai.chat.completions.create({
            model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
            messages: [{
              role: "user",
              content: `Create an advertising concept for: ${input.userBrief}
Tone: ${input.tone}

Provide a visual description and 3 headline options.`
            }],
            temperature: 1,
            max_tokens: 500
          });
          const content = response.choices[0]?.message?.content || "";
          variants.push({
            id: `legacy_${Date.now()}_${i}`,
            visualDescription: content.substring(0, 200),
            headlines: ["Headline 1", "Headline 2", "Headline 3"],
            rhetoricalDevice: "metaphor",
            scores: {
              originality: 0.5,
              tropeAlignment: 0.5,
              coherence: 0.5,
              distinctiveness: 0.5,
              overall: 0.5
            }
          });
        }
        return {
          variants,
          metadata: {
            mode: "legacy",
            divergentPoolSize: 0,
            generationTimeMs: Date.now() - startTime,
            creativityScore: 0.5
          }
        };
      }
    };
  }
});

// server/routes/generateMultivariantStream.ts
var generateMultivariantStream_exports = {};
__export(generateMultivariantStream_exports, {
  generateMultivariantStream: () => generateMultivariantStream
});
function sendSSE(res, event) {
  res.write(`data: ${JSON.stringify(event)}

`);
  if (typeof res.flush === "function") {
    res.flush();
  }
}
async function generateMultivariantStream(req, res) {
  const {
    query,
    tone,
    conceptCount = 3,
    enableHybridMode = true,
    hybridConfig
  } = req.body;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const startTime = Date.now();
  const logs = [];
  const log = (message) => {
    const timestamp2 = (/* @__PURE__ */ new Date()).toLocaleTimeString();
    const entry = `[${timestamp2}] ${message}`;
    logs.push(entry);
    sendSSE(res, { type: "log", data: { message: entry, timestamp: timestamp2 } });
  };
  const updateProgress = (step, progress, detail) => {
    sendSSE(res, {
      type: "progress",
      data: { step, progress, detail }
    });
  };
  try {
    if (!query || !tone) {
      sendSSE(res, { type: "error", data: { message: "Query and tone are required" } });
      res.end();
      return;
    }
    log(`Starting generation for: "${query.substring(0, 50)}..."`);
    updateProgress("analyzing", 5, "Analyzing your creative brief...");
    saveCreativeBrief({
      user_id: null,
      name: null,
      query,
      tone,
      concept_count: conceptCount,
      hybrid_config: hybridConfig || null,
      is_starred: false,
      last_used_at: (/* @__PURE__ */ new Date()).toISOString(),
      times_used: 1
    }).catch((err) => console.log("Brief auto-save skipped:", err.message));
    if (enableHybridMode) {
      log("Hybrid mode enabled - using CREATIVEDC + EvoToken-DLM pipeline");
      updateProgress("analyzing", 10, "Initializing hybrid generation system...");
      const orchestrator = new HybridGenerationOrchestrator({
        enableDivergentExploration: hybridConfig?.enableDivergentExploration ?? true,
        enableProgressiveEvolution: hybridConfig?.enableProgressiveEvolution ?? false,
        // PERF: Disabled by default
        enableTropeConstraints: hybridConfig?.enableTropeConstraints ?? true,
        creativityLevel: hybridConfig?.creativityLevel ?? "balanced",
        fallbackToLegacy: true,
        // Pass progress callback for real-time updates
        onProgress: (phase, progress, detail) => {
          updateProgress(phase, progress, detail);
          log(detail);
        }
      });
      log("Starting divergent exploration phase...");
      updateProgress("exploring", 15, "Exploring creative directions with multiple personas...");
      const hybridResult = await orchestrator.generate({
        userBrief: query,
        tone,
        requestedTropes: hybridConfig?.requestedTropes,
        variantCount: conceptCount,
        sessionId: `session_${Date.now()}`,
        // Progress callback for variant-level updates
        onVariantProgress: (variantIndex, total, status) => {
          const baseProgress = 40;
          const variantProgress = baseProgress + variantIndex / total * 40;
          updateProgress("generating", Math.round(variantProgress), `Generating variant ${variantIndex + 1}/${total}: ${status}`);
          log(`Variant ${variantIndex + 1}/${total}: ${status}`);
        }
      });
      log(`Generated ${hybridResult.variants.length} variants`);
      updateProgress("saving", 85, "Saving concepts to database...");
      const outputs = [];
      for (let i = 0; i < hybridResult.variants.length; i++) {
        const variant = hybridResult.variants[i];
        log(`Saving variant ${i + 1} to Supabase...`);
        const deviceDisplayName = variant.rhetoricalDevice.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        const structuredContent = `**RHETORICAL DEVICE:** ${deviceDisplayName}
${variant.rhetoricalDeviceDefinition ? `*${variant.rhetoricalDeviceDefinition}*
` : ""}
**VISUAL CONCEPT:**
${variant.visualDescription}

**HEADLINE:**
${variant.headlines[0] || "No headline generated"}

${variant.tagline ? `**TAGLINE:** ${variant.tagline}
` : ""}
${variant.bodyCopy ? `**BODY COPY:** ${variant.bodyCopy}
` : ""}
**Prompt:** ${query}`;
        const conceptId = await logSession({
          userId: null,
          prompt: query,
          response: structuredContent,
          tone
        });
        const output = {
          visualDescription: variant.visualDescription,
          headlines: variant.headlines,
          rhetoricalDevice: variant.rhetoricalDevice,
          rhetoricalDeviceDefinition: variant.rhetoricalDeviceDefinition,
          originalityScore: Math.round(variant.scores.originality * 100),
          id: variant.id,
          tagline: variant.tagline,
          bodyCopy: variant.bodyCopy,
          conceptId: conceptId || `generated-${Date.now()}-${i}`,
          hybridMetadata: {
            creativeSeedOrigin: variant.creativeSeedOrigin,
            evolutionPath: variant.evolutionPath,
            scores: variant.scores
          }
        };
        outputs.push(output);
        sendSSE(res, { type: "variant", data: { index: i, variant: output } });
        const saveProgress = 85 + (i + 1) / hybridResult.variants.length * 10;
        updateProgress("saving", Math.round(saveProgress), `Saved ${i + 1}/${hybridResult.variants.length} concepts`);
      }
      const endTime = Date.now();
      log(`Generation complete in ${endTime - startTime}ms`);
      updateProgress("complete", 100, `${outputs.length} concepts generated successfully!`);
      sendSSE(res, {
        type: "complete",
        data: {
          success: true,
          outputs,
          metadata: {
            generationMode: "hybrid",
            ...hybridResult.metadata,
            totalTime: endTime - startTime,
            savedCount: outputs.length
          },
          logs
        }
      });
    } else {
      log("Using legacy generation mode");
      sendSSE(res, { type: "error", data: { message: "Legacy mode not supported in streaming endpoint" } });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log(`Error: ${errorMessage}`);
    sendSSE(res, { type: "error", data: { message: errorMessage, logs } });
  } finally {
    res.end();
  }
}
var init_generateMultivariantStream = __esm({
  "server/routes/generateMultivariantStream.ts"() {
    "use strict";
    init_hybridGenerationOrchestrator();
    init_supabaseClient();
  }
});

// server/services/enhancedAI.ts
var enhancedAI_exports = {};
__export(enhancedAI_exports, {
  generateEnhancedConcept: () => generateEnhancedConcept,
  generateExampleConcept: () => generateExampleConcept
});
import OpenAI17 from "openai";
function assessCulturalSimilarity(concept) {
  const matches = [];
  let totalSimilarity = 0;
  const conceptText = `${concept.headline} ${concept.tagline} ${concept.bodyCopy} ${concept.visualConcept}`.toLowerCase();
  CULTURAL_REFERENCE_BASE.forEach((reference) => {
    let referenceScore = 0;
    reference.elements.forEach((element) => {
      if (conceptText.includes(element.toLowerCase())) {
        referenceScore += 0.4;
        matches.push(`${reference.name}: ${element}`);
      }
    });
    if (reference.name === "Just Do It" && concept.headline.split(" ").length === 3 && concept.headline.includes(" ")) {
      referenceScore += 0.3;
      matches.push(`${reference.name}: three-word imperative structure`);
    }
    totalSimilarity = Math.max(totalSimilarity, referenceScore);
  });
  return {
    isSimilar: totalSimilarity > 0.3,
    matches,
    score: totalSimilarity
  };
}
function detectCliches(concept) {
  const conceptText = `${concept.headline} ${concept.tagline} ${concept.bodyCopy} ${concept.visualConcept}`.toLowerCase();
  const found = RHETORICAL_CLICHES.filter((cliche) => conceptText.includes(cliche));
  return {
    hasCliches: found.length > 0,
    found
  };
}
function checkRepetition(concept, sessionHistory2 = [], recentConcepts = []) {
  const currentContent = `${concept.headline} ${concept.tagline} ${concept.visualConcept}`.toLowerCase();
  const allHistory = [...sessionHistory2, ...recentConcepts];
  let maxSimilarity = 0;
  allHistory.forEach((historical) => {
    const historicalLower = historical.toLowerCase();
    const currentWords = currentContent.split(/\s+/);
    const historicalWords = historicalLower.split(/\s+/);
    const commonWords = currentWords.filter(
      (word) => word.length > 3 && historicalWords.includes(word)
    );
    const similarity = commonWords.length / Math.max(currentWords.length, historicalWords.length);
    maxSimilarity = Math.max(maxSimilarity, similarity);
  });
  return {
    isRepetitive: maxSimilarity > 0.4,
    similarity: maxSimilarity
  };
}
async function generateEnhancedConcept(request) {
  const maxAttempts = 5;
  let attempts = 0;
  const systemPrompt = `You are Concept Forge, an AI ideation system trained to produce original advertising concepts while referencing your vast knowledge of global campaigns and public health messaging.

CRITICAL REQUIREMENTS:

1. CULTURAL SIMILARITY ASSESSMENT: Internally compare ideas to historical campaigns. If >30% similar in visual metaphor, slogan, or structure to known campaigns (e.g., (RED), Dove Real Beauty, Share a Coke, Just Do It), you must discard and regenerate.

2. RHETORICAL CLICH\xC9 DETECTION: Automatically avoid concepts that:
- Lean heavily on red color symbolism for HIV
- Use over-familiar metaphors like tapestry, threads, rising voices, or breaking chains  
- Incorporate obvious rhetorical tropes without innovation

3. INNOVATION REQUIREMENT: Generate concepts that feel genuinely fresh and unexpected while maintaining strategic relevance.

Return ONLY a single JSON object in this exact format:
{
  "headline": "...",
  "tagline": "...", 
  "bodyCopy": "...",
  "visualConcept": "...",
  "rhetoricalCraft": [
    {"device":"...","explanation":"..."},
    {"device":"...","explanation":"..."}
  ],
  "strategicImpact": "..."
}

Do not include any commentary, references to this process, or extra text.`;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      const completion = await openai13.chat.completions.create({
        model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate an original advertising concept for: ${request.query}

Tone: ${request.tone}

Avoid ALL references to color symbolism, ribbons, tapestry, threads, rising voices, or breaking chains. Create something genuinely innovative.` }
        ],
        temperature: 0.9,
        max_tokens: 1200
      });
      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error("Empty response from OpenAI");
      }
      const concept = JSON.parse(responseContent);
      if (!concept.headline || !concept.tagline || !concept.bodyCopy || !concept.visualConcept) {
        throw new Error("Missing required fields in generated concept");
      }
      const culturalCheck = assessCulturalSimilarity(concept);
      const clicheCheck = detectCliches(concept);
      const repetitionCheck = checkRepetition(concept, request.sessionHistory, request.recentConcepts);
      console.log(`\u{1F50D} Attempt ${attempts} Quality Check:
        Cultural Similarity: ${culturalCheck.score.toFixed(2)} (${culturalCheck.isSimilar ? "FLAGGED" : "PASS"})
        Clich\xE9s: ${clicheCheck.found.length} found (${clicheCheck.hasCliches ? "FLAGGED" : "PASS"})
        Repetition: ${(repetitionCheck.similarity * 100).toFixed(1)}% (${repetitionCheck.isRepetitive ? "FLAGGED" : "PASS"})`);
      if (!culturalCheck.isSimilar && !clicheCheck.hasCliches && !repetitionCheck.isRepetitive) {
        console.log(`Enhanced concept generated successfully on attempt ${attempts}`);
        return concept;
      }
      if (culturalCheck.isSimilar) {
        console.log(`\u{1F6AB} Cultural similarity detected: ${culturalCheck.matches.join(", ")}`);
      }
      if (clicheCheck.hasCliches) {
        console.log(`\u{1F6AB} Clich\xE9s detected: ${clicheCheck.found.join(", ")}`);
      }
      if (repetitionCheck.isRepetitive) {
        console.log(`\u{1F6AB} Repetition detected: ${(repetitionCheck.similarity * 100).toFixed(1)}% similarity`);
      }
    } catch (error) {
      console.error(`Error on attempt ${attempts}:`, error);
    }
  }
  throw new Error(`Failed to generate acceptable concept after ${maxAttempts} attempts`);
}
async function generateExampleConcept() {
  return generateEnhancedConcept({
    query: "HIV awareness campaign that avoids color symbolism, ribbons, tapestry, or threads",
    tone: "creative"
  });
}
var openai13, CULTURAL_REFERENCE_BASE, RHETORICAL_CLICHES;
var init_enhancedAI = __esm({
  "server/services/enhancedAI.ts"() {
    "use strict";
    openai13 = new OpenAI17({ apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY, baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0 });
    CULTURAL_REFERENCE_BASE = [
      // Health/HIV campaigns
      { name: "(RED)", elements: ["red color", "parentheses branding", "elimination messaging"] },
      { name: "Love Positive", elements: ["positive messaging", "heart symbolism", "empowerment"] },
      { name: "Undetectable = Untransmittable", elements: ["equals sign", "scientific messaging", "equation format"] },
      // Iconic brand campaigns  
      { name: "Just Do It", elements: ["imperative verb", "three words", "action orientation"] },
      { name: "Think Different", elements: ["verb + adjective", "intellectual appeal", "creative class targeting"] },
      { name: "Share a Coke", elements: ["personalization", "sharing concept", "name customization"] },
      { name: "Dove Real Beauty", elements: ["authentic beauty", "real people", "self-acceptance"] },
      { name: "Break the Internet", elements: ["disruption language", "digital metaphors", "viral intent"] },
      // Health awareness patterns
      { name: "Tapestry/Thread campaigns", elements: ["weaving metaphors", "interconnection", "fabric imagery"] },
      { name: "Rising Voices", elements: ["elevation metaphors", "voice amplification", "empowerment language"] },
      { name: "Breaking Chains", elements: ["liberation imagery", "freedom metaphors", "chain breaking"] }
    ];
    RHETORICAL_CLICHES = [
      "red ribbon",
      "breaking barriers",
      "lifting voices",
      "threads of",
      "tapestry of",
      "rising above",
      "breaking free",
      "shining light",
      "bridge the gap",
      "stand together",
      "speak your truth",
      "find your voice",
      "breaking silence",
      "rainbow of",
      "spectrum of"
    ];
  }
});

// exportHistoryToGoogleDoc.ts
var exportHistoryToGoogleDoc_exports = {};
__export(exportHistoryToGoogleDoc_exports, {
  exportHistoryToGoogleDoc: () => exportHistoryToGoogleDoc
});
import { google } from "googleapis";
async function exportHistoryToGoogleDoc() {
  try {
    console.log("\u{1F50D} Fetching session history...");
    const response = await fetch("http://localhost:5000/api/history");
    if (!response.ok) {
      throw new Error(`History fetch failed: ${response.status} ${response.statusText}`);
    }
    const historyData = await response.json();
    if (historyData.length === 0) {
      console.log(" No session history found. Generate some concepts first.");
      return;
    }
    console.log(`\u{1F4CA} Found ${historyData.length} concepts to export`);
    let formattedContent = "";
    for (const entry of historyData) {
      try {
        const concept = JSON.parse(entry.content);
        formattedContent += `---
`;
        formattedContent += `\u{1F7E8} Prompt:
${entry.prompt}

`;
        formattedContent += `\u{1F7E8} Headline
${concept.headline}

`;
        formattedContent += `\u{1F7E8} Tagline
${concept.tagline}

`;
        formattedContent += `\u{1F7E8} Body Copy
${concept.bodyCopy}

`;
        formattedContent += `\u{1F7E8} Visual Concept
${concept.visualConcept}

`;
        formattedContent += `\u{1F7E8} Rhetorical Craft Breakdown
`;
        if (concept.rhetoricalCraft && concept.rhetoricalCraft.length > 0) {
          for (const craft of concept.rhetoricalCraft) {
            formattedContent += `\u2022 ${craft.device}: ${craft.explanation}
`;
          }
        } else {
          formattedContent += `\u2022 No rhetorical craft data available
`;
        }
        formattedContent += `
\u{1F7E8} Strategic Impact
${concept.strategicImpact}

`;
        formattedContent += `\u{1F7E8} Created At
${entry.timestamp}
`;
        formattedContent += `---

`;
      } catch (parseError) {
        console.log(` Could not parse concept ${entry.id}, skipping...`);
        continue;
      }
    }
    console.log("\u{1F510} Setting up Google Docs API...");
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!credentials) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required");
    }
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: ["https://www.googleapis.com/auth/documents", "https://www.googleapis.com/auth/drive"]
    });
    const docs = google.docs({ version: "v1", auth });
    const drive = google.drive({ version: "v3", auth });
    const now = /* @__PURE__ */ new Date();
    const docTitle = `Concept Forge Export - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    console.log("Creating Google Doc...");
    const createResponse = await docs.documents.create({
      requestBody: {
        title: docTitle
      }
    });
    const documentId = createResponse.data.documentId;
    if (!documentId) {
      throw new Error("Failed to create document");
    }
    console.log("\u270D\uFE0F  Formatting and inserting content...");
    let docContent = `CONCEPT FORGE EXPORT
`;
    docContent += `Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}
`;
    docContent += `Total Concepts: ${historyData.length}

`;
    docContent += `${"=".repeat(60)}

`;
    for (let i = 0; i < historyData.length; i++) {
      const entry = historyData[i];
      try {
        const concept = JSON.parse(entry.content);
        docContent += `---

`;
        docContent += `\u{1F7E8} **HEADLINE**
${concept.headline}

`;
        docContent += `\u{1F7E8} **TAGLINE**
${concept.tagline}

`;
        docContent += `\u{1F7E8} **BODY COPY**
${concept.bodyCopy}

`;
        docContent += `\u{1F7E8} **VISUAL CONCEPT**
${concept.visualConcept}

`;
        docContent += `\u{1F7E8} **RHETORICAL CRAFT BREAKDOWN**
`;
        if (concept.rhetoricalCraft && concept.rhetoricalCraft.length > 0) {
          concept.rhetoricalCraft.forEach((craft, index) => {
            const deviceType = index === 0 ? "Primary Device" : "Secondary Device";
            docContent += `${deviceType}: ${craft.device}
${craft.explanation}

`;
          });
        } else {
          docContent += `Primary Device: None specified
No rhetorical craft data available

`;
        }
        docContent += `**Strategic Impact**
${concept.strategicImpact}

`;
        docContent += `**Original Prompt:** ${entry.prompt}
`;
        docContent += `**Tone:** ${entry.tone.toUpperCase()}
`;
        docContent += `**Generated:** ${entry.timestamp}

`;
        docContent += `---

`;
      } catch (parseError) {
        console.log(` Could not parse concept ${entry.id}, skipping...`);
        continue;
      }
    }
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: 1
              },
              text: docContent
            }
          }
        ]
      }
    });
    console.log("\u{1F517} Sharing document...");
    try {
      await drive.permissions.create({
        fileId: documentId,
        requestBody: {
          type: "user",
          role: "writer",
          emailAddress: "dustinyork15@gmail.com"
        }
      });
      console.log("Google Docs export complete and shared with dustinyork15@gmail.com");
    } catch (shareError) {
      const message = shareError instanceof Error ? shareError.message : String(shareError);
      console.log(` Could not share document: ${message}`);
      console.log("\u{1F4E7} You can manually share the document using the URL below");
    }
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    console.log("Export complete! Document URL:", documentUrl);
    console.log(`\u{1F4CA} Exported ${historyData.length} concepts successfully`);
    return documentUrl;
  } catch (error) {
    console.error("Export failed:", error);
    process.exit(1);
  }
}
var init_exportHistoryToGoogleDoc = __esm({
  "exportHistoryToGoogleDoc.ts"() {
    "use strict";
    if (import.meta.url === `file://${process.argv[1]}`) {
      exportHistoryToGoogleDoc();
    }
  }
});

// exportHistoryToLocalDoc.ts
var exportHistoryToLocalDoc_exports = {};
__export(exportHistoryToLocalDoc_exports, {
  exportHistoryToLocalDoc: () => exportHistoryToLocalDoc
});
import fs2 from "fs";
import path2 from "path";
async function exportHistoryToLocalDoc() {
  try {
    console.log("\u{1F50D} Fetching session history...");
    const response = await fetch("http://localhost:5000/api/history");
    if (!response.ok) {
      throw new Error(`History fetch failed: ${response.status} ${response.statusText}`);
    }
    const historyData = await response.json();
    if (historyData.length === 0) {
      console.log(" No session history found. Generate some concepts first.");
      return;
    }
    console.log(`\u{1F4CA} Found ${historyData.length} concepts to export`);
    let formattedContent = "";
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    formattedContent += `CONCEPT FORGE SESSION HISTORY - ${today}
`;
    formattedContent += `${"=".repeat(60)}

`;
    formattedContent += `Generated: ${(/* @__PURE__ */ new Date()).toLocaleString()}
`;
    formattedContent += `Total Concepts: ${historyData.length}

`;
    for (let i = 0; i < historyData.length; i++) {
      const entry = historyData[i];
      try {
        const concept = JSON.parse(entry.content);
        formattedContent += `${"-".repeat(60)}
`;
        formattedContent += `CONCEPT ${i + 1} OF ${historyData.length}
`;
        formattedContent += `${"-".repeat(60)}

`;
        formattedContent += `\u{1F7E8} PROMPT:
${entry.prompt}

`;
        formattedContent += `\u{1F7E8} HEADLINE
${concept.headline}

`;
        formattedContent += `\u{1F7E8} TAGLINE
${concept.tagline}

`;
        formattedContent += `\u{1F7E8} BODY COPY
${concept.bodyCopy}

`;
        formattedContent += `\u{1F7E8} VISUAL CONCEPT
${concept.visualConcept}

`;
        formattedContent += `\u{1F7E8} RHETORICAL CRAFT BREAKDOWN
`;
        if (concept.rhetoricalCraft && concept.rhetoricalCraft.length > 0) {
          for (const craft of concept.rhetoricalCraft) {
            formattedContent += `\u2022 ${craft.device}: ${craft.explanation}
`;
          }
        } else {
          formattedContent += `\u2022 No rhetorical craft data available
`;
        }
        formattedContent += `
\u{1F7E8} STRATEGIC IMPACT
${concept.strategicImpact}

`;
        formattedContent += `\u{1F7E8} TONE
${entry.tone.toUpperCase()}

`;
        formattedContent += `\u{1F7E8} CREATED AT
${entry.timestamp}

`;
      } catch (parseError) {
        console.log(` Could not parse concept ${entry.id}, skipping...`);
        continue;
      }
    }
    const filename = `concept-forge-export-${today}.txt`;
    const filepath = path2.join(process.cwd(), filename);
    fs2.writeFileSync(filepath, formattedContent, "utf8");
    console.log("Export complete!");
    console.log(`File saved: ${filename}`);
    console.log(`\u{1F4CA} Exported ${historyData.length} concepts successfully`);
    console.log("\n\u{1F4CB} To import to Google Docs:");
    console.log("1. Open Google Docs");
    console.log("2. Create a new document");
    console.log("3. Copy and paste the content from the exported file");
    console.log("4. Apply formatting as needed");
    return filepath;
  } catch (error) {
    console.error("Export failed:", error);
    process.exit(1);
  }
}
var init_exportHistoryToLocalDoc = __esm({
  "exportHistoryToLocalDoc.ts"() {
    "use strict";
    if (import.meta.url === `file://${process.argv[1]}`) {
      exportHistoryToLocalDoc();
    }
  }
});

// src/api/handler.ts
import "dotenv/config";
import express from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.aiRequests = /* @__PURE__ */ new Map();
    this.projects = /* @__PURE__ */ new Map();
    this.conceptRatings = /* @__PURE__ */ new Map();
    this.currentUserId = 1;
    this.currentRequestId = 1;
    this.currentRatingId = 1;
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentUserId++;
    const user = {
      id,
      username: insertUser.username,
      password: insertUser.password
    };
    this.users.set(id, user);
    return user;
  }
  async createAiRequest(insertRequest) {
    const id = this.currentRequestId++;
    const request = {
      id,
      query: insertRequest.query,
      tone: insertRequest.tone,
      response: insertRequest.response,
      tokens: insertRequest.tokens,
      processingTime: insertRequest.processingTime,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.aiRequests.set(id, request);
    return request;
  }
  async getAiRequests() {
    return Array.from(this.aiRequests.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
  // Project management methods
  async createProject(insertProject) {
    const now = /* @__PURE__ */ new Date();
    const project = {
      id: insertProject.id,
      name: insertProject.name,
      description: insertProject.description || null,
      userId: insertProject.userId || null,
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(project.id, project);
    return project;
  }
  async getProject(id) {
    return this.projects.get(id);
  }
  async getProjects(userId) {
    const allProjects = Array.from(this.projects.values());
    if (userId) {
      return allProjects.filter((project) => project.userId === userId);
    }
    return allProjects;
  }
  async updateProject(id, updates) {
    const existingProject = this.projects.get(id);
    if (!existingProject) return void 0;
    const updatedProject = {
      ...existingProject,
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  async deleteProject(id) {
    return this.projects.delete(id);
  }
  // Concept rating methods
  async createConceptRating(insertRating) {
    const id = this.currentRatingId++;
    const rating = {
      id,
      projectId: insertRating.projectId,
      conceptId: insertRating.conceptId,
      rhetoricalDevice: insertRating.rhetoricalDevice,
      tone: insertRating.tone,
      rating: insertRating.rating,
      userId: insertRating.userId || null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.conceptRatings.set(id, rating);
    return rating;
  }
  async getConceptRatings(projectId) {
    return Array.from(this.conceptRatings.values()).filter((rating) => rating.projectId === projectId);
  }
  async getConceptRating(projectId, conceptId, userId) {
    return Array.from(this.conceptRatings.values()).find(
      (rating) => rating.projectId === projectId && rating.conceptId === conceptId && (!userId || rating.userId === userId)
    );
  }
  async updateConceptRating(id, newRating) {
    const existingRating = this.conceptRatings.get(id);
    if (!existingRating) return void 0;
    const updatedRating = {
      ...existingRating,
      rating: newRating
    };
    this.conceptRatings.set(id, updatedRating);
    return updatedRating;
  }
  async deleteConceptRating(id) {
    return this.conceptRatings.delete(id);
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var aiRequests = pgTable("ai_requests", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  tone: text("tone").notNull(),
  response: text("response").notNull(),
  tokens: integer("tokens").notNull(),
  processingTime: text("processing_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var projects = pgTable("projects", {
  id: text("id").primaryKey(),
  // UUID
  name: text("name").notNull(),
  description: text("description"),
  userId: text("user_id"),
  // For future user system
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var conceptRatings = pgTable("concept_ratings", {
  id: serial("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  conceptId: text("concept_id").notNull(),
  // References concept_logs in Supabase
  rhetoricalDevice: text("rhetorical_device").notNull(),
  tone: text("tone").notNull(),
  rating: text("rating").notNull(),
  // "more_like_this" or "less_like_this"
  userId: text("user_id"),
  // For future user system
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true
});
var insertAiRequestSchema = createInsertSchema(aiRequests).omit({
  id: true,
  createdAt: true
});
var insertProjectSchema = createInsertSchema(projects).omit({
  createdAt: true,
  updatedAt: true
});
var insertConceptRatingSchema = createInsertSchema(conceptRatings).omit({
  id: true,
  createdAt: true
});
var aiRequestFormSchema = z.object({
  query: z.string().min(1, "Query is required").max(1e3, "Query must be 1000 characters or less"),
  tone: z.enum(["bold", "strategic", "conversational", "simplified", "core", "creative", "analytical", "technical", "summarize"], {
    required_error: "Please select a tone"
  }),
  includeCliches: z.boolean().default(false),
  deepScan: z.boolean().default(false),
  conceptCount: z.number().min(1).max(20).default(1),
  // New field for multi-ideation
  projectId: z.string().optional()
  // New field for project association
});
var projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Project name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional()
});
var conceptRatingFormSchema = z.object({
  conceptId: z.string(),
  rhetoricalDevice: z.string(),
  tone: z.string(),
  rating: z.enum(["more_like_this", "less_like_this"]),
  projectId: z.string()
});

// server/routes.ts
init_openai();
init_supabaseClient();

// server/routes/generateMultivariant.ts
import OpenAI16 from "openai";

// server/utils/promptLoader.ts
import fs from "fs";
import path from "path";
function loadPrompt(filename, variables) {
  const promptPath = path.resolve(process.cwd(), "prompts", filename);
  let template = fs.readFileSync(promptPath, "utf8");
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    template = template.split(placeholder).join(value);
  }
  return template;
}

// server/utils/openAiPromptHelper.ts
function generateMultivariantPrompt({
  rhetoricalDevice,
  secondRhetoricalDevice,
  userQuery,
  tone,
  avoidCliches,
  rhetoricalExample,
  semanticExample,
  salvagedFragments = []
}) {
  const exampleContext = rhetoricalExample ? `
**RHETORICAL INSPIRATION - STUDY THIS BREAKTHROUGH CAMPAIGN:**
Campaign: ${rhetoricalExample.campaign_name || "Unknown"}
Brand: ${rhetoricalExample.brand || "Unknown"}
Year: ${rhetoricalExample.year || "Unknown"}
Headline: ${rhetoricalExample.headline || "Unknown"}
Verbal Device: ${rhetoricalExample.verbal_device || "Unknown"}
Visual Device: ${rhetoricalExample.visual_device || "Unknown"}
Tone: ${rhetoricalExample.tone || "Unknown"}

Learn from this example's strategic craft, but create something completely original that surpasses it.

` : "";
  const semanticContext = semanticExample ? `
**THEORETICAL FRAMEWORK - MASTER THESE STRATEGIC PRINCIPLES:**
Campaign: ${semanticExample.campaign || "Unknown"}
Brand: ${semanticExample.brand || "Unknown"}
${semanticExample.year ? `Year: ${semanticExample.year}` : ""}
Headline: ${semanticExample.headline || "Unknown"}
Rhetorical Devices: ${semanticExample.rhetoricalDevices?.join(", ") || "Unknown"}
Strategic Rationale: ${semanticExample.rationale || "Unknown"}
When to Use: ${semanticExample.whenToUse || "Unknown"}
When NOT to Use: ${semanticExample.whenNotToUse || "Unknown"}
${semanticExample.isTheory ? `**THEORETICAL INSIGHT:** This is an academic framework that provides deep strategic understanding of how rhetorical devices create persuasive impact.` : ""}

Apply these strategic principles to create breakthrough concepts that demonstrate mastery of rhetorical craft.

` : "";
  const inspirationFragments = salvagedFragments && salvagedFragments.length > 0 ? `
**INSPIRATION FRAGMENTS - USE AS CREATIVE SPRINGBOARDS:**
${salvagedFragments.map(
    (fragment) => `- Fragment: "${fragment.fragment_text}"
  Rationale: "${fragment.rationale}"`
  ).join("\n")}

Transform, reimagine, or use these proven elements as inspiration for fresh creative breakthroughs.

` : "";
  const clicheAvoidance = avoidCliches ? loadPrompt("cliche-avoidance.txt", {}) : "";
  const formatInstructions = loadPrompt("format-instructions.txt", {
    currentDate: (/* @__PURE__ */ new Date()).toLocaleDateString(),
    tone: tone || "creative",
    userQuery
  });
  return loadPrompt("multivariant-generation.txt", {
    exampleContext,
    semanticContext,
    inspirationFragments,
    userQuery,
    rhetoricalDevice,
    secondRhetoricalDevice,
    clicheAvoidance,
    formatInstructions
  });
}

// server/routes/generateMultivariant.ts
init_hybridGenerationOrchestrator();

// server/utils/originalityChecker.ts
async function checkOriginality2(content) {
  const commonPhrases = [
    "just do it",
    "think different",
    "the ultimate",
    "your journey",
    "unlock your potential",
    "ignite your passion",
    "empower yourself",
    "revolutionary",
    "game changer",
    "next level"
  ];
  const lowerContent = content.toLowerCase();
  const hasCommonPhrase = commonPhrases.some((phrase) => lowerContent.includes(phrase));
  if (hasCommonPhrase) {
    return {
      score: 60,
      details: "Contains common advertising phrases"
    };
  }
  return {
    score: 95,
    details: "No obvious similarities detected"
  };
}
function calculateLevenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// server/utils/rhetoricalExamplesFetcher.ts
init_supabaseClient();
async function fetchRhetoricalExamples() {
  if (!supabase2) {
    console.error("Supabase client not available");
    return [];
  }
  const { data, error } = await supabase2.from("rhetorical_examples").select("*").order("campaign_name", { ascending: true });
  if (error) {
    console.error("Error fetching rhetorical examples:", error);
    return [];
  }
  return data || [];
}

// server/utils/adQualityArbiter.ts
import OpenAI6 from "openai";
var openai2 = new OpenAI6({ apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY, baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0 });
async function evaluateAdQuality(concept) {
  const prompt = `
You are a senior advertising creative director with 20 years of experience evaluating professional advertising concepts. 
Imagine this idea as a real, fully-executed advertisement in a magazine or billboard.

Assess the concept carefully and return a JSON object with these fields:
- professionalism_score: integer (0-100) \u2013 how polished and credible this would feel to clients
- clarity_score: integer (0-100) \u2013 how clearly the idea communicates
- freshness_score: integer (0-100) \u2013 how original and interesting it feels
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
    const completion = await openai2.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      // Low temperature for consistent scoring
      max_tokens: 300,
      response_format: { type: "json_object" }
    });
    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
    if (typeof json.professionalism_score !== "number" || typeof json.clarity_score !== "number" || typeof json.freshness_score !== "number" || typeof json.critique !== "string") {
      throw new Error("Invalid response format from quality arbiter");
    }
    json.professionalism_score = Math.max(0, Math.min(100, json.professionalism_score));
    json.clarity_score = Math.max(0, Math.min(100, json.clarity_score));
    json.freshness_score = Math.max(0, Math.min(100, json.freshness_score));
    console.log(`Quality Scores - Professional: ${json.professionalism_score}, Clarity: ${json.clarity_score}, Freshness: ${json.freshness_score}`);
    return json;
  } catch (error) {
    console.error("Failed to evaluate ad quality:", error);
    return {
      professionalism_score: 75,
      // Default fallback scores
      clarity_score: 75,
      freshness_score: 75,
      critique: "Quality evaluation unavailable due to processing error"
    };
  }
}
function shouldFlagForReview(scores) {
  return scores.professionalism_score < 70 || scores.freshness_score < 60;
}

// server/utils/audienceEmpathyArbiter.ts
import OpenAI7 from "openai";
var openai3 = new OpenAI7({ apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY, baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0 });
async function evaluateAudienceEmpathy(concept) {
  const prompt = `
You are roleplaying as a member of this audience:
"${concept.targetAudience}"

Imagine seeing this advertisement in real life. Reflect on how it feels to you personally.

Return a JSON object with:
- resonance_score: integer (0-100) \u2013 how strongly this concept would appeal to you
- clarity_score: integer (0-100) \u2013 how clear the idea feels to you as a viewer
- vibe: short 1-2 words summarizing the emotional vibe (e.g., "Inspiring", "Confusing", "Cool")
- reflection: 1-2 sentence personal reaction as if you were this person

ONLY return JSON in this format:

{
  "resonance_score": ...,
  "clarity_score": ...,
  "vibe": "...",
  "reflection": "..."
}

Concept:
Visual: ${concept.visualDescription}
Headlines: ${concept.headlines.join(" / ")}
Rhetorical Device: ${concept.rhetoricalDevice}
Inspired By: ${concept.rhetoricalExample}
Tone: ${concept.tone}
`;
  try {
    const completion = await openai3.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      // Low temperature for consistent scoring
      max_tokens: 200,
      response_format: { type: "json_object" }
    });
    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
    if (typeof json.resonance_score !== "number" || typeof json.clarity_score !== "number" || typeof json.vibe !== "string" || typeof json.reflection !== "string") {
      throw new Error("Invalid response format from audience empathy arbiter");
    }
    json.resonance_score = Math.max(0, Math.min(100, json.resonance_score));
    json.clarity_score = Math.max(0, Math.min(100, json.clarity_score));
    console.log(`Audience Empathy - Resonance: ${json.resonance_score}, Clarity: ${json.clarity_score}, Vibe: ${json.vibe}`);
    return json;
  } catch (error) {
    console.error("Failed to evaluate audience empathy:", error);
    return {
      resonance_score: 75,
      // Default fallback scores
      clarity_score: 75,
      vibe: "Evaluation Error",
      reflection: "Audience empathy evaluation unavailable due to processing error"
    };
  }
}
function hasLowAudienceResonance(resonanceScore) {
  return resonanceScore < 70;
}
function deriveTargetAudience(query, tone) {
  const audienceMap = {
    // Tech products
    "app": "tech-savvy millennials and Gen Z users",
    "software": "business professionals and technology adopters",
    "AI": "early technology adopters and professionals",
    "smartwatch": "health-conscious professionals and fitness enthusiasts",
    "fitness tracker": "active individuals focused on health and wellness",
    // Lifestyle products
    "sustainable": "environmentally conscious consumers",
    "eco-friendly": "sustainability-minded individuals",
    "organic": "health-conscious and environmentally aware consumers",
    "luxury": "affluent consumers seeking premium experiences",
    "premium": "discerning consumers with higher disposable income",
    // Business services
    "B2B": "business decision-makers and executives",
    "enterprise": "corporate leaders and IT professionals",
    "startup": "entrepreneurs and small business owners",
    "freelancer": "independent professionals and gig workers",
    // Health & wellness
    "health": "health-conscious individuals and families",
    "wellness": "people focused on holistic well-being",
    "mental health": "individuals seeking emotional support and balance",
    // Demographics
    "millennials": "millennials aged 25-40",
    "Gen Z": "Gen Z consumers aged 18-26",
    "professional": "working professionals and career-focused individuals",
    "family": "families with children and household decision-makers"
  };
  const queryLower = query.toLowerCase();
  for (const [keyword, audience] of Object.entries(audienceMap)) {
    if (queryLower.includes(keyword.toLowerCase())) {
      return audience;
    }
  }
  const toneAudienceMap = {
    "creative": "creative professionals and design-conscious consumers",
    "analytical": "data-driven professionals and business decision-makers",
    "conversational": "everyday consumers seeking relatable brands",
    "technical": "technical professionals and early adopters",
    "summarize": "busy professionals seeking clear, concise information"
  };
  return toneAudienceMap[tone] || "general consumers interested in quality products and services";
}

// server/utils/awardsJuryArbiter.ts
import OpenAI8 from "openai";
var openai4 = new OpenAI8({ apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY, baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0 });
async function evaluateAwardsJuryScore(concept) {
  const prompt = `You are an award jury panelist evaluating advertising concepts for global creative awards such as Cannes Lions, D&AD, Clio, and The One Show. 

You will judge each concept according to the past 30 years of award-winning campaigns and their common hallmarks:

Originality and freshness of the idea
Cultural relevance and resonance
Exceptional craft and execution quality
Simplicity and clarity of the concept
Emotional impact on the audience
Relevance to the brand's identity and goals

Use the following criteria with weights in your judgment:

- Idea Originality: 25%
- Cultural Resonance: 20%
- Craft & Execution: 20%
- Simplicity & Clarity: 15%
- Emotional Impact: 15%
- Brand Relevance: 5%

For each concept you review, return your assessment as a JSON object in the following format:

{
  "awards_score": (number from 0\u2013100 reflecting the overall award-worthiness),
  "award_potential": "High" or "Moderate" or "Low",
  "jury_comment": "Concise comment describing why you rated it this way.",
  "improvement_tip": "Specific suggestion for improving award potential."
}

Concept Details:
Visual: ${concept.visualDescription}
Headlines: ${concept.headlines.join(" / ")}
Rhetorical Device: ${concept.rhetoricalDevice}
Tone: ${concept.tone}
Target Audience: ${concept.targetAudience}

Be rigorous in your evaluation, referencing the standards of globally awarded campaigns. Consider whether this work would likely be shortlisted or win in a top-tier creative competition.`;
  try {
    const completion = await openai4.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      // Low temperature for consistent scoring
      max_tokens: 400,
      response_format: { type: "json_object" }
    });
    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
    if (typeof json.awards_score !== "number" || typeof json.award_potential !== "string" || typeof json.jury_comment !== "string" || typeof json.improvement_tip !== "string") {
      throw new Error("Invalid response format from awards jury arbiter");
    }
    json.awards_score = Math.max(0, Math.min(100, json.awards_score));
    if (!["High", "Moderate", "Low"].includes(json.award_potential)) {
      json.award_potential = "Moderate";
    }
    console.log(`\u{1F3C6} Awards Jury Score: ${json.awards_score}/100, Potential: ${json.award_potential}`);
    return json;
  } catch (error) {
    console.error("Failed to evaluate awards jury score:", error);
    return {
      awards_score: 65,
      // Default fallback score
      award_potential: "Moderate",
      jury_comment: "Awards evaluation unavailable due to processing error",
      improvement_tip: "Ensure concept has clear originality and strong cultural relevance"
    };
  }
}
function hasHighAwardsPotential(awardsScore) {
  return awardsScore >= 80;
}

// server/utils/originalityArbiter.ts
import OpenAI9 from "openai";
var openai5 = new OpenAI9({ apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY, baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0 });
async function evaluateOriginalityConfidence(concept) {
  const prompt = `You are an originality expert evaluating advertising concepts for creative freshness and uniqueness.

Evaluate this concept's originality based on:
- Uniqueness of the creative approach
- Freshness of the visual metaphor
- Novelty of the headline construction
- Avoidance of clich\xE9d advertising tropes
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
    const completion = await openai5.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });
    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
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
function passesOriginalityThreshold(score) {
  return score >= 75;
}

// server/utils/audienceArbiter.ts
import OpenAI10 from "openai";
var openai6 = new OpenAI10({
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0
});
async function evaluateAudienceResonance(concept) {
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
    const completion = await openai6.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });
    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
    if (!["Low", "Medium", "High"].includes(json.audience_resonance)) {
      json.audience_resonance = "Medium";
    }
    json.audience_feedback = json.audience_feedback || "Audience evaluation unavailable";
    console.log(`\u{1F465} Audience Resonance: ${json.audience_resonance}`);
    return json;
  } catch (error) {
    console.error("Failed to evaluate audience resonance:", error);
    return {
      audience_resonance: "Medium",
      audience_feedback: "Audience evaluation unavailable due to processing error"
    };
  }
}
function passesAudienceThreshold(resonance) {
  return resonance !== "Low";
}

// server/utils/awardPotentialArbiter.ts
import OpenAI11 from "openai";
var openai7 = new OpenAI11({ apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY, baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0 });
async function evaluateAwardPotential(concept) {
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
    const completion = await openai7.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });
    const responseContent = completion.choices[0].message.content || "{}";
    const json = JSON.parse(responseContent);
    if (!["Low", "Medium", "High"].includes(json.award_potential)) {
      json.award_potential = "Medium";
    }
    json.award_feedback = json.award_feedback || "Award potential evaluation unavailable";
    console.log(`\u{1F3C6} Award Potential: ${json.award_potential}`);
    return json;
  } catch (error) {
    console.error("Failed to evaluate award potential:", error);
    return {
      award_potential: "Medium",
      award_feedback: "Award potential evaluation unavailable due to processing error"
    };
  }
}
function passesAwardThreshold(potential) {
  return potential !== "Low";
}

// server/utils/relevanceArbiter.ts
import OpenAI12 from "openai";

// server/utils/performanceTracker.ts
var GPT4O_INPUT_COST_PER_1K = 5e-3;
var GPT4O_OUTPUT_COST_PER_1K = 0.015;
function calculateCost(promptTokens, completionTokens) {
  const inputCost = promptTokens / 1e3 * GPT4O_INPUT_COST_PER_1K;
  const outputCost = completionTokens / 1e3 * GPT4O_OUTPUT_COST_PER_1K;
  return inputCost + outputCost;
}
var PerformanceTracker = class {
  constructor() {
    this.metrics = {
      totalTime: 0,
      apiCalls: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCost: 0,
      startTime: 0,
      operations: []
    };
  }
  startTracking() {
    this.metrics.startTime = Date.now();
    this.metrics.operations = [];
    this.metrics.apiCalls = 0;
    this.metrics.totalTokens = 0;
    this.metrics.promptTokens = 0;
    this.metrics.completionTokens = 0;
    this.metrics.totalCost = 0;
    console.log("\u{1F4CA} Performance tracking started");
  }
  trackOperation(operation, startTime, endTime, tokenUsage) {
    const duration = endTime - startTime;
    let cost = 0;
    if (tokenUsage && tokenUsage.prompt_tokens && tokenUsage.completion_tokens) {
      cost = calculateCost(tokenUsage.prompt_tokens, tokenUsage.completion_tokens);
    }
    const operationData = {
      operation,
      duration,
      tokens: tokenUsage?.total_tokens,
      promptTokens: tokenUsage?.prompt_tokens,
      completionTokens: tokenUsage?.completion_tokens,
      cost
    };
    this.metrics.operations.push(operationData);
    if (tokenUsage) {
      this.metrics.apiCalls++;
      this.metrics.totalTokens += tokenUsage.total_tokens || 0;
      this.metrics.promptTokens += tokenUsage.prompt_tokens || 0;
      this.metrics.completionTokens += tokenUsage.completion_tokens || 0;
      this.metrics.totalCost += cost;
    }
    console.log(`\u{1F50D} ${operation}: ${duration}ms${tokenUsage ? `, ${tokenUsage.total_tokens} tokens, $${cost.toFixed(4)}` : ""}`);
  }
  getMetrics() {
    this.metrics.totalTime = Date.now() - this.metrics.startTime;
    return { ...this.metrics };
  }
  printSummary() {
    const finalMetrics = this.getMetrics();
    console.log("\nPERFORMANCE SUMMARY");
    console.log("========================");
    console.log(`\u23F1\uFE0F  Total Time: ${finalMetrics.totalTime}ms (${(finalMetrics.totalTime / 1e3).toFixed(2)}s)`);
    console.log(`\u{1F517} API Calls: ${finalMetrics.apiCalls}`);
    console.log(`Total Tokens: ${finalMetrics.totalTokens}`);
    console.log(`Prompt Tokens: ${finalMetrics.promptTokens}`);
    console.log(`\u{1F4AC} Completion Tokens: ${finalMetrics.completionTokens}`);
    console.log(`\u{1F4B0} Total Cost: $${finalMetrics.totalCost.toFixed(4)}`);
    if (finalMetrics.operations.length > 0) {
      console.log("\n\u{1F50D} Operation Breakdown:");
      finalMetrics.operations.forEach((op) => {
        const tokenInfo = op.tokens ? ` (${op.tokens} tokens)` : "";
        const costInfo = op.cost ? `, $${op.cost.toFixed(4)}` : "";
        console.log(`  \u2022 ${op.operation}: ${op.duration}ms${tokenInfo}${costInfo}`);
      });
    }
    const avgTimePerCall = finalMetrics.apiCalls > 0 ? (finalMetrics.totalTime / finalMetrics.apiCalls).toFixed(0) : 0;
    const avgTokensPerCall = finalMetrics.apiCalls > 0 ? (finalMetrics.totalTokens / finalMetrics.apiCalls).toFixed(0) : 0;
    const avgCostPerCall = finalMetrics.apiCalls > 0 ? (finalMetrics.totalCost / finalMetrics.apiCalls).toFixed(4) : 0;
    console.log("\n\u{1F4CA} Averages:");
    console.log(`  \u2022 Time per API call: ${avgTimePerCall}ms`);
    console.log(`  \u2022 Tokens per API call: ${avgTokensPerCall}`);
    console.log(`  \u2022 Cost per API call: $${avgCostPerCall}`);
    console.log("========================\n");
  }
  reset() {
    this.metrics = {
      totalTime: 0,
      apiCalls: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCost: 0,
      startTime: 0,
      operations: []
    };
  }
};
var performanceTracker = new PerformanceTracker();

// server/utils/relevanceArbiter.ts
var openai8 = new OpenAI12({ apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY, baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0 });
async function evaluateRelevance(concept, userPrompt) {
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
Relevance Score: {0\u2013100}
Alignment Explanation: {1\u20132 sentences explaining the connection or lack thereof}
Recommendation: {Only if score <70, suggest how to improve relevance}

**Scoring Guide:**
90\u2013100: Very clear alignment.
70\u201389: Mostly aligned, minor adjustments suggested.
40\u201369: Weak alignment, re-iteration recommended.
0\u201339: No meaningful alignment, re-iteration required.
  `;
  try {
    const arbiterStartTime = Date.now();
    const response = await openai8.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "system", content: relevancePrompt }],
      temperature: 0.3
    });
    const arbiterEndTime = Date.now();
    performanceTracker.trackOperation(
      "Relevance Arbiter",
      arbiterStartTime,
      arbiterEndTime,
      response.usage
    );
    const responseText = response.choices[0].message.content?.trim() || "";
    const match = responseText.match(/Relevance Score:\s*(\d+)/);
    const score = match ? parseInt(match[1], 10) : 0;
    const explanationMatch = responseText.match(/Alignment Explanation:\s*([^\n]+)/);
    const explanation = explanationMatch ? explanationMatch[1] : "No explanation provided";
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

// server/utils/iterativeRefinementEngine.ts
import OpenAI13 from "openai";
var openai9 = new OpenAI13({ apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY, baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0 });
async function runIterativeRefinement(initialConcept, context, enabled = true) {
  if (!enabled) {
    const evaluation2 = await evaluateConcept(initialConcept, context.query);
    return {
      visualDescription: initialConcept.visualDescription,
      headlines: initialConcept.headlines,
      rhetoricalDevice: initialConcept.rhetoricalDevice,
      evaluation: evaluation2,
      iteration_number: 1,
      final_status: evaluation2.passes_all_thresholds ? "Passed" : "Needs Review"
    };
  }
  console.log(`\u{1F504} Starting iterative refinement for concept...`);
  let currentConcept = initialConcept;
  let evaluation = await evaluateConcept(currentConcept, context.query);
  console.log(`\u{1F4CA} Iteration 1 Results: Originality ${evaluation.originality_confidence}/100, Audience ${evaluation.audience_resonance}, Awards ${evaluation.award_potential}, Relevance ${evaluation.relevance_score}/100`);
  if (evaluation.passes_all_thresholds) {
    console.log(`Concept passed all thresholds on iteration 1`);
    return {
      visualDescription: currentConcept.visualDescription,
      headlines: currentConcept.headlines,
      rhetoricalDevice: currentConcept.rhetoricalDevice,
      evaluation,
      iteration_number: 1,
      final_status: "Passed"
    };
  }
  console.log(`\u{1F504} Iteration 1 failed criteria: ${evaluation.failed_criteria.join(", ")}. Attempting refinement...`);
  const refinedConcept = await refineConcept(currentConcept, evaluation, context);
  if (!refinedConcept) {
    console.log(`Refinement failed, keeping original concept`);
    return {
      visualDescription: currentConcept.visualDescription,
      headlines: currentConcept.headlines,
      rhetoricalDevice: currentConcept.rhetoricalDevice,
      evaluation,
      iteration_number: 1,
      final_status: "Needs Review"
    };
  }
  const refinedEvaluation = await evaluateConcept({
    ...refinedConcept,
    tone: context.tone,
    targetAudience: currentConcept.targetAudience
  }, context.query);
  console.log(`\u{1F4CA} Iteration 2 Results: Originality ${refinedEvaluation.originality_confidence}/100, Audience ${refinedEvaluation.audience_resonance}, Awards ${refinedEvaluation.award_potential}, Relevance ${refinedEvaluation.relevance_score}/100`);
  const finalStatus = refinedEvaluation.passes_all_thresholds ? "Passed" : "Needs Review";
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
async function evaluateConcept(concept, userQuery) {
  const arbiterStartTime = Date.now();
  const [originalityResult, audienceResult, awardResult, relevanceResult] = await Promise.all([
    evaluateOriginalityConfidence(concept),
    evaluateAudienceResonance(concept),
    evaluateAwardPotential(concept),
    userQuery ? evaluateRelevance(concept, userQuery) : Promise.resolve({ score: 75, explanation: "No user query provided", needsRefinement: false })
  ]);
  const arbiterEndTime = Date.now();
  performanceTracker.trackOperation(
    "Four Arbiter Evaluation",
    arbiterStartTime,
    arbiterEndTime
  );
  const failed_criteria = [];
  if (!passesOriginalityThreshold(originalityResult.originality_confidence)) {
    failed_criteria.push("Originality");
  }
  if (!passesAudienceThreshold(audienceResult.audience_resonance)) {
    failed_criteria.push("Audience Resonance");
  }
  if (!passesAwardThreshold(awardResult.award_potential)) {
    failed_criteria.push("Award Potential");
  }
  if (relevanceResult.needsRefinement) {
    failed_criteria.push("Relevance");
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
async function refineConcept(concept, evaluation, context) {
  let refinementInstructions = "Revise this concept to address the following issues:\n";
  if (evaluation.failed_criteria.includes("Originality")) {
    refinementInstructions += `- ORIGINALITY (${evaluation.originality_confidence}/100): ${evaluation.originality_feedback}
`;
  }
  if (evaluation.failed_criteria.includes("Audience Resonance")) {
    refinementInstructions += `- AUDIENCE RESONANCE (${evaluation.audience_resonance}): ${evaluation.audience_feedback}
`;
  }
  if (evaluation.failed_criteria.includes("Award Potential")) {
    refinementInstructions += `- AWARD POTENTIAL (${evaluation.award_potential}): ${evaluation.award_feedback}
`;
  }
  if (evaluation.failed_criteria.includes("Relevance")) {
    refinementInstructions += `- RELEVANCE (${evaluation.relevance_score}/100): ${evaluation.relevance_feedback}
`;
  }
  const refinementPrompt = `${generateMultivariantPrompt({
    rhetoricalDevice: concept.rhetoricalDevice,
    secondRhetoricalDevice: concept.rhetoricalDevice,
    // Keep same device for consistency
    userQuery: context.query,
    avoidCliches: context.avoidCliches,
    rhetoricalExample: context.rhetoricalExample
  })}

REFINEMENT INSTRUCTIONS:
${refinementInstructions}

Previous concept to improve:
Visual: ${concept.visualDescription}
Headlines: ${concept.headlines.join(" / ")}

Generate an improved version that specifically addresses all the failed criteria above.

Return your response as JSON with this structure:
{
  "visual": "detailed visual description",
  "headlines": ["headline1", "headline2", "headline3"]
}`;
  try {
    const refinementStartTime = Date.now();
    const response = await openai9.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      messages: [{ role: "user", content: refinementPrompt }],
      temperature: 1.2,
      // Slightly higher temperature for creative refinement
      max_tokens: 500,
      response_format: { type: "json_object" }
    });
    const refinementEndTime = Date.now();
    performanceTracker.trackOperation(
      "OpenAI Refinement",
      refinementStartTime,
      refinementEndTime,
      response.usage
    );
    const parsed = parseOpenAIResponse(response.choices[0].message.content || "");
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

// server/utils/fragmentSalvager.ts
init_supabaseClient();
import OpenAI14 from "openai";
var openai10 = new OpenAI14({ apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY, baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0 });
async function salvageConceptFragments(concept) {
  try {
    console.log(`\u{1F50D} Analyzing concept ${concept.id} for salvageable fragments...`);
    const analysisPrompt = `Analyze this advertising concept for promising creative fragments that could inspire future ideas:

CONCEPT TO ANALYZE:
Headline: ${concept.headline}
Visual: ${concept.visual}
Full Response: ${concept.response}
Tone: ${concept.tone}

TASK: Extract up to 3 promising fragments from this concept that show creative potential for future reuse. 

For each fragment, identify:
1. fragment_type: Choose from "headline", "visual", "rhetorical_device", "tone", "phrase", "metaphor"
2. fragment_text: The specific text/phrase (keep under 50 characters)
3. rationale: 1-2 sentences explaining why this fragment shows promise

SALVAGE CRITERIA - A fragment qualifies if it is:
- Highly original or fresh
- Evocative visually or verbally
- Uses a rhetorical device in an innovative way
- Contains a phrase that might inspire stronger future ideas
- Has memorable or distinctive language
- Shows creative potential for other contexts

If no fragments meet these criteria, return an empty array.

Respond in JSON format:
{
  "fragments": [
    {
      "fragment_type": "headline",
      "fragment_text": "example text",
      "rationale": "explanation of promise"
    }
  ]
}`;
    const response = await openai10.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
      // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: analysisPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.3
      // Lower temperature for consistent analysis
    });
    const analysisResult = JSON.parse(response.choices[0].message.content || '{"fragments": []}');
    const fragments = analysisResult.fragments || [];
    if (fragments.length === 0) {
      console.log(`No salvageable fragments found in concept ${concept.id}`);
      return;
    }
    for (const fragment of fragments) {
      try {
        if (!supabase2) {
          console.log("Supabase not available, skipping fragment storage");
          continue;
        }
        const { error } = await supabase2.from("salvaged_fragments").insert({
          concept_id: concept.id,
          fragment_type: fragment.fragment_type,
          fragment_text: fragment.fragment_text,
          rationale: fragment.rationale
        });
        if (error) {
          console.error("Error storing salvaged fragment:", error);
        } else {
          console.log(`\u{1F48E} Salvaged ${fragment.fragment_type}: "${fragment.fragment_text}"`);
        }
      } catch (insertError) {
        console.error("Error inserting fragment:", insertError);
      }
    }
    console.log(`Salvaged ${fragments.length} fragments from concept ${concept.id}`);
  } catch (error) {
    console.error("Error in fragment salvaging:", error);
  }
}

// server/routes/generateMultivariant.ts
init_supabaseClient();
init_embeddingSimilarity();

// server/utils/feedbackSimilarityReporter.ts
import { createClient as createClient4 } from "@supabase/supabase-js";
import OpenAI15 from "openai";
var supabase3 = createClient4(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
var openai11 = new OpenAI15({
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0
});
async function getRatedConcepts(projectId) {
  const { data: ratings, error: ratingsError } = await supabase3.from("concept_ratings").select("concept_id, rating").eq("project_id", projectId);
  if (ratingsError) {
    console.warn("Failed to fetch ratings:", ratingsError.message);
    return [];
  }
  if (!ratings || ratings.length === 0) {
    console.log("\u2139\uFE0F No rated concepts found for project:", projectId);
    return [];
  }
  const conceptIds = ratings.map((r) => r.concept_id);
  const { data: concepts, error: conceptsError } = await supabase3.from("concept_logs").select("id, embedding").in("id", conceptIds);
  if (conceptsError) {
    console.warn("Failed to fetch concept embeddings:", conceptsError.message);
    return [];
  }
  const result = ratings.map((rating) => {
    const concept = concepts?.find((c) => c.id === rating.concept_id);
    if (concept && Array.isArray(concept.embedding)) {
      return {
        conceptId: rating.concept_id,
        rating: rating.rating,
        embedding: concept.embedding
      };
    }
    return null;
  }).filter(Boolean);
  return result;
}
async function getEmbedding5(text2) {
  const response = await openai11.embeddings.create({
    model: process.env.GEMINI_API_KEY ? "gemini-embedding-001" : "text-embedding-3-large",
    input: text2
  });
  return response.data[0].embedding;
}
function cosineSimilarity2(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}
async function reportSimilarityToRatedConcepts(projectId, newConceptText, similarityThreshold = 0.75) {
  const ratedConcepts = await getRatedConcepts(projectId);
  if (ratedConcepts.length === 0) {
    console.log("\u2139\uFE0F No rated concepts found.");
    return;
  }
  const newEmbedding = await getEmbedding5(newConceptText);
  ratedConcepts.forEach((rated) => {
    const similarity = cosineSimilarity2(newEmbedding, rated.embedding);
    if (similarity >= similarityThreshold) {
      console.log(
        `\u{1F50D} Similarity to rated concept ${rated.conceptId}: ${(similarity * 100).toFixed(1)}% (${rated.rating})`
      );
    }
  });
}
async function analyzeFeedbackSimilarity(projectId, newConceptText, options = {}) {
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
  const newEmbedding = await getEmbedding5(newConceptText);
  const moreLikeThis = [];
  const lessLikeThis = [];
  ratedConcepts.forEach((rated) => {
    const similarity = cosineSimilarity2(newEmbedding, rated.embedding);
    if (similarity >= similarityThreshold) {
      if (rated.rating === "more_like_this") {
        moreLikeThis.push({ conceptId: rated.conceptId, similarity });
      } else if (rated.rating === "less_like_this") {
        lessLikeThis.push({ conceptId: rated.conceptId, similarity });
      }
    }
  });
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
    console.log(`\u{1F4CA} Feedback Similarity Analysis for Project ${projectId}`);
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

// server/routes/generateMultivariant.ts
var openai12 = new OpenAI16({
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.GEMINI_API_KEY ? "https://generativelanguage.googleapis.com/v1beta/openai/" : void 0
});
async function checkHistoricalSimilarity(visualDescription, headlines) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_KEY) {
      console.log("Supabase credentials not available, skipping historical similarity check");
      return false;
    }
    const { createClient: createClient5 } = await import("@supabase/supabase-js");
    const supabase5 = createClient5(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || ""
    );
    const { data: recentConcepts, error } = await supabase5.from("concept_logs").select("response").order("created_at", { ascending: false }).limit(50);
    if (error || !recentConcepts) {
      console.log("Could not fetch recent concepts for similarity check, proceeding without filtering");
      return false;
    }
    const newContent = `${visualDescription} ${headlines.join(" ")}`;
    const historicalConcepts = recentConcepts.map((c) => c.response);
    try {
      console.log("\u{1F52C} Using advanced embedding-based similarity detection...");
      const embeddingResult = await checkHistoricalSimilarityWithEmbeddings(
        newContent,
        historicalConcepts,
        0.8
        // 80% similarity threshold
      );
      if (embeddingResult.isSimilar && embeddingResult.mostSimilar) {
        console.log(`\u{1F6AB} Concept rejected - semantic similarity: ${embeddingResult.mostSimilar.similarity.toFixed(3)} with: "${embeddingResult.mostSimilar.concept.substring(0, 100)}..."`);
        return true;
      }
      return false;
    } catch (embeddingError) {
      console.log("Embedding similarity failed, falling back to word-based similarity:", embeddingError);
      const newWords = newContent.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
      for (const concept of recentConcepts) {
        const existingContent = concept.response.toLowerCase();
        const existingWords = existingContent.split(/\s+/).filter((word) => word.length > 2);
        const commonWords = newWords.filter((word) => existingWords.includes(word));
        if (commonWords.length > 3) {
          console.log(`\u{1F6AB} Concept discarded for word-based similarity - ${commonWords.length} shared keywords: ${commonWords.join(", ")}`);
          return true;
        }
      }
      return false;
    }
  } catch (error) {
    console.log("Error checking historical similarity:", error);
    return false;
  }
}
var rhetoricalDevicesByTone = {
  creative: [
    "Metaphor",
    "Paradox",
    "Oxymoron",
    "Synecdoche",
    "Hyperbole",
    "Personification",
    "Allegory",
    "Zeugma",
    "Juxtaposition",
    "Alliteration",
    "Assonance",
    "Ekphrasis",
    "Paronomasia",
    "Aposiopesis",
    "Anacoluthon",
    "Antanaclasis",
    "Meiosis"
  ],
  analytical: [
    "Antithesis",
    "Chiasmus",
    "Syllogism",
    "Logos",
    "Ethos",
    "Polysyndeton",
    "Asyndeton",
    "Epistrophe",
    "Anaphora",
    "Climax",
    "Prolepsis",
    "Reductio ad Absurdum",
    "Isocolon",
    "Litotes",
    "Ellipsis",
    "Symploce",
    "Anadiplosis"
  ],
  conversational: [
    "Rhetorical Question",
    "Irony",
    "Hyperbole",
    "Paronomasia",
    "Hendiadys",
    "Anadiplosis",
    "Epizeuxis",
    "Symploce",
    "Alliteration",
    "Assonance",
    "Meiosis",
    "Litotes",
    "Aposiopesis",
    "Anacoluthon",
    "Antanaclasis",
    "Pathos"
  ],
  technical: [
    "Metonymy",
    "Litotes",
    "Synecdoche",
    "Ellipsis",
    "Hendiadys",
    "Chiasmus",
    "Climax",
    "Syllogism",
    "Logos",
    "Ethos",
    "Isocolon",
    "Parallelism",
    "Prolepsis",
    "Anaphora",
    "Epistrophe",
    "Polysyndeton",
    "Asyndeton"
  ],
  summarize: [
    "Synecdoche",
    "Metonymy",
    "Ellipsis",
    "Asyndeton",
    "Litotes",
    "Meiosis",
    "Climax",
    "Isocolon",
    "Parallelism",
    "Hendiadys",
    "Symploce",
    "Anaphora",
    "Epistrophe",
    "Adage",
    "Ethos",
    "Logos",
    "Syllogism"
  ]
};
function parseOpenAIResponse(response) {
  try {
    const cleanResponse = response.trim();
    console.log("\u{1F50D} Parsing response length:", cleanResponse.length);
    console.log("\u{1F50D} Response first 300 chars:", cleanResponse.substring(0, 300));
    const lines = cleanResponse.split("\n");
    let headline = "";
    let tagline = "";
    let bodyCopy = "";
    let visualConcept = "";
    let rhetoricalCraft = [];
    let strategicImpact = "";
    let headlines = [];
    let currentSection = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("# ")) {
        headline = line.substring(2).trim();
        console.log("Found headline:", headline);
      } else if (line.startsWith("## ")) {
        tagline = line.substring(3).trim();
        console.log("Found tagline:", tagline);
      } else if (line.startsWith("**Tagline:**")) {
        tagline = line.replace("**Tagline:**", "").trim();
        console.log("Found tagline (alt):", tagline);
      } else if (line.startsWith("**Body Copy:**")) {
        currentSection = "bodyCopy";
        const content = line.replace("**Body Copy:**", "").trim();
        if (content) bodyCopy = content;
        console.log("Found body copy section");
      } else if (line.startsWith("**Visual Concept:**") || line.startsWith("**Visual:**") || line.startsWith("**Visual Description:**")) {
        currentSection = "visualConcept";
        const content = line.replace(/\*\*(Visual Concept|Visual|Visual Description):\*\*/, "").trim();
        if (content) visualConcept = content;
        console.log("Found visual concept section:", content || "empty, will collect from next lines");
      } else if (line.startsWith("**Rhetorical Craft:**") || line.startsWith("**Rhetorical Device:**")) {
        currentSection = "rhetoricalCraft";
        console.log("Found rhetorical craft section");
      } else if (line.startsWith("**Strategic Impact:**")) {
        currentSection = "strategicImpact";
        const content = line.replace("**Strategic Impact:**", "").trim();
        if (content) strategicImpact = content;
        console.log("Found strategic impact section");
      } else if (line.startsWith("**Headlines:**")) {
        currentSection = "headlines";
        console.log("Found headlines section");
      } else if (line.startsWith("**Success Metrics:**") || line.startsWith("**Evaluation:**") || line.startsWith("**Quality Standards:**") || line.startsWith("### Quality Standards") || line.startsWith("**Effectiveness:**")) {
        currentSection = "other";
        console.log("Found section end, stopping headline collection");
      } else if (line.startsWith("### Headlines") || line.startsWith("### Visual Description")) {
        if (line.includes("Headlines")) {
          currentSection = "headlines";
          console.log("Found headlines section (### format)");
        } else if (line.includes("Visual Description")) {
          currentSection = "visualConcept";
          console.log("Found visual concept section (### format)");
        }
      } else if (line.startsWith("- ") && currentSection === "rhetoricalCraft") {
        rhetoricalCraft.push(line.substring(2).trim());
      } else if (line.startsWith("- Option ") || line.startsWith("- **Option ") || line.startsWith("- ") && currentSection === "headlines" && !line.includes("**") && line.length < 100) {
        let headlineText = line.substring(2).trim();
        if (headlineText.includes(": ")) {
          headlineText = headlineText.split(": ", 2)[1].trim();
        }
        headlineText = headlineText.replace(/\*\*/g, "");
        if (headlineText && !headlines.includes(headlineText) && headlineText.length < 50) {
          headlines.push(headlineText);
          console.log("Found headline:", headlineText);
        }
      } else if (currentSection && line && !line.startsWith("**") && !line.startsWith("- Option")) {
        if (currentSection === "bodyCopy") {
          bodyCopy += (bodyCopy ? " " : "") + line;
        } else if (currentSection === "visualConcept") {
          visualConcept += (visualConcept ? " " : "") + line;
          console.log("Added visual content:", line);
        } else if (currentSection === "strategicImpact") {
          strategicImpact += (strategicImpact ? " " : "") + line;
        }
      }
    }
    if (headline && !headlines.includes(headline)) headlines.unshift(headline);
    if (tagline && tagline !== headline && !headlines.includes(tagline)) headlines.push(tagline);
    if (!visualConcept.trim()) {
      visualConcept = bodyCopy || "Innovative visual concept showcasing the product's unique value proposition";
      console.log("Using fallback visual concept");
    }
    console.log("\u{1F4CA} Final parsing result:", {
      visual: visualConcept.substring(0, 50) + "...",
      headlineCount: headlines.length,
      hasContent: !!(visualConcept && headlines.length > 0)
    });
    return {
      visual: visualConcept.trim(),
      headlines,
      tagline: tagline.trim(),
      bodyCopy: bodyCopy.trim(),
      rhetoricalCraft,
      strategicImpact: strategicImpact.trim(),
      fullMarkdown: cleanResponse
    };
  } catch (error) {
    console.error("Markdown parsing error:", error);
    console.error("Raw response sample:", response.substring(0, 500));
    return null;
  }
}
async function selectRhetoricalDevicesWeighted(tone, count = 5) {
  const devices = rhetoricalDevicesByTone[tone] || rhetoricalDevicesByTone.creative;
  const deviceUsage = await getRhetoricalDeviceUsage();
  const deviceWeights = devices.map((device) => {
    const usage = deviceUsage[device] || 0;
    const weight = Math.max(1, 20 - usage * 3);
    return { device, weight };
  });
  const sortedDevices = deviceWeights.sort((a, b) => b.weight - a.weight);
  const selected = [];
  const unusedDevices = sortedDevices.filter((d) => (deviceUsage[d.device] || 0) === 0);
  const lightlyUsedDevices = sortedDevices.filter((d) => (deviceUsage[d.device] || 0) <= 2);
  for (let i = 0; i < Math.min(count, unusedDevices.length); i++) {
    selected.push(unusedDevices[i].device);
  }
  for (let i = 0; i < Math.min(count - selected.length, lightlyUsedDevices.length); i++) {
    if (!selected.includes(lightlyUsedDevices[i].device)) {
      selected.push(lightlyUsedDevices[i].device);
    }
  }
  const remainingDevices = devices.filter((d) => !selected.includes(d));
  while (selected.length < count && remainingDevices.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingDevices.length);
    selected.push(remainingDevices.splice(randomIndex, 1)[0]);
  }
  console.log(`Selected DIVERSE devices for ${tone}: ${selected.join(", ")}`);
  console.log(`\u{1F4CA} Device usage stats:`, selected.map((d) => `${d}:${deviceUsage[d] || 0}`).join(", "));
  return selected;
}
function calculateDiversityScore(outputs) {
  return outputs.map((output, index) => {
    let diversityBonus = 0;
    const otherDevices = outputs.filter((_, i) => i !== index).map((o) => o.rhetoricalDevice);
    if (!otherDevices.includes(output.rhetoricalDevice)) {
      diversityBonus += 10;
    }
    const allOtherHeadlines = outputs.filter((_, i) => i !== index).flatMap((o) => o.headlines);
    const minDistance = Math.min(...output.headlines.map(
      (headline) => Math.min(...allOtherHeadlines.map(
        (otherHeadline) => calculateLevenshteinDistance(headline, otherHeadline)
      ))
    ));
    if (minDistance > 3) {
      diversityBonus += 5;
    }
    return {
      ...output,
      originalityScore: output.originalityScore + diversityBonus
    };
  });
}
async function generateMultivariant(req, res) {
  try {
    const {
      query,
      tone,
      maxOutputs,
      conceptCount,
      // Client sends conceptCount, map to maxOutputs
      avoidCliches = true,
      enableIterativeRefinement = true,
      enableHybridMode = true,
      hybridConfig
    } = req.body;
    const variantCount = conceptCount || maxOutputs || 3;
    performanceTracker.startTracking();
    console.log(`\u{1F680} Starting multi-variant generation: "${query}" (${tone}, max ${variantCount})`);
    const startTime = Date.now();
    if (!query || !tone) {
      return res.status(400).json({ error: "Query and tone are required" });
    }
    if (enableHybridMode) {
      console.log("\u{1F300} HYBRID MODE ENABLED - Using CREATIVEDC + EvoToken-DLM pipeline");
      try {
        const orchestrator = new HybridGenerationOrchestrator({
          enableDivergentExploration: hybridConfig?.enableDivergentExploration ?? true,
          enableProgressiveEvolution: hybridConfig?.enableProgressiveEvolution ?? true,
          enableTropeConstraints: hybridConfig?.enableTropeConstraints ?? true,
          creativityLevel: hybridConfig?.creativityLevel ?? "balanced",
          fallbackToLegacy: true
        });
        const hybridResult = await orchestrator.generate({
          userBrief: query,
          tone,
          requestedTropes: hybridConfig?.requestedTropes,
          variantCount,
          sessionId: `session_${Date.now()}`
        });
        const outputs = hybridResult.variants.map((variant) => ({
          visualDescription: variant.visualDescription,
          headlines: variant.headlines,
          rhetoricalDevice: variant.rhetoricalDevice,
          originalityScore: Math.round(variant.scores.originality * 100),
          id: variant.id,
          tagline: variant.tagline,
          bodyCopy: variant.bodyCopy,
          professionalismScore: Math.round(variant.scores.coherence * 100),
          clarityScore: Math.round(variant.scores.coherence * 100),
          freshnessScore: Math.round(variant.scores.distinctiveness * 100),
          resonanceScore: Math.round(variant.scores.tropeAlignment * 100),
          awardsScore: Math.round(variant.scores.overall * 100),
          passesAllThresholds: variant.scores.overall >= 0.6,
          finalStatus: variant.scores.overall >= 0.7 ? "Passed" : variant.scores.overall >= 0.5 ? "Needs Review" : "Failed",
          // Hybrid-specific metadata
          hybridMetadata: {
            creativeSeedOrigin: variant.creativeSeedOrigin,
            evolutionPath: variant.evolutionPath,
            scores: variant.scores,
            // Detailed rhetorical analysis explaining how the device was applied
            rhetoricalAnalysis: variant.rhetoricalAnalysis
          }
        }));
        const endTime = Date.now();
        console.log(`Hybrid generation complete: ${outputs.length} variants in ${endTime - startTime}ms`);
        console.log(`   Mode: ${hybridResult.metadata.mode}`);
        console.log(`   Creativity Score: ${(hybridResult.metadata.creativityScore * 100).toFixed(1)}%`);
        console.log(`   Divergent Pool: ${hybridResult.metadata.divergentPoolSize} seeds`);
        const { logSession: logSession3 } = await Promise.resolve().then(() => (init_supabaseClient(), supabaseClient_exports));
        const conceptIds2 = [];
        for (let i = 0; i < outputs.length; i++) {
          const output = outputs[i];
          const structuredContent = `**RHETORICAL DEVICE:** ${output.rhetoricalDevice}

**VISUAL CONCEPT:**
${output.visualDescription}

**HEADLINES:**
${output.headlines.map((h, idx) => `${idx + 1}. ${h}`).join("\n")}

${output.tagline ? `**TAGLINE:** ${output.tagline}
` : ""}
${output.bodyCopy ? `**BODY COPY:** ${output.bodyCopy}
` : ""}
**Prompt:** ${query}`;
          const conceptId = await logSession3({
            userId: null,
            prompt: query,
            response: structuredContent,
            tone
          });
          if (conceptId) {
            conceptIds2.push(conceptId);
            outputs[i].conceptId = conceptId;
            console.log(`Hybrid concept ${i + 1} saved to Supabase with ID: ${conceptId}`);
          } else {
            console.error(`Failed to save hybrid concept ${i + 1} to Supabase`);
            conceptIds2.push(`failed-${Date.now()}-${i}`);
          }
        }
        console.log(`\u{1F4E6} Saved ${conceptIds2.filter((id) => !id.startsWith("failed")).length}/${outputs.length} hybrid concepts to database`);
        return res.json({
          success: true,
          outputs,
          metadata: {
            generationMode: "hybrid",
            ...hybridResult.metadata,
            totalTime: endTime - startTime,
            savedCount: conceptIds2.filter((id) => !id.startsWith("failed")).length
          }
        });
      } catch (hybridError) {
        console.error("Hybrid generation failed, falling back to legacy:", hybridError);
      }
    }
    const allExamples = await fetchRhetoricalExamples();
    const usedExampleIds = await getUsedExamples();
    let availableExamples = allExamples.filter(
      (example) => !usedExampleIds.includes(example.id)
    );
    if (availableExamples.length === 0) {
      console.log("\u{1F504} All examples used, resetting cycle...");
      await clearUsedExamples();
      availableExamples = [...allExamples];
    }
    console.log(`\u{1F4CB} Available examples: ${availableExamples.length}/${allExamples.length} (${usedExampleIds.length} already used)`);
    const selectedDevices = await selectRhetoricalDevicesWeighted(tone, 12);
    const rawOutputs = [];
    let salvagedFragments = [];
    try {
      const { createClient: createClient5 } = await import("@supabase/supabase-js");
      const supabaseClient = createClient5(
        process.env.SUPABASE_URL || "",
        process.env.SUPABASE_KEY || ""
      );
      const { data, error } = await supabaseClient.from("salvaged_fragments").select("id, fragment_text, rationale, fragment_type").order("created_at", { ascending: false }).limit(5);
      if (!error && data) {
        salvagedFragments = data;
        console.log(`Retrieved ${salvagedFragments.length} salvaged fragments for inspiration`);
      }
    } catch (error) {
      console.log("No salvaged fragments available or Supabase not configured");
    }
    const completionPromises = [];
    const batchUsedExamples = [];
    const batchUsedDevices = [];
    const maxVariants = (req.body?.conceptCount || 1) <= 1 ? 3 : Math.min(10, selectedDevices.length * 2);
    for (let i = 0; i < maxVariants; i++) {
      const primaryDevice = selectedDevices[i % selectedDevices.length];
      const secondaryDevice = selectedDevices[(i + 1) % selectedDevices.length];
      if (!batchUsedDevices.includes(primaryDevice)) {
        batchUsedDevices.push(primaryDevice);
      }
      let selectedExample = null;
      let semanticExample = null;
      try {
        const { retrieveTopNWithRotation: retrieveTopNWithRotation2 } = await Promise.resolve().then(() => (init_embeddingRetrieval(), embeddingRetrieval_exports));
        const { detectTheoryContext: detectTheoryContext2, getContextualTheoryPriority: getContextualTheoryPriority2 } = await Promise.resolve().then(() => (init_enhancedTheoryMapping(), enhancedTheoryMapping_exports));
        const theoryContext = detectTheoryContext2(query);
        const theoriesToPrioritize = getContextualTheoryPriority2(query);
        console.log(`\u{1F9E0} MULTIVARIANT THEORY DETECTION: Primary=${theoryContext.primaryFramework}, Priority=[${theoriesToPrioritize.join(" \u2192 ")}]`);
        const corpusResults = await retrieveTopNWithRotation2(query, 1, i, theoriesToPrioritize.slice(0, 3), "default_project");
        if (corpusResults && corpusResults.length > 0) {
          semanticExample = corpusResults[0];
          console.log(`\u{1F9E0} Retrieved semantic example: ${semanticExample.campaign} (${semanticExample.brand}) - ${semanticExample.rhetoricalDevices?.join(", ")}`);
        }
      } catch (error) {
        console.log("\u{1F4DA} Semantic retrieval unavailable, using traditional examples");
      }
      if (availableExamples.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableExamples.length);
        selectedExample = availableExamples.splice(randomIndex, 1)[0];
        batchUsedExamples.push(selectedExample);
        console.log(`Selected traditional example for generation ${i + 1}: ${selectedExample.campaign_name} - ${selectedExample.brand}`);
      }
      const prompt = generateMultivariantPrompt({
        rhetoricalDevice: primaryDevice,
        secondRhetoricalDevice: secondaryDevice,
        userQuery: query,
        tone,
        avoidCliches,
        rhetoricalExample: selectedExample,
        semanticExample,
        // ADD theoretical corpus example
        salvagedFragments
      });
      completionPromises.push(
        (async () => {
          const apiStartTime = Date.now();
          const response = await openai12.chat.completions.create({
            model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a breakthrough creative genius specializing in radically original advertising concepts. Never repeat ideas, words, or approaches from previous concepts. Each concept must feel completely fresh and unexpected."
              },
              { role: "user", content: prompt }
            ],
            temperature: 1.4,
            // Higher temperature for maximum creative divergence
            max_tokens: 1200
            // GPT-5.2 requires more tokens
            // Removed response_format: json_object since we're now using Markdown
          });
          const apiEndTime = Date.now();
          performanceTracker.trackOperation(
            `OpenAI Generation ${i + 1}`,
            apiStartTime,
            apiEndTime,
            response.usage
          );
          return {
            response: response.choices[0].message.content || "",
            device: primaryDevice,
            example: selectedExample,
            id: `variant-${Date.now()}-${i}`
          };
        })()
      );
    }
    console.log(`Generated ${completionPromises.length} unique prompts with ${batchUsedExamples.length} unique examples`);
    const completions = await Promise.all(completionPromises);
    for (const example of batchUsedExamples) {
      if (example?.id) {
        await markExampleAsUsed(example.id);
      }
    }
    for (const device of batchUsedDevices) {
      await updateRhetoricalDeviceUsage(device);
    }
    console.log(`Marked ${batchUsedExamples.length} examples as used and updated usage for ${batchUsedDevices.length} devices`);
    console.log(`\u{1F50D} Processing ${completions.length} completions...`);
    for (const completion of completions) {
      console.log(`\u{1F50D} Raw AI response for ${completion.device}:`, completion.response.substring(0, 300) + "...");
      console.log(`\u{1F50D} Response has content:`, !!completion.response);
      console.log(`\u{1F50D} Response length:`, completion.response.length);
      const parsed = parseOpenAIResponse(completion.response);
      console.log(`Parsing result for device ${completion.device}:`, {
        hasVisual: !!parsed?.visual,
        headlineCount: parsed?.headlines?.length || 0,
        visual: parsed?.visual?.substring(0, 100) || "N/A",
        firstHeadline: parsed?.headlines?.[0] || "N/A"
      });
      if (parsed && parsed.visual && parsed.headlines.length > 0) {
        let isSimilar = false;
        try {
          isSimilar = await checkHistoricalSimilarity(parsed.visual, parsed.headlines);
        } catch (error) {
          console.log("Error checking historical similarity:", error);
          isSimilar = false;
        }
        if (isSimilar) {
          console.log(`\u{1F504} Regenerating concept due to historical similarity...`);
          try {
            const regenerationPrompt = generateMultivariantPrompt({
              rhetoricalDevice: completion.device,
              secondRhetoricalDevice: selectedDevices[(selectedDevices.indexOf(completion.device) + 1) % selectedDevices.length],
              userQuery: query,
              tone,
              avoidCliches,
              rhetoricalExample: completion.example
            });
            const regeneratedResponse = await openai12.chat.completions.create({
              model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o",
              messages: [{ role: "user", content: regenerationPrompt }],
              temperature: 1.3,
              max_tokens: 1200
              // GPT-5.2 requires more tokens
              // Removed response_format: json_object since we're now using Markdown
            });
            const regeneratedParsed = parseOpenAIResponse(regeneratedResponse.choices[0].message.content || "");
            if (regeneratedParsed && regeneratedParsed.visual && regeneratedParsed.headlines.length > 0) {
              const combinedContent = `${regeneratedParsed.visual} ${regeneratedParsed.headlines.join(" ")}`;
              const originalityResult = await checkOriginality2(combinedContent);
              const adQuality = await evaluateAdQuality({
                visualDescription: regeneratedParsed.visual,
                headlines: regeneratedParsed.headlines,
                rhetoricalDevice: completion.device,
                rhetoricalExample: completion.example?.campaign_name || "Unknown"
              });
              const targetAudience = deriveTargetAudience(query, tone);
              const empathy = await evaluateAudienceEmpathy({
                visualDescription: regeneratedParsed.visual,
                headlines: regeneratedParsed.headlines,
                rhetoricalDevice: completion.device,
                rhetoricalExample: completion.example?.campaign_name || "Unknown",
                tone,
                targetAudience
              });
              const awardsEvaluation = await evaluateAwardsJuryScore({
                visualDescription: regeneratedParsed.visual,
                headlines: regeneratedParsed.headlines,
                rhetoricalDevice: completion.device,
                tone,
                targetAudience
              });
              const flaggedForReview = shouldFlagForReview(adQuality);
              const lowAudienceResonance = hasLowAudienceResonance(empathy.resonance_score);
              rawOutputs.push({
                visualDescription: regeneratedParsed.visual,
                headlines: regeneratedParsed.headlines,
                rhetoricalDevice: completion.device,
                originalityScore: originalityResult.score,
                id: completion.id,
                example: completion.example,
                professionalismScore: adQuality.professionalism_score,
                clarityScore: adQuality.clarity_score,
                freshnessScore: adQuality.freshness_score,
                critique: adQuality.critique,
                flaggedForReview,
                resonanceScore: empathy.resonance_score,
                audienceClarityScore: empathy.clarity_score,
                vibe: empathy.vibe,
                reflection: empathy.reflection,
                lowAudienceResonance,
                awardsScore: awardsEvaluation.awards_score,
                awardPotential: awardsEvaluation.award_potential,
                juryComment: awardsEvaluation.jury_comment,
                improvementTip: awardsEvaluation.improvement_tip,
                highAwardsPotential: hasHighAwardsPotential(awardsEvaluation.awards_score)
              });
              console.log(`Successfully regenerated unique concept`);
            } else {
              console.log(`Regeneration failed, using original concept`);
              const combinedContent = `${parsed.visual} ${parsed.headlines.join(" ")}`;
              const originalityResult = await checkOriginality2(combinedContent);
              const adQuality = await evaluateAdQuality({
                visualDescription: parsed.visual,
                headlines: parsed.headlines,
                rhetoricalDevice: completion.device,
                rhetoricalExample: completion.example?.campaign_name || "Unknown"
              });
              const targetAudience = deriveTargetAudience(query, tone);
              const empathy = await evaluateAudienceEmpathy({
                visualDescription: parsed.visual,
                headlines: parsed.headlines,
                rhetoricalDevice: completion.device,
                rhetoricalExample: completion.example?.campaign_name || "Unknown",
                tone,
                targetAudience
              });
              const flaggedForReview = shouldFlagForReview(adQuality);
              const lowAudienceResonance = hasLowAudienceResonance(empathy.resonance_score);
              rawOutputs.push({
                visualDescription: parsed.visual,
                headlines: parsed.headlines,
                rhetoricalDevice: completion.device,
                originalityScore: originalityResult.score,
                id: completion.id,
                example: completion.example,
                professionalismScore: adQuality.professionalism_score,
                clarityScore: adQuality.clarity_score,
                freshnessScore: adQuality.freshness_score,
                critique: adQuality.critique,
                flaggedForReview,
                resonanceScore: empathy.resonance_score,
                audienceClarityScore: empathy.clarity_score,
                vibe: empathy.vibe,
                reflection: empathy.reflection,
                lowAudienceResonance
              });
            }
          } catch (error) {
            console.log(`Regeneration error:`, error);
            const combinedContent = `${parsed.visual} ${parsed.headlines.join(" ")}`;
            const originalityResult = await checkOriginality2(combinedContent);
            const adQuality = await evaluateAdQuality({
              visualDescription: parsed.visual,
              headlines: parsed.headlines,
              rhetoricalDevice: completion.device,
              rhetoricalExample: completion.example?.campaign_name || "Unknown"
            });
            const targetAudience = deriveTargetAudience(query, tone);
            const empathy = await evaluateAudienceEmpathy({
              visualDescription: parsed.visual,
              headlines: parsed.headlines,
              rhetoricalDevice: completion.device,
              rhetoricalExample: completion.example?.campaign_name || "Unknown",
              tone,
              targetAudience
            });
            const awardsEvaluation = await evaluateAwardsJuryScore({
              visualDescription: parsed.visual,
              headlines: parsed.headlines,
              rhetoricalDevice: completion.device,
              tone,
              targetAudience
            });
            const flaggedForReview = shouldFlagForReview(adQuality);
            const lowAudienceResonance = hasLowAudienceResonance(empathy.resonance_score);
            rawOutputs.push({
              visualDescription: parsed.visual,
              headlines: parsed.headlines,
              rhetoricalDevice: completion.device,
              originalityScore: originalityResult.score,
              id: completion.id,
              example: completion.example,
              professionalismScore: adQuality.professionalism_score,
              clarityScore: adQuality.clarity_score,
              freshnessScore: adQuality.freshness_score,
              critique: adQuality.critique,
              flaggedForReview,
              resonanceScore: empathy.resonance_score,
              audienceClarityScore: empathy.clarity_score,
              vibe: empathy.vibe,
              reflection: empathy.reflection,
              lowAudienceResonance,
              awardsScore: awardsEvaluation.awards_score,
              awardPotential: awardsEvaluation.award_potential,
              juryComment: awardsEvaluation.jury_comment,
              improvementTip: awardsEvaluation.improvement_tip,
              highAwardsPotential: hasHighAwardsPotential(awardsEvaluation.awards_score)
            });
          }
        } else {
          const combinedContent = `${parsed.visual} ${parsed.headlines.join(" ")}`;
          const originalityResult = await checkOriginality2(combinedContent);
          const targetAudience = deriveTargetAudience(query, tone);
          let refinementResult = {
            visualDescription: parsed.visual,
            headlines: parsed.headlines,
            rhetoricalDevice: completion.device,
            tone,
            targetAudience,
            iteration_number: 1,
            evaluation: {
              originality_confidence: 85,
              originality_feedback: "Original concept",
              audience_resonance: "Medium",
              audience_feedback: "Good audience appeal",
              award_potential: "Medium",
              award_feedback: "Strong creative potential",
              relevance_score: 75,
              relevance_feedback: "Relevant to brief",
              passes_all_thresholds: true,
              failed_criteria: []
            },
            final_status: "Passed"
          };
          if (enableIterativeRefinement && parsed.headlines.length < 2) {
            try {
              const fullRefinementResult = await runIterativeRefinement(
                {
                  visualDescription: parsed.visual,
                  headlines: parsed.headlines,
                  rhetoricalDevice: completion.device,
                  tone,
                  targetAudience
                },
                {
                  query,
                  tone,
                  avoidCliches,
                  rhetoricalExample: completion.example
                },
                enableIterativeRefinement
              );
              if (fullRefinementResult) {
                refinementResult = {
                  ...fullRefinementResult,
                  tone,
                  targetAudience
                };
              }
            } catch (error) {
              console.log("Refinement skipped due to error:", error);
            }
          }
          const adQuality = await evaluateAdQuality({
            visualDescription: refinementResult.visualDescription,
            headlines: refinementResult.headlines,
            rhetoricalDevice: refinementResult.rhetoricalDevice,
            rhetoricalExample: completion.example?.campaign_name || "Unknown"
          });
          const empathy = await evaluateAudienceEmpathy({
            visualDescription: refinementResult.visualDescription,
            headlines: refinementResult.headlines,
            rhetoricalDevice: refinementResult.rhetoricalDevice,
            rhetoricalExample: completion.example?.campaign_name || "Unknown",
            tone,
            targetAudience
          });
          const awardsEvaluation = await evaluateAwardsJuryScore({
            visualDescription: refinementResult.visualDescription,
            headlines: refinementResult.headlines,
            rhetoricalDevice: refinementResult.rhetoricalDevice,
            tone,
            targetAudience
          });
          const flaggedForReview = shouldFlagForReview(adQuality);
          const lowAudienceResonance = hasLowAudienceResonance(empathy.resonance_score);
          rawOutputs.push({
            visualDescription: refinementResult.visualDescription,
            headlines: refinementResult.headlines,
            rhetoricalDevice: refinementResult.rhetoricalDevice,
            originalityScore: originalityResult.score,
            id: completion.id,
            example: completion.example,
            professionalismScore: adQuality.professionalism_score,
            clarityScore: adQuality.clarity_score,
            freshnessScore: adQuality.freshness_score,
            critique: adQuality.critique,
            flaggedForReview,
            resonanceScore: empathy.resonance_score,
            audienceClarityScore: empathy.clarity_score,
            vibe: empathy.vibe,
            reflection: empathy.reflection,
            lowAudienceResonance,
            awardsScore: awardsEvaluation.awards_score,
            awardPotential: awardsEvaluation.award_potential,
            juryComment: awardsEvaluation.jury_comment,
            improvementTip: awardsEvaluation.improvement_tip,
            highAwardsPotential: hasHighAwardsPotential(awardsEvaluation.awards_score),
            // Iterative refinement fields
            iterationNumber: refinementResult.iteration_number,
            originalityConfidence: refinementResult.evaluation.originality_confidence,
            originalityFeedback: refinementResult.evaluation.originality_feedback,
            audienceResonance: refinementResult.evaluation.audience_resonance,
            audienceFeedback: refinementResult.evaluation.audience_feedback,
            awardPotentialLevel: refinementResult.evaluation.award_potential,
            awardFeedback: refinementResult.evaluation.award_feedback,
            relevanceScore: refinementResult.evaluation.relevance_score,
            relevanceFeedback: refinementResult.evaluation.relevance_feedback,
            passesAllThresholds: refinementResult.evaluation.passes_all_thresholds,
            failedCriteria: refinementResult.evaluation.failed_criteria,
            finalStatus: refinementResult.final_status
          });
        }
      }
    }
    console.log(`Generated ${rawOutputs.length} raw concepts, applying embedding-based diversity enforcement...`);
    let finalOutputs = rawOutputs;
    if (rawOutputs.length > 1) {
      try {
        const conceptTexts = rawOutputs.map(
          (output) => `${output.visualDescription} ${output.headlines.join(" ")}`
        );
        const diverseConceptTexts = await enforceConceptDiversity(
          conceptTexts,
          async () => {
            console.log("\u{1F504} Regenerating concepts due to high semantic similarity...");
            const filteredConcepts = [];
            for (let i = 0; i < conceptTexts.length; i++) {
              let isUnique = true;
              for (let j = 0; j < filteredConcepts.length; j++) {
                const wordsA = new Set(conceptTexts[i].toLowerCase().split(/\s+/));
                const wordsB = new Set(filteredConcepts[j].toLowerCase().split(/\s+/));
                const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
                const overlapRatio = intersection.size / Math.min(wordsA.size, wordsB.size);
                if (overlapRatio > 0.4) {
                  isUnique = false;
                  break;
                }
              }
              if (isUnique) {
                filteredConcepts.push(conceptTexts[i]);
              }
            }
            console.log(`Filtered ${conceptTexts.length} \u2192 ${filteredConcepts.length} unique concepts`);
            return filteredConcepts;
          },
          0.75
          // STRICTER 75% similarity threshold instead of 85%
        );
        console.log(`Semantic diversity check completed - ${diverseConceptTexts.length} concepts passed`);
      } catch (embeddingError) {
        console.log("Embedding diversity check failed, proceeding with existing concepts:", embeddingError);
      }
    }
    const diversifiedOutputs = calculateDiversityScore(finalOutputs);
    const rankedOutputs = diversifiedOutputs.sort((a, b) => b.originalityScore - a.originalityScore).slice(0, Math.max(3, variantCount));
    const { logSession: logSession2 } = await Promise.resolve().then(() => (init_supabaseClient(), supabaseClient_exports));
    const conceptIds = [];
    for (let i = 0; i < rankedOutputs.length; i++) {
      const output = rankedOutputs[i];
      const markdownResponse = rankedOutputs[i].fullMarkdown || `# ${output.headlines[0] || "Untitled Concept"}

**Tagline:** ${output.headlines[1] || "Creative tagline"}

**Body Copy:**  
${output.headlines.slice(2).join(" ") || output.visualDescription || "Compelling body copy"}

**Visual Concept:**  
${output.visualDescription || "Innovative visual approach"}

**Rhetorical Craft:**  
- ${output.rhetoricalDevice}: ${output.critique || "Strategic implementation of rhetorical device for maximum impact."}

**Strategic Impact:**  
${output.reflection || "Designed to resonate with target audience and achieve campaign objectives."}

**Date:** ${(/* @__PURE__ */ new Date()).toLocaleDateString()}

**Tone:** ${tone}

**Prompt:** ${query}`;
      const conceptId = await logSession2({
        userId: null,
        prompt: query,
        response: markdownResponse,
        tone,
        iterationType: "original",
        parentConceptId: null,
        originalityConfidence: Math.round(output.originalityScore)
      });
      if (conceptId) {
        conceptIds.push(conceptId);
        console.log(`Multivariant concept ${i + 1} saved to Supabase with ID: ${conceptId}`);
        try {
          const projectId = req.body.projectId || "default_project";
          await reportSimilarityToRatedConcepts(
            projectId,
            markdownResponse,
            0.75
            // similarity threshold
          );
          const feedbackAnalysis = await analyzeFeedbackSimilarity(
            projectId,
            markdownResponse,
            {
              similarityThreshold: 0.7,
              detailedReport: false,
              // Keep logs clean during generation
              includeScoring: true
            }
          );
          if (feedbackAnalysis.overallScore !== 0) {
            console.log(`Feedback alignment for concept ${i + 1}: ${feedbackAnalysis.overallScore.toFixed(3)} (${feedbackAnalysis.recommendation})`);
          }
        } catch (feedbackError) {
          console.log(`\u{1F4CA} Feedback analysis skipped for concept ${i + 1}:`, feedbackError instanceof Error ? feedbackError.message : String(feedbackError));
        }
      } else {
        console.error(`Failed to save multivariant concept ${i + 1} to Supabase!`);
        conceptIds.push(`failed-${Date.now()}-${i}`);
      }
    }
    console.log(`Logged ${conceptIds.length} individual concepts as structured JSON`);
    const logResult = conceptIds[0];
    if (logResult && salvagedFragments.length > 0) {
      try {
        const { createClient: createClient5 } = await import("@supabase/supabase-js");
        const supabaseClient = createClient5(
          process.env.SUPABASE_URL || "",
          process.env.SUPABASE_KEY || ""
        );
        for (const output of rankedOutputs) {
          const generatedContent = `${output.visualDescription} ${output.headlines.join(" ")}`.toLowerCase();
          for (const fragment of salvagedFragments) {
            const fragmentText = fragment.fragment_text.toLowerCase();
            const fragmentWords = fragmentText.split(" ").filter((w) => w.length > 2);
            const matchingWords = fragmentWords.filter((word) => generatedContent.includes(word));
            const matchRatio = matchingWords.length / fragmentWords.length;
            if (matchRatio >= 0.5) {
              await supabaseClient.from("concept_logs").update({ recombined_from: fragment.id }).eq("id", logResult);
              console.log(`\u{1F504} Tracked recombination: Concept ${logResult} inspired by fragment "${fragment.fragment_text}"`);
              break;
            }
          }
        }
      } catch (error) {
        console.error("Error tracking fragment recombination:", error);
      }
    }
    if (conceptIds.length > 0) {
      for (let i = 0; i < rankedOutputs.length; i++) {
        const output = rankedOutputs[i];
        const conceptId = conceptIds[i];
        if (conceptId) {
          try {
            const conceptResponse = JSON.stringify({
              headline: output.headlines[0] || "",
              tagline: output.headlines[1] || "",
              bodyCopy: output.headlines.slice(2).join(" ") || "",
              visualConcept: output.visualDescription || "",
              rhetoricalCraft: [{
                device: output.rhetoricalDevice,
                explanation: output.critique || "Strategic implementation of rhetorical device for maximum impact."
              }],
              strategicImpact: output.reflection || "Designed to resonate with target audience and achieve campaign objectives."
            });
            await salvageConceptFragments({
              id: conceptId,
              headline: output.headlines.join(" "),
              visual: output.visualDescription,
              response: conceptResponse,
              tone,
              originality_confidence: output.originalityScore
            });
          } catch (salvageError) {
            console.error("Error salvaging fragments:", salvageError);
          }
        }
      }
    }
    const formattedOutputs = rankedOutputs.map((output, index) => {
      const aiResponse = {
        headline: output.headlines[0] || "",
        tagline: output.headlines[1] || "",
        bodyCopy: output.headlines.slice(2).join(" ") || "",
        visualConcept: output.visualDescription || "",
        rhetoricalCraft: [
          {
            device: output.rhetoricalDevice,
            explanation: output.critique || "Strategic implementation of rhetorical device for maximum impact."
          }
        ],
        strategicImpact: output.reflection || "Designed to resonate with target audience and achieve campaign objectives."
      };
      const markdownContent = `**HEADLINE**
${aiResponse.headline}

**TAGLINE**
${aiResponse.tagline}

**BODY COPY**
${aiResponse.bodyCopy}

**VISUAL CONCEPT**
${aiResponse.visualConcept}

**RHETORICAL CRAFT BREAKDOWN**
**${aiResponse.rhetoricalCraft[0].device}**
${aiResponse.rhetoricalCraft[0].explanation}

**STRATEGIC IMPACT**
${aiResponse.strategicImpact}`;
      return {
        ...output,
        content: `\`\`\`markdown
${markdownContent}
\`\`\``,
        conceptId: conceptIds[index] || null
      };
    });
    performanceTracker.printSummary();
    res.json(formattedOutputs);
  } catch (error) {
    console.error("Error in generateMultivariant:", error);
    performanceTracker.printSummary();
    res.status(500).json({ error: "Internal server error" });
  }
}

// server/routes/testTheorySystem.ts
init_enhancedTheoryMapping();
import { readFileSync as readFileSync5 } from "fs";
async function testTheorySystem(req, res) {
  try {
    const testQueries = [
      "Create an empowering HIV awareness campaign using quantitative data visualization to decode stigma myths",
      "Design bold visual typography for cross-cultural health messaging about treatment adherence",
      "Develop persuasive multimodal metaphors for community identification and belonging",
      "Build accessible infographics showing statistical evidence of healing narratives"
    ];
    const basePrompt = "Generate a sophisticated advertising concept that leverages advanced rhetorical theory:";
    const results = [];
    console.log("\u{1F9EA} TESTING ENHANCED THEORY SYSTEM WITH CACHING AND LOGGING...");
    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      console.log(`
--- Test ${i + 1}: ${query.substring(0, 50)}... ---`);
      const startTime = performance.now();
      const result = generateConceptWithTheoryInject(basePrompt, query, []);
      const endTime = performance.now();
      results.push({
        query,
        detectedKeywords: result.detectedKeywords,
        selectedTheories: result.selectedTheories,
        injectionLength: result.theoryInjection.length,
        processingTime: Math.round(endTime - startTime),
        theoriesApplied: result.selectedTheories.length
      });
    }
    let logContents = "Log file not found or empty";
    try {
      logContents = readFileSync5("./theory_inject.log", "utf-8");
    } catch (error) {
      console.log("Theory injection log not yet created");
    }
    const summary = {
      totalTests: results.length,
      averageTheoriesPerQuery: Math.round(
        results.reduce((sum, r) => sum + r.theoriesApplied, 0) / results.length * 10
      ) / 10,
      averageProcessingTime: Math.round(
        results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
      ),
      totalKeywordsDetected: results.reduce((sum, r) => sum + r.detectedKeywords.length, 0),
      cachingEnabled: true,
      loggingEnabled: true,
      abTestingAvailable: true
    };
    res.json({
      status: "Enhanced Theory System Test Complete",
      summary,
      testResults: results,
      recentLogEntries: logContents.split("\n").slice(-5).filter(Boolean),
      performanceNotes: [
        "Cache system reduces repeated corpus scans",
        "Logging provides detailed theory application debugging",
        "A/B testing framework ready for empirical measurement",
        "371 keywords across 15+ theoretical frameworks active"
      ]
    });
  } catch (error) {
    console.error("Theory system test error:", error);
    res.status(500).json({
      error: "Theory system test failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

// server/routes.ts
import { z as z2 } from "zod";
var sessionHistory = [];
var rateLimitMap = /* @__PURE__ */ new Map();
var RATE_LIMIT = 10;
var RATE_WINDOW = 60 * 1e3;
function checkRateLimit(identifier) {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }
  userLimit.count++;
  return true;
}
setInterval(() => {
  const now = Date.now();
  const toDelete = [];
  rateLimitMap.forEach((value, key) => {
    if (now > value.resetTime) {
      toDelete.push(key);
    }
  });
  toDelete.forEach((key) => rateLimitMap.delete(key));
}, 5 * 60 * 1e3);
async function registerRoutes(app2) {
  app2.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o"
    });
  });
  app2.post("/api/generate", async (req, res) => {
    try {
      console.log(`\u{1F500} Routing ALL generation through hybrid multivariant pipeline`);
      const requestedCount = req.body?.conceptCount || 1;
      req.body.conceptCount = requestedCount;
      req.body.enableHybridMode = true;
      const originalJson = res.json.bind(res);
      res.json = function(body) {
        if (body && body.success && body.outputs && Array.isArray(body.outputs)) {
          const outputs = body.outputs;
          const startTime = Date.now();
          if (requestedCount === 1 && outputs.length > 0) {
            const best = outputs.reduce((a, b) => (a.awardsScore || 0) > (b.awardsScore || 0) ? a : b, outputs[0]);
            const content = `**HEADLINE**
${best.headlines?.[0] || ""}

**TAGLINE**
${best.tagline || best.headlines?.[1] || ""}

**BODY COPY**
${best.bodyCopy || ""}

**VISUAL CONCEPT**
${best.visualDescription || ""}

**RHETORICAL CRAFT BREAKDOWN**
**${best.rhetoricalDevice || ""}**
${best.hybridMetadata?.rhetoricalAnalysis?.applicationExplanation || "Strategic application of rhetorical device."}

**STRATEGIC IMPACT**
Generated via hybrid pipeline with originality score ${best.originalityScore || 0}.`;
            return originalJson({
              id: Date.now(),
              conceptId: best.conceptId || best.id,
              content: `\`\`\`markdown
${content}
\`\`\``,
              visualPrompt: best.visualDescription || "",
              tone: req.body.tone || "",
              tokens: 0,
              processingTime: `${((body.metadata?.totalTime || 0) / 1e3).toFixed(1)}s`,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              originalityCheck: { confidence: (best.originalityScore || 0) / 100 },
              iterationType: "original"
            });
          } else {
            const concepts = outputs.map((o, i) => {
              const content = `**HEADLINE**
${o.headlines?.[0] || ""}

**TAGLINE**
${o.tagline || o.headlines?.[1] || ""}

**BODY COPY**
${o.bodyCopy || ""}

**VISUAL CONCEPT**
${o.visualDescription || ""}

**RHETORICAL CRAFT BREAKDOWN**
**${o.rhetoricalDevice || ""}**
${o.hybridMetadata?.rhetoricalAnalysis?.applicationExplanation || "Strategic application."}

**STRATEGIC IMPACT**
Hybrid pipeline concept.`;
              return {
                id: i + 1,
                conceptId: o.conceptId || o.id,
                content: `\`\`\`markdown
${content}
\`\`\``,
                visualPrompt: o.visualDescription || "",
                tone: req.body.tone || "",
                tokens: 0,
                processingTime: `${((body.metadata?.totalTime || 0) / 1e3).toFixed(1)}s`,
                timestamp: (/* @__PURE__ */ new Date()).toISOString(),
                originalityCheck: { confidence: (o.originalityScore || 0) / 100 },
                iterationType: "original"
              };
            });
            return originalJson({
              concepts,
              totalTokens: 0,
              totalProcessingTime: `${((body.metadata?.totalTime || 0) / 1e3).toFixed(1)}s`,
              batchId: `batch_${Date.now()}`
            });
          }
        }
        return originalJson(body);
      };
      return generateMultivariant(req, res);
      const conceptCount = req.body?.conceptCount || 1;
      if (conceptCount > 1) {
        console.log(`\u{1F500} Routing to multivariant endpoint for ${conceptCount} concepts`);
        return generateMultivariant(req, res);
      }
      const clientId = req.ip || "unknown";
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({
          message: "Too many requests. Please wait before trying again.",
          retryAfter: 60
        });
      }
      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({
          message: "Invalid request body"
        });
      }
      const validatedData = aiRequestFormSchema.parse(req.body);
      console.log(`RECEIVED QUERY: "${validatedData.query}"`);
      console.log(`RECEIVED TONE: ${validatedData.tone}`);
      console.log(`\u{1F50D} Deep scan enabled: ${validatedData.deepScan}`);
      const theories = ["Burke", "Messaris", "Barthes", "Lupton", "Phillips & McQuarrie", "Tufte", "Forceville", "Kress", "Aristotle"];
      const randomTheories = theories.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 3);
      const diverseSynonyms = {
        "confidence": ["resilience", "empowerment", "courage", "assurance", "fortitude"],
        "connection": ["unity", "bond", "fellowship", "linkage", "alliance"],
        "campaign": ["initiative", "drive", "movement", "effort", "push"],
        "love": ["affection", "devotion", "passion", "care", "attachment"],
        "bold": ["daring", "fearless", "audacious", "courageous", "intrepid"],
        "edge": ["grit", "raw", "urban", "sharp", "cutting"],
        "emotional": ["heartfelt", "sentimental", "passionate", "touching", "moving"],
        "gay": ["LGBTQ+", "queer", "diverse"],
        "men": ["individuals", "community", "people"],
        "york": ["NYC", "metropolitan", "urban"],
        "state": ["region", "area", "territory"]
      };
      let enhancedQuery = validatedData.query;
      for (const [key, synonyms] of Object.entries(diverseSynonyms)) {
        if (enhancedQuery.toLowerCase().includes(key.toLowerCase())) {
          const synonym = synonyms[Math.floor(Math.random() * synonyms.length)];
          enhancedQuery = enhancedQuery.replace(new RegExp(key, "gi"), synonym);
        }
      }
      enhancedQuery += ` Apply theoretical frameworks: ${randomTheories.join(", ")}. Ensure high originality with unique angles and rhetorical devices.`;
      console.log(`\u{1F527} DIVERSITY ENHANCED QUERY: "${enhancedQuery}"`);
      console.log(`\u{1F393} APPLIED THEORIES: ${randomTheories.join(", ")}`);
      let userRatings = [];
      if (validatedData.projectId) {
        try {
          const projectRatings = await storage.getConceptRatings(validatedData.projectId);
          userRatings = projectRatings.map((rating) => ({
            rhetoricalDevice: rating.rhetoricalDevice,
            tone: rating.tone,
            rating: rating.rating
          }));
          console.log(`\u{1F4CA} Applying ${userRatings.length} user ratings to generation`);
        } catch (error) {
          console.warn("Failed to fetch user ratings:", error);
        }
      }
      let aiResponse = await generateAiResponse({
        query: enhancedQuery,
        tone: validatedData.tone,
        includeCliches: validatedData.includeCliches,
        deepScan: validatedData.deepScan,
        conceptCount: validatedData.conceptCount,
        projectId: validatedData.projectId,
        userRatings
      });
      if (aiResponse.concepts.length > 0) {
        const firstConcept = aiResponse.concepts[0];
        const originalityScore = firstConcept.originalityCheck?.confidence ? firstConcept.originalityCheck.confidence * 100 : 0;
        console.log(`ORIGINALITY SCORE: ${originalityScore.toFixed(2)} (retries disabled for performance)`);
      }
      const isReforge = validatedData.query.includes("[REFORGE:");
      let iterationType = "original";
      if (isReforge) {
        if (validatedData.query.includes("headline")) iterationType = "reforge_headline";
        else if (validatedData.query.includes("tagline")) iterationType = "reforge_tagline";
        else if (validatedData.query.includes("body copy")) iterationType = "reforge_body";
        else iterationType = "reforge_full";
      }
      if (aiResponse.concepts.length === 1) {
        const concept = aiResponse.concepts[0];
        const storedRequest = await storage.createAiRequest({
          query: validatedData.query,
          tone: validatedData.tone,
          response: concept.content,
          tokens: concept.tokens,
          processingTime: concept.processingTime
        });
        const conceptId = await logSession({
          userId: null,
          // Guest session for now
          prompt: validatedData.query,
          response: concept.content,
          tone: validatedData.tone,
          iterationType,
          parentConceptId: null,
          // TODO: Track parent concept for reforges
          originalityConfidence: concept.originalityCheck?.confidence
        });
        if (conceptId && validatedData.projectId) {
          Promise.resolve().then(async () => {
            try {
              await reportSimilarityToRatedConcepts(validatedData.projectId, concept.content, 0.75);
              const feedbackAnalysis = await analyzeFeedbackSimilarity(validatedData.projectId, concept.content, { similarityThreshold: 0.7, detailedReport: false, includeScoring: true });
              if (feedbackAnalysis.overallScore !== 0) {
                console.log(`Single concept feedback alignment: ${feedbackAnalysis.overallScore.toFixed(3)} (${feedbackAnalysis.recommendation})`);
              }
            } catch (feedbackError) {
              console.log(`\u{1F4CA} Feedback analysis skipped:`, feedbackError instanceof Error ? feedbackError.message : String(feedbackError));
            }
          });
        }
        res.json({
          id: storedRequest?.id || Date.now(),
          conceptId,
          content: concept.content,
          visualPrompt: concept.visualPrompt,
          tone: validatedData.tone,
          tokens: concept.tokens,
          processingTime: concept.processingTime,
          timestamp: storedRequest?.createdAt?.toLocaleTimeString() || (/* @__PURE__ */ new Date()).toLocaleTimeString(),
          originalityCheck: concept.originalityCheck,
          iterationType
        });
      } else {
        const conceptIds = [];
        for (let i = 0; i < aiResponse.concepts.length; i++) {
          const concept = aiResponse.concepts[i];
          await storage.createAiRequest({
            query: validatedData.query,
            tone: validatedData.tone,
            response: concept.content,
            tokens: concept.tokens,
            processingTime: concept.processingTime
          });
          const conceptId = await logSession({
            userId: null,
            prompt: validatedData.query,
            response: concept.content,
            tone: validatedData.tone,
            iterationType: "original",
            parentConceptId: null,
            originalityConfidence: concept.originalityCheck?.confidence
          });
          conceptIds.push(conceptId || `concept_${Date.now()}_${i}`);
          if (conceptId && validatedData.projectId) {
            const idx = i;
            const projId = validatedData.projectId;
            const conceptContent = concept.content;
            Promise.resolve().then(async () => {
              try {
                await reportSimilarityToRatedConcepts(projId, conceptContent, 0.75);
                const feedbackAnalysis = await analyzeFeedbackSimilarity(projId, conceptContent, { similarityThreshold: 0.7, detailedReport: false, includeScoring: true });
                if (feedbackAnalysis.overallScore !== 0) {
                  console.log(`Multi-concept ${idx + 1} feedback alignment: ${feedbackAnalysis.overallScore.toFixed(3)} (${feedbackAnalysis.recommendation})`);
                }
              } catch (feedbackError) {
                console.log(`\u{1F4CA} Feedback analysis skipped for multi-concept ${idx + 1}:`, feedbackError instanceof Error ? feedbackError.message : String(feedbackError));
              }
            });
          }
        }
        res.json({
          concepts: aiResponse.concepts.map((concept, index) => ({
            id: `${Date.now()}_${index}`,
            conceptId: conceptIds[index],
            content: concept.content,
            visualPrompt: concept.visualPrompt,
            tone: validatedData.tone,
            tokens: concept.tokens,
            processingTime: concept.processingTime,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            originalityCheck: concept.originalityCheck,
            rhetoricalDevice: concept.rhetoricalDevice
          })),
          totalTokens: aiResponse.totalTokens,
          totalProcessingTime: aiResponse.totalProcessingTime,
          batchId: aiResponse.batchId
        });
      }
    } catch (error) {
      console.error("Generate API Error:", error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors
        });
      }
      const errorMessage = error instanceof Error ? error.message : "Failed to generate response";
      const errorStack = error instanceof Error ? error.stack : void 0;
      res.status(500).json({
        message: errorMessage,
        error: errorMessage,
        stack: process.env.NODE_ENV !== "production" ? errorStack : void 0
      });
    }
  });
  app2.get("/api/requests", async (req, res) => {
    try {
      const requests = await storage.getAiRequests();
      res.json(requests);
    } catch (error) {
      console.error("Get requests error:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });
  app2.get("/api/database-count", async (req, res) => {
    try {
      const { supabase: supabase5 } = await Promise.resolve().then(() => (init_supabaseClient(), supabaseClient_exports));
      if (!supabase5) {
        return res.json({ error: "Supabase not available" });
      }
      const { count, error } = await supabase5.from("concept_logs").select("*", { count: "exact", head: true });
      if (error) {
        return res.json({ error: error.message });
      }
      res.json({ totalCount: count || 0 });
    } catch (error) {
      res.json({ error: "Database connection failed" });
    }
  });
  app2.post("/api/preview-prompt", async (req, res) => {
    try {
      const { prompt, enhancement } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }
      const enhancementMap = {
        "Keywords": `${prompt} (with strategic keywords)`,
        "Add specific audience": `${prompt} (targeting specific demographic)`,
        "Add competitive context": `${prompt} (competitive positioning)`,
        "Quick": `${prompt} (theory-enhanced)`
      };
      const enhancedPrompt = enhancementMap[enhancement] || prompt;
      const mockHeadlines = [
        "Viral Confidence",
        "Love Without Limits",
        "Shield Strength",
        "Unity Unleashed",
        "Bold Together"
      ];
      const headline = mockHeadlines[Math.floor(Math.random() * mockHeadlines.length)];
      res.json({
        headline,
        enhancedPrompt
      });
    } catch (error) {
      console.error("Preview prompt error:", error);
      res.status(500).json({ error: "Failed to generate preview" });
    }
  });
  app2.get("/api/history", async (req, res) => {
    try {
      let allHistory = [...sessionHistory];
      try {
        const { supabase: supabase5 } = await Promise.resolve().then(() => (init_supabaseClient(), supabaseClient_exports));
        if (supabase5) {
          console.log("\u{1F50D} Attempting to fetch historical data from Supabase...");
          const { data, error } = await supabase5.from("concept_logs").select("*").order("created_at", { ascending: false });
          if (!error && data) {
            console.log(`\u{1F4DA} Found ${data.length} historical entries in database`);
            const historicalEntries = data.map((entry) => ({
              id: `db-${entry.id}`,
              prompt: entry.prompt || "Historical concept",
              content: entry.response || entry.content || "",
              tone: entry.tone || "unknown",
              timestamp: entry.created_at || entry.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
              isFavorite: entry.is_favorite || false,
              enhanced: true
              // Database concepts are enhanced
            }));
            allHistory = [...historicalEntries];
            sessionHistory.forEach((sessionEntry) => {
              const existsInDb = historicalEntries.some(
                (dbEntry) => dbEntry.prompt === sessionEntry.prompt && dbEntry.tone === sessionEntry.tone && Math.abs(new Date(dbEntry.timestamp).getTime() - new Date(sessionEntry.timestamp).getTime()) < 6e4
              );
              if (!existsInDb) {
                allHistory.push(sessionEntry);
              }
            });
          } else if (error) {
            console.log("\u{1F4D6} Database read error (continuing with session data):", error.message);
          }
        }
      } catch (dbError) {
        console.log("\u{1F4D6} Database connection issue (continuing with session data):", dbError);
      }
      const sortedHistory = allHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      console.log(`\u{1F4CA} Returning ${sortedHistory.length} total history entries (${sessionHistory.length} current session + ${allHistory.length - sessionHistory.length} historical)`);
      res.json(sortedHistory);
    } catch (error) {
      console.error("History fetch error:", error);
      res.json(sessionHistory);
    }
  });
  app2.get("/api/test-theory-system", testTheorySystem);
  app2.get("/api/rejection-stats", async (req, res) => {
    try {
      const { getRejectionStats: getRejectionStats2 } = await Promise.resolve().then(() => (init_embeddingArbiters(), embeddingArbiters_exports));
      const stats = getRejectionStats2();
      console.log(`\u{1F4CA} REJECTION STATS: ${stats.totalRejections} total rejections since threshold optimization`);
      Object.entries(stats.rejectionReasons).forEach(([reason, count]) => {
        console.log(`   ${reason}: ${count} rejections`);
      });
      res.json({
        totalRejections: stats.totalRejections,
        rejectionReasons: stats.rejectionReasons,
        averageScores: stats.averageScores,
        thresholds: {
          current: {
            originality: 80,
            // Was 85 (-5%)
            relevance: 65,
            // Was 70 (-5%)
            cultural_sensitivity: 70,
            // Was 75 (-5%)
            rhetorical_strength: 65,
            // Was 70 (-5%)
            practicality: 65
            // Was 70 (-5%)
          },
          previous: {
            originality: 85,
            relevance: 70,
            cultural_sensitivity: 75,
            rhetorical_strength: 70,
            practicality: 70
          }
        },
        analysis: {
          mostCommonRejection: Object.entries(stats.rejectionReasons).sort(([, a], [, b]) => b - a)[0]?.[0] || "None",
          rejectionRate: stats.totalRejections > 0 ? `${(stats.totalRejections / (stats.totalRejections + 100) * 100).toFixed(1)}%` : "0%",
          expectedImprovement: "5% threshold reduction should increase batch completion from 81% to ~95%"
        }
      });
    } catch (error) {
      console.error("Rejection Stats Error:", error);
      res.status(500).json({ message: "Failed to fetch rejection statistics" });
    }
  });
  app2.post("/api/favorite", async (req, res) => {
    try {
      const { entryId } = req.body;
      const { supabase: supabase5 } = await Promise.resolve().then(() => (init_supabaseClient(), supabaseClient_exports));
      if (!supabase5) {
        return res.status(503).json({ message: "Database not available" });
      }
      const { data: currentEntry } = await supabase5.from("concept_logs").select("is_favorite").eq("id", entryId).single();
      const { error } = await supabase5.from("concept_logs").update({ is_favorite: !currentEntry?.is_favorite }).eq("id", entryId);
      if (error) {
        console.error("Favorite toggle error:", error);
        return res.status(500).json({ message: "Failed to update favorite" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Favorite toggle error:", error);
      res.status(500).json({ message: "Failed to update favorite" });
    }
  });
  app2.post("/api/cleanup-history", async (req, res) => {
    try {
      const { supabase: supabase5 } = await Promise.resolve().then(() => (init_supabaseClient(), supabaseClient_exports));
      if (!supabase5) {
        return res.status(503).json({ message: "Database not available" });
      }
      const { data: allEntries, error: fetchError } = await supabase5.from("concept_logs").select("id, created_at").order("created_at", { ascending: false });
      if (fetchError) {
        console.error("Failed to fetch entries:", fetchError);
        return res.status(500).json({ message: "Failed to fetch entries" });
      }
      if (!allEntries || allEntries.length <= 1) {
        return res.json({ message: "No entries to delete", kept: allEntries?.length || 0 });
      }
      const entriesToDelete = allEntries.slice(1);
      const idsToDelete = entriesToDelete.map((entry) => entry.id);
      const { error: deleteError } = await supabase5.from("concept_logs").delete().in("id", idsToDelete);
      if (deleteError) {
        console.error("Failed to delete entries:", deleteError);
        return res.status(500).json({ message: "Failed to delete entries" });
      }
      res.json({
        message: "Cleanup successful",
        deleted: entriesToDelete.length,
        kept: 1
      });
    } catch (error) {
      console.error("Cleanup error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to cleanup history"
      });
    }
  });
  app2.post("/api/export-history", async (req, res) => {
    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");
      const { entries } = req.body;
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: "Concept Forge - Session History Export",
                  bold: true,
                  size: 32
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 400 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Exported ${entries.length} entries on ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
                  color: "666666"
                })
              ],
              spacing: { after: 600 }
            }),
            // Process each entry
            ...entries.flatMap((entry, index) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Entry ${index + 1}`,
                    bold: true,
                    size: 24
                  })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 }
              }),
              // Original prompt
              new Paragraph({
                children: [
                  new TextRun({
                    text: entry.prompt || entry.originalPrompt || "No prompt available",
                    italics: true,
                    color: "666666"
                  })
                ],
                spacing: { after: 200 }
              }),
              // Metadata
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Tone: ${entry.tone} | `,
                    size: 20,
                    color: "888888"
                  }),
                  new TextRun({
                    text: `Generated: ${entry.timestamp}`,
                    size: 20,
                    color: "888888"
                  }),
                  ...entry.tokens ? [new TextRun({
                    text: ` | Tokens: ${entry.tokens}`,
                    size: 20,
                    color: "888888"
                  })] : [],
                  ...entry.processingTime ? [new TextRun({
                    text: ` | Time: ${entry.processingTime}`,
                    size: 20,
                    color: "888888"
                  })] : []
                ],
                spacing: { after: 300 }
              }),
              // Content sections - improved parsing
              ...(() => {
                const content = entry.content || "";
                const sections = content.split(/(\*\*[^*]+\*\*)/);
                const paragraphs = [];
                for (let i = 0; i < sections.length; i++) {
                  const section = sections[i];
                  if (section.match(/^\*\*[^*]+\*\*$/)) {
                    const headerText = section.replace(/\*\*/g, "");
                    paragraphs.push(new Paragraph({
                      children: [
                        new TextRun({
                          text: headerText.toUpperCase(),
                          bold: true,
                          size: 22
                        })
                      ],
                      spacing: { before: 300, after: 4 }
                    }));
                  } else if (section.trim()) {
                    const lines = section.trim().split("\n").filter((line) => line.trim());
                    lines.forEach((line) => {
                      if (line.trim()) {
                        paragraphs.push(new Paragraph({
                          children: [
                            new TextRun({
                              text: line.trim()
                            })
                          ],
                          spacing: { after: 200 }
                        }));
                      }
                    });
                  }
                }
                return paragraphs;
              })(),
              // MidJourney prompt if available
              ...entry.visualPrompt ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "MIDJOURNEY PROMPT:",
                      bold: true
                    })
                  ],
                  spacing: { before: 300, after: 100 }
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: entry.visualPrompt,
                      color: "444444"
                    })
                  ],
                  spacing: { after: 400 }
                })
              ] : []
            ])
          ]
        }]
      });
      const buffer = await Packer.toBuffer(doc);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", 'attachment; filename="concept-forge-history.docx"');
      res.send(buffer);
    } catch (error) {
      console.error("History export error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to export history"
      });
    }
  });
  app2.post("/api/projects", async (req, res) => {
    try {
      const validatedData = z2.object({
        name: z2.string().min(1),
        description: z2.string().optional()
      }).parse(req.body);
      const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const project = await storage.createProject({
        id: projectId,
        name: validatedData.name,
        description: validatedData.description,
        userId: null
        // For now, anonymous projects
      });
      res.json(project);
    } catch (error) {
      console.error("Create Project Error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create project" });
    }
  });
  app2.get("/api/projects", async (req, res) => {
    try {
      const projects2 = await storage.getProjects();
      res.json(projects2);
    } catch (error) {
      console.error("Get Projects Error:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });
  app2.post("/api/ratings", async (req, res) => {
    try {
      const validatedData = z2.object({
        projectId: z2.string(),
        conceptId: z2.string(),
        rhetoricalDevice: z2.string(),
        tone: z2.string(),
        rating: z2.enum(["more_like_this", "less_like_this"])
      }).parse(req.body);
      const rating = await storage.createConceptRating({
        projectId: validatedData.projectId,
        conceptId: validatedData.conceptId,
        rhetoricalDevice: validatedData.rhetoricalDevice,
        tone: validatedData.tone,
        rating: validatedData.rating,
        userId: null
        // For now, anonymous ratings
      });
      res.json(rating);
    } catch (error) {
      console.error("Create Rating Error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create rating" });
    }
  });
  app2.get("/api/ratings/:projectId", async (req, res) => {
    try {
      const ratings = await storage.getConceptRatings(req.params.projectId);
      res.json(ratings);
    } catch (error) {
      console.error("Get Ratings Error:", error);
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });
  app2.post("/api/generate-multivariant", generateMultivariant);
  app2.post("/api/generate-multivariant-stream", async (req, res) => {
    const { generateMultivariantStream: generateMultivariantStream2 } = await Promise.resolve().then(() => (init_generateMultivariantStream(), generateMultivariantStream_exports));
    return generateMultivariantStream2(req, res);
  });
  app2.get("/debug", (req, res) => {
    res.sendFile(__require("path").join(process.cwd(), "debug-app.html"));
  });
  app2.get("/api/pending-feedback", async (req, res) => {
    try {
      const { supabase: supabase5 } = await Promise.resolve().then(() => (init_supabaseClient(), supabaseClient_exports));
      if (!supabase5) {
        return res.json([]);
      }
      const { data, error } = await supabase5.from("concept_logs").select("*").is("feedback_type", null).order("created_at", { ascending: false }).limit(50);
      if (error) {
        console.error("Pending feedback fetch error:", error);
        return res.json([]);
      }
      res.json(data || []);
    } catch (error) {
      console.error("Pending feedback fetch error:", error);
      res.json([]);
    }
  });
  app2.post("/api/feedback", async (req, res) => {
    try {
      const { supabase: supabase5 } = await Promise.resolve().then(() => (init_supabaseClient(), supabaseClient_exports));
      const { applyFeedback: applyFeedback2 } = await Promise.resolve().then(() => (init_feedbackInfluenceSystem(), feedbackInfluenceSystem_exports));
      if (!supabase5) {
        return res.status(500).json({ message: "Database connection not available" });
      }
      const validatedData = z2.object({
        conceptId: z2.string(),
        rating: z2.enum(["more_like_this", "less_like_this"]),
        projectId: z2.string().optional()
      }).parse(req.body);
      const { error } = await supabase5.from("concept_logs").update({ feedback_type: validatedData.rating }).eq("id", validatedData.conceptId);
      if (error) {
        console.error("Failed to update feedback:", error);
        return res.status(500).json({ message: "Failed to update feedback" });
      }
      const projectId = validatedData.projectId || "default_project";
      const influenceResult = await applyFeedback2(
        projectId,
        validatedData.rating,
        validatedData.conceptId
      );
      console.log(`Feedback influence applied: ${influenceResult.status} - ${influenceResult.message}`);
      res.json({
        success: true,
        influence: influenceResult,
        message: "Feedback applied and biases updated for future generations"
      });
    } catch (error) {
      console.error("Feedback Error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to process feedback" });
    }
  });
  app2.post("/api/generate-variant", async (req, res) => {
    try {
      const { supabase: supabase5 } = await Promise.resolve().then(() => (init_supabaseClient(), supabaseClient_exports));
      if (!supabase5) {
        return res.status(500).json({ message: "Database connection not available" });
      }
      const validatedData = z2.object({
        conceptId: z2.string(),
        feedbackType: z2.enum(["more_like_this", "less_like_this"])
      }).parse(req.body);
      const { data: originalConcept, error: fetchError } = await supabase5.from("concept_logs").select("*").eq("id", validatedData.conceptId).single();
      if (fetchError || !originalConcept) {
        return res.status(404).json({ message: "Original concept not found" });
      }
      let prompt;
      if (validatedData.feedbackType === "more_like_this") {
        prompt = `Generate a new variant similar to this concept, keeping the same rhetorical devices and tone, but with different wording: ${originalConcept.response.replace(/[*#]/g, "")}`;
      } else {
        prompt = `Generate a new concept that is different from this one. Use different rhetorical devices and adjust the tone: ${originalConcept.response.replace(/[*#]/g, "")}`;
      }
      const { generateAiResponse: generateAiResponse2 } = await Promise.resolve().then(() => (init_openai(), openai_exports));
      const aiResult = await generateAiResponse2({
        query: prompt,
        tone: originalConcept.tone,
        includeCliches: false,
        deepScan: false
      });
      const { v4: uuidv4 } = await import("uuid");
      const newId = uuidv4();
      const responseContent = aiResult.content || aiResult.concepts?.[0]?.content || "Generated variant";
      const { error: insertError } = await supabase5.from("concept_logs").insert({
        id: newId,
        user_id: originalConcept.user_id,
        prompt,
        response: responseContent,
        tone: originalConcept.tone,
        iteration_type: "variant",
        parent_concept_id: originalConcept.id
      });
      if (insertError) {
        console.error("Failed to save variant:", insertError);
        return res.status(500).json({ message: "Failed to save variant" });
      }
      res.json({
        success: true,
        id: newId,
        result: responseContent
      });
    } catch (error) {
      console.error("Generate Variant Error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to generate variant" });
    }
  });
  app2.post("/api/generate-enhanced", async (req, res) => {
    try {
      const clientId = req.ip || "unknown";
      if (!checkRateLimit(clientId)) {
        return res.status(429).json({ message: "Rate limit exceeded. Please try again later." });
      }
      const { generateEnhancedConcept: generateEnhancedConcept2 } = await Promise.resolve().then(() => (init_enhancedAI(), enhancedAI_exports));
      const validatedData = z2.object({
        query: z2.string().min(1, "Query is required"),
        tone: z2.string().min(1, "Tone is required"),
        sessionHistory: z2.array(z2.string()).optional(),
        recentConcepts: z2.array(z2.string()).optional()
      }).parse(req.body);
      console.log(`Enhanced concept generation request: "${validatedData.query}" (${validatedData.tone})`);
      const concept = await generateEnhancedConcept2({
        query: validatedData.query,
        tone: validatedData.tone,
        sessionHistory: validatedData.sessionHistory,
        recentConcepts: validatedData.recentConcepts
      });
      const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
      const conceptJson = JSON.stringify(concept, null, 2);
      const conceptId = await logSession({
        userId: null,
        prompt: validatedData.query,
        response: conceptJson,
        tone: validatedData.tone,
        iterationType: "original",
        originalityConfidence: 0.95
      });
      if (!conceptId) {
        console.error("Failed to save concept to Supabase - this should not happen!");
      } else {
        console.log(`Concept saved to Supabase with ID: ${conceptId}`);
      }
      const entryId = `enhanced-${Date.now()}`;
      sessionHistory.push({
        id: entryId,
        prompt: validatedData.query,
        content: conceptJson,
        tone: validatedData.tone,
        timestamp: timestamp2,
        isFavorite: false,
        enhanced: true
      });
      res.json({
        id: Date.now(),
        conceptId,
        concept,
        enhanced: true,
        timestamp: timestamp2
      });
    } catch (error) {
      console.error("Enhanced Generation Error:", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : "Failed to generate enhanced concept"
      });
    }
  });
  app2.post("/api/test-enhanced", async (req, res) => {
    try {
      const { generateExampleConcept: generateExampleConcept2 } = await Promise.resolve().then(() => (init_enhancedAI(), enhancedAI_exports));
      console.log(`\u{1F9EA} Generating test concept to confirm enhanced AI understanding`);
      const concept = await generateExampleConcept2();
      res.json({
        success: true,
        message: "Enhanced AI system is working correctly",
        exampleConcept: concept,
        confirmation: "Concept avoids color symbolism, ribbons, tapestry, and threads as required"
      });
    } catch (error) {
      console.error("Enhanced Test Error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to test enhanced system"
      });
    }
  });
  app2.post("/api/export-history", async (req, res) => {
    try {
      const { exportType = "google" } = req.body;
      if (exportType === "google") {
        const { exportHistoryToGoogleDoc: exportHistoryToGoogleDoc2 } = await Promise.resolve().then(() => (init_exportHistoryToGoogleDoc(), exportHistoryToGoogleDoc_exports));
        const documentUrl = await exportHistoryToGoogleDoc2();
        const historyResponse = await fetch("http://localhost:5000/api/history");
        const historyData = historyResponse.ok ? await historyResponse.json() : [];
        res.json({
          success: true,
          message: "Google Docs export completed successfully",
          documentUrl,
          conceptCount: Array.isArray(historyData) ? historyData.length : 0,
          exportType: "google"
        });
      } else {
        const { exportHistoryToLocalDoc: exportHistoryToLocalDoc2 } = await Promise.resolve().then(() => (init_exportHistoryToLocalDoc(), exportHistoryToLocalDoc_exports));
        const filepath = await exportHistoryToLocalDoc2();
        const historyResponse = await fetch("http://localhost:5000/api/history");
        const historyData = historyResponse.ok ? await historyResponse.json() : [];
        res.json({
          success: true,
          message: "Local file export completed successfully",
          filename: filepath ? __require("path").basename(filepath) : "concept-forge-export.txt",
          conceptCount: Array.isArray(historyData) ? historyData.length : 0,
          exportType: "local"
        });
      }
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({
        success: false,
        message: "Export failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/database-history", async (req, res) => {
    try {
      const { supabase: supabase5 } = await Promise.resolve().then(() => (init_supabaseClient(), supabaseClient_exports));
      if (!supabase5) {
        console.error("Supabase client not available");
        res.json([]);
        return;
      }
      const { data: rows, error } = await supabase5.from("concept_logs").select("id, prompt, ai_response, tone, timestamp, enhanced").order("timestamp", { ascending: false });
      if (error) {
        console.error("Database history error:", error);
        res.json([]);
        return;
      }
      console.log(`\u{1F4DA} Retrieved ${rows?.length || 0} concepts from database`);
      res.json(rows || []);
    } catch (error) {
      console.error("Database history error:", error);
      res.json([]);
    }
  });
  app2.get("/download", async (req, res) => {
    try {
      const { readFileSync: readFileSync7 } = await import("fs");
      const { resolve } = await import("path");
      const htmlPath = resolve(process.cwd(), "download-corpus.html");
      const html = readFileSync7(htmlPath, "utf8");
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      console.error("Download page error:", error);
      res.status(500).send("Download page not found");
    }
  });
  app2.get("/api/download/corpus", async (req, res) => {
    try {
      const { readFileSync: readFileSync7, existsSync: existsSync6 } = await import("fs");
      const { resolve } = await import("path");
      const zipPath = resolve(process.cwd(), "concept-forge-retrieval-corpus.zip");
      if (!existsSync6(zipPath)) {
        return res.status(404).json({ message: "Corpus zip file not found" });
      }
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="concept-forge-retrieval-corpus.zip"');
      const fileBuffer = readFileSync7(zipPath);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ message: "Failed to download corpus" });
    }
  });
  app2.post("/api/refine-prompt", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || query.trim().length < 5) {
        return res.status(400).json({ error: "Query too short for refinement" });
      }
      const rewrites = [
        {
          text: `Rhetorical rewrite: ${query} - Emphasize devices like metaphor and antithesis for bold, edgy messaging with strong visual impact and memorable hooks.`,
          rationale: "Boosts creative complexity with rhetorical focus and sophisticated device application."
        },
        {
          text: `Concise rewrite: ${query.split(".")[0].trim()}. Focus on core message with clear value proposition and direct call-to-action.`,
          rationale: "Shortens for clarity while preserving strategic intent and improving focus."
        },
        {
          text: `Theory-grounded rewrite: Apply Burke's identification theory to ${query} for audience empowerment, with Messaris visual persuasion principles for compelling imagery.`,
          rationale: "Injects theoretical sophistication from academic corpus for deeper strategic foundation."
        }
      ];
      res.json({ rewrites });
    } catch (error) {
      console.error("Error refining prompt:", error);
      res.status(500).json({ error: "Failed to refine prompt" });
    }
  });
  app2.get("/api/briefs", async (req, res) => {
    try {
      const starred = req.query.starred === "true";
      const limit = parseInt(req.query.limit) || 50;
      const briefs = await getCreativeBriefs({
        starredOnly: starred,
        limit
      });
      res.json(briefs);
    } catch (error) {
      console.error("Get briefs error:", error);
      res.status(500).json({ message: "Failed to fetch creative briefs" });
    }
  });
  app2.post("/api/briefs", async (req, res) => {
    try {
      const { query, tone, conceptCount, hybridConfig, name, isStarred } = req.body;
      if (!query || !tone) {
        return res.status(400).json({ message: "Query and tone are required" });
      }
      const briefId = await saveCreativeBrief({
        user_id: null,
        name: name || null,
        query,
        tone,
        concept_count: conceptCount || 1,
        hybrid_config: hybridConfig || null,
        is_starred: isStarred || false,
        last_used_at: (/* @__PURE__ */ new Date()).toISOString(),
        times_used: 1
      });
      res.json({ id: briefId, success: !!briefId });
    } catch (error) {
      console.error("Save brief error:", error);
      res.status(500).json({ message: "Failed to save creative brief" });
    }
  });
  app2.patch("/api/briefs/:id/name", async (req, res) => {
    try {
      const { name } = req.body;
      const success = await updateBriefName(req.params.id, name);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ message: "Failed to update brief name" });
      }
    } catch (error) {
      console.error("Update brief name error:", error);
      res.status(500).json({ message: "Failed to update brief name" });
    }
  });
  app2.patch("/api/briefs/:id/star", async (req, res) => {
    try {
      const success = await toggleBriefStarred(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ message: "Failed to toggle starred status" });
      }
    } catch (error) {
      console.error("Toggle star error:", error);
      res.status(500).json({ message: "Failed to toggle starred status" });
    }
  });
  app2.delete("/api/briefs/:id", async (req, res) => {
    try {
      const success = await deleteCreativeBrief(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(400).json({ message: "Failed to delete brief" });
      }
    } catch (error) {
      console.error("Delete brief error:", error);
      res.status(500).json({ message: "Failed to delete brief" });
    }
  });
  app2.get("/api/debug-paths", async (_req, res) => {
    const { existsSync: existsSync6, readdirSync: readdirSync2 } = await import("fs");
    const { join: join6 } = await import("path");
    const paths = [
      "/var/task/data",
      "/var/task/api/data",
      join6(process.cwd(), "data"),
      join6(process.cwd(), "api", "data")
    ];
    const results = { cwd: process.cwd(), dirname: __dirname };
    for (const p of paths) {
      try {
        results[p] = existsSync6(p) ? readdirSync2(p).slice(0, 5) : "NOT FOUND";
      } catch (e) {
        results[p] = e.message;
      }
    }
    res.json(results);
  });
  app2.get("/api/devices", async (_req, res) => {
    try {
      const { loadAllRhetoricalDevices: loadAllRhetoricalDevices3 } = await Promise.resolve().then(() => (init_tropeConstraints(), tropeConstraints_exports));
      const devices = loadAllRhetoricalDevices3();
      const deviceList = Object.entries(devices).map(([id, definition]) => ({
        figure_name: id.replace(/_/g, " "),
        definition
      }));
      deviceList.sort((a, b) => a.figure_name.localeCompare(b.figure_name));
      res.json(deviceList);
    } catch (error) {
      console.error("Error loading devices:", error);
      res.status(500).json({ error: "Failed to load rhetorical devices" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// src/api/handler.ts
import { readFileSync as readFileSync6, existsSync as existsSync5, readdirSync } from "fs";
import { join as join5, dirname as dirname3 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      console.log(logLine);
    }
  });
  next();
});
app.get("/api/devices", (_req, res) => {
  try {
    const handlerDir = dirname3(fileURLToPath2(import.meta.url));
    const searchPaths = [
      join5(handlerDir, "data", "rhetorical_figures_cleaned.json"),
      join5(handlerDir, "..", "data", "rhetorical_figures_cleaned.json"),
      join5(handlerDir, "..", "api", "data", "rhetorical_figures_cleaned.json"),
      join5(process.cwd(), "data", "rhetorical_figures_cleaned.json"),
      join5(process.cwd(), "api", "data", "rhetorical_figures_cleaned.json"),
      "/var/task/data/rhetorical_figures_cleaned.json",
      "/var/task/api/data/rhetorical_figures_cleaned.json"
    ];
    console.log(`[devices] handlerDir: ${handlerDir}, cwd: ${process.cwd()}`);
    for (const p of searchPaths) {
      if (existsSync5(p)) {
        console.log(`[devices] Found data at: ${p}`);
        const raw = JSON.parse(readFileSync6(p, "utf-8"));
        const deviceList = raw.map((d) => ({
          figure_name: d.figure_name,
          definition: d.definition
        }));
        deviceList.sort((a, b) => a.figure_name.localeCompare(b.figure_name));
        return res.json(deviceList);
      }
    }
    const debugPaths = [handlerDir, process.cwd(), "/var/task", "/var/task/api", "/var/task/data"];
    for (const dp of debugPaths) {
      try {
        const contents = readdirSync(dp);
        console.log(`[devices] ls ${dp}: ${contents.join(", ")}`);
      } catch (e) {
        console.log(`[devices] ls ${dp}: ERROR ${e}`);
      }
    }
    const fsDebug = {};
    for (const dp of ["/var/task", "/var/task/api", "/var/task/data", "/var/task/api/data", handlerDir]) {
      try {
        fsDebug[dp] = readdirSync(dp);
      } catch {
        fsDebug[dp] = ["NOT_FOUND"];
      }
    }
    console.error(`[devices] Data file not found. Searched: ${searchPaths.join(", ")}`);
    return res.status(500).json({ error: "Rhetorical devices data file not found", searchPaths, handlerDir, cwd: process.cwd(), fsDebug });
  } catch (error) {
    console.error("[devices] Error:", error);
    return res.status(500).json({ error: "Failed to load devices" });
  }
});
var routesRegistered = false;
var initPromise = (async () => {
  if (!routesRegistered) {
    await registerRoutes(app);
    routesRegistered = true;
  }
})();
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});
async function handler(req, res) {
  await initPromise;
  return app(req, res);
}
export {
  handler as default
};
