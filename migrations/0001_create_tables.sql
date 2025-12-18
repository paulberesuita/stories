-- Stories table
CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    prompt TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Scenes table
CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    scene_number INTEGER NOT NULL,
    caption TEXT NOT NULL,
    image_key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
);

-- Index for faster story lookups
CREATE INDEX IF NOT EXISTS idx_scenes_story_id ON scenes(story_id);
