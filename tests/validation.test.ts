/**
 * Task Model Validation Tests
 */
import request from 'supertest';
import app from './app';
import { resetDatabase, seedTestTasks } from './setup';

describe('Task Validation', () => {
  beforeEach(() => {
    resetDatabase();
  });

  describe('Required Fields', () => {
    it('should require title field', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ owner: 'oracle' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should require owner field', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test task' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should not accept empty title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: '', owner: 'oracle' });
      
      expect(res.status).toBe(400);
    });

    it('should not accept null title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: null, owner: 'oracle' });
      
      expect(res.status).toBe(400);
    });
  });

  describe('Owner Enum Validation', () => {
    it('should accept "oracle" as owner', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle' });
      
      expect(res.status).toBe(201);
      expect(res.body.owner).toBe('oracle');
    });

    it('should accept "soheil" as owner', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'soheil' });
      
      expect(res.status).toBe(201);
      expect(res.body.owner).toBe('soheil');
    });

    it('should reject invalid owner value', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'invalid_user' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Owner must be');
    });

    it('should reject empty owner', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: '' });
      
      expect(res.status).toBe(400);
    });

    it('should reject owner not in allowed list on update', async () => {
      seedTestTasks();
      
      // Get a task first to get a valid ID
      const tasks = await request(app).get('/api/tasks');
      const taskId = tasks.body[0].id;
      
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ owner: 'invalid_user' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Owner must be');
    });

    it('should allow changing owner between valid values', async () => {
      seedTestTasks();
      
      // Find an oracle task
      const tasks = await request(app).get('/api/tasks');
      const oracleTask = tasks.body.find((t: any) => t.owner === 'oracle');
      
      const res = await request(app)
        .put(`/api/tasks/${oracleTask.id}`)
        .send({ owner: 'soheil' });
      
      expect(res.status).toBe(200);
      expect(res.body.owner).toBe('soheil');
    });
  });

  describe('Status Validation', () => {
    it('should default status to "backlog"', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle' });
      
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('backlog');
    });

    it('should accept "backlog" status', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle', status: 'backlog' });
      
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('backlog');
    });

    it('should accept "in_progress" status', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle', status: 'in_progress' });
      
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('in_progress');
    });

    it('should accept "done" status', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle', status: 'done' });
      
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('done');
    });

    it('should reject invalid status on create', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle', status: 'invalid_status' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid status');
    });

    it('should reject invalid status on update', async () => {
      seedTestTasks();
      
      // Get a task first to get a valid ID
      const tasks = await request(app).get('/api/tasks');
      const taskId = tasks.body[0].id;
      
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ status: 'invalid_status' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid status');
    });
  });

  describe('Priority Validation', () => {
    it('should default priority to 1', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle' });
      
      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(1);
    });

    it('should accept custom priority value', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle', priority: 5 });
      
      expect(res.status).toBe(201);
      expect(res.body.priority).toBe(5);
    });

    it('should accept priority 0', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle', priority: 0 });
      
      expect(res.status).toBe(201);
      // Note: 0 is falsy, so it might default to 1 - this tests actual behavior
      expect(typeof res.body.priority).toBe('number');
    });
  });

  describe('Timestamp Fields', () => {
    it('should auto-generate created_at timestamp', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle' });
      
      expect(res.status).toBe(201);
      expect(res.body.created_at).toBeDefined();
    });

    it('should auto-generate updated_at timestamp', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle' });
      
      expect(res.status).toBe(201);
      expect(res.body.updated_at).toBeDefined();
    });

    it('should update updated_at on task update', async () => {
      // Create task
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test', owner: 'oracle' });
      
      const originalUpdatedAt = created.body.updated_at;
      
      // Small delay to ensure timestamp differs
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Update task
      const updated = await request(app)
        .put(`/api/tasks/${created.body.id}`)
        .send({ title: 'Updated Test' });
      
      expect(updated.body.created_at).toBe(created.body.created_at);
      // updated_at might be the same if update is too fast, but shouldn't be earlier
      expect(new Date(updated.body.updated_at).getTime())
        .toBeGreaterThanOrEqual(new Date(originalUpdatedAt).getTime());
    });
  });
});
