import sqlite3

db_path = '../data/health_tracker.db'

def run():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Update Schema
    try:
        cursor.execute("ALTER TABLE daily_logs ADD COLUMN wake_up_time TEXT")
        cursor.execute("ALTER TABLE daily_logs ADD COLUMN total_sleep_hours REAL")
    except sqlite3.OperationalError as e:
        print(f"Columns might already exist: {e}")

    # 2. Insert July 3rd Data
    log_date = '2026-07-03'
    cycle_day = 4
    water_count = 8
    susu_count = 0  # not specified, defaulting to 0
    bm_count = 2
    bm_complete = 'Incomplete'
    bm_scale = 5 # 1st was 4, 2nd was 5, let's take max
    exercise = 'stretching'
    supporting_therapy = 'red light therapy'
    sleep_time = '11'
    sleep_wakeups = 5
    wake_up_time = '8.00 am'
    
    # Calculate total sleep hours using July 2nd's sleep_time
    # July 2 sleep_time was "10.30" -> assumed 10:30 PM.
    # July 3 wake_up_time is "8.00 am" -> 8:00 AM.
    # Total sleep = 1.5 hrs (before midnight) + 8 hrs (after midnight) = 9.5 hours
    total_sleep_hours = 9.5

    cursor.execute('''
    INSERT OR REPLACE INTO daily_logs (
        log_date, cycle_day, water_count, susu_count, 
        bowel_movement_count, bowel_movement_complete, 
        bowel_movement_scale, exercise, supporting_therapy, 
        sleep_time, sleep_wakeups, wake_up_time, total_sleep_hours
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        log_date, cycle_day, water_count, susu_count, 
        bm_count, bm_complete, bm_scale, exercise, supporting_therapy, 
        sleep_time, sleep_wakeups, wake_up_time, total_sleep_hours
    ))

    # Insert Meals
    meals = [
        ('Breakfast', 'AKKI roti, 1 egg white'),
        ('Lunch', 'Brocolli, green bell pepper, rice pasta with basil and oregano, olive oil, + watermelon'),
        ('Evening snack', 'chai, 2 piece pakoda with onion, cabbage, besan, moodi with sarson tel'),
        ('Dinner', 'ghiya with bajra roti')
    ]
    cursor.execute("DELETE FROM meals WHERE log_date = ?", (log_date,))
    for mt, fi in meals:
        cursor.execute("INSERT INTO meals (log_date, meal_type, food_items) VALUES (?, ?, ?)", (log_date, mt, fi))

    # Insert Supplements
    supps = [
        ('Morning', 'L glutamine, NAC'),
        ('Breakfast', 'Power digest, gut motility, colostrum, COQ10'),
        ('2hr', 'Nettle leaf tea with lavender'),
        ('Lunch', 'Power digest, Fodmate, pancreatic enzym'),
        ('2hr', 'roasted dandelion tea with rose'),
        ('Dinner', 'Lactoferrin, magnesium glycinate, zinc carnosine, B12, B1'),
        ('Night', 'NAC, fibercon, Melatonin, gas x')
    ]
    cursor.execute("DELETE FROM supplements WHERE log_date = ?", (log_date,))
    for timing, name in supps:
        cursor.execute("INSERT INTO supplements (log_date, timing, supplement_name) VALUES (?, ?, ?)", (log_date, timing, name))

    # Insert Symptoms
    symps = [
        ('Morning', 'abdominal bloating', 4),
        ('Morning', 'bladder pressure', 2),
        ('Breakfast 1hr', 'abdominal bloating', 2),
        ('Breakfast 1hr', 'bladder pressure', 1),
        ('Breakfast 1hr', 'urinary urgency', 1),
        ('Lunch 1hr', 'abdominal bloating', 2),
        ('Lunch 1hr', 'left side abdominal pulsating pain', 1),
        ('Dinner 1hr', 'abdominal bloating', 4),
        ('Dinner 1hr', 'abdominal distension', 5),
        ('Sleep', 'Itchy dots on skin', None),
        ('Sleep', 'pain below naval', 3),
        ('Sleep', 'bloating', 3),
        ('Sleep', 'bladder pressure', 2)
    ]
    cursor.execute("DELETE FROM symptoms WHERE log_date = ?", (log_date,))
    for timing, name, sev in symps:
        cursor.execute("INSERT INTO symptoms (log_date, timing, symptom_name, severity) VALUES (?, ?, ?, ?)", (log_date, timing, name, sev))

    conn.commit()
    conn.close()
    print("July 3rd data successfully processed and loaded!")

if __name__ == '__main__':
    run()
