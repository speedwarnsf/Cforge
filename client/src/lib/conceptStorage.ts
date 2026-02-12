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
  // Meta
  isFavorite: boolean;
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
