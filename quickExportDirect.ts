import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

interface ConceptEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  is_favorite?: boolean;
}

// Get command line arguments
const args = process.argv.slice(2);
const conceptId = args.find(arg => arg.startsWith('--specificId='))?.split('=')[1];

function parseMarkdownContent(content: string) {
  const headlineMatch = content.match(/\*\*HEADLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const taglineMatch = content.match(/\*\*TAGLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const bodyMatch = content.match(/\*\*BODY COPY:\*\*\s*(.*?)(?=\*\*|$)/i);
  const visualMatch = content.match(/\*\*VISUAL CONCEPT:\*\*\s*(.*?)(?=\*\*|$)/i);
  const impactMatch = content.match(/\*\*STRATEGIC IMPACT:\*\*\s*(.*?)(?=\*\*|$)/is);
  // Enhanced regex to capture all content after RHETORICAL CRAFT until end of string
  const craftMatch = content.match(/\*\*RHETORICAL CRAFT(?:\s+BREAKDOWN)?:\*\*\s*(.*?)$/is);
  
  console.log("\n🔍 DEBUG PARSING:");
  console.log(`Craft match found: ${craftMatch ? 'YES' : 'NO'}`);
  if (craftMatch) {
    console.log(`Craft content length: ${craftMatch[1].length}`);
    console.log(`Craft preview: ${craftMatch[1].substring(0, 100)}...`);
  }
  
  return {
    headline: headlineMatch ? headlineMatch[1].trim() : 'No headline found',
    tagline: taglineMatch ? taglineMatch[1].trim() : 'No tagline found',
    bodyCopy: bodyMatch ? bodyMatch[1].trim() : 'No body copy found',
    visualConcept: visualMatch ? visualMatch[1].trim() : 'No visual concept found',
    strategicImpact: impactMatch ? impactMatch[1].trim() : 'No strategic impact found',
    rhetoricalCraft: craftMatch ? craftMatch[1].trim() : 'No rhetorical craft found'
  };
}

function toSentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

async function quickExportDirect() {
  console.log("🚀 Quick Direct Export with Enhanced Formatting");
  console.log("═══════════════════════════════════════════════");
  
  if (!conceptId) {
    console.error("Error: --specificId parameter is required");
    return;
  }
  
  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );
  
  // Fetch the specific concept
  console.log(`🔍 Fetching concept ${conceptId}...`);
  const { data: concept, error } = await supabase
    .from('concept_logs')
    .select('*')
    .eq('id', conceptId)
    .single();
  
  if (error) {
    console.error("Error fetching concept:", error);
    return;
  }
  
  if (!concept) {
    console.error("Concept not found");
    return;
  }
  
  console.log(`Found concept: "${concept.prompt.substring(0, 50)}..."`);
  console.log(`Tone: ${concept.tone}`);
  console.log(`Content length: ${concept.response.length}`);
  
  // Parse content
  const parsed = parseMarkdownContent(concept.response);
  
  console.log("\n📊 PARSED CONTENT ANALYSIS:");
  console.log("═══════════════════════════");
  console.log(`Headline: ${parsed.headline !== 'No headline found' ? 'Found' : 'Missing'}`);
  console.log(`Tagline: ${parsed.tagline !== 'No tagline found' ? 'Found' : 'Missing'}`);
  console.log(`Body Copy: ${parsed.bodyCopy !== 'No body copy found' ? 'Found' : 'Missing'}`);
  console.log(`Visual Concept: ${parsed.visualConcept !== 'No visual concept found' ? 'Found' : 'Missing'}`);
  console.log(`Rhetorical Craft: ${parsed.rhetoricalCraft !== 'No rhetorical craft found' ? 'Found' : 'Missing'}`);
  console.log(`Strategic Impact: ${parsed.strategicImpact !== 'No strategic impact found' ? 'Found' : 'Missing'}`);
  
  // Format content with sentence case
  const formattedHeadline = toSentenceCase(parsed.headline);
  const formattedBody = parsed.bodyCopy.replace(/\n+/g, ' ').trim(); // Single paragraph
  
  console.log("\nFORMATTED EXPORT CONTENT:");
  console.log("════════════════════════════");
  console.log(`\n${formattedHeadline}`);
  console.log(`${parsed.tagline}\n`);
  console.log("Body copy");
  console.log(`${formattedBody}\n`);
  console.log("Visual concept");
  console.log(`${parsed.visualConcept}\n`);
  console.log("Rhetorical craft");
  console.log(`${parsed.rhetoricalCraft}\n`);
  
  if (parsed.strategicImpact !== 'No strategic impact found') {
    console.log("Strategic impact");
    console.log(`${parsed.strategicImpact}\n`);
  }
  
  console.log("Direct export formatting complete!");
  console.log("\nFORMATTING APPLIED:");
  console.log("═════════════════════");
  console.log("✓ Headlines: sentence case");
  console.log("✓ Section labels: sentence case");
  console.log("✓ Body text: single paragraph flow");
  console.log("✓ Clean spacing and typography");
  
  return {
    headline: formattedHeadline,
    tagline: parsed.tagline,
    bodyCopy: formattedBody,
    visualConcept: parsed.visualConcept,
    rhetoricalCraft: parsed.rhetoricalCraft,
    strategicImpact: parsed.strategicImpact
  };
}

quickExportDirect().catch(console.error);