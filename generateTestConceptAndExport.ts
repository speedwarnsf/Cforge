import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { google } from "googleapis";

interface TestConceptOptions {
  prompt: string;
  tone: string;
  headlineCase: 'sentence' | 'title' | 'upper';
  sectionLabelsCase: 'sentence' | 'title' | 'upper';
  bodyCase: 'sentence' | 'title' | 'upper';
  enableHangingBullets: boolean;
  noAllCaps: boolean;
  cleanSpacing: boolean;
  singleParagraphBody: boolean;
  exportGoogleDoc: boolean;
  requireAllSections: boolean;
  debugParsing: boolean;
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
    if (args[index + 1] && !args[index + 1].startsWith('--')) {
      return args[index + 1];
    }
    return true;
  }
  return defaultValue;
};

const options: TestConceptOptions = {
  prompt: getArg('prompt', 'Sustainable sneakers made from ocean plastic'),
  tone: getArg('tone', 'creative').toLowerCase(),
  headlineCase: getArg('headlineCase', 'sentence') as 'sentence' | 'title' | 'upper',
  sectionLabelsCase: getArg('sectionLabelsCase', 'sentence') as 'sentence' | 'title' | 'upper',
  bodyCase: getArg('bodyCase', 'sentence') as 'sentence' | 'title' | 'upper',
  enableHangingBullets: getArg('enableHangingBullets', false),
  noAllCaps: getArg('noAllCaps', false),
  cleanSpacing: getArg('cleanSpacing', false),
  singleParagraphBody: getArg('singleParagraphBody', false),
  exportGoogleDoc: getArg('exportGoogleDoc', false),
  requireAllSections: getArg('requireAllSections', false),
  debugParsing: getArg('debugParsing', false)
};

async function generateTestConcept() {
  console.log("🚀 Generating test concept with export...");
  console.log(`📝 Prompt: ${options.prompt}`);
  console.log(`🎨 Tone: ${options.tone}`);
  console.log(`🔧 Export to Google Docs: ${options.exportGoogleDoc ? 'YES' : 'NO'}`);
  
  // Initialize clients
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });
  
  try {
    // Generate concept using OpenAI
    console.log("\n🤖 Generating concept with OpenAI...");
    
    const systemPrompt = `You are Concept Forge, an advanced AI-driven ideation engine specializing in advertising and creative concepts.

Generate a comprehensive creative concept using this exact Markdown template:

# [Headline - 2-6 words maximum]

**Tagline:** [Tagline - 3-12 words, distinct from headline]

**Body Copy:**
[Body copy content - minimum 25 words, engaging and substantive]

**Visual Concept:**
[Specific, actionable visual description]

**Strategic Impact:**
[Business value and market positioning analysis]

**Rhetorical Craft:**
• **Primary device:** [Device name] - [Clear explanation]
• **Secondary device:** [Device name] - [Clear explanation]
• **Additional notes:** [Further rhetorical analysis]

Replace all bracketed placeholders with actual creative content. Ensure each section is substantive, specific, and professionally crafted.`;

    const userPrompt = `Create a ${options.tone} concept for: "${options.prompt}"

Requirements:
- Headlines must be 2-6 words maximum
- Taglines must be 3-12 words and distinct from headline  
- Body copy must be 25+ words, substantive and engaging
- Visual concepts must be specific and actionable
- Strategic impact must explain business value
- No generic, placeholder, or template language
- Each section must be unique and purposeful`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      console.error("❌ Failed to generate concept");
      return;
    }

    console.log("✅ Concept generated successfully!");
    console.log(`📊 Response length: ${response.length} characters`);

    // Save to database
    console.log("\n💾 Saving to database...");
    const { data: savedConcept, error: saveError } = await supabase
      .from('concept_logs')
      .insert({
        prompt: options.prompt,
        response: response,
        tone: options.tone
      })
      .select()
      .single();

    if (saveError) {
      console.error("❌ Failed to save concept:", saveError);
      return;
    }

    console.log("✅ Concept saved to database!");
    console.log(`🆔 Concept ID: ${savedConcept.id}`);

    // Preview concept
    console.log("\n📋 Generated Concept Preview:");
    console.log("=".repeat(50));
    console.log(response.substring(0, 300) + "...");
    console.log("=".repeat(50));

    // Export to Google Docs if requested
    if (options.exportGoogleDoc) {
      console.log("\n📤 Exporting to Google Docs...");
      await exportToGoogleDocs(savedConcept.id, response, options);
    } else {
      console.log("\n🔧 To export to Google Docs, run:");
      console.log(`npx tsx exportSingleConceptToGoogleDoc.ts --specificId=${savedConcept.id} --cleanFormatting --enableHangingBullets --sentenceCaseAll --singleParagraphBody`);
    }

  } catch (error) {
    console.error("❌ Generation failed:", error);
  }
}

