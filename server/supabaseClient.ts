import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Supabase credentials missing, logging will be disabled');
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
      console.log('🔄 Used examples table cleared - reset cycle completed');
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
    console.log('Supabase not configured, skipping log');
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

      console.log(`🔄 Attempting to log session to Supabase (attempt ${currentRetry + 1})...`);
      
      const { data, error } = await supabase
        .from('concept_logs')
        .insert([insertData])
        .select();

      if (error) {
        console.error(`Supabase logging error (attempt ${currentRetry + 1}):`, error);
        
        if (currentRetry < maxRetries) {
          currentRetry++;
          console.log(`🔄 Retrying in 1 second... (${currentRetry}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        } else {
          console.error('❌ Failed to log to Supabase after all retries');
          return null;
        }
      }

      console.log('✅ Session logged to Supabase successfully');
      return (data as any)?.[0]?.id || null;
    } catch (error) {
      console.error(`Failed to log session (attempt ${currentRetry + 1}):`, error);
      
      if (currentRetry < maxRetries) {
        currentRetry++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      } else {
        console.error('❌ Failed to log to Supabase after all retries');
        return null;
      }
    }
  }

  return null;
}

// New function to retrieve all concepts from Supabase
export async function getAllConceptsFromSupabase(): Promise<any[]> {
  if (!supabase) {
    console.log('Supabase not configured');
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

    console.log(`📚 Found ${data?.length || 0} historical entries in database`);
    return data || [];
  } catch (error) {
    console.error('Error in getAllConceptsFromSupabase:', error);
    return [];
  }
}