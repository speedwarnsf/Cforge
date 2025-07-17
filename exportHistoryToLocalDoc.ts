// Alternative export script that creates a local file for easy Google Docs import
import fs from 'fs';
import path from 'path';

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

async function exportHistoryToLocalDoc() {
  try {
    console.log('🔍 Fetching session history...');
    
    // Fetch session history
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
    
    // Format concepts for Google Docs
    let formattedContent = '';
    const today = new Date().toISOString().split('T')[0];
    
    formattedContent += `CONCEPT FORGE SESSION HISTORY - ${today}\n`;
    formattedContent += `${'='.repeat(60)}\n\n`;
    formattedContent += `Generated: ${new Date().toLocaleString()}\n`;
    formattedContent += `Total Concepts: ${historyData.length}\n\n`;
    
    for (let i = 0; i < historyData.length; i++) {
      const entry = historyData[i];
      
      try {
        const concept: ParsedConcept = JSON.parse(entry.content);
        
        formattedContent += `${'-'.repeat(60)}\n`;
        formattedContent += `CONCEPT ${i + 1} OF ${historyData.length}\n`;
        formattedContent += `${'-'.repeat(60)}\n\n`;
        
        formattedContent += `🟨 PROMPT:\n${entry.prompt}\n\n`;
        formattedContent += `🟨 HEADLINE\n${concept.headline}\n\n`;
        formattedContent += `🟨 TAGLINE\n${concept.tagline}\n\n`;
        formattedContent += `🟨 BODY COPY\n${concept.bodyCopy}\n\n`;
        formattedContent += `🟨 VISUAL CONCEPT\n${concept.visualConcept}\n\n`;
        formattedContent += `🟨 RHETORICAL CRAFT BREAKDOWN\n`;
        
        if (concept.rhetoricalCraft && concept.rhetoricalCraft.length > 0) {
          for (const craft of concept.rhetoricalCraft) {
            formattedContent += `• ${craft.device}: ${craft.explanation}\n`;
          }
        } else {
          formattedContent += `• No rhetorical craft data available\n`;
        }
        
        formattedContent += `\n🟨 STRATEGIC IMPACT\n${concept.strategicImpact}\n\n`;
        formattedContent += `🟨 TONE\n${entry.tone.toUpperCase()}\n\n`;
        formattedContent += `🟨 CREATED AT\n${entry.timestamp}\n\n`;
        
      } catch (parseError) {
        console.log(`⚠️  Could not parse concept ${entry.id}, skipping...`);
        continue;
      }
    }
    
    // Save to file
    const filename = `concept-forge-export-${today}.txt`;
    const filepath = path.join(process.cwd(), filename);
    
    fs.writeFileSync(filepath, formattedContent, 'utf8');
    
    console.log('✅ Export complete!');
    console.log(`📄 File saved: ${filename}`);
    console.log(`📊 Exported ${historyData.length} concepts successfully`);
    console.log('\n📋 To import to Google Docs:');
    console.log('1. Open Google Docs');
    console.log('2. Create a new document');
    console.log('3. Copy and paste the content from the exported file');
    console.log('4. Apply formatting as needed');
    
    return filepath;
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

// Run the export if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportHistoryToLocalDoc();
}

export { exportHistoryToLocalDoc };