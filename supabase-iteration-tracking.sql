-- Add iteration tracking columns to concept_logs table
-- Run this in your Supabase SQL editor to add the new tracking columns

ALTER TABLE concept_logs 
ADD COLUMN IF NOT EXISTS iteration_type TEXT DEFAULT 'original',
ADD COLUMN IF NOT EXISTS parent_concept_id UUID REFERENCES concept_logs(id),
ADD COLUMN IF NOT EXISTS originality_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS originality_matches INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS deep_scan_used BOOLEAN DEFAULT false;

-- Add check constraint for iteration_type
ALTER TABLE concept_logs 
ADD CONSTRAINT iteration_type_check 
CHECK (iteration_type IN ('original', 'reforge_headline', 'reforge_tagline', 'reforge_body', 'reforge_full'));

-- Add index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_concept_logs_iteration_type ON concept_logs(iteration_type);
CREATE INDEX IF NOT EXISTS idx_concept_logs_parent_id ON concept_logs(parent_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_logs_originality ON concept_logs(originality_confidence);

-- Add comment to table explaining the new structure
COMMENT ON COLUMN concept_logs.iteration_type IS 'Type of concept generation: original or specific reforge operation';
COMMENT ON COLUMN concept_logs.parent_concept_id IS 'References the original concept this was reforged from';
COMMENT ON COLUMN concept_logs.originality_confidence IS 'Confidence score from originality check (0.0 to 1.0)';
COMMENT ON COLUMN concept_logs.originality_matches IS 'Number of similar campaigns found during originality check';
COMMENT ON COLUMN concept_logs.deep_scan_used IS 'Whether deep scan with image analysis was used';