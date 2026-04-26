import pandas as pd
from sqlalchemy import create_engine
import numpy as np
import os
from dotenv import load_dotenv

# Load environment variables from .env file up one level
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Database connection credentials (adjust as needed)
DATABASE_URL = os.environ.get('DATABASE_URL')
DB_USER = 'postgres'
DB_PASSWORD = 'password' # CHANGE ME
DB_HOST = 'localhost'
DB_PORT = '5432'
DB_NAME = 'ecommerce_db'

def get_engine():
    if DATABASE_URL:
        return create_engine(DATABASE_URL)
    return create_engine(f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}')

def standardize_dataset(df, column_mapping):
    """
    Renames dynamically mapped columns into the fixed Target Internal Schema.
    """
    # column_mapping comes from frontend, example: {'transaction_id': 'InvoiceNo', ...}
    # We want to rename 'InvoiceNo' (col) -> 'transaction_id' (target)
    # The frontend mapping dict structure is target_schema_key: original_csv_col
    rename_dict = {v: k for k, v in column_mapping.items() if v}
    df = df.rename(columns=rename_dict)
    
    target_cols = ['transaction_id', 'customer_id', 'product_id', 'product_name', 'timestamp', 'quantity', 'price']
    existing_cols = [col for col in target_cols if col in df.columns]
    
    return df[existing_cols]

def load_and_clean_data(df):
    print("Executing generic cleaning on Target Schema...")
    
    # 1. Remove Null Values in IDs
    if 'transaction_id' in df.columns:
        df = df.dropna(subset=['transaction_id'])
    if 'customer_id' in df.columns:
        df = df.dropna(subset=['customer_id'])

    # 2. Format Quantities and Pricing
    if 'quantity' in df.columns:
        df['quantity'] = pd.to_numeric(df['quantity'], errors='coerce')
        df = df[df['quantity'] > 0]
        
    if 'price' in df.columns:
        df['price'] = pd.to_numeric(df['price'], errors='coerce')

    # 3. Handle Date Format
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')

    # 4. Generic Categorization fallback
    df['category'] = 'General'

    # Compute Derived Amount
    if 'quantity' in df.columns and 'price' in df.columns:
        df['amount'] = df['quantity'] * df['price']
    
    print(f"Cleaned generic shape: {df.shape}")
    return df

def populate_oltp(df, engine):
    print("Populating OLTP Tables...")
    
    # Extract Users
    users_df = df[['customer_id']].drop_duplicates().copy()
    users_df.columns = ['user_id']
    users_df['user_id'] = users_df['user_id'].astype(str).str.split('.').str[0]
    users_df['name'] = 'User ' + users_df['user_id']
    users_df['email'] = 'user' + users_df['user_id'] + '@example.com'
    users_df.to_sql('users', engine, if_exists='append', index=False)
    
    # Extract Products
    products_df = df[['product_id', 'product_name', 'category', 'price']].drop_duplicates(subset=['product_id']).copy()
    products_df = products_df.groupby('product_id').first().reset_index()
    products_df.columns = ['product_id', 'name', 'category', 'price']
    products_df['product_id'] = products_df['product_id'].astype(str)
    products_df.to_sql('products', engine, if_exists='append', index=False)
    
    # Extract Orders
    orders_df = df[['transaction_id', 'customer_id', 'timestamp']].drop_duplicates(subset=['transaction_id']).copy()
    orders_df.columns = ['order_id', 'user_id', 'order_date']
    orders_df['order_id'] = orders_df['order_id'].astype(str)
    orders_df['user_id'] = orders_df['user_id'].astype(str).str.split('.').str[0]
    orders_df.to_sql('orders', engine, if_exists='append', index=False)
    
    # Extract Order Items
    order_items_df = df[['transaction_id', 'product_id', 'quantity', 'amount']].copy()
    order_items_df.columns = ['order_id', 'product_id', 'quantity', 'amount']
    order_items_df['order_id'] = order_items_df['order_id'].astype(str)
    order_items_df['product_id'] = order_items_df['product_id'].astype(str)
    order_items_df.to_sql('order_items', engine, if_exists='append', index=False)
    print("OLTP Tables populated.")

