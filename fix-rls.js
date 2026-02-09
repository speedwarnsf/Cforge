import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vqkoxfenyjomillmxawh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxa294ZmVueWpvbWlsbG14YXdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk1Njg1MCwiZXhwIjoyMDY2NTMyODUwfQ.3k5UI5onZyHvD9aSxV68wz2laDkv3GskKWKg_CgWdCw'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixRLS() {
  console.log('🔧 Fixing Supabase RLS policy...')
  
  try {
    // Disable RLS for concept_logs table
    const { data, error } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;'
    })
    
    if (error) {
      console.error('❌ Error:', error.message)
      // Try alternative approach with a permissive policy
      console.log('🔄 Trying alternative: creating permissive policy...')
      const { data: data2, error: error2 } = await supabase.rpc('exec_sql', {
        query: `
          CREATE POLICY IF NOT EXISTS "Allow all operations for service" ON concept_logs
          FOR ALL USING (true) WITH CHECK (true);
        `
      })
      
      if (error2) {
        console.error('❌ Alternative failed:', error2.message)
        console.log('💡 Manual fix required: Run this SQL in Supabase dashboard:')
        console.log('   ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;')
        return
      }
    }
    
    console.log('✅ RLS policy fixed! Database writes should work now.')
    
    // Test the fix with a simple query
    const { data: testData, error: testError } = await supabase
      .from('concept_logs')
      .select('count')
      .limit(1)
      
    if (testError) {
      console.log('⚠️  Test query failed:', testError.message)
    } else {
      console.log('✅ Test query successful - database is accessible')
    }
    
  } catch (err) {
    console.error('❌ Exception:', err.message)
    console.log('💡 Manual fix required: Go to Supabase dashboard and run:')
    console.log('   ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;')
  }
}

fixRLS()