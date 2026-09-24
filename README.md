# TTT — Task & Time Tracker

TTT is a full-stack productivity app for creating tasks, tracking work sessions, and reviewing daily progress. This project includes secure authentication, user-specific task ownership, timer-based time tracking, and a responsive dashboard UI.

## Live demo

This workspace is set up for local development and has not been published to a public hosting platform in this environment.

## Tech stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: MongoDB Atlas / Mongoose
- Auth: JWT in an HTTP-only cookie
- Validation: Zod
- Security: bcrypt + protected routes + user ownership checks

## Features implemented

- Secure signup and login
- Logout with cookie clearing
- Protected routes for authenticated users only
- Task creation, listing, editing, deletion, and status changes
- Start/stop timer flow for each task
- Daily productivity summary endpoint
- Responsive dashboard UI for auth and task management

## Project structure

- frontend/ — React app
- backend/ — Express API
- README.md — project overview and setup guide

## Local setup

1. Install backend dependencies

   cd backend
   npm install

2. Configure environment variables

   Copy .env.example to .env and fill in values:

   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_secure_secret

3. Start the backend

   npm run dev

4. Install frontend dependencies

   cd ../frontend
   npm install

5. Start the frontend

   npm run dev

6. Open the app in the browser

   http://localhost:5173

The backend runs on:

http://localhost:5000

## API overview

### Auth

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/logout

### Tasks

- GET /api/tasks
- POST /api/tasks
- PATCH /api/tasks/:id
- DELETE /api/tasks/:id
- POST /api/tasks/:id/start
- POST /api/tasks/:id/stop
- GET /api/tasks/summary/daily

## Example auth flow

Register:

{
  "name": "Deepak",
  "email": "deepak@example.com",
  "password": "Test@1234"
}

Login:

{
  "email": "deepak@example.com",
  "password": "Test@1234"
}

## Notes

- Each task belongs to the authenticated user
- Protected routes reject unauthenticated requests with a 401 response
- Time log entries are persisted with start and stop timestamps
- Daily summary aggregates tracked work for the current day

## Deployment guidance

To deploy this app in production, host:

- the React frontend on Vercel or Netlify
- the Express API on Render, Railway, or Azure App Service
- MongoDB Atlas for the database
- environment variables for MONGODB_URI and JWT_SECRET

## Demo credentials

A local demo user can be created through the register form in the app. No fixed production credential is included in this environment.


Timer:
01:24:36

        [ Stop ]

Every start/stop session will create a time log.

For example:

Task
 ├── Session 1 → 25 minutes
 ├── Session 2 → 40 minutes
 └── Session 3 → 15 minutes

Total → 1 hour 20 minutes

Users will also be able to view their individual time logs.

📊 Planned Daily Summary

The application will provide a daily productivity dashboard containing:

Tasks worked on today
Total time tracked
Tasks completed
Tasks still pending
Tasks currently in progress

Example:

Today's Productivity

Total Time       4h 32m
Tasks Worked     6
Completed        3
In Progress      2
Pending          1
🤖 Optional AI Task Enhancement

The application may optionally use an AI API to improve natural-language task descriptions.

Example input:

follow up with designer

Possible generated result:

Title

Follow up with UI Designer

Description

Contact the UI designer to confirm the current
wireframe delivery status.

This feature is optional and will be implemented after the core application is functional.

🔒 Security & Authorization

The backend will enforce authentication on protected endpoints.

Every protected request will follow:

Request
   ↓
JWT cookie
   ↓
Authentication middleware
   ↓
Identify user
   ↓
Controller
   ↓
Verify resource ownership
   ↓
Database operation

This ensures that users can only access their own:

Tasks
Time logs
Productivity information
🧪 API Design

The backend will use REST APIs.

Planned API structure:

/api/auth
    POST   /register
    POST   /login
    POST   /logout
    GET    /me

/api/tasks
    GET    /
    POST   /
    GET    /:id
    PUT    /:id
    DELETE /:id

/api/time-logs
    GET    /
    POST   /
    PUT    /:id
    DELETE /:id

/api/summary
    GET    /daily

All protected endpoints will require authentication.

🚀 Development Roadmap
Phase 1 — Foundation
 Project initialization
 TypeScript configuration
 MongoDB connection
 Environment configuration
 Basic Express server
Phase 2 — Authentication
 User model
 Registration
 Password hashing
 Login
 JWT generation
 HTTP-only authentication cookie
 Authentication middleware
 /me endpoint
 Logout
 Frontend authentication
Phase 3 — Task Management
 Task model
 Create task
 View tasks
 Update task
 Delete task
 Status management
 User-specific authorization
Phase 4 — Time Tracking
 Time log model
 Start timer
 Stop timer
 Store sessions
 Calculate total task time
 View time logs
Phase 5 — Productivity Dashboard
 Today's tasks
 Total tracked time
 Completed tasks
 Pending tasks
 In-progress tasks
 Productivity charts
Phase 6 — Frontend
 Login page
 Registration page
 Dashboard
 Task interface
 Task creation/editing
 Timer interface
 Time-log interface
 Daily summary
 Responsive design
 Loading/error/empty states
Phase 7 — Optional Enhancements
 AI task enhancement
 Weekly productivity summary
 Productivity charts
 Reminders
Phase 8 — Production
 Production environment configuration
 Backend deployment
 Frontend deployment
 MongoDB production configuration
 CORS configuration
 Production authentication testing
 README completion
 Screenshots
 Final API testing
💻 Local Development
Backend

Navigate to:

cd Backend

Install dependencies:

npm install

Create .env:

PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

Start the development server:

npx tsx src/server.ts

Backend:

http://localhost:5000

Health check:

GET /api/health
Frontend

Navigate to:

cd Frontend

Install dependencies:

npm install

Start development server:

npm run dev

Frontend:

http://localhost:5173
🔐 Environment Variables

Never commit .env to GitHub.

Example:

PORT=5000
MONGODB_URI=
JWT_SECRET=

The actual .env file should remain local.

🧠 Learning Objectives

This project is designed to demonstrate practical understanding of:

React
TypeScript
Node.js
Express
REST API architecture
MongoDB
Mongoose
Authentication
JWT
HTTP-only cookies
bcrypt
Zod validation
CRUD operations
Authorization
API error handling
Frontend/backend communication
Real-time timers
Deployment
📌 Project Status

Status: 🚧 In Development

The authentication foundation and database integration are currently implemented. Task management, time tracking, productivity dashboard, frontend integration, and deployment are the next development stages.

Git Commit Progress

Current development is being maintained with meaningful commits.

Example commit history:

chore: set up full stack project foundation

Planned commits:

feat: add user authentication
feat: add task management
feat: implement task time tracking
feat: add daily productivity dashboard
feat: add AI task enhancement
style: improve dashboard and task interface
test: add API validation tests
chore: prepare application for production
docs: add project setup and deployment guide
👨‍💻 Project Purpose

TTT is being developed as a practical full-stack application rather than a simple CRUD demonstration.

The central idea is:

Create tasks → work on them → track the time spent → understand daily productivity.

The application combines task management, authentication, time tracking, and productivity analytics into one system while maintaining secure user-level data isolation.


### One important thing

**Don't commit this README yet if you want the commit history to remain clean.** We can keep it as our project documentation draft while we build.

Our immediate development position is:

**Registration ✅ → Login ✅ → JWT cookie ✅ → Auth middleware 🔄 → Tasks → Timer → Dashboard → Frontend → Deployment**

And the next coding step remains the **protected `/api/auth/me` endpoint**, which will prove that our JWT middleware can correctly identify the logged-in user.