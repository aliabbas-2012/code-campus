# Quick Start Guide - Phase 1 Scaffolding Complete ✅

## Prerequisites

- **Node.js 20+** (the project was scaffolded but requires newer Node.js to build)
- **Docker & Docker Compose** (for PostgreSQL)
- **npm or yarn**

## Step 1: Setup Environment Variables

```bash
# Copy example .env to .env.local
cp .env.example .env.local

# Edit .env.local and update these values:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/code_campus
# NEXTAUTH_SECRET=your-random-secret-here
# NEXTAUTH_URL=http://localhost:3000
```

## Step 2: Start PostgreSQL

```bash
# In terminal 1 - start database
docker-compose up postgres

# Verify it's running
docker ps
# You should see the postgres container
```

## Step 3: Initialize Database

```bash
# In terminal 2 - create tables
npm run prisma:push

# Or if you want migrations tracked:
npm run prisma:migrate

# Verify database
npm run prisma:studio  # Opens GUI at http://localhost:5555
```

## Step 4: Create Demo Users

```bash
# Using Prisma Studio, create test users:

# Admin user:
INSERT INTO "User" (id, email, password_hash, name, role, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  '$2a$10$...', -- bcrypt hash of 'password' (use bcrypt to generate)
  'Admin User',
  'ADMIN',
  'ACTIVE',
  now(),
  now()
);

# Student user:
INSERT INTO "User" (id, email, password_hash, name, role, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'student@example.com',
  '$2a$10$...', -- bcrypt hash of 'password'
  'Student User',
  'STUDENT',
  'ACTIVE',
  now(),
  now()
);

# Instructor user:
INSERT INTO "User" (id, email, password_hash, name, role, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'instructor@example.com',
  '$2a$10$...', -- bcrypt hash of 'password'
  'Instructor User',
  'INSTRUCTOR',
  'ACTIVE',
  now(),
  now()
);
```

### Generating bcrypt hashes

```bash
# Install bcryptjs CLI
npm install -g bcryptjs-cli

# Generate hash for 'password'
bcryptjs hash password
# Output: $2a$10$...

# Or use Node.js:
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('password', 10))"
```

## Step 5: Run Development Server

```bash
# Terminal 3 - start Next.js dev server
npm run dev

# Open browser
# http://localhost:3000
```

## Step 6: Test API Endpoints

```bash
# Get workspace (requires auth)
curl -X GET http://localhost:3000/api/workspace \
  -H "Content-Type: application/json"

# Create project (requires auth)
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Project"}'
```

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Make sure PostgreSQL is running:
```bash
docker-compose up postgres
docker ps  # Verify container is running
```

### TypeScript/Build Errors
```
error TS2688: Cannot find type definition file for 'node'
```
**Solution**: Need Node.js 18+ (20+ recommended). Check version:
```bash
node --version  # Should be v20.x or higher
```

### Port Already in Use
```
Port 3000 is already in use
```
**Solution**: Kill the process or use a different port:
```bash
lsof -i :3000
kill -9 <PID>
# or
npm run dev -- -p 3001
```

## Project Structure

```
code-campus/
├── src/
│   ├── app/                    # Next.js App Router pages & routes
│   │   ├── api/                # API endpoints (route handlers)
│   │   ├── dashboard/          # Student dashboard
│   │   ├── login/              # Login page
│   │   └── layout.tsx          # Root layout
│   ├── server/                 # Backend business logic (NO Next.js imports)
│   │   ├── services/           # WorkspaceService, ProjectService, etc.
│   │   ├── storage/            # Storage abstraction (local/S3/MinIO)
│   │   ├── execution/          # Code execution (client-side Pyodide)
│   │   ├── validation/         # Zod schemas
│   │   └── errors/             # Error classes
│   ├── lib/                    # Utilities (auth, config, prisma)
│   ├── components/             # React components (coming soon)
│   └── workers/                # Web Workers (Pyodide Python execution)
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Auto-generated migrations
├── tests/                      # Unit & integration tests
├── docker-compose.yml          # Local dev database
├── Dockerfile                  # Production image
├── tsconfig.json               # TypeScript config (strict mode)
├── next.config.js              # Next.js config
├── tailwind.config.ts          # Tailwind CSS config
├── .env.example                # Environment variables template
└── README.md                   # Project documentation
```

## Key Commands

```bash
npm run dev                    # Start development server
npm run build                  # Build for production
npm start                      # Start production server
npm run lint                   # Run ESLint
npm test                       # Run tests
npm run prisma:migrate         # Create/apply migrations
npm run prisma:push            # Push schema to DB
npm run prisma:studio          # Open Prisma GUI
npm run prisma:generate        # Generate Prisma Client
```

## Next: Milestone 2

Once the database is set up and the server is running:

1. **Build Project List Page**
   - Fetch projects from `/api/projects`
   - Display in UI with TanStack Query

2. **Create File Manager UI**
   - File tree explorer component
   - Show folder structure

3. **Implement Editor**
   - Monaco Editor for Python syntax
   - File tabs for multiple files
   - Autosave with debouncing

## Phase 1 Feature Checklist

- [x] Scaffolding (Next.js, TypeScript, Tailwind)
- [x] Database schema (Prisma + PostgreSQL)
- [x] Authentication (NextAuth + Credentials)
- [x] Server layer (services, repositories, no Next.js imports)
- [x] Error handling (typed error classes)
- [x] Authorization (role-based, workspace access)
- [x] Workspace management (quota tracking)
- [x] Project CRUD APIs
- [x] File CRUD APIs
- [x] Storage service interface
- [x] Quota enforcement
- [x] Path traversal protection
- [ ] **Next**: Monaco editor UI + autosave
- [ ] File explorer UI
- [ ] Pyodide Web Worker integration
- [ ] Editor UI (tabs, output panel)
- [ ] Instructor dashboard (read-only access)
- [ ] Admin dashboard
- [ ] Tests & documentation

---

**Milestone 1 Status**: ✅ **COMPLETE**

All scaffolding, configuration, database schema, server layer, and API routes are ready.
Database initialization and basic UI are next.
