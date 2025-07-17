#!/usr/bin/env npx tsx

import { google } from 'googleapis';

interface ConceptEntry {
  id: string;
  prompt: string;
  content: string;
  response?: string;
  tone: string;
  timestamp: string;
  created_at?: string;
  isFavorite?: boolean;
  enhanced?: boolean;
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

interface ParsedLegacyConcept {
  headline?: string;
  tagline?: string;
  bodyCopy?: string;
  visualConcept?: string;
  rhetoricalCraft?: string;
  unparsedContent?: string;
}

// Function to parse legacy markdown-style content
function parseLegacyContent(rawContent: string): ParsedLegacyConcept {
  const sections: ParsedLegacyConcept = {};
  
  try {
    // Remove markdown formatting
    const cleanContent = rawContent.replace(/\*\*/g, '');
    
    // Extract headline
    const headlineMatch = cleanContent.match(/HEADLINE:\s*([^\n]*)/i);
    if (headlineMatch) sections.headline = headlineMatch[1].trim();
    
    // Extract tagline
    const taglineMatch = cleanContent.match(/TAGLINE:\s*([^\n]*)/i);
    if (taglineMatch) sections.tagline = taglineMatch[1].trim();
    
    // Extract body copy
    const bodyCopyMatch = cleanContent.match(/BODY COPY:\s*([^]*?)(?=VISUAL CONCEPT:|RHETORICAL CRAFT|$)/i);
    if (bodyCopyMatch) sections.bodyCopy = bodyCopyMatch[1].trim();
    
    // Extract visual concept
    const visualMatch = cleanContent.match(/VISUAL CONCEPT:\s*([^]*?)(?=RHETORICAL CRAFT|$)/i);
    if (visualMatch) sections.visualConcept = visualMatch[1].trim();
    
    // Extract rhetorical craft
    const rhetoricalMatch = cleanContent.match(/RHETORICAL CRAFT.*?:\s*([^]*?)$/i);
    if (rhetoricalMatch) sections.rhetoricalCraft = rhetoricalMatch[1].trim();
    
    // If no sections found, store as unparsed
    if (!sections.headline && !sections.tagline && !sections.bodyCopy) {
      sections.unparsedContent = rawContent;
    }
    
  } catch (error) {
    sections.unparsedContent = rawContent;
  }
  
  return sections;
}

// Function to insert text with specific Google Docs formatting
async function insertStyledText(docs: any, documentId: string, text: string, styleType: string) {
  if (!text || text.trim() === '') return;
  
  const cleanText = text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
  
  let fontSize = 12;
  let bold = false;
  let italic = false;
  
  switch (styleType) {
    case 'HEADING_1':
      fontSize = 20;
      bold = true;
      break;
    case 'HEADING_2':
      fontSize = 16;
      bold = true;
      break;
    case 'TAGLINE':
      fontSize = 16;
      italic = true;
      break;
    case 'NORMAL_TEXT':
    default:
      fontSize = 12;
      break;
  }
  
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: cleanText + '\n\n'
          }
        },
        {
          updateTextStyle: {
            range: {
              startIndex: 1,
              endIndex: cleanText.length + 1
            },
            textStyle: {
              fontSize: {
                magnitude: fontSize,
                unit: 'PT'
              },
              bold: bold,
              italic: italic
            },
            fields: 'fontSize,bold,italic'
          }
        }
      ]
    }
  });
}

// Function to insert spacing between concepts
async function insertConceptSeparator(docs: any, documentId: string) {
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: '\n───────────────────────────────────────\n\n'
          }
        },
        {
          updateTextStyle: {
            range: {
              startIndex: 1,
              endIndex: 40
            },
            textStyle: {
              fontSize: {
                magnitude: 12,
                unit: 'PT'
              }
            },
            fields: 'fontSize'
          }
        }
      ]
    }
  });
}

