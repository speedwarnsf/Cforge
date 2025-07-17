import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

interface ConceptEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  is_favorite?: boolean;
}

function clean(text: string = ""): string {
  return text
    .replace(/^\*\*([^:]+):\*\*/gm, "$1:") // Remove bold formatting from labels
    .replace(/\*\*/g, "") // Remove all bold markers
    .replace(/^#\s+/gm, "") // Remove markdown headers
    .replace(/^-\s+/gm, "• ") // Convert bullets to proper bullet points
    .replace(/\n\s*\n/g, "\n") // Remove extra blank lines
    .trim();
}

function isMarkdownFormat(content: string): boolean {
  // Check if content starts with # (markdown header) or contains **bold:** patterns
  return content.includes('# ') || content.includes('**Tagline:**') || content.includes('**Body Copy:**');
}

function parseMarkdownContent(content: string) {
  const sections: any = {};
  
  // Extract headline from # header
  const headlineMatch = content.match(/^#\s+(.+)$/m);
  sections.headline = headlineMatch ? headlineMatch[1] : "";
  
  // Extract tagline
  const taglineMatch = content.match(/\*\*Tagline:\*\*\s*(.+?)(?=\n\*\*|$)/s);
  sections.tagline = taglineMatch ? taglineMatch[1].trim() : "";
  
  // Extract body copy
  const bodyMatch = content.match(/\*\*Body Copy:\*\*\s*(.+?)(?=\n\*\*|$)/s);
  sections.bodyCopy = bodyMatch ? bodyMatch[1].trim() : "";
  
  // Extract visual concept
  const visualMatch = content.match(/\*\*Visual Concept:\*\*\s*(.+?)(?=\n\*\*|$)/s);
  sections.visualConcept = visualMatch ? visualMatch[1].trim() : "";
  
  // Extract rhetorical craft
  const craftMatch = content.match(/\*\*Rhetorical Craft:\*\*\s*(.+?)(?=\n\*\*|$)/s);
  sections.rhetoricalCraft = craftMatch ? craftMatch[1].trim() : "";
  
  // Extract strategic impact
  const impactMatch = content.match(/\*\*Strategic Impact:\*\*\s*(.+?)(?=\n\*\*|$)/s);
  sections.strategicImpact = impactMatch ? impactMatch[1].trim() : "";
  
  // Extract prompt
  const promptMatch = content.match(/\*\*Prompt:\*\*\s*(.+?)(?=\n|$)/s);
  sections.extractedPrompt = promptMatch ? promptMatch[1].trim() : "";
  
  return sections;
}

function parseJSONContent(content: string) {
  try {
    const parsed = JSON.parse(content);
    return {
      headline: parsed.headline || "",
      tagline: parsed.tagline || "",
      bodyCopy: parsed.bodyCopy || "",
      visualConcept: parsed.visualConcept || "",
      rhetoricalCraft: Array.isArray(parsed.rhetoricalCraft) 
        ? parsed.rhetoricalCraft.map((r: any) => typeof r === 'string' ? r : `${r.device}: ${r.explanation}`).join('\n• ')
        : (parsed.rhetoricalCraft || ""),
      strategicImpact: parsed.strategicImpact || "",
      extractedPrompt: ""
    };
  } catch (error) {
    console.error("Failed to parse JSON content:", error);
    return null;
  }
}

async function exportAllHistoryToGoogleDoc() {
  try {
    console.log("🔐 Setting up Google authentication...");
    
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'],
    });

    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    console.log("📚 Fetching concept history from Supabase...");
    
    const { data: concepts, error } = await supabase
      .from('concept_logs')
      .select('id, prompt, response, tone, created_at, is_favorite')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!concepts || concepts.length === 0) {
      console.log("📋 No concepts found in database");
      return;
    }

    console.log(`📖 Found ${concepts.length} concepts to export`);

    // Create new document
    console.log("📄 Creating new Google Doc...");
    const createResponse = await docs.documents.create({
      requestBody: {
        title: `Concept Forge - Complete History Export (${new Date().toLocaleDateString()})`,
      },
    });

    const documentId = createResponse.data.documentId!;
    console.log(`✅ Document created with ID: ${documentId}`);

    // Prepare batch requests
    const requests: any[] = [];
    let currentIndex = 1; // Start at index 1 (after title)

    // Add introduction
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: `Concept Forge - Complete Historical Archive\n\nGenerated: ${new Date().toLocaleDateString()}\nTotal Concepts: ${concepts.length}\n\n`
      }
    });
    currentIndex += requests[requests.length - 1].insertText.text.length;

    // Process each concept
    let processedCount = 0;
    const seenContent = new Set<string>();

    for (const entry of concepts) {
      try {
        const isMarkdown = isMarkdownFormat(entry.response);
        const parsed = isMarkdown 
          ? parseMarkdownContent(entry.response)
          : parseJSONContent(entry.response);

        if (!parsed) {
          console.log(`⚠️ Skipping concept ${entry.id} - parsing failed`);
          continue;
        }

        // Check for content duplication
        const contentKey = `${parsed.headline}|${parsed.tagline}`.toLowerCase();
        if (seenContent.has(contentKey)) {
          console.log(`⚠️ Skipping duplicate concept: ${parsed.headline}`);
          continue;
        }
        seenContent.add(contentKey);

        processedCount++;
        console.log(`📝 Processing concept ${processedCount}: ${parsed.headline}`);

        // Format concept content
        const conceptText = `Concept ${processedCount}\n\n` +
          `Prompt: ${entry.prompt}\n` +
          `Tone: ${entry.tone}\n` +
          `Date: ${new Date(entry.created_at).toLocaleDateString()}\n\n` +
          `Headline: ${clean(parsed.headline)}\n\n` +
          `Tagline: ${clean(parsed.tagline)}\n\n` +
          `Body Copy:\n${clean(parsed.bodyCopy)}\n\n` +
          `Visual Concept:\n${clean(parsed.visualConcept)}\n\n` +
          `Rhetorical Craft:\n${clean(parsed.rhetoricalCraft)}\n\n` +
          `Strategic Impact:\n${clean(parsed.strategicImpact)}\n\n` +
          `${'—'.repeat(60)}\n\n`;

        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: conceptText
          }
        });
        currentIndex += conceptText.length;

      } catch (error) {
        console.error(`❌ Error processing concept ${entry.id}:`, error);
      }
    }

    // Execute batch update
    console.log(`🔄 Updating document with ${processedCount} concepts...`);
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests }
      });
    }

    // Share document with dustinyork15@gmail.com
    console.log("🔗 Sharing document...");
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: 'dustinyork15@gmail.com'
      }
    });

    console.log(`✅ Export complete! Document created and shared.`);
    console.log(`📄 Document ID: ${documentId}`);
    console.log(`🌐 View at: https://docs.google.com/document/d/${documentId}`);
    console.log(`📊 Exported ${processedCount} unique concepts (${concepts.length - processedCount} duplicates removed)`);

  } catch (error) {
    console.error("❌ Export failed:", error);
    throw error;
  }
}

// Run the export
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  exportAllHistoryToGoogleDoc()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Export failed:", error);
      process.exit(1);
    });
}

export { exportAllHistoryToGoogleDoc };