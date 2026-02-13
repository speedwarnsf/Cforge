import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);
const conceptId = args.find(arg => arg.startsWith('--specificId='))?.split('=')[1];

function parseMarkdownContent(content: string) {
  const headlineMatch = content.match(/\*\*HEADLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const taglineMatch = content.match(/\*\*TAGLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const bodyMatch = content.match(/\*\*BODY COPY:\*\*\s*(.*?)(?=\*\*|$)/i);
  const visualMatch = content.match(/\*\*VISUAL CONCEPT:\*\*\s*(.*?)(?=\*\*|$)/i);
  const craftMatch = content.match(/\*\*RHETORICAL CRAFT(?:\s+BREAKDOWN)?:\*\*\s*(.*?)$/is);
  
  return {
    headline: headlineMatch ? headlineMatch[1].trim() : 'No headline found',
    tagline: taglineMatch ? taglineMatch[1].trim() : 'No tagline found',
    bodyCopy: bodyMatch ? bodyMatch[1].trim() : 'No body copy found',
    visualConcept: visualMatch ? visualMatch[1].trim() : 'No visual concept found',
    rhetoricalCraft: craftMatch ? craftMatch[1].trim() : 'No rhetorical craft found'
  };
}

function toSentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function formatBullets(text: string): string {
  return text
    .replace(/•\s*/g, '\n• ') 
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .trim();
}

async function quickExport() {
  if (!conceptId) {
    // Get latest concept if no ID specified
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
    
    const { data: concepts, error } = await supabase
      .from('concept_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error || !concepts || concepts.length === 0) {
      console.error("No concepts found");
      return;
    }
    
    const concept = concepts[0];
    console.log(`Exporting latest concept: "${concept.prompt.substring(0, 40)}..."`);
    
    const parsed = parseMarkdownContent(concept.response);
    
    console.log(`\n${toSentenceCase(parsed.headline)}`);
    console.log(`${parsed.tagline}\n`);
    console.log("Body copy");
    console.log(`${parsed.bodyCopy.replace(/\n+/g, ' ').trim()}\n`);
    console.log("Visual concept");  
    console.log(`${parsed.visualConcept}\n`);
    console.log("Rhetorical craft");
    console.log(`${formatBullets(parsed.rhetoricalCraft)}\n`);
    console.log("Latest concept exported with professional formatting");
    
  } else {
    // Export specific concept by ID
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
    
    const { data: concept, error } = await supabase
      .from('concept_logs')
      .select('*')
      .eq('id', conceptId)
      .single();
    
    if (error || !concept) {
      console.error("Concept not found");
      return;
    }
    
    console.log(`Exporting concept: "${concept.prompt.substring(0, 40)}..."`);
    
    const parsed = parseMarkdownContent(concept.response);
    
    console.log(`\n${toSentenceCase(parsed.headline)}`);
    console.log(`${parsed.tagline}\n`);
    console.log("Body copy");
    console.log(`${parsed.bodyCopy.replace(/\n+/g, ' ').trim()}\n`);
    console.log("Visual concept");  
    console.log(`${parsed.visualConcept}\n`);
    console.log("Rhetorical craft");
    console.log(`${formatBullets(parsed.rhetoricalCraft)}\n`);
    console.log("Concept exported with professional formatting");
  }
}

quickExport().catch(console.error);