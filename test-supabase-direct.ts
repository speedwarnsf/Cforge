import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

async function testDirectSupabaseInsert() {
  console.log('🔧 Testing direct Supabase insert...');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing');
    return;
  }

  // Create client exactly like in supabaseClient.ts
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

  try {
    // Test 1: Check if table exists
    console.log('📋 Testing table access...');
    const { data: tableTest, error: tableError } = await supabase
      .from('concept_logs')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ Table access error:', tableError);
      return;
    }
    
    console.log('✅ Table accessible');

    // Test 2: Attempt minimal insert
    console.log('💾 Testing insert...');
    const insertData = {
      user_id: 'test-user',
      prompt: 'Test prompt for RLS debugging',
      response: 'Test response content',
      tone: 'test',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('concept_logs')
      .insert([insertData])
      .select();

    if (error) {
      console.error('❌ Insert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      if (error.code === '42501') {
        console.log('🔒 RLS Policy Issue - Run this SQL in Supabase:');
        console.log('ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;');
      }
      
      return;
    }

    console.log('✅ Insert successful:', data);
    
    // Test 3: Verify the row was inserted
    const { data: verifyData, error: verifyError } = await supabase
      .from('concept_logs')
      .select('*')
      .eq('user_id', 'test-user')
      .order('created_at', { ascending: false })
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
      return;
    }

    console.log('✅ Verification successful - row exists:', verifyData?.length > 0);
    
    // Clean up test data
    if (data && data[0]) {
      await supabase
        .from('concept_logs')
        .delete()
        .eq('id', data[0].id);
      console.log('🧹 Test data cleaned up');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDirectSupabaseInsert().catch(console.error);