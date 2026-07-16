const sqlite3 = require('sqlite3');
const path = require('path');
const dbPath = path.resolve('c:/Users/userr/OneDrive/Desktop/Coding/AntiGravity/Health_Tracker/data/health_tracker.db');
const db = new sqlite3.Database(dbPath);

db.run("UPDATE daily_logs SET updated_at = log_date || 'T12:00:00Z' WHERE updated_at IS NULL", (err) => {
    if (err) console.error(err);
    else console.log('Updated existing logs');
});
