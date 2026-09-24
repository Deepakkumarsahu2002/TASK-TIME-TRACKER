# TTT - Task & Time Tracker

TTT is a full-stack productivity app for creating tasks, tracking work sessions, and reviewing daily progress.

## Features

- Registration and login with JWT HTTP-only cookies
- Protected API routes and user-owned task data
- Task creation, editing, status changes, and deletion
- Single active timer per user with persisted time logs
- Per-task time-log history
- Daily productivity summary
- Responsive React dashboard with task suggestions and error states

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

## Deployment

Deploy the frontend to Vercel or Netlify, the backend to Render, Railway, or Azure App Service, and use MongoDB Atlas for production persistence. Set `MONGODB_URI`, `JWT_SECRET`, `PORT`, and the frontend `VITE_API_URL` in the hosting providers' environment settings. Configure the backend CORS origin to the deployed frontend URL before production deployment.

There is no public demo URL in this repository yet.
