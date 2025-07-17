import { google } from "googleapis";
import { createClient } from '@supabase/supabase-js';

// OAuth tokens from the successful test
const ACCESS_TOKEN = 'ya29.a0AS3H6NwAO7tcG1AiTKrD5xp_au0Sq6rhrEODf6scd5qs9pNt3Ax07AvI3eZOSFY4RpAjbuoOBQ0RVLYmw6nSreLEHfXJGVWep63SpWI-DMCq0kvxZdW1GWNhX_ebotcK_XSsr11uyZo9M0Cdhmf844R30wStwd68dP8D_zonaCgYKAfwSARYSFQHGX2MiHh1AH_jJSMHz08AzOOwYzA0175';
const REFRESH_TOKEN = '1//047tAjusE3uSKCgYIARAAGAQSNwF-L9IrFFRorH-kMLgp5zpRRs_N15XmlLUBO70u8A1gxFmtUJinqlwh4LyocOwplcS2Cp8fivU';

interface ConceptEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  is_favorite?: boolean;
}

interface ParsedConcept {
  headline: string;
  tagline: string;
  bodyCopy: string;
  visualConcept: string;
  rhetoricalCraft: Array<{
    device: string;
    explanation: string;
  }>;
  strategicImpact: string;
}

function parseContent(content: string): ParsedConcept | null {
  try {
    if (!content || typeof content !== 'string') {
      return null;
    }
    return JSON.parse(content);
  } catch (error) {
    // Try to parse text format
    return parseTextFormat(content);
  }
}

