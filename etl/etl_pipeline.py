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

def load_and_clean_data(file_path):
    print("Loading dataset...")
    # Load Excel file (this might take a minute depending on hardware)
    df = pd.read_excel(file_path)
    print(f"Original shape: {df.shape}")

    # 1. Remove Null Values in CustomerID
    df = df.dropna(subset=['CustomerID'])

    # 2. Remove Negative Quantities (returns/cancellations)
    df = df[df['Quantity'] > 0]

    # 3. Handle Date Format
    df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])

    # Derive generic category (since the dataset doesn't have one, we can map description to a category)
    # For demonstration, we'll assign 'General' to all or derive based on keywords
    df['Category'] = 'General'
    df.loc[df['Description'].str.contains('BAG', case=False, na=False), 'Category'] = 'Bags'
    df.loc[df['Description'].str.contains('MUG', case=False, na=False), 'Category'] = 'Mugs'
    df.loc[df['Description'].str.contains('HEART', case=False, na=False), 'Category'] = 'Decoration'
    df.loc[df['Description'].str.contains('GIFT', case=False, na=False), 'Category'] = 'Gift'

    # Convert GBP to INR (approx 105)
    df['UnitPrice'] = df['UnitPrice'] * 105

    # Compute Amount
    df['Amount'] = df['Quantity'] * df['UnitPrice']
    
    print(f"Cleaned shape: {df.shape}")
    return df

def populate_oltp(df, engine):
    print("Populating OLTP Tables...")
    
    # Extract Users
    users_df = df[['CustomerID', 'Country']].drop_duplicates(subset=['CustomerID']).copy()
    users_df.columns = ['user_id', 'country']
    users_df['user_id'] = users_df['user_id'].astype(int).astype(str)
    users_df['name'] = 'User ' + users_df['user_id']
    users_df['email'] = 'user' + users_df['user_id'] + '@example.com'
    users_df.to_sql('users', engine, if_exists='append', index=False)
    
    # Extract Products
    products_df = df[['StockCode', 'Description', 'Category', 'UnitPrice']].drop_duplicates(subset=['StockCode']).copy()
    # Handle duplicate descriptions for same stock code by taking the first one
    products_df = products_df.groupby('StockCode').first().reset_index()
    products_df.columns = ['product_id', 'name', 'category', 'price']
    products_df['product_id'] = products_df['product_id'].astype(str)
    products_df.to_sql('products', engine, if_exists='append', index=False)
    
    # Extract Orders
    orders_df = df[['InvoiceNo', 'CustomerID', 'InvoiceDate']].drop_duplicates(subset=['InvoiceNo']).copy()
    orders_df.columns = ['order_id', 'user_id', 'order_date']
    orders_df['order_id'] = orders_df['order_id'].astype(str)
    orders_df['user_id'] = orders_df['user_id'].astype(int).astype(str)
    orders_df.to_sql('orders', engine, if_exists='append', index=False)
    
    # Extract Order Items
    order_items_df = df[['InvoiceNo', 'StockCode', 'Quantity', 'Amount']].copy()
    order_items_df.columns = ['order_id', 'product_id', 'quantity', 'amount']
    order_items_df['order_id'] = order_items_df['order_id'].astype(str)
    order_items_df['product_id'] = order_items_df['product_id'].astype(str)
    order_items_df.to_sql('order_items', engine, if_exists='append', index=False)
    print("OLTP Tables populated.")

def populate_dw(df, engine):
    print("Populating Data Warehouse Tables...")
    
    # Categories
    categories = df[['Category']].drop_duplicates().copy()
    categories.columns = ['category_name']
    categories.to_sql('dim_category', engine, if_exists='append', index=False)

    # Fetch Category IDs to map to dimension product
    category_map = pd.read_sql("SELECT category_id, category_name FROM dim_category", engine)
    category_dict = dict(zip(category_map['category_name'], category_map['category_id']))

    # Dim Customer
    dim_cust = df[['CustomerID', 'Country']].drop_duplicates(subset=['CustomerID']).copy()
    dim_cust.columns = ['user_id', 'country']
    dim_cust['user_id'] = dim_cust['user_id'].astype(int).astype(str)
    dim_cust['name'] = 'User ' + dim_cust['user_id']
    dim_cust.to_sql('dim_customer', engine, if_exists='append', index=False)

    # Dim Product
    dim_prod = df[['StockCode', 'Description', 'Category', 'UnitPrice']].drop_duplicates(subset=['StockCode']).copy()
    dim_prod = dim_prod.groupby('StockCode').first().reset_index()
    dim_prod['category_id'] = dim_prod['Category'].map(category_dict)
    dim_prod = dim_prod[['StockCode', 'Description', 'category_id', 'UnitPrice']]
    dim_prod.columns = ['product_id', 'name', 'category_id', 'price']
    dim_prod['product_id'] = dim_prod['product_id'].astype(str)
    dim_prod.to_sql('dim_product', engine, if_exists='append', index=False)

    # Dim Time
    time_df = df[['InvoiceDate']].drop_duplicates().copy()
    time_df['date_id'] = time_df['InvoiceDate'].dt.strftime('%Y%m%d').astype(int)
    time_df['full_date'] = time_df['InvoiceDate'].dt.date
    time_df['day'] = time_df['InvoiceDate'].dt.day
    time_df['month'] = time_df['InvoiceDate'].dt.month
    time_df['year'] = time_df['InvoiceDate'].dt.year
    time_df['quarter'] = time_df['InvoiceDate'].dt.quarter
    time_df['day_of_week'] = time_df['InvoiceDate'].dt.dayofweek
    time_df = time_df.drop('InvoiceDate', axis=1).drop_duplicates(subset=['date_id'])
    time_df.to_sql('dim_time', engine, if_exists='append', index=False)

    # Fact Table
    fact_df = df[['InvoiceNo', 'StockCode', 'CustomerID', 'InvoiceDate', 'Quantity', 'Amount']].copy()
    fact_df['date_id'] = fact_df['InvoiceDate'].dt.strftime('%Y%m%d').astype(int)
    fact_df['order_id'] = fact_df['InvoiceNo'].astype(str)
    fact_df['product_id'] = fact_df['StockCode'].astype(str)
    fact_df['user_id'] = fact_df['CustomerID'].astype(int).astype(str)
    
    fact_df = fact_df[['order_id', 'product_id', 'user_id', 'date_id', 'Quantity', 'Amount']]
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
