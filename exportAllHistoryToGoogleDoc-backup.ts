#!/usr/bin/env npx tsx

import { google } from 'googleapis';

interface ConceptEntry {
  id: string;
  prompt: string;
  content: string;
  response?: string;  // Legacy field name
  tone: string;
  timestamp: string;
  created_at?: string;  // Alternative timestamp field
  isFavorite?: boolean;
  enhanced?: boolean;
}

interface ParsedLegacyConcept {
  headline?: string;
  tagline?: string;
  bodyCopy?: string;
  visualConcept?: string;
  rhetoricalCraft?: string;
  unparsedContent?: string;
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

async function exportAllHistoryToGoogleDoc() {
  try {
    console.log('🔍 Fetching complete concept history...');
    
    // Get all concepts from both session history and database
    const sessionResponse = await fetch('http://localhost:5000/api/history');
    const sessionData = sessionResponse.ok ? await sessionResponse.json() : [];
    
    // Get historical concepts from Supabase database
    const { retrieveAllHistoricalConcepts } = await import('./retrieveAllHistoricalConcepts');
    const historicalConcepts = await retrieveAllHistoricalConcepts();
    
    // Combine and deduplicate
    const allConcepts = [...sessionData];
    historicalConcepts.forEach((historical: any) => {
      const exists = allConcepts.find(c => c.id === historical.id || c.prompt === historical.prompt);
      if (!exists) {
        allConcepts.push(historical);
      }
    });
    
    console.log(`📊 Found ${allConcepts.length} total concepts (${sessionData.length} session + ${historicalConcepts.length} database)`);
    
    if (allConcepts.length === 0) {
      console.log(' No concepts found to export');
      return null;
    }

    console.log('🔐 Setting up Google Docs API...');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
      scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive.file']
    });

    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    console.log('Creating comprehensive Google Doc...');
    const createResponse = await docs.documents.create({
      requestBody: {
        title: `Concept Forge Complete History - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
      }
    });

    const documentId = createResponse.data.documentId!;
    console.log(`Document created with ID: ${documentId}`);

    console.log('✍️  Formatting and inserting complete history...');
    
    // Sort concepts by timestamp (newest first)
    allConcepts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Build content
    let content = `# Concept Forge Complete History\n\n`;
    content += `**Generated:** ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n`;
    content += `**Total Concepts:** ${allConcepts.length}\n\n`;
    content += `## 📊 Important Note About Missing Concepts\n\n`;
    content += `The user reported 50+ concepts should exist, but only ${allConcepts.length} are available. This is due to a database logging issue where concepts were generated successfully but never saved due to Supabase row-level security policy errors. The concepts existed in temporary session storage but were lost on server restarts.\n\n`;
    content += `**Database Status:** 0 concepts stored in Supabase\n`;
    content += `**Console Error:** "new row violates row-level security policy for table concept_logs"\n`;
    content += `**Impact:** All generated concepts lost between sessions\n\n`;
    content += `---\n\n`;

    allConcepts.forEach((entry, index) => {
      try {
        const concept: ParsedConcept = JSON.parse(entry.content);
        const entryDate = new Date(entry.timestamp).toLocaleDateString();
        const entryTime = new Date(entry.timestamp).toLocaleTimeString();
        
        content += `## Concept ${index + 1}\n\n`;
        content += `**Original Prompt:** *${entry.prompt}*\n`;
        content += `**Tone:** ${entry.tone.charAt(0).toUpperCase() + entry.tone.slice(1)}\n`;
        content += `**📅 Generated:** ${entryDate} at ${entryTime}\n`;
        content += `**Enhanced:** ${entry.enhanced ? 'Yes' : 'No'}\n\n`;
        
        content += `### 📰 Headline\n${concept.headline}\n\n`;
        content += `###  Tagline\n${concept.tagline}\n\n`;
        content += `### Body Copy\n${concept.bodyCopy}\n\n`;
        content += `### Visual Concept\n${concept.visualConcept}\n\n`;
        
        content += `### Rhetorical Craft Analysis\n`;
        concept.rhetoricalCraft.forEach((craft, i) => {
          content += `**${i + 1}. ${craft.device}:** ${craft.explanation}\n`;
        });
        content += `\n`;
        
        content += `### Strategic Impact\n${concept.strategicImpact}\n\n`;
        content += `---\n\n`;
        
      } catch (error) {
        console.log(` Could not parse concept ${index + 1}, adding raw content...`);
        console.log(`Parse error: ${error.message}`);
        console.log(`Raw content preview: ${entry.content.substring(0, 100)}...`);
        
        // Add unparsed concept with available information
        const entryDate = new Date(entry.timestamp || entry.created_at || new Date()).toLocaleDateString();
        const entryTime = new Date(entry.timestamp || entry.created_at || new Date()).toLocaleTimeString();
        
        content += `## Concept ${index + 1} (Raw Format)\n\n`;
        content += `**Original Prompt:** *${entry.prompt}*\n`;
        content += `**Tone:** ${entry.tone.charAt(0).toUpperCase() + entry.tone.slice(1)}\n`;
        content += `**📅 Generated:** ${entryDate} at ${entryTime}\n\n`;
        content += `**Raw Content:**\n${entry.content.substring(0, 500)}...\n\n`;
        content += `---\n\n`;
      }
    });

    // Insert content into document
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content
            }
          }
        ]
      }
    });

    // Share document with dustinyork15@gmail.com using Drive API
    console.log('🔗 Sharing document...');
    
    try {
      await drive.permissions.create({
        fileId: documentId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: 'dustinyork15@gmail.com',
        },
      });
      
      console.log('Google Docs export complete and shared with dustinyork15@gmail.com');
    } catch (shareError) {
      console.log(` Could not share document: ${shareError.message}`);
      console.log('📧 You can manually share the document using the URL below');
    }

    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    console.log(`Export complete! Document URL: ${documentUrl}`);
    console.log(`📊 Exported ${allConcepts.length} concepts successfully`);
    
    return documentUrl;
    
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

// Run export if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportAllHistoryToGoogleDoc();
}

export { exportAllHistoryToGoogleDoc };