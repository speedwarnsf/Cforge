import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  //console.log('Supabase credentials missing, logging will be disabled');
}

// Create client with auth config to bypass RLS for service operations
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    })
  : null;

export interface ConceptLog {
  id?: string;
  user_id: string | null;
  prompt: string;
  response: string;
  tone: string;
  created_at?: string;
  is_favorite?: boolean;
  iteration_type?: 'original' | 'reforge_headline' | 'reforge_tagline' | 'reforge_body' | 'reforge_full';
  parent_concept_id?: string;
  originality_confidence?: number;
  deep_scan_used?: boolean;
}

// Used examples management
export async function getUsedExamples(): Promise<string[]> {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('used_examples')
      .select('example_id');
    
    if (error) {
      console.error('Error fetching used examples:', error);
      return [];
    }
    
    return data?.map(item => item.example_id) || [];
  } catch (error) {
    console.error('Error in getUsedExamples:', error);
    return [];
  }
}

export async function markExampleAsUsed(exampleId: string): Promise<void> {
  if (!supabase || !exampleId) return;
  
  try {
    const { error } = await supabase
      .from('used_examples')
      .insert({ example_id: exampleId });
    
    if (error) {
      console.error('Error marking example as used:', error);
    }
  } catch (error) {
    console.error('Error in markExampleAsUsed:', error);
  }
}

export async function clearUsedExamples(): Promise<void> {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('used_examples')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows
    
    if (error) {
      console.error('Error clearing used examples:', error);
    } else {
      //console.log('🔄 Used examples table cleared - reset cycle completed');
    }
  } catch (error) {
    console.error('Error in clearUsedExamples:', error);
  }
}

// Rhetorical device usage management
export async function getRhetoricalDeviceUsage(): Promise<{[device: string]: number}> {
  if (!supabase) return {};
  
  try {
    const { data, error } = await supabase
      .from('rhetorical_device_usage')
      .select('device_name, usage_count');
    
    if (error) {
      console.error('Error fetching device usage:', error);
      return {};
    }
    
    const usage: {[device: string]: number} = {};
    data?.forEach(item => {
      usage[item.device_name] = item.usage_count;
    });
    
    return usage;
  } catch (error) {
    console.error('Error in getRhetoricalDeviceUsage:', error);
    return {};
  }
}

export async function updateRhetoricalDeviceUsage(deviceName: string): Promise<void> {
  if (!supabase || !deviceName) return;
  
  try {
    // First try to increment existing record
    const { data: existing } = await supabase
      .from('rhetorical_device_usage')
      .select('usage_count')
      .eq('device_name', deviceName)
      .single();
    
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('rhetorical_device_usage')
        .update({ 
          usage_count: existing.usage_count + 1,
          last_used: new Date().toISOString()
        })
        .eq('device_name', deviceName);
      
      if (error) {
        console.error('Error updating device usage:', error);
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('rhetorical_device_usage')
        .insert({ 
          device_name: deviceName,
          usage_count: 1,
          last_used: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error inserting device usage:', error);
      }
    }
  } catch (error) {
    console.error('Error in updateRhetoricalDeviceUsage:', error);
  }
}

export async function logSession({ 
  userId, 
  prompt, 
  response, 
  tone, 
  iterationType = 'original',
  parentConceptId = null,
  originalityConfidence = null,
}: {
  userId: string | null;
  prompt: string;
  response: string;
  tone: string;
  iterationType?: 'original' | 'reforge_headline' | 'reforge_tagline' | 'reforge_body' | 'reforge_full';
  parentConceptId?: string | null;
  originalityConfidence?: number | null;
}): Promise<string | null> {
  if (!supabase) {
    //console.log('Supabase not configured, skipping log');
    return null;
  }

  // Retry logic for failed inserts
  const maxRetries = 2;
  let currentRetry = 0;

  while (currentRetry <= maxRetries) {
    try {
      // Use minimal schema that matches the actual table
      const insertData = { 
        user_id: userId || 'guest',
        prompt: prompt.substring(0, 2000),
        response: response.substring(0, 8000),
        tone,
        created_at: new Date().toISOString()
      };

      //console.log(`🔄 Attempting to log session to Supabase (attempt ${currentRetry + 1})...`);
      
      const { data, error } = await supabase
        .from('concept_logs')
        .insert([insertData])
        .select();

      if (error) {
        console.error(`Supabase logging error (attempt ${currentRetry + 1}):`, error);
        
        if (currentRetry < maxRetries) {
          currentRetry++;
          //console.log(`🔄 Retrying in 1 second... (${currentRetry}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        } else {
          console.error('Failed to log to Supabase after all retries');
          return null;
        }
      }

      //console.log('Session logged to Supabase successfully');
      return (data as any)?.[0]?.id || null;
    } catch (error) {
      console.error(`Failed to log session (attempt ${currentRetry + 1}):`, error);
      
      if (currentRetry < maxRetries) {
        currentRetry++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      } else {
        console.error('Failed to log to Supabase after all retries');
        return null;
      }
    }
  }

  return null;
}

// New function to retrieve all concepts from Supabase
export async function getAllConceptsFromSupabase(): Promise<any[]> {
  if (!supabase) {
    //console.log('Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('concept_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching concepts from Supabase:', error);
      return [];
    }

    //console.log(`📚 Found ${data?.length || 0} historical entries in database`);
    return data || [];
  } catch (error) {
    console.error('Error in getAllConceptsFromSupabase:', error);
    return [];
  }
}

