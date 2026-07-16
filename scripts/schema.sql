CREATE TABLE IF NOT EXISTS daily_logs (
    log_date DATE PRIMARY KEY,
    cycle_day INTEGER,
    water_count INTEGER,
    susu_count INTEGER,
    bowel_movement_count INTEGER,
    bowel_movement_complete TEXT,
    bowel_movement_scale INTEGER,
    exercise TEXT,
    supporting_therapy TEXT,
    sleep_time TEXT,
    sleep_wakeups INTEGER
);

CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date DATE,
    meal_type TEXT,
    food_items TEXT,
    FOREIGN KEY (log_date) REFERENCES daily_logs(log_date)
);

CREATE TABLE IF NOT EXISTS supplements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date DATE,
    timing TEXT,
    supplement_name TEXT,
    FOREIGN KEY (log_date) REFERENCES daily_logs(log_date)
);

CREATE TABLE IF NOT EXISTS symptoms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_date DATE,
    timing TEXT,
    symptom_name TEXT,
    severity INTEGER,
    FOREIGN KEY (log_date) REFERENCES daily_logs(log_date)
);
