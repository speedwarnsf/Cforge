import { createClient } from "@supabase/supabase-js";

interface ConceptEntry {
  id: string;
  prompt: string;
  response: string;
  tone: string;
  created_at: string;
  is_favorite?: boolean;
}

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const index = args.findIndex(arg => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (index !== -1) {
    const arg = args[index];
    if (arg.includes('=')) {
      return arg.split('=')[1];
    }
    if (args[index + 1] && !args[index + 1].startsWith('--')) {
      return args[index + 1];
    }
  }
  return undefined;
};

const conceptId = getArg('conceptId');

if (!conceptId) {
  console.log("Usage: npx tsx debugSingleConceptFetch.ts --conceptId=<id>");
  console.log("Example: npx tsx debugSingleConceptFetch.ts --conceptId=1");
  process.exit(1);
}

async function debugSingleConceptFetch() {
  console.log(`🔍 Debug: Fetching concept with ID: ${conceptId}`);
  
  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // First, let's see all available concepts to understand the ID structure
    console.log("\n📊 Fetching all concepts to understand ID structure...");
    const { data: allConcepts, error: allError } = await supabase
      .from('concept_logs')
      .select('id, prompt, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allError) {
      console.error("Error fetching all concepts:", allError);
    } else {
      console.log(`Found ${allConcepts?.length} recent concepts:`);
      allConcepts?.forEach((concept, index) => {
        console.log(`  ${index + 1}. ID: ${concept.id}`);
        console.log(`     Prompt: ${concept.prompt.substring(0, 50)}...`);
        console.log(`     Created: ${concept.created_at}`);
        console.log("");
      });
    }
    
    // Now try to fetch the specific concept by ID
    console.log(`\nAttempting to fetch concept ID: ${conceptId}`);
    
    const { data: specificConcept, error: specificError } = await supabase
      .from('concept_logs')
      .select('*')
      .eq('id', conceptId)
      .single();
    
    if (specificError) {
      console.error("Error fetching specific concept:", specificError);
      
      // Try different ID formats
      console.log("\n🔄 Trying alternative ID formats...");
      
      // Try as integer if it's a number
      if (!isNaN(Number(conceptId))) {
        console.log(`Trying as row number (LIMIT 1 OFFSET ${Number(conceptId) - 1})...`);
        const { data: byOffset, error: offsetError } = await supabase
          .from('concept_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .range(Number(conceptId) - 1, Number(conceptId) - 1);
        
        if (offsetError) {
          console.error("Error fetching by offset:", offsetError);
        } else if (byOffset && byOffset.length > 0) {
          console.log("Found concept by offset!");
          displayConceptDetails(byOffset[0]);
          return;
        }
      }
      
      // Try searching by partial ID match
      console.log(`🔍 Searching for IDs containing "${conceptId}"...`);
      const { data: partialMatch, error: partialError } = await supabase
        .from('concept_logs')
        .select('*')
        .ilike('id', `%${conceptId}%`)
        .limit(5);
      
      if (partialError) {
        console.error("Error with partial search:", partialError);
      } else if (partialMatch && partialMatch.length > 0) {
        console.log(`Found ${partialMatch.length} partial matches:`);
        partialMatch.forEach((concept, index) => {
          console.log(`\n${index + 1}. Concept Details:`);
          displayConceptDetails(concept);
        });
      } else {
        console.log("No concepts found with partial ID match");
      }
      
    } else if (specificConcept) {
      console.log("Successfully found specific concept!");
      displayConceptDetails(specificConcept);
    }
    
  } catch (error) {
    console.error("Unexpected error:", error);
  }
}

function displayConceptDetails(concept: any) {
  console.log("📋 Concept Details:");
  console.log(`  ID: ${concept.id}`);
  console.log(`  Prompt: ${concept.prompt}`);
  console.log(`  Tone: ${concept.tone}`);
  console.log(`  Created: ${concept.created_at}`);
  console.log(`  Favorite: ${concept.is_favorite || false}`);
  console.log(`  Response Length: ${concept.response?.length || 0} characters`);
  
  if (concept.response) {
    console.log("\nResponse Preview:");
    console.log(concept.response.substring(0, 300) + "...");
    
    // Analyze response format
    if (concept.response.includes('# ') && concept.response.includes('**')) {
      console.log("Format: Markdown detected");
    } else if (concept.response.includes('{') && concept.response.includes('}')) {
      console.log("Format: JSON detected");
    } else {
      console.log("Format: Plain text detected");
    }
  }
}

debugSingleConceptFetch().catch(console.error);