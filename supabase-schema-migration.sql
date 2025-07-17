-- Concept Forge Database Schema Migration
-- Adding missing columns to concept_logs table

ALTER TABLE concept_logs
ADD COLUMN IF NOT EXISTS iteration_type TEXT,
ADD COLUMN IF NOT EXISTS parent_concept_id UUID,
ADD COLUMN IF NOT EXISTS originality_confidence INTEGER,
ADD COLUMN IF NOT EXISTS originality_matches INTEGER,
ADD COLUMN IF NOT EXISTS deep_scan_used BOOLEAN;

-- Verify the schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'concept_logs'
ORDER BY ordinal_position;