import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

interface ConceptEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  is_favorite?: boolean;
}

const args = process.argv.slice(2);
const conceptId = args.find(arg => arg.startsWith('--specificId='))?.split('=')[1];

// Parse CLI formatting options
const headlineSize = args.find(arg => arg.startsWith('--headlineSize='))?.split('=')[1] || 'normal';
const boldHeadlines = args.includes('--boldHeadlines');
const boldSectionHeaders = args.includes('--boldSectionHeaders');
const enableHangingBullets = args.includes('--enableHangingBullets');
const headlineCase = args.find(arg => arg.startsWith('--headlineCase='))?.split('=')[1] || 'sentence';
const sectionLabelsCase = args.find(arg => arg.startsWith('--sectionLabelsCase='))?.split('=')[1] || 'sentence';
const bodyCase = args.find(arg => arg.startsWith('--bodyCase='))?.split('=')[1] || 'sentence';
const noAllCaps = args.includes('--noAllCaps');
const cleanSpacing = args.includes('--cleanSpacing');
const singleParagraphBody = args.includes('--singleParagraphBody');

function parseMarkdownContent(content: string) {
  const headlineMatch = content.match(/\*\*HEADLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const taglineMatch = content.match(/\*\*TAGLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const bodyMatch = content.match(/\*\*BODY COPY:\*\*\s*(.*?)(?=\*\*|$)/i);
  const visualMatch = content.match(/\*\*VISUAL CONCEPT:\*\*\s*(.*?)(?=\*\*|$)/i);
  const craftMatch = content.match(/\*\*RHETORICAL CRAFT(?:\s+BREAKDOWN)?:\*\*\s*(.*?)$/is);
  
  return {
    headline: headlineMatch ? headlineMatch[1].trim() : 'No headline found',
    tagline: taglineMatch ? taglineMatch[1].trim() : 'No tagline found',
    bodyCopy: bodyMatch ? bodyMatch[1].trim() : 'No body copy found',
    visualConcept: visualMatch ? visualMatch[1].trim() : 'No visual concept found',
    rhetoricalCraft: craftMatch ? craftMatch[1].trim() : 'No rhetorical craft found'
  };
}

function toSentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function formatTextByCase(text: string, caseType: string): string {
  if (noAllCaps && text === text.toUpperCase()) {
    text = text.toLowerCase();
  }
  
  switch (caseType) {
    case 'title': return toTitleCase(text);
    case 'upper': return text.toUpperCase();
    case 'sentence':
    default: return toSentenceCase(text);
  }
}

function formatRhetoricalCraft(text: string): string {
  return text
    .replace(/•\s*/g, '\n• ') 
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .trim();
}

async function exportFormattedConceptToGoogle() {
  if (!conceptId) {
    console.error("Error: --specificId parameter is required");
    return;
  }
  
  console.log("🚀 Google Docs Export with Advanced CLI Formatting");
  console.log("═══════════════════════════════════════════════════");
  
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  
  console.log(`🔍 Fetching concept ${conceptId}...`);
  const { data: concept, error } = await supabase
    .from('concept_logs')
    .select('*')
    .eq('id', conceptId)
    .single();
  
  if (error || !concept) {
    console.error("Error fetching concept:", error);
    return;
  }
  
  console.log(`Found concept: "${concept.prompt.substring(0, 50)}..."`);
  
  const parsed = parseMarkdownContent(concept.response);
  
  // Apply advanced formatting options
  const formattedHeadline = formatTextByCase(parsed.headline, headlineCase);
  const formattedBody = singleParagraphBody ? 
    parsed.bodyCopy.replace(/\n+/g, ' ').trim() : 
    parsed.bodyCopy;
  const formattedCraft = formatRhetoricalCraft(parsed.rhetoricalCraft);
  
  // Display formatted content
  console.log("\nFORMATTED CONTENT PREVIEW:");
  console.log("═══════════════════════════════");
  console.log(`${formattedHeadline}`);
  console.log(`${parsed.tagline}\n`);
  console.log("Body copy");
  console.log(`${formattedBody}\n`);
  console.log("Visual concept");  
  console.log(`${parsed.visualConcept}\n`);
  console.log("Rhetorical craft");
  console.log(`${formattedCraft}\n`);
  
  try {
    console.log("Creating Google Docs export...");
    
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
      scopes: ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive']
    });
    
    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });
    
    // Create document
    const docResponse = await docs.documents.create({
      requestBody: {
        title: `Concept Forge - ${formattedHeadline} - ${new Date().toLocaleDateString()}`
      }
    });
    
    const docId = docResponse.data.documentId!;
    console.log(`Document created: ${docId}`);
    
    // Build content with advanced formatting
    let requests: any[] = [];
    let currentIndex = 1;
    
    // Insert headline
    const headlineText = headlineSize === 'large' ? `${formattedHeadline}\n` : `${formattedHeadline}\n`;
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: headlineText
      }
    });
    
    // Style headline
    if (boldHeadlines || headlineSize === 'large') {
      requests.push({
        updateTextStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + formattedHeadline.length
          },
          textStyle: {
            bold: boldHeadlines,
            fontSize: { magnitude: headlineSize === 'large' ? 18 : 14, unit: 'PT' }
          },
          fields: boldHeadlines ? 'bold,fontSize' : 'fontSize'
        }
      });
    }
    currentIndex += headlineText.length;
    
    // Insert tagline
    const taglineText = `${parsed.tagline}\n\n`;
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: taglineText
      }
    });
    
    // Style tagline as italic
    requests.push({
      updateTextStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + parsed.tagline.length
        },
        textStyle: { italic: true },
        fields: 'italic'
      }
    });
    currentIndex += taglineText.length;
    
    // Add sections with formatting
    const sections = [
      { label: 'Body copy', content: formattedBody },
      { label: 'Visual concept', content: parsed.visualConcept },
      { label: 'Rhetorical craft', content: formattedCraft }
    ];
    
    for (const section of sections) {
      // Insert section label
      const labelText = `${section.label}\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: labelText
        }
      });
      
      // Style section label
      if (boldSectionHeaders) {
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + section.label.length
            },
            textStyle: { bold: true },
            fields: 'bold'
          }
        });
      }
      currentIndex += labelText.length;
      
      // Insert content
      const contentText = `${section.content}\n\n`;
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: contentText
        }
      });
      currentIndex += contentText.length;
    }
    
    // Execute all formatting requests
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests }
    });
    
    console.log("Content and formatting applied");
    
    // Share document
    await drive.permissions.create({
      fileId: docId,
      requestBody: {
        type: 'user',
        role: 'writer',
        emailAddress: process.env.GOOGLE_DOC_SHARE_EMAIL!
      }
    });
    
    const url = `https://docs.google.com/document/d/${docId}/edit`;
    console.log(`Google Docs export successful: ${url}`);
    console.log(`📧 Document shared with: ${process.env.GOOGLE_DOC_SHARE_EMAIL}`);
    
    console.log("\nCLI FORMATTING OPTIONS APPLIED:");
    console.log("═══════════════════════════════════");
    console.log(`✓ Headline case: ${headlineCase}`);
    console.log(`✓ Headline size: ${headlineSize}`);
    console.log(`✓ Bold headlines: ${boldHeadlines ? 'enabled' : 'disabled'}`);
    console.log(`✓ Bold section headers: ${boldSectionHeaders ? 'enabled' : 'disabled'}`);
    console.log(`✓ Single paragraph body: ${singleParagraphBody ? 'enabled' : 'disabled'}`);
    
  } catch (error) {
    console.error("Google Docs export failed:", error);
    console.log("📋 Formatted content available above for manual copy");
  }
}

exportFormattedConceptToGoogle().catch(console.error);