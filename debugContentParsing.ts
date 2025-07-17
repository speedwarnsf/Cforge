import { createClient } from "@supabase/supabase-js";

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

const conceptId = getArg('conceptId');

interface ConceptEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  is_favorite?: boolean;
}

function clean(text: string = ""): string {
  return text
    .replace(/\*\*/g, '')           // Remove markdown bold
    .replace(/\*/g, '')             // Remove markdown italic
    .replace(/^\s+|\s+$/g, '')      // Trim whitespace
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim();
}

function isMarkdownFormat(content: string): boolean {
  const markdownPatterns = [
    /\*\*HEADLINE:\*\*/i,
    /\*\*TAGLINE:\*\*/i,
    /\*\*BODY COPY:\*\*/i,
    /\*\*VISUAL CONCEPT:\*\*/i
  ];
  return markdownPatterns.some(pattern => pattern.test(content));
}

function parseMarkdownContent(content: string) {
  console.log("🔍 PARSING MARKDOWN FORMAT");
  console.log("Raw content length:", content.length);
  console.log("First 200 chars:", content.substring(0, 200));
  
  const sections = {
    headline: "",
    tagline: "",
    bodyCopy: "",
    visualConcept: "",
    rhetoricalCraft: [],
    strategicImpact: ""
  };

  // Extract headline
  const headlineMatch = content.match(/\*\*HEADLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  if (headlineMatch) {
    sections.headline = clean(headlineMatch[1]);
    console.log("✅ Headline extracted:", sections.headline);
  } else {
    console.log("❌ No headline found");
  }

  // Extract tagline
  const taglineMatch = content.match(/\*\*TAGLINE:\*\*\s*(.*?)(?=\*\*|$)/i);
  if (taglineMatch) {
    sections.tagline = clean(taglineMatch[1]);
    console.log("✅ Tagline extracted:", sections.tagline);
  } else {
    console.log("❌ No tagline found");
  }

  // Extract body copy
  const bodyMatch = content.match(/\*\*BODY COPY:\*\*\s*(.*?)(?=\*\*|$)/i);
  if (bodyMatch) {
    sections.bodyCopy = clean(bodyMatch[1]);
    console.log("✅ Body copy extracted:", sections.bodyCopy.substring(0, 100) + "...");
  } else {
    console.log("❌ No body copy found");
  }

  // Extract visual concept
  const visualMatch = content.match(/\*\*VISUAL CONCEPT:\*\*\s*(.*?)(?=\*\*|$)/i);
  if (visualMatch) {
    sections.visualConcept = clean(visualMatch[1]);
    console.log("✅ Visual concept extracted:", sections.visualConcept.substring(0, 100) + "...");
  } else {
    console.log("❌ No visual concept found");
  }

  // Extract rhetorical craft - handle both "RHETORICAL CRAFT:" and "RHETORICAL CRAFT BREAKDOWN:"
  const rhetoricalMatch = content.match(/\*\*RHETORICAL CRAFT(?:\s+BREAKDOWN)?:\*\*\s*(.*?)(?=\*\*|$)/is);
  if (rhetoricalMatch) {
    const rhetoricalText = clean(rhetoricalMatch[1]);
    console.log("✅ Rhetorical craft extracted:", rhetoricalText.substring(0, 100) + "...");
    sections.rhetoricalCraft = [rhetoricalText];
  } else {
    console.log("❌ No rhetorical craft found");
  }

  // Extract strategic impact
  const strategicMatch = content.match(/\*\*STRATEGIC IMPACT:\*\*\s*(.*?)(?=\*\*|$)/is);
  if (strategicMatch) {
    sections.strategicImpact = clean(strategicMatch[1]);
    console.log("✅ Strategic impact extracted:", sections.strategicImpact.substring(0, 100) + "...");
  } else {
    console.log("❌ No strategic impact found");
  }

  return sections;
}

function analyzeRawContent(content: string) {
  console.log("\n📊 RAW CONTENT ANALYSIS");
  console.log("════════════════════════");
  console.log("Total length:", content.length);
  console.log("Has markdown bold (**)?", content.includes('**'));
  console.log("Has HEADLINE?", content.includes('HEADLINE'));
  console.log("Has TAGLINE?", content.includes('TAGLINE'));
  console.log("Has BODY COPY?", content.includes('BODY COPY'));
  console.log("Has VISUAL CONCEPT?", content.includes('VISUAL CONCEPT'));
  console.log("Has RHETORICAL CRAFT?", content.includes('RHETORICAL CRAFT'));
  console.log("Has STRATEGIC IMPACT?", content.includes('STRATEGIC IMPACT'));
  
  // Show all section headers found
  const headers = content.match(/\*\*[A-Z\s]+:\*\*/g);
  console.log("Section headers found:", headers);
  
  // Show line breaks and structure
  const lines = content.split('\n');
  console.log("Number of lines:", lines.length);
  console.log("First 10 lines:");
  lines.slice(0, 10).forEach((line, i) => {
    console.log(`  ${i + 1}: "${line}"`);
  });
}

async function debugContentParsing() {
  if (!conceptId) {
    console.log("❌ Please provide --conceptId parameter");
    return;
  }

  console.log(`🔍 Debug: Analyzing content parsing for concept ID: ${conceptId}\n`);

  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  );

  try {
    // Fetch the specific concept
    const { data: concept, error } = await supabase
      .from('concept_logs')
      .select('*')
      .eq('id', conceptId)
      .single();

    if (error) {
      console.log("❌ Error fetching concept:", error);
      return;
    }

    if (!concept) {
      console.log("❌ No concept found with that ID");
      return;
    }

    console.log("✅ Concept found!");
    console.log("📋 Basic Info:");
    console.log("  ID:", concept.id);
    console.log("  Prompt:", concept.prompt?.substring(0, 50) + "...");
    console.log("  Tone:", concept.tone);
    console.log("  Created:", concept.created_at);
    console.log("  Response length:", concept.response?.length || 0);

    if (!concept.response) {
      console.log("❌ No response content to analyze");
      return;
    }

    // Analyze the raw content
    analyzeRawContent(concept.response);

    // Check format and parse
    console.log("\n🔍 FORMAT DETECTION");
    console.log("═══════════════════");
    const isMarkdown = isMarkdownFormat(concept.response);
    console.log("Detected format:", isMarkdown ? "Markdown" : "Plain text");

    if (isMarkdown) {
      console.log("\n📝 MARKDOWN PARSING RESULTS");
      console.log("═══════════════════════════");
      const parsed = parseMarkdownContent(concept.response);
      
      console.log("\n📊 FINAL PARSED SECTIONS:");
      console.log("  Headline:", parsed.headline || "(empty)");
      console.log("  Tagline:", parsed.tagline || "(empty)");
      console.log("  Body Copy:", parsed.bodyCopy ? parsed.bodyCopy.substring(0, 100) + "..." : "(empty)");
      console.log("  Visual Concept:", parsed.visualConcept ? parsed.visualConcept.substring(0, 100) + "..." : "(empty)");
      console.log("  Rhetorical Craft:", parsed.rhetoricalCraft.length > 0 ? "Found" : "(empty)");
      console.log("  Strategic Impact:", parsed.strategicImpact ? parsed.strategicImpact.substring(0, 100) + "..." : "(empty)");
    } else {
      console.log("❌ Content is not in expected Markdown format");
    }

  } catch (error) {
    console.log("❌ Error:", error);
  }
}

// Run the debug
debugContentParsing().catch(console.error);