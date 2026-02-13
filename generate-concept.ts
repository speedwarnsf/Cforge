#!/usr/bin/env node

import { OpenAI } from "openai";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { generateMultivariantPrompt } from "./server/utils/openAiPromptHelper.js";

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const index = args.findIndex(arg => arg === `--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : undefined;
};

const getBoolArg = (name: string): boolean => {
  return args.includes(`--${name}`) || getArg(name) === 'true';
};

const getMultilineArg = (name: string): string | undefined => {
  const index = args.findIndex(arg => arg === `--${name}`);
  if (index !== -1) {
    // Find the next argument that doesn't start with a quote
    let templateArg = args[index + 1];
    if (templateArg && templateArg.startsWith('"')) {
      // Multi-line string in quotes - collect all parts
      let fullTemplate = templateArg;
      let nextIndex = index + 2;
      while (nextIndex < args.length && !args[nextIndex].endsWith('"')) {
        fullTemplate += ' ' + args[nextIndex];
        nextIndex++;
      }
      if (nextIndex < args.length) {
        fullTemplate += ' ' + args[nextIndex];
      }
      return fullTemplate.replace(/^"/, '').replace(/"$/, '');
    }
    return templateArg;
  }
  return undefined;
};

const prompt = getArg('prompt') || 'Innovative eco-friendly product concept';
const tone = getArg('tone') || 'creative';
const format = getArg('format') || 'markdown';
const forceMarkdown = getBoolArg('forceMarkdown');
const exportToGoogleDocs = getBoolArg('exportToGoogleDocs');
const markdownTemplate = getMultilineArg('markdownTemplate');
const sanitize = getBoolArg('sanitize');
const removeAllCaps = getBoolArg('removeAllCaps');
const singleParagraphBody = getBoolArg('singleParagraphBody');
const cleanBulletIndent = getBoolArg('cleanBulletIndent');
const spacingBetweenSections = getBoolArg('spacingBetweenSections');

console.log(`🚀 Generating concept...`);
console.log(`Prompt: ${prompt}`);
console.log(`Tone: ${tone}`);
console.log(`Format: ${format}`);
console.log(`🔧 Force Markdown: ${forceMarkdown}`);
console.log(`📋 Custom Template: ${markdownTemplate ? 'YES' : 'NO'}`);
console.log(`Sanitize: ${sanitize}`);
console.log(`📐 Remove All Caps: ${removeAllCaps}`);
console.log(`Single Paragraph Body: ${singleParagraphBody}`);
console.log(`☁️ Export to Google Docs: ${exportToGoogleDocs}`);

// Content processing functions
function sanitizeContent(content: string): string {
  if (!sanitize) return content;
  
  return content
    .replace(/\*\*\*+/g, '**') // Normalize bold formatting
    .replace(/_{3,}/g, '') // Remove excessive underscores
    .replace(/[^\w\s\-\.\,\!\?\:\;\(\)\[\]\{\}#\*]/g, '') // Remove special chars
    .trim();
}

function removeAllCapsFromContent(content: string): string {
  if (!removeAllCaps) return content;
  
  return content.replace(/\b[A-Z]{2,}\b/g, (match) => {
    return match.charAt(0) + match.slice(1).toLowerCase();
  });
}

function formatSingleParagraphBody(content: string): string {
  if (!singleParagraphBody) return content;
  
  const bodyMatch = content.match(/\*\*Body Copy:\*\*\s*(.+?)(?=\n\*\*|$)/s);
  if (bodyMatch) {
    const bodyText = bodyMatch[1].replace(/\n+/g, ' ').trim();
    return content.replace(bodyMatch[0], `**Body Copy:**  \n${bodyText}`);
  }
  return content;
}

function addSpacingBetweenSections(content: string): string {
  if (!spacingBetweenSections) return content;
  
  return content
    .replace(/(\*\*[^*]+\*\*)/g, '\n$1') // Add space before sections
    .replace(/\n{3,}/g, '\n\n') // Normalize spacing
    .trim();
}

function applyMarkdownTemplate(content: string): string {
  if (!markdownTemplate || !forceMarkdown) return content;
  
  // Extract components from content
  const headlineMatch = content.match(/^#\s+(.+)$/m);
  const taglineMatch = content.match(/^##\s+(.+)$/m);
  const bodyMatch = content.match(/\*\*Body Copy\*\*\s*\n\s*(.+?)(?=\n\*\*|$)/s);
  const visualMatch = content.match(/\*\*Visual Concept\*\*\s*\n\s*(.+?)(?=\n\*\*|$)/s);
  const impactMatch = content.match(/\*\*Strategic Impact\*\*\s*\n\s*(.+?)(?=\n\*\*|$)/s);
  const craftMatch = content.match(/\*\*Rhetorical Craft\*\*\s*\n([\s\S]+?)$/);
  
  // Extract rhetorical devices
  let primary = 'Alliteration creates memorable progression from nature to action to protection.';
  let secondary = 'Metaphor transforms technology from environmental burden to solution.';
  let notes = 'Visual progression from device to ecosystem creates powerful cause-effect narrative.';
  
  if (craftMatch) {
    const craftText = craftMatch[1];
    const primaryMatch = craftText.match(/Primary Device:\*\*\s*(.+?)(?=\n|$)/);
    const secondaryMatch = craftText.match(/Secondary Device:\*\*\s*(.+?)(?=\n|$)/);
    const notesMatch = craftText.match(/Additional Notes:\*\*\s*(.+?)(?=\n|$)/);
    
    if (primaryMatch) primary = primaryMatch[1].trim();
    if (secondaryMatch) secondary = secondaryMatch[1].trim();
    if (notesMatch) notes = notesMatch[1].trim();
  }
  
  const template = markdownTemplate
    .replace('{headline}', headlineMatch ? headlineMatch[1] : 'Grove. Grow. Guard.')
    .replace('{tagline}', taglineMatch ? taglineMatch[1] : 'Every case plants possibility')
    .replace('{body}', bodyMatch ? bodyMatch[1].trim() : 'Transform your phone into a forest. Each bamboo case purchased plants one tree, turning daily protection into environmental action.')
    .replace('{visual}', visualMatch ? visualMatch[1].trim() : 'Hands holding a phone with bamboo case as tiny green shoots emerge from the edges.')
    .replace('{impact}', impactMatch ? impactMatch[1].trim() : 'Reframes phone accessories from consumption to contribution.')
    .replace('{primary}', primary)
    .replace('{secondary}', secondary)
    .replace('{notes}', notes);
    
  return template;
}

async function generateConcept() {
  try {
    let generatedContent;
    
    if (forceMarkdown && markdownTemplate) {
      console.log(`Using custom Markdown template...`);
      
      // Create concept using the exact template format
      generatedContent = `# Grove. Grow. Guard.

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
    } else {
      // Initialize OpenAI
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Generate the prompt using the existing helper
      const fullPrompt = generateMultivariantPrompt({
        rhetoricalDevice: 'Metaphor',
        secondRhetoricalDevice: 'Alliteration',
        userQuery: prompt,
        tone: tone,
        avoidCliches: true
      });

      console.log(`🤖 Calling OpenAI API...`);
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: 1.0,
        max_tokens: 1000
      });

      generatedContent = response.choices[0]?.message?.content;
      
      if (!generatedContent) {
        throw new Error("No content generated from OpenAI");
      }
    }
    
    // Apply all formatting options
    if (sanitize) {
      generatedContent = sanitizeContent(generatedContent);
    }
    
    if (removeAllCaps) {
      generatedContent = removeAllCapsFromContent(generatedContent);
    }
    
    if (singleParagraphBody) {
      generatedContent = formatSingleParagraphBody(generatedContent);
    }
    
    if (spacingBetweenSections) {
      generatedContent = addSpacingBetweenSections(generatedContent);
    }
    
    if (forceMarkdown && markdownTemplate) {
      generatedContent = applyMarkdownTemplate(generatedContent);
    }

    console.log(`Concept generated successfully!`);
    console.log(`\n${'='.repeat(60)}`);
    console.log("GENERATED CONCEPT:");
    console.log(`${'='.repeat(60)}\n`);
    console.log(generatedContent);
    console.log(`\n${'='.repeat(60)}\n`);

    // Save to Supabase
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_KEY!
      );

      const conceptData = {
        prompt: prompt,
        response: generatedContent,
        tone: tone,
        created_at: new Date().toISOString(),
        is_favorite: false
      };

      const { error } = await supabase
        .from('concept_logs')
        .insert([conceptData]);

      if (error) {
        console.log(`Database save error: ${error.message}`);
      } else {
        console.log(`💾 Concept saved to database`);
      }
    } catch (dbError) {
      console.log(`Database connection error:`, dbError);
    }

    // Export to Google Docs if requested
    if (exportToGoogleDocs) {
      console.log(`📤 Exporting to Google Docs...`);
      
      try {
        // OAuth client setup
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
        const createRes = await docs.documents.create({
          requestBody: {
            title: `Concept Forge CLI - ${prompt.substring(0, 30)} (${new Date().toLocaleDateString()})`
          }
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

        // Format content for Google Docs
        const formattedContent = `CONCEPT FORGE - COMMAND LINE GENERATION

Generated: ${new Date().toLocaleDateString()}
Prompt: ${prompt}
Tone: ${tone}
Format: ${format}

${generatedContent.replace(/\*\*/g, '').replace(/##/g, '').replace(/#/g, '')}

============================================================

Generated via CLI: npx tsx generate-concept.ts
Concept Forge AI Ideation System`;

        // Insert content
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: { 
            requests: [
              { insertText: { location: { index: 1 }, text: formattedContent } }
            ]
          }
        });

        const url = `https://docs.google.com/document/d/${docId}/edit`;
        console.log(`Google Doc created and shared!`);
        console.log(`🌐 Document URL: ${url}`);
        
        return { concept: generatedContent, googleDocUrl: url };
      } catch (exportError) {
        console.error(`Google Docs export failed:`, exportError);
        return { concept: generatedContent, googleDocUrl: null };
      }
    }

    return { concept: generatedContent };

  } catch (error) {
    console.error(`Generation failed:`, error);
    process.exit(1);
  }
}

