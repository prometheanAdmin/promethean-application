-- Enable pgvector extension (needed for V2 semantic memory)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable Row-Level Security globally for all future tables
-- Individual RLS policies are added per table in migrations
