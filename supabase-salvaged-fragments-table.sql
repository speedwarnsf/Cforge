-- Salvaged Fragments Table for Concept Forge Recombination System
-- Create table for storing promising concept fragments for future reuse

CREATE TABLE salvaged_fragments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    concept_id UUID REFERENCES concept_logs(id) ON DELETE CASCADE,
    fragment_type TEXT NOT NULL CHECK (fragment_type IN ('headline', 'visual', 'rhetorical_device', 'tone', 'phrase', 'metaphor')),
    fragment_text TEXT NOT NULL,
    rationale TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_salvaged_fragments_created_at ON salvaged_fragments(created_at DESC);
CREATE INDEX idx_salvaged_fragments_fragment_type ON salvaged_fragments(fragment_type);
CREATE INDEX idx_salvaged_fragments_concept_id ON salvaged_fragments(concept_id);
CREATE INDEX idx_salvaged_fragments_usage_count ON salvaged_fragments(usage_count);

-- Add RLS policies
ALTER TABLE salvaged_fragments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON salvaged_fragments
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON salvaged_fragments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON salvaged_fragments
    FOR UPDATE USING (true);

-- Add comment for documentation
COMMENT ON TABLE salvaged_fragments IS 'Stores promising fragments extracted from generated concepts for future recombination and creative reuse';
COMMENT ON COLUMN salvaged_fragments.fragment_type IS 'Type of fragment: headline, visual, rhetorical_device, tone, phrase, metaphor';
COMMENT ON COLUMN salvaged_fragments.fragment_text IS 'The actual text content of the salvaged fragment';
COMMENT ON COLUMN salvaged_fragments.rationale IS 'Explanation of why this fragment shows creative promise';
COMMENT ON COLUMN salvaged_fragments.usage_count IS 'Number of times this fragment has been used in recombination';
COMMENT ON COLUMN salvaged_fragments.last_used_at IS 'Timestamp of last usage for recombination tracking';