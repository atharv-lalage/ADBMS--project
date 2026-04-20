-- Data Warehouse Schema for E-Commerce Data Analytics System
-- Drop tables if they exist
DROP TABLE IF EXISTS sales_fact;
DROP TABLE IF EXISTS dim_time;
DROP TABLE IF EXISTS dim_product;
DROP TABLE IF EXISTS dim_customer;
DROP TABLE IF EXISTS dim_category;

-- Snowflake schema aspect: Separate category table
CREATE TABLE dim_category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE
);

-- Dimension: Customer
CREATE TABLE dim_customer (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    country VARCHAR(50)
);

-- Dimension: Product
CREATE TABLE dim_product (
    product_id VARCHAR(50) PRIMARY KEY,
    name TEXT,
    category_id INTEGER REFERENCES dim_category(category_id),
    price DECIMAL(10, 2)
);

-- Dimension: Time
CREATE TABLE dim_time (
    date_id INT PRIMARY KEY, -- e.g., 20231201 for YYYYMMDD
    full_date DATE,
    day INT,
    month INT,
    year INT,
    quarter INT,
    day_of_week INT
);

-- Fact Table
CREATE TABLE sales_fact (
    fact_id SERIAL PRIMARY KEY,
    order_id VARCHAR(50),
    product_id VARCHAR(50) REFERENCES dim_product(product_id),
    user_id VARCHAR(50) REFERENCES dim_customer(user_id),
    date_id INT REFERENCES dim_time(date_id),
    quantity INTEGER,
    amount DECIMAL(10, 2)
);
