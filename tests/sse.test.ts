/**
 * SSE (Server-Sent Events) Tests
 */
import request from 'supertest';
import http from 'http';
import app, { getSseClients } from './app';
import { resetDatabase } from './setup';

describe('SSE Events', () => {
  let server: http.Server;

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    // Close all SSE clients
    getSseClients().forEach(c => c.end());
    getSseClients().length = 0;
    server.close(done);
  });

  beforeEach(() => {
    resetDatabase();
  });

  it('GET /api/events should return event-stream headers', async () => {
    const res = await request(app)
      .get('/api/events')
      .buffer(false)
      .parse((res, cb) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
          // Got the initial comment, abort
          if (data.includes(': connected')) {
            (res as any).destroy();
            cb(null, data);
          }
        });
        res.on('error', () => cb(null, data));
      });

    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('should broadcast task-created on POST /api/tasks', (done) => {
    const addr = server.address() as { port: number };
    const port = addr.port;

    const req = http.get(`http://127.0.0.1:${port}/api/events`, (res) => {
      let buf = '';
      res.on('data', (chunk: Buffer) => {
        buf += chunk.toString();
        if (buf.includes('event: task-created')) {
          const match = buf.match(/event: task-created\ndata: (.+)\n/);
          expect(match).toBeTruthy();
          const payload = JSON.parse(match![1]);
          expect(payload.title).toBe('SSE Test Task');
          req.destroy();
          done();
        }
      });
    });

    // Wait a beat for SSE connection, then create task
    setTimeout(() => {
      request(app)
        .post('/api/tasks')
        .send({ title: 'SSE Test Task', owner: 'oracle' })
        .then(() => {});
    }, 100);
  });

  it('should broadcast task-updated on PUT /api/tasks/:id', (done) => {
    const addr = server.address() as { port: number };
    const port = addr.port;

    // Create a task first
    request(app)
      .post('/api/tasks')
      .send({ title: 'To Update', owner: 'oracle' })
      .then((createRes) => {
        const taskId = createRes.body.id;

        // Drain stale SSE clients
        getSseClients().forEach(c => c.end());
        getSseClients().length = 0;

        const req = http.get(`http://127.0.0.1:${port}/api/events`, (res) => {
          let buf = '';
          res.on('data', (chunk: Buffer) => {
            buf += chunk.toString();
            if (buf.includes('event: task-updated')) {
              const match = buf.match(/event: task-updated\ndata: (.+)\n/);
              expect(match).toBeTruthy();
              const payload = JSON.parse(match![1]);
              expect(payload.title).toBe('Updated Title');
              req.destroy();
              done();
            }
          });
        });

        setTimeout(() => {
          request(app)
            .put(`/api/tasks/${taskId}`)
            .send({ title: 'Updated Title' })
            .then(() => {});
        }, 100);
      });
  });

  it('should broadcast task-deleted on DELETE /api/tasks/:id', (done) => {
    const addr = server.address() as { port: number };
    const port = addr.port;

    request(app)
      .post('/api/tasks')
      .send({ title: 'To Delete', owner: 'soheil' })
      .then((createRes) => {
        const taskId = createRes.body.id;

        getSseClients().forEach(c => c.end());
        getSseClients().length = 0;

        const req = http.get(`http://127.0.0.1:${port}/api/events`, (res) => {
          let buf = '';
          res.on('data', (chunk: Buffer) => {
            buf += chunk.toString();
            if (buf.includes('event: task-deleted')) {
              const match = buf.match(/event: task-deleted\ndata: (.+)\n/);
              expect(match).toBeTruthy();
              const payload = JSON.parse(match![1]);
              expect(payload.id).toBe(taskId);
              req.destroy();
              done();
            }
          });
        });

        setTimeout(() => {
          request(app)
            .delete(`/api/tasks/${taskId}`)
            .then(() => {});
        }, 100);
      });
  });

  it('should broadcast task-updated on PATCH /api/tasks/:id/move', (done) => {
    const addr = server.address() as { port: number };
    const port = addr.port;

    request(app)
      .post('/api/tasks')
      .send({ title: 'To Move', owner: 'oracle', status: 'backlog' })
      .then((createRes) => {
        const taskId = createRes.body.id;

        getSseClients().forEach(c => c.end());
        getSseClients().length = 0;

        const req = http.get(`http://127.0.0.1:${port}/api/events`, (res) => {
          let buf = '';
          res.on('data', (chunk: Buffer) => {
            buf += chunk.toString();
            if (buf.includes('event: task-updated')) {
              const match = buf.match(/event: task-updated\ndata: (.+)\n/);
              expect(match).toBeTruthy();
              const payload = JSON.parse(match![1]);
              expect(payload.status).toBe('in_progress');
              req.destroy();
              done();
            }
          });
        });

        setTimeout(() => {
          request(app)
            .patch(`/api/tasks/${taskId}/move`)
            .send({ status: 'in_progress', position: 0 })
            .then(() => {});
        }, 100);
      });
  });
});
