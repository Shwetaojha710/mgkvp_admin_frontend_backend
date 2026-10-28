# University Admin Clone (MGKVP-style)

Independent university administration website inspired by the accessible UI of [mgkvp.ac.in/Admin](https://mgkvp.ac.in/Admin).

**This project never writes to the production MGKVP website or database.**  
All CRUD and uploads operate only on the local `UniversityAdminClone` MSSQL database and files under `backend/src/uploads/`.

## Reference inspection (read-only)

Accessible modules observed on the reference admin (session-based):

| Area | Examples |
|------|----------|
| Login | `/Home/Login` — Login Id, Password, Captcha |
| Dashboard | Welcome card, dark icon sidebar, topbar profile |
| HOME | Banner, News Event, Album, Gallery, Highlights, … |
| THE UNIVERSITY | Notice Board, About/Vision pages, Documents, … |
| ADMINISTRATION | User Master, Officers, Councils, … |
| ACADEMICS / STUDENT / … | Courses, admissions, exams, … |

**Implemented in this clone** (matching reference workflows where verified):

- Admin login / logout / protected routes  
- Dashboard layout (sidebar, topbar, welcome)  
- Departments, Faculty, Notices, News & Events, Pages, Banners, Galleries, Documents  
- Full CRUD, search/filter/pagination, publish flags, file upload/replace/delete  

## Project structure

```text
university-admin/
├── frontend/     # React + Vite
├── backend/      # Node + Express API
└── database/     # schema.sql, seed notes, migrations/
```

## Prerequisites

- Node.js 20+
- Microsoft SQL Server (local or remote) with permission to create `UniversityAdminClone`

## 1. Database setup

1. Open SQL Server Management Studio (or `sqlcmd`).
2. Run `database/schema.sql` to create `UniversityAdminClone` and tables.
3. Optionally run `database/seed-admin.sql` for the default department row.
4. Copy `backend/.env.example` → `backend/.env` and set **clone** credentials only:

```env
DB_NAME=UniversityAdminClone
DB_SERVER=localhost
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=a_long_random_secret
FRONTEND_URL=http://localhost:5173
```

> Do **not** set `DB_NAME` to a production MGKVP database. The API refuses to start if the name looks like production MGKVP.

5. Seed the admin user (bcrypt hash):

```bash
cd backend
npm install
npm run seed
```

Default development credentials (change after first login):

- Username: `admin`
- Password: `Admin@12345`

## 2. Backend

```bash
cd backend
npm install
npm run dev
```

- API: http://localhost:5000  
- Health: http://localhost:5000/api/health  

### Main API routes

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET|POST          /api/departments
GET|PUT|DELETE    /api/departments/:id

GET|POST          /api/banners
GET|PUT|DELETE    /api/banners/:id

… same pattern for notices, news-events, faculty, pages, galleries, documents
```

Uploads are stored under `backend/src/uploads/{banners|notices|news|faculty|galleries|documents}/`.

## 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

- App: http://localhost:5173  
- Login: http://localhost:5173/login  

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_UPLOAD_BASE_URL=http://localhost:5000
```

## Safety rules

1. Inspection of mgkvp.ac.in is **read-only** — never submit add/edit/delete/upload forms there.  
2. This app’s write APIs target **UniversityAdminClone** only.  
3. Uploaded files stay in this project’s `backend/src/uploads`.  
4. Never commit `.env` or real credentials.

## Tech stack

- Frontend: React, Vite, React Router, Axios, React Hook Form, React Toastify, React Icons  
- Backend: Express, mssql, JWT, bcryptjs, Multer, Helmet, CORS, rate limiting  
- Database: Microsoft SQL Server  

## Verification checklist

- [ ] Login with seeded admin; reject bad passwords  
- [ ] Protected `/admin` routes redirect when logged out  
- [ ] Create/edit/delete a Banner (with image) — row appears in clone DB  
- [ ] Upload replace deletes old local file only after DB update  
- [ ] Search, filter, pagination work on list pages  
- [ ] `/api/health` returns OK; frontend and backend start independently  
