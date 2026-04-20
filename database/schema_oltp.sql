-- OLTP Schema for E-Commerce Data Analytics System
-- Drop tables if they exist
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

-- 1. Users Table
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    country VARCHAR(50)
);

-- 2. Products Table
CREATE TABLE products (
    product_id VARCHAR(50) PRIMARY KEY,
    name TEXT,
    category VARCHAR(100),
    price DECIMAL(10, 2)
);

-- 3. Orders Table
CREATE TABLE orders (
    order_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id),
    order_date TIMESTAMP
);

-- 4. Order Items Table
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES orders(order_id),
    product_id VARCHAR(50) REFERENCES products(product_id),
    quantity INTEGER,
    amount DECIMAL(10, 2)
);
