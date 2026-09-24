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
  updatedAt?: string
}

type Summary = {
  tasksWorkedOn: number
  totalTrackedMs: number
  completedTasks: number
  pendingTasks: number
  inProgressTasks: number
}

const API_URL = 'http://localhost:5000'

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
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
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

  const loadTasks = async () => {
    const data = await apiRequest<{ success: boolean; tasks: Task[] }>('/api/tasks')
    setTasks(data.tasks)
    const runningTask = data.tasks.find((task) => task.status === 'In Progress')
    if (runningTask) {
      setActiveTaskId(runningTask._id)
      setTimerStartedAt(Date.now())
    } else {
      setActiveTaskId(null)
      setTimerStartedAt(null)
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
        await fetchCurrentUser()
      } finally {
        setBootstrapping(false)
      }
    }

    void bootstrap()
  }, [])

  useEffect(() => {
    if (!activeTaskId || !timerStartedAt) {
      return undefined
    }

    const interval = window.setInterval(() => {
      setTimerStartedAt(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [activeTaskId, timerStartedAt])

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

    try {
      await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: taskForm.title,
          description: taskForm.description,
          status: taskForm.status,
        }),
      })

      setTaskForm({ title: '', description: '', status: 'Pending' })
      await loadTasks()
      await loadSummary()
    } catch (error) {
      console.error(error)
    }
  }

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    await apiRequest(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    await loadTasks()
    await loadSummary()
  }

  const toggleTimer = async (task: Task) => {
    const isRunning = task.status === 'In Progress'

    await apiRequest(`/api/tasks/${task._id}/${isRunning ? 'stop' : 'start'}`, {
      method: 'POST',
    })

    if (isRunning) {
      setActiveTaskId(null)
      setTimerStartedAt(null)
    } else {
      setActiveTaskId(task._id)
      setTimerStartedAt(Date.now())
    }

    await loadTasks()
    await loadSummary()
  }

  const deleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task and its logs?')) return

    await apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' })
    await loadTasks()
    await loadSummary()
  }

  const currentElapsed = activeTaskId && timerStartedAt ? Date.now() - timerStartedAt : 0

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
        <section className="task-creator">
          <h3>Create task</h3>
          <form onSubmit={handleTaskSubmit} className="task-form">
            <input
              value={taskForm.title}
              onChange={(event) =>
                setTaskForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="follow up with designer"
              required
            />
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

              <button type="submit" className="primary-button">
                Add task
              </button>
            </div>
          </form>
        </section>

        <section className="task-list-panel">
          <div className="panel-header">
            <h3>Tasks</h3>
            <span>{tasks.length} in list</span>
          </div>

          <div className="task-list">
            {tasks.length === 0 && (
              <div className="empty-state">No tasks yet. Create your first task to get started.</div>
            )}

            {tasks.map((task) => {
              const isRunning = task.status === 'In Progress' || activeTaskId === task._id
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
                    <span>{new Date(task.updatedAt ?? Date.now()).toLocaleDateString()}</span>
                  </div>

                  <div className="task-actions">
                    <button type="button" className="secondary-button" onClick={() => toggleTimer(task)}>
                      {isRunning ? 'Stop timer' : 'Start timer'}
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
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
