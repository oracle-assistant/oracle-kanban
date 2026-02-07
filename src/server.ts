import express, { Request, Response } from 'express';
import Database from 'better-sqlite3';
import path from 'path';

const app = express();
const PORT = 3456;

// Initialize SQLite database
const db = new Database(path.join(__dirname, '..', 'kanban.db'));

// Create tasks table
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    owner TEXT CHECK(owner IN ('oracle', 'soheil')) NOT NULL,
    priority INTEGER DEFAULT 1,
    status TEXT CHECK(status IN ('backlog', 'in_progress', 'done')) DEFAULT 'backlog',
    position INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Get all tasks
app.get('/api/tasks', (req: Request, res: Response) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY status, position, id').all();
  res.json(tasks);
});

// Create task
app.post('/api/tasks', (req: Request, res: Response) => {
  const { title, description, owner, priority, status } = req.body;
  
  if (!title || !owner) {
    return res.status(400).json({ error: 'Title and owner are required' });
  }
  
  if (!['oracle', 'soheil'].includes(owner)) {
    return res.status(400).json({ error: 'Owner must be "oracle" or "soheil"' });
  }
  
  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, owner, priority, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    title,
    description || '',
    owner,
    priority || 1,
    status || 'backlog'
  );
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// Update task
app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, owner, priority, status, position } = req.body;
  
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const stmt = db.prepare(`
    UPDATE tasks 
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        owner = COALESCE(?, owner),
        priority = COALESCE(?, priority),
        status = COALESCE(?, status),
        position = COALESCE(?, position),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(
    title ?? null,
    description ?? null,
    owner ?? null,
    priority ?? null,
    status ?? null,
    position ?? null,
    id
  );
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(task);
});

// Delete task
app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.status(204).send();
});

// Move task (update status and position)
app.patch('/api/tasks/:id/move', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, position } = req.body;
  
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const stmt = db.prepare(`
    UPDATE tasks 
    SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(status, position || 0, id);
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(task);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎯 Kanban server running at http://0.0.0.0:${PORT}`);
});
