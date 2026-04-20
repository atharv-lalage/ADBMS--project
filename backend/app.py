from flask import Flask, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
import pandas as pd
import sys
import os
import threading
import uuid
import traceback

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from etl.etl_pipeline import load_and_clean_data, get_engine, populate_oltp, populate_dw
from mining.segmentation import generate_segmentation
from mining.prediction import generate_prediction
from mining.market_basket import generate_market_basket

app = Flask(__name__)
CORS(app)

df = None
cached_analytics = {}

# ETL job state store: job_id -> { status, logs, error }
etl_jobs = {}

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


# ── Analytics Endpoints ──────────────────────────────────────────────────────

@app.route('/api/products', methods=['GET'])
def get_products():
    if 'products' in cached_analytics:
        return jsonify(cached_analytics['products'])

    data = get_data()
    if data.empty:
        return jsonify([])

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

    max_date = data['InvoiceDate'].max()
    sample_data = data[data['InvoiceDate'] >= (max_date - pd.Timedelta(days=30))]
    rules = generate_market_basket(sample_data)
    cached_analytics['market_basket'] = rules
    return jsonify(rules)


# ── ETL Endpoint ─────────────────────────────────────────────────────────────

def _run_etl_job(job_id):
    """Runs ETL in a background thread, appending logs to etl_jobs[job_id]."""
    logs = etl_jobs[job_id]['logs']

    def log(msg):
        logs.append(msg)
        print(f"[ETL:{job_id}] {msg}")

    try:
        log("EXTRACT: Reading Online Retail.xlsx into memory...")
        file_path = os.path.join(os.path.dirname(__file__), '..', 'dataset', 'Online Retail.xlsx')
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Dataset not found at {file_path}. Place 'Online Retail.xlsx' in the dataset/ folder.")

        cleaned_df = load_and_clean_data(file_path)
        log(f"EXTRACT: Loaded {len(cleaned_df)} rows after cleaning.")

        # Refresh in-memory cache
        global df, cached_analytics
        df = cleaned_df
        cache_file = os.path.join(os.path.dirname(__file__), '..', 'dataset', 'cached_data.pkl')
        df.to_pickle(cache_file)
        cached_analytics = {}
        log("TRANSFORM: Pickle cache refreshed. Analytics cache cleared.")

        # Push to DB if connection available
        engine = get_engine()
        if engine:
            try:
                log("LOAD (OLTP): Populating users, products, orders, order_items...")
                populate_oltp(cleaned_df, engine)
                log("LOAD (OLTP): Complete.")

                log("LOAD (OLAP): Populating dim_* tables and fact_sales...")
                populate_dw(cleaned_df, engine)
                log("LOAD (OLAP): Data Warehouse synchronization complete.")
            except Exception as db_err:
                log(f"WARNING: DB load failed — {db_err}. File-based analytics still available.")
        else:
            log("INFO: No DATABASE_URL configured. Skipping DB load. File-based analytics ready.")

        log("PIPELINE SYNCHRONIZATION COMPLETE.")
        etl_jobs[job_id]['status'] = 'complete'

    except Exception as e:
        etl_jobs[job_id]['status'] = 'error'
        etl_jobs[job_id]['error'] = str(e)
        logs.append(f"ERROR: {e}")
        traceback.print_exc()


@app.route('/api/etl/run', methods=['POST'])
def run_etl():
    """Kick off a background ETL job and return a job_id to poll."""
    job_id = str(uuid.uuid4())[:8]
    etl_jobs[job_id] = {'status': 'running', 'logs': [], 'error': None}
    thread = threading.Thread(target=_run_etl_job, args=(job_id,), daemon=True)
    thread.start()
    return jsonify({'job_id': job_id, 'status': 'running'})


@app.route('/api/etl/status/<job_id>', methods=['GET'])
def etl_status(job_id):
    """Poll ETL job status and streamed logs."""
    if job_id not in etl_jobs:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(etl_jobs[job_id])


# ── OLAP Query Endpoint ───────────────────────────────────────────────────────

