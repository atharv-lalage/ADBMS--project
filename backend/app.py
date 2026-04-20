from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import sys
import os

# Add parent path to import mining scripts
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from etl.etl_pipeline import load_and_clean_data
from mining.segmentation import generate_segmentation
from mining.prediction import generate_prediction
from mining.market_basket import generate_market_basket

app = Flask(__name__)
CORS(app)

# Global memory to hold dataset to prevent reloading on every request
df = None
cached_analytics = {}

def get_data():
    global df
    if df is None:
        cache_file = os.path.join(os.path.dirname(__file__), '..', 'dataset', 'cached_data.pkl')
        if os.path.exists(cache_file):
            print("Loading dataset from rapid local cache...")
            df = pd.read_pickle(cache_file)
        else:
            file_path = os.path.join(os.path.dirname(__file__), '..', 'dataset', 'Online Retail.xlsx')
            try:
                df = load_and_clean_data(file_path)
                df.to_pickle(cache_file)
            except Exception as e:
                print(f"Error loading data: {e}")
                df = pd.DataFrame()
    return df

@app.route('/api/products', methods=['GET'])
def get_products():
    if 'products' in cached_analytics:
        return jsonify(cached_analytics['products'])
        
    data = get_data()
    if data.empty:
        return jsonify([])
    
    # Return top 50 products for listing
    products = data[['StockCode', 'Description', 'Category', 'UnitPrice']].drop_duplicates(subset=['StockCode']).head(50)
    products.columns = ['id', 'name', 'category', 'price']
    
    result = products.to_dict(orient='records')
    cached_analytics['products'] = result
    return jsonify(result)

@app.route('/api/analytics/sales', methods=['GET'])
def get_sales():
    if 'sales' in cached_analytics:
        return jsonify(cached_analytics['sales'])
        
    data = get_data()
    if data.empty:
        return jsonify({})
        
    total_sales = data['Amount'].sum()
    total_orders = data['InvoiceNo'].nunique()
    
    result = {
        'total_sales': round(total_sales, 2),
        'total_orders': total_orders,
        'average_order_value': round(total_sales / total_orders, 2)
    }
    cached_analytics['sales'] = result
    return jsonify(result)

@app.route('/api/analytics/clusters', methods=['GET'])
def get_clusters():
    if 'clusters' in cached_analytics:
        return jsonify(cached_analytics['clusters'])
        
    data = get_data()
    if data.empty:
        return jsonify([])
    
    clusters = generate_segmentation(data)
    cached_analytics['clusters'] = clusters
    return jsonify(clusters)

@app.route('/api/analytics/predictions', methods=['GET'])
def get_predictions():
    if 'predictions' in cached_analytics:
        return jsonify(cached_analytics['predictions'])
        
    data = get_data()
    if data.empty:
        return jsonify([])
        
    predictions = generate_prediction(data)
    cached_analytics['predictions'] = predictions
    return jsonify(predictions)

@app.route('/api/analytics/market-basket', methods=['GET'])
def get_market_basket():
    if 'market_basket' in cached_analytics:
        return jsonify(cached_analytics['market_basket'])
        
    data = get_data()
    if data.empty:
        return jsonify([])
        
    # Since market basket is expensive on 500k rows, we'll sample the latest month
    max_date = data['InvoiceDate'].max()
    sample_data = data[data['InvoiceDate'] >= (max_date - pd.Timedelta(days=30))]
    
    rules = generate_market_basket(sample_data)
    cached_analytics['market_basket'] = rules
    return jsonify(rules)

if __name__ == '__main__':
    # Pre-warm data loading
    # get_data() 
    app.run(debug=True, port=5000)