// ============================================
// CREATIVE BRIEFS MANAGEMENT
// ============================================

export interface CreativeBrief {
  id?: string;
  user_id: string | null;
  name: string | null;           // Optional name for starred/named briefs
  query: string;                  // The creative brief text
  tone: string;
  concept_count: number;
  hybrid_config?: any;            // JSON for additional settings
  is_starred: boolean;
  last_used_at: string;
  created_at?: string;
  times_used: number;
}

/**
 * Save a creative brief (auto-save on generation)
 * If a similar brief exists (same query), update it instead of creating new
 */
export async function saveCreativeBrief(brief: Omit<CreativeBrief, 'id' | 'created_at'>): Promise<string | null> {
  if (!supabase) {
    //console.log('Supabase not configured, skipping brief save');
    return null;
  }

  try {
    // Check if a brief with the same query already exists
    const { data: existing } = await supabase
      .from('creative_briefs')
      .select('id, times_used')
      .eq('query', brief.query)
      .single();

    if (existing) {
      // Update existing brief
      const { data, error } = await supabase
        .from('creative_briefs')
        .update({
          tone: brief.tone,
          concept_count: brief.concept_count,
          hybrid_config: brief.hybrid_config,
          last_used_at: new Date().toISOString(),
          times_used: (existing.times_used || 0) + 1
        })
        .eq('id', existing.id)
        .select();

      if (error) {
        console.error('Error updating creative brief:', error);
        return null;
      }

      //console.log('Updated existing creative brief');
      return existing.id;
    } else {
      // Insert new brief
      const { data, error } = await supabase
        .from('creative_briefs')
        .insert([{
          user_id: brief.user_id || 'guest',
          name: brief.name,
          query: brief.query.substring(0, 5000),
          tone: brief.tone,
          concept_count: brief.concept_count,
          hybrid_config: brief.hybrid_config,
          is_starred: brief.is_starred || false,
          last_used_at: new Date().toISOString(),
          times_used: 1
        }])
        .select();

      if (error) {
        console.error('Error saving creative brief:', error);
        return null;
      }

      //console.log('Saved new creative brief');
      return (data as any)?.[0]?.id || null;
    }
  } catch (error) {
    console.error('Error in saveCreativeBrief:', error);
    return null;
  }
}

/**
 * Get all creative briefs, sorted by last used
 */
export async function getCreativeBriefs(options?: {
  limit?: number;
  starredOnly?: boolean;
}): Promise<CreativeBrief[]> {
  if (!supabase) {
    //console.log('Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('creative_briefs')
      .select('*')
      .order('last_used_at', { ascending: false });

    if (options?.starredOnly) {
      query = query.eq('is_starred', true);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching creative briefs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getCreativeBriefs:', error);
    return [];
  }
}

/**
 * Update brief name (for naming favorites)
 */
export async function updateBriefName(briefId: string, name: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('creative_briefs')
      .update({ name })
      .eq('id', briefId);

    if (error) {
      console.error('Error updating brief name:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateBriefName:', error);
    return false;
  }
}

/**
 * Toggle brief starred status
 */
export async function toggleBriefStarred(briefId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    // Get current status
    const { data: current } = await supabase
      .from('creative_briefs')
      .select('is_starred')
      .eq('id', briefId)
      .single();

    if (!current) return false;

    // Toggle it
    const { error } = await supabase
      .from('creative_briefs')
      .update({ is_starred: !current.is_starred })
      .eq('id', briefId);

    if (error) {
      console.error('Error toggling brief starred:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in toggleBriefStarred:', error);
    return false;
  }
}

/**
 * Delete a creative brief
 */
export async function deleteCreativeBrief(briefId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('creative_briefs')
      .delete()
      .eq('id', briefId);

    if (error) {
      console.error('Error deleting creative brief:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteCreativeBrief:', error);
    return false;
  }
}