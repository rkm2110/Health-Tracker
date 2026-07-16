import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
import os

db_path = '../data/health_tracker.db'
excel_path = '../outputs/Master_Health_Tracker.xlsx'
chart_path = '../outputs/symptoms_chart.png'

def generate():
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return
        
    conn = sqlite3.connect(db_path)
    
    # 1. Generate Excel Workbook
    try:
        daily_df = pd.read_sql_query("SELECT * FROM daily_logs ORDER BY log_date", conn)
        meals_df = pd.read_sql_query("SELECT * FROM meals ORDER BY log_date, meal_type", conn)
        supps_df = pd.read_sql_query("SELECT * FROM supplements ORDER BY log_date, timing", conn)
        symps_df = pd.read_sql_query("SELECT * FROM symptoms ORDER BY log_date, timing", conn)
        
        try:
            with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
                daily_df.to_excel(writer, sheet_name='Daily Logs', index=False)
                meals_df.to_excel(writer, sheet_name='Meals', index=False)
                supps_df.to_excel(writer, sheet_name='Supplements', index=False)
                symps_df.to_excel(writer, sheet_name='Symptoms', index=False)
            print(f"Excel tracker generated at {excel_path}")
        except PermissionError:
            fallback = excel_path.replace('.xlsx', '_updated.xlsx')
            with pd.ExcelWriter(fallback, engine='openpyxl') as writer:
                daily_df.to_excel(writer, sheet_name='Daily Logs', index=False)
                meals_df.to_excel(writer, sheet_name='Meals', index=False)
                supps_df.to_excel(writer, sheet_name='Supplements', index=False)
                symps_df.to_excel(writer, sheet_name='Symptoms', index=False)
            print(f"Excel tracker generated at {fallback}")
            
    except Exception as e:
        print(f"Error generating Excel: {e}")
        
    # 2. Generate Chart for Symptoms
    try:
        if not symps_df.empty and 'severity' in symps_df.columns:
            symps_df['severity'] = pd.to_numeric(symps_df['severity'], errors='coerce').fillna(0)
            
            # Define categories
            categories = {
                'Bloating & Distension': ['bloat', 'distension', 'distention'],
                'Cramping': ['cramp'],
                'Bladder & Urinary': ['urinary', 'bladder'],
                'Abdominal & Pelvic Pain': ['pain', 'pressure', 'raw', 'ovary', 'ovarian']
            }
            
            def assign_category(symptom):
                symptom = str(symptom).lower()
                for cat, keywords in categories.items():
                    if any(kw in symptom for kw in keywords):
                        return cat
                return 'Other'
                
            symps_df['category'] = symps_df['symptom_name'].apply(assign_category)
            
            # Calculate max severity per category per day
            daily_cat = symps_df.groupby(['log_date', 'category'])['severity'].max().reset_index()
            
            # Create a 2x2 subplot
            fig, axes = plt.subplots(2, 2, figsize=(15, 10))
            axes = axes.flatten()
            
            dates = sorted(daily_cat['log_date'].unique())
            
            for idx, (cat_name, _) in enumerate(categories.items()):
                ax = axes[idx]
                cat_data = daily_cat[daily_cat['category'] == cat_name]
                
                # Merge with all dates to ensure continuous line even if 0
                cat_data_full = pd.DataFrame({'log_date': dates})
                cat_data_full = cat_data_full.merge(cat_data, on='log_date', how='left').fillna(0)
                
                ax.plot(cat_data_full['log_date'], cat_data_full['severity'], marker='o', linestyle='-', linewidth=2)
                ax.set_title(f'Max Severity: {cat_name}')
                ax.set_ylabel('Max Severity Score')
                ax.set_ylim(0, 5.5)
                ax.tick_params(axis='x', rotation=45)
                ax.grid(True, alpha=0.3)
                
            plt.tight_layout()
            plt.savefig(chart_path)
            print(f"Chart generated at {chart_path}")
        else:
            print("No symptom data available to plot.")
    except Exception as e:
        print(f"Error generating chart: {e}")
        
    conn.close()

if __name__ == '__main__':
    generate()
