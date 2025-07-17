import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { generateMultivariantPrompt } from './server/utils/openAiPromptHelper';
import { exportAllHistoryToGoogleDoc } from './exportAllHistoryToGoogleDoc-markdown';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function testCompleteMarkdownSystem() {
  console.log("🚀 Testing Complete Markdown System");
  console.log("=".repeat(60));
  
  try {
    // Step 1: Generate a concept using the new Markdown format
    console.log("📝 Step 1: Generating concept with new Markdown format...");
    
    const prompt = generateMultivariantPrompt({
      rhetoricalDevice: "metaphor",
      secondRhetoricalDevice: "hyperbole",
      userQuery: "Eco-friendly coffee pods that dissolve completely",
      tone: "conversational",
      avoidCliches: true,
      rhetoricalExample: null,
      salvagedFragments: []
    });
    
    console.log("Generated prompt preview (first 200 chars):");
    console.log(prompt.substring(0, 200) + "...");
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 1.0,
      max_tokens: 800,
    });
    
    const markdownContent = response.choices[0]?.message?.content || "";
    console.log("\n✅ Generated Markdown content:");
    console.log("-".repeat(40));
    console.log(markdownContent);
    console.log("-".repeat(40));
    
    // Step 2: Save to Supabase
    console.log("\n💾 Step 2: Saving to Supabase...");
    
    const { data: insertData, error: insertError } = await supabase
      .from('concept_logs')
      .insert({
        prompt: "Eco-friendly coffee pods that dissolve completely",
        response: markdownContent,
        tone: "conversational",
        iteration_type: 'original',
        parent_concept_id: null,
        originality_confidence: 85
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Supabase insert error:", insertError);
    } else {
      console.log(`✅ Saved to Supabase with ID: ${insertData.id}`);
    }
    
    // Step 3: Test parsing logic
    console.log("\n🔍 Step 3: Testing parsing logic...");
    
    function parseMarkdownContent(content: string) {
      const sections: any = {};
      
      // Extract headline from # header
      const headlineMatch = content.match(/^#\s+(.+)$/m);
      sections.headline = headlineMatch ? headlineMatch[1] : "";
      
      // Extract tagline
      const taglineMatch = content.match(/\*\*Tagline:\*\*\s*(.+?)(?=\n\*\*|$)/s);
      sections.tagline = taglineMatch ? taglineMatch[1].trim() : "";
      
      // Extract body copy
      const bodyMatch = content.match(/\*\*Body Copy:\*\*\s*(.+?)(?=\n\*\*|$)/s);
      sections.bodyCopy = bodyMatch ? bodyMatch[1].trim() : "";
      
      // Extract visual concept
      const visualMatch = content.match(/\*\*Visual Concept:\*\*\s*(.+?)(?=\n\*\*|$)/s);
      sections.visualConcept = visualMatch ? visualMatch[1].trim() : "";
      
      return sections;
    }
    
    const parsed = parseMarkdownContent(markdownContent);
    console.log("Parsed sections:");
    console.log(`- Headline: "${parsed.headline}"`);
    console.log(`- Tagline: "${parsed.tagline}"`);
    console.log(`- Body Copy: "${parsed.bodyCopy?.substring(0, 50)}..."`);
    console.log(`- Visual: "${parsed.visualConcept?.substring(0, 50)}..."`);
    
    // Step 4: Test export functionality
    console.log("\n📄 Step 4: Testing Google Docs export...");
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GOOGLE_DOC_SHARE_EMAIL) {
      console.log("🔐 Google credentials found, running export...");
      await exportAllHistoryToGoogleDoc();
      console.log("✅ Export completed successfully!");
    } else {
      console.log("⚠️ Google credentials not found, skipping export test");
      console.log("Required: GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DOC_SHARE_EMAIL");
    }
    
    console.log("\n🎉 Complete Markdown System Test PASSED!");
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

// Run the test
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  testCompleteMarkdownSystem()
    .then(() => process.exit(0))
    .catch(error => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}

export { testCompleteMarkdownSystem };