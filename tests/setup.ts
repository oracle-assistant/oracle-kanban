import Database from 'better-sqlite3';
import path from 'path';

// Use in-memory database for tests
export const testDb = new Database(':memory:');

// Create tables
testDb.exec(`
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

// Helper to reset database between tests
export function resetDatabase() {
  testDb.exec('DELETE FROM tasks');
}

// Helper to seed test data
export function seedTestTasks() {
  const stmt = testDb.prepare(`
    INSERT INTO tasks (title, description, owner, priority, status, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run('Fix authentication bug', 'Auth tokens expiring too early', 'oracle', 3, 'in_progress', 0);
  stmt.run('Design new dashboard', 'Create mockups for v2', 'soheil', 2, 'backlog', 0);
  stmt.run('Write documentation', 'API docs for developers', 'oracle', 1, 'backlog', 1);
  stmt.run('Deploy to production', 'Final deployment checklist', 'soheil', 3, 'done', 0);
}

// Cleanup after all tests
afterAll(() => {
  testDb.close();
});
