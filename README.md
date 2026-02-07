# 🎯 Oracle & Soheil Kanban

A simple Kanban project management board for Oracle (AI assistant) and Soheil.

## Features

- **Three columns**: Backlog → In Progress → Done
- **Owner identification**: Purple for Oracle 🤖, Green for Soheil 👤
- **Drag-and-drop**: Move tasks between columns
- **Priority levels**: Low (green), Medium (yellow), High (red)
- **REST API**: Full CRUD operations
- **SQLite persistence**: Data stored in `kanban.db`

## Quick Start

```bash
# Development mode (auto-reload)
npm run dev

# Production
npm run build
npm start
```

Server runs at: **http://0.0.0.0:3456**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| PATCH | `/api/tasks/:id/move` | Move task (status/position) |

## Task Schema

```json
{
  "title": "Task title",
  "description": "Optional description",
  "owner": "oracle | soheil",
  "priority": 1-3,
  "status": "backlog | in_progress | done"
}
```

## Keyboard Shortcuts

- `Ctrl+N`: New task
- `Escape`: Close modal
