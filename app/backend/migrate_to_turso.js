const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be in the .env file.");
    process.exit(1);
}

const tursoDb = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const localDbPath = path.resolve(__dirname, '../../data/health_tracker.db');
const localDb = new sqlite3.Database(localDbPath);

const fetchLocal = (query) => {
    return new Promise((resolve, reject) => {
        localDb.all(query, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

async function migrate() {
    console.log("Starting database migration to Turso...");

    try {
        // 1. Create tables in Turso (schema)
        await tursoDb.execute(`
            CREATE TABLE IF NOT EXISTS daily_logs (
                log_date TEXT PRIMARY KEY,
                cycle_day INTEGER,
                water_count INTEGER DEFAULT 0,
                susu_count INTEGER DEFAULT 0,
                bowel_movement_count INTEGER DEFAULT 0,
                exercise TEXT,
                supporting_therapy TEXT,
                period_flow TEXT,
                mood TEXT,
                notes TEXT
            )
        `);

        await tursoDb.execute(`
            CREATE TABLE IF NOT EXISTS meals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log_date TEXT,
                meal_type TEXT,
                food_details TEXT,
                time TEXT,
                photo_path TEXT,
                FOREIGN KEY (log_date) REFERENCES daily_logs(log_date)
            )
        `);

        await tursoDb.execute(`
            CREATE TABLE IF NOT EXISTS supplements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log_date TEXT,
                supplement_name TEXT,
                time TEXT,
                FOREIGN KEY (log_date) REFERENCES daily_logs(log_date)
            )
        `);

        await tursoDb.execute(`
            CREATE TABLE IF NOT EXISTS symptoms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log_date TEXT,
                symptom_name TEXT,
                severity INTEGER,
                time TEXT,
                FOREIGN KEY (log_date) REFERENCES daily_logs(log_date)
            )
        `);

        await tursoDb.execute(`
            CREATE TABLE IF NOT EXISTS bowel_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                log_date TEXT,
                bristol_scale INTEGER,
                time TEXT,
                FOREIGN KEY (log_date) REFERENCES daily_logs(log_date)
            )
        `);
        console.log("Created schema in Turso.");

        const sanitize = (val) => val === undefined ? null : val;

        // 2. Migrate daily_logs
        const logs = await fetchLocal("SELECT * FROM daily_logs");
        for (const log of logs) {
            await tursoDb.execute({
                sql: `INSERT OR IGNORE INTO daily_logs (
                        log_date, cycle_day, water_count, susu_count, bowel_movement_count, exercise, supporting_therapy, period_flow, mood, notes
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [log.log_date, log.cycle_day, log.water_count, log.susu_count, log.bowel_movement_count, log.exercise, log.supporting_therapy, log.period_flow, log.mood, log.notes].map(sanitize)
            });
        }
        console.log(`Migrated ${logs.length} daily logs.`);

        // 3. Migrate meals
        const meals = await fetchLocal("SELECT * FROM meals");
        for (const m of meals) {
            await tursoDb.execute({
                sql: `INSERT INTO meals (log_date, meal_type, food_details, time, photo_path) VALUES (?, ?, ?, ?, ?)`,
                args: [m.log_date, m.meal_type, m.food_details, m.time, m.photo_path].map(sanitize)
            });
        }
        console.log(`Migrated ${meals.length} meals.`);

        // 4. Migrate supplements
        const supplements = await fetchLocal("SELECT * FROM supplements");
        for (const s of supplements) {
            await tursoDb.execute({
                sql: `INSERT INTO supplements (log_date, supplement_name, time) VALUES (?, ?, ?)`,
                args: [s.log_date, s.supplement_name, s.time].map(sanitize)
            });
        }
        console.log(`Migrated ${supplements.length} supplements.`);

        // 5. Migrate symptoms
        const symptoms = await fetchLocal("SELECT * FROM symptoms");
        for (const sym of symptoms) {
            await tursoDb.execute({
                sql: `INSERT INTO symptoms (log_date, symptom_name, severity, time) VALUES (?, ?, ?, ?)`,
                args: [sym.log_date, sym.symptom_name, sym.severity, sym.time].map(sanitize)
            });
        }
        console.log(`Migrated ${symptoms.length} symptoms.`);

        // 6. Migrate bowel movements
        const bms = await fetchLocal("SELECT * FROM bowel_movements");
        for (const bm of bms) {
            await tursoDb.execute({
                sql: `INSERT INTO bowel_movements (log_date, bristol_scale, time) VALUES (?, ?, ?)`,
                args: [bm.log_date, bm.bristol_scale, bm.time].map(sanitize)
            });
        }
        console.log(`Migrated ${bms.length} bowel movements.`);

        console.log("Migration complete!");
        process.exit(0);

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
