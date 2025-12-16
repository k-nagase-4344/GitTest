// グローバル変数
let projects = []
let statuses = []
let priorities = []
let users = []
let issues = []
let currentUser = { id: 1, display_name: '管理者' } // 簡易的なユーザー設定

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  await loadMasterData()
  await loadIssues()
  setupEventListeners()
})

// マスタデータ読み込み
async function loadMasterData() {
  try {
    const [projectsRes, statusesRes, prioritiesRes, usersRes] = await Promise.all([
      axios.get('/api/projects'),
      axios.get('/api/statuses'),
      axios.get('/api/priorities'),
      axios.get('/api/users')
    ])
    
    projects = projectsRes.data
    statuses = statusesRes.data
    priorities = prioritiesRes.data
    users = usersRes.data

    // フィルタとフォームのセレクトボックスを設定
    populateSelects()
  } catch (error) {
    console.error('マスタデータの読み込みに失敗:', error)
    alert('データの読み込みに失敗しました')
  }
}

// セレクトボックスの設定
function populateSelects() {
  // プロジェクトフィルタ
  const projectFilter = document.getElementById('projectFilter')
  projectFilter.innerHTML = '<option value="">すべてのプロジェクト</option>'
  projects.forEach(p => {
    projectFilter.innerHTML += `<option value="${p.id}">${p.name}</option>`
  })

  // ステータスフィルタ
  const statusFilter = document.getElementById('statusFilter')
  statusFilter.innerHTML = '<option value="">すべて</option>'
  statuses.forEach(s => {
    statusFilter.innerHTML += `<option value="${s.id}">${s.name}</option>`
  })

  // 優先度フィルタ
  const priorityFilter = document.getElementById('priorityFilter')
  priorityFilter.innerHTML = '<option value="">すべて</option>'
  priorities.forEach(p => {
    priorityFilter.innerHTML += `<option value="${p.id}">${p.name}</option>`
  })

  // 担当者フィルタ
  const assigneeFilter = document.getElementById('assigneeFilter')
  assigneeFilter.innerHTML = '<option value="">すべて</option>'
  users.forEach(u => {
    assigneeFilter.innerHTML += `<option value="${u.id}">${u.display_name}</option>`
  })

  // 作成フォーム
  const createProject = document.getElementById('createProject')
  createProject.innerHTML = '<option value="">選択してください</option>'
  projects.forEach(p => {
    createProject.innerHTML += `<option value="${p.id}">${p.name}</option>`
  })

  const createStatus = document.getElementById('createStatus')
  createStatus.innerHTML = ''
  statuses.forEach(s => {
    createStatus.innerHTML += `<option value="${s.id}">${s.name}</option>`
  })

  const createPriority = document.getElementById('createPriority')
  createPriority.innerHTML = ''
  priorities.forEach(p => {
    createPriority.innerHTML += `<option value="${p.id}">${p.name}</option>`
  })

  const createAssignee = document.getElementById('createAssignee')
  createAssignee.innerHTML = '<option value="">未割り当て</option>'
  users.forEach(u => {
    createAssignee.innerHTML += `<option value="${u.id}">${u.display_name}</option>`
  })

  const createReporter = document.getElementById('createReporter')
  createReporter.innerHTML = ''
  users.forEach(u => {
    createReporter.innerHTML += `<option value="${u.id}">${u.display_name}</option>`
  })
  createReporter.value = currentUser.id
}

// イベントリスナー設定
function setupEventListeners() {
  // フィルタ変更時
  document.getElementById('projectFilter').addEventListener('change', loadIssues)
  document.getElementById('statusFilter').addEventListener('change', loadIssues)
  document.getElementById('priorityFilter').addEventListener('change', loadIssues)
  document.getElementById('assigneeFilter').addEventListener('change', loadIssues)
  
  // 検索入力時（デバウンス）
  let searchTimeout
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => loadIssues(), 500)
  })

  // 作成フォーム送信
  document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    await createIssue()
  })
}

