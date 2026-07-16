import sqlite3
import pandas as pd

def generate_unified_table():
    conn = sqlite3.connect('../data/health_tracker.db')
    
    # Get daily logs
    daily_df = pd.read_sql_query("SELECT * FROM daily_logs ORDER BY log_date", conn)
    
    # Get meals grouped by date
    meals_df = pd.read_sql_query("SELECT log_date, meal_type, food_items FROM meals", conn)
    meals_grouped = meals_df.groupby('log_date').apply(
        lambda x: '<br>'.join(f"**{row['meal_type']}**: {row['food_items']}" for _, row in x.iterrows())
    ).reset_index(name='meals_summary')
    
    # Get supplements grouped by date
    supps_df = pd.read_sql_query("SELECT log_date, timing, supplement_name FROM supplements", conn)
    supps_grouped = supps_df.groupby('log_date').apply(
        lambda x: '<br>'.join(f"**{row['timing']}**: {row['supplement_name']}" for _, row in x.iterrows())
    ).reset_index(name='supplements_summary')
    
    # Get symptoms grouped by date
    symps_df = pd.read_sql_query("SELECT log_date, timing, symptom_name, severity FROM symptoms", conn)
    symps_grouped = symps_df.groupby('log_date').apply(
        lambda x: '<br>'.join(f"**{row['timing']}**: {row['symptom_name']} (Sev: {row['severity']})" for _, row in x.iterrows())
    ).reset_index(name='symptoms_summary')
    
    # Merge
    merged_df = daily_df.merge(meals_grouped, on='log_date', how='left')
    merged_df = merged_df.merge(supps_grouped, on='log_date', how='left')
    merged_df = merged_df.merge(symps_grouped, on='log_date', how='left')
    
    merged_df['meals_summary'] = merged_df['meals_summary'].fillna('None')
    merged_df['supplements_summary'] = merged_df['supplements_summary'].fillna('None')
    merged_df['symptoms_summary'] = merged_df['symptoms_summary'].fillna('None')
    
    # Build markdown table
    print("| Date | Cycle | Water | Susu | BM Evacuation | BM Scale | Exercise/Therapy | Sleep | Meals | Supplements | Symptoms |")
    print("|---|---|---|---|---|---|---|---|---|---|---|")
    
    for _, row in merged_df.iterrows():
        date = row['log_date']
        cycle = row['cycle_day']
        water = row['water_count']
        susu = row['susu_count']
        bm_evac = f"{row['bowel_movement_count']} ({row['bowel_movement_complete']})"
        bm_scale = str(row['bowel_movement_scale'])
        ext = f"{row['exercise']} / {row['supporting_therapy']}"
        
        # Sleep Formatting
        st = row.get('sleep_time', 'N/A')
        wu = row.get('wake_up_time', 'N/A')
        wu_count = row.get('sleep_wakeups', 'N/A')
        tsh = row.get('total_sleep_hours')
        if pd.isna(tsh):
            sleep = f"Sleep: {st}, Wake: {wu} ({wu_count} wakeups)"
        else:
            sleep = f"**{tsh} hrs** (Sleep: {st}, Wake: {wu}, {wu_count} wakeups)"
            
        meals = row['meals_summary']
        supps = row['supplements_summary']
        symps = row['symptoms_summary']
        
        print(f"| {date} | {cycle} | {water} | {susu} | {bm_evac} | {bm_scale} | {ext} | {sleep} | {meals} | {supps} | {symps} |")
        
    conn.close()

if __name__ == '__main__':
    generate_unified_table()
