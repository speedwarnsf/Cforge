#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';

async function testSupabaseConnection() {
  try {
    console.log('🔗 Testing Supabase connection...');
    
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_KEY!;
    
    console.log(`📡 URL: ${supabaseUrl}`);
    console.log(`🔑 Key: ${supabaseKey.substring(0, 20)}...`);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('concept_logs')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Connection error:', error);
      return false;
    }
    
    console.log('Connection successful!');
    
    // Check table structure
    const { data: tableData, error: tableError } = await supabase
      .from('concept_logs')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Table query error:', tableError);
    } else {
      console.log('Table accessible');
      console.log('📋 Sample record structure:', tableData?.[0] || 'No records found');
    }
    
    // Check record count
    const { count, error: countError } = await supabase
      .from('concept_logs')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Count error:', countError);
    } else {
      console.log(`📊 Total records: ${count || 0}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run test
testSupabaseConnection();