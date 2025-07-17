-- Add recombined_from column to concept_logs table
-- This tracks which salvaged fragment inspired a new concept

ALTER TABLE concept_logs 
ADD COLUMN IF NOT EXISTS recombined_from UUID REFERENCES salvaged_fragments(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_concept_logs_recombined_from ON concept_logs(recombined_from);

-- Add comment for documentation
COMMENT ON COLUMN concept_logs.recombined_from IS 'Links to salvaged_fragments.id when concept was inspired by a salvaged fragment';