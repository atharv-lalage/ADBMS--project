# E-Commerce Data Analytics Platform (ADBMS)

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-NeonDB-336791.svg)
![Groq AI](https://img.shields.io/badge/Groq-LLM_Powered-orange.svg)
![Flask](https://img.shields.io/badge/Flask-REST_API-black.svg)

A full-stack **business intelligence and analytics platform** built to demonstrate Advanced Database Management Systems (ADBMS) concepts in a real, working application.

Upload any retail sales dataset, let the system clean and process it automatically, and instantly get AI-powered insights, interactive charts, and machine learning analysis — all in your browser.

---

## ✨ What This Project Does

Think of it as a **smart control panel for an online store owner.** You plug in your raw sales data, and the system:

1. Automatically **cleans and organizes** the messy data
2. Loads it into a structured database (OLTP + Data Warehouse)
3. Runs **machine learning** to find patterns nobody can spot manually
4. Shows everything in a **beautiful, interactive dashboard**
5. Lets you ask an **AI assistant** questions about your own business

---

## 🗂️ Pages & Features

### 🏠 Store (Home)
A live product storefront that simulates real customer purchases. Click any product to see automatic **"Frequently Bought Together"** suggestions powered by Market Basket Analysis.

### 📊 Business Dashboard
The main analytics hub. Updated automatically every time you run the data pipeline.

| Feature | Description |
|---|---|
| **KPI Cards** | Total Sales, Total Orders, Avg Order Value |
| **Sales Trend Chart** | Monthly actual vs. predicted sales (Linear Regression) |
| **Customer Types** | Donut chart grouping customers into Low / Mid / High Value segments (K-Means) |
| **🏆 Top Products Leaderboard** | Gold/silver/bronze ranked bar chart of your top 10 best-selling products |
| **🌍 Sales by Region** | Coloured bar chart of top 12 countries/regions by revenue |
| **Products Bought Together** | Market basket association rules table |
| **📤 CSV Export** | Every chart has its own download button to export data |
| **🤖 AI Business Analyst** | One-click insight generation powered by Groq LLM |
| **💬 AI Chat Widget** | Floating chat assistant — ask anything about your data in plain English |

### 🔧 Data Cleaner (ETL Tracker)
Watch your data being cleaned in real time through a live log terminal.
- Supports **any `.csv` or `.xlsx`** retail dataset — not locked to one file
- Smart **column auto-mapper** detects your dataset's column names and normalizes them automatically
- Live metric cards show **actual row counts and error fixes** from your specific dataset
- "Go to Dashboard" button appears automatically after cleaning completes

### 🔍 OLAP Query Terminal
A built-in query tool for slicing and dicing your data warehouse. Supports 4 operations:
- **Roll-up** — Yearly/quarterly revenue summary
- **Drill-down** — Revenue by country and product
- **Slice** — Top products in a specific month
- **Dice** — Revenue comparison across categories and years

### ⚙️ Settings
Configure ML pipeline parameters: Apriori minimum support, prediction window (months), and K-Means cluster count.

---

## 🧠 How The AI Features Work

### Groq LLM Integration
Two AI features are powered by the **Groq API** (using `llama-3.1-8b-instant`):

| Feature | How to trigger |
|---|---|
| **Generate Insights** | Click the button on the Dashboard to get a paragraph-style business summary of your sales metrics |
| **AI Chat Widget** | Click the purple floating button (bottom-right) and ask anything — *"What are my best products?"*, *"Which region drives most sales?"* |

The AI is given your real live data as context, so it answers based on your actual numbers, not generic information.

---

## 🔄 The ETL Pipeline (How Data Gets In)

```
Your Dataset (.csv / .xlsx)
        ↓
  Column Auto-Mapper     ← Maps any header names to internal schema
        ↓
  Data Cleaning          ← Removes nulls, negatives, bad dates
        ↓
  Currency Normalizer    ← Converts prices to INR if values are small
        ↓
  OLTP Tables            ← users, products, orders, order_items
        ↓
  Data Warehouse         ← dim_customer, dim_product, dim_time, fact_sales
        ↓
  Analytics Cache        ← Fast pickle cache for instant dashboard loads
```

### Supported Datasets
The platform auto-detects column names. These datasets work out of the box:

| Dataset | Format | Notes |
|---|---|---|
| Online Retail (UCI) | `.xlsx` | Original dataset this system was built on |
| Sample Superstore | `.csv` | Kaggle standard retail dataset |
| Custom datasets | `.csv` / `.xlsx` | Must have columns for customer ID, order ID, date, and a sales/price column |

---

## 🚀 Setup & Running the Project

### Requirements
- Python 3.11+
- Node.js + npm
- A PostgreSQL database (free tier on [Neon](https://neon.tech) works great)
- A Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Configure Environment
Create or edit the `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@your-neondb-endpoint.aws.neon.tech/neondb
GROQ_API_KEY=gsk_your_key_here
```

### 2. Start the Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

The server starts at `http://localhost:5000`. On first run, it automatically loads and caches the most recent dataset in your `dataset/` folder.

> **Note:** The server runs with `use_reloader=False` by default. This is intentional — it prevents Flask from restarting mid-ETL job (which would cause 404 errors on the frontend).

### 3. Start the Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

**Login:** `admin` / `admin`

### 4. Load Your Data
1. Go to the **Data Cleaner** page
2. Upload your dataset file (or use one already in the `dataset/` folder)
3. Click **Clean Data** and watch the live log
4. Once complete, click **Go to Dashboard** to see live analytics

---

## 🗄️ Database Schema

### OLTP (Transactional)
| Table | Purpose |
|---|---|
| `ecom_users` | Customer records |
| `ecom_products` | Product catalogue |
| `ecom_orders` | Order headers |
| `ecom_order_items` | Line items per order |

### OLAP / Data Warehouse (Snowflake Schema)
| Table | Purpose |
|---|---|
| `ecom_dim_customer` | Customer dimension |
| `ecom_dim_product` | Product dimension |
| `ecom_dim_category` | Category dimension |
| `ecom_dim_time` | Date dimension (day, month, quarter, year) |
| `ecom_sales_fact` | Central fact table (revenue, quantity, foreign keys) |

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Framer Motion, Recharts, Lucide Icons |
| Backend | Python Flask REST API |
| AI / LLM | Groq API (`llama-3.1-8b-instant`) |
| Machine Learning | scikit-learn (K-Means, Linear Regression), mlxtend (Apriori) |
| Database | PostgreSQL (hosted on NeonDB serverless) |
| ETL / Data | Pandas, SQLAlchemy |
| Caching | Pickle binary cache (90%+ faster than re-reading raw files) |

---

## 📝 Acknowledgments

Built for the **ADBMS Capstone Project**, demonstrating OLTP, OLAP, ETL, and ML integration in a single production-ready system. Datasets sourced from the UCI Machine Learning Repository and Kaggle.