# Safe whitelist of pre-defined OLAP query keys
@app.route('/api/olap/query', methods=['POST'])
def run_olap_query():
    """Execute a dynamic OLAP query with user-supplied filters."""
    body = request.get_json(silent=True) or {}
    query_key = body.get('query_key', '')
    filters = body.get('filters', {})

    valid_keys = ['rollup', 'drilldown', 'slice', 'dice']
    if query_key not in valid_keys:
        return jsonify({'error': f'Unknown query key. Valid: {valid_keys}'}), 400

    engine = get_engine()
    if not engine:
        return jsonify({'error': 'No database connection. Set DATABASE_URL in .env'}), 503

    try:
        params = {}

        if query_key == 'rollup':
            where = ''
            if filters.get('year'):
                where = 'WHERE dt.year = :year'
                params['year'] = int(filters['year'])
            sql = f"""
                SELECT dt.year, dt.quarter, SUM(sf.amount) as total_revenue
                FROM ecom_sales_fact sf
                JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
                {where}
                GROUP BY dt.year, dt.quarter
                ORDER BY dt.year, dt.quarter
            """

        elif query_key == 'drilldown':
            where = 'WHERE 1=1'
            if filters.get('country'):
                where += ' AND LOWER(dc.country) = LOWER(:country)'
                params['country'] = filters['country']
            if filters.get('year'):
                where += ' AND dt.year = :year'
                params['year'] = int(filters['year'])
            sql = f"""
                SELECT dc.country, dp.name as product_name, SUM(sf.amount) as total_sales
                FROM ecom_sales_fact sf
                JOIN ecom_dim_customer dc ON sf.user_id = dc.user_id
                JOIN ecom_dim_product dp ON sf.product_id = dp.product_id
                JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
                {where}
                GROUP BY dc.country, dp.name
                ORDER BY total_sales DESC
                LIMIT 20
            """

        elif query_key == 'slice':
            month = int(filters.get('month', 12))
            year = int(filters.get('year', 2010))
            params = {'month': month, 'year': year}
            sql = """
                SELECT dp.name as product_name,
                       SUM(sf.quantity) as units_sold,
                       SUM(sf.amount) as gross_revenue
                FROM ecom_sales_fact sf
                JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
                JOIN ecom_dim_product dp ON sf.product_id = dp.product_id
                WHERE dt.month = :month AND dt.year = :year
                GROUP BY dp.name
                ORDER BY gross_revenue DESC
                LIMIT 15
            """

        elif query_key == 'dice':
            # categories and years are comma-separated strings e.g. "Gift,Decoration"
            raw_cats = filters.get('categories', 'Gift,Decoration')
            raw_years = filters.get('years', '2010,2011')
            categories = [c.strip() for c in raw_cats.split(',') if c.strip()]
            years = [int(y.strip()) for y in raw_years.split(',') if y.strip()]
            if not categories:
                categories = ['Gift', 'Decoration']
            if not years:
                years = [2010, 2011]
            # Build safe parameterised IN clauses
            cat_placeholders = ', '.join([f':cat{i}' for i in range(len(categories))])
            yr_placeholders = ', '.join([f':yr{i}' for i in range(len(years))])
            for i, c in enumerate(categories):
                params[f'cat{i}'] = c
            for i, y in enumerate(years):
                params[f'yr{i}'] = y
            sql = f"""
                SELECT dcat.category_name, dt.year, SUM(sf.amount) as total_sales
                FROM ecom_sales_fact sf
                JOIN ecom_dim_product dp ON sf.product_id = dp.product_id
                JOIN ecom_dim_category dcat ON dp.category_id = dcat.category_id
                JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
                WHERE dcat.category_name IN ({cat_placeholders})
                  AND dt.year IN ({yr_placeholders})
                GROUP BY dcat.category_name, dt.year
                ORDER BY dt.year, dcat.category_name
            """

        from sqlalchemy import text
        result_df = pd.read_sql(text(sql), engine, params=params)
        rows = result_df.values.tolist()
        sanitized = []
        for row in rows:
            sanitized.append([str(v) if not isinstance(v, (int, float, str, type(None))) else v for v in row])
        return jsonify({
            'columns': list(result_df.columns),
            'rows': sanitized,
            'row_count': len(sanitized)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Transaction (OLTP Simulate) Endpoint ─────────────────────────────────────

@app.route('/api/transaction', methods=['POST'])
def simulate_transaction():
    """Insert a simulated order into the OLTP database."""
    body = request.get_json(silent=True) or {}
    product_id = str(body.get('product_id', ''))
    product_name = str(body.get('product_name', 'Unknown'))
    quantity = int(body.get('quantity', 1))
    amount = float(body.get('amount', 0))

    if not product_id:
        return jsonify({'error': 'product_id is required'}), 400

    engine = get_engine()
    if not engine:
        # No DB — return a simulated success so UI still works
        return jsonify({
            'success': True,
            'simulated': True,
            'message': f'[SIMULATED — no DB] Order recorded locally for {product_name} x{quantity}',
            'order_id': f'SIM-{uuid.uuid4().hex[:8].upper()}'
        })

    try:
        from sqlalchemy import text
        order_id = f'WEB-{uuid.uuid4().hex[:8].upper()}'
        user_id = '99999'  # Demo admin user

        with engine.begin() as conn:
            # Ensure demo user exists
            conn.execute(text("""
                INSERT INTO ecom_users (user_id, name, email, country)
                VALUES (:uid, 'Admin Demo', 'admin@datamart.enterprise', 'IN')
                ON CONFLICT (user_id) DO NOTHING
            """), {'uid': user_id})

            conn.execute(text("""
                INSERT INTO ecom_orders (order_id, user_id, order_date)
                VALUES (:oid, :uid, NOW())
            """), {'oid': order_id, 'uid': user_id})

            conn.execute(text("""
                INSERT INTO ecom_order_items (order_id, product_id, quantity, amount)
                VALUES (:oid, :pid, :qty, :amt)
            """), {'oid': order_id, 'pid': product_id, 'qty': quantity, 'amt': amount})

        return jsonify({
            'success': True,
            'simulated': False,
            'message': f'Order {order_id} committed to OLTP DB for {product_name} x{quantity}',
            'order_id': order_id
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Dataset Upload Endpoint ───────────────────────────────────────────────────

ALLOWED_EXTENSIONS = {'xlsx', 'xls', 'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/dataset/upload', methods=['POST'])
def upload_dataset():
    """Replace the active dataset with an uploaded file."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in request'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Only .xlsx, .xls, or .csv files are allowed'}), 400

    dataset_dir = os.path.join(os.path.dirname(__file__), '..', 'dataset')
    os.makedirs(dataset_dir, exist_ok=True)

    filename = secure_filename(file.filename)
    save_path = os.path.join(dataset_dir, filename)
    file.save(save_path)

    # Delete old pickle cache so next ETL run re-processes the new file
    cache_file = os.path.join(dataset_dir, 'cached_data.pkl')
    if os.path.exists(cache_file):
        os.remove(cache_file)

    # Clear in-memory state
    global df, cached_analytics
    df = None
    cached_analytics = {}

    return jsonify({
        'success': True,
        'filename': filename,
        'message': f'Dataset "{filename}" uploaded. Click Run ETL Pipeline to process it.'
    })


@app.route('/api/dataset/info', methods=['GET'])
def dataset_info():
    """Returns info about the currently active dataset."""
    dataset_dir = os.path.join(os.path.dirname(__file__), '..', 'dataset')
    files = [f for f in os.listdir(dataset_dir) if f.endswith(('.xlsx', '.xls', '.csv'))]
    cache_exists = os.path.exists(os.path.join(dataset_dir, 'cached_data.pkl'))

    info = []
    for f in files:
        path = os.path.join(dataset_dir, f)
        size_mb = round(os.path.getsize(path) / (1024 * 1024), 2)
        info.append({'name': f, 'size_mb': size_mb})

    return jsonify({'files': info, 'cache_ready': cache_exists})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
