# CRITICAL: Supabase RLS Fix Required

## Problem
The concept_logs table has Row Level Security (RLS) enabled, which is blocking all database inserts from the application. This causes concepts to be lost after server restarts.

**Error**: `new row violates row-level security policy for table "concept_logs"`

## Solution
Run this SQL in your Supabase SQL Editor:

```sql
-- Disable RLS to allow application inserts
ALTER TABLE concept_logs DISABLE ROW LEVEL SECURITY;
```

## Verification
After running the SQL, test concept generation:

1. Generate a concept in the app
2. Restart the server 
3. Confirm the concept still appears in history

## Status
- ❌ RLS currently enabled - blocking all saves
- ⏳ Waiting for user to run SQL fix
- ✅ Will be fixed once RLS is disabled

## Alternative (If you want to keep RLS enabled)
```sql
-- Create permissive policy for service account
CREATE POLICY "Allow all operations for service" ON concept_logs
  FOR ALL USING (true) WITH CHECK (true);
```

But disabling RLS entirely is simpler and more reliable for this use case.