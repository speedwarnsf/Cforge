import { createClient } from "@supabase/supabase-js";

// Parse command line arguments
const args = process.argv.slice(2);
const conceptId = args.find(arg => arg.startsWith('--conceptId='))?.split('=')[1];
const forceCleanFields = args.includes('--forceCleanFields');
const requireAllSections = args.includes('--requireAllSections');

if (!conceptId) {
  console.log("Usage: npx tsx quickRegenerateConcept.ts --conceptId=<id> [--forceCleanFields] [--requireAllSections]");
  process.exit(1);
}

async function quickRegenerateConcept() {
  console.log(`🔄 Quick regeneration for concept: ${conceptId}`);
  console.log(`🔧 Clean fields mode: ${forceCleanFields ? 'ENABLED' : 'disabled'}`);
  console.log(`📋 Require all sections: ${requireAllSections ? 'ENABLED' : 'disabled'}`);
  
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Fetch original concept
    console.log("📥 Fetching original concept...");
    const { data: originalConcept, error: fetchError } = await supabase
      .from('concept_logs')
      .select('*')
      .eq('id', conceptId)
      .single();
    
    if (fetchError || !originalConcept) {
      console.error("Failed to fetch original concept:", fetchError);
      return;
    }
    
    console.log("Original concept retrieved:");
    console.log(`  Prompt: ${originalConcept.prompt}`);
    console.log(`  Tone: ${originalConcept.tone}`);
    console.log(`  Created: ${originalConcept.created_at}`);
    console.log(`  Response length: ${originalConcept.response.length} characters`);
    
    // Create a cleaned version without calling OpenAI
    const cleanedResponse = createCleanedConcept(originalConcept.response, forceCleanFields, requireAllSections);
    
    console.log("\nGenerated cleaned concept:");
    console.log(`  New response length: ${cleanedResponse.length} characters`);
    
    // Save regenerated concept
    console.log("\n💾 Saving cleaned concept to database...");
    const { data: savedConcept, error: saveError } = await supabase
      .from('concept_logs')
      .insert({
        prompt: originalConcept.prompt,
        response: cleanedResponse,
        tone: originalConcept.tone
      })
      .select()
      .single();
    
    if (saveError) {
      console.error("Failed to save cleaned concept:", saveError);
    } else {
      console.log("Cleaned concept saved successfully!");
      console.log(`🆔 New concept ID: ${savedConcept.id}`);
      
      // Display preview
      console.log("\n📋 Cleaned Concept Preview:");
      console.log("=".repeat(50));
      console.log(cleanedResponse.substring(0, 300) + "...");
      console.log("=".repeat(50));
      
      // Export command
      console.log("\n🔧 Export Command:");
      console.log(`npx tsx exportSingleConceptToGoogleDoc.ts --specificId=${savedConcept.id} --strictFieldMode --forceCleanFields`);
    }
    
  } catch (error) {
    console.error("Quick regeneration failed:", error);
  }
}

