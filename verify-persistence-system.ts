// Comprehensive persistence verification after RLS is disabled
import { createClient } from '@supabase/supabase-js';

async function verifyPersistenceSystem() {
  console.log('🔍 Verifying complete persistence system...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials missing');
    return false;
  }

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
    // Step 1: Test if RLS is disabled by attempting insert
    console.log('🧪 Testing if RLS is disabled...');
    
    const testConcept = {
      user_id: 'verification-test',
      prompt: 'Testing persistence after RLS fix',
      response: JSON.stringify({
        headline: 'Test Headline',
        tagline: 'Test Tagline', 
        bodyCopy: 'Test body copy for verification',
        visualConcept: 'Test visual concept',
        rhetoricalCraft: [{ device: 'Test Device', explanation: 'Test explanation' }],
        strategicImpact: 'Test strategic impact'
      }),
      tone: 'test',
      created_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabase
      .from('concept_logs')
      .insert([testConcept])
      .select();

    if (insertError) {
      if (insertError.code === '42501') {
        console.log('RLS still enabled - need to run SQL fix');
        console.log('Run this in Supabase SQL Editor:');
        console.log('ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;');
        return false;
      } else {
        console.error('Unexpected insert error:', insertError);
        return false;
      }
    }

    console.log('RLS disabled - inserts working!');
    const conceptId = insertData?.[0]?.id;

    // Step 2: Test retrieval
    console.log('📖 Testing data retrieval...');
    const { data: retrieveData, error: retrieveError } = await supabase
      .from('concept_logs')
      .select('*')
      .eq('id', conceptId)
      .single();

    if (retrieveError || !retrieveData) {
      console.error('Retrieval test failed');
      return false;
    }

    console.log('Data retrieval working');

    // Step 3: Test the app's logSession function
    console.log('🔧 Testing app logSession function...');
    const { logSession } = await import('./server/supabaseClient');
    
    const appTestId = await logSession({
      userId: null,
      prompt: 'App function test',
      response: JSON.stringify({
        headline: 'App Test Headline',
        tagline: 'App Test Tagline',
        bodyCopy: 'App test body',
        visualConcept: 'App test visual',
        rhetoricalCraft: [{ device: 'App Device', explanation: 'App explanation' }],
        strategicImpact: 'App strategic impact'
      }),
      tone: 'test'
    });

    if (!appTestId) {
      console.error('App logSession function failed');
      return false;
    }

    console.log('App logSession function working');

    // Step 4: Clean up test data
    console.log('Cleaning up test data...');
    await supabase.from('concept_logs').delete().eq('user_id', 'verification-test');
    await supabase.from('concept_logs').delete().eq('id', appTestId);

    console.log('🎉 All persistence tests PASSED');
    return true;

  } catch (error) {
    console.error('Verification failed:', error);
    return false;
  }
}

// Export for use in other scripts
export { verifyPersistenceSystem };

// Run if called directly
if (require.main === module) {
  verifyPersistenceSystem().then(success => {
    process.exit(success ? 0 : 1);
  });
}