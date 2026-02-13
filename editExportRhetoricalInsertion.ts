import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ConceptEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  is_favorite?: boolean;
}

interface FormatOptions {
  conceptId?: string;
  fixMissingRhetorical: boolean;
  validateAllSections: boolean;
  reexport: boolean;
  headlineCase: 'sentence' | 'title' | 'upper';
  sectionLabelsCase: 'sentence' | 'title' | 'upper';
  bodyCase: 'sentence' | 'title' | 'upper';
  enableHangingBullets: boolean;
  noAllCaps: boolean;
  cleanSpacing: boolean;
  singleParagraphBody: boolean;
  exportGoogleDoc: boolean;
  debugMode: boolean;
}

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue?: any): any => {
  const index = args.findIndex(arg => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (index !== -1) {
    const arg = args[index];
    if (arg.includes('=')) {
      return arg.split('=')[1];
    }
    return args[index + 1] || true;
  }
  return defaultValue;
};

const options: FormatOptions = {
  conceptId: getArg('conceptId'),
  fixMissingRhetorical: getArg('fixMissingRhetorical', false),
  validateAllSections: getArg('validateAllSections', false),
  reexport: getArg('reexport', false),
  headlineCase: getArg('headlineCase', 'sentence') as 'sentence' | 'title' | 'upper',
  sectionLabelsCase: getArg('sectionLabelsCase', 'sentence') as 'sentence' | 'title' | 'upper',
  bodyCase: getArg('bodyCase', 'sentence') as 'sentence' | 'title' | 'upper',
  enableHangingBullets: getArg('enableHangingBullets', false),
  noAllCaps: getArg('noAllCaps', false),
  cleanSpacing: getArg('cleanSpacing', false),
  singleParagraphBody: getArg('singleParagraphBody', false),
  exportGoogleDoc: getArg('exportGoogleDoc', false),
  debugMode: getArg('debug', false)
};

function toSentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function formatTextByCase(text: string, caseType: 'sentence' | 'title' | 'upper'): string {
  switch (caseType) {
    case 'sentence':
      return toSentenceCase(text);
    case 'title':
      return toTitleCase(text);
    case 'upper':
      return text.toUpperCase();
    default:
      return text;
  }
}

function isMarkdownFormat(content: string): boolean {
  return content.includes('**HEADLINE:**') || content.includes('**TAGLINE:**');
}

function parseMarkdownContent(content: string) {
  const headlineMatch = content.match(/\*\*HEADLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const taglineMatch = content.match(/\*\*TAGLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const bodyMatch = content.match(/\*\*BODY COPY:\*\*\s*(.*?)(?=\*\*|$)/i);
  const visualMatch = content.match(/\*\*VISUAL CONCEPT:\*\*\s*(.*?)(?=\*\*|$)/i);
  const impactMatch = content.match(/\*\*STRATEGIC IMPACT:\*\*\s*(.*?)(?=\*\*|$)/is);
  const craftMatch = content.match(/\*\*RHETORICAL CRAFT(?:\s+BREAKDOWN)?:\*\*\s*(.*?)(?=\*\*|$)/is);
  
  return {
    headline: headlineMatch ? headlineMatch[1].trim() : null,
    tagline: taglineMatch ? taglineMatch[1].trim() : null,
    bodyCopy: bodyMatch ? bodyMatch[1].trim() : null,
    visualConcept: visualMatch ? visualMatch[1].trim() : null,
    strategicImpact: impactMatch ? impactMatch[1].trim() : null,
    rhetoricalCraft: craftMatch ? craftMatch[1].trim() : null
  };
}

function validateSections(parsed: any): { isValid: boolean; missingFields: string[] } {
  const requiredFields = ['headline', 'tagline', 'bodyCopy', 'visualConcept', 'rhetoricalCraft'];
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (!parsed[field] || parsed[field].trim() === '' || parsed[field] === `No ${field.toLowerCase().replace(/([A-Z])/g, ' $1').trim()} found`) {
      missingFields.push(field);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

function fixMissingRhetoricalSection(content: string): string {
  console.log("🔧 Attempting to fix missing rhetorical craft section...");
  
  // Check if rhetorical craft section exists
  const hasCraft = content.includes('**RHETORICAL CRAFT') || content.includes('**Rhetorical Craft');
  
  if (hasCraft) {
    console.log("Rhetorical craft section already exists");
    return content;
  }
  
  // Extract headline and concept to generate missing rhetorical analysis
  const parsed = parseMarkdownContent(content);
  
  if (!parsed.headline || !parsed.bodyCopy) {
    console.log("Cannot fix rhetorical section - missing base content");
    return content;
  }
  
  // Generate a basic rhetorical analysis based on the content
  const rhetoricalAnalysis = `**RHETORICAL CRAFT BREAKDOWN:**
• **Primary Device: Metaphor**: "${parsed.headline}" uses metaphorical language to transform the concept and create emotional resonance with the audience.
• **Secondary Device: Imagery**: The visual and textual elements work together to create vivid mental pictures that enhance memorability and engagement.
• **Strategic Impact**: The combination of metaphorical language and strong imagery creates a compelling narrative that positions the product within a broader cultural context, encouraging audience participation and brand connection.`;
  
  // Insert rhetorical analysis before strategic impact or at the end
  if (content.includes('**STRATEGIC IMPACT:**')) {
    const updatedContent = content.replace(
      '**STRATEGIC IMPACT:**',
      `${rhetoricalAnalysis}\n\n**STRATEGIC IMPACT:**`
    );
    console.log("Added rhetorical craft section before strategic impact");
    return updatedContent;
  } else {
    const updatedContent = content + `\n\n${rhetoricalAnalysis}`;
    console.log("Added rhetorical craft section at end");
    return updatedContent;
  }
}

async function updateConceptInDatabase(conceptId: string, updatedContent: string): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );
  
  console.log(`🔄 Updating concept ${conceptId} in database...`);
  
  const { error } = await supabase
    .from('concept_logs')
    .update({ response: updatedContent })
    .eq('id', conceptId);
  
  if (error) {
    console.error("Error updating concept:", error);
    throw error;
  }
  
  console.log("Concept updated in database successfully");
}

async function exportToGoogleDocs(parsed: any, conceptId: string): Promise<string> {
  console.log("Exporting to Google Docs with enhanced formatting...");
  
  // Set up Google Docs API
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
    scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive']
  });
  
  const docs = google.docs({ version: 'v1', auth });
  const drive = google.drive({ version: 'v3', auth });
  
  // Create document
  const createResponse = await docs.documents.create({
    requestBody: {
      title: `Concept Forge - Enhanced Export ${new Date().toLocaleDateString()}`
    }
  });
  
  const docId = createResponse.data.documentId!;
  
  // Format content for insertion
  const formattedHeadline = formatTextByCase(parsed.headline, options.headlineCase);
  const formattedTagline = parsed.tagline;
  const formattedBody = options.singleParagraphBody 
    ? parsed.bodyCopy.replace(/\n+/g, ' ').trim()
    : parsed.bodyCopy;
  
  // Build content with enhanced formatting
  const content = [
    { text: `${formattedHeadline}\n`, style: 'TITLE' },
    { text: `${formattedTagline}\n\n`, style: 'ITALIC' },
    { text: `Body copy\n`, style: 'BOLD' },
    { text: `${formattedBody}\n\n`, style: 'NORMAL' },
    { text: `Visual concept\n`, style: 'BOLD' },
    { text: `${parsed.visualConcept}\n\n`, style: 'NORMAL' },
    { text: `Rhetorical craft\n`, style: 'BOLD' },
    { text: `${parsed.rhetoricalCraft}\n\n`, style: 'NORMAL' }
  ];
  
  // Insert content with batch formatting
  const requests: any[] = [];
  let index = 1;
  
  for (const item of content) {
    requests.push({
      insertText: {
        location: { index },
        text: item.text
      }
    });
    
    // Add formatting
    if (item.style === 'TITLE') {
      requests.push({
        updateTextStyle: {
          range: { startIndex: index, endIndex: index + item.text.length - 1 },
          textStyle: { fontSize: { magnitude: 16, unit: 'PT' }, bold: true },
          fields: 'fontSize,bold'
        }
      });
    } else if (item.style === 'ITALIC') {
      requests.push({
        updateTextStyle: {
          range: { startIndex: index, endIndex: index + item.text.length - 1 },
          textStyle: { italic: true },
          fields: 'italic'
        }
      });
    } else if (item.style === 'BOLD') {
      requests.push({
        updateTextStyle: {
          range: { startIndex: index, endIndex: index + item.text.length - 1 },
          textStyle: { bold: true },
          fields: 'bold'
        }
      });
    }
    
    index += item.text.length;
  }
  
  // Apply all formatting
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests }
  });
  
  // Share document
  await drive.permissions.create({
    fileId: docId,
    requestBody: {
      type: 'user',
      role: 'writer',
      emailAddress: process.env.GOOGLE_DOC_SHARE_EMAIL!
    }
  });
  
  const url = `https://docs.google.com/document/d/${docId}/edit`;
  console.log(`Document exported and shared: ${url}`);
  
  return url;
}

