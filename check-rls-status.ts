// Check RLS status for concept_logs table
import { createClient } from '@supabase/supabase-js';

async function checkRLSStatus() {
  console.log('🔍 Checking RLS status for concept_logs table...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Query to check RLS status
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: "SELECT relrowsecurity FROM pg_class WHERE relname = 'concept_logs';"
      });

    if (error) {
      console.log('Using alternative query method...');
      
      // Alternative: Check by attempting an insert to see if RLS blocks it
      const testInsert = {
        user_id: 'rls-status-test',
        prompt: 'Testing RLS status',
        response: 'Test response',
        tone: 'test',
        created_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('concept_logs')
        .insert([testInsert]);

      if (insertError) {
        if (insertError.code === '42501') {
          console.log('RLS Status: ENABLED (blocking inserts)');
          console.log('relrowsecurity: true');
        } else {
          console.log('RLS Status: UNKNOWN (different error)');
          console.log('Error:', insertError);
        }
      } else {
        console.log('RLS Status: DISABLED (inserts working)');
        console.log('relrowsecurity: false');
        
        // Clean up successful test insert
        await supabase
          .from('concept_logs')
          .delete()
          .eq('user_id', 'rls-status-test');
      }
    } else {
      console.log('RLS query result:', data);
    }

  } catch (error) {
    console.error('❌ Error checking RLS status:', error);
  }
}

checkRLSStatus();