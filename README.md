# Lavadero — Phase 0

This repository contains the Phase 0 skeleton for the Lavadero Operations Platform.

Structure

- /api — Spring Boot 3 backend (Java 21)
- /web — Vite + React 18 + TypeScript frontend
- docker-compose.yml — Postgres database for local development

Local setup

Requirements
- Java 21
- Maven (or use the included mvnw)
- Node 18+ & npm/yarn (for frontend)
- Docker (for Postgres and tests)

Start Postgres:
```bash
docker compose up -d
```

Run backend (in repo root):
```bash
chmod +x ./mvnw
SPRING_PROFILES_ACTIVE=local ./mvnw spring-boot:run
```

Build & run frontend (from `/web`):
```bash
cd web
npm install
npm run dev
```

Health check
- Backend: GET /api/v1/health -> { "status": "ok" }
- Frontend home page calls that endpoint and displays the status.
