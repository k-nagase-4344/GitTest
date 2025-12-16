-- プロジェクトテーブル
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 案件ステータスマスタ
CREATE TABLE IF NOT EXISTS issue_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 優先度マスタ
CREATE TABLE IF NOT EXISTS priorities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  level INTEGER NOT NULL,
  color TEXT NOT NULL
);

-- 案件テーブル
CREATE TABLE IF NOT EXISTS issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status_id INTEGER NOT NULL,
  priority_id INTEGER NOT NULL,
  assignee_id INTEGER,
  reporter_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (status_id) REFERENCES issue_statuses(id),
  FOREIGN KEY (priority_id) REFERENCES priorities(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id)
);

-- 添付ファイルテーブル
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  filesize INTEGER NOT NULL,
  content_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  uploaded_by INTEGER NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 更新履歴テーブル
CREATE TABLE IF NOT EXISTS issue_histories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- コメントテーブル
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_status_id ON issues(status_id);
CREATE INDEX IF NOT EXISTS idx_issues_priority_id ON issues(priority_id);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id ON issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_reporter_id ON issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_attachments_issue_id ON attachments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_histories_issue_id ON issue_histories(issue_id);
CREATE INDEX IF NOT EXISTS idx_comments_issue_id ON comments(issue_id);

-- 初期データ投入: ステータス
INSERT INTO issue_statuses (name, color, sort_order) VALUES
  ('新規', '#3B82F6', 1),
  ('対応中', '#F59E0B', 2),
  ('レビュー待ち', '#8B5CF6', 3),
  ('完了', '#10B981', 4),
  ('保留', '#6B7280', 5);

-- 初期データ投入: 優先度
INSERT INTO priorities (name, level, color) VALUES
  ('低', 1, '#10B981'),
  ('中', 2, '#F59E0B'),
  ('高', 3, '#EF4444'),
  ('緊急', 4, '#DC2626');

-- 初期データ投入: デフォルトユーザー
INSERT INTO users (username, email, display_name) VALUES
  ('admin', 'admin@example.com', '管理者'),
  ('user1', 'user1@example.com', 'ユーザー1'),
  ('user2', 'user2@example.com', 'ユーザー2');

-- 初期データ投入: サンプルプロジェクト
INSERT INTO projects (name, description) VALUES
  ('サンプルプロジェクト', 'テスト用のサンプルプロジェクトです');
