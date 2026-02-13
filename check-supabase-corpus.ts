/**
 * Check Supabase for original corpus data
 */

import { supabase } from './server/supabaseClient.js';

async function checkSupabaseCorpus() {
  console.log('🔍 CHECKING SUPABASE FOR ORIGINAL CORPUS DATA');
  console.log('============================================');
  
  try {
    // Check if retrieval_corpus table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%corpus%');
    
    if (tablesError) {
      console.log('Error checking tables:', tablesError);
    } else {
      console.log('Corpus-related tables:', tables);
    }
    
    // Try to fetch from retrieval_corpus table if it exists
    const { data: corpusData, error: corpusError } = await supabase
      .from('retrieval_corpus')
      .select('*');
    
    if (corpusError) {
      console.log('Error fetching corpus data:', corpusError.message);
      if (corpusError.code === '42P01') {
        console.log('retrieval_corpus table does not exist in Supabase');
      }
    } else if (corpusData) {
      console.log(`📚 Found ${corpusData.length} entries in Supabase retrieval_corpus table!`);
      
      if (corpusData.length === 60) {
        console.log('EXACT MATCH: Found original 60 examples in Supabase!');
        console.log('First 3 entries:');
        corpusData.slice(0, 3).forEach((entry: any, i: number) => {
          console.log(`  ${i+1}. ${entry.campaign} - ${entry.brand} (${entry.year})`);
        });
        
        // Save to local file
        const fs = require('fs');
        fs.writeFileSync('data/retrieval-corpus-from-supabase.json', JSON.stringify(corpusData, null, 2));
        console.log('Saved Supabase corpus to data/retrieval-corpus-from-supabase.json');
      } else {
        console.log('📊 Supabase corpus contains different number of entries');
        console.log('Sample entries:');
        corpusData.slice(0, 3).forEach((entry: any, i: number) => {
          console.log(`  ${i+1}. ${entry.campaign} - ${entry.brand} (${entry.year})`);
        });
      }
    }
    
  } catch (error) {
    console.log('Error checking Supabase:', error);
  }
}

checkSupabaseCorpus();