def populate_dw(df, engine):
    print("Populating Data Warehouse Tables...")
    
    # Categories
    categories = df[['category']].drop_duplicates().copy()
    categories.columns = ['category_name']
    categories.to_sql('dim_category', engine, if_exists='append', index=False)

    # Fetch Category IDs to map to dimension product
    category_map = pd.read_sql("SELECT category_id, category_name FROM dim_category", engine)
    category_dict = dict(zip(category_map['category_name'], category_map['category_id']))

    # Dim Customer
    dim_cust = df[['customer_id']].drop_duplicates().copy()
    dim_cust.columns = ['user_id']
    dim_cust['user_id'] = dim_cust['user_id'].astype(str).str.split('.').str[0]
    dim_cust['country'] = 'Unknown'
    dim_cust['name'] = 'User ' + dim_cust['user_id']
    dim_cust.to_sql('dim_customer', engine, if_exists='append', index=False)

    # Dim Product
    dim_prod = df[['product_id', 'product_name', 'category', 'price']].drop_duplicates(subset=['product_id']).copy()
    dim_prod = dim_prod.groupby('product_id').first().reset_index()
    dim_prod['category_id'] = dim_prod['category'].map(category_dict)
    dim_prod = dim_prod[['product_id', 'product_name', 'category_id', 'price']]
    dim_prod.columns = ['product_id', 'name', 'category_id', 'price']
    dim_prod['product_id'] = dim_prod['product_id'].astype(str)
    dim_prod.to_sql('dim_product', engine, if_exists='append', index=False)

    # Dim Time
    time_df = df[['timestamp']].dropna().drop_duplicates().copy()
    time_df['date_id'] = time_df['timestamp'].dt.strftime('%Y%m%d').astype(int)
    time_df['full_date'] = time_df['timestamp'].dt.date
    time_df['day'] = time_df['timestamp'].dt.day
    time_df['month'] = time_df['timestamp'].dt.month
    time_df['year'] = time_df['timestamp'].dt.year
    time_df['quarter'] = time_df['timestamp'].dt.quarter
    time_df['day_of_week'] = time_df['timestamp'].dt.dayofweek
    time_df = time_df.drop('timestamp', axis=1).drop_duplicates(subset=['date_id'])
    time_df.to_sql('dim_time', engine, if_exists='append', index=False)

    # Fact Table
    fact_df = df[['transaction_id', 'product_id', 'customer_id', 'timestamp', 'quantity', 'amount']].dropna(subset=['timestamp']).copy()
    fact_df['date_id'] = fact_df['timestamp'].dt.strftime('%Y%m%d').astype(int)
    fact_df['order_id'] = fact_df['transaction_id'].astype(str)
    fact_df['product_id'] = fact_df['product_id'].astype(str)
    fact_df['user_id'] = fact_df['customer_id'].astype(str).str.split('.').str[0]
    
    fact_df = fact_df[['order_id', 'product_id', 'user_id', 'date_id', 'quantity', 'amount']]
    fact_df.columns = ['order_id', 'product_id', 'user_id', 'date_id', 'quantity', 'amount']
    fact_df.to_sql('sales_fact', engine, if_exists='append', index=False)
    
    print("Data Warehouse populated.")

if __name__ == '__main__':
    file_path = '../dataset/Online Retail.xlsx'
    df = load_and_clean_data(file_path)
    engine = get_engine()
    
    try:
        populate_oltp(df, engine)
        populate_dw(df, engine)
        print("ETL Process Complete!")
    except Exception as e:
        print("An error occurred during DB load. Note: Ensure tables are created first using the SQL scripts.")
        print(str(e))