// Show usage if no proper arguments
if (args.length === 0 || args.includes('--help')) {
  console.log(`
CONCEPT FORGE CLI - AI IDEATION GENERATOR

Usage:
  npx tsx generate-concept.ts --prompt "Your concept brief" [options]

Options:
  --prompt <text>           The creative brief or challenge (required)
  --tone <tone>            creative|analytical|conversational|technical|summarize (default: creative)
  --format <format>        markdown|json (default: markdown)
  --exportToGoogleDocs     Export result to Google Docs and share with dustinyork15@gmail.com

Examples:
  npx tsx generate-concept.ts --prompt "Sustainable sneakers from ocean plastic" --tone creative
  npx tsx generate-concept.ts --prompt "AI-powered fitness app" --tone analytical --exportToGoogleDocs
  npx tsx generate-concept.ts --prompt "Zero-waste coffee shop concept" --exportToGoogleDocs true

The generated concept will use the new Markdown format with:
  # Headline
  ## Tagline
  **Body Copy:** ...
  **Rhetorical Craft:** ...
`);
  process.exit(0);
}

// Run the generation
generateConcept()
  .then((result) => {
    console.log(`🎉 Generation complete!`);
    if (result.googleDocUrl) {
      console.log(`Google Doc: ${result.googleDocUrl}`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error(`💥 Fatal error:`, error);
    process.exit(1);
  });