#!/usr/bin/env npx tsx

import { google } from 'googleapis';

interface Concept {
  prompt: string;
  tone: string;
  headline: string;
  tagline: string;
  bodyCopy: string;
  visualConcept: string;
  rhetoricalCraft: string[];
  generatedAt: string;
}

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

function parseLegacyContent(rawContent: string): Partial<Concept> {
  const sections: Partial<Concept> = {};
  
  try {
    const cleanContent = rawContent.replace(/\*\*/g, '').replace(/\*/g, '');
    
    const headlineMatch = cleanContent.match(/HEADLINE:\s*([^\n]*)/i);
    if (headlineMatch) sections.headline = headlineMatch[1].trim();
    
    const taglineMatch = cleanContent.match(/TAGLINE:\s*([^\n]*)/i);
    if (taglineMatch) sections.tagline = taglineMatch[1].trim();
    
    const bodyCopyMatch = cleanContent.match(/BODY COPY:\s*([^]*?)(?=VISUAL CONCEPT:|RHETORICAL CRAFT|$)/i);
    if (bodyCopyMatch) sections.bodyCopy = bodyCopyMatch[1].trim();
    
    const visualMatch = cleanContent.match(/VISUAL CONCEPT:\s*([^]*?)(?=RHETORICAL CRAFT|$)/i);
    if (visualMatch) sections.visualConcept = visualMatch[1].trim();
    
    const rhetoricalMatch = cleanContent.match(/RHETORICAL CRAFT.*?:\s*([^]*?)$/i);
    if (rhetoricalMatch) {
      sections.rhetoricalCraft = [rhetoricalMatch[1].trim()];
    }
    
  } catch (error) {
    sections.bodyCopy = rawContent.substring(0, 300) + '...';
  }
  
  return sections;
}

