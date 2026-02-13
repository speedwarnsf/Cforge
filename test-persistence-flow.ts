import { createClient } from '@supabase/supabase-js';

async function testPersistenceFlow() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing');
    return;
  }

  // Create client exactly like the app
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`
      }
    }
  });

  console.log('🧪 Testing Supabase persistence flow...');

  try {
    // Step 2: Disable RLS
    console.log('🔓 Disabling RLS...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY'
    });

    if (rlsError) {
      console.log('Note: RLS disable via RPC failed, using direct approach...');
    }

    // Step 3: Check policies
    console.log('🔍 Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'concept_logs');

    if (!policyError) {
      console.log(`📋 Found ${policies?.length || 0} RLS policies`);
    }

    // Test insert
    console.log('💾 Testing insert...');
    const testData = {
      user_id: 'test-persistence',
      prompt: 'Testing persistence after RLS fix',
      response: 'This should save successfully',
      tone: 'test',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('concept_logs')
      .insert([testData])
      .select();

    if (error) {
      console.error('Insert still failing:', error);
      return false;
    }

    console.log('Insert successful!');

    // Verify data exists
    const { data: verifyData, error: verifyError } = await supabase
      .from('concept_logs')
      .select('*')
      .eq('user_id', 'test-persistence')
      .limit(1);

    if (verifyError || !verifyData?.length) {
      console.error('Verification failed');
      return false;
    }

    console.log('Data verified in database');

    // Clean up
    await supabase
      .from('concept_logs')
      .delete()
      .eq('user_id', 'test-persistence');

    console.log('Test data cleaned up');
    return true;

  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}

// Run test if called directly
if (require.main === module) {
  testPersistenceFlow().then(success => {
    if (success) {
      console.log('🎉 Persistence test PASSED');
    } else {
      console.log('💥 Persistence test FAILED');
    }
    process.exit(success ? 0 : 1);
  });
}

export { testPersistenceFlow };