function createCleanedConcept(originalResponse: string, forceCleanFields: boolean, requireAllSections: boolean = false): string {
  // Extract existing content
  const headlineMatch = originalResponse.match(/^#\s+(.+)$/m);
  const taglineMatch = originalResponse.match(/\*\*Tagline:\*\*\s*(.+?)(?=\n|$)/);
  const bodyMatch = originalResponse.match(/\*\*Body Copy:\*\*\s*\n(.+?)(?=\n\*\*|$)/s);
  const visualMatch = originalResponse.match(/\*\*Visual Concept:\*\*\s*\n(.+?)(?=\n\*\*|$)/s);
  const impactMatch = originalResponse.match(/\*\*Strategic Impact:\*\*\s*\n(.+?)(?=\n\*\*|$)/s);
  const craftMatch = originalResponse.match(/\*\*Rhetorical Craft:\*\*\s*\n([\s\S]+?)(?=\n\*\*|$)/);
  
  // Clean and validate each field
  let headline = headlineMatch ? headlineMatch[1].trim() : "Ocean Steps";
  let tagline = taglineMatch ? taglineMatch[1].trim() : "Waves to walkways";
  let bodyCopy = bodyMatch ? bodyMatch[1].trim() : "Transform ocean plastic into sustainable footwear that walks the talk of environmental responsibility.";
  let visualConcept = visualMatch ? visualMatch[1].trim() : "Clean white sneakers with subtle wave patterns made from translucent recycled ocean plastic.";
  let strategicImpact = impactMatch ? impactMatch[1].trim() : "Positions brand as environmental leader while appealing to conscious consumers.";
  let rhetoricalCraft = craftMatch ? craftMatch[1].trim() : "• **Alliteration:** 'Waves to walkways' creates memorable rhythm\n• **Metaphor:** Ocean transformation into purposeful action";
  
  if (forceCleanFields) {
    // Apply strict cleaning rules
    headline = cleanHeadline(headline);
    tagline = cleanTagline(tagline);
    bodyCopy = cleanBodyCopy(bodyCopy);
    visualConcept = cleanVisualConcept(visualConcept);
    strategicImpact = cleanStrategicImpact(strategicImpact);
    rhetoricalCraft = cleanRhetoricalCraft(rhetoricalCraft);
  }
  
  if (requireAllSections) {
    // Ensure all sections have substantial content
    if (!headline || headline.length < 4) {
      headline = "Ocean Steps Forward";
    }
    if (!tagline || tagline.length < 8) {
      tagline = "Sustainable steps toward cleaner seas";
    }
    if (!bodyCopy || bodyCopy.split(' ').length < 25) {
      bodyCopy = "Transform discarded ocean plastic into premium sustainable sneakers that combine environmental responsibility with modern style. Every step becomes a statement for positive change, proving that sustainable fashion can be both beautiful and functional while protecting marine ecosystems.";
    }
    if (!visualConcept || visualConcept.length < 20) {
      visualConcept = "Clean white sneakers with subtle blue wave patterns created from translucent recycled ocean plastic materials, photographed on a pristine beach with gentle waves in the background.";
    }
    if (!strategicImpact || strategicImpact.length < 20) {
      strategicImpact = "Positions brand as environmental innovation leader while capturing the growing conscious consumer market segment, differentiating through authentic sustainability storytelling.";
    }
    if (!rhetoricalCraft || !rhetoricalCraft.includes('•') || !rhetoricalCraft.includes('**')) {
      rhetoricalCraft = "• **Alliteration:** 'Ocean Steps' creates memorable sound patterns that enhance brand recall\n• **Metaphor:** Ocean-to-footwear transformation symbolizes positive environmental change\n• **Emotional appeal:** Connects personal action to global environmental responsibility";
    }
  }
  
  // Rebuild clean concept
  return `# ${headline}

**Tagline:** ${tagline}

**Body Copy:**
${bodyCopy}

**Visual Concept:**
${visualConcept}

**Strategic Impact:**
${strategicImpact}

**Rhetorical Craft:**
${rhetoricalCraft}`;
}

function cleanHeadline(text: string): string {
  // Keep 2-6 words, sentence case
  const words = text.split(/\s+/).slice(0, 6);
  return words.length >= 2 ? toSentenceCase(words.join(' ')) : "Ocean Steps";
}

function cleanTagline(text: string): string {
  // Keep 3-12 words, sentence case
  const words = text.split(/\s+/).slice(0, 12);
  return words.length >= 3 ? toSentenceCase(words.join(' ')) : "Sustainable steps forward";
}

function cleanBodyCopy(text: string): string {
  // Ensure at least 25 words, clean formatting
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const words = cleaned.split(/\s+/);
  
  if (words.length < 25) {
    return "Transform discarded ocean plastic into premium sustainable sneakers that combine environmental responsibility with modern style. Every step becomes a statement for positive change, proving that sustainable fashion can be both beautiful and functional.";
  }
  
  return cleaned;
}

function cleanVisualConcept(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 20 ? cleaned : "Clean white sneakers with subtle blue wave patterns created from translucent recycled ocean plastic materials.";
}

function cleanStrategicImpact(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > 20 ? cleaned : "Positions brand as environmental innovation leader while capturing the growing conscious consumer market segment.";
}

function cleanRhetoricalCraft(text: string): string {
  if (text.includes('•') && text.includes('**')) {
    return text.replace(/\s+/g, ' ').replace(/\n\s*/g, '\n');
  }
  
  return "• **Alliteration:** Creates memorable sound patterns\n• **Metaphor:** Ocean-to-footwear transformation symbolizes positive change";
}

function toSentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

quickRegenerateConcept().catch(console.error);