// 案件一覧読み込み
async function loadIssues() {
  try {
    const params = new URLSearchParams()
    
    const projectId = document.getElementById('projectFilter').value
    const statusId = document.getElementById('statusFilter').value
    const priorityId = document.getElementById('priorityFilter').value
    const assigneeId = document.getElementById('assigneeFilter').value
    const search = document.getElementById('searchInput').value

    if (projectId) params.append('project_id', projectId)
    if (statusId) params.append('status', statusId)
    if (priorityId) params.append('priority', priorityId)
    if (assigneeId) params.append('assignee', assigneeId)
    if (search) params.append('search', search)

    const response = await axios.get(`/api/issues?${params.toString()}`)
    issues = response.data
    renderIssues()
  } catch (error) {
    console.error('案件の読み込みに失敗:', error)
    alert('案件の読み込みに失敗しました')
  }
}

// 案件一覧表示
function renderIssues() {
  const container = document.getElementById('issuesList')
  
  if (issues.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        <i class="fas fa-inbox text-4xl mb-4"></i>
        <p>案件がありません</p>
      </div>
    `
    return
  }

  container.innerHTML = issues.map(issue => `
    <div class="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer" onclick="showDetail(${issue.id})">
      <div class="p-4">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm text-gray-500">#${issue.id}</span>
              <span class="px-2 py-1 text-xs rounded-full" style="background-color: ${issue.status_color}20; color: ${issue.status_color}">
                ${issue.status_name}
              </span>
              <span class="px-2 py-1 text-xs rounded-full" style="background-color: ${issue.priority_color}20; color: ${issue.priority_color}">
                ${issue.priority_name}
              </span>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-1">${escapeHtml(issue.title)}</h3>
            ${issue.description ? `<p class="text-sm text-gray-600 line-clamp-2">${escapeHtml(issue.description)}</p>` : ''}
          </div>
          <div class="ml-4 text-right">
            <div class="text-sm text-gray-600 mb-1">
              <i class="fas fa-folder mr-1"></i>
              ${issue.project_name}
            </div>
            ${issue.assignee_name ? `
              <div class="text-sm text-gray-600">
                <i class="fas fa-user mr-1"></i>
                ${issue.assignee_name}
              </div>
            ` : '<div class="text-sm text-gray-400">未割り当て</div>'}
          </div>
        </div>
        <div class="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-500">
          <div>
            <i class="far fa-clock mr-1"></i>
            作成: ${formatDate(issue.created_at)}
          </div>
          <div>
            <i class="fas fa-user-edit mr-1"></i>
            報告者: ${issue.reporter_name}
          </div>
        </div>
      </div>
    </div>
  `).join('')
}

// 案件詳細表示
async function showDetail(id) {
  try {
    const response = await axios.get(`/api/issues/${id}`)
    const issue = response.data
    
    const statusSelect = statuses.map(s => 
      `<option value="${s.id}" ${s.id === issue.status_id ? 'selected' : ''}>${s.name}</option>`
    ).join('')
    
    const prioritySelect = priorities.map(p => 
      `<option value="${p.id}" ${p.id === issue.priority_id ? 'selected' : ''}>${p.name}</option>`
    ).join('')
    
    const assigneeSelect = '<option value="">未割り当て</option>' + users.map(u => 
      `<option value="${u.id}" ${u.id === issue.assignee_id ? 'selected' : ''}>${u.display_name}</option>`
    ).join('')

    document.getElementById('detailContent').innerHTML = `
      <div class="flex justify-between items-start mb-4">
        <h2 class="text-2xl font-bold">案件 #${issue.id}</h2>
        <button onclick="hideDetailModal()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
          <input type="text" id="editTitle" value="${escapeHtml(issue.title)}" class="w-full px-3 py-2 border rounded-lg">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">説明</label>
          <textarea id="editDescription" rows="4" class="w-full px-3 py-2 border rounded-lg">${issue.description || ''}</textarea>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select id="editStatus" class="w-full px-3 py-2 border rounded-lg">${statusSelect}</select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">優先度</label>
            <select id="editPriority" class="w-full px-3 py-2 border rounded-lg">${prioritySelect}</select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">担当者</label>
            <select id="editAssignee" class="w-full px-3 py-2 border rounded-lg">${assigneeSelect}</select>
          </div>
        </div>

        <div class="flex gap-2">
          <button onclick="updateIssue(${issue.id})" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <i class="fas fa-save mr-2"></i>保存
          </button>
          <button onclick="deleteIssue(${issue.id})" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
            <i class="fas fa-trash mr-2"></i>削除
          </button>
        </div>

        <!-- 添付ファイル -->
        <div class="border-t pt-4">
          <h3 class="text-lg font-semibold mb-3">
            <i class="fas fa-paperclip mr-2"></i>添付ファイル
          </h3>
          <div class="mb-3">
            <input type="file" id="fileInput" class="hidden" onchange="uploadFile(${issue.id})">
            <button onclick="document.getElementById('fileInput').click()" class="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200">
              <i class="fas fa-upload mr-2"></i>ファイルを追加
            </button>
          </div>
          <div id="attachmentsList" class="space-y-2">
            ${issue.attachments.map(a => `
              <div class="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div>
                  <i class="fas fa-file mr-2"></i>
                  <span class="font-medium">${escapeHtml(a.filename)}</span>
                  <span class="text-sm text-gray-500 ml-2">(${formatFileSize(a.filesize)})</span>
                </div>
                <a href="/api/attachments/${a.id}" class="text-blue-600 hover:text-blue-800">
                  <i class="fas fa-download"></i>
                </a>
              </div>
            `).join('') || '<p class="text-gray-500 text-sm">添付ファイルはありません</p>'}
          </div>
        </div>

        <!-- コメント -->
        <div class="border-t pt-4">
          <h3 class="text-lg font-semibold mb-3">
            <i class="fas fa-comments mr-2"></i>コメント
          </h3>
          <div class="mb-4">
            <textarea id="commentInput" rows="3" placeholder="コメントを入力..." class="w-full px-3 py-2 border rounded-lg"></textarea>
            <button onclick="addComment(${issue.id})" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <i class="fas fa-paper-plane mr-2"></i>コメント追加
            </button>
          </div>
          <div class="space-y-3">
            ${issue.comments.map(c => `
              <div class="bg-gray-50 p-3 rounded">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-medium">${c.user_name}</span>
                  <span class="text-sm text-gray-500">${formatDate(c.created_at)}</span>
                </div>
                <p class="text-gray-700">${escapeHtml(c.content)}</p>
              </div>
            `).join('') || '<p class="text-gray-500 text-sm">コメントはありません</p>'}
          </div>
        </div>

        <!-- 更新履歴 -->
        <div class="border-t pt-4">
          <h3 class="text-lg font-semibold mb-3">
            <i class="fas fa-history mr-2"></i>更新履歴
          </h3>
          <div class="space-y-2">
            ${issue.histories.map(h => `
              <div class="text-sm text-gray-600">
                <span class="font-medium">${h.user_name}</span>が
                <span class="font-medium">${getFieldLabel(h.field_name)}</span>を
                <span class="text-red-600">${h.old_value || '(空)'}</span>から
                <span class="text-green-600">${h.new_value || '(空)'}</span>に変更
                <span class="text-gray-500 ml-2">${formatDate(h.created_at)}</span>
              </div>
            `).join('') || '<p class="text-gray-500 text-sm">更新履歴はありません</p>'}
          </div>
        </div>
      </div>
    `
    
    document.getElementById('detailModal').classList.remove('hidden')
  } catch (error) {
    console.error('詳細の読み込みに失敗:', error)
    alert('詳細の読み込みに失敗しました')
  }
}

// 案件作成
async function createIssue() {
  try {
    const data = {
      project_id: parseInt(document.getElementById('createProject').value),
      title: document.getElementById('createTitle').value,
      description: document.getElementById('createDescription').value,
      status_id: parseInt(document.getElementById('createStatus').value),
      priority_id: parseInt(document.getElementById('createPriority').value),
      assignee_id: document.getElementById('createAssignee').value ? parseInt(document.getElementById('createAssignee').value) : null,
      reporter_id: parseInt(document.getElementById('createReporter').value)
    }

    await axios.post('/api/issues', data)
    hideCreateModal()
    await loadIssues()
    alert('案件を作成しました')
  } catch (error) {
    console.error('案件の作成に失敗:', error)
    alert('案件の作成に失敗しました')
  }
}

// 案件更新
async function updateIssue(id) {
  try {
    const data = {
      title: document.getElementById('editTitle').value,
      description: document.getElementById('editDescription').value,
      status_id: parseInt(document.getElementById('editStatus').value),
      priority_id: parseInt(document.getElementById('editPriority').value),
      assignee_id: document.getElementById('editAssignee').value ? parseInt(document.getElementById('editAssignee').value) : null,
      user_id: currentUser.id
    }

    await axios.put(`/api/issues/${id}`, data)
    hideDetailModal()
    await loadIssues()
    alert('案件を更新しました')
  } catch (error) {
    console.error('案件の更新に失敗:', error)
    alert('案件の更新に失敗しました')
  }
}

// 案件削除
async function deleteIssue(id) {
  if (!confirm('この案件を削除してもよろしいですか？')) {
    return
  }

  try {
    await axios.delete(`/api/issues/${id}`)
    hideDetailModal()
    await loadIssues()
    alert('案件を削除しました')
  } catch (error) {
    console.error('案件の削除に失敗:', error)
    alert('案件の削除に失敗しました')
  }
}

// コメント追加
async function addComment(issueId) {
  const content = document.getElementById('commentInput').value.trim()
  if (!content) {
    alert('コメントを入力してください')
    return
  }

  try {
    await axios.post(`/api/issues/${issueId}/comments`, {
      user_id: currentUser.id,
      content
    })
    document.getElementById('commentInput').value = ''
    await showDetail(issueId) // 再読み込み
  } catch (error) {
    console.error('コメントの追加に失敗:', error)
    alert('コメントの追加に失敗しました')
  }
}

// ファイルアップロード
async function uploadFile(issueId) {
  const fileInput = document.getElementById('fileInput')
  const file = fileInput.files[0]
  
  if (!file) return

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', currentUser.id)

    await axios.post(`/api/issues/${issueId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    fileInput.value = ''
    await showDetail(issueId) // 再読み込み
    alert('ファイルをアップロードしました')
  } catch (error) {
    console.error('ファイルのアップロードに失敗:', error)
    alert('ファイルのアップロードに失敗しました')
  }
}

// モーダル表示/非表示
function showCreateModal() {
  document.getElementById('createForm').reset()
  document.getElementById('createReporter').value = currentUser.id
  document.getElementById('createModal').classList.remove('hidden')
}

function hideCreateModal() {
  document.getElementById('createModal').classList.add('hidden')
}

function hideDetailModal() {
  document.getElementById('detailModal').classList.add('hidden')
}

// ユーティリティ関数
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function getFieldLabel(fieldName) {
  const labels = {
    title: 'タイトル',
    status: 'ステータス',
    priority: '優先度',
    assignee: '担当者',
    description: '説明'
  }
  return labels[fieldName] || fieldName
}

// ========== ページ切り替え ==========
function showPage(page) {
  // ナビゲーションのハイライト
  document.querySelectorAll('[id^="nav"]').forEach(btn => {
    btn.className = 'px-3 py-1 rounded hover:bg-gray-100'
  })
  document.getElementById('nav' + page.charAt(0).toUpperCase() + page.slice(1)).className = 'px-3 py-1 rounded bg-blue-100 text-blue-700'
  
  // ページ表示切り替え
  document.getElementById('issuesPage').classList.add('hidden')
  document.getElementById('projectsPage').classList.add('hidden')
  document.getElementById('usersPage').classList.add('hidden')
  
  // フィルタとボタンの表示制御
  const filterSection = document.querySelector('.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-4:has(#statusFilter)')
  const createIssueBtn = document.getElementById('createIssueBtn')
  const projectFilter = document.getElementById('projectFilter')
  
  if (page === 'issues') {
    document.getElementById('issuesPage').classList.remove('hidden')
    if (filterSection) filterSection.classList.remove('hidden')
    if (createIssueBtn) createIssueBtn.classList.remove('hidden')
    if (projectFilter) projectFilter.parentElement.classList.remove('hidden')
    loadIssues()
  } else if (page === 'projects') {
    document.getElementById('projectsPage').classList.remove('hidden')
    if (filterSection) filterSection.classList.add('hidden')
    if (createIssueBtn) createIssueBtn.classList.add('hidden')
    if (projectFilter) projectFilter.parentElement.classList.add('hidden')
    loadProjectsList()
  } else if (page === 'users') {
    document.getElementById('usersPage').classList.remove('hidden')
    if (filterSection) filterSection.classList.add('hidden')
    if (createIssueBtn) createIssueBtn.classList.add('hidden')
    if (projectFilter) projectFilter.parentElement.classList.add('hidden')
    loadUsersList()
  }
}

// ========== 通知機能 ==========
let notificationInterval = null

// 通知の初期化
document.addEventListener('DOMContentLoaded', () => {
  loadNotifications()
  // 30秒ごとに通知を更新
  notificationInterval = setInterval(loadNotifications, 30000)
})

async function loadNotifications() {
  try {
    const response = await axios.get(`/api/notifications?user_id=${currentUser.id}&unread_only=true`)
    const notifications = response.data
    
    const badge = document.getElementById('notificationBadge')
    if (notifications.length > 0) {
      badge.textContent = notifications.length
      badge.classList.remove('hidden')
    } else {
      badge.classList.add('hidden')
    }
  } catch (error) {
    console.error('通知の読み込みに失敗:', error)
  }
}

function toggleNotifications() {
  const panel = document.getElementById('notificationPanel')
  if (panel.classList.contains('hidden')) {
    showNotifications()
  } else {
    panel.classList.add('hidden')
  }
}

async function showNotifications() {
  try {
    const response = await axios.get(`/api/notifications?user_id=${currentUser.id}`)
    const notifications = response.data
    
    const list = document.getElementById('notificationList')
    if (notifications.length === 0) {
      list.innerHTML = '<p class="p-4 text-gray-500 text-sm text-center">通知はありません</p>'
    } else {
      list.innerHTML = notifications.map(n => `
        <div class="p-3 hover:bg-gray-50 cursor-pointer ${n.is_read ? 'opacity-60' : ''}" onclick="markAsRead(${n.id}, ${n.issue_id})">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="font-medium text-sm">${escapeHtml(n.title)}</p>
              <p class="text-sm text-gray-600">${escapeHtml(n.message)}</p>
              <p class="text-xs text-gray-400 mt-1">${formatDate(n.created_at)}</p>
            </div>
            ${!n.is_read ? '<div class="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>' : ''}
          </div>
        </div>
      `).join('')
    }
    
    document.getElementById('notificationPanel').classList.remove('hidden')
  } catch (error) {
    console.error('通知の読み込みに失敗:', error)
  }
}

async function markAsRead(notificationId, issueId) {
  try {
    await axios.put(`/api/notifications/${notificationId}/read`)
    if (issueId) {
      showDetail(issueId)
    }
    await loadNotifications()
    await showNotifications()
  } catch (error) {
    console.error('通知の既読化に失敗:', error)
  }
}

async function markAllAsRead() {
  try {
    await axios.put('/api/notifications/read-all', { user_id: currentUser.id })
    await loadNotifications()
    await showNotifications()
  } catch (error) {
    console.error('通知の一括既読化に失敗:', error)
  }
}

// ========== プロジェクト管理 ==========
async function loadProjectsList() {
  try {
    const response = await axios.get('/api/projects')
    projects = response.data
    
    const container = document.getElementById('projectsList')
    if (projects.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-4">プロジェクトがありません</p>'
      return
    }
    
    container.innerHTML = projects.map(p => `
      <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-semibold">${escapeHtml(p.name)}</h3>
            ${p.description ? `<p class="text-gray-600 mt-1">${escapeHtml(p.description)}</p>` : ''}
            <p class="text-sm text-gray-400 mt-2">作成日: ${formatDate(p.created_at)}</p>
          </div>
          <div class="flex gap-2 ml-4">
            <button onclick="editProject(${p.id})" class="text-blue-600 hover:text-blue-800">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteProject(${p.id})" class="text-red-600 hover:text-red-800">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('')
  } catch (error) {
    console.error('プロジェクト一覧の読み込みに失敗:', error)
    alert('プロジェクト一覧の読み込みに失敗しました')
  }
}

function showCreateProjectModal() {
  document.getElementById('projectModalTitle').textContent = '新規プロジェクト'
  document.getElementById('projectForm').reset()
  document.getElementById('projectId').value = ''
  document.getElementById('projectModal').classList.remove('hidden')
}

async function editProject(id) {
  const project = projects.find(p => p.id === id)
  if (!project) return
  
  document.getElementById('projectModalTitle').textContent = 'プロジェクト編集'
  document.getElementById('projectId').value = project.id
  document.getElementById('projectName').value = project.name
  document.getElementById('projectDescription').value = project.description || ''
  document.getElementById('projectModal').classList.remove('hidden')
}

function hideProjectModal() {
  document.getElementById('projectModal').classList.add('hidden')
}

document.getElementById('projectForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const id = document.getElementById('projectId').value
  const data = {
    name: document.getElementById('projectName').value,
    description: document.getElementById('projectDescription').value
  }
  
  try {
    if (id) {
      await axios.put(`/api/projects/${id}`, data)
      alert('プロジェクトを更新しました')
    } else {
      await axios.post('/api/projects', data)
      alert('プロジェクトを作成しました')
    }
    hideProjectModal()
    await loadMasterData()
    await loadProjectsList()
  } catch (error) {
    console.error('プロジェクトの保存に失敗:', error)
    alert('プロジェクトの保存に失敗しました')
  }
})

async function deleteProject(id) {
  if (!confirm('このプロジェクトを削除してもよろしいですか？')) {
    return
  }
  
  try {
    await axios.delete(`/api/projects/${id}`)
    alert('プロジェクトを削除しました')
    await loadMasterData()
    await loadProjectsList()
  } catch (error) {
    console.error('プロジェクトの削除に失敗:', error)
    alert(error.response?.data?.error || 'プロジェクトの削除に失敗しました')
  }
}

// ========== ユーザー管理 ==========
async function loadUsersList() {
  try {
    const response = await axios.get('/api/users')
    users = response.data
    
    const container = document.getElementById('usersList')
    if (users.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-4">ユーザーがいません</p>'
      return
    }
    
    container.innerHTML = users.map(u => `
      <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-semibold">${escapeHtml(u.display_name)}</h3>
            <p class="text-gray-600">@${escapeHtml(u.username)}</p>
            <p class="text-gray-600">
              <i class="fas fa-envelope mr-1"></i>${escapeHtml(u.email)}
            </p>
          </div>
          <div class="flex gap-2 ml-4">
            <button onclick="editUser(${u.id})" class="text-blue-600 hover:text-blue-800">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteUser(${u.id})" class="text-red-600 hover:text-red-800">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('')
  } catch (error) {
    console.error('ユーザー一覧の読み込みに失敗:', error)
    alert('ユーザー一覧の読み込みに失敗しました')
  }
}

function showCreateUserModal() {
  document.getElementById('userModalTitle').textContent = '新規ユーザー'
  document.getElementById('userForm').reset()
  document.getElementById('userId').value = ''
  document.getElementById('userModal').classList.remove('hidden')
}

async function editUser(id) {
  const user = users.find(u => u.id === id)
  if (!user) return
  
  document.getElementById('userModalTitle').textContent = 'ユーザー編集'
  document.getElementById('userId').value = user.id
  document.getElementById('userUsername').value = user.username
  document.getElementById('userEmail').value = user.email
  document.getElementById('userDisplayName').value = user.display_name
  document.getElementById('userModal').classList.remove('hidden')
}

function hideUserModal() {
  document.getElementById('userModal').classList.add('hidden')
}

document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const id = document.getElementById('userId').value
  const data = {
    username: document.getElementById('userUsername').value,
    email: document.getElementById('userEmail').value,
    display_name: document.getElementById('userDisplayName').value
  }
  
  try {
    if (id) {
      await axios.put(`/api/users/${id}`, data)
      alert('ユーザーを更新しました')
    } else {
      await axios.post('/api/users', data)
      alert('ユーザーを作成しました')
    }
    hideUserModal()
    await loadMasterData()
    await loadUsersList()
  } catch (error) {
    console.error('ユーザーの保存に失敗:', error)
    alert(error.response?.data?.error || 'ユーザーの保存に失敗しました')
  }
})

async function deleteUser(id) {
  if (!confirm('このユーザーを削除してもよろしいですか？')) {
    return
  }
  
  try {
    await axios.delete(`/api/users/${id}`)
    alert('ユーザーを削除しました')
    await loadMasterData()
    await loadUsersList()
  } catch (error) {
    console.error('ユーザーの削除に失敗:', error)
    alert(error.response?.data?.error || 'ユーザーの削除に失敗しました')
  }
}
