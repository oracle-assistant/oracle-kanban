/**
 * Test-specific Express app with in-memory database
 */
import express, { Request, Response } from 'express';
import { testDb } from './setup';

const app = express();

app.use(express.json());

// Get all tasks (with optional owner filter)
app.get('/api/tasks', (req: Request, res: Response) => {
  const { owner } = req.query;
  
  let query = 'SELECT * FROM tasks';
  const params: string[] = [];
  
  if (owner && typeof owner === 'string') {
    query += ' WHERE owner = ?';
    params.push(owner);
  }
  
  query += ' ORDER BY status, position, id';
  
  const tasks = testDb.prepare(query).all(...params);
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
  
  if (status && !['backlog', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    const stmt = testDb.prepare(`
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
    
    const task = testDb.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create task' });
  }
});

// Update task
app.put('/api/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, owner, priority, status, position } = req.body;
  
  const existing = testDb.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (owner && !['oracle', 'soheil'].includes(owner)) {
    return res.status(400).json({ error: 'Owner must be "oracle" or "soheil"' });
  }
  
  if (status && !['backlog', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const stmt = testDb.prepare(`
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
  
  const task = testDb.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(task);
});

// Delete task
app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  const existing = testDb.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  testDb.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  res.status(204).send();
});

// Move task (update status and position)
app.patch('/api/tasks/:id/move', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, position } = req.body;
  
  const existing = testDb.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (!status || !['backlog', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required' });
  }
  
  const stmt = testDb.prepare(`
    UPDATE tasks 
    SET status = ?, position = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run(status, position || 0, id);
  
  const task = testDb.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(task);
});

export default app;
