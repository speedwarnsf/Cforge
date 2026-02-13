#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';

async function retrieveAllHistoricalConcepts() {
  try {
    console.log('🔍 Connecting to Supabase database...');
    
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📊 Fetching all historical concepts...');
    
    // First check if table exists and has data
    const { count } = await supabase
      .from('concept_logs')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Database contains ${count || 0} total records`);
    
    const { data, error } = await supabase
      .from('concept_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database error:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log(' No concepts found in database');
      return [];
    }
    
    console.log(`Retrieved ${data.length} concepts from database`);
    
    // Convert to consistent format
    const formattedConcepts = data.map(row => ({
      id: row.id || `db-${row.created_at}`,
      prompt: row.prompt || 'Unknown prompt',
      content: row.response || row.ai_response || row.content || '{}',
      tone: row.tone || 'unknown',
      timestamp: row.created_at || new Date().toISOString(),
      isFavorite: row.is_favorite || false,
      enhanced: row.enhanced || false
    }));
    
    console.log('\n📋 Sample concepts found:');
    formattedConcepts.slice(0, 3).forEach((concept, index) => {
      console.log(`${index + 1}. "${concept.prompt}" (${concept.tone}) - ${new Date(concept.timestamp).toLocaleDateString()}`);
    });
    
    return formattedConcepts;
    
  } catch (error) {
    console.error('Failed to retrieve concepts:', error);
    return [];
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  retrieveAllHistoricalConcepts().then(concepts => {
    console.log(`\nTotal concepts retrieved: ${concepts.length}`);
  });
}

export { retrieveAllHistoricalConcepts };