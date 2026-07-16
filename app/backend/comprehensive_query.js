const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../../data/health_tracker.db');

db.serialize(() => {
  db.all("SELECT * FROM symptoms ORDER BY log_date, timing", (err, symptoms) => {
    db.all("SELECT * FROM meals ORDER BY log_date, meal_type", (err, meals) => {
      db.all("SELECT * FROM supplements ORDER BY log_date, timing", (err, supps) => {
        
        console.log('--- ALL MEALS PRE-JULY 2 ---');
        console.log(meals.filter(m => m.log_date < '2026-07-02').map(m => `${m.log_date} | ${m.food_items}`));
        
        console.log('\n--- ALL MEALS JULY 2 ONWARD ---');
        console.log(meals.filter(m => m.log_date >= '2026-07-02').map(m => `${m.log_date} | ${m.food_items}`));

        console.log('\n--- ALL SUPPS PRE-JULY 2 ---');
        console.log(supps.filter(s => s.log_date < '2026-07-02').map(s => `${s.log_date} | ${s.supplement_name}`));
        
        console.log('\n--- ALL SUPPS JULY 2 ONWARD ---');
        console.log(supps.filter(s => s.log_date >= '2026-07-02').map(s => `${s.log_date} | ${s.supplement_name}`));

      });
    });
  });
});
