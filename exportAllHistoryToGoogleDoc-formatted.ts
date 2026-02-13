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

function cleanContent(text: string): string {
  if (!text) return '';
  
  let cleaned = text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Remove sentence duplication
  const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const uniqueSentences = [...new Set(sentences.map(s => s.toLowerCase().trim()))];
  
  return sentences.filter(s => uniqueSentences.includes(s.toLowerCase().trim())).join('. ').trim() + (sentences.length > 0 ? '.' : '');
}

async function exportAllHistoryToGoogleDoc() {
  try {
    console.log('🔍 Fetching complete concept history...');
    
    const response = await fetch('http://localhost:5000/api/history');
    const allConcepts: ConceptEntry[] = await response.json();
    
    console.log(`📊 Retrieved ${allConcepts.length} concepts from database`);
    
    console.log('🔐 Setting up Google Docs API...');
    
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'],
    });
    
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });
    
    console.log('Creating document...');
    
    const createResponse = await docs.documents.create({
      requestBody: {
        title: `Concept Forge Complete History Export - ${new Date().toLocaleDateString()}`
      }
    });
    
    const documentId = createResponse.data.documentId!;
    console.log(`Document created with ID: ${documentId}`);
    
    // Share document immediately
    console.log('🔗 Sharing document with dustinyork15@gmail.com...');
    
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: 'dustinyork15@gmail.com',
      },
      sendNotificationEmail: false
    });
    
    console.log('Document shared successfully');
    
    // Sort concepts by date
    allConcepts.sort((a, b) => {
      const timestampA = a.timestamp || a.created_at || '0';
      const timestampB = b.timestamp || b.created_at || '0';
      return new Date(timestampB).getTime() - new Date(timestampA).getTime();
    });
    
    console.log('Building formatted content...');
    
    // Build complete document with proper formatting
    const requests = [];
    let currentIndex = 1;
    
    // Header
    const headerText = `CONCEPT FORGE COMPLETE HISTORY EXPORT\n\nGenerated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\nTotal Concepts: ${allConcepts.length}\n\n\n`;
    
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: headerText
      }
    });
    
    // Style header
    requests.push({
      updateTextStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + 'CONCEPT FORGE COMPLETE HISTORY EXPORT'.length
        },
        textStyle: {
          fontSize: { magnitude: 18, unit: 'PT' },
          bold: true,
          foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } }
        },
        fields: 'fontSize,bold,foregroundColor'
      }
    });
    
    currentIndex += headerText.length;
    
    // Process each concept
    for (let i = 0; i < allConcepts.length; i++) {
      const entry = allConcepts[i];
      const timestamp = entry.timestamp || entry.created_at || new Date().toISOString();
      const generatedAt = `${new Date(timestamp).toLocaleDateString()} at ${new Date(timestamp).toLocaleTimeString()}`;
      
      // Add separator
      if (i > 0) {
        const separatorText = `\n\n────────────────────────────────────────\n\n`;
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: separatorText
          }
        });
        currentIndex += separatorText.length;
      }
      
      // Concept number
      const conceptNumber = `CONCEPT ${i + 1}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: conceptNumber
        }
      });
      
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + conceptNumber.length - 2
          },
          textStyle: {
            fontSize: { magnitude: 16, unit: 'PT' },
            bold: true,
            foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } }
          },
          fields: 'fontSize,bold,foregroundColor'
        }
      });
      
      currentIndex += conceptNumber.length;
      
      // Parse concept data
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(entry.content);
      } catch (parseError) {
        // Handle legacy format
        parsedData = {
          headline: 'Legacy format',
          tagline: 'Legacy format',
          bodyCopy: entry.content.substring(0, 200) + '...',
          visualConcept: 'Legacy format',
          rhetoricalCraft: [{ device: 'Legacy', explanation: 'Legacy format concept' }]
        };
      }
      
      // Add structured fields
      const fields = [
        { label: 'Prompt:', content: entry.prompt },
        { label: 'Tone:', content: entry.tone.charAt(0).toUpperCase() + entry.tone.slice(1) },
        { label: 'Headline:', content: cleanContent(parsedData.headline) || 'No headline' },
        { label: 'Tagline:', content: cleanContent(parsedData.tagline) || 'No tagline' },
        { label: 'Body Copy:', content: cleanContent(parsedData.bodyCopy) || 'No body copy' },
        { label: 'Visual Concept:', content: cleanContent(parsedData.visualConcept) || 'No visual concept' }
      ];
      
      for (const field of fields) {
        const fieldText = `${field.label}\n${field.content}\n\n`;
        
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: fieldText
          }
        });
        
        // Bold label
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + field.label.length
            },
            textStyle: {
              fontSize: { magnitude: 13, unit: 'PT' },
              bold: true,
              foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } }
            },
            fields: 'fontSize,bold,foregroundColor'
          }
        });
        
        // Regular content
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: currentIndex + field.label.length + 1,
              endIndex: currentIndex + field.label.length + 1 + field.content.length
            },
            textStyle: {
              fontSize: { magnitude: 12, unit: 'PT' },
              foregroundColor: { color: { rgbColor: { red: 0.1, green: 0.1, blue: 0.1 } } }
            },
            fields: 'fontSize,foregroundColor'
          }
        });
        
        currentIndex += fieldText.length;
      }
      
      // Rhetorical Craft section
      const craftLabel = 'Rhetorical Craft:\n';
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: craftLabel
        }
      });
      
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + craftLabel.length - 1
          },
          textStyle: {
            fontSize: { magnitude: 13, unit: 'PT' },
            bold: true,
            foregroundColor: { color: { rgbColor: { red: 0, green: 0, blue: 0 } } }
          },
          fields: 'fontSize,bold,foregroundColor'
        }
      });
      
      currentIndex += craftLabel.length;
      
      // Rhetorical craft bullets
      let bulletContent = '';
      if (parsedData.rhetoricalCraft && Array.isArray(parsedData.rhetoricalCraft)) {
        for (const craft of parsedData.rhetoricalCraft) {
          const deviceText = typeof craft === 'object' ? `${craft.device}: ${cleanContent(craft.explanation)}` : cleanContent(craft);
          bulletContent += `• ${deviceText}\n`;
        }
      } else {
        bulletContent = '• No rhetorical craft identified\n';
      }
      bulletContent += '\n';
      
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: bulletContent
        }
      });
      
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + bulletContent.length - 1
          },
          textStyle: {
            fontSize: { magnitude: 11, unit: 'PT' },
            foregroundColor: { color: { rgbColor: { red: 0.2, green: 0.2, blue: 0.2 } } }
          },
          fields: 'fontSize,foregroundColor'
        }
      });
      
      currentIndex += bulletContent.length;
      
      // Timestamp
      const timestampText = `Generated: ${generatedAt}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: timestampText
        }
      });
      
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + timestampText.length - 2
          },
          textStyle: {
            fontSize: { magnitude: 10, unit: 'PT' },
            foregroundColor: { color: { rgbColor: { red: 0.5, green: 0.5, blue: 0.5 } } }
          },
          fields: 'fontSize,foregroundColor'
        }
      });
      
      currentIndex += timestampText.length;
    }
    
    console.log('Applying all formatting...');
    
    // Apply all formatting in batches to avoid timeout
    const batchSize = 20;
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests: batch }
      });
    }
    
    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    console.log(`Export complete! Document URL: ${documentUrl}`);
    console.log(`📊 Exported ${allConcepts.length} concepts with professional formatting`);
    
    return documentUrl;
    
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  exportAllHistoryToGoogleDoc();
}

export { exportAllHistoryToGoogleDoc };