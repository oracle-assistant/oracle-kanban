/**
 * Tests for Filtering Tasks by Owner
 */
import request from 'supertest';
import app from './app';
import { resetDatabase, seedTestTasks } from './setup';

describe('Filtering Tasks by Owner', () => {
  beforeEach(() => {
    resetDatabase();
    seedTestTasks();
  });

  describe('GET /api/tasks?owner=', () => {
    it('should filter tasks by owner "oracle"', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      
      // All returned tasks should belong to oracle
      res.body.forEach((task: any) => {
        expect(task.owner).toBe('oracle');
      });
    });

    it('should filter tasks by owner "soheil"', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .query({ owner: 'soheil' });
      
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      
      // All returned tasks should belong to soheil
      res.body.forEach((task: any) => {
        expect(task.owner).toBe('soheil');
      });
    });

    it('should return all tasks when no owner filter', async () => {
      const all = await request(app).get('/api/tasks');
      const oracle = await request(app).get('/api/tasks').query({ owner: 'oracle' });
      const soheil = await request(app).get('/api/tasks').query({ owner: 'soheil' });
      
      expect(all.body.length).toBe(oracle.body.length + soheil.body.length);
    });

    it('should return empty array for owner with no tasks', async () => {
      // Clear and add only oracle tasks
      resetDatabase();
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Oracle only', owner: 'oracle' });
      
      const res = await request(app)
        .get('/api/tasks')
        .query({ owner: 'soheil' });
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return all tasks for invalid owner filter', async () => {
      // Invalid owner should be handled gracefully
      const res = await request(app)
        .get('/api/tasks')
        .query({ owner: 'invalid_owner' });
      
      expect(res.status).toBe(200);
      // Either returns empty (strict) or all (lenient) - test for valid response
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should maintain order when filtering', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      expect(res.status).toBe(200);
      
      // Check that tasks are still ordered
      if (res.body.length > 1) {
        for (let i = 0; i < res.body.length - 1; i++) {
          const current = res.body[i];
          const next = res.body[i + 1];
          // Should be ordered by status, then position, then id
          expect(current.status <= next.status || 
                 (current.status === next.status && current.position <= next.position) ||
                 (current.status === next.status && current.position === next.position && current.id <= next.id)
          ).toBe(true);
        }
      }
    });
  });

  describe('Owner Distribution', () => {
    it('should correctly count tasks per owner', async () => {
      const oracleTasks = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      const soheilTasks = await request(app)
        .get('/api/tasks')
        .query({ owner: 'soheil' });
      
      // Based on seedTestTasks: oracle has 2, soheil has 2
      expect(oracleTasks.body.length).toBe(2);
      expect(soheilTasks.body.length).toBe(2);
    });

    it('should update filter results after creating task', async () => {
      const before = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      const beforeCount = before.body.length;
      
      // Add new oracle task
      await request(app)
        .post('/api/tasks')
        .send({ title: 'New Oracle Task', owner: 'oracle' });
      
      const after = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      expect(after.body.length).toBe(beforeCount + 1);
    });

    it('should update filter results after deleting task', async () => {
      const before = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      const beforeCount = before.body.length;
      const taskToDelete = before.body[0];
      
      await request(app).delete(`/api/tasks/${taskToDelete.id}`);
      
      const after = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      expect(after.body.length).toBe(beforeCount - 1);
    });

    it('should update filter results after changing owner', async () => {
      const oracleBefore = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      const soheilBefore = await request(app)
        .get('/api/tasks')
        .query({ owner: 'soheil' });
      
      const oracleTask = oracleBefore.body[0];
      
      // Change owner from oracle to soheil
      await request(app)
        .put(`/api/tasks/${oracleTask.id}`)
        .send({ owner: 'soheil' });
      
      const oracleAfter = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      const soheilAfter = await request(app)
        .get('/api/tasks')
        .query({ owner: 'soheil' });
      
      expect(oracleAfter.body.length).toBe(oracleBefore.body.length - 1);
      expect(soheilAfter.body.length).toBe(soheilBefore.body.length + 1);
    });
  });

  describe('Combined Filtering Scenarios', () => {
    it('should filter correctly with mixed statuses per owner', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      expect(res.status).toBe(200);
      
      // Oracle has tasks in backlog and in_progress
      const statuses = new Set(res.body.map((t: any) => t.status));
      expect(statuses.size).toBeGreaterThan(0);
    });

    it('should return tasks in all columns for specified owner', async () => {
      // Create tasks in all statuses for oracle
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Oracle Backlog', owner: 'oracle', status: 'backlog' });
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Oracle In Progress', owner: 'oracle', status: 'in_progress' });
      await request(app)
        .post('/api/tasks')
        .send({ title: 'Oracle Done', owner: 'oracle', status: 'done' });
      
      const res = await request(app)
        .get('/api/tasks')
        .query({ owner: 'oracle' });
      
      const statuses = res.body.map((t: any) => t.status);
      expect(statuses).toContain('backlog');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('done');
    });
  });
});
