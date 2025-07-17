import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

interface ConceptEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  is_favorite?: boolean;
}

interface FormatOptions {
  contentFormat: 'markdown' | 'json';
  headlinesCase: 'sentence' | 'title' | 'upper';
  sectionLabelsCase: 'sentence' | 'title' | 'upper';
  bodyCase: 'sentence' | 'title' | 'upper';
  enableHangingBullets: boolean;
  cleanSpacing: boolean;
  singleParagraphBody: boolean;
  headlineStyle: 'Title' | 'Heading1' | 'Normal';
  boldHeaders: boolean;
  sanitizeContent: boolean;
  deduplicateSections: boolean;
  strictFieldMode: boolean;
  debugFieldInjection: boolean;
  noAllCaps: boolean;
}

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string, defaultValue?: any): any => {
  const index = args.findIndex(arg => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (index !== -1) {
    const arg = args[index];
    if (arg.includes('=')) {
      return arg.split('=')[1];
    }
    // For boolean flags without values
    if (args[index + 1] && !args[index + 1].startsWith('--')) {
      return args[index + 1];
    }
    return true; // Flag is present
  }
  return defaultValue;
};

const formatOptions: FormatOptions = {
  contentFormat: getArg('contentFormat', 'markdown') as 'markdown' | 'json',
  headlinesCase: getArg('headlinesCase', 'sentence') as 'sentence' | 'title' | 'upper',
  sectionLabelsCase: getArg('sectionLabelsCase', 'sentence') as 'sentence' | 'title' | 'upper',
  bodyCase: getArg('bodyCase', 'sentence') as 'sentence' | 'title' | 'upper',
  enableHangingBullets: getArg('enableHangingBullets', false),
  cleanSpacing: getArg('cleanSpacing', false),
  singleParagraphBody: getArg('singleParagraphBody', false),
  headlineStyle: getArg('headlineStyle', 'Title') as 'Title' | 'Heading1' | 'Normal',
  boldHeaders: getArg('boldHeaders', false),
  sanitizeContent: getArg('sanitizeContent', false),
  deduplicateSections: getArg('deduplicateSections', false),
  strictFieldMode: getArg('strictFieldMode', false),
  debugFieldInjection: getArg('debugFieldInjection', false),
  noAllCaps: getArg('noAllCaps', false)
};

// Text formatting functions
function toSentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function formatTextByCase(text: string, caseType: 'sentence' | 'title' | 'upper'): string {
  switch (caseType) {
    case 'sentence':
      return toSentenceCase(text);
    case 'title':
      return toTitleCase(text);
    case 'upper':
      return text.toUpperCase();
    default:
      return text;
  }
}

function formatBodyText(text: string, options: FormatOptions): string {
  let formatted = text;
  
  // Apply case formatting
  formatted = formatTextByCase(formatted, options.bodyCase);
  
  // Single paragraph formatting
  if (options.singleParagraphBody) {
    formatted = formatted.replace(/\n\s*\n/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  return formatted;
}

function formatBulletText(text: string, options: FormatOptions): string {
  if (!options.enableHangingBullets) {
    return text;
  }
  
  // Process bullet points with hanging indentation
  const lines = text.split('\n');
  const processed = lines.map(line => {
    if (line.trim().startsWith('•')) {
      // Clean up bullet formatting
      return line.replace(/^[\s•]*/, '• ');
    }
    return line;
  });
  
  return processed.join('\n');
}

function sanitizeContent(text: string, options: FormatOptions): string {
  if (!options.sanitizeContent) {
    return text;
  }
  
  let sanitized = text;
  
  // Remove excessive punctuation
  sanitized = sanitized.replace(/[!]{2,}/g, '!');
  sanitized = sanitized.replace(/[?]{2,}/g, '?');
  sanitized = sanitized.replace(/[.]{3,}/g, '...');
  
  // Clean up spacing
  sanitized = sanitized.replace(/\s{2,}/g, ' ');
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  
  // Remove redundant formatting markers
  sanitized = sanitized.replace(/\*{3,}/g, '**');
  sanitized = sanitized.replace(/_{3,}/g, '__');
  
  // Clean up quotes
  sanitized = sanitized.replace(/[""]/g, '"');
  sanitized = sanitized.replace(/['']/g, "'");
  
  return sanitized.trim();
}

function deduplicateContent(content: any, options: FormatOptions): any {
  if (!options.deduplicateSections) {
    return content;
  }
  
  // Check for duplicate sentences across different sections
  const sections = [content.headline, content.tagline, content.bodyCopy, content.visualConcept, content.strategicImpact];
  const sentences = new Map<string, string>();
  
  // Collect all sentences and their sources
  sections.forEach((section, index) => {
    const sectionNames = ['headline', 'tagline', 'bodyCopy', 'visualConcept', 'strategicImpact'];
    if (typeof section === 'string') {
      const sectionSentences = section.split(/[.!?]+/).filter(s => s.trim().length > 10);
      sectionSentences.forEach(sentence => {
        const normalized = sentence.trim().toLowerCase();
        if (normalized.length > 15) {
          if (sentences.has(normalized)) {
            console.log(`🔍 Detected duplicate: "${sentence.trim()}" in ${sectionNames[index]}`);
          } else {
            sentences.set(normalized, sectionNames[index]);
          }
        }
      });
    }
  });
  
  return content;
}

function validateStrictFields(content: any, options: FormatOptions): any {
  if (!options.strictFieldMode) {
    return content;
  }
  
  console.log("🔒 Strict field validation enabled");
  
  const requiredFields = ['headline', 'tagline', 'bodyCopy', 'visualConcept', 'strategicImpact', 'rhetoricalCraft'];
  const validatedContent = { ...content };
  
  requiredFields.forEach(field => {
    const value = validatedContent[field];
    
    // Check if field exists and has meaningful content
    if (!value || typeof value !== 'string' || value.trim().length < 5) {
      console.log(`⚠️ Field validation failed: ${field} - insufficient content`);
      validatedContent[field] = `[MISSING: ${field.toUpperCase()}]`;
    } else if (value.toLowerCase().includes('no ' + field.toLowerCase().replace('copy', '')) || 
               value.toLowerCase().includes('generated') ||
               value.toLowerCase().includes('placeholder')) {
      console.log(`⚠️ Field validation failed: ${field} - contains placeholder text`);
      validatedContent[field] = `[INVALID: ${field.toUpperCase()}]`;
    } else {
      console.log(`✅ Field validation passed: ${field}`);
    }
  });
  
  // Additional validation for specific fields
  if (options.strictFieldMode) {
    // Headline should be concise (2-8 words)
    const headlineWords = validatedContent.headline.split(/\s+/).length;
    if (headlineWords > 8 || headlineWords < 2) {
      console.log(`⚠️ Headline length validation: ${headlineWords} words (optimal: 2-8)`);
    }
    
    // Body copy should be substantial (minimum 20 words)
    const bodyWords = validatedContent.bodyCopy.split(/\s+/).length;
    if (bodyWords < 20) {
      console.log(`⚠️ Body copy length validation: ${bodyWords} words (minimum: 20)`);
    }
    
    // Tagline should be brief (3-15 words)
    const taglineWords = validatedContent.tagline.split(/\s+/).length;
    if (taglineWords > 15 || taglineWords < 3) {
      console.log(`⚠️ Tagline length validation: ${taglineWords} words (optimal: 3-15)`);
    }
  }
  
  return validatedContent;
}

function isMarkdownFormat(content: string): boolean {
  return content.includes('# ') && content.includes('**');
}

function parseMarkdownContent(content: string, options?: FormatOptions) {
  // Handle both uppercase and mixed case formats
  const headlineMatch = content.match(/^#\s+(.+)$/m) || content.match(/\*\*HEADLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const taglineMatch = content.match(/\*\*Tagline:\*\*\s*(.+?)(?=\n|$)/s) || content.match(/\*\*TAGLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  const bodyMatch = content.match(/\*\*Body Copy:\*\*\s*\n(.+?)(?=\n\*\*|$)/s) || content.match(/\*\*BODY COPY:\*\*\s*(.*?)(?=\*\*|$)/i);
  const visualMatch = content.match(/\*\*Visual Concept:\*\*\s*\n(.+?)(?=\n\*\*|$)/s) || content.match(/\*\*VISUAL CONCEPT:\*\*\s*(.*?)(?=\*\*|$)/i);
  const impactMatch = content.match(/\*\*Strategic Impact:\*\*\s*\n(.+?)(?=\n\*\*|$)/s) || content.match(/\*\*STRATEGIC IMPACT:\*\*\s*(.*?)(?=\*\*|$)/is);
  // Updated to handle both "RHETORICAL CRAFT:" and "RHETORICAL CRAFT BREAKDOWN:"
  const craftMatch = content.match(/\*\*Rhetorical Craft:\*\*\s*\n([\s\S]+?)(?=\n\*\*|$)/) || content.match(/\*\*RHETORICAL CRAFT(?:\s+BREAKDOWN)?:\*\*\s*(.*?)(?=\*\*|$)/is);
  
  // Debug field injection if enabled
  if (options?.debugFieldInjection) {
    console.log("\n🔍 DEBUG FIELD INJECTION:");
    console.log("═══════════════════════════");
    console.log(`📄 Content length: ${content.length}`);
    console.log(`🎯 Headline match: ${headlineMatch ? '✅ Found' : '❌ Not found'}`);
    console.log(`🏷️  Tagline match: ${taglineMatch ? '✅ Found' : '❌ Not found'}`);
    console.log(`📝 Body copy match: ${bodyMatch ? '✅ Found' : '❌ Not found'}`);
    console.log(`🎨 Visual concept match: ${visualMatch ? '✅ Found' : '❌ Not found'}`);
    console.log(`📈 Strategic impact match: ${impactMatch ? '✅ Found' : '❌ Not found'}`);
    console.log(`🎭 Rhetorical craft match: ${craftMatch ? '✅ Found' : '❌ Not found'}`);
    
    if (headlineMatch) console.log(`   → Headline: "${headlineMatch[1].trim()}"`);
    if (taglineMatch) console.log(`   → Tagline: "${taglineMatch[1].trim()}"`);
    if (bodyMatch) console.log(`   → Body: "${bodyMatch[1].trim().substring(0, 50)}..."`);
    if (visualMatch) console.log(`   → Visual: "${visualMatch[1].trim().substring(0, 50)}..."`);
    if (impactMatch) console.log(`   → Impact: "${impactMatch[1].trim().substring(0, 50)}..."`);
    if (craftMatch) console.log(`   → Craft: "${craftMatch[1].trim().substring(0, 50)}..."`);
    console.log("═══════════════════════════\n");
  }
  
  return {
    headline: headlineMatch ? headlineMatch[1].trim() : 'No headline found',
    tagline: taglineMatch ? taglineMatch[1].trim() : 'No tagline found',
    bodyCopy: bodyMatch ? bodyMatch[1].trim() : 'No body copy found',
    visualConcept: visualMatch ? visualMatch[1].trim() : 'No visual concept found',
    strategicImpact: impactMatch ? impactMatch[1].trim() : 'No strategic impact found',
    rhetoricalCraft: craftMatch ? craftMatch[1].trim() : 'No rhetorical craft found'
  };
}

function parseJSONContent(content: string) {
  try {
    const parsed = JSON.parse(content);
    return {
      headline: parsed.headline || 'No headline found',
      tagline: parsed.tagline || 'No tagline found',
      bodyCopy: parsed.bodyCopy || 'No body copy found',
      visualConcept: parsed.visualConcept || 'No visual concept found',
      strategicImpact: parsed.strategicImpact || 'No strategic impact found',
      rhetoricalCraft: Array.isArray(parsed.rhetoricalCraft) 
        ? parsed.rhetoricalCraft.map((item: any) => `• ${item.device}: ${item.explanation}`).join('\n')
        : (parsed.rhetoricalCraft || 'No rhetorical craft found')
    };
  } catch (error) {
    console.log("Failed to parse JSON, using raw content");
    return parseRawContent(content);
  }
}

function parseRawContent(content: string) {
  // Try to extract content from raw text format
  const lines = content.split('\n');
  let headline = 'No headline found';
  let tagline = 'No tagline found';
  let bodyCopy = 'No body copy found';
  let visualConcept = 'No visual concept found';
  let strategicImpact = 'No strategic impact found';
  let rhetoricalCraft = 'No rhetorical craft found';
  
  // Extract actual content from the response
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('Headline:') || line.includes('HEADLINE:')) {
      headline = lines[i + 1]?.trim() || headline;
    } else if (line.includes('Tagline:') || line.includes('TAGLINE:')) {
      tagline = lines[i + 1]?.trim() || tagline;
    } else if (line.includes('Body Copy:') || line.includes('BODY COPY:')) {
      bodyCopy = lines[i + 1]?.trim() || bodyCopy;
    } else if (line.includes('Visual Concept:') || line.includes('VISUAL CONCEPT:')) {
      visualConcept = lines[i + 1]?.trim() || visualConcept;
    } else if (line.includes('Strategic Impact:') || line.includes('STRATEGIC IMPACT:')) {
      strategicImpact = lines[i + 1]?.trim() || strategicImpact;
    }
  }
  
  return {
    headline,
    tagline,
    bodyCopy,
    visualConcept,
    strategicImpact,
    rhetoricalCraft
  };
}

async function exportSingleConceptToGoogleDoc() {
  console.log("🔍 Fetching most recent concept from Supabase...");

  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  // Fetch the most recent concept
  const { data: concepts, error } = await supabase
    .from('concept_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error("❌ Error fetching concept:", error);
    return;
  }

  if (!concepts || concepts.length === 0) {
    console.error("❌ No concepts found in database");
    return;
  }

  const concept = concepts[0] as ConceptEntry;
  console.log(`✅ Found most recent concept: ID ${concept.id}`);
  console.log(`📝 Prompt: ${concept.prompt.substring(0, 50)}...`);
  console.log(`🎨 Tone: ${concept.tone}`);
  console.log(`📄 Response preview: ${concept.response.substring(0, 200)}...`);

  // Parse the concept content
  let parsed;
  if (formatOptions.contentFormat === 'markdown' || isMarkdownFormat(concept.response)) {
    console.log("🔍 Using Markdown format");
    parsed = parseMarkdownContent(concept.response, formatOptions);
  } else {
    console.log("🔍 Using JSON format");
    parsed = parseJSONContent(concept.response);
  }
  
  // Apply content processing
  if (formatOptions.sanitizeContent) {
    parsed.headline = sanitizeContent(parsed.headline, formatOptions);
    parsed.tagline = sanitizeContent(parsed.tagline, formatOptions);
    parsed.bodyCopy = sanitizeContent(parsed.bodyCopy, formatOptions);
    parsed.visualConcept = sanitizeContent(parsed.visualConcept, formatOptions);
    parsed.strategicImpact = sanitizeContent(parsed.strategicImpact, formatOptions);
    parsed.rhetoricalCraft = sanitizeContent(parsed.rhetoricalCraft, formatOptions);
  }
  
  // Check for duplicates
  parsed = deduplicateContent(parsed, formatOptions);
  
  // Validate fields in strict mode
  parsed = validateStrictFields(parsed, formatOptions);
  
  // Apply formatting options
  parsed.headline = formatTextByCase(parsed.headline, formatOptions.headlinesCase);
  parsed.bodyCopy = formatBodyText(parsed.bodyCopy, formatOptions);
  parsed.rhetoricalCraft = formatBulletText(parsed.rhetoricalCraft, formatOptions);

  console.log(`📊 Parsed headline: ${parsed.headline}`);
  console.log(`📊 Parsed tagline: ${parsed.tagline}`);

  // Initialize Google APIs
  console.log("🔧 Setting up Google Docs API...");
  
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

  // Create document with specified title
  const today = new Date().toLocaleDateString();
  const title = `Concept Forge - Live Data Export ${today}`;
  
  console.log(`📄 Creating Google Doc: "${title}"`);
  
  const createRes = await docs.documents.create({
    requestBody: { title }
  });
  const docId = createRes.data.documentId!;

  // Share with dustinyork15@gmail.com
  console.log("🔗 Sharing document with dustinyork15@gmail.com...");
  
  await drive.permissions.create({
    fileId: docId,
    requestBody: {
      type: "user",
      role: "writer",
      emailAddress: "dustinyork15@gmail.com",
    },
    sendNotificationEmail: false,
  });

  // Prepare section headers with formatting
  const sectionHeaders = {
    prompt: formatTextByCase("Prompt:", formatOptions.sectionLabelsCase),
    tone: formatTextByCase("Tone:", formatOptions.sectionLabelsCase),
    bodyCopy: formatTextByCase("Body Copy:", formatOptions.sectionLabelsCase),
    visualConcept: formatTextByCase("Visual Concept:", formatOptions.sectionLabelsCase),
    strategicImpact: formatTextByCase("Strategic Impact:", formatOptions.sectionLabelsCase),
    rhetoricalCraft: formatTextByCase("Rhetorical Craft:", formatOptions.sectionLabelsCase)
  };

  // Build content with proper spacing
  const spacing = formatOptions.cleanSpacing ? "\n" : "\n\n";
  const content = `${parsed.headline}

${parsed.tagline}

${sectionHeaders.prompt} ${concept.prompt}${spacing}${sectionHeaders.tone} ${concept.tone}

${sectionHeaders.bodyCopy}
${parsed.bodyCopy}

${sectionHeaders.visualConcept}
${parsed.visualConcept}

${sectionHeaders.strategicImpact}
${parsed.strategicImpact}

${sectionHeaders.rhetoricalCraft}
${parsed.rhetoricalCraft.replace(/- \*\*/g, '• ').replace(/\*\*/g, '')}`;

  console.log("✍️ Inserting content into document...");

  // Insert content
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content
          }
        }
      ]
    }
  });

  // Build formatting requests
  const formatRequests = [];
  let currentIndex = 1;

  // Apply headline style
  if (formatOptions.headlineStyle === 'Title') {
    formatRequests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + parsed.headline.length
        },
        paragraphStyle: {
          namedStyleType: 'TITLE'
        },
        fields: 'namedStyleType'
      }
    });
  } else if (formatOptions.headlineStyle === 'Heading1') {
    formatRequests.push({
      updateParagraphStyle: {
        range: {
          startIndex: currentIndex,
          endIndex: currentIndex + parsed.headline.length
        },
        paragraphStyle: {
          namedStyleType: 'HEADING_1'
        },
        fields: 'namedStyleType'
      }
    });
  }

  // Make tagline italic
  const taglineStart = currentIndex + parsed.headline.length + 2;
  formatRequests.push({
    updateTextStyle: {
      range: {
        startIndex: taglineStart,
        endIndex: taglineStart + parsed.tagline.length
      },
      textStyle: {
        italic: true
      },
      fields: 'italic'
    }
  });

  // Bold headers if requested
  if (formatOptions.boldHeaders) {
    const headerPositions = [
      { text: sectionHeaders.prompt, offset: content.indexOf(sectionHeaders.prompt) },
      { text: sectionHeaders.tone, offset: content.indexOf(sectionHeaders.tone) },
      { text: sectionHeaders.bodyCopy, offset: content.indexOf(sectionHeaders.bodyCopy) },
      { text: sectionHeaders.visualConcept, offset: content.indexOf(sectionHeaders.visualConcept) },
      { text: sectionHeaders.strategicImpact, offset: content.indexOf(sectionHeaders.strategicImpact) },
      { text: sectionHeaders.rhetoricalCraft, offset: content.indexOf(sectionHeaders.rhetoricalCraft) }
    ];

    headerPositions.forEach(({ text, offset }) => {
      if (offset !== -1) {
        formatRequests.push({
          updateTextStyle: {
            range: {
              startIndex: currentIndex + offset,
              endIndex: currentIndex + offset + text.length
            },
            textStyle: {
              bold: true
            },
            fields: 'bold'
          }
        });
      }
    });
  }

  // Set font to Arial for entire document
  formatRequests.push({
    updateTextStyle: {
      range: {
        startIndex: 1,
        endIndex: content.length + 1
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
  });

  // Set line spacing
  const lineSpacing = formatOptions.cleanSpacing ? 120 : 140;
  formatRequests.push({
    updateParagraphStyle: {
      range: {
        startIndex: 1,
        endIndex: content.length + 1
      },
      paragraphStyle: {
        lineSpacing: lineSpacing
      },
      fields: 'lineSpacing'
    }
  });

  // Apply all formatting
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: formatRequests
    }
  });

  const url = `https://docs.google.com/document/d/${docId}/edit`;
  
  console.log("✅ Export completed successfully!");
  console.log(`🌐 Google Doc URL: ${url}`);
  console.log("📧 Document shared with: dustinyork15@gmail.com");
  console.log("\n🎯 Advanced formatting applied:");
  console.log(`  ✓ Headlines: ${formatOptions.headlinesCase} case with ${formatOptions.headlineStyle} style`);
  console.log(`  ✓ Section labels: ${formatOptions.sectionLabelsCase} case${formatOptions.boldHeaders ? ' (bold)' : ''}`);
  console.log(`  ✓ Body text: ${formatOptions.bodyCase} case${formatOptions.singleParagraphBody ? ' (single paragraph)' : ''}`);
  console.log("  ✓ Taglines italicized");
  console.log(`  ✓ Bullets: ${formatOptions.enableHangingBullets ? 'hanging indent' : 'standard'}`);
  console.log(`  ✓ Spacing: ${formatOptions.cleanSpacing ? 'compact' : 'standard'}`);
  console.log(`  ✓ Content: ${formatOptions.sanitizeContent ? 'sanitized' : 'raw'}`);
  console.log(`  ✓ Sections: ${formatOptions.deduplicateSections ? 'deduplicated' : 'standard'}`);
  console.log(`  ✓ Validation: ${formatOptions.strictFieldMode ? 'strict field validation' : 'standard'}`);
  console.log("  ✓ Arial font at 11pt");
  console.log(`  ✓ Line spacing ${formatOptions.cleanSpacing ? '1.2x' : '1.4x'}`);
  
  return url;
}

exportSingleConceptToGoogleDoc().catch(console.error);