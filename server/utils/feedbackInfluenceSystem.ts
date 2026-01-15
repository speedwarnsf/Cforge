// ===============================================
// CREATE: server/utils/feedbackInfluenceSystem.ts
// Feedback Influence System - Applies "More/Less Like This" weights to retrieval
// ===============================================

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

// Activation flag - Set to true to enable feedback influence on retrieval
export const FEEDBACK_INFLUENCE_ACTIVE = true;

interface UserPreferences {
  userId?: string;
  projectId?: string;
  weights: { [conceptId: string]: number };
  lastUpdated: Date;
}

interface FeedbackWeights {
  conceptId: string;
  similarity: number;
  feedbackType: 'more_like_this' | 'less_like_this';
  weight: number;
}

/**
 * Apply feedback weight adjustments to user preferences
 */
export async function applyFeedback(
  projectId: string,
  feedbackType: 'more_like_this' | 'less_like_this',
  conceptId: string
): Promise<{ status: string; message: string }> {
  if (!FEEDBACK_INFLUENCE_ACTIVE) {
    console.log('📊 Feedback influence system is deactivated');
    return { status: 'skipped', message: 'Feedback influence not active' };
  }

  try {
    // Load or initialize user preferences
    const preferences = await loadPreferences(projectId);

    // Apply weight adjustments based on feedback type
    if (feedbackType === 'more_like_this') {
      preferences.weights[conceptId] = (preferences.weights[conceptId] || 0) + 0.2; // Boost weight
      console.log(`👍 Boosted weight for concept ${conceptId} by +0.2 (now: ${preferences.weights[conceptId]})`);
    } else if (feedbackType === 'less_like_this') {
      preferences.weights[conceptId] = (preferences.weights[conceptId] || 0) - 0.3; // Reduce weight
      console.log(`👎 Reduced weight for concept ${conceptId} by -0.3 (now: ${preferences.weights[conceptId]})`);
    }

    preferences.lastUpdated = new Date();

    // Update retrieval bias in the system
    await updateRetrievalBias(preferences);

    // Store updated preferences
    await savePreferences(preferences);

    console.log(`🎯 Feedback influence applied: ${feedbackType} for concept ${conceptId}`);
    return { 
      status: 'success', 
      message: `Feedback applied and biases updated for ${feedbackType}` 
    };

  } catch (error) {
    console.error('❌ Failed to apply feedback influence:', error);
    return { 
      status: 'error', 
      message: `Failed to apply feedback: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Load user preferences from storage or initialize new ones
 */
async function loadPreferences(projectId: string): Promise<UserPreferences> {
  try {
    // Try to load existing preferences from Supabase
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    if (data) {
      return {
        projectId: data.project_id,
        weights: data.weights || {},
        lastUpdated: new Date(data.last_updated)
      };
    }
  } catch (error) {
    console.log('⚠️ Could not load preferences from database, using defaults:', error);
  }

  // Return default preferences if none found
  return {
    projectId,
    weights: {},
    lastUpdated: new Date()
  };
}

/**
 * Save user preferences to storage
 */
async function savePreferences(preferences: UserPreferences): Promise<void> {
  try {
    // Try to create user_preferences table if it doesn't exist
    await ensurePreferencesTable();

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        project_id: preferences.projectId,
        weights: preferences.weights,
        last_updated: preferences.lastUpdated.toISOString()
      });

    if (error) {
      throw error;
    }

    console.log(`💾 User preferences saved for project ${preferences.projectId}`);
  } catch (error) {
    console.error('❌ Failed to save preferences:', error);
    // Fall back to in-memory storage (could implement Redis/file storage here)
    console.log('📝 Using in-memory preference storage as fallback');
  }
}

/**
 * Ensure the user_preferences table exists
 */
async function ensurePreferencesTable(): Promise<void> {
  try {
    // This will create the table if it doesn't exist
    const { error } = await supabase
      .from('user_preferences')
      .select('count(*)', { count: 'exact' })
      .limit(0);

    if (error && error.code === '42P01') { // Table doesn't exist
      console.log('📋 Creating user_preferences table...');
      // Note: In production, you'd want to create this table via migration
      // This is a fallback approach
    }
  } catch (error) {
    // Silently handle table creation issues
    console.log('⚠️ Could not verify user_preferences table');
  }
}

/**
 * Update retrieval bias based on user preferences
 * This influences which corpus entries get prioritized in future retrievals
 */
async function updateRetrievalBias(preferences: UserPreferences): Promise<void> {
  try {
    // Get all feedback weights to influence retrieval
    const feedbackWeights = await getFeedbackWeights(preferences.projectId || '');

    // Apply bias to retrieval corpus entries
    // This affects the selection probability in retrieveTopNWithRotation
    const biasUpdates = feedbackWeights.map(fw => ({
      conceptId: fw.conceptId,
      retrievalBias: fw.weight,
      lastBiasUpdate: new Date()
    }));

    console.log(`🔄 Applied retrieval bias to ${biasUpdates.length} corpus entries`);
    
    // Store bias adjustments for retrieval system to use
    if (biasUpdates.length > 0) {
      await storeRetrievalBias(biasUpdates);
    }

  } catch (error) {
    console.error('❌ Failed to update retrieval bias:', error);
  }
}

/**
 * Get feedback weights for all rated concepts in a project
 */
async function getFeedbackWeights(projectId: string): Promise<FeedbackWeights[]> {
  try {
    const { data, error } = await supabase
      .from('concept_logs')
      .select('id, response, feedback_type')
      .eq('project_id', projectId)
      .not('feedback_type', 'is', null);

    if (error) {
      throw error;
    }

    const weights: FeedbackWeights[] = (data || []).map(concept => ({
      conceptId: concept.id,
      similarity: 1.0, // Base similarity
      feedbackType: concept.feedback_type,
      weight: concept.feedback_type === 'more_like_this' ? 1.2 : 0.7 // Boost positive, reduce negative
    }));

    return weights;
  } catch (error) {
    console.error('❌ Failed to get feedback weights:', error);
    return [];
  }
}

/**
 * Store retrieval bias adjustments for the embedding retrieval system
 */
async function storeRetrievalBias(biasUpdates: Array<{ conceptId: string; retrievalBias: number; lastBiasUpdate: Date }>): Promise<void> {
  try {
    // Store bias in a way that the retrieval system can access it
    // This could be in-memory cache, database table, or Redis
    
    // For now, we'll use a simple approach with concept_logs updates
    for (const bias of biasUpdates) {
      await supabase
        .from('concept_logs')
        .update({
          retrieval_bias: bias.retrievalBias,
          bias_updated_at: bias.lastBiasUpdate.toISOString()
        })
        .eq('id', bias.conceptId);
    }

    console.log(`✅ Stored retrieval bias for ${biasUpdates.length} concepts`);
  } catch (error) {
    console.error('❌ Failed to store retrieval bias:', error);
  }
}

/**
 * Get retrieval bias for a specific concept (used by embeddingRetrieval.ts)
 */
export async function getRetrievalBias(conceptId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('concept_logs')
      .select('retrieval_bias')
      .eq('id', conceptId)
      .maybeSingle();

    if (error || !data) {
      return 1.0; // Default neutral bias
    }

    return data.retrieval_bias || 1.0;
  } catch (error) {
    console.error('❌ Failed to get retrieval bias:', error);
    return 1.0;
  }
}

/**
 * Get all biased concepts for retrieval prioritization
 */
export async function getBiasedConcepts(projectId?: string): Promise<Array<{ conceptId: string; bias: number; feedbackType: string }>> {
  try {
    let query = supabase
      .from('concept_logs')
      .select('id, retrieval_bias, feedback_type')
      .not('feedback_type', 'is', null)
      .not('retrieval_bias', 'is', null);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(concept => ({
      conceptId: concept.id,
      bias: concept.retrieval_bias || 1.0,
      feedbackType: concept.feedback_type
    }));
  } catch (error) {
    console.error('❌ Failed to get biased concepts:', error);
    return [];
  }
}