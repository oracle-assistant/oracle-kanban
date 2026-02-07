/**
 * API Endpoint Tests (CRUD for tasks)
 */
import request from 'supertest';
import app from './app';
import { resetDatabase, seedTestTasks } from './setup';

describe('API Endpoints', () => {
  beforeEach(() => {
    resetDatabase();
  });

  describe('GET /api/tasks', () => {
    it('should return empty array when no tasks exist', async () => {
      const res = await request(app).get('/api/tasks');
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks', async () => {
      seedTestTasks();
      
      const res = await request(app).get('/api/tasks');
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(4);
    });

    it('should return tasks ordered by status, position, and id', async () => {
      seedTestTasks();
      
      const res = await request(app).get('/api/tasks');
      
      expect(res.status).toBe(200);
      // Tasks should be ordered by status first
      const statuses = res.body.map((t: any) => t.status);
      const sortedStatuses = [...statuses].sort();
      expect(statuses).toEqual(sortedStatuses);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task with required fields', async () => {
      const newTask = {
        title: 'New test task',
        owner: 'oracle',
      };
      
      const res = await request(app)
        .post('/api/tasks')
        .send(newTask);
      
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'New test task',
        owner: 'oracle',
        status: 'backlog',
        description: '',
        priority: 1,
      });
      expect(res.body.id).toBeDefined();
      expect(res.body.created_at).toBeDefined();
    });

    it('should create a task with all fields', async () => {
      const newTask = {
        title: 'Full task',
        description: 'Complete description',
        owner: 'soheil',
        priority: 3,
        status: 'in_progress',
      };
      
      const res = await request(app)
        .post('/api/tasks')
        .send(newTask);
      
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject(newTask);
    });

    it('should fail when title is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ owner: 'oracle' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title and owner are required');
    });

    it('should fail when owner is missing', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'Test' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Title and owner are required');
    });

    it('should fail with empty body', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({});
      
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task title', async () => {
      seedTestTasks();
      
      // Get a task first to get a valid ID
      const tasks = await request(app).get('/api/tasks');
      const taskId = tasks.body[0].id;
      
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({ title: 'Updated title' });
      
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated title');
      expect(res.body.id).toBe(taskId);
    });

    it('should update multiple fields', async () => {
      seedTestTasks();
      
      // Get a task first to get a valid ID
      const tasks = await request(app).get('/api/tasks');
      const taskId = tasks.body[0].id;
      
      const updates = {
        title: 'Multi-update',
        description: 'New description',
        priority: 5,
      };
      
      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send(updates);
      
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject(updates);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .put('/api/tasks/9999')
        .send({ title: 'Test' });
      
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should preserve unchanged fields', async () => {
      seedTestTasks();
      
      // Get original task
      const original = await request(app).get('/api/tasks');
      const task = original.body[0];
      
      // Update only title
      const res = await request(app)
        .put(`/api/tasks/${task.id}`)
        .send({ title: 'Only title changed' });
      
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Only title changed');
      expect(res.body.description).toBe(task.description);
      expect(res.body.owner).toBe(task.owner);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete an existing task', async () => {
      seedTestTasks();
      
      // Get a task first to get a valid ID
      const tasks = await request(app).get('/api/tasks');
      const taskId = tasks.body[0].id;
      
      const res = await request(app).delete(`/api/tasks/${taskId}`);
      
      expect(res.status).toBe(204);
      
      // Verify task is deleted
      const remaining = await request(app).get('/api/tasks');
      expect(remaining.body.find((t: any) => t.id === taskId)).toBeUndefined();
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app).delete('/api/tasks/9999');
      
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should not affect other tasks when deleting', async () => {
      seedTestTasks();
      
      const before = await request(app).get('/api/tasks');
      const countBefore = before.body.length;
      const taskId = before.body[0].id;
      
      await request(app).delete(`/api/tasks/${taskId}`);
      
      const after = await request(app).get('/api/tasks');
      expect(after.body.length).toBe(countBefore - 1);
    });
  });
});
