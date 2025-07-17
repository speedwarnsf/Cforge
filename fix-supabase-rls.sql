-- CRITICAL FIX: Disable RLS for concept_logs table
-- Run this SQL in your Supabase SQL Editor to fix the persistence issue

-- Disable Row Level Security to allow service account inserts
ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity, hasrlspolicy
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE tablename = 'concept_logs';

-- Test insert to verify fix worked
INSERT INTO concept_logs (user_id, prompt, response, tone, created_at) 
VALUES ('rls-test', 'RLS Fix Test', 'This insert should work after disabling RLS', 'test', NOW());

-- Check that the test row was inserted
SELECT id, user_id, prompt, created_at 
FROM concept_logs 
WHERE user_id = 'rls-test' 
ORDER BY created_at DESC 
LIMIT 1;

-- Clean up test row
DELETE FROM concept_logs WHERE user_id = 'rls-test';