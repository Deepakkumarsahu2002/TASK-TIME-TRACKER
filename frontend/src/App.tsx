import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type AuthMode = 'login' | 'register'
type TaskStatus = 'Pending' | 'In Progress' | 'Completed'

type User = {
  id: string
  name: string
  email: string
}

type Task = {
  _id: string
  title: string
  description: string
  status: TaskStatus
  totalTrackedMs: number
  isTimerRunning: boolean
  updatedAt?: string
}

type TimeLog = {
  _id: string
  taskId: string
  startedAt: string
  endedAt?: string | null
  durationMs: number
}

type Summary = {
  tasksWorkedOn: number
  totalTrackedMs: number
  completedTasks: number
  pendingTasks: number
  inProgressTasks: number
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() }

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong')
  }

  return data as T
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

function App() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [authError, setAuthError] = useState('')
  const [actionError, setActionError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [summary, setSummary] = useState<Summary>({
    tasksWorkedOn: 0,
    totalTrackedMs: 0,
    completedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
  })
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeElapsedMs, setActiveElapsedMs] = useState(0)
  const [expandedLogsTaskId, setExpandedLogsTaskId] = useState<string | null>(null)
  const [taskLogs, setTaskLogs] = useState<Record<string, TimeLog[]>>({})
  const [allLogs, setAllLogs] = useState<TimeLog[]>([])
  const [showAllLogs, setShowAllLogs] = useState(false)
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'Pending' as TaskStatus,
  })
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  const makeTaskSuggestion = (rawTitle: string) => {
    const cleaned = rawTitle.trim()
    if (!cleaned) {
      return { title: '', description: '' }
    }

    const normalized = cleaned
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '')

    const title = normalized
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')

    const lower = normalized.toLowerCase()
    const subject = normalized.replace(/^(follow up|email|call|review|fix|research|prepare|plan|update)(?:\s+(?:with|on|for|about|to))?\s+/i, '').trim()
    const readableSubject = subject || 'the relevant task'
    let suggestedTitle = title
    let description = `Define the desired outcome for "${title}", complete the next actionable step, and record any follow-up.\n\nOutcome: A clear result is documented and ready for the next person.`

    if (lower.includes('follow up with designer')) {
      suggestedTitle = 'Follow up with UI Designer'
      description = 'Send a Slack message to confirm the current wireframe delivery status, ask about blockers, and agree on the next review date.\n\nOutcome: The delivery date and next action are confirmed.'
    } else if (lower.startsWith('follow up')) {
      description = `Contact ${readableSubject}, reference the previous conversation, and confirm the next concrete action.\n\nOutcome: Ownership and next steps are recorded.`
    } else if (lower.startsWith('meeting') || lower.startsWith('plan a meeting')) {
      description = `Prepare an agenda for ${readableSubject}, collect the necessary updates, and send a concise follow-up after the discussion.\n\nOutcome: Decisions, owners, and deadlines are documented.`
    } else if (lower.startsWith('email') || lower.startsWith('send')) {
      description = `Draft a concise message about ${readableSubject}, check the key details, and send it to the right recipient.\n\nOutcome: The recipient has the context needed to respond or act.`
    } else if (lower.startsWith('review')) {
      description = `Review ${readableSubject} against the current requirements, note any gaps, and share focused feedback.\n\nOutcome: The work is approved or has a clear revision list.`
    } else if (lower.startsWith('bug') || lower.startsWith('fix')) {
      description = `Reproduce ${readableSubject}, identify the root cause, apply the smallest reliable fix, and verify the result.\n\nOutcome: The issue is resolved with a repeatable verification step.`
    } else if (lower.startsWith('research')) {
      description = `Investigate ${readableSubject}, compare the most relevant options, and capture the evidence behind the recommendation.\n\nOutcome: A concise recommendation is ready for a decision.`
    } else if (lower.startsWith('prepare') || lower.startsWith('plan')) {
      description = `Break ${readableSubject} into the key steps, gather what is needed, and set a realistic completion checkpoint.\n\nOutcome: The work has a clear plan and first action.`
    }

    return { title: suggestedTitle, description }
  }

  const loadTasks = async () => {
    const data = await apiRequest<{ success: boolean; tasks: Task[] }>('/api/tasks')
    setTasks(data.tasks)
    const runningTask = data.tasks.find((task) => task.isTimerRunning)
    if (runningTask) {
      setActiveTaskId(runningTask._id)
      setActiveElapsedMs(runningTask.totalTrackedMs)
    } else {
      setActiveTaskId(null)
      setActiveElapsedMs(0)
    }
  }

  const loadSummary = async () => {
    const data = await apiRequest<{ success: boolean; summary: Summary }>('/api/tasks/summary/daily')
    setSummary(data.summary)
  }

  const fetchCurrentUser = async () => {
    try {
      const data = await apiRequest<{ success: boolean; user: User }>('/api/auth/me')
      setUser(data.user)
      await loadTasks()
      await loadSummary()
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const data = await apiRequest<{ success: boolean; user: User }>('/api/auth/me')
        setUser(data.user)
        await loadTasks()
        await loadSummary()
      } catch {
        setUser(null)
      } finally {
        setBootstrapping(false)
      }
    }

    void bootstrap()
  }, [])

  useEffect(() => {
    if (!activeTaskId) {
      return undefined
    }

    const interval = window.setInterval(() => {
      setActiveElapsedMs((current) => current + 1000)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [activeTaskId])

  const handleAuthSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setAuthError('')

    try {
      const payload =
        mode === 'register'
          ? {
              name: authForm.name,
              email: authForm.email,
              password: authForm.password,
            }
          : {
              email: authForm.email,
              password: authForm.password,
            }

      await apiRequest<{ success: boolean }>(
        mode === 'register' ? '/api/auth/register' : '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )

      await fetchCurrentUser()
      setAuthForm({ name: '', email: '', password: '' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to authenticate'
      setAuthError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setTasks([])
      setSummary({
        tasksWorkedOn: 0,
        totalTrackedMs: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
      })
    } catch (error) {
      console.error(error)
    }
  }

  const handleTaskSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!taskForm.title.trim()) return
    setActionError('')

    try {
      if (editingTaskId) {
        await apiRequest(`/api/tasks/${editingTaskId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: taskForm.title,
            description: taskForm.description,
            status: taskForm.status,
          }),
        })
        setEditingTaskId(null)
      } else {
        await apiRequest('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title: taskForm.title,
            description: taskForm.description,
            status: taskForm.status,
          }),
        })
      }

      setTaskForm({ title: '', description: '', status: 'Pending' })
      await loadTasks()
      await loadSummary()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to save task')
    }
  }

  const startTaskEdit = (task: Task) => {
    setEditingTaskId(task._id)
    setTaskForm({
      title: task.title,
      description: task.description,
      status: task.status,
    })
  }

  const cancelTaskEdit = () => {
    setEditingTaskId(null)
    setTaskForm({ title: '', description: '', status: 'Pending' })
  }

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    try {
      setActionError('')
      await apiRequest(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      await loadTasks()
      await loadSummary()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update task')
    }
  }

  const toggleTimer = async (task: Task) => {
    try {
      setActionError('')
      const isRunning = task.isTimerRunning

      await apiRequest(`/api/tasks/${task._id}/${isRunning ? 'stop' : 'start'}`, {
        method: 'POST',
      })

      if (isRunning) {
        setActiveTaskId(null)
        setActiveElapsedMs(0)
      } else {
        setActiveTaskId(task._id)
        setActiveElapsedMs(0)
      }

      await loadTasks()
      await loadSummary()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update timer')
    }
  }

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task and its logs?')) return

    try {
      setActionError('')
      await apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' })
      setTaskLogs((current) => {
        const next = { ...current }
        delete next[taskId]
        return next
      })
      await loadTasks()
      await loadSummary()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to delete task')
    }
  }

  const loadTaskLogs = async (taskId: string) => {
    try {
      setActionError('')
      const data = await apiRequest<{ success: boolean; logs: TimeLog[] }>(`/api/tasks/${taskId}/logs`)
      setTaskLogs((current) => ({ ...current, [taskId]: data.logs }))
      setExpandedLogsTaskId(taskId)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to load time logs')
    }
  }

  const loadAllLogs = async () => {
    try {
      setActionError('')
      const data = await apiRequest<{ success: boolean; logs: TimeLog[] }>('/api/tasks/logs')
      setAllLogs(data.logs)
      setShowAllLogs(true)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to load time logs')
    }
  }

  const currentElapsed = activeTaskId ? activeElapsedMs : 0

  if (bootstrapping) {
    return <div className="loading-state">Loading TTT dashboard...</div>
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <span className="eyebrow">TTT</span>
            <h1>Task & Time Tracker</h1>
          </div>

          <div className="auth-toggle">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            {mode === 'register' && (
              <label>
                <span>Name</span>
                <input
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Your name"
                  required={mode === 'register'}
                />
              </label>
            )}

            <label>
              <span>Email</span>
              <input
                type="email"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Enter your password"
                required
              />
            </label>

            {authError && <p className="error-message">{authError}</p>}

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Processing...' : mode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div>
          <span className="eyebrow">TTT</span>
          <h2>Welcome back</h2>
        </div>

        <div className="profile-card">
          <strong>{user.name}</strong>
          <small>{user.email}</small>
        </div>

        <div className="summary-strip">
          <div>
            <span>Today</span>
            <strong>{summary.tasksWorkedOn}</strong>
          </div>
          <div>
            <span>Tracked</span>
            <strong>{formatDuration(summary.totalTrackedMs)}</strong>
          </div>
          <div>
            <span>Done</span>
            <strong>{summary.completedTasks}</strong>
          </div>
        </div>

        <div className="summary-grid">
          <div>
            <span>Tasks today</span>
            <strong>{summary.tasksWorkedOn}</strong>
          </div>
          <div>
            <span>Total time</span>
            <strong>{formatDuration(summary.totalTrackedMs)}</strong>
          </div>
          <div>
            <span>Completed</span>
            <strong>{summary.completedTasks}</strong>
          </div>
          <div>
            <span>In progress</span>
            <strong>{summary.inProgressTasks}</strong>
          </div>
        </div>

        <button type="button" className="secondary-button" onClick={handleLogout}>
          Logout
        </button>
      </aside>

      <main className="main-panel">
        {actionError && <p className="action-error">{actionError}</p>}
        <section className="task-creator">
          <h3>{editingTaskId ? 'Edit task' : 'Create task'}</h3>
          <form onSubmit={handleTaskSubmit} className="task-form">
            <div className="task-form-header">
              <input
                value={taskForm.title}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="follow up with designer"
                required
              />
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  const suggested = makeTaskSuggestion(taskForm.title)
                  setTaskForm((current) => ({
                    ...current,
                    title: suggested.title || current.title,
                    description: suggested.description || current.description,
                  }))
                }}
              >
                AI suggest
              </button>
            </div>

            <textarea
              value={taskForm.description}
              onChange={(event) =>
                setTaskForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Add a short description"
              rows={3}
            />
            <div className="task-form-row">
              <select
                value={taskForm.status}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    status: event.target.value as TaskStatus,
                  }))
                }
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <div className="task-form-actions">
                {editingTaskId && (
                  <button type="button" className="secondary-button" onClick={cancelTaskEdit}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="primary-button">
                  {editingTaskId ? 'Save changes' : 'Add task'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section className="task-list-panel">
          <div className="panel-header">
            <h3>Tasks</h3>
            <div className="panel-header-actions">
              <span>{tasks.length} in list</span>
              <button
                type="button"
                className="ghost-button compact-button"
                onClick={() => (showAllLogs ? setShowAllLogs(false) : void loadAllLogs())}
              >
                {showAllLogs ? 'Hide all logs' : 'All logs'}
              </button>
            </div>
          </div>

          <div className="task-list">
            {tasks.length === 0 && (
              <div className="empty-state">No tasks yet. Create your first task to get started.</div>
            )}

            {tasks.map((task) => {
              const isRunning = task.isTimerRunning || activeTaskId === task._id
              const timerDisplay = isRunning ? formatDuration(currentElapsed) : formatDuration(task.totalTrackedMs)

              return (
                <article key={task._id} className="task-card">
                  <div className="task-header">
                    <div>
                      <h4>{task.title}</h4>
                      <p>{task.description || 'No description added yet.'}</p>
                    </div>
                    <span className={`status-badge ${task.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {task.status}
                    </span>
                  </div>

                  <div className="task-meta">
                    <span>Tracked: {timerDisplay}</span>
                    <span>{task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'Not updated'}</span>
                  </div>

                  <div className="task-actions">
                    <button type="button" className="secondary-button" onClick={() => toggleTimer(task)}>
                      {isRunning ? 'Stop timer' : 'Start timer'}
                    </button>
                    <button type="button" className="ghost-button" onClick={() => startTaskEdit(task)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        expandedLogsTaskId === task._id
                          ? setExpandedLogsTaskId(null)
                          : void loadTaskLogs(task._id)
                      }
                    >
                      {expandedLogsTaskId === task._id ? 'Hide logs' : 'View logs'}
                    </button>
                    <select
                      value={task.status}
                      onChange={(event) =>
                        void updateTaskStatus(task._id, event.target.value as TaskStatus)
                      }
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                    <button type="button" className="danger-button" onClick={() => void deleteTask(task._id)}>
                      Delete
                    </button>
                  </div>

                  {expandedLogsTaskId === task._id && (
                    <div className="time-log-list">
                      {(taskLogs[task._id] ?? []).length === 0 ? (
                        <span>No tracked sessions yet.</span>
                      ) : (
                        (taskLogs[task._id] ?? []).map((log) => (
                          <div key={log._id}>
                            <span>{new Date(log.startedAt).toLocaleString()}</span>
                            <strong>{formatDuration(log.durationMs)}</strong>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>

          {showAllLogs && (
            <div className="all-logs-panel">
              <div className="panel-header">
                <h3>All sessions</h3>
                <span>{allLogs.length} total</span>
              </div>
              {allLogs.length === 0 ? (
                <div className="empty-state">No tracked sessions yet.</div>
              ) : (
                <div className="time-log-list">
                  {allLogs.map((log) => (
                    <div key={log._id}>
                      <span>
                        {tasks.find((task) => task._id === log.taskId)?.title ?? 'Task'}{' '}
                        · {new Date(log.startedAt).toLocaleString()}
                      </span>
                      <strong>{formatDuration(log.durationMs)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
