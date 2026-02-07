/**
 * Tests for Moving Tasks Between Columns
 */
import request from 'supertest';
import app from './app';
import { resetDatabase, seedTestTasks } from './setup';

describe('Moving Tasks Between Columns', () => {
  beforeEach(() => {
    resetDatabase();
    seedTestTasks();
  });

  describe('PATCH /api/tasks/:id/move', () => {
    it('should move task from backlog to in_progress', async () => {
      // Find a backlog task
      const tasks = await request(app).get('/api/tasks');
      const backlogTask = tasks.body.find((t: any) => t.status === 'backlog');
      
      const res = await request(app)
        .patch(`/api/tasks/${backlogTask.id}/move`)
        .send({ status: 'in_progress', position: 0 });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in_progress');
      expect(res.body.id).toBe(backlogTask.id);
    });

    it('should move task from in_progress to done', async () => {
      const tasks = await request(app).get('/api/tasks');
      const inProgressTask = tasks.body.find((t: any) => t.status === 'in_progress');
      
      const res = await request(app)
        .patch(`/api/tasks/${inProgressTask.id}/move`)
        .send({ status: 'done', position: 0 });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
    });

    it('should move task from done back to backlog', async () => {
      const tasks = await request(app).get('/api/tasks');
      const doneTask = tasks.body.find((t: any) => t.status === 'done');
      
      const res = await request(app)
        .patch(`/api/tasks/${doneTask.id}/move`)
        .send({ status: 'backlog', position: 0 });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('backlog');
    });

    it('should update position when moving', async () => {
      const tasks = await request(app).get('/api/tasks');
      const task = tasks.body[0];
      
      const res = await request(app)
        .patch(`/api/tasks/${task.id}/move`)
        .send({ status: 'in_progress', position: 5 });
      
      expect(res.status).toBe(200);
      expect(res.body.position).toBe(5);
    });

    it('should default position to 0 if not provided', async () => {
      const tasks = await request(app).get('/api/tasks');
      const task = tasks.body[0];
      
      const res = await request(app)
        .patch(`/api/tasks/${task.id}/move`)
        .send({ status: 'done' });
      
      expect(res.status).toBe(200);
      expect(res.body.position).toBe(0);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .patch('/api/tasks/9999/move')
        .send({ status: 'done', position: 0 });
      
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should reject invalid status value', async () => {
      const tasks = await request(app).get('/api/tasks');
      const task = tasks.body[0];
      
      const res = await request(app)
        .patch(`/api/tasks/${task.id}/move`)
        .send({ status: 'invalid_status', position: 0 });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('status');
    });

    it('should require status field', async () => {
      const tasks = await request(app).get('/api/tasks');
      const task = tasks.body[0];
      
      const res = await request(app)
        .patch(`/api/tasks/${task.id}/move`)
        .send({ position: 0 });
      
      expect(res.status).toBe(400);
    });

    it('should update updated_at timestamp when moving', async () => {
      const tasks = await request(app).get('/api/tasks');
      const task = tasks.body[0];
      const originalUpdatedAt = task.updated_at;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const res = await request(app)
        .patch(`/api/tasks/${task.id}/move`)
        .send({ status: 'done', position: 0 });
      
      expect(res.status).toBe(200);
      expect(new Date(res.body.updated_at).getTime())
        .toBeGreaterThanOrEqual(new Date(originalUpdatedAt).getTime());
    });

    it('should preserve other task fields when moving', async () => {
      const tasks = await request(app).get('/api/tasks');
      const task = tasks.body[0];
      
      const res = await request(app)
        .patch(`/api/tasks/${task.id}/move`)
        .send({ status: 'done', position: 0 });
      
      expect(res.status).toBe(200);
      expect(res.body.title).toBe(task.title);
      expect(res.body.description).toBe(task.description);
      expect(res.body.owner).toBe(task.owner);
      expect(res.body.priority).toBe(task.priority);
    });
  });

  describe('Column Workflow', () => {
    it('should complete full workflow: backlog → in_progress → done', async () => {
      // Create a new task
      const created = await request(app)
        .post('/api/tasks')
        .send({ title: 'Workflow test', owner: 'oracle' });
      
      expect(created.body.status).toBe('backlog');
      
      // Move to in_progress
      const inProgress = await request(app)
        .patch(`/api/tasks/${created.body.id}/move`)
        .send({ status: 'in_progress', position: 0 });
      
      expect(inProgress.body.status).toBe('in_progress');
      
      // Move to done
      const done = await request(app)
        .patch(`/api/tasks/${created.body.id}/move`)
        .send({ status: 'done', position: 0 });
      
      expect(done.body.status).toBe('done');
      expect(done.body.id).toBe(created.body.id);
    });

    it('should handle multiple tasks in same column', async () => {
      // Create multiple tasks in the same column
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Task 1', owner: 'oracle', status: 'in_progress' });
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Task 2', owner: 'oracle', status: 'in_progress' });
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Task 3', owner: 'oracle', status: 'in_progress' });
      
      const tasks = await request(app).get('/api/tasks');
      const inProgressTasks = tasks.body.filter((t: any) => t.status === 'in_progress');
      
      expect(inProgressTasks.length).toBeGreaterThanOrEqual(3);
    });

    it('should reorder within same column', async () => {
      const tasks = await request(app).get('/api/tasks');
      const task = tasks.body[0];
      const originalStatus = task.status;
      
      // Move to same column but different position
      const res = await request(app)
        .patch(`/api/tasks/${task.id}/move`)
        .send({ status: originalStatus, position: 10 });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(originalStatus);
      expect(res.body.position).toBe(10);
    });
  });
});
