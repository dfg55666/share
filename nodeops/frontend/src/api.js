// NodeOps Manager — API layer
// All requests are relative (Vite dev proxy: /api → localhost:8000)

const BASE = '';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.detail || err.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

const get  = (path)       => request('GET',    path);
const post = (path, body) => request('POST',   path, body);
const put  = (path, body) => request('PUT',    path, body);
const del  = (path)       => request('DELETE', path);

// ─── Accounts ────────────────────────────────────────────────────────────────
export const getAccounts        = () => get('/api/accounts');
export const createAccount      = (data) => post('/api/accounts', data);
export const updateAccount      = (id, data) => put(`/api/accounts/${id}`, data);
export const deleteAccount      = (id) => del(`/api/accounts/${id}`);
export const refreshCredits     = (id) => post(`/api/accounts/${id}/refresh-credits`);
export const loginAccount       = (id) => post(`/api/accounts/${id}/login`);
export const verifyOtp          = (id, code) => post(`/api/accounts/${id}/verify-otp`, { code });

// ─── Projects ─────────────────────────────────────────────────────────────────
export const getProjects        = () => get('/api/projects');
export const createProject      = (data) => post('/api/projects', data);
export const deleteProject      = (name) => del(`/api/projects/${encodeURIComponent(name)}`);
export const getProjectDetail   = (name) => get(`/api/projects/${encodeURIComponent(name)}`);

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const getAllTasks         = () => get('/api/tasks');
export const getTasksForProject = (projectName) =>
  get(`/api/tasks/project/${encodeURIComponent(projectName)}`);
export const getTask            = (project, taskId) =>
  get(`/api/tasks/${encodeURIComponent(project)}/${encodeURIComponent(taskId)}`);
export const createTask         = (data) => post('/api/tasks', data);
export const updateTask         = (project, taskId, data) =>
  put(`/api/tasks/${encodeURIComponent(project)}/${encodeURIComponent(taskId)}`, data);
export const deleteTask         = (project, taskId) =>
  del(`/api/tasks/${encodeURIComponent(project)}/${encodeURIComponent(taskId)}`);
export const startTask          = (project, taskId) =>
  post(`/api/tasks/${encodeURIComponent(project)}/${encodeURIComponent(taskId)}/start`);
export const cancelTask         = (project, taskId) =>
  post(`/api/tasks/${encodeURIComponent(project)}/${encodeURIComponent(taskId)}/cancel`);
export const getTaskMessages    = (project, taskId) =>
  get(`/api/tasks/${encodeURIComponent(project)}/${encodeURIComponent(taskId)}/messages`);

// ─── Session History ──────────────────────────────────────────────────────────
export const getSessionHistory  = (project, taskId) =>
  get(`/api/sessions/history/${encodeURIComponent(project)}/${encodeURIComponent(taskId)}`);
export const getSessionContent  = (project, taskId, account, sessionFile) =>
  get(
    `/api/sessions/history/${encodeURIComponent(project)}/${encodeURIComponent(taskId)}/content` +
    `?account=${encodeURIComponent(account || '')}&session_file=${encodeURIComponent(sessionFile)}`
  );

// ─── Files ────────────────────────────────────────────────────────────────────
export const getFileTree        = (accountId, path = '') =>
  get(`/api/files/tree?account_id=${encodeURIComponent(accountId)}&path=${encodeURIComponent(path)}`);
export const getTaskFileTree    = (projectName, taskId, path = '') =>
  get(
    `/api/files/tree/task?project_name=${encodeURIComponent(projectName)}` +
    `&task_id=${encodeURIComponent(taskId)}&path=${encodeURIComponent(path)}`
  );
export const getFileContent     = (accountId, path) =>
  get(`/api/files/content?account_id=${encodeURIComponent(accountId)}&path=${encodeURIComponent(path)}`);

// ─── Overview ─────────────────────────────────────────────────────────────────
export const getOverview        = () => get('/api/overview');

// ─── SSE Helper ──────────────────────────────────────────────────────────────
// Returns an EventSource instance. Caller is responsible for cleanup.
export function createTaskEventSource(project, taskId) {
  return new EventSource(
    `/api/events/task/${encodeURIComponent(project)}/${encodeURIComponent(taskId)}`
  );
}
