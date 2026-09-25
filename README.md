# TTT - Task & Time Tracker

TTT is a full-stack productivity app for creating tasks, tracking work sessions, and reviewing daily progress.

## Features

- Registration and login with JWT HTTP-only cookies
- Protected API routes and user-owned task data
- Task creation, editing, status changes, and deletion
- Single active timer per user with persisted time logs
- Per-task and all-session time-log history
- Daily productivity summary
- Responsive React dashboard with task suggestions and error states

### Task and timer rules

- A new or paused task can be started only while its status is `Pending`.
- A running task shows `Stop timer` and stores a time-log session when stopped.
- Marking a running task as `Completed` closes its active session automatically.
- Completed tasks cannot be started again.
- Only one timer can run for a user at a time; starting another task closes the previous session.

### Task suggestions

The `AI suggest` action is a local, deterministic assistant that works without an API key. It recognizes common intents such as follow-ups, meetings, messages, reviews, bugs, research, and planning, then generates a clearer title and an action-focused description with an expected outcome.

Example:

```text
Input:       follow up with designer
Title:       Follow up with UI Designer
Description: Send a Slack message to confirm the current wireframe delivery status,
			 ask about blockers, and agree on the next review date.
```

## Stack

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, TypeScript
- Database: MongoDB with Mongoose
- Validation: Zod
- Password security: bcrypt

## Project Structure

```text
frontend/   React application
backend/    Express API
```

## Local Setup

### Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Set these values in `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_SECRET=replace_with_a_long_random_secret
CORS_ORIGIN=http://localhost:5173
```

Start the API:

```powershell
npm run dev
```

The API runs at `http://localhost:5000`. Check it with `GET /api/health`.

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

`frontend/.env` may set:

```env
VITE_API_URL=http://localhost:5000
```

Open `http://localhost:5173`.

## API

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account and start a session |
| POST | `/api/auth/login` | Start a session |
| GET | `/api/auth/me` | Return the authenticated user |
| POST | `/api/auth/logout` | Clear the session cookie |

### Tasks and Time Logs

All task endpoints require the authentication cookie.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/tasks` | List the current user's tasks |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task and its logs |
| GET | `/api/tasks/logs` | List every time log for the current user |
| GET | `/api/tasks/:id/logs` | List a task's time logs |
| POST | `/api/tasks/:id/start` | Start tracking time |
| POST | `/api/tasks/:id/stop` | Stop tracking time |
| GET | `/api/tasks/summary/daily` | Return today's productivity summary |

## Verification

Run the backend typecheck:

```powershell
cd backend
npx tsc --noEmit
```

Build and lint the frontend:

```powershell
cd frontend
npm run build
npm run lint
```

Run the production backend locally:

```powershell
cd backend
npm run build
npm start
```

The frontend production output is written to `frontend/dist`.

## Security Notes

- Never commit `.env` files, database credentials, or production JWT secrets.
- Use a separate long random `JWT_SECRET` in production.
- Rotate any credential that has been shared in chat, screenshots, logs, or source control.
- Set `CORS_ORIGIN` to the exact deployed frontend origin; do not use `*` with credentialed cookies.
- Production authentication requires HTTPS because the session cookie is `Secure` and cross-origin cookies use `SameSite=None`.

## Deployment

The repository includes `render.yaml` for a Render deployment containing one Node API service and one static frontend service.

Current backend deployment:

```text
https://task-time-tracker-o6jt.onrender.com
```

Health check: `https://task-time-tracker-o6jt.onrender.com/api/health`

Current frontend deployment:

```text
https://task-time-tracker-1-g7sv.onrender.com
```

For Render:

1. Push this repository to GitHub and create a new Blueprint from the repository.
2. Set `VITE_API_URL=https://task-time-tracker-o6jt.onrender.com` for the frontend service.
3. Set `CORS_ORIGIN=https://task-time-tracker-1-g7sv.onrender.com` in the API service and redeploy the API.
4. Set `MONGODB_URI` to a MongoDB Atlas connection string.
5. Keep `NODE_ENV=production` so the authentication cookie uses `Secure` and `SameSite=None` for the separate frontend and API origins.
6. Verify `https://<api-host>/api/health` before testing registration and login from the frontend.

The frontend can also be deployed to Vercel or Netlify with `npm run build` and `dist` as the publish directory. The backend production commands are:

```powershell
cd backend
npm ci
npm run build
npm start
```

The public demo is available at `https://task-time-tracker-1-g7sv.onrender.com`.

## Troubleshooting

### Frontend shows authentication errors

Confirm that `VITE_API_URL` points to the deployed API and that the API's `CORS_ORIGIN` exactly matches the frontend URL. Redeploy both services after changing build-time frontend variables.

### Backend does not start

Confirm that `MONGODB_URI` and `JWT_SECRET` are set in the API service. Check the API health endpoint and the Render service logs. The backend waits for MongoDB before it begins listening.

### Local development uses stale frontend configuration

Vite reads `VITE_API_URL` when the dev server starts. Stop and restart `npm run dev` after changing `frontend/.env`.

## Project Status

The core application is implemented and deployed. The current production services are the Render URLs listed above. Automated unit tests are not included yet; verification currently uses TypeScript checks, frontend build/lint, API smoke tests, and browser workflow checks.
