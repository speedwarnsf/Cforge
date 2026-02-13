// Direct approach to disable RLS using Supabase admin client
import { createClient } from '@supabase/supabase-js';

async function disableRLS() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  console.log('🔧 Disabling RLS on concept_logs table...');

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing');
    return false;
  }

  // Use service role key with admin privileges
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Test current state - this should fail with RLS error
    console.log('🧪 Testing current RLS state...');
    const { error: testError } = await supabase
      .from('concept_logs')
      .insert([{
        user_id: 'rls-test',
        prompt: 'Before RLS disable',
        response: 'Should fail with RLS error',
        tone: 'test'
      }]);

    if (testError) {
      console.log('Confirmed RLS is blocking inserts:', testError.code);
    } else {
      console.log('RLS might already be disabled');
    }

    // Clean up any successful test insert
    await supabase.from('concept_logs').delete().eq('user_id', 'rls-test');

    // Since we can't directly execute DDL through the client,
    // we'll create a test to verify when RLS is manually disabled
    console.log('📋 RLS must be disabled manually in Supabase SQL Editor');
    console.log('Run this SQL command:');
    console.log('ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;');
    
    return false; // Indicates manual action needed

  } catch (error) {
    console.error('Error testing RLS:', error);
    return false;
  }
}

disableRLS().catch(console.error);