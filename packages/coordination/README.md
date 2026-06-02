# Statuz Coordination Pool

## What is this?

The **Coordination Pool** is the optional cloud service that enables cross-project agent communication in the Statuz ecosystem.

- **Signal Hub**: Send and receive signals between projects
- **SYN Queue**: Human-in-the-loop decision making for strategic changes
- **Ecosystem View**: Optional dashboard (coming soon)

## Quick Start

### 1. Run locally (Node.js)

```bash
cd packages/coordination
npm install
npm run dev
```

Visit: http://localhost:3000

### 2. Run with Docker Compose

```bash
cd packages/coordination
docker-compose up -d
```

## API Endpoints

### Signal Hub

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/signals` | Send a signal |
| `GET` | `/api/v1/signals` | Get signals (optional `?projectId=...`) |

### SYN Queue

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/syn/requests` | Create a SYN request |
| `GET` | `/api/v1/syn/requests` | Get SYN requests (optional filters) |
| `PATCH` | `/api/v1/syn/requests/:id` | Update SYN status |

### Health Check

| Method | Endpoint |
|--------|----------|
| `GET` | `/health` | Health check |

## Example Usage

### Send a Signal

```bash
curl -X POST http://localhost:3000/api/v1/signals \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dependency.changed",
    "projectId": "statuz",
    "source": "git-hook",
    "payload": {
      "dependency": "@statuz/sdk-ts",
      "version": "0.5.0"
    }
  }'
```

### Create a SYN Request

```bash
curl -X POST http://localhost:3000/api/v1/syn/requests \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Refactor niche layer",
    "description": "Should we merge niche and statuz?",
    "projectId": "statuz",
    "evidence": { "signals": [...] },
    "options": [
      { "option": "merge", "reason": "simpler" },
      { "option": "keep-separate", "reason": "cleaner" }
    ]
  }'
```

## Data Storage

Data is stored in `data/signals.json` and `data/syn-requests.json` (file-based for simplicity).

## Architecture

```
packages/coordination/
├── src/
│   ├── index.ts        - Main entry (Express server)
│   ├── types/          - TypeScript interfaces
│   ├── storage/        - File-based storage
│   └── routes/         - API routes
├── Dockerfile
└── docker-compose.yml
```

## License

Apache-2.0
