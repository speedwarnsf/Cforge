#!/usr/bin/env npx tsx

import { google } from "googleapis";

interface ConceptEntry {
  id: string;
  prompt: string;
  content: string;
  tone: string;
  timestamp: string;
  created_at?: string;
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

function clean(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim()
    .replace(/\n\s*\n/g, "\n\n")
    .replace(/\s+/g, " ");
}

function parseContent(content: string): ParsedConcept | null {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function exportAllHistoryToGoogleDoc() {
  console.log("🔍 Fetching concepts...");
  const response = await fetch("http://localhost:5000/api/history");
  const allConcepts: ConceptEntry[] = await response.json();
  console.log(`📊 Retrieved ${allConcepts.length} concepts`);

  const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive"
    ]
  });

  const docs = google.docs({ version: "v1", auth });
  const drive = google.drive({ version: "v3", auth });

  console.log("📄 Creating document...");
  const docRes = await docs.documents.create({
    requestBody: {
      title: `Concept Forge Export - ${new Date().toLocaleDateString()}`
    }
  });

  const docId = docRes.data.documentId!;
  console.log(`📄 Document ID: ${docId}`);

  // Add document header
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [{
        insertText: {
          location: { index: 1 },
          text: `Concept Forge Complete Export\nGenerated: ${new Date().toLocaleString()}\nTotal Concepts: ${allConcepts.length}\n\n`
        }
      }]
    }
  });

  // Process concepts one by one
  for (let i = 0; i < allConcepts.length; i++) {
    const entry = allConcepts[i];
    const timestamp = entry.timestamp || entry.created_at || new Date().toISOString();
    const generatedAt = `${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString()}`;

    // Get current end position
    const doc = await docs.documents.get({ documentId: docId });
    const endIndex = doc.data.body?.content?.slice(-1)[0]?.endIndex || 1;
    const insertIndex = endIndex - 1;

    // Build concept content
    let conceptText = `Concept ${i + 1}\n\n`;
    conceptText += `Prompt: ${clean(entry.prompt)}\n\n`;
    conceptText += `Tone: ${clean(entry.tone)}\n\n`;

    const parsed = parseContent(entry.content);
    if (parsed) {
      conceptText += `Headline: ${clean(parsed.headline) || "No headline"}\n\n`;
      conceptText += `Tagline: ${clean(parsed.tagline) || "No tagline"}\n\n`;
      conceptText += `Body Copy: ${clean(parsed.bodyCopy) || "No body copy"}\n\n`;
      conceptText += `Visual Concept: ${clean(parsed.visualConcept) || "No visual concept"}\n\n`;
      
      if (parsed.rhetoricalCraft?.length) {
        conceptText += `Rhetorical Craft:\n`;
        for (const craft of parsed.rhetoricalCraft) {
          conceptText += `• ${craft.device}: ${craft.explanation}\n`;
        }
        conceptText += `\n`;
      }
      
      conceptText += `Strategic Impact: ${clean(parsed.strategicImpact) || "No strategic impact"}\n\n`;
    } else {
      conceptText += `Content: ${clean(entry.content)}\n\n`;
    }

    conceptText += `Generated: ${generatedAt}\n\n`;

    // Add page break between concepts (except last)
    if (i < allConcepts.length - 1) {
      conceptText += `\f`; // Form feed character for page break
    }

    // Insert the concept
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [{
          insertText: {
            location: { index: insertIndex },
            text: conceptText
          }
        }]
      }
    });

    // Style the heading
    const headingEndIndex = insertIndex + `Concept ${i + 1}`.length;
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: [{
          updateParagraphStyle: {
            range: { startIndex: insertIndex, endIndex: headingEndIndex + 2 },
            paragraphStyle: { namedStyleType: "HEADING_1" },
            fields: "namedStyleType"
          }
        }]
      }
    });

    console.log(`✅ Processed Concept ${i + 1}/${allConcepts.length}`);
  }

  // Share the document
  console.log("🔗 Sharing document...");
  await drive.permissions.create({
    fileId: docId,
    requestBody: {
      role: "writer",
      type: "user",
      emailAddress: process.env.GOOGLE_DOC_SHARE_EMAIL
    }
  });

  const url = `https://docs.google.com/document/d/${docId}/edit`;
  console.log(`✅ Google Docs export complete: ${url}`);
  console.log(`✅ Document shared with ${process.env.GOOGLE_DOC_SHARE_EMAIL}`);
  
  return url;
}

// Run if called directly
exportAllHistoryToGoogleDoc().catch(console.error);

export default exportAllHistoryToGoogleDoc;