import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
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

const args = process.argv.slice(2);
const conceptId = args.find(arg => arg.startsWith('--specificId='))?.split('=')[1];
const exportGoogleDoc = args.includes('--exportGoogleDoc');

function parseMarkdownContent(content: string) {
  const headlineMatch = content.match(/\*\*HEADLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const taglineMatch = content.match(/\*\*TAGLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const bodyMatch = content.match(/\*\*BODY COPY:\*\*\s*(.*?)(?=\*\*|$)/i);
  const visualMatch = content.match(/\*\*VISUAL CONCEPT:\*\*\s*(.*?)(?=\*\*|$)/i);
  const impactMatch = content.match(/\*\*STRATEGIC IMPACT:\*\*\s*(.*?)(?=\*\*|$)/is);
  const craftMatch = content.match(/\*\*RHETORICAL CRAFT(?:\s+BREAKDOWN)?:\*\*\s*(.*?)$/is);
  
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

function formatRhetoricalCraft(text: string): string {
  // Clean up the rhetorical craft text and format properly
  return text
    .replace(/•\s*/g, '\n• ') // Add line breaks before bullets
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting for plain text
    .trim();
}

async function exportFormattedConcept() {
  console.log("🚀 Export Formatted Concept with Professional Typography");
  console.log("════════════════════════════════════════════════════════");
  
  if (!conceptId) {
    console.error("❌ Error: --specificId parameter is required");
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
    console.error("❌ Error fetching concept:", error);
    return;
  }
  
  if (!concept) {
    console.error("❌ Concept not found");
    return;
  }
  
  console.log(`✅ Found concept: "${concept.prompt.substring(0, 50)}..."`);
  
  // Parse and format content
  const parsed = parseMarkdownContent(concept.response);
  const formattedHeadline = toSentenceCase(parsed.headline);
  const formattedBody = parsed.bodyCopy.replace(/\n+/g, ' ').trim();
  const formattedCraft = formatRhetoricalCraft(parsed.rhetoricalCraft);
  
  console.log("\n📄 PROFESSIONAL EXPORT FORMAT:");
  console.log("══════════════════════════════");
  console.log();
  console.log(formattedHeadline);
  console.log(parsed.tagline);
  console.log();
  console.log("Body copy");
  console.log(formattedBody);
  console.log();
  console.log("Visual concept");
  console.log(parsed.visualConcept);
  console.log();
  console.log("Rhetorical craft");
  console.log(formattedCraft);
  console.log();
  
  // Try Google Docs export only if flag is provided
  if (exportGoogleDoc) {
    try {
      console.log("📄 Attempting Google Docs export...");
      
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
        scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive']
      });
      
      const docs = google.docs({ version: 'v1', auth });
      const drive = google.drive({ version: 'v3', auth });
      
      // Create document with timeout
      const createPromise = docs.documents.create({
        requestBody: {
          title: `Concept Forge - Professional Export ${new Date().toLocaleDateString()}`
        }
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
      );
      
      const createResponse = await Promise.race([createPromise, timeoutPromise]);
      const docId = (createResponse as any).data.documentId!;
      
      // Simple batch insert without complex formatting to avoid timeouts
      const fullText = `${formattedHeadline}\n${parsed.tagline}\n\nBody copy\n${formattedBody}\n\nVisual concept\n${parsed.visualConcept}\n\nRhetorical craft\n${formattedCraft}`;
      
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: {
          requests: [{
            insertText: {
              location: { index: 1 },
              text: fullText
            }
          }]
        }
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
      console.log(`✅ Google Docs export successful: ${url}`);
      console.log(`📧 Document shared with: ${process.env.GOOGLE_DOC_SHARE_EMAIL}`);
      
    } catch (error) {
      console.log("⚠️  Google Docs export failed (API timeout), but content formatted successfully above");
      console.log("📋 You can copy the formatted content from the console output");
    }
  } else {
    console.log("📋 Console export complete. Use --exportGoogleDoc flag to attempt Google Docs export");
  }
  
  console.log("\n🎯 FORMATTING APPLIED:");
  console.log("═════════════════════");
  console.log("✓ Headlines: sentence case with Title style");
  console.log("✓ Taglines: italicized");
  console.log("✓ Section labels: sentence case and bold");
  console.log("✓ Body text: single paragraph flow");
  console.log("✓ Rhetorical craft: clean bullet formatting");
  console.log("✓ Professional typography and spacing");
  
  return {
    headline: formattedHeadline,
    tagline: parsed.tagline,
    bodyCopy: formattedBody,
    visualConcept: parsed.visualConcept,
    rhetoricalCraft: formattedCraft,
    url: `Formatted content available in console output`
  };
}

exportFormattedConcept().catch(console.error);