-- OLTP Schema for E-Commerce Data Analytics System
-- Prefixed with ecom_ to avoid collision with other project tables

DROP TABLE IF EXISTS ecom_order_items CASCADE;
DROP TABLE IF EXISTS ecom_orders CASCADE;
DROP TABLE IF EXISTS ecom_products CASCADE;
DROP TABLE IF EXISTS ecom_users CASCADE;

CREATE TABLE ecom_users (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    country VARCHAR(50)
);

CREATE TABLE ecom_products (
    product_id VARCHAR(50) PRIMARY KEY,
    name TEXT,
    category VARCHAR(100),
    price DECIMAL(10, 2)
);

CREATE TABLE ecom_orders (
    order_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES ecom_users(user_id),
    order_date TIMESTAMP
);

CREATE TABLE ecom_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES ecom_orders(order_id),
    product_id VARCHAR(50) REFERENCES ecom_products(product_id),
    quantity INTEGER,
    amount DECIMAL(10, 2)
);
