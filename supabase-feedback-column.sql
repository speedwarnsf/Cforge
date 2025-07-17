-- Add feedback_type column to concept_logs table for More Like This / Less Like This functionality
-- Run this in your Supabase SQL editor

ALTER TABLE concept_logs ADD COLUMN IF NOT EXISTS feedback_type TEXT;

-- Add a check constraint to ensure only valid feedback types
ALTER TABLE concept_logs ADD CONSTRAINT valid_feedback_type 
CHECK (feedback_type IS NULL OR feedback_type IN ('more_like_this', 'less_like_this'));

-- Create an index for efficient feedback queries
CREATE INDEX IF NOT EXISTS idx_concept_logs_feedback_type ON concept_logs(feedback_type);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'concept_logs' 
ORDER BY ordinal_position;