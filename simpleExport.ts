import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const args = process.argv.slice(2);
const conceptId = args.find(arg => arg.startsWith('--specificId='))?.split('=')[1];

// Parse CLI formatting options
const headlineSize = args.find(arg => arg.startsWith('--headlineSize='))?.split('=')[1] || 'normal';
const boldHeadlines = args.includes('--boldHeadlines');
const boldSectionHeaders = args.includes('--boldSectionHeaders');
const enableHangingBullets = args.includes('--enableHangingBullets');
const headlineCase = args.find(arg => arg.startsWith('--headlineCase='))?.split('=')[1] || 'sentence';
const sectionLabelsCase = args.find(arg => arg.startsWith('--sectionLabelsCase='))?.split('=')[1] || 'sentence';
const bodyCase = args.find(arg => arg.startsWith('--bodyCase='))?.split('=')[1] || 'sentence';
const noAllCaps = args.includes('--noAllCaps');
const cleanSpacing = args.includes('--cleanSpacing');
const singleParagraphBody = args.includes('--singleParagraphBody');

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

function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function formatTextByCase(text: string, caseType: string): string {
  if (noAllCaps && text === text.toUpperCase()) {
    text = text.toLowerCase();
  }
  
  switch (caseType) {
    case 'title': return toTitleCase(text);
    case 'upper': return text.toUpperCase();
    case 'sentence':
    default: return toSentenceCase(text);
  }
}

function formatRhetoricalCraft(text: string): string {
  let formatted = text
    .replace(/•\s*/g, '\n• ') 
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .trim();
    
  if (enableHangingBullets) {
    formatted = formatted.replace(/\n• /g, '\n  • ');
  }
  
  return formatted;
}

async function simpleExport() {
  if (!conceptId) {
    console.error("Error: --specificId parameter is required");
    return;
  }
  
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  
  const { data: concept, error } = await supabase
    .from('concept_logs')
    .select('*')
    .eq('id', conceptId)
    .single();
  
  if (error || !concept) {
    console.error("Error fetching concept");
    return;
  }
  
  const parsed = parseMarkdownContent(concept.response);
  
  // Apply advanced formatting options
  const formattedHeadline = formatTextByCase(parsed.headline, headlineCase);
  const formattedBody = singleParagraphBody ? 
    parsed.bodyCopy.replace(/\n+/g, ' ').trim() : 
    parsed.bodyCopy;
  const formattedCraft = formatRhetoricalCraft(parsed.rhetoricalCraft);
  
  // Display with CLI formatting options
  console.log("\n🚀 ADVANCED CLI EXPORT WITH COMPREHENSIVE FORMATTING");
  console.log("═══════════════════════════════════════════════════");
  
  const headlinePrefix = headlineSize === 'large' ? '# ' : '';
  const headlineStyle = boldHeadlines ? `**${formattedHeadline}**` : formattedHeadline;
  console.log(`${headlinePrefix}${headlineStyle}`);
  console.log(`*${parsed.tagline}*\n`);
  
  const bodySectionLabel = boldSectionHeaders ? "**Body copy**" : "Body copy";
  console.log(bodySectionLabel);
  console.log(`${formattedBody}\n`);
  
  const visualSectionLabel = boldSectionHeaders ? "**Visual concept**" : "Visual concept";
  console.log(visualSectionLabel);  
  console.log(`${parsed.visualConcept}\n`);
  
  const craftSectionLabel = boldSectionHeaders ? "**Rhetorical craft**" : "Rhetorical craft";
  console.log(craftSectionLabel);
  console.log(`${formattedCraft}\n`);
  
  console.log("CLI FORMATTING OPTIONS APPLIED:");
  console.log("═══════════════════════════════════");
  console.log(`✓ Headline case: ${headlineCase}`);
  console.log(`✓ Headline size: ${headlineSize}`);
  console.log(`✓ Bold headlines: ${boldHeadlines ? 'enabled' : 'disabled'}`);
  console.log(`✓ Bold section headers: ${boldSectionHeaders ? 'enabled' : 'disabled'}`);
  console.log(`✓ Hanging bullets: ${enableHangingBullets ? 'enabled' : 'disabled'}`);
  console.log(`✓ Single paragraph body: ${singleParagraphBody ? 'enabled' : 'disabled'}`);
  console.log(`✓ No all caps: ${noAllCaps ? 'enabled' : 'disabled'}`);
  console.log(`✓ Clean spacing: ${cleanSpacing ? 'enabled' : 'disabled'}`);
  console.log("\nAdvanced CLI export complete with professional formatting");
  
  return {
    headline: formattedHeadline,
    tagline: parsed.tagline,
    bodyCopy: formattedBody,
    visualConcept: parsed.visualConcept,
    rhetoricalCraft: formattedCraft
  };
}

simpleExport().catch(console.error);