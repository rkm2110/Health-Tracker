const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../../data/health_tracker.db');

db.serialize(() => {
  db.all("SELECT log_date, timing, symptom_name, severity FROM symptoms WHERE log_date >= '2026-06-30' ORDER BY log_date, timing", (err, rows) => {
    console.log('--- SYMPTOMS ---');
    console.log(rows);
  });
  db.all("SELECT log_date, meal_type, food_items FROM meals WHERE log_date >= '2026-06-30' ORDER BY log_date, meal_type", (err, rows) => {
    console.log('--- MEALS ---');
    console.log(rows);
  });
  db.all("SELECT log_date, timing, supplement_name FROM supplements WHERE log_date >= '2026-06-30' ORDER BY log_date, timing", (err, rows) => {
    console.log('--- SUPPLEMENTS ---');
    console.log(rows);
  });
});
