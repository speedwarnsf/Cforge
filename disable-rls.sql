-- Step 2: Disable Row Level Security on concept_logs table
ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;

-- Step 3: Confirm no RLS policies remain
SELECT * FROM pg_policies WHERE tablename = 'concept_logs';

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'concept_logs';

-- Test insert to confirm fix
INSERT INTO concept_logs (user_id, prompt, response, tone, created_at) 
VALUES ('test-rls-fix', 'RLS Disabled Test', 'This should work now', 'test', NOW());

-- Verify the test insert worked
SELECT COUNT(*) as test_rows FROM concept_logs WHERE user_id = 'test-rls-fix';

-- Clean up test data
DELETE FROM concept_logs WHERE user_id = 'test-rls-fix';