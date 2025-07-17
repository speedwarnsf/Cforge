-- Add is_favorite column to concept_logs table
ALTER TABLE concept_logs ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
