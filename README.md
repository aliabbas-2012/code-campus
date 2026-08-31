# Code Campus - Online Python Learning Platform

Phase 1 of an online Python learning platform where students write, organize, save, and run Python code directly from a web browser.

## Technology Stack

- **Frontend**: Next.js 14+ with TypeScript, React, Tailwind CSS, shadcn/ui, Monaco Editor
- **Backend**: Next.js Route Handlers with a framework-agnostic `/server` layer
- **Database**: PostgreSQL 16 with Prisma ORM
- **Auth**: NextAuth (Credentials provider with bcrypt)
- **Code Execution**: Pyodide (Python in browser via Web Worker)
- **State Management**: Zustand (UI state), TanStack Query (server state)
- **Testing**: Vitest + Testing Library

## Architecture

The project is organized into clear layers:

```
/src
  /app                    # Pages and route handlers (Next.js App Router)
  /server
    /services             # Business logic (WorkspaceService, ProjectService, FileService)
    /storage              # Storage abstraction (IStorageService, LocalFilesystemStorage)
    /execution            # Code execution abstraction (client-side Pyodide for Phase 1)
    /validation           # Zod schemas (shared client/server)
    /errors               # Typed error classes
  /components             # React components (organized by feature)
  /lib                    # Utilities (auth.ts, config.ts, prisma.ts)
  /workers                # Web Workers (pyodide.worker.ts for Python execution)
```

The `/server` layer contains **zero Next.js imports** — this is the extraction boundary for a future standalone backend service.

## Database Schema

- **users**: Core user data with role-based access (admin, instructor, student)
- **workspaces**: One per user, with storage quota and usage tracking
- **projects**: Owned by workspaces, organized by students
- **project_files**: File tree structure with folder support, versioning via `updated_at`
- **instructor_students**: Many-to-many relationship for instructor access

## Security Features

