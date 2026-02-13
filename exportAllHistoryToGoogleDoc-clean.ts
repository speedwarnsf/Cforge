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
    // Remove markdown formatting and clean text
    const cleanContent = rawContent.replace(/\*\*/g, '').replace(/\*/g, '');
    
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

// Clean and deduplicate content to avoid repetition
function cleanContent(text: string): string {
  if (!text) return '';
  
  // Remove markdown formatting
  let cleaned = text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Remove duplicate sentences within the same content block
  const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const uniqueSentences = [];
  const seenSentences = new Set();
  
  for (const sentence of sentences) {
    const normalizedSentence = sentence.toLowerCase().trim();
    if (!seenSentences.has(normalizedSentence) && normalizedSentence.length > 5) {
      seenSentences.add(normalizedSentence);
      uniqueSentences.push(sentence.trim());
    }
  }
  
  return uniqueSentences.join('. ').trim() + (uniqueSentences.length > 0 ? '.' : '');
}

async function exportAllHistoryToGoogleDoc() {
  try {
    console.log('🔍 Fetching complete concept history...');
    
    // Get database records
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
    
    console.log('Creating clean, elegant Google Doc...');
    
    // Create the document
    const createResponse = await docs.documents.create({
      requestBody: {
        title: `Concept Forge Complete History Export - ${new Date().toLocaleDateString()}`
      }
    });
    
    const documentId = createResponse.data.documentId!;
    console.log(`Document created with ID: ${documentId}`);
    
    console.log('✍️ Building content with clean formatting...');
    
    // Sort concepts by timestamp (newest first)
    allConcepts.sort((a, b) => {
      const timestampA = a.timestamp || a.created_at || '0';
      const timestampB = b.timestamp || b.created_at || '0';
      return new Date(timestampB).getTime() - new Date(timestampA).getTime();
    });
    
    // Build content and styling requests
    const textRequests: any[] = [];
    const styleRequests: any[] = [];
    let fullContent = '';
    let currentIndex = 1;
    
    // Document header
    const headerText = `CONCEPT FORGE COMPLETE HISTORY EXPORT\n\nGenerated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\nTotal Concepts: ${allConcepts.length}\n\n\n\n`;
    
    fullContent += headerText;
    
    // Style main header
    styleRequests.push({
      updateTextStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + 'CONCEPT FORGE COMPLETE HISTORY EXPORT'.length
        },
        textStyle: {
          fontSize: { magnitude: 18, unit: 'PT' },
          bold: true
        },
        fields: 'fontSize,bold'
      }
    });
    
    currentIndex += headerText.length;
    
    // Process each concept with clean structure
    for (let i = 0; i < allConcepts.length; i++) {
      const entry = allConcepts[i];
      const timestamp = entry.timestamp || entry.created_at || new Date().toISOString();
      const date = new Date(timestamp).toLocaleDateString();
      const time = new Date(timestamp).toLocaleTimeString();
      
      // Add separator with proper spacing (18pt above and below)
      if (i > 0) {
        const separatorText = `\n\n\n────────────────────────────────────────\n\n\n`;
        fullContent += separatorText;
        currentIndex += separatorText.length;
      }
      
      // CONCEPT HEADER
      const conceptHeaderText = `CONCEPT ${i + 1}\n\n`;
      fullContent += conceptHeaderText;
      
      styleRequests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + conceptHeaderText.length - 2
          },
          textStyle: {
            fontSize: { magnitude: 16, unit: 'PT' },
            bold: true
          },
          fields: 'fontSize,bold'
        }
      });
      
      currentIndex += conceptHeaderText.length;
      
      // PROMPT SECTION
      const promptLabel = 'Prompt:\n';
      const promptContent = `${entry.prompt}\n\n`;
      fullContent += promptLabel + promptContent;
      
      styleRequests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + promptLabel.length - 1
          },
          textStyle: {
            fontSize: { magnitude: 13, unit: 'PT' },
            bold: true
          },
          fields: 'fontSize,bold'
        }
      });
      
      currentIndex += promptLabel.length + promptContent.length;
      
      // TONE SECTION
      const toneLabel = 'Tone:\n';
      const toneContent = `${entry.tone.charAt(0).toUpperCase() + entry.tone.slice(1)}\n\n`;
      fullContent += toneLabel + toneContent;
      
      styleRequests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + toneLabel.length - 1
          },
          textStyle: {
            fontSize: { magnitude: 13, unit: 'PT' },
            bold: true
          },
          fields: 'fontSize,bold'
        }
      });
      
      currentIndex += toneLabel.length + toneContent.length;
      
      // Parse concept content
      try {
        // Try JSON format first
        const concept: ParsedConcept = JSON.parse(entry.content);
        
        // HEADLINE
        if (concept.headline) {
          const headlineLabel = 'Headline:\n';
          const headlineContent = `${cleanContent(concept.headline)}\n\n`;
          fullContent += headlineLabel + headlineContent;
          
          styleRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + headlineLabel.length - 1
              },
              textStyle: {
                fontSize: { magnitude: 13, unit: 'PT' },
                bold: true
              },
              fields: 'fontSize,bold'
            }
          });
          
          currentIndex += headlineLabel.length + headlineContent.length;
        }
        
        // TAGLINE
        if (concept.tagline) {
          const taglineLabel = 'Tagline:\n';
          const taglineContent = `${cleanContent(concept.tagline)}\n\n`;
          fullContent += taglineLabel + taglineContent;
          
          styleRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + taglineLabel.length - 1
              },
              textStyle: {
                fontSize: { magnitude: 13, unit: 'PT' },
                bold: true
              },
              fields: 'fontSize,bold'
            }
          });
          
          currentIndex += taglineLabel.length + taglineContent.length;
        }
        
        // BODY COPY
        if (concept.bodyCopy) {
          const bodyLabel = 'Body Copy:\n';
          const bodyContent = `${cleanContent(concept.bodyCopy)}\n\n`;
          fullContent += bodyLabel + bodyContent;
          
          styleRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + bodyLabel.length - 1
              },
              textStyle: {
                fontSize: { magnitude: 13, unit: 'PT' },
                bold: true
              },
              fields: 'fontSize,bold'
            }
          });
          
          currentIndex += bodyLabel.length + bodyContent.length;
        }
        
        // VISUAL CONCEPT
        if (concept.visualConcept) {
          const visualLabel = 'Visual Concept:\n';
          const visualContent = `${cleanContent(concept.visualConcept)}\n\n`;
          fullContent += visualLabel + visualContent;
          
          styleRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + visualLabel.length - 1
              },
              textStyle: {
                fontSize: { magnitude: 13, unit: 'PT' },
                bold: true
              },
              fields: 'fontSize,bold'
            }
          });
          
          currentIndex += visualLabel.length + visualContent.length;
        }
        
        // RHETORICAL CRAFT
        if (concept.rhetoricalCraft && concept.rhetoricalCraft.length > 0) {
          const craftLabel = 'Rhetorical Craft:\n';
          fullContent += craftLabel;
          
          styleRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + craftLabel.length - 1
              },
              textStyle: {
                fontSize: { magnitude: 13, unit: 'PT' },
                bold: true
              },
              fields: 'fontSize,bold'
            }
          });
          
          currentIndex += craftLabel.length;
          
          // Build bullet list with tight formatting
          let bulletContent = '';
          for (const craft of concept.rhetoricalCraft) {
            bulletContent += `• ${craft.device}: ${cleanContent(craft.explanation)}\n`;
          }
          bulletContent += '\n';
          
          fullContent += bulletContent;
          
          // Style bullet points (smaller font)
          styleRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + bulletContent.length - 1
              },
              textStyle: {
                fontSize: { magnitude: 10, unit: 'PT' }
              },
              fields: 'fontSize'
            }
          });
          
          currentIndex += bulletContent.length;
        }
        
      } catch (parseError) {
        // Handle legacy markdown format
        const legacyConcept = parseLegacyContent(entry.content);
        
        if (legacyConcept.headline) {
          const headlineLabel = 'Headline:\n';
          const headlineContent = `${cleanContent(legacyConcept.headline)}\n\n`;
          fullContent += headlineLabel + headlineContent;
          currentIndex += headlineLabel.length + headlineContent.length;
        }
        
        if (legacyConcept.tagline) {
          const taglineLabel = 'Tagline:\n';
          const taglineContent = `${cleanContent(legacyConcept.tagline)}\n\n`;
          fullContent += taglineLabel + taglineContent;
          currentIndex += taglineLabel.length + taglineContent.length;
        }
        
        if (legacyConcept.bodyCopy) {
          const bodyLabel = 'Body Copy:\n';
          const bodyContent = `${cleanContent(legacyConcept.bodyCopy)}\n\n`;
          fullContent += bodyLabel + bodyContent;
          currentIndex += bodyLabel.length + bodyContent.length;
        }
        
        if (legacyConcept.visualConcept) {
          const visualLabel = 'Visual Concept:\n';
          const visualContent = `${cleanContent(legacyConcept.visualConcept)}\n\n`;
          fullContent += visualLabel + visualContent;
          currentIndex += visualLabel.length + visualContent.length;
        }
        
        if (legacyConcept.rhetoricalCraft) {
          const craftLabel = 'Rhetorical Craft:\n';
          const craftContent = `${cleanContent(legacyConcept.rhetoricalCraft)}\n\n`;
          fullContent += craftLabel + craftContent;
          currentIndex += craftLabel.length + craftContent.length;
        }
      }
      
      // Add generation timestamp
      const timestampText = `Generated: ${date} at ${time}\n\n`;
      fullContent += timestampText;
      currentIndex += timestampText.length;
    }
    
    console.log('Applying content and styling...');
    
    // Combine text insertion and styling in batch
    const allRequests = [
      {
        insertText: {
          location: { index: 1 },
          text: fullContent
        }
      },
      ...styleRequests
    ];
    
    // Execute batch update
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: allRequests
      }
    });
    
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
      
      console.log('Document shared successfully');
    } catch (shareError) {
      console.log(`Could not share document: ${shareError.message}`);
    }
    
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    console.log(`Clean export complete.`);
    console.log(`Document URL: ${documentUrl}`);
    console.log(`📊 Exported ${allConcepts.length} concepts with clean formatting`);
    
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