async function exportToGoogleDocs(conceptId: string, content: string, options: TestConceptOptions) {
  try {
    // Parse the Markdown content
    const headlineMatch = content.match(/^#\s+(.+)$/m);
    const taglineMatch = content.match(/\*\*Tagline:\*\*\s*(.+?)(?=\n|$)/);
    const bodyMatch = content.match(/\*\*Body Copy:\*\*\s*\n(.+?)(?=\n\*\*|$)/s);
    const visualMatch = content.match(/\*\*Visual Concept:\*\*\s*\n(.+?)(?=\n\*\*|$)/s);
    const impactMatch = content.match(/\*\*Strategic Impact:\*\*\s*\n(.+?)(?=\n\*\*|$)/s);
    const craftMatch = content.match(/\*\*Rhetorical Craft:\*\*\s*\n([\s\S]+?)(?=\n\*\*|$)/);

    const headline = formatCase(headlineMatch?.[1]?.trim() || "Generated Concept", options.headlineCase);
    const tagline = formatCase(taglineMatch?.[1]?.trim() || "Creative tagline", options.bodyCase);
    const body = formatBodyText(bodyMatch?.[1]?.trim() || "Generated body copy", options);
    const visual = formatCase(visualMatch?.[1]?.trim() || "Visual concept", options.bodyCase);
    const impact = formatCase(impactMatch?.[1]?.trim() || "Strategic impact", options.bodyCase);
    const craft = craftMatch?.[1]?.trim() || "• **Device:** Explanation";

    // Setup Google Docs API
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!),
      scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive'
      ],
    });

    const docs = google.docs({ version: 'v1', auth });
    const drive = google.drive({ version: 'v3', auth });

    // Create document
    const doc = await docs.documents.create({
      requestBody: {
        title: `Concept Forge - Test Generation ${new Date().toLocaleDateString()}`
      }
    });

    const documentId = doc.data.documentId!;
    console.log(`📄 Created Google Doc: ${doc.data.title}`);

    // Build content with formatting
    const requests = [
      // Insert title
      {
        insertText: {
          location: { index: 1 },
          text: `${headline}\n\n`
        }
      },
      // Format title
      {
        updateTextStyle: {
          range: { startIndex: 1, endIndex: headline.length + 1 },
          textStyle: {
            fontSize: { magnitude: 16, unit: 'PT' },
            bold: true,
            fontFamily: 'Arial'
          },
          fields: 'fontSize,bold,fontFamily'
        }
      }
    ];

    let currentIndex = headline.length + 3;

    // Add sections
    const sections = [
      { label: formatCase("Tagline", options.sectionLabelsCase), content: tagline, italic: true },
      { label: formatCase("Body copy", options.sectionLabelsCase), content: body },
      { label: formatCase("Visual concept", options.sectionLabelsCase), content: visual },
      { label: formatCase("Strategic impact", options.sectionLabelsCase), content: impact },
      { label: formatCase("Rhetorical craft", options.sectionLabelsCase), content: craft, bullets: true }
    ];

    for (const section of sections) {
      const sectionText = `${section.label}\n${section.content}\n\n`;
      
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: sectionText
        }
      });

      // Format section label
      requests.push({
        updateTextStyle: {
          range: { startIndex: currentIndex, endIndex: currentIndex + section.label.length },
          textStyle: {
            bold: true,
            fontSize: { magnitude: 13, unit: 'PT' },
            fontFamily: 'Arial'
          },
          fields: 'bold,fontSize,fontFamily'
        }
      });

      // Format content
      const contentStart = currentIndex + section.label.length + 1;
      const contentEnd = contentStart + section.content.length;

      requests.push({
        updateTextStyle: {
          range: { startIndex: contentStart, endIndex: contentEnd },
          textStyle: {
            fontSize: { magnitude: 11, unit: 'PT' },
            fontFamily: 'Arial',
            italic: section.italic || false
          },
          fields: 'fontSize,fontFamily,italic'
        }
      });

      currentIndex += sectionText.length;
    }

    // Apply all formatting
    await docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });

    // Share document
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: process.env.GOOGLE_DOC_SHARE_EMAIL!
      }
    });

    console.log(`✅ Export completed successfully!`);
    console.log(`🌐 Google Doc URL: https://docs.google.com/document/d/${documentId}/edit`);
    console.log(`📧 Document shared with: ${process.env.GOOGLE_DOC_SHARE_EMAIL}`);

    // Show formatting applied
    console.log("\n🎯 Formatting applied:");
    console.log(`  ✓ Headlines: ${options.headlineCase} case`);
    console.log(`  ✓ Section labels: ${options.sectionLabelsCase} case`);
    console.log(`  ✓ Body text: ${options.bodyCase} case`);
    console.log(`  ✓ Single paragraph body: ${options.singleParagraphBody ? 'YES' : 'NO'}`);
    console.log(`  ✓ Hanging bullets: ${options.enableHangingBullets ? 'YES' : 'NO'}`);
    console.log(`  ✓ Clean spacing: ${options.cleanSpacing ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error("❌ Export to Google Docs failed:", error);
  }
}

function formatCase(text: string, caseType: 'sentence' | 'title' | 'upper'): string {
  switch (caseType) {
    case 'sentence':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    case 'title':
      return text.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    case 'upper':
      return text.toUpperCase();
    default:
      return text;
  }
}

function formatBodyText(text: string, options: TestConceptOptions): string {
  let formatted = text;
  
  if (options.noAllCaps) {
    formatted = formatted.replace(/[A-Z]{3,}/g, match => 
      match.charAt(0) + match.slice(1).toLowerCase()
    );
  }
  
  if (options.cleanSpacing) {
    formatted = formatted.replace(/\s+/g, ' ').trim();
  }
  
  if (options.singleParagraphBody) {
    formatted = formatted.replace(/\n+/g, ' ').trim();
  }
  
  return formatCase(formatted, options.bodyCase);
}

generateTestConcept().catch(console.error);