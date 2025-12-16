import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database
  R2: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定
app.use('/api/*', cors())

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }))

// ==================== API Routes ====================

// プロジェクト一覧取得
app.get('/api/projects', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM projects ORDER BY created_at DESC').all()
  return c.json(results)
})

// プロジェクト作成
app.post('/api/projects', async (c) => {
  const { name, description } = await c.req.json()
  const result = await c.env.DB.prepare(
    'INSERT INTO projects (name, description) VALUES (?, ?)'
  ).bind(name, description).run()
  return c.json({ id: result.meta.last_row_id, name, description })
})

// 案件一覧取得（検索・フィルタ対応）
app.get('/api/issues', async (c) => {
  const projectId = c.req.query('project_id')
  const status = c.req.query('status')
  const priority = c.req.query('priority')
  const assignee = c.req.query('assignee')
  const search = c.req.query('search')

  let query = `
    SELECT 
      i.*,
      p.name as project_name,
      s.name as status_name,
      s.color as status_color,
      pr.name as priority_name,
      pr.color as priority_color,
      u1.display_name as assignee_name,
      u2.display_name as reporter_name
    FROM issues i
    LEFT JOIN projects p ON i.project_id = p.id
    LEFT JOIN issue_statuses s ON i.status_id = s.id
    LEFT JOIN priorities pr ON i.priority_id = pr.id
    LEFT JOIN users u1 ON i.assignee_id = u1.id
    LEFT JOIN users u2 ON i.reporter_id = u2.id
    WHERE 1=1
  `
  const params: any[] = []

  if (projectId) {
    query += ' AND i.project_id = ?'
    params.push(projectId)
  }
  if (status) {
    query += ' AND i.status_id = ?'
    params.push(status)
  }
  if (priority) {
    query += ' AND i.priority_id = ?'
    params.push(priority)
  }
  if (assignee) {
    query += ' AND i.assignee_id = ?'
    params.push(assignee)
  }
  if (search) {
    query += ' AND (i.title LIKE ? OR i.description LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }

  query += ' ORDER BY i.created_at DESC'

  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

// 案件詳細取得
app.get('/api/issues/:id', async (c) => {
  const id = c.req.param('id')
  
  // 案件情報
  const issue = await c.env.DB.prepare(`
    SELECT 
      i.*,
      p.name as project_name,
      s.name as status_name,
      s.color as status_color,
      pr.name as priority_name,
      pr.color as priority_color,
      u1.display_name as assignee_name,
      u2.display_name as reporter_name
    FROM issues i
    LEFT JOIN projects p ON i.project_id = p.id
    LEFT JOIN issue_statuses s ON i.status_id = s.id
    LEFT JOIN priorities pr ON i.priority_id = pr.id
    LEFT JOIN users u1 ON i.assignee_id = u1.id
    LEFT JOIN users u2 ON i.reporter_id = u2.id
    WHERE i.id = ?
  `).bind(id).first()

  if (!issue) {
    return c.json({ error: 'Issue not found' }, 404)
  }

  // コメント取得
  const { results: comments } = await c.env.DB.prepare(`
    SELECT c.*, u.display_name as user_name
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.issue_id = ?
    ORDER BY c.created_at ASC
  `).bind(id).all()

  // 添付ファイル取得
  const { results: attachments } = await c.env.DB.prepare(`
    SELECT a.*, u.display_name as uploader_name
    FROM attachments a
    LEFT JOIN users u ON a.uploaded_by = u.id
    WHERE a.issue_id = ?
    ORDER BY a.uploaded_at DESC
  `).bind(id).all()

  // 更新履歴取得
  const { results: histories } = await c.env.DB.prepare(`
    SELECT h.*, u.display_name as user_name
    FROM issue_histories h
    LEFT JOIN users u ON h.user_id = u.id
    WHERE h.issue_id = ?
    ORDER BY h.created_at DESC
  `).bind(id).all()

  return c.json({
    ...issue,
    comments,
    attachments,
    histories
  })
})

// 案件作成
app.post('/api/issues', async (c) => {
  const { project_id, title, description, status_id, priority_id, assignee_id, reporter_id } = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO issues (project_id, title, description, status_id, priority_id, assignee_id, reporter_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(project_id, title, description, status_id, priority_id, assignee_id, reporter_id).run()

  return c.json({ id: result.meta.last_row_id })
})

// 案件更新
app.put('/api/issues/:id', async (c) => {
  const id = c.req.param('id')
  const { title, description, status_id, priority_id, assignee_id, user_id } = await c.req.json()

  // 現在の値を取得
  const current = await c.env.DB.prepare('SELECT * FROM issues WHERE id = ?').bind(id).first()
  if (!current) {
    return c.json({ error: 'Issue not found' }, 404)
  }

  // 更新処理
  await c.env.DB.prepare(`
    UPDATE issues 
    SET title = ?, description = ?, status_id = ?, priority_id = ?, assignee_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(title, description, status_id, priority_id, assignee_id, id).run()

  // 更新履歴を記録
  const histories = []
  if (current.title !== title) {
    histories.push({ field: 'title', old: current.title, new: title })
  }
  if (current.status_id !== status_id) {
    histories.push({ field: 'status', old: current.status_id, new: status_id })
  }
  if (current.priority_id !== priority_id) {
    histories.push({ field: 'priority', old: current.priority_id, new: priority_id })
  }
  if (current.assignee_id !== assignee_id) {
    histories.push({ field: 'assignee', old: current.assignee_id, new: assignee_id })
  }

  for (const h of histories) {
    await c.env.DB.prepare(`
      INSERT INTO issue_histories (issue_id, user_id, field_name, old_value, new_value)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, user_id, h.field, h.old, h.new).run()
  }

  return c.json({ success: true })
})

// 案件削除
app.delete('/api/issues/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM issues WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// コメント追加
app.post('/api/issues/:id/comments', async (c) => {
  const id = c.req.param('id')
  const { user_id, content } = await c.req.json()
  
  const result = await c.env.DB.prepare(`
    INSERT INTO comments (issue_id, user_id, content)
    VALUES (?, ?, ?)
  `).bind(id, user_id, content).run()

  return c.json({ id: result.meta.last_row_id })
})

// ファイルアップロード
app.post('/api/issues/:id/attachments', async (c) => {
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const userId = formData.get('user_id') as string

  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }

  // R2にファイルをアップロード
  const key = `issues/${id}/${Date.now()}-${file.name}`
  await c.env.R2.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type
    }
  })

  // データベースに記録
  const result = await c.env.DB.prepare(`
    INSERT INTO attachments (issue_id, filename, filesize, content_type, r2_key, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, file.name, file.size, file.type, key, userId).run()

  return c.json({ id: result.meta.last_row_id, filename: file.name })
})

// ファイルダウンロード
app.get('/api/attachments/:id', async (c) => {
  const id = c.req.param('id')
  
  const attachment = await c.env.DB.prepare('SELECT * FROM attachments WHERE id = ?').bind(id).first()
  if (!attachment) {
    return c.json({ error: 'Attachment not found' }, 404)
  }

  const object = await c.env.R2.get(attachment.r2_key as string)
  if (!object) {
    return c.json({ error: 'File not found in storage' }, 404)
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': attachment.content_type as string,
      'Content-Disposition': `attachment; filename="${attachment.filename}"`
    }
  })
})

// マスタデータ取得
app.get('/api/statuses', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM issue_statuses ORDER BY sort_order').all()
  return c.json(results)
})

app.get('/api/priorities', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM priorities ORDER BY level').all()
  return c.json(results)
})

app.get('/api/users', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, username, email, display_name FROM users').all()
  return c.json(results)
})

// ==================== Frontend ====================

app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>不具合管理システム</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div id="app" class="min-h-screen">
        <!-- ヘッダー -->
        <header class="bg-white shadow">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex justify-between items-center">
                    <h1 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-bug mr-2 text-red-500"></i>
                        不具合管理システム
                    </h1>
                    <div class="flex items-center gap-4">
                        <select id="projectFilter" class="px-3 py-2 border rounded-lg">
                            <option value="">すべてのプロジェクト</option>
                        </select>
                        <button onclick="showCreateModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-plus mr-2"></i>新規案件
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- フィルタ -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="bg-white rounded-lg shadow p-4">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                        <select id="statusFilter" class="w-full px-3 py-2 border rounded-lg">
                            <option value="">すべて</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">優先度</label>
                        <select id="priorityFilter" class="w-full px-3 py-2 border rounded-lg">
                            <option value="">すべて</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                        <select id="assigneeFilter" class="w-full px-3 py-2 border rounded-lg">
                            <option value="">すべて</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">検索</label>
                        <input type="text" id="searchInput" placeholder="タイトル・説明で検索" class="w-full px-3 py-2 border rounded-lg">
                    </div>
                </div>
            </div>
        </div>

        <!-- 案件一覧 -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div id="issuesList" class="space-y-3">
                <!-- 案件カードがここに動的に挿入される -->
            </div>
        </div>

        <!-- 案件作成モーダル -->
        <div id="createModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <h2 class="text-xl font-bold mb-4">新規案件作成</h2>
                    <form id="createForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">プロジェクト *</label>
                            <select id="createProject" required class="w-full px-3 py-2 border rounded-lg">
                                <option value="">選択してください</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">タイトル *</label>
                            <input type="text" id="createTitle" required class="w-full px-3 py-2 border rounded-lg">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">説明</label>
                            <textarea id="createDescription" rows="4" class="w-full px-3 py-2 border rounded-lg"></textarea>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">ステータス *</label>
                                <select id="createStatus" required class="w-full px-3 py-2 border rounded-lg"></select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">優先度 *</label>
                                <select id="createPriority" required class="w-full px-3 py-2 border rounded-lg"></select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">担当者</label>
                                <select id="createAssignee" class="w-full px-3 py-2 border rounded-lg">
                                    <option value="">未割り当て</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">報告者 *</label>
                                <select id="createReporter" required class="w-full px-3 py-2 border rounded-lg"></select>
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 pt-4">
                            <button type="button" onclick="hideCreateModal()" class="px-4 py-2 border rounded-lg hover:bg-gray-50">
                                キャンセル
                            </button>
                            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                                作成
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- 案件詳細モーダル -->
        <div id="detailModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
            <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div id="detailContent">
                        <!-- 詳細がここに動的に挿入される -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
</body>
</html>
  `)
})

export default app
