import sqlite3
import pandas as pd

def food_analysis():
    conn = sqlite3.connect('../data/health_tracker.db')
    meals = pd.read_sql_query("SELECT * FROM meals", conn)
    
    # Days with bloating: '2026-07-02', '2026-06-27', '2026-06-25'
    bloat_days = ['2026-07-02', '2026-06-27', '2026-06-25']
    print("Meals on Bloat Days:")
    print(meals[meals['log_date'].isin(bloat_days)][['log_date', 'meal_type', 'food_items']].to_string())
    print("\nMeals on Non-Bloat Days:")
    print(meals[~meals['log_date'].isin(bloat_days)][['log_date', 'meal_type', 'food_items']].to_string())

if __name__ == "__main__":
    food_analysis()
