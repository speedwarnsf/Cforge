// localStorage-based concept history and favorites management

export interface StoredConcept {
  id: string;
  timestamp: string;
  prompt: string;
  tone: string;
  headlines: string[];
  tagline?: string;
  bodyCopy?: string;
  visualDescription: string;
  rhetoricalDevice: string;
  originalityScore: number;
  fullMarkdown?: string;
  // Arbiter scores
  professionalismScore?: number;
  clarityScore?: number;
  freshnessScore?: number;
  resonanceScore?: number;
  awardsScore?: number;
  finalStatus?: string;
  // Arbiter reasoning
  critique?: string;
  juryComment?: string;
  improvementTip?: string;
  reflection?: string;
  vibe?: string;
  deviceDefinition?: string;
  // Meta
  isFavorite: boolean;
  // Versioning
  parentId?: string;
  version?: number;
  refinementType?: string;
}

/**
 * Convert a raw result from the generation pipeline into a StoredConcept
 */
export function resultToStoredConcept(
  result: any,
  prompt: string,
  tone: string
): StoredConcept {
  const headlines: string[] = [];
  if (result.headline) headlines.push(result.headline);
  if (result.headlines) headlines.push(...result.headlines);
  if (headlines.length === 0) headlines.push('Untitled Concept');

  return {
    id: result.id || `concept-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    prompt,
    tone,
    headlines,
    tagline: result.tagline || '',
    bodyCopy: result.bodyCopy || '',
    visualDescription: result.visualConcept || result.visualDescription || '',
    rhetoricalDevice: Array.isArray(result.devices)
      ? result.devices.join(', ')
      : result.devices || result.rhetoricalDevice || 'Unknown',
    originalityScore: result.originalityScore || 0,
    fullMarkdown: result.content || '',
    professionalismScore: result.professionalismScore,
    clarityScore: result.clarityScore,
    freshnessScore: result.freshnessScore,
    resonanceScore: result.resonanceScore,
    awardsScore: result.awardsScore,
    finalStatus: result.finalStatus,
    critique: result.critique || '',
    juryComment: result.juryComment || '',
    improvementTip: result.improvementTip || '',
    reflection: result.reflection || '',
    vibe: result.vibe || '',
    deviceDefinition: result.deviceDefinition || '',
    isFavorite: false,
  };
}

const HISTORY_KEY = 'cforge_concept_history';
const MAX_HISTORY = 200;

export function getConceptHistory(): StoredConcept[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveConceptsToHistory(concepts: StoredConcept[]): void {
  const existing = getConceptHistory();
  const existingIds = new Set(existing.map(c => c.id));
  const newConcepts = concepts.filter(c => !existingIds.has(c.id));
  const merged = [...newConcepts, ...existing].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
}

export function toggleFavorite(conceptId: string): boolean {
  const history = getConceptHistory();
  const concept = history.find(c => c.id === conceptId);
  if (concept) {
    concept.isFavorite = !concept.isFavorite;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return concept.isFavorite;
  }
  return false;
}

export function getFavorites(): StoredConcept[] {
  return getConceptHistory().filter(c => c.isFavorite);
}

export function deleteConcept(conceptId: string): void {
  const history = getConceptHistory().filter(c => c.id !== conceptId);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  const favorites = getFavorites();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(favorites));
}

/** Get all versions in a concept's chain (oldest first) */
export function getVersionChain(conceptId: string): StoredConcept[] {
  const all = getConceptHistory();
  
  // Walk up to find root
  let rootId = conceptId;
  const visited = new Set<string>();
  while (true) {
    const current = all.find(c => c.id === rootId);
    if (!current || !current.parentId || visited.has(rootId)) break;
    visited.add(rootId);
    rootId = current.parentId;
  }
  
  // Walk down from root collecting all descendants
  const chain: StoredConcept[] = [];
  const queue = [rootId];
  const seen = new Set<string>();
  
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const concept = all.find(c => c.id === id);
    if (concept) {
      chain.push(concept);
      // Find children
      const children = all.filter(c => c.parentId === id);
      children.forEach(c => queue.push(c.id));
    }
  }
  
  // Sort by version number or timestamp
  return chain.sort((a, b) => (a.version || 1) - (b.version || 1));
}
