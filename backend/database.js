const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'alerts.db');
const db = new sqlite3.Database(dbPath);

// Initialize database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      price REAL,
      symbol TEXT,
      timeframe TEXT,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      device_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol)`);
});

// Database functions for FCM tokens
function registerToken(token, deviceInfo = null, callback) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO fcm_tokens (token, device_info, last_used)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  stmt.run(token, deviceInfo, function(err) {
    callback(err, this);
  });
}

function unregisterToken(token, callback) {
  db.run('DELETE FROM fcm_tokens WHERE token = ?', [token], function(err) {
    callback(err, this);
  });
}

function getAllTokens(callback) {
  db.all('SELECT token FROM fcm_tokens WHERE last_used > datetime("now", "-30 days")', [], (err, rows) => {
    if (err) {
      callback(err, []);
    } else {
      callback(null, rows.map(row => row.token));
    }
  });
}

function getTokenCount(callback) {
  db.get('SELECT COUNT(*) as count FROM fcm_tokens WHERE last_used > datetime("now", "-30 days")', [], (err, row) => {
    if (err) {
      callback(err, 0);
    } else {
      callback(null, row.count);
    }
  });
}

// Database functions for alerts
function saveAlert(alert, callback) {
  const stmt = db.prepare(`
    INSERT INTO alerts (timestamp, type, price, symbol, timeframe, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    alert.timestamp,
    alert.type,
    alert.price,
    alert.symbol,
    alert.timeframe,
    alert.message,
    function(err) {
      callback(err, this);
    }
  );
}

function getAlerts(limit = 100, callback) {
  db.all(`
    SELECT * FROM alerts 
    ORDER BY timestamp DESC 
    LIMIT ?
  `, [limit], (err, rows) => {
    callback(err, rows);
  });
}

function getAlertCount(callback) {
  db.get('SELECT COUNT(*) as count FROM alerts', [], (err, row) => {
    if (err) {
      callback(err, 0);
    } else {
      callback(null, row.count);
    }
  });
}

module.exports = {
  db,
  registerToken,
  unregisterToken,
  getAllTokens,
  getTokenCount,
  saveAlert,
  getAlerts,
  getAlertCount
};