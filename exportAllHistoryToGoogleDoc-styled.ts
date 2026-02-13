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

// Clean and deduplicate content
function cleanContent(text: string): string {
  if (!text) return '';
  
  // Remove markdown formatting
  let cleaned = text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Remove duplicate sentences
  const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const uniqueSentences = [...new Set(sentences)];
  
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
    
    console.log('Creating styled Concept Forge document...');
    
    // Create the document
    const createResponse = await docs.documents.create({
      requestBody: {
        title: `Concept Forge Complete History Export - ${new Date().toLocaleDateString()}`
      }
    });
    
    const documentId = createResponse.data.documentId!;
    console.log(`Document created with ID: ${documentId}`);
    
    console.log('✍️ Building content with enhanced Concept Forge styling...');
    
    // Sort concepts by timestamp (newest first)
    allConcepts.sort((a, b) => {
      const timestampA = a.timestamp || a.created_at || '0';
      const timestampB = b.timestamp || b.created_at || '0';
      return new Date(timestampB).getTime() - new Date(timestampA).getTime();
    });
    
    // Build batch requests for optimal styling
    const batchRequests: any[] = [];
    let currentIndex = 1;
    
    // Document header
    const headerText = `CONCEPT FORGE COMPLETE HISTORY EXPORT\n\nGenerated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\nTotal Concepts: ${allConcepts.length}\n\n\n`;
    
    batchRequests.push({
      insertText: {
        location: { index: currentIndex },
        text: headerText
      }
    });
    
    // Style the main header
    batchRequests.push({
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
    
    // Process each concept
    for (let i = 0; i < allConcepts.length; i++) {
      const entry = allConcepts[i];
      const timestamp = entry.timestamp || entry.created_at || new Date().toISOString();
      const date = new Date(timestamp).toLocaleDateString();
      const time = new Date(timestamp).toLocaleTimeString();
      
      // Add separator line with spacing
      if (i > 0) {
        const separatorText = `\n\n────────────────────────────────────────\n\n\n`;
        batchRequests.push({
          insertText: {
            location: { index: currentIndex },
            text: separatorText
          }
        });
        currentIndex += separatorText.length;
      }
      
      // Concept header
      const conceptHeaderText = `CONCEPT ${i + 1}\n\n`;
      batchRequests.push({
        insertText: {
          location: { index: currentIndex },
          text: conceptHeaderText
        }
      });
      
      // Style concept header
      batchRequests.push({
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
      
      // Prompt section
      const promptText = `Prompt: "${entry.prompt}"\n\n`;
      batchRequests.push({
        insertText: {
          location: { index: currentIndex },
          text: promptText
        }
      });
      
      // Style "Prompt:" label
      batchRequests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + 7
          },
          textStyle: {
            fontSize: { magnitude: 14, unit: 'PT' },
            bold: true
          },
          fields: 'fontSize,bold'
        }
      });
      
      currentIndex += promptText.length;
      
      // Tone and date section
      const metaText = `Tone: ${entry.tone.charAt(0).toUpperCase() + entry.tone.slice(1)}\nGenerated: ${date} at ${time}\n\n\n`;
      batchRequests.push({
        insertText: {
          location: { index: currentIndex },
          text: metaText
        }
      });
      
      // Style "Tone:" label
      batchRequests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + 5
          },
          textStyle: {
            fontSize: { magnitude: 14, unit: 'PT' },
            bold: true
          },
          fields: 'fontSize,bold'
        }
      });
      
      currentIndex += metaText.length;
      
      // Parse and add concept content
      try {
        // Try JSON format first
        const concept: ParsedConcept = JSON.parse(entry.content);
        
        // Headline
        if (concept.headline) {
          const headlineText = `${cleanContent(concept.headline)}\n\n`;
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: headlineText
            }
          });
          
          // Style headline
          batchRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + headlineText.length - 2
              },
              textStyle: {
                fontSize: { magnitude: 15, unit: 'PT' },
                bold: true
              },
              fields: 'fontSize,bold'
            }
          });
          
          currentIndex += headlineText.length;
        }
        
        // Tagline
        if (concept.tagline) {
          const taglineText = `${cleanContent(concept.tagline)}\n\n`;
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: taglineText
            }
          });
          
          // Style tagline (italic)
          batchRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + taglineText.length - 2
              },
              textStyle: {
                fontSize: { magnitude: 13, unit: 'PT' },
                italic: true
              },
              fields: 'fontSize,italic'
            }
          });
          
          currentIndex += taglineText.length;
        }
        
        // Body Copy
        if (concept.bodyCopy) {
          const bodyText = `${cleanContent(concept.bodyCopy)}\n\n`;
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: bodyText
            }
          });
          currentIndex += bodyText.length;
        }
        
        // Visual Concept
        if (concept.visualConcept) {
          const visualHeaderText = `Visual Concept:\n`;
          const visualContentText = `${cleanContent(concept.visualConcept)}\n\n`;
          
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: visualHeaderText + visualContentText
            }
          });
          
          // Style "Visual Concept:" header
          batchRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + visualHeaderText.length - 1
              },
              textStyle: {
                fontSize: { magnitude: 14, unit: 'PT' },
                bold: true
              },
              fields: 'fontSize,bold'
            }
          });
          
          currentIndex += visualHeaderText.length + visualContentText.length;
        }
        
        // Rhetorical Craft
        if (concept.rhetoricalCraft && concept.rhetoricalCraft.length > 0) {
          const craftHeaderText = `\nRhetorical Craft Analysis:\n`;
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: craftHeaderText
            }
          });
          
          // Style craft header
          batchRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex + 1,
                endIndex: currentIndex + craftHeaderText.length - 1
              },
              textStyle: {
                fontSize: { magnitude: 14, unit: 'PT' },
                bold: true
              },
              fields: 'fontSize,bold'
            }
          });
          
          currentIndex += craftHeaderText.length;
          
          // Add bulleted list with tight formatting
          let bulletText = '';
          concept.rhetoricalCraft.forEach(craft => {
            bulletText += `• ${craft.device}: ${cleanContent(craft.explanation)}\n`;
          });
          bulletText += '\n';
          
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: bulletText
            }
          });
          
          // Style bullet points (smaller font)
          batchRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + bulletText.length - 1
              },
              textStyle: {
                fontSize: { magnitude: 11, unit: 'PT' }
              },
              fields: 'fontSize'
            }
          });
          
          currentIndex += bulletText.length;
        }
        
        // Strategic Impact
        if (concept.strategicImpact) {
          const impactHeaderText = `Strategic Impact:\n`;
          const impactContentText = `${cleanContent(concept.strategicImpact)}\n\n`;
          
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: impactHeaderText + impactContentText
            }
          });
          
          // Style "Strategic Impact:" header
          batchRequests.push({
            updateTextStyle: {
              range: {
                startIndex: currentIndex,
                endIndex: currentIndex + impactHeaderText.length - 1
              },
              textStyle: {
                fontSize: { magnitude: 14, unit: 'PT' },
                bold: true
              },
              fields: 'fontSize,bold'
            }
          });
          
          currentIndex += impactHeaderText.length + impactContentText.length;
        }
        
      } catch (parseError) {
        // Handle legacy markdown format
        const legacyConcept = parseLegacyContent(entry.content);
        
        if (legacyConcept.headline) {
          const headlineText = `${cleanContent(legacyConcept.headline)}\n\n`;
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: headlineText
            }
          });
          currentIndex += headlineText.length;
        }
        
        if (legacyConcept.tagline) {
          const taglineText = `${cleanContent(legacyConcept.tagline)}\n\n`;
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: taglineText
            }
          });
          currentIndex += taglineText.length;
        }
        
        if (legacyConcept.bodyCopy) {
          const bodyText = `${cleanContent(legacyConcept.bodyCopy)}\n\n`;
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: bodyText
            }
          });
          currentIndex += bodyText.length;
        }
        
        if (legacyConcept.visualConcept) {
          const visualText = `Visual Concept: ${cleanContent(legacyConcept.visualConcept)}\n\n`;
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: visualText
            }
          });
          currentIndex += visualText.length;
        }
        
        if (legacyConcept.rhetoricalCraft) {
          const craftText = `Rhetorical Craft: ${cleanContent(legacyConcept.rhetoricalCraft)}\n\n`;
          batchRequests.push({
            insertText: {
              location: { index: currentIndex },
              text: craftText
            }
          });
          currentIndex += craftText.length;
        }
      }
    }
    
    console.log('Applying styled formatting with batch operations...');
    
    // Execute all batch requests
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: batchRequests
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
      
      console.log('Document shared successfully with dustinyork15@gmail.com');
    } catch (shareError) {
      console.log(`Could not share document: ${shareError.message}`);
      console.log('📧 You can manually share the document using the URL below');
    }
    
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    console.log(`Export complete! Document URL: ${documentUrl}`);
    console.log(`📊 Exported ${allConcepts.length} concepts with Concept Forge styling`);
    
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