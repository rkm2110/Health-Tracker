import sqlite3
import pandas as pd
import numpy as np

def run_analysis():
    conn = sqlite3.connect('../data/health_tracker.db')
    
    daily = pd.read_sql_query("SELECT * FROM daily_logs", conn)
    symps = pd.read_sql_query("SELECT * FROM symptoms", conn)
    meals = pd.read_sql_query("SELECT * FROM meals", conn)
    
    # Aggregate symptoms per day (count and max severity)
    symps['severity'] = pd.to_numeric(symps['severity'], errors='coerce').fillna(0)
    daily_symps = symps.groupby('log_date').agg(
        total_symptoms=('symptom_name', 'count'),
        max_severity=('severity', 'max'),
        avg_severity=('severity', 'mean')
    ).reset_index()
    
    # Merge with daily logs
    df = daily.merge(daily_symps, on='log_date', how='left').fillna(0)
    
    # 1. Cycle Day vs Symptoms
    print("## Cycle Day vs Symptoms")
    print(df[['log_date', 'cycle_day', 'total_symptoms', 'max_severity']].sort_values('cycle_day').to_string(index=False))
    print("\n")
    
    # 2. Bowel Movement vs Symptoms
    print("## Bowel Movement Complete vs Symptoms")
    print(df.groupby('bowel_movement_complete')[['total_symptoms', 'max_severity']].mean().to_string())
    print("\n")
    
    # 3. Sleep vs Symptoms
    # Assuming sleep_time is a float like 10.3
    df['sleep_time_num'] = pd.to_numeric(df['sleep_time'], errors='coerce')
    print("## Sleep Wakeups vs Symptoms")
    print(df.groupby('sleep_wakeups')[['total_symptoms', 'max_severity']].mean().to_string())
    print("\n")
    
    # 4. specific symptoms (e.g. bloating) vs food
    bloating = symps[symps['symptom_name'].str.contains('bloat', case=False, na=False)]
    bloat_days = bloating['log_date'].unique()
    print("## Days with Bloating")
    print(bloat_days)
    
    cramps = symps[symps['symptom_name'].str.contains('cramp', case=False, na=False)]
    cramp_days = cramps['log_date'].unique()
    print("## Days with Cramping")
    print(cramp_days)

if __name__ == "__main__":
    run_analysis()
