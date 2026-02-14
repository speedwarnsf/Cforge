import OpenAI from 'openai';
import { supabase } from '../supabaseClient';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SalvagedFragment {
  fragment_type: 'headline' | 'visual' | 'rhetorical_device' | 'tone' | 'phrase' | 'metaphor';
  fragment_text: string;
  rationale: string;
}

interface ConceptForSalvage {
  id: string;
  headline: string;
  visual: string;
  response: string;
  tone: string;
  originality_confidence?: number;
}

/**
 * Analyzes a generated concept and extracts up to 3 promising fragments
 * that could be reused in future generations for creative recombination
 */
export async function salvageConceptFragments(concept: ConceptForSalvage): Promise<void> {
  try {
    console.log(`🔍 Analyzing concept ${concept.id} for salvageable fragments...`);
    
    // Create AI prompt to analyze the concept for salvageable fragments
    const analysisPrompt = `Analyze this advertising concept for promising creative fragments that could inspire future ideas:

CONCEPT TO ANALYZE:
Headline: ${concept.headline}
Visual: ${concept.visual}
Full Response: ${concept.response}
Tone: ${concept.tone}

TASK: Extract up to 3 promising fragments from this concept that show creative potential for future reuse. 

For each fragment, identify:
1. fragment_type: Choose from "headline", "visual", "rhetorical_device", "tone", "phrase", "metaphor"
2. fragment_text: The specific text/phrase (keep under 50 characters)
3. rationale: 1-2 sentences explaining why this fragment shows promise

SALVAGE CRITERIA - A fragment qualifies if it is:
- Highly original or fresh
- Evocative visually or verbally
- Uses a rhetorical device in an innovative way
- Contains a phrase that might inspire stronger future ideas
- Has memorable or distinctive language
- Shows creative potential for other contexts

If no fragments meet these criteria, return an empty array.

Respond in JSON format:
{
  "fragments": [
    {
      "fragment_type": "headline",
      "fragment_text": "example text",
      "rationale": "explanation of promise"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: process.env.GEMINI_API_KEY ? "gemini-2.0-flash" : "gpt-4o", // the newest OpenAI model is "gpt-5.2" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: analysisPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.3 // Lower temperature for consistent analysis
    });

    const analysisResult = JSON.parse(response.choices[0].message.content || '{"fragments": []}');
    const fragments: SalvagedFragment[] = analysisResult.fragments || [];

    if (fragments.length === 0) {
      console.log(`No salvageable fragments found in concept ${concept.id}`);
      return;
    }

    // Store each fragment in the database
    for (const fragment of fragments) {
      try {
        if (!supabase) {
          console.log('Supabase not available, skipping fragment storage');
          continue;
        }
        
        const { error } = await supabase
          .from('salvaged_fragments')
          .insert({
            concept_id: concept.id,
            fragment_type: fragment.fragment_type,
            fragment_text: fragment.fragment_text,
            rationale: fragment.rationale
          });

        if (error) {
          console.error('Error storing salvaged fragment:', error);
        } else {
          console.log(`💎 Salvaged ${fragment.fragment_type}: "${fragment.fragment_text}"`);
        }
      } catch (insertError) {
        console.error('Error inserting fragment:', insertError);
      }
    }

    console.log(`Salvaged ${fragments.length} fragments from concept ${concept.id}`);

  } catch (error) {
    console.error('Error in fragment salvaging:', error);
  }
}

/**
 * Retrieves recent salvaged fragments for potential recombination
 * Filters fragments by compatibility with current tone/topic
 */
export async function getFragmentsForRecombination(currentTone: string, currentTopic: string, limit: number = 10): Promise<SalvagedFragment[]> {
  try {
    console.log(`🔄 Fetching fragments for recombination (tone: ${currentTone}, topic: ${currentTopic})`);
    
    if (!supabase) {
      console.log('Supabase not available, skipping fragment recombination');
      return [];
    }
    
    // Get the most recent fragments
    const { data: fragments, error } = await supabase
      .from('salvaged_fragments')
      .select('fragment_type, fragment_text, rationale, usage_count')
      .order('created_at', { ascending: false })
      .limit(limit * 2); // Get more than needed for filtering

    if (error) {
      console.error('Error fetching fragments:', error);
      return [];
    }

    if (!fragments || fragments.length === 0) {
      console.log('📭 No salvaged fragments available for recombination');
      return [];
    }

    // Simple compatibility filtering - could be enhanced with AI analysis
    const compatibleFragments = fragments.filter(fragment => {
      // Basic keyword matching for topic compatibility
      const topicKeywords = currentTopic.toLowerCase().split(' ');
      const fragmentText = fragment.fragment_text.toLowerCase();
      
      // Check if fragment might be compatible with current context
      const hasTopicOverlap = topicKeywords.some(keyword => 
        fragmentText.includes(keyword) || 
        fragment.rationale.toLowerCase().includes(keyword)
      );
      
      // Prefer less-used fragments for diversity
      const isNotOverused = fragment.usage_count < 3;
      
      return isNotOverused && (hasTopicOverlap || Math.random() > 0.7); // Some randomness for creativity
    });

    // Limit to requested number of fragments
    const selectedFragments = compatibleFragments.slice(0, Math.min(limit, 2));
    
    console.log(`Selected ${selectedFragments.length} compatible fragments for recombination`);
    
    return selectedFragments;

  } catch (error) {
    console.error('Error fetching fragments for recombination:', error);
    return [];
  }
}

/**
 * Updates usage tracking for fragments used in recombination
 */
export async function markFragmentAsUsed(fragmentText: string): Promise<void> {
  try {
    if (!supabase) {
      console.log('Supabase not available, skipping fragment usage tracking');
      return;
    }
    
    // First get current usage count, then increment
    const { data: currentFragment, error: fetchError } = await supabase
      .from('salvaged_fragments')
      .select('usage_count')
      .eq('fragment_text', fragmentText)
      .single();

    if (fetchError) {
      console.error('Error fetching current fragment:', fetchError);
      return;
    }

    const { error } = await supabase
      .from('salvaged_fragments')
      .update({ 
        usage_count: (currentFragment?.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('fragment_text', fragmentText);

    if (error) {
      console.error('Error updating fragment usage:', error);
    } else {
      console.log(`📊 Updated usage tracking for fragment: "${fragmentText}"`);
    }
  } catch (error) {
    console.error('Error marking fragment as used:', error);
  }
}

/**
 * Creates a recombination prompt section that can be appended to generation prompts
 */
export function createRecombinationPrompt(fragments: SalvagedFragment[]): string {
  if (fragments.length === 0) {
    return '';
  }

  const fragmentDescriptions = fragments.map(f => 
    `- ${f.fragment_type.toUpperCase()}: "${f.fragment_text}" (${f.rationale})`
  ).join('\n');

  return `

CREATIVE RECOMBINATION ELEMENTS:
Use these promising fragments as creative inspiration (not literal copying):
${fragmentDescriptions}

Reinterpret, transform, or use these elements as springboards for fresh ideas that maintain your concept's integrity while leveraging proven creative elements.`;
}