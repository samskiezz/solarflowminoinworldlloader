const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

class SQLiteService {
  constructor() {
    this.db = null;
    this.dbPath = null;
    this.initialized = false;
  }

  // Initialize database connection (called explicitly, not in constructor)
  init() {
    if (this.initialized) return;
    
    try {
      const dir = path.join(process.cwd(), 'persistent-data');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      this.dbPath = path.join(dir, 'solarflow.sqlite');
      this.db = new Database(this.dbPath);
      this.initialized = true;
    } catch (error) {
      console.error('SQLite initialization failed:', error);
      throw error;
    }
  }

  initializeTables() {
    if (!this.initialized) this.init();
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        userId INTEGER NOT NULL,
        k TEXT NOT NULL,
        v TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        PRIMARY KEY (userId, k)
      );
    `);
  }

  getData(key, userId=0) {
    if (!this.initialized) this.init();
    
    const row = this.db.prepare('SELECT v FROM kv WHERE userId=? AND k=?').get(userId, key);
    return row ? JSON.parse(row.v) : null;
  }

  saveData(key, body, userId=0) {
    if (!this.initialized) this.init();
    
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO kv(userId,k,v,updatedAt) VALUES(?,?,?,?)
      ON CONFLICT(userId,k) DO UPDATE SET v=excluded.v, updatedAt=excluded.updatedAt
    `).run(userId, key, JSON.stringify(body), now);

    return { success: true, key, updatedAt: now };
  }

  close() {
    if (this.db && this.initialized) {
      this.db.close();
      this.initialized = false;
    }
  }
}

module.exports = SQLiteService;