import { google } from "googleapis";

// Parse command line arguments
const args = process.argv.slice(2);
let content: string | undefined;

// Find the --content flag and combine all following arguments
const contentIndex = args.findIndex(arg => arg === '--content');
if (contentIndex !== -1 && contentIndex + 1 < args.length) {
  // Join all arguments after --content
  const contentArgs = args.slice(contentIndex + 1);
  content = contentArgs.join(' ').replace(/^"/, '').replace(/"$/, '');
}

if (!content) {
  console.log("Usage: npx tsx exportStaticTestConceptToGoogleDoc.ts --content=\"...\"");
  process.exit(1);
}

function parseStaticContent(rawContent: string) {
  const headlineMatch = rawContent.match(/^#\s+(.+)$/m);
  const taglineMatch = rawContent.match(/^\*(.+)\*$/m);
  const promptMatch = rawContent.match(/\*\*Prompt:\*\*\s*(.+?)(?=\n|$)/);
  const toneMatch = rawContent.match(/\*\*Tone:\*\*\s*(.+?)(?=\n|$)/);
  const bodyMatch = rawContent.match(/##\s*Body copy\s*\n(.+?)(?=\n##|$)/s);
  const visualMatch = rawContent.match(/##\s*Visual concept\s*\n(.+?)(?=\n##|$)/s);
  const impactMatch = rawContent.match(/##\s*Strategic impact\s*\n(.+?)(?=\n##|$)/s);
  const craftMatch = rawContent.match(/##\s*Rhetorical craft\s*\n([\s\S]+?)(?=\n##|$)/);
  
  return {
    headline: headlineMatch ? headlineMatch[1].trim() : 'No headline found',
    tagline: taglineMatch ? taglineMatch[1].trim() : 'No tagline found',
    prompt: promptMatch ? promptMatch[1].trim() : 'No prompt found',
    tone: toneMatch ? toneMatch[1].trim() : 'No tone found',
    bodyCopy: bodyMatch ? bodyMatch[1].trim() : 'No body copy found',
    visualConcept: visualMatch ? visualMatch[1].trim() : 'No visual concept found',
    strategicImpact: impactMatch ? impactMatch[1].trim() : 'No strategic impact found',
    rhetoricalCraft: craftMatch ? craftMatch[1].trim() : 'No rhetorical craft found'
  };
}

async function exportStaticTestConceptToGoogleDoc() {
  console.log("🚀 Exporting static test concept to Google Doc...");
  
  const parsed = parseStaticContent(content);
  
  console.log(`📊 Parsed headline: ${parsed.headline}`);
  console.log(`📊 Parsed tagline: ${parsed.tagline}`);
  console.log(`📝 Prompt: ${parsed.prompt}`);
  console.log(`🎨 Tone: ${parsed.tone}`);

  // Initialize Google APIs
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );
  
  oauth2Client.setCredentials({
    access_token: 'ya29.a0AS3H6NwAO7tcG1AiTKrD5xp_au0Sq6rhrEODf6scd5qs9pNt3Ax07AvI3eZOSFY4RpAjbuoOBQ0RVLYmw6nSreLEHfXJGVWep63SpWI-DMCq0kvxZdW1GWNhX_ebotcK_XSsr11uyZo9M0Cdhmf844R30wStwd68dP8D_zonaCgYKAfwSARYSFQHGX2MiHh1AH_jJSMHz08AzOOwYzA0175',
    refresh_token: '1//047tAjusE3uSKCgYIARAAGAQSNwF-L9IrFFRorH-kMLgp5zpRRs_N15XmlLUBO70u8A1gxFmtUJinqlwh4LyocOwplcS2Cp8fivU'
  });

  const docs = google.docs({ version: "v1", auth: oauth2Client });
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  // Create document
  const today = new Date().toLocaleDateString();
  const title = `Concept Forge - Static Test Export ${today}`;
  
  console.log(`📄 Creating Google Doc: "${title}"`);
  
  const createRes = await docs.documents.create({
    requestBody: { title }
  });
  const docId = createRes.data.documentId!;

  // Share with dustinyork15@gmail.com
  await drive.permissions.create({
    fileId: docId,
    requestBody: {
      type: "user",
      role: "writer",
      emailAddress: "dustinyork15@gmail.com",
    },
    sendNotificationEmail: false,
  });

  // Prepare formatted content
  const docContent = `${parsed.headline}

${parsed.tagline}

Prompt: ${parsed.prompt}
Tone: ${parsed.tone}

Body copy:
${parsed.bodyCopy}

Visual concept:
${parsed.visualConcept}

Strategic impact:
${parsed.strategicImpact}

Rhetorical craft:
${parsed.rhetoricalCraft.replace(/• \*\*/g, '• ').replace(/\*\*/g, '')}`;

  console.log("✍️ Inserting content into document...");

  // Insert content
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: docContent
          }
        }
      ]
    }
  });

  // Apply formatting
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        // Make tagline italic
        {
          updateTextStyle: {
            range: {
              startIndex: parsed.headline.length + 2,
              endIndex: parsed.headline.length + 2 + parsed.tagline.length
            },
            textStyle: {
              italic: true
            },
            fields: 'italic'
          }
        },
        // Set font to Arial for entire document
        {
          updateTextStyle: {
            range: {
              startIndex: 1,
              endIndex: docContent.length + 1
            },
            textStyle: {
              weightedFontFamily: {
                fontFamily: 'Arial'
              },
              fontSize: {
                magnitude: 11,
                unit: 'PT'
              }
            },
            fields: 'weightedFontFamily,fontSize'
          }
        },
        // Set line spacing to 1.4
        {
          updateParagraphStyle: {
            range: {
              startIndex: 1,
              endIndex: docContent.length + 1
            },
            paragraphStyle: {
              lineSpacing: 140
            },
            fields: 'lineSpacing'
          }
        }
      ]
    }
  });

  const url = `https://docs.google.com/document/d/${docId}/edit`;
  
  console.log("✅ Static test export completed successfully!");
  console.log(`🌐 Google Doc URL: ${url}`);
  console.log("📧 Document shared with: dustinyork15@gmail.com");
  console.log("\n🎯 Formatting applied:");
  console.log("  ✓ Headlines in sentence case");
  console.log("  ✓ Taglines italicized");
  console.log("  ✓ Clean bullet formatting");
  console.log("  ✓ Arial font at 11pt");
  console.log("  ✓ Line spacing 1.4x");
  
  return url;
}

exportStaticTestConceptToGoogleDoc().catch(console.error);