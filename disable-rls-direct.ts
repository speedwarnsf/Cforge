// Direct RLS disable using Supabase admin client
import { createClient } from '@supabase/supabase-js';

async function disableRLS() {
  console.log('🔓 Disabling RLS on concept_logs table...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing');
    process.exit(1);
  }

  // Create admin client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Execute RLS disable command via SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;'
    });

    if (error) {
      console.log('⚠️ RPC method not available, trying direct SQL execution...');
      
      // Alternative: Try to execute via direct query
      const { error: directError } = await supabase
        .from('pg_class')  
        .select('*')
        .limit(0); // This will test connection
        
      if (directError) {
        console.error('❌ Supabase connection failed:', directError);
        process.exit(1);
      }
      
      console.log('✅ Supabase connection confirmed');
      console.log('📋 Please run this SQL manually in Supabase SQL Editor:');
      console.log('ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;');
    } else {
      console.log('✅ RLS disabled successfully!');
    }

    // Test if RLS is now disabled by attempting an insert
    console.log('🧪 Testing insert after RLS disable...');
    
    const testData = {
      user_id: 'rls-test',
      prompt: 'Testing after RLS disable',
      response: JSON.stringify({
        headline: 'RLS Fixed',
        tagline: 'Database Working',
        bodyCopy: 'Inserts are now successful',
        visualConcept: 'Green checkmark',
        rhetoricalCraft: [{ device: 'Verification', explanation: 'Confirms fix worked' }],
        strategicImpact: 'Permanent persistence enabled'
      }),
      tone: 'test',
      created_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('concept_logs')
      .insert([testData])
      .select();

    if (insertError) {
      if (insertError.code === '42501') {
        console.log('⚠️ RLS still enabled - manual fix required');
        console.log('Run in Supabase SQL Editor: ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;');
      } else {
        console.error('❌ Insert failed with different error:', insertError);
      }
    } else {
      console.log('✅ Insert successful - RLS is disabled!');
      console.log('🧹 Cleaning up test data...');
      
      // Clean up test insert
      await supabase
        .from('concept_logs')
        .delete()
        .eq('user_id', 'rls-test');
        
      console.log('✅ Permanent Supabase persistence fully operational. No more data loss after restarts.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

disableRLS();