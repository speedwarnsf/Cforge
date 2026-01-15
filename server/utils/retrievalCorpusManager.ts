/**
 * RETRIEVAL CORPUS MANAGER
 * Manages campaign examples for AI generation context
 */

import { supabase } from "../supabaseClient";
import * as fs from 'fs';
import * as path from 'path';

export interface RetrievalCorpusEntry {
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

const CORPUS_FILE = path.join(process.cwd(), 'data', 'retrieval-corpus.json');

/**
 * Load corpus from JSON file
 */
function loadCorpusFromFile(): RetrievalCorpusEntry[] {
  try {
    if (!fs.existsSync(CORPUS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(CORPUS_FILE, 'utf8');
    return JSON.parse(data) || [];
  } catch (error) {
    console.warn('Error loading corpus file:', error);
    return [];
  }
}

/**
 * Save corpus to JSON file
 */
function saveCorpusToFile(corpus: RetrievalCorpusEntry[]): void {
  try {
    const dir = path.dirname(CORPUS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CORPUS_FILE, JSON.stringify(corpus, null, 2));
  } catch (error) {
    console.error('Error saving corpus file:', error);
  }
}

/**
 * Check if a corpus entry already exists (by headline and campaign)
 */
function entryExists(headline: string, campaign: string, corpus: RetrievalCorpusEntry[]): boolean {
  return corpus.some(entry => 
    entry.headline === headline && entry.campaign === campaign
  );
}

/**
 * Validate corpus entry schema
 */
function validateEntry(entry: any): entry is RetrievalCorpusEntry {
  const required = ['campaign', 'brand', 'year', 'headline', 'rhetoricalDevices', 'rationale', 'outcome', 'whenToUse', 'whenNotToUse'];
  
  for (const field of required) {
    if (!(field in entry)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  if (!Array.isArray(entry.rhetoricalDevices)) {
    console.error('rhetoricalDevices must be an array');
    return false;
  }

  if (typeof entry.year !== 'number') {
    console.error('year must be a number');
    return false;
  }

  return true;
}

/**
 * Add a single corpus entry
 */
export function addCorpusEntry(entry: RetrievalCorpusEntry): boolean {
  try {
    // Validate entry
    if (!validateEntry(entry)) {
      console.error('Entry failed validation:', entry);
      return false;
    }

    // Load existing corpus
    const corpus = loadCorpusFromFile();

    // Check for duplicates
    if (entryExists(entry.headline, entry.campaign, corpus)) {
      console.log(`⚠️ Skipping duplicate entry: "${entry.headline}" from ${entry.campaign}`);
      return false;
    }

    // Add new entry
    corpus.push(entry);
    
    // Save back to file
    saveCorpusToFile(corpus);

    console.log(`✅ Added corpus entry: "${entry.headline}" from ${entry.campaign} (${entry.year})`);
    return true;

  } catch (error) {
    console.error('Unexpected error adding corpus entry:', error);
    return false;
  }
}

/**
 * Import multiple corpus entries from JSON array
 */
export function importCorpusEntries(entries: RetrievalCorpusEntry[]): {
  total: number;
  added: number;
  skipped: number;
  errors: number;
} {
  let added = 0;
  let skipped = 0;
  let errors = 0;

  console.log(`📝 Importing ${entries.length} corpus entries...`);

  // Load existing corpus once
  const corpus = loadCorpusFromFile();

  for (const entry of entries) {
    // Validate entry
    if (!validateEntry(entry)) {
      console.error('Entry failed validation:', entry);
      errors++;
      continue;
    }

    // Check for duplicates
    if (entryExists(entry.headline, entry.campaign, corpus)) {
      console.log(`⚠️ Skipping duplicate entry: "${entry.headline}" from ${entry.campaign}`);
      skipped++;
      continue;
    }

    // Add to corpus
    corpus.push(entry);
    console.log(`✅ Added corpus entry: "${entry.headline}" from ${entry.campaign} (${entry.year})`);
    added++;
  }

  // Save all changes at once
  if (added > 0) {
    saveCorpusToFile(corpus);
  }

  const summary = {
    total: entries.length,
    added,
    skipped,
    errors
  };

  console.log(`📊 Import Summary: ${added} added, ${skipped} skipped (duplicates), ${errors} errors`);
  return summary;
}

/**
 * Get all corpus entries
 */
export function getAllCorpusEntries(): RetrievalCorpusEntry[] {
  return loadCorpusFromFile();
}

/**
 * Save corpus entries (exported function)
 */
export function saveCorpusEntries(entries: RetrievalCorpusEntry[]): void {
  saveCorpusToFile(entries);
}

export default {
  addCorpusEntry,
  importCorpusEntries,
  getAllCorpusEntries,
  saveCorpusEntries
};