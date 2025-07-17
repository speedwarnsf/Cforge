import { google } from 'googleapis';
// Using node's built-in fetch (Node 18+)

interface ConceptEntry {
  id: string;
  prompt: string;
  content: string;
  tone: string;
  timestamp: string;
  isFavorite: boolean;
  enhanced: boolean;
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

async function exportHistoryToGoogleDoc() {
  try {
    console.log('🔍 Fetching session history...');
    
    // Step 1: Fetch session history
    const response = await fetch('http://localhost:5000/api/history');
    if (!response.ok) {
      throw new Error(`History fetch failed: ${response.status} ${response.statusText}`);
    }
    
    const historyData: ConceptEntry[] = await response.json();
    
    if (historyData.length === 0) {
      console.log('⚠️  No session history found. Generate some concepts first.');
      return;
    }
    
    console.log(`📊 Found ${historyData.length} concepts to export`);
    
    // Step 2: Parse and format concepts
    let formattedContent = '';
    
    for (const entry of historyData) {
      try {
        // Parse the JSON content
        const concept: ParsedConcept = JSON.parse(entry.content);
        
        // Format the concept with clear headings
        formattedContent += `---\n`;
        formattedContent += `🟨 Prompt:\n${entry.prompt}\n\n`;
        formattedContent += `🟨 Headline\n${concept.headline}\n\n`;
        formattedContent += `🟨 Tagline\n${concept.tagline}\n\n`;
        formattedContent += `🟨 Body Copy\n${concept.bodyCopy}\n\n`;
        formattedContent += `🟨 Visual Concept\n${concept.visualConcept}\n\n`;
        formattedContent += `🟨 Rhetorical Craft Breakdown\n`;
        
        if (concept.rhetoricalCraft && concept.rhetoricalCraft.length > 0) {
          for (const craft of concept.rhetoricalCraft) {
            formattedContent += `• ${craft.device}: ${craft.explanation}\n`;
          }
        } else {
          formattedContent += `• No rhetorical craft data available\n`;
        }
        
        formattedContent += `\n🟨 Strategic Impact\n${concept.strategicImpact}\n\n`;
        formattedContent += `🟨 Created At\n${entry.timestamp}\n`;
        formattedContent += `---\n\n`;
        
      } catch (parseError) {
        console.log(`⚠️  Could not parse concept ${entry.id}, skipping...`);
        continue;
      }
    }
    
    // Step 3: Set up Google Docs API
    console.log('🔐 Setting up Google Docs API...');
    
    const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!credentials) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is required');
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive']
    });
    
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });
    
    // Step 4: Create document with enhanced formatting
    const now = new Date();
    const docTitle = `Concept Forge Export - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    
    console.log('📄 Creating Google Doc...');
    
    const createResponse = await docs.documents.create({
      requestBody: {
        title: docTitle
      }
    });
    
    const documentId = createResponse.data.documentId;
    if (!documentId) {
      throw new Error('Failed to create document');
    }
    
    // Step 5: Format content with enhanced structure
    console.log('✍️  Formatting and inserting content...');
    
    let docContent = `CONCEPT FORGE EXPORT\n`;
    docContent += `Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}\n`;
    docContent += `Total Concepts: ${historyData.length}\n\n`;
    docContent += `${'='.repeat(60)}\n\n`;
    
    for (let i = 0; i < historyData.length; i++) {
      const entry = historyData[i];
      
      try {
        const concept: ParsedConcept = JSON.parse(entry.content);
        
        docContent += `---\n\n`;
        docContent += `🟨 **HEADLINE**\n${concept.headline}\n\n`;
        docContent += `🟨 **TAGLINE**\n${concept.tagline}\n\n`;
        docContent += `🟨 **BODY COPY**\n${concept.bodyCopy}\n\n`;
        docContent += `🟨 **VISUAL CONCEPT**\n${concept.visualConcept}\n\n`;
        docContent += `🟨 **RHETORICAL CRAFT BREAKDOWN**\n`;
        
        if (concept.rhetoricalCraft && concept.rhetoricalCraft.length > 0) {
          concept.rhetoricalCraft.forEach((craft, index) => {
            const deviceType = index === 0 ? 'Primary Device' : 'Secondary Device';
            docContent += `${deviceType}: ${craft.device}\n${craft.explanation}\n\n`;
          });
        } else {
          docContent += `Primary Device: None specified\nNo rhetorical craft data available\n\n`;
        }
        
        docContent += `**Strategic Impact**\n${concept.strategicImpact}\n\n`;
        docContent += `**Original Prompt:** ${entry.prompt}\n`;
        docContent += `**Tone:** ${entry.tone.toUpperCase()}\n`;
        docContent += `**Generated:** ${entry.timestamp}\n\n`;
        docContent += `---\n\n`;
        
      } catch (parseError) {
        console.log(`⚠️  Could not parse concept ${entry.id}, skipping...`);
        continue;
      }
    }
    
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: 1
              },
              text: docContent
            }
          }
        ]
      }
    });
    
    // Step 6: Share document with dustinyork15@gmail.com using Drive API
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
      
      console.log('✅ Google Docs export complete and shared with dustinyork15@gmail.com');
    } catch (shareError) {
      console.log(`⚠️  Could not share document: ${shareError.message}`);
      console.log('📧 You can manually share the document using the URL below');
    }
    
    // Step 7: Generate document URL
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    
    console.log('✅ Export complete! Document URL:', documentUrl);
    console.log(`📊 Exported ${historyData.length} concepts successfully`);
    
    return documentUrl;
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

// Run the export if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportHistoryToGoogleDoc();
}

export { exportHistoryToGoogleDoc };