import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np

def generate_prediction(df):
    """
    Simulates Sales Prediction using Linear Regression based on monthly sales trend.
    """
    # Aggregate sales by month
    df['Month_Year'] = df['timestamp'].dt.to_period('M')
    monthly_sales = df.groupby('Month_Year')['amount'].sum().reset_index()
    
    # Convert 'Month_Year' to an integer scale (e.g., months since start)
    monthly_sales['Month_Num'] = np.arange(len(monthly_sales))
    
    X = monthly_sales[['Month_Num']]
    y = monthly_sales['amount']
    
    if len(X) < 2:
        return []
        
    model = LinearRegression()
    model.fit(X, y)
    
    # Predict next 3 months
    future_months = pd.DataFrame({'Month_Num': [len(X), len(X)+1, len(X)+2]})
    future_predictions = model.predict(future_months)
    
    results = []
    # Historical data for chart
    for _, row in monthly_sales.iterrows():
        results.append({
            'period': str(row['Month_Year']),
            'actual_sales': round(row['amount'], 2),
            'predicted_sales': round(model.predict(pd.DataFrame({'Month_Num': [row['Month_Num']]}))[0], 2)
        })
        
    # Future predictions
    last_period = monthly_sales['Month_Year'].iloc[-1]
    for i, pred in enumerate(future_predictions):
        next_month = last_period + (i + 1)
        results.append({
            'period': str(next_month),
            'actual_sales': None,
            'predicted_sales': round(pred, 2)
        })
        
    return results
