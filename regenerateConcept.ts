import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

interface ConceptEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  is_favorite?: boolean;
}

interface RegenerateOptions {
  conceptId: string;
  forceCleanFields: boolean;
  preservePrompt: boolean;
  newTone?: string;
  outputFormat: 'markdown' | 'json';
  requireAllSections: boolean;
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

const options: RegenerateOptions = {
  conceptId: getArg('conceptId'),
  forceCleanFields: getArg('forceCleanFields', false),
  preservePrompt: getArg('preservePrompt', true),
  newTone: getArg('newTone'),
  outputFormat: getArg('outputFormat', 'markdown') as 'markdown' | 'json',
  requireAllSections: getArg('requireAllSections', false)
};

if (!options.conceptId) {
  console.log("Usage: npx tsx regenerateConcept.ts --conceptId=<id> [options]");
  console.log("Options:");
  console.log("  --forceCleanFields     Regenerate with clean field validation");
  console.log("  --preservePrompt       Keep original prompt (default: true)");
  console.log("  --newTone=<tone>       Use different tone (creative, analytical, etc.)");
  console.log("  --outputFormat=<fmt>   Output format: markdown or json (default: markdown)");
  console.log("  --requireAllSections   Ensure all required sections are present");
  process.exit(1);
}

function createMarkdownTemplate(): string {
  return `# [Headline]

**Tagline:** [Tagline]

**Body Copy:**
[Body copy content]

**Visual Concept:**
[Visual concept description]

**Strategic Impact:**
[Strategic impact analysis]

**Rhetorical Craft:**
• **Primary device:** [Device] - [Explanation]
• **Secondary device:** [Device] - [Explanation]
• **Additional notes:** [Additional rhetorical analysis]`;
}

function buildPrompt(originalPrompt: string, tone: string, forceCleanFields: boolean, requireAllSections: boolean): string {
  const basePrompt = `You are Concept Forge, an advanced AI-driven ideation engine specializing in advertising and creative concepts.

TASK: Generate a comprehensive creative concept for the following brief:

"${originalPrompt}"

TONE: ${tone}

${forceCleanFields ? `
STRICT REQUIREMENTS:
- Headlines must be 2-6 words maximum
- Taglines must be 3-12 words and distinct from headline
- Body copy must be 25+ words, substantive and engaging
- Visual concepts must be specific and actionable
- Strategic impact must explain business value
- No generic, placeholder, or "generated" language
- Each section must be unique and purposeful
` : ''}

${requireAllSections ? `
ALL SECTIONS REQUIRED:
- Every section in the template must be completed
- No section can be left empty or with placeholder text
- All content must be original and specific to this brief
- Rhetorical craft must include at least 2 specific devices with explanations
` : ''}

Use this exact Markdown template:

${createMarkdownTemplate()}

Replace all bracketed placeholders with actual creative content. Ensure each section is substantive, specific, and professionally crafted.`;

  return basePrompt;
}

async function regenerateConcept() {
  console.log(`🔄 Regenerating concept: ${options.conceptId}`);
  console.log(`🔧 Clean fields mode: ${options.forceCleanFields ? 'ENABLED' : 'disabled'}`);
  
  // Initialize clients
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });
  
  try {
    // Fetch original concept
    console.log("📥 Fetching original concept...");
    const { data: originalConcept, error: fetchError } = await supabase
      .from('concept_logs')
      .select('*')
      .eq('id', options.conceptId)
      .single();
    
    if (fetchError || !originalConcept) {
      console.error("Failed to fetch original concept:", fetchError);
      return;
    }
    
    console.log("Original concept retrieved:");
    console.log(`  Prompt: ${originalConcept.prompt}`);
    console.log(`  Tone: ${originalConcept.tone}`);
    console.log(`  Created: ${originalConcept.created_at}`);
    
    // Determine regeneration parameters
    const prompt = options.preservePrompt ? originalConcept.prompt : options.conceptId;
    const tone = options.newTone || originalConcept.tone;
    
    console.log("\n🤖 Generating new concept with OpenAI...");
    console.log(`  Using prompt: ${prompt.substring(0, 50)}...`);
    console.log(`  Using tone: ${tone}`);
    
    // Generate new concept with timeout protection
    const aiPrompt = buildPrompt(prompt, tone, options.forceCleanFields, options.requireAllSections);
    
    console.log("🔄 Calling OpenAI API...");
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system", 
            content: "You are a master creative strategist and copywriter. Generate professional advertising concepts with precise, engaging content."
          },
          {
            role: "user",
            content: aiPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 800
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API call timeout')), 30000)
      )
    ]) as any;
    
    const newResponse = completion.choices[0]?.message?.content;
    
    if (!newResponse) {
      console.error("Failed to generate new concept");
      return;
    }
    
    console.log("New concept generated successfully!");
    console.log(`📊 Response length: ${newResponse.length} characters`);
    
    // Validate clean fields if requested
    if (options.forceCleanFields) {
      console.log("\nValidating clean fields...");
      validateCleanFields(newResponse);
    }
    
    // Save regenerated concept
    console.log("\n💾 Saving regenerated concept to database...");
    const { data: savedConcept, error: saveError } = await supabase
      .from('concept_logs')
      .insert({
        prompt: prompt,
        response: newResponse,
        tone: tone,
        enhanced: true,
        feedback_type: 'regenerated',
        project_name: `Regenerated from ${options.conceptId.substring(0, 8)}`
      })
      .select()
      .single();
    
    if (saveError) {
      console.error("Failed to save regenerated concept:", saveError);
    } else {
      console.log("Regenerated concept saved successfully!");
      console.log(`🆔 New concept ID: ${savedConcept.id}`);
    }
    
    // Display comparison
    console.log("\n📊 Concept Comparison:");
    console.log("=".repeat(50));
    console.log("ORIGINAL:");
    console.log(originalConcept.response.substring(0, 200) + "...");
    console.log("\nREGENERATED:");
    console.log(newResponse.substring(0, 200) + "...");
    console.log("=".repeat(50));
    
    // Export options
    console.log("\n🔧 Export Commands:");
    console.log(`Export original: npx tsx exportSingleConceptToGoogleDoc.ts --specificId=${originalConcept.id}`);
    console.log(`Export regenerated: npx tsx exportSingleConceptToGoogleDoc.ts --specificId=${savedConcept?.id}`);
    
  } catch (error) {
    console.error("Regeneration failed:", error);
  }
}

