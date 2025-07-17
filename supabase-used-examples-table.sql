-- Create used_examples table for persistent exclusion of rhetorical examples
CREATE TABLE IF NOT EXISTS used_examples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    example_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_used_examples_example_id ON used_examples(example_id);
CREATE INDEX IF NOT EXISTS idx_used_examples_created_at ON used_examples(created_at);

-- Create rhetorical_device_usage table for weighted sampling
CREATE TABLE IF NOT EXISTS rhetorical_device_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_name VARCHAR(100) NOT NULL,
    usage_count INTEGER DEFAULT 1,
    last_used TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create unique constraint on device_name
ALTER TABLE rhetorical_device_usage ADD CONSTRAINT unique_device_name UNIQUE (device_name);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rhetorical_device_usage_device ON rhetorical_device_usage(device_name);
CREATE INDEX IF NOT EXISTS idx_rhetorical_device_usage_count ON rhetorical_device_usage(usage_count);