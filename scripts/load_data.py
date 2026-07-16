import sqlite3
import json
import os

db_path = '../data/health_tracker.db'

def load_data():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    for i in range(1, 4):
        batch_file = f'data_batch_{i}.json'
        if not os.path.exists(batch_file):
            print(f"Skipping {batch_file}, file not found.")
            continue
            
        with open(batch_file, 'r') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                print(f"Error parsing JSON in {batch_file}")
                continue
                
        for day in data:
            log_date = day.get('log_date')
            if not log_date:
                continue
                
            try:
                cursor.execute('''
                INSERT OR REPLACE INTO daily_logs (
                    log_date, cycle_day, water_count, susu_count, 
                    bowel_movement_count, bowel_movement_complete, 
                    bowel_movement_scale, exercise, supporting_therapy, 
                    sleep_time, sleep_wakeups
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    log_date,
                    day.get('cycle_day'),
                    day.get('water_count'),
                    day.get('susu_count'),
                    day.get('bowel_movement_count'),
                    day.get('bowel_movement_complete'),
                    day.get('bowel_movement_scale'),
                    day.get('exercise'),
                    day.get('supporting_therapy'),
                    day.get('sleep_time'),
                    day.get('sleep_wakeups')
                ))
            except Exception as e:
                print(f"Error inserting daily log for {log_date}: {e}")
                
            # Meals
            cursor.execute('DELETE FROM meals WHERE log_date = ?', (log_date,))
            for meal in day.get('meals', []):
                cursor.execute('''
                INSERT INTO meals (log_date, meal_type, food_items)
                VALUES (?, ?, ?)
                ''', (log_date, meal.get('meal_type'), meal.get('food_items')))
                
            # Supplements
            cursor.execute('DELETE FROM supplements WHERE log_date = ?', (log_date,))
            for supp in day.get('supplements', []):
                cursor.execute('''
                INSERT INTO supplements (log_date, timing, supplement_name)
                VALUES (?, ?, ?)
                ''', (log_date, supp.get('timing'), supp.get('supplement_name')))
                
            # Symptoms
            cursor.execute('DELETE FROM symptoms WHERE log_date = ?', (log_date,))
            for symp in day.get('symptoms', []):
                cursor.execute('''
                INSERT INTO symptoms (log_date, timing, symptom_name, severity)
                VALUES (?, ?, ?, ?)
                ''', (log_date, symp.get('timing'), symp.get('symptom_name'), symp.get('severity')))
                
    conn.commit()
    conn.close()
    print("Data loaded successfully.")

if __name__ == '__main__':
    load_data()