- ✅ Path traversal prevention (opaque server-generated storage paths)
- ✅ Filename validation (reject `/`, `\`, `..`, control characters)
- ✅ Quota enforcement with transactional locking
- ✅ Optimistic concurrency (conflict detection on file updates)
- ✅ Role-based authorization (enforced at service layer, never in UI)
- ✅ Instructor read-only access (no write methods exposed)
- ✅ Per-file size limits independent of quota

## Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended for better TypeScript support)
- Docker & Docker Compose (for PostgreSQL)
- npm or yarn

### Installation

1. **Clone and install**:
   ```bash
   git clone <repo>
   cd code-campus
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env.local
   ```

3. **Start PostgreSQL**:
   ```bash
   docker-compose up postgres
   # In another terminal:
   npm run prisma:push   # Create tables
   ```

4. **Run dev server**:
   ```bash
   npm run dev
   ```

5. **Open browser**:
   ```
   http://localhost:3000
   ```

### Database Commands

- **Create/apply migrations**: `npm run prisma:migrate`
- **Push schema without migrations**: `npm run prisma:push`
- **Prisma Studio** (GUI): `npm run prisma:studio`
- **Generate Prisma Client**: `npm run prisma:generate`

### Build for Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test           # Run all tests
npm run test:ui    # Run with UI
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `NEXTAUTH_SECRET` | Auth.js session secret | Required (change in production) |
| `NEXTAUTH_URL` | Auth.js URL | http://localhost:3000 |
| `STORAGE_BASE_PATH` | Base path for file storage | ./storage |
| `MAX_FILE_SIZE_MB` | Max single file size | 10 |
| `DEFAULT_STORAGE_QUOTA_MB` | Default quota per user | 500 |
| `SESSION_TIMEOUT_MINUTES` | Session duration | 1440 (24h) |
| `NEXT_PUBLIC_PYODIDE_CDN_URL` | Pyodide CDN URL | https://cdn.jsdelivr.net/pyodide/v0.23.4/full/ |

## Phase 1 Features

### Student Workspace
- ✅ Create and manage projects
- ✅ File tree with folders and files
- ✅ Support for `.py`, `.txt`, `.md`, `.json`, `.csv` files
- ✅ Monaco editor with Python syntax highlighting
- ✅ Autosave (debounced)
- ✅ Storage quota tracking
- ✅ Run Python code via Pyodide in Web Worker

### Instructor Access
- ✅ View assigned students (via `instructor_students` join)
- ✅ View student projects (read-only)
- ✅ View files and code (read-only)

### Admin Dashboard
- ⏳ Manage users and roles
- ⏳ View all workspaces
- ⏳ Configure system settings

## Future Phases (Not Implemented)

The schema and interfaces are designed to support these without rewriting:

- **Phase 2**: Instructor assignments and grading
- **Phase 3**: Code comments and collaboration
- **Phase 4**: Submission history and version control
- **Phase 5**: Docker-based remote execution
- **Phase 6**: SSH access and virtual environments
- **Phase 7**: Package installation and pip integration

## API Endpoints (Phase 1)

### Authentication
- `POST /api/auth/signin` — Login
- `POST /api/auth/signout` — Logout

### Workspace
- `GET /api/workspace` — Get workspace info
- `GET /api/workspace/storage` — Get storage usage

### Projects
- `GET /api/projects` — List projects
- `POST /api/projects` — Create project
- `GET /api/projects/{id}` — Get project
- `PATCH /api/projects/{id}` — Update project
- `DELETE /api/projects/{id}` — Delete project

### Files
- `GET /api/projects/{id}/files` — List files in project
- `POST /api/projects/{id}/files` — Create file or folder
- `GET /api/files/{id}` — Get file content
- `PATCH /api/files/{id}` — Update file (content or name)
- `DELETE /api/files/{id}` — Delete file

### Instructor (Read-Only)
- `GET /api/instructor/students` — List assigned students
- `GET /api/instructor/students/{studentId}/projects` — List student projects
- `GET /api/instructor/projects/{projectId}` — View student project

## Code Examples

### Creating a Project
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Project", "description": "Learning Python"}'
```

### Creating a File
```bash
curl -X POST http://localhost:3000/api/projects/{projectId}/files \
  -H "Content-Type: application/json" \
  -d '{
    "name": "hello.py",
    "content": "print(\"Hello, World!\")"
  }'
```

### Updating a File
```bash
curl -X PATCH http://localhost:3000/api/files/{fileId} \
  -H "Content-Type: application/json" \
  -d '{"content": "print(\"Updated!\")"}'
```

## Error Handling

All API errors follow this format:
```json
{
  "message": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

Common codes:
- `UNAUTHORIZED` — Not logged in
- `FORBIDDEN` — Access denied
- `NOT_FOUND` — Resource not found
- `VALIDATION_ERROR` — Input validation failed
- `STORAGE_QUOTA_EXCEEDED` — Not enough storage
- `CONFLICT` — Optimistic concurrency failure (file modified)
- `SECURITY_ERROR` — Path traversal or malicious input

## Deployment

### Docker (Recommended)
```bash
docker-compose -f docker-compose.yml up
```

### Heroku
```bash
heroku create code-campus
heroku config:set DATABASE_URL=your_postgresql_url
heroku config:set NEXTAUTH_SECRET=your_secret
git push heroku main
```

### Vercel
1. Push to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

## Development

### Running Linter
```bash
npm run lint
```

### Fixing Linting Issues
```bash
npm run lint -- --fix
```

### Debugging

Enable debug logs:
```bash
DEBUG=* npm run dev
```

### TypeScript Strict Mode

The project uses strict TypeScript (`strict: true`). All types must be properly annotated.

## Contributing

1. Follow TypeScript strict mode rules
2. Add tests for new services
3. Keep `/server` layer free of Next.js imports
4. Document API endpoints in README
5. Update Prisma schema with migrations

## License

MIT
