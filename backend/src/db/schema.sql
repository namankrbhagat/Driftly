CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS boards (
  
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS board_members (
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position DOUBLE PRECISION DEFAULT 1000,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TIMESTAMP,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    position DOUBLE PRECISION DEFAULT 1000,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boards_owner ON boards(owner_id);
CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_board ON activities(board_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_user ON board_members(user_id);