async function exportAllHistoryToGoogleDoc() {
  try {
    console.log('🔍 Fetching complete concept history...');
    
    // Get database records
    console.log('🔍 Connecting to Supabase database...');
    const response = await fetch('http://localhost:5000/api/history');
    const allConcepts: ConceptEntry[] = await response.json();
    
    console.log(`📊 Retrieved ${allConcepts.length} concepts from database`);
    
    console.log('🔐 Setting up Google Docs API...');
    
    // Initialize Google APIs
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'],
    });
    
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });
    
    console.log('📄 Creating comprehensive Google Doc...');
    
    // Create the document
    const createResponse = await docs.documents.create({
      requestBody: {
        title: `Concept Forge Complete History Export - ${new Date().toLocaleDateString()}`
      }
    });
    
    const documentId = createResponse.data.documentId!;
    console.log(`📄 Document created with ID: ${documentId}`);
    
    console.log('✍️ Formatting and inserting concepts with clean styling...');
    
    // Sort concepts by timestamp (newest first)
    allConcepts.sort((a, b) => {
      const timestampA = a.timestamp || a.created_at || '0';
      const timestampB = b.timestamp || b.created_at || '0';
      return new Date(timestampB).getTime() - new Date(timestampA).getTime();
    });
    
    // Insert header
    await insertStyledText(docs, documentId, 
      `Concept Forge Complete History Export\n` +
      `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n` +
      `Total Concepts: ${allConcepts.length}`, 
      'HEADING_1'
    );
    
    await insertConceptSeparator(docs, documentId);
    
    // Process each concept
    for (let index = 0; index < allConcepts.length; index++) {
      const entry = allConcepts[index];
      console.log(`Processing concept ${index + 1}/${allConcepts.length}: "${entry.prompt.substring(0, 50)}..."`);
      
      const timestamp = entry.timestamp || entry.created_at || new Date().toISOString();
      const date = new Date(timestamp).toLocaleDateString();
      const time = new Date(timestamp).toLocaleTimeString();
      
      // Insert concept header
      await insertStyledText(docs, documentId, 
        `Concept ${index + 1}\n` +
        `Prompt: "${entry.prompt}"\n` +
        `Tone: ${entry.tone.charAt(0).toUpperCase() + entry.tone.slice(1)}\n` +
        `Generated: ${date} at ${time}`, 
        'HEADING_2'
      );
      
      try {
        // Try to parse as JSON first (new format)
        const concept: ParsedConcept = JSON.parse(entry.content);
        
        await insertStyledText(docs, documentId, concept.headline, 'HEADING_1');
        await insertStyledText(docs, documentId, concept.tagline, 'TAGLINE');
        await insertStyledText(docs, documentId, concept.bodyCopy, 'NORMAL_TEXT');
        await insertStyledText(docs, documentId, `Visual Concept: ${concept.visualConcept}`, 'NORMAL_TEXT');
        
        // Handle rhetorical craft array
        if (concept.rhetoricalCraft && concept.rhetoricalCraft.length > 0) {
          await insertStyledText(docs, documentId, 'Rhetorical Craft Analysis:', 'HEADING_2');
          for (const craft of concept.rhetoricalCraft) {
            await insertStyledText(docs, documentId, `${craft.device}: ${craft.explanation}`, 'NORMAL_TEXT');
          }
        }
        
        await insertStyledText(docs, documentId, `Strategic Impact: ${concept.strategicImpact}`, 'NORMAL_TEXT');
        
      } catch (parseError) {
        // Parse as legacy markdown format
        console.log(`Parsing concept ${index + 1} as legacy format...`);
        const legacyConcept = parseLegacyContent(entry.content);
        
        if (legacyConcept.headline) {
          await insertStyledText(docs, documentId, legacyConcept.headline, 'HEADING_1');
        }
        
        if (legacyConcept.tagline) {
          await insertStyledText(docs, documentId, legacyConcept.tagline, 'TAGLINE');
        }
        
        if (legacyConcept.bodyCopy) {
          await insertStyledText(docs, documentId, legacyConcept.bodyCopy, 'NORMAL_TEXT');
        }
        
        if (legacyConcept.visualConcept) {
          await insertStyledText(docs, documentId, `Visual Concept: ${legacyConcept.visualConcept}`, 'NORMAL_TEXT');
        }
        
        if (legacyConcept.rhetoricalCraft) {
          await insertStyledText(docs, documentId, 'Rhetorical Craft:', 'HEADING_2');
          await insertStyledText(docs, documentId, legacyConcept.rhetoricalCraft, 'NORMAL_TEXT');
        }
        
        if (legacyConcept.unparsedContent) {
          await insertStyledText(docs, documentId, 'Unparsed Content:', 'HEADING_2');
          await insertStyledText(docs, documentId, legacyConcept.unparsedContent.substring(0, 500) + '...', 'NORMAL_TEXT');
        }
      }
      
      // Add separator between concepts (except for last one)
      if (index < allConcepts.length - 1) {
        await insertConceptSeparator(docs, documentId);
      }
    }
    
    console.log('🔗 Sharing document with dustinyork15@gmail.com...');
    
    // Share document
    try {
      await drive.permissions.create({
        fileId: documentId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: 'dustinyork15@gmail.com',
        },
      });
      
      console.log('✅ Google Docs export complete with clean formatting.');
    } catch (shareError) {
      console.log(`⚠️ Could not share document: ${shareError.message}`);
      console.log('📧 You can manually share the document using the URL below');
    }
    
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    console.log(`✅ Export complete! Document URL: ${documentUrl}`);
    console.log(`📊 Exported ${allConcepts.length} concepts with enhanced formatting`);
    
    return documentUrl;
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

// Run export if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportAllHistoryToGoogleDoc();
}

export { exportAllHistoryToGoogleDoc };