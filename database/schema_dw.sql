-- Data Warehouse Schema for E-Commerce Data Analytics System
-- Prefixed with ecom_ to avoid collision with other project tables

DROP TABLE IF EXISTS ecom_sales_fact CASCADE;
DROP TABLE IF EXISTS ecom_dim_time CASCADE;
DROP TABLE IF EXISTS ecom_dim_product CASCADE;
DROP TABLE IF EXISTS ecom_dim_customer CASCADE;
DROP TABLE IF EXISTS ecom_dim_category CASCADE;

CREATE TABLE ecom_dim_category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE
);

CREATE TABLE ecom_dim_customer (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    country VARCHAR(50)
);

CREATE TABLE ecom_dim_product (
    product_id VARCHAR(50) PRIMARY KEY,
    name TEXT,
    category_id INTEGER REFERENCES ecom_dim_category(category_id),
    price DECIMAL(10, 2)
);

CREATE TABLE ecom_dim_time (
    date_id INT PRIMARY KEY,
    full_date DATE,
    day INT,
    month INT,
    year INT,
    quarter INT,
    day_of_week INT
);

CREATE TABLE ecom_sales_fact (
    fact_id SERIAL PRIMARY KEY,
    order_id VARCHAR(50),
    product_id VARCHAR(50) REFERENCES ecom_dim_product(product_id),
    user_id VARCHAR(50) REFERENCES ecom_dim_customer(user_id),
    date_id INT REFERENCES ecom_dim_time(date_id),
    quantity INTEGER,
    amount DECIMAL(10, 2)
);
