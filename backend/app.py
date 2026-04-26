from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import sys
import os
import json
from werkzeug.utils import secure_filename

# Add parent path to import mining scripts
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from etl.etl_pipeline import load_and_clean_data, standardize_dataset
from mining.segmentation import generate_segmentation
from mining.prediction import generate_prediction
from mining.market_basket import generate_market_basket

app = Flask(__name__)
CORS(app)

# Use localized file cache instead of generic loader
CACHE_FILE = os.path.join(os.path.dirname(__file__), '..', 'dataset', 'cached_data.pkl')

# Keep analytics cache in memory
cached_analytics = {}

def get_current_dataset():
    if os.path.exists(CACHE_FILE):
        return pd.read_pickle(CACHE_FILE)
    return pd.DataFrame()

@app.route('/api/upload', methods=['POST'])
def upload_dataset():
    if 'file' not in request.files or 'mapping' not in request.form:
        return jsonify({"error": "Missing payload"}), 400
        
    file = request.files['file']
    try:
        mapping = json.loads(request.form['mapping'])
    except Exception:
        return jsonify({"error": "Invalid mapping structure"}), 400
        
    filename = secure_filename(file.filename)
    
    try:
        # 1. Load Raw File Data
        if filename.endswith('.csv'):
            df_new = pd.read_csv(file)
        elif filename.endswith(('.xls', '.xlsx')):
            df_new = pd.read_excel(file)
        else:
            return jsonify({"error": "Unsupported format"}), 400
        
        # 2. Standardize Schema internally
        df_new = standardize_dataset(df_new, mapping)
        
        # 3. Execution Standard Cleaning Parameters
        df_new = load_and_clean_data(df_new)
        
        if df_new.empty:
            return jsonify({"error": "Dataset was wiped entirely during cleaning. Check mapping."}), 400
            
        # 4. Save specific localized pickle for state handling
        df_new.to_pickle(CACHE_FILE)
        
        # 5. Clear Analytics API caches for fresh recomputations
        cached_analytics.clear()
        
        return jsonify({"status": "success", "rows_mapped": len(df_new)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/dataset/headers', methods=['POST'])
def get_dataset_headers():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    try:
        if filename.endswith('.csv'):
            df_temp = pd.read_csv(file, nrows=0)
        elif filename.endswith(('.xls', '.xlsx')):
            df_temp = pd.read_excel(file, nrows=0)
        else:
            return jsonify({"error": "Unsupported format"}), 400
        return jsonify({"columns": df_temp.columns.tolist()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/products', methods=['GET'])
def get_products():
    if 'products' in cached_analytics:
        return jsonify(cached_analytics['products'])
        
    data = get_current_dataset()
    if data.empty:
        return jsonify([])
    
    products = data[['product_id', 'product_name', 'category', 'price']].drop_duplicates(subset=['product_id']).head(50)
    products.columns = ['id', 'name', 'category', 'price']
    
    result = products.to_dict(orient='records')
    cached_analytics['products'] = result
    return jsonify(result)

@app.route('/api/analytics/sales', methods=['GET'])
def get_sales():
    if 'sales' in cached_analytics:
        return jsonify(cached_analytics['sales'])
        
    data = get_current_dataset()
    if data.empty:
        return jsonify({})
        
    total_sales = data['amount'].sum()
    total_orders = data['transaction_id'].nunique()
    
    result = {
        'total_sales': round(total_sales, 2),
        'total_orders': total_orders,
        'average_order_value': round(total_sales / total_orders, 2) if total_orders > 0 else 0
    }
    cached_analytics['sales'] = result
    return jsonify(result)

@app.route('/api/analytics/clusters', methods=['GET'])
def get_clusters():
    if 'clusters' in cached_analytics:
        return jsonify(cached_analytics['clusters'])
        
    data = get_current_dataset()
    if data.empty:
        return jsonify([])
    
    clusters = generate_segmentation(data)
    cached_analytics['clusters'] = clusters
    return jsonify(clusters)

@app.route('/api/analytics/predictions', methods=['GET'])
def get_predictions():
    if 'predictions' in cached_analytics:
        return jsonify(cached_analytics['predictions'])
        
    data = get_current_dataset()
    if data.empty:
        return jsonify([])
        
    predictions = generate_prediction(data)
    cached_analytics['predictions'] = predictions
    return jsonify(predictions)

@app.route('/api/analytics/market-basket', methods=['GET'])
def get_market_basket():
    if 'market_basket' in cached_analytics:
        return jsonify(cached_analytics['market_basket'])
        
    data = get_current_dataset()
    if data.empty:
        return jsonify([])
        
    max_date = data['timestamp'].max()
    sample_data = data[data['timestamp'] >= (max_date - pd.Timedelta(days=30))]
    
    rules = generate_market_basket(sample_data)
    cached_analytics['market_basket'] = rules
    return jsonify(rules)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
