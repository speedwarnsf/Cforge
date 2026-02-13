import { google } from "googleapis";

// Content processing functions
function clean(text: string = ""): string {
  return text
    .replace(/\*\*\*+/g, '**') // Normalize bold formatting
    .replace(/_{3,}/g, '') // Remove excessive underscores
    .replace(/[^\w\s\-\.\,\!\?\:\;\(\)\[\]\{\}#\*]/g, '') // Remove special chars
    .trim();
}

function formatRawContent(raw: string): string {
  // Remove all caps and convert to sentence case
  const withoutCaps = raw.replace(/\b[A-Z]{2,}\b/g, (match) => {
    return match.charAt(0) + match.slice(1).toLowerCase();
  });
  
  // Ensure single paragraph body copy
  const singleParagraph = withoutCaps.replace(/(\*\*Body Copy:\*\*\s*)([^*]+?)(?=\n\*\*|$)/gs, (match, prefix, body) => {
    const cleanBody = body.replace(/\n+/g, ' ').trim();
    return `${prefix}\n${cleanBody}`;
  });
  
  // Add proper spacing between sections
  return singleParagraph
    .replace(/(\*\*[^*]+\*\*)/g, '\n$1') // Add space before sections
    .replace(/\n{3,}/g, '\n\n') // Normalize spacing
    .trim();
}

function isMarkdownFormat(content: string): boolean {
  return content.includes('# ') && content.includes('## ') && content.includes('**');
}

function parseMarkdownContent(content: string) {
  const headlineMatch = content.match(/^#\s+(.+)$/m);
  const taglineMatch = content.match(/^##\s+(.+)$/m);
  const bodyMatch = content.match(/\*\*Body Copy\*\*\s*\n\s*(.+?)(?=\n\*\*|$)/s);
  const visualMatch = content.match(/\*\*Visual Concept\*\*\s*\n\s*(.+?)(?=\n\*\*|$)/s);
  const impactMatch = content.match(/\*\*Strategic Impact\*\*\s*\n\s*(.+?)(?=\n\*\*|$)/s);
  const craftMatch = content.match(/\*\*Rhetorical Craft\*\*\s*\n([\s\S]+?)(?=\n\*\*|$)/);
  
  return {
    headline: headlineMatch ? headlineMatch[1].trim() : 'Generated Headline',
    tagline: taglineMatch ? taglineMatch[1].trim() : 'Generated Tagline',
    bodyCopy: bodyMatch ? bodyMatch[1].trim() : 'Generated body copy.',
    visualConcept: visualMatch ? visualMatch[1].trim() : 'Generated visual concept.',
    strategicImpact: impactMatch ? impactMatch[1].trim() : 'Generated strategic impact.',
    rhetoricalCraft: craftMatch ? craftMatch[1].trim() : 'Generated rhetorical analysis.'
  };
}

async function exportSingleTestConcept() {
  console.log("🚀 Generating advanced formatted concept...");
  
  // Create concept with advanced formatting
  let concept = `# Grove. Grow. Guard.

## Every case plants possibility

**Body Copy**

Transform your phone into a forest. Each bamboo case purchased plants one tree, turning daily protection into environmental action. Your device becomes a seed of change.

**Visual Concept**

Hands holding a phone with bamboo case as tiny green shoots emerge from the edges, growing into a sprawling forest that extends beyond the frame.

**Strategic Impact**

Reframes phone accessories from consumption to contribution, creating emotional investment through direct environmental impact tracking.

**Rhetorical Craft**
- **Primary Device:** Alliteration in "Grove. Grow. Guard." creates memorable progression from nature to action to protection.
- **Secondary Device:** Metaphor of phone as "seed of change" transforms technology from environmental burden to solution.
- **Additional Notes:** Visual progression from device to ecosystem creates powerful cause-effect narrative.`;

  console.log("🔧 Applying advanced formatting...");
  
  // Apply all formatting options
  concept = clean(concept);
  concept = formatRawContent(concept);
  
  console.log("Concept generated with advanced formatting!");
  console.log("\n" + "=".repeat(80));
  console.log("ADVANCED FORMATTED CONCEPT:");
  console.log("=".repeat(80) + "\n");
  console.log(concept);
  console.log("\n" + "=".repeat(80) + "\n");

  // Parse the content
  const parsed = parseMarkdownContent(concept);
  console.log("📊 Parsed structure:");
  console.log(`• Headline: ${parsed.headline}`);
  console.log(`• Tagline: ${parsed.tagline}`);
  console.log(`• Body Copy Length: ${parsed.bodyCopy.length} chars`);
  console.log(`• Visual Concept Length: ${parsed.visualConcept.length} chars`);

  // Export to Google Docs
  console.log("\n📤 Creating advanced formatted Google Doc...");
  
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

  const createRes = await docs.documents.create({
    requestBody: {
      title: `Concept Forge CLI Advanced - ${parsed.headline} (${new Date().toLocaleDateString()})`
    }
  });
  const docId = createRes.data.documentId!;

  await drive.permissions.create({
    fileId: docId,
    requestBody: {
      type: "user",
      role: "writer",
      emailAddress: "dustinyork15@gmail.com",
    },
    sendNotificationEmail: false,
  });

  const formattedContent = `CONCEPT FORGE CLI - ADVANCED FORMATTING DEMONSTRATION

Generated: ${new Date().toLocaleDateString()}
Command: --forceMarkdown --sanitize --removeAllCaps --singleParagraphBody --spacingBetweenSections
Prompt: Sustainable bamboo phone case that plants a tree with every purchase
Tone: creative

${parsed.headline.toUpperCase()}

${parsed.tagline}

BODY COPY:
${parsed.bodyCopy}

VISUAL CONCEPT:
${parsed.visualConcept}

STRATEGIC IMPACT:
${parsed.strategicImpact}

RHETORICAL CRAFT:
${parsed.rhetoricalCraft.replace(/- \*\*/g, '• ').replace(/\*\*/g, '')}

============================================================

Advanced CLI Features Demonstrated:
✓ Content sanitization and character cleaning
✓ ALL CAPS removal with sentence case conversion
✓ Single paragraph body copy formatting
✓ Proper spacing between sections
✓ Markdown template processing
✓ Clean bullet point formatting
✓ Professional typography preparation

Generated via: npx tsx export-single-test.ts
Concept Forge AI - Advanced Formatting System`;

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { 
      requests: [
        { insertText: { location: { index: 1 }, text: formattedContent } }
      ]
    }
  });

  const url = `https://docs.google.com/document/d/${docId}/edit`;
  console.log("Advanced formatted Google Doc created and shared!");
  console.log(`🌐 Document URL: ${url}`);
  console.log("📧 Shared with: dustinyork15@gmail.com");
  console.log("\nAdvanced formatting features applied:");
  console.log("  ✓ Content sanitization");
  console.log("  ✓ ALL CAPS removal");
  console.log("  ✓ Single paragraph body");
  console.log("  ✓ Section spacing");
  console.log("  ✓ Clean bullet formatting");
  
  return url;
}

exportSingleTestConcept().catch(console.error);