const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../../data/health_tracker.db');

db.serialize(() => {
  db.all("SELECT log_date, timing, supplement_name FROM supplements WHERE supplement_name LIKE '%zinc%' ORDER BY log_date, timing", (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('--- ALL ZINC LOGS ---');
    console.log(rows);
  });
});
