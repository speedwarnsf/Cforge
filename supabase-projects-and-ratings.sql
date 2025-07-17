-- Create projects table for organizing concept work
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create concept_ratings table for user feedback on concepts
CREATE TABLE IF NOT EXISTS concept_ratings (
    id SERIAL PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    concept_id TEXT NOT NULL, -- References concept_logs.id from existing Supabase table
    rhetorical_device TEXT NOT NULL,
    tone TEXT NOT NULL,
    rating TEXT NOT NULL CHECK (rating IN ('more_like_this', 'less_like_this')),
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_concept_ratings_project_id ON concept_ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_concept_ratings_concept_id ON concept_ratings(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_ratings_rating ON concept_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Add unique constraint to prevent duplicate ratings for same concept
CREATE UNIQUE INDEX IF NOT EXISTS idx_concept_ratings_unique 
ON concept_ratings(project_id, concept_id, user_id);