function parseTextFormat(content: string): ParsedConcept | null {
  try {
    const lines = content.split('\n').filter(line => line.trim());
    let headline = '', tagline = '', bodyCopy = '', visualConcept = '', strategicImpact = '';
    let rhetoricalCraft: Array<{device: string, explanation: string}> = [];
    
    let currentSection = '';
    let craftText = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('**HEADLINE:**')) {
        headline = trimmed.replace('**HEADLINE:**', '').trim();
      } else if (trimmed.includes('**TAGLINE:**')) {
        tagline = trimmed.replace('**TAGLINE:**', '').trim();
      } else if (trimmed.includes('**BODY COPY:**')) {
        bodyCopy = trimmed.replace('**BODY COPY:**', '').trim();
      } else if (trimmed.includes('**VISUAL CONCEPT:**')) {
        visualConcept = trimmed.replace('**VISUAL CONCEPT:**', '').trim();
        currentSection = 'visual';
      } else if (trimmed.includes('**RHETORICAL CRAFT BREAKDOWN:**')) {
        currentSection = 'craft';
      } else if (trimmed.includes('**Strategic Impact:**') || trimmed.includes('Strategic Impact:')) {
        strategicImpact = trimmed.replace(/\*\*Strategic Impact:\*\*|Strategic Impact:/g, '').trim();
        currentSection = 'impact';
      } else if (currentSection === 'visual' && trimmed && !trimmed.includes('**')) {
        visualConcept += ' ' + trimmed;
      } else if (currentSection === 'craft' && trimmed && !trimmed.includes('Strategic Impact')) {
        craftText += ' ' + trimmed;
      } else if (currentSection === 'impact' && trimmed && !trimmed.includes('**')) {
        strategicImpact += ' ' + trimmed;
      }
    }
    
    // Parse rhetorical craft
    if (craftText) {
      const craftParts = craftText.split('•').filter(part => part.trim());
      for (const part of craftParts) {
        const colonIndex = part.indexOf(':');
        if (colonIndex > 0) {
          const device = part.substring(0, colonIndex).replace(/\*\*/g, '').trim();
          const explanation = part.substring(colonIndex + 1).trim();
          if (device && explanation) {
            rhetoricalCraft.push({ device, explanation });
          }
        }
      }
    }
    
    if (headline && tagline) {
      return {
        headline: headline.replace(/\*\*/g, ''),
        tagline: tagline.replace(/\*\*/g, ''),
        bodyCopy: bodyCopy.replace(/\*\*/g, ''),
        visualConcept: visualConcept.replace(/\*\*/g, ''),
        rhetoricalCraft,
        strategicImpact: strategicImpact.replace(/\*\*/g, '')
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

function cleanContent(text: string): string {
  return text.replace(/\*\*/g, '').trim();
}

async function exportAllHistoryToGoogleDoc() {
  try {
    console.log("🚀 Starting comprehensive Concept Forge export...");
    
    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob"
    );
    
    oauth2Client.setCredentials({
      access_token: ACCESS_TOKEN,
      refresh_token: REFRESH_TOKEN
    });

    // Initialize Google APIs
    const docs = google.docs({ version: "v1", auth: oauth2Client });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Fetch concepts from Supabase
    console.log("🔍 Fetching concepts...");
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
    const { data: concepts, error } = await supabase
      .from('concept_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    const entries = concepts as ConceptEntry[];
    console.log(`📊 Retrieved ${entries.length} concepts`);

    // Create document
    console.log("📄 Creating document...");
    const createResponse = await docs.documents.create({
      requestBody: {
        title: `Concept Forge Complete Export - ${new Date().toLocaleDateString()}`
      }
    });

    const documentId = createResponse.data.documentId!;
    console.log(`✅ Document created: ${documentId}`);

    // Build content
    const requests = [];
    let index = 1;

    // Add title and intro
    const titleText = `CONCEPT FORGE - COMPLETE EXPORT\n${new Date().toLocaleDateString()}\n\nTotal Concepts: ${entries.length}\n\n${'='.repeat(60)}\n\n`;
    requests.push({
      insertText: {
        location: { index: 1 },
        text: titleText
      }
    });

    let currentIndex = titleText.length + 1;

    // Process each concept
    let successCount = 0;
    for (const entry of entries) {
      const concept = parseContent(entry.response);
      
      let sectionText = '';
      
      if (concept) {
        // Parsed concept format
        sectionText = [
          `CONCEPT ${index}\n`,
          `Date: ${new Date(entry.created_at).toLocaleDateString()}\n`,
          `Tone: ${cleanContent(entry.tone)}\n`,
          `Prompt: ${cleanContent(entry.prompt)}\n\n`,
          `HEADLINE: ${cleanContent(concept.headline)}\n`,
          `TAGLINE: ${cleanContent(concept.tagline)}\n\n`,
          `BODY COPY:\n${cleanContent(concept.bodyCopy)}\n\n`,
          `VISUAL CONCEPT:\n${cleanContent(concept.visualConcept)}\n\n`,
          `RHETORICAL CRAFT:\n`,
          ...concept.rhetoricalCraft.map(craft => `• ${craft.device}: ${cleanContent(craft.explanation)}\n`),
          `\nSTRATEGIC IMPACT:\n${cleanContent(concept.strategicImpact)}\n\n`
        ].join('');
        successCount++;
      } else {
        // Raw format fallback
        sectionText = [
          `CONCEPT ${index} (RAW FORMAT)\n`,
          `Date: ${new Date(entry.created_at).toLocaleDateString()}\n`,
          `Tone: ${cleanContent(entry.tone)}\n`,
          `Prompt: ${cleanContent(entry.prompt)}\n\n`,
          `CONTENT:\n${entry.response}\n\n`
        ].join('');
      }
      
      sectionText += `${'—'.repeat(50)}\n\n`;

      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: sectionText
        }
      });

      currentIndex += sectionText.length;
      index++;
    }

    // Apply all text in one batch
    console.log("📝 Adding content to document...");
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });

    // Share document
    console.log("🔗 Sharing document...");
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: 'dustinyork15@gmail.com'
      }
    });

    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    console.log("✅ Export complete!");
    console.log(`📄 Document URL: ${documentUrl}`);
    console.log(`📊 Processed: ${successCount} parsed + ${entries.length - successCount} raw concepts`);
    console.log(`📧 Shared with: dustinyork15@gmail.com`);

    return documentUrl;

  } catch (error) {
    console.error("❌ Export failed:", error);
    throw error;
  }
}

exportAllHistoryToGoogleDoc().catch(console.error);