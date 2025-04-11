-- Criar tabela de projetos
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de pastas
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- Criar tabela de vídeos
CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    folder_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    duration REAL,
    thumbnail_path TEXT,
    video_status TEXT DEFAULT 'no_status',
    is_hidden INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

-- Criar tabela de versões de vídeos
CREATE TABLE IF NOT EXISTS video_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    folder_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    source_video_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    duration REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (source_video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Criar tabela de comentários
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    folder_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    parent_id TEXT,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    text TEXT NOT NULL,
    video_time REAL NOT NULL,
    drawing_data TEXT,
    likes INTEGER DEFAULT 0,
    liked_by TEXT,
    resolved INTEGER DEFAULT 0,
    version_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (version_id) REFERENCES video_versions(id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id);
CREATE INDEX IF NOT EXISTS idx_videos_folder_id ON videos(folder_id);
CREATE INDEX IF NOT EXISTS idx_comments_project_id ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_folder_id ON comments(folder_id);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_versions_project_id ON video_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_video_versions_folder_id ON video_versions(folder_id);
CREATE INDEX IF NOT EXISTS idx_video_versions_video_id ON video_versions(video_id);
CREATE INDEX IF NOT EXISTS idx_video_versions_source_video_id ON video_versions(source_video_id);
CREATE INDEX IF NOT EXISTS idx_comments_version_id ON comments(version_id);

-- Criar trigger para atualizar o updated_at
CREATE TRIGGER IF NOT EXISTS update_projects_updated_at
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_folders_updated_at
AFTER UPDATE ON folders
FOR EACH ROW
BEGIN
    UPDATE folders SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_videos_updated_at
AFTER UPDATE ON videos
FOR EACH ROW
BEGIN
    UPDATE videos SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_comments_updated_at
AFTER UPDATE ON comments
FOR EACH ROW
BEGIN
    UPDATE comments SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_video_versions_updated_at
AFTER UPDATE ON video_versions
FOR EACH ROW
BEGIN
    UPDATE video_versions SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END; 