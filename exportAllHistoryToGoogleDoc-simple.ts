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

// Fallback parser for raw content blocks
function parseContent(content: string): ParsedConcept | null {
  if (!content) return null;
  try {
    // Attempt JSON first
    return JSON.parse(content);
  } catch {
    // Fallback to regex splitting
    const result: ParsedConcept = {
      headline: "",
      tagline: "",
      bodyCopy: "",
      visualConcept: "",
      rhetoricalCraft: [],
      strategicImpact: ""
    };
    const regex = /HEADLINE:(.*?)TAGLINE:(.*?)BODY COPY:(.*?)VISUAL CONCEPT:(.*?)RHETORICAL CRAFT BREAKDOWN:(.*)/s;
    const match = content.match(regex);
    if (match) {
      result.headline = clean(match[1]);
      result.tagline = clean(match[2]);
      result.bodyCopy = clean(match[3]);
      result.visualConcept = clean(match[4]);
      result.rhetoricalCraft = [];
      const bulletRegex = /• (.*?)\: (.*?)(?=•|$)/gs;
      let bullet;
      while ((bullet = bulletRegex.exec(match[5])) !== null) {
        result.rhetoricalCraft.push({
          device: bullet[1].trim(),
          explanation: bullet[2].trim()
        });
      }
      return result;
    }
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

  await drive.permissions.create({
    fileId: docId,
    requestBody: {
      type: "user",
      role: "writer",
      emailAddress: "dustinyork15@gmail.com"
    },
    sendNotificationEmail: false
  });

  // Insert initial header
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

  for (let i = 0; i < allConcepts.length; i++) {
    const entry = allConcepts[i];
    const timestamp = entry.timestamp || entry.created_at || new Date().toISOString();
    const generatedAt = `${new Date(timestamp).toLocaleDateString()} ${new Date(timestamp).toLocaleTimeString()}`;

    const currentDoc = await docs.documents.get({ documentId: docId });
    const index = currentDoc.data.body?.content?.slice(-1)[0]?.endIndex || 1;

    const requests: any[] = [];

    // Heading
    const heading = `Concept ${i + 1}\n`;
    requests.push({ insertText: { location: { index }, text: heading } });
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: index, endIndex: index + heading.length },
        paragraphStyle: { namedStyleType: "HEADING_1" },
        fields: "namedStyleType"
      }
    });
    let cursor = index + heading.length;

    // Prompt and Tone
    const sections = [
      { label: "Prompt", text: clean(entry.prompt) },
      { label: "Tone", text: clean(entry.tone) }
    ];

    const parsed = parseContent(entry.content);
    if (parsed) {
      sections.push(
        { label: "Headline", text: parsed.headline || "No headline" },
        { label: "Tagline", text: parsed.tagline || "No tagline" },
        { label: "Body Copy", text: parsed.bodyCopy || "No body copy" },
        { label: "Visual Concept", text: parsed.visualConcept || "No visual concept" },
        { label: "Strategic Impact", text: parsed.strategicImpact || "No strategic impact" }
      );
    } else {
      sections.push({ label: "Content", text: clean(entry.content) });
    }

    for (const s of sections) {
      requests.push({
        insertText: { location: { index: cursor }, text: `${s.label}:\n` }
      });
      requests.push({
        updateTextStyle: {
          range: { startIndex: cursor, endIndex: cursor + s.label.length + 1 },
          textStyle: { bold: true },
          fields: "bold"
        }
      });
      cursor += s.label.length + 1;

      requests.push({
        insertText: { location: { index: cursor }, text: `${s.text}\n\n` }
      });
      cursor += s.text.length + 2;
    }

    if (parsed?.rhetoricalCraft?.length) {
      const bulletStart = cursor;
      for (const c of parsed.rhetoricalCraft) {
        const bullet = `${c.device}: ${c.explanation}\n`;
        requests.push({
          insertText: { location: { index: cursor }, text: bullet }
        });
        cursor += bullet.length;
      }
      requests.push({
        createParagraphBullets: {
          range: { startIndex: bulletStart, endIndex: cursor },
          bulletPreset: "BULLET_DISC_CIRCLE_SQUARE"
        }
      });
      requests.push({
        insertText: { location: { index: cursor }, text: `\n` }
      });
      cursor++;
    } else {
      requests.push({
        insertText: { location: { index: cursor }, text: "No rhetorical craft\n\n" }
      });
      cursor += 20;
    }

    const gen = `Generated: ${generatedAt}\n\n`;
    requests.push({
      insertText: { location: { index: cursor }, text: gen }
    });
    cursor += gen.length;

    if (i < allConcepts.length - 1) {
      requests.push({ insertPageBreak: { location: { index: cursor } } });
      cursor++;
    }

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests }
    });

    console.log(`✅ Processed Concept ${i + 1}/${allConcepts.length}`);
  }

  const url = `https://docs.google.com/document/d/${docId}/edit`;
  console.log(`✅ Export complete: ${url}`);
  return url;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  exportAllHistoryToGoogleDoc();
}

export { exportAllHistoryToGoogleDoc };
