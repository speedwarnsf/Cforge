-- Create concept_logs table in Supabase
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE concept_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  tone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_concept_logs_user_id ON concept_logs(user_id);
CREATE INDEX idx_concept_logs_created_at ON concept_logs(created_at);
CREATE INDEX idx_concept_logs_tone ON concept_logs(tone);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE concept_logs ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts (for logging)
CREATE POLICY "Allow inserts for all users" ON concept_logs
  FOR INSERT WITH CHECK (true);

-- Create a policy to allow reads (you can restrict this later)
CREATE POLICY "Allow reads for all users" ON concept_logs
  FOR SELECT USING (true);