function cleanContent(text: string): string {
  if (!text) return '';
  
  let cleaned = text.replace(/\*\*/g, '').replace(/\*/g, '').trim();
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  cleaned = cleaned.replace(/\s+/g, ' ');
  
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
    
    console.log('Creating document with NamedStyles...');
    
    const createResponse = await docs.documents.create({
      requestBody: {
        title: `Concept Forge Complete History Export - ${new Date().toLocaleDateString()}`
      }
    });
    
    const documentId = createResponse.data.documentId!;
    console.log(`Document created with ID: ${documentId}`);
    
    allConcepts.sort((a, b) => {
      const timestampA = a.timestamp || a.created_at || '0';
      const timestampB = b.timestamp || b.created_at || '0';
      return new Date(timestampB).getTime() - new Date(timestampA).getTime();
    });
    
    const concepts: Concept[] = allConcepts.map(entry => {
      const timestamp = entry.timestamp || entry.created_at || new Date().toISOString();
      const generatedAt = `${new Date(timestamp).toLocaleDateString()} at ${new Date(timestamp).toLocaleTimeString()}`;
      
      try {
        const parsed: ParsedConcept = JSON.parse(entry.content);
        return {
          prompt: entry.prompt,
          tone: entry.tone.charAt(0).toUpperCase() + entry.tone.slice(1),
          headline: cleanContent(parsed.headline) || 'No headline',
          tagline: cleanContent(parsed.tagline) || 'No tagline',
          bodyCopy: cleanContent(parsed.bodyCopy) || 'No body copy',
          visualConcept: cleanContent(parsed.visualConcept) || 'No visual concept',
          rhetoricalCraft: parsed.rhetoricalCraft?.map(craft => `${craft.device}: ${cleanContent(craft.explanation)}`) || ['No rhetorical craft'],
          generatedAt
        };
      } catch (parseError) {
        const legacy = parseLegacyContent(entry.content);
        return {
          prompt: entry.prompt,
          tone: entry.tone.charAt(0).toUpperCase() + entry.tone.slice(1),
          headline: cleanContent(legacy.headline || 'No headline'),
          tagline: cleanContent(legacy.tagline || 'No tagline'),
          bodyCopy: cleanContent(legacy.bodyCopy || 'No body copy'),
          visualConcept: cleanContent(legacy.visualConcept || 'No visual concept'),
          rhetoricalCraft: legacy.rhetoricalCraft || ['No rhetorical craft'],
          generatedAt
        };
      }
    });
    
    console.log('✍️ Using consistent inline styles...');
    
    let currentIndex = 1;
    
    const headerText = `CONCEPT FORGE COMPLETE HISTORY EXPORT\n\nGenerated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\nTotal Concepts: ${concepts.length}\n\n\n`;
    
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: currentIndex },
              text: headerText
            }
          },
          {
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
          }
        ]
      }
    });
    
    currentIndex += headerText.length;
    
    console.log('Adding concepts with consistent formatting...');
    
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i];
      
      if (i > 0) {
        const separatorText = `\n\n\n────────────────────────────────────────\n\n\n`;
        
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: { index: currentIndex },
                  text: separatorText
                }
              }
            ]
          }
        });
        
        currentIndex += separatorText.length;
      }
      
      const conceptNumber = `CONCEPT ${i + 1}\n\n`;
      
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: currentIndex },
                text: conceptNumber
              }
            },
            {
              updateTextStyle: {
                range: {
                  startIndex: currentIndex,
                  endIndex: currentIndex + conceptNumber.length - 2
                },
                textStyle: {
                  fontSize: { magnitude: 16, unit: 'PT' },
                  bold: true
                },
                fields: 'fontSize,bold'
              }
            }
          ]
        }
      });
      
      currentIndex += conceptNumber.length;
      
      const fields = [
        { label: 'Prompt:', content: concept.prompt },
        { label: 'Tone:', content: concept.tone },
        { label: 'Headline:', content: concept.headline },
        { label: 'Tagline:', content: concept.tagline },
        { label: 'Body Copy:', content: concept.bodyCopy },
        { label: 'Visual Concept:', content: concept.visualConcept }
      ];
      
      for (const field of fields) {
        const fieldText = `${field.label}\n${field.content}\n\n`;
        
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: { index: currentIndex },
                  text: fieldText
                }
              },
              {
                updateTextStyle: {
                  range: {
                    startIndex: currentIndex,
                    endIndex: currentIndex + field.label.length
                  },
                  textStyle: {
                    fontSize: { magnitude: 14, unit: 'PT' },
                    bold: true
                  },
                  fields: 'fontSize,bold'
                }
              },
              {
                updateTextStyle: {
                  range: {
                    startIndex: currentIndex + field.label.length + 1,
                    endIndex: currentIndex + field.label.length + 1 + field.content.length
                  },
                  textStyle: {
                    fontSize: { magnitude: 11, unit: 'PT' }
                  },
                  fields: 'fontSize'
                }
              }
            ]
          }
        });
        
        currentIndex += fieldText.length;
      }
      
      const craftLabel = 'Rhetorical Craft:\n';
      
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: currentIndex },
                text: craftLabel
              }
            },
            {
              updateTextStyle: {
                range: {
                  startIndex: currentIndex,
                  endIndex: currentIndex + craftLabel.length - 1
                },
                textStyle: {
                  fontSize: { magnitude: 14, unit: 'PT' },
                  bold: true
                },
                fields: 'fontSize,bold'
              }
            }
          ]
        }
      });
      
      currentIndex += craftLabel.length;
      
      let bulletContent = '';
      for (const craft of concept.rhetoricalCraft) {
        bulletContent += `• ${craft}\n`;
      }
      bulletContent += '\n';
      
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: currentIndex },
                text: bulletContent
              }
            },
            {
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
            }
          ]
        }
      });
      
      currentIndex += bulletContent.length;
      
      const timestampText = `Generated: ${concept.generatedAt}\n\n`;
      
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: currentIndex },
                text: timestampText
              }
            },
            {
              updateTextStyle: {
                range: {
                  startIndex: currentIndex,
                  endIndex: currentIndex + timestampText.length - 2
                },
                textStyle: {
                  fontSize: { magnitude: 9, unit: 'PT' },
                  foregroundColor: { color: { rgbColor: { red: 0.5, green: 0.5, blue: 0.5 } } }
                },
                fields: 'fontSize,foregroundColor'
              }
            }
          ]
        }
      });
      
      currentIndex += timestampText.length;
    }
    
    console.log('🔗 Sharing document with dustinyork15@gmail.com...');
    
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
    console.log(`Document URL: ${documentUrl}`);
    console.log(`📊 Exported ${concepts.length} concepts with JSON-based structure`);
    
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