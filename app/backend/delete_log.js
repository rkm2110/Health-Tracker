const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../../data/health_tracker.db');

const targetDate = '2026-07-05';

db.serialize(() => {
  db.run("DELETE FROM daily_logs WHERE log_date = ?", [targetDate], function(err) {
    console.log(`Deleted ${this.changes} rows from daily_logs`);
  });
  db.run("DELETE FROM meals WHERE log_date = ?", [targetDate], function(err) {
    console.log(`Deleted ${this.changes} rows from meals`);
  });
  db.run("DELETE FROM supplements WHERE log_date = ?", [targetDate], function(err) {
    console.log(`Deleted ${this.changes} rows from supplements`);
  });
  db.run("DELETE FROM symptoms WHERE log_date = ?", [targetDate], function(err) {
    console.log(`Deleted ${this.changes} rows from symptoms`);
  });
});