function validateCleanFields(content: string) {
  const headlineMatch = content.match(/^#\s+(.+)$/m);
  const taglineMatch = content.match(/\*\*Tagline:\*\*\s*(.+?)(?=\n|$)/);
  const bodyMatch = content.match(/\*\*Body Copy:\*\*\s*\n(.+?)(?=\n\*\*|$)/s);
  
  if (headlineMatch) {
    const headline = headlineMatch[1].trim();
    const wordCount = headline.split(/\s+/).length;
    console.log(`  Headline: "${headline}" (${wordCount} words) ${wordCount >= 2 && wordCount <= 6 ? '' : ''}`);
  }
  
  if (taglineMatch) {
    const tagline = taglineMatch[1].trim();
    const wordCount = tagline.split(/\s+/).length;
    console.log(`  Tagline: "${tagline}" (${wordCount} words) ${wordCount >= 3 && wordCount <= 12 ? '' : ''}`);
  }
  
  if (bodyMatch) {
    const body = bodyMatch[1].trim();
    const wordCount = body.split(/\s+/).length;
    console.log(`  Body Copy: ${wordCount} words ${wordCount >= 25 ? '' : ''}`);
  }
  
  // Check for placeholder text
  const placeholders = ['[Headline]', '[Tagline]', '[Body', 'generated', 'placeholder'];
  const hasPlaceholders = placeholders.some(p => content.toLowerCase().includes(p.toLowerCase()));
  console.log(`  Clean content: ${hasPlaceholders ? 'Contains placeholders' : 'No placeholders detected'}`);
}

regenerateConcept().catch(console.error);