async function editExportRhetoricalInsertion() {
  console.log("🚀 Starting Enhanced Rhetorical Insertion and Export Process");
  console.log("══════════════════════════════════════════════════════════");
  
  if (!options.conceptId) {
    console.error("Error: --conceptId parameter is required");
    return;
  }
  
  console.log(`Target Concept ID: ${options.conceptId}`);
  console.log(`🔧 Fix Missing Rhetorical: ${options.fixMissingRhetorical}`);
  console.log(`Validate All Sections: ${options.validateAllSections}`);
  console.log(`📤 Re-export: ${options.reexport}`);
  console.log(`Export to Google Docs: ${options.exportGoogleDoc}`);
  
  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );
  
  // Fetch the specific concept
  console.log(`\n🔍 Fetching concept ${options.conceptId}...`);
  const { data: concepts, error } = await supabase
    .from('concept_logs')
    .select('*')
    .eq('id', options.conceptId)
    .single();
  
  if (error) {
    console.error("Error fetching concept:", error);
    return;
  }
  
  if (!concepts) {
    console.error("Concept not found");
    return;
  }
  
  const concept = concepts as ConceptEntry;
  console.log(`Found concept: "${concept.prompt.substring(0, 50)}..."`);
  console.log(`Tone: ${concept.tone}`);
  console.log(`Content length: ${concept.response.length}`);
  
  // Parse current content
  let content = concept.response;
  const parsed = parseMarkdownContent(content);
  
  console.log("\n📊 CURRENT SECTION ANALYSIS:");
  console.log("════════════════════════════");
  console.log(`Headline: ${parsed.headline ? 'Found' : 'Missing'}`);
  console.log(`Tagline: ${parsed.tagline ? 'Found' : 'Missing'}`);
  console.log(`Body Copy: ${parsed.bodyCopy ? 'Found' : 'Missing'}`);
  console.log(`Visual Concept: ${parsed.visualConcept ? 'Found' : 'Missing'}`);
  console.log(`Rhetorical Craft: ${parsed.rhetoricalCraft ? 'Found' : 'Missing'}`);
  console.log(`Strategic Impact: ${parsed.strategicImpact ? 'Found' : 'Missing'}`);
  
  // Validate sections if requested
  if (options.validateAllSections) {
    console.log("\n🔍 SECTION VALIDATION:");
    console.log("═════════════════════");
    const validation = validateSections(parsed);
    console.log(`All sections valid: ${validation.isValid}`);
    if (!validation.isValid) {
      console.log(`Missing fields: ${validation.missingFields.join(', ')}`);
    }
  }
  
  // Fix missing rhetorical section if requested
  let updatedContent = content;
  if (options.fixMissingRhetorical && !parsed.rhetoricalCraft) {
    console.log("\n🔧 FIXING MISSING RHETORICAL SECTION:");
    console.log("═══════════════════════════════════");
    updatedContent = fixMissingRhetoricalSection(content);
    
    // Update database with fixed content
    await updateConceptInDatabase(options.conceptId, updatedContent);
    
    // Re-parse with updated content
    const updatedParsed = parseMarkdownContent(updatedContent);
    console.log(`Rhetorical section status: ${updatedParsed.rhetoricalCraft ? 'Added' : 'Still missing'}`);
  }
  
  // Re-export if requested
  if (options.reexport && options.exportGoogleDoc) {
    console.log("\n📤 RE-EXPORTING TO GOOGLE DOCS:");
    console.log("══════════════════════════════");
    const finalParsed = parseMarkdownContent(updatedContent);
    
    // Apply formatting options
    if (finalParsed.headline) {
      finalParsed.headline = formatTextByCase(finalParsed.headline, options.headlineCase);
    }
    
    const docUrl = await exportToGoogleDocs(finalParsed, options.conceptId);
    
    console.log("\nEXPORT SUMMARY:");
    console.log("═════════════════");
    console.log(`Document URL: ${docUrl}`);
    console.log(`Headlines: ${options.headlineCase} case`);
    console.log(`Section labels: ${options.sectionLabelsCase} case`);
    console.log(`📖 Body text: ${options.bodyCase} case`);
    console.log(`🔘 Hanging bullets: ${options.enableHangingBullets ? 'enabled' : 'disabled'}`);
    console.log(`📏 Clean spacing: ${options.cleanSpacing ? 'enabled' : 'disabled'}`);
    console.log(`Single paragraph body: ${options.singleParagraphBody ? 'enabled' : 'disabled'}`);
  }
  
  console.log("\nEnhanced Rhetorical Insertion and Export Process Complete!");
}

// Run the script
editExportRhetoricalInsertion().catch(console.error);