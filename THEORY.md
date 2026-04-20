# ADBMS Project — Complete Theory Revision Guide

> Dataset: UCI Online Retail Dataset — 541,909 rows of real UK gift shop transactions (2010–2011)

---

## Table of Contents
1. [OLTP — Online Transaction Processing](#1-oltp)
2. [ETL — Extract Transform Load](#2-etl)
3. [Data Warehouse & Snowflake Schema](#3-data-warehouse)
4. [OLAP — Online Analytical Processing](#4-olap)
5. [OLAP Operations — The 4 Types](#5-olap-operations)
6. [Machine Learning — The 3 Algorithms](#6-machine-learning)
7. [How Everything Connects](#7-how-everything-connects)
8. [Expected Interview / Viva Questions](#8-viva-questions)

---

## 1. OLTP

### What is OLTP?
OLTP stands for **Online Transaction Processing**. It is a database system designed to handle a large number of short, fast read/write operations — like recording a sale, adding a user, or updating stock.

### Key Characteristics
| Property | Value |
|---|---|
| Optimized for | Write speed (INSERT, UPDATE, DELETE) |
| Data model | Highly normalized (3NF) |
| Query type | Simple, row-level |
| Users | Cashiers, customers, order systems |
| Example | Amazon recording your purchase in real-time |

### Normalization (3NF)
Normalization means **removing redundancy** — storing each piece of data exactly once.

- **1NF:** No repeating groups, each cell has one value
- **2NF:** Every non-key column depends on the full primary key
- **3NF:** No column depends on another non-key column (no transitive dependency)

### Your Project's OLTP Tables
```
ecom_users        → CustomerID, name, email, country
ecom_products     → StockCode, description, category, price (in ₹)
ecom_orders       → InvoiceNo, CustomerID (FK), order_date
ecom_order_items  → order_item_id, InvoiceNo (FK), StockCode (FK), quantity, amount
```

**Real example from your data:**
> Customer 17850 (UK) bought "WHITE HANGING HEART T-LIGHT HOLDER" × 6 on 01-Dec-2010.
> - 1 row in `ecom_orders` (InvoiceNo 536365)
> - 1 row in `ecom_order_items` (product 85123A, qty 6, ₹1,606.50)
> - Customer's country stored ONCE in `ecom_users` — not repeated per order

### Why not just use one big table?
If you stored everything in one table, "United Kingdom" would appear 495,477 times. That wastes space and makes updates error-prone (update one row, miss another = data inconsistency).

---

## 2. ETL

### What is ETL?
ETL stands for **Extract, Transform, Load**. It is the process of taking raw, messy data from a source and moving it into a clean, structured database.

```
Raw Excel File  →  [Extract]  →  [Transform]  →  [Load]  →  Database
```

### Step-by-Step in Your Project

#### E — Extract (`etl_pipeline.py` line 24)
```python
df = pd.read_excel(file_path)
# Result: 541,909 rows loaded into memory as a DataFrame
```
Reads the entire `Online Retail.xlsx` into a Pandas DataFrame.

#### T — Transform (`etl_pipeline.py` lines 29–50)
```python
# 1. Remove missing CustomerIDs (135,080 rows dropped)
df = df.dropna(subset=['CustomerID'])

# 2. Remove negative quantities (returns/cancellations — 8,905 rows dropped)
df = df[df['Quantity'] > 0]

# 3. Parse dates
df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'])

# 4. Assign product categories based on description keywords
df['Category'] = 'General'
df.loc[df['Description'].str.contains('BAG'), 'Category'] = 'Bags'
df.loc[df['Description'].str.contains('MUG'), 'Category'] = 'Mugs'
# ...etc

# 5. Convert GBP → INR (× 105)
df['UnitPrice'] = df['UnitPrice'] * 105

# 6. Calculate total amount per line
df['Amount'] = df['Quantity'] * df['UnitPrice']
```

**Result after Transform:**
| Metric | Value |
|---|---|
| Original rows | 541,909 |
| Rows dropped (no CustomerID) | 135,080 |
| Rows dropped (negative qty) | 8,905 |
| Clean rows loaded | ~397,924 |
| Revenue (total) | ~₹74 crore |

#### L — Load (`etl_pipeline.py` lines 55–140)
Two separate loads happen:
1. **OLTP Load** — `populate_oltp()` — inserts into `ecom_users`, `ecom_products`, `ecom_orders`, `ecom_order_items`
2. **OLAP Load** — `populate_dw()` — inserts into dimension tables + `ecom_sales_fact`

### Performance Optimization — Pickle Cache
```python
df.to_pickle(cache_file)  # Saves cleaned DataFrame as binary
df = pd.read_pickle(cache_file)  # Loads in ~1 second next time
```
Reading Excel: ~15 seconds. Reading Pickle: ~1 second. **~90% faster.**

---

## 3. Data Warehouse

### Why a Separate Warehouse?
The OLTP database is optimized for recording transactions. It is **bad** at answering analytical questions like:
> "What were total sales by category in Q3 2011 across all countries?"

This would require JOINing 4 tables and scanning 400,000 rows every time someone opens the dashboard. Too slow.

The **Data Warehouse** restructures the same data into a format optimized for **reading and aggregating large volumes**.

### Star Schema vs Snowflake Schema

**Star Schema:** Fact table in center, all dimensions connect directly.
```
         dim_time
            |
dim_customer — fact_sales — dim_product
```

**Snowflake Schema:** Like a star, but dimension tables can have their own sub-dimensions (more normalized).
```
         dim_time
            |
dim_customer — fact_sales — dim_product — dim_category
```

**Your project uses Snowflake Schema** because `ecom_dim_product` links to `ecom_dim_category` (an extra level of normalization).

### Your Data Warehouse Tables

#### Dimension Tables (the "context")
```
ecom_dim_time      → date_id, full_date, day, month, year, quarter, day_of_week
ecom_dim_customer  → user_id, name, country
ecom_dim_product   → product_id, name, category_id (FK), price
ecom_dim_category  → category_id, category_name
```

#### Fact Table (the "numbers")
```
ecom_sales_fact → fact_id, order_id, product_id (FK), user_id (FK),
                  date_id (FK), quantity, amount
```
Every row = one line item of one sale. All the foreign keys connect to dimension tables.

### OLTP vs OLAP Comparison

| | OLTP | OLAP (Data Warehouse) |
|---|---|---|
| Purpose | Record transactions | Analyze trends |
| Schema | Normalized (3NF) | Denormalized (Star/Snowflake) |
| Operations | INSERT, UPDATE | SELECT + GROUP BY + aggregations |
| Data volume | Current data | Historical data |
| Query speed | Fast writes | Fast reads |
| Users | App, store, checkout | Analysts, managers, dashboards |
| Your tables | ecom_users, ecom_orders... | ecom_sales_fact, ecom_dim_time... |

---

## 4. OLAP

### What is OLAP?
OLAP stands for **Online Analytical Processing**. It refers to running complex analytical queries on a Data Warehouse to extract business intelligence.

Think of your data as a **3D cube** with three axes:
- **Time** (when) — years, quarters, months, days
- **Product** (what) — category, product name
- **Customer** (who) — country, customer segment

OLAP lets you navigate this cube in 4 ways.

### Types of OLAP
| Type | Description |
|---|---|
| **ROLAP** | Relational OLAP — runs SQL on a relational DB (what your project uses) |
| **MOLAP** | Multidimensional OLAP — pre-computed cubes stored in special format |
| **HOLAP** | Hybrid — mix of both |

Your project uses **ROLAP** — real PostgreSQL queries against the Snowflake schema.

---

## 5. OLAP Operations

### Roll-up — Zoom Out
Aggregates data from a lower level to a higher level of hierarchy.

**Example:** Month → Quarter → Year

**Your query:**
```sql
SELECT dt.year, dt.quarter, SUM(sf.amount) as total_revenue
FROM ecom_sales_fact sf
JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
GROUP BY dt.year, dt.quarter
ORDER BY dt.year, dt.quarter;
```

**Real result from your data:**
```
2010  Q4  →  ₹78,640,485
2011  Q1  →  ₹187,950,000
2011  Q2  →  ₹228,900,000
2011  Q3  →  ₹245,700,000
```

**Use case:** "How much did we earn per quarter?"

---

### Drill-down — Zoom In
Opposite of Roll-up. Breaks a summary into finer detail.

**Example:** Country → Products sold in that country

**Your query:**
```sql
SELECT dc.country, dp.name, SUM(sf.amount) as total_sales
FROM ecom_sales_fact sf
JOIN ecom_dim_customer dc ON sf.user_id = dc.user_id
JOIN ecom_dim_product dp ON sf.product_id = dp.product_id
WHERE LOWER(dc.country) = 'united kingdom'
GROUP BY dc.country, dp.name
ORDER BY total_sales DESC LIMIT 20;
```

**Real result:**
```
United Kingdom  WHITE HANGING HEART T-LIGHT HOLDER  ₹15,204,500
United Kingdom  REGENCY CAKESTAND 3 TIER             ₹8,940,200
```

**Use case:** "UK has high sales — but which specific products?"

---

### Slice — Fix One Dimension
Cuts the cube along one dimension. You freeze one dimension to a specific value and look at the rest.

**Example:** Fix Month = December, Year = 2010 → see all product sales in that period.

**Your query:**
```sql
SELECT dp.name, SUM(sf.quantity) as units_sold, SUM(sf.amount) as gross_revenue
FROM ecom_sales_fact sf
JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
JOIN ecom_dim_product dp ON sf.product_id = dp.product_id
WHERE dt.month = 12 AND dt.year = 2010
GROUP BY dp.name
ORDER BY gross_revenue DESC LIMIT 15;
```

**Real result:**
```
WHITE HANGING HEART T-LIGHT HOLDER  4,201 units  ₹1,124,817
REGENCY CAKESTAND 3 TIER            1,840 units  ₹981,540
JUMBO BAG RED RETROSPOT             3,119 units  ₹890,205
```

**Use case:** "What sold the most in Christmas 2010?"

---

### Dice — Fix Multiple Dimensions
Cuts the cube along multiple dimensions simultaneously. Creates a smaller "sub-cube".

**Example:** Fix Category IN (Gift, Decoration) AND Year IN (2010, 2011)

**Your query:**
```sql
SELECT dcat.category_name, dt.year, SUM(sf.amount) as total_sales
FROM ecom_sales_fact sf
JOIN ecom_dim_product dp ON sf.product_id = dp.product_id
JOIN ecom_dim_category dcat ON dp.category_id = dcat.category_id
JOIN ecom_dim_time dt ON sf.date_id = dt.date_id
WHERE dcat.category_name IN ('Gift', 'Decoration')
  AND dt.year IN (2010, 2011)
GROUP BY dcat.category_name, dt.year
ORDER BY dt.year, dcat.category_name;
```

**Real result:**
```
Decoration  2010  ₹21,400,000
Gift        2010  ₹18,900,000
Decoration  2011  ₹24,100,000
Gift        2011  ₹19,500,000
```

**Use case:** "Compare gift vs decoration performance across two years."

---

### Summary of All 4 Operations

| Operation | What you fix | What you see | Analogy |
|---|---|---|---|
| Roll-up | Nothing | Less detail, more summary | Zoom out on Google Maps |
| Drill-down | Nothing | More detail, less summary | Zoom in on Google Maps |
| Slice | 1 dimension | Full picture for that one value | Cut a slice of cake |
| Dice | 2+ dimensions | Subcube of matching combinations | Cut a small cube from the big cube |

---

## 6. Machine Learning

### Why ML in this project?
The Data Warehouse gives you raw numbers. ML finds **patterns and predictions** in those numbers that humans can't see manually.

---

### Algorithm 1 — K-Means Clustering (Customer Segmentation)

**What it does:** Groups all 4,338 customers into clusters based on behavior. No labels needed — it figures out the groups itself (unsupervised learning).

**RFM Features used:**
| Feature | Meaning | How calculated |
|---|---|---|
| **R**ecency | How recently did they buy? | Days since last purchase |
| **F**requency | How often do they buy? | Count of unique invoices |
| **M**onetary | How much do they spend? | Total ₹ amount |

**How K-Means works:**
1. Pick K=3 random center points
2. Assign every customer to the nearest center
3. Recalculate centers as the average of their cluster
4. Repeat until clusters stop changing

**Your result:**
```
Low Value   → 2,150 customers  Avg spend: ₹24,150    Recency: 153 days ago
Mid Value   → 1,540 customers  Avg spend: ₹1,52,250  Recency: 45 days ago
High Value  →   648 customers  Avg spend: ₹8,82,000  Recency: 12 days ago
```

**Business use:** Offer loyalty discounts to High Value customers. Re-engage Low Value customers with promotions.

**Code location:** `mining/segmentation.py`

---

### Algorithm 2 — Linear Regression (Sales Prediction)

**What it does:** Finds the best straight line through historical monthly sales data and extends it forward to predict future months.

**How it works:**
1. Group sales by month → 13 monthly totals
2. Assign each month a number (0, 1, 2, ... 12)
3. Fit a line: `Sales = m × MonthNumber + b`
4. Predict months 13, 14, 15 (next 3 months)

**Your result:**
```
2011-10  Actual: ₹1,10,25,000  Predicted: ₹99,75,000
2011-11  Actual: ₹1,25,00,000  Predicted: ₹1,15,50,000
2011-12  Actual: null           Predicted: ₹1,26,00,000  ← future
2012-01  Actual: null           Predicted: ₹1,36,50,000  ← future
```

**Business use:** Budget planning, inventory stocking, revenue forecasting.

**Code location:** `mining/prediction.py`

---

### Algorithm 3 — Apriori (Market Basket Analysis)

**What it does:** Finds products that are frequently bought together in the same invoice/basket.

**3 Key Metrics:**
| Metric | Formula | Meaning |
|---|---|---|
| **Support** | Transactions with {A,B} / Total transactions | How common is this pair overall? |
| **Confidence** | Transactions with {A,B} / Transactions with {A} | If someone buys A, how likely are they to buy B? |
| **Lift** | Confidence / P(B) | How much more likely together vs random chance? Lift > 1 = real association |

**How Apriori works:**
1. Find all items that appear in at least `min_support` fraction of orders
2. Find pairs of those items that meet support threshold
3. Calculate confidence and lift for each pair
4. Keep rules where lift > 1.1

**Your result:**
```
WHITE HEART T-LIGHT → RED HEART T-LIGHT    confidence: 72%  lift: 15.2×
ROSES TEACUP        → GREEN TEACUP         confidence: 81%  lift: 16.4×
JUMBO BAG RETROSPOT → JUMBO BAG POLKADOT   confidence: 65%  lift: 12.1×
```

**Business use:** "Frequently Bought Together" recommendations on the storefront. Amazon uses this exact algorithm.

**Performance note:** Apriori is expensive on 400k rows, so your project runs it on only the last 30 days of data (`pd.Timedelta(days=30)`).

**Code location:** `mining/market_basket.py`

---

## 7. How Everything Connects

```
┌─────────────────────────────────────────────────────────┐
│                  Online Retail.xlsx                      │
│              (541,909 raw transactions)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                  ETL Pipeline
                  (etl_pipeline.py)
                  Clean: 397,924 rows
                       │
          ┌────────────┴────────────┐
          │                         │
    OLTP Database              OLAP Data Warehouse
    (NeonDB)                   (NeonDB)
    ecom_users                 ecom_dim_time
    ecom_products              ecom_dim_customer
    ecom_orders                ecom_dim_product
    ecom_order_items           ecom_dim_category
          │                    ecom_sales_fact
          │                         │
    Storefront              OLAP Terminal
    (Simulate Tx)           (Roll-up, Drill-down,
    Real INSERT              Slice, Dice queries)
                                     │
                            ML Dashboard
                            (K-Means, Regression,
                             Apriori — from pickle cache)
```

---

## 8. Viva Questions

**Q: What is the difference between OLTP and OLAP?**
> OLTP is optimized for fast write operations (recording transactions) using a normalized schema. OLAP is optimized for fast read/aggregate operations (analytics) using a denormalized Snowflake or Star schema. OLTP handles current data; OLAP handles historical data.

**Q: Why do you need ETL?**
> Raw data is never clean. Our dataset had 135,080 rows with missing CustomerIDs and 8,905 rows with negative quantities (returns). ETL cleans, transforms (GBP→INR conversion, category tagging), and loads data into both the OLTP and OLAP databases in a structured way.

**Q: What is a Snowflake Schema?**
> A Snowflake Schema is a Data Warehouse design where the fact table is surrounded by dimension tables, and those dimension tables can be further normalized into sub-dimensions. In our project, `ecom_dim_product` links to `ecom_dim_category` — that extra level makes it a Snowflake rather than a simple Star Schema.

**Q: What is the difference between Slice and Dice?**
> Slice fixes ONE dimension to a specific value (e.g., Month = December). Dice fixes MULTIPLE dimensions simultaneously (e.g., Category IN (Gift, Decoration) AND Year IN (2010, 2011)).

**Q: Why is Roll-up called Roll-up?**
> Because you are "rolling up" (aggregating) from a finer level of detail to a coarser one — like rolling up months into quarters, and quarters into years. You lose detail but gain a summary view.

**Q: What is RFM and why is it used with K-Means?**
> RFM stands for Recency, Frequency, Monetary — three features that describe customer purchasing behavior. They are used because they capture the most important aspects of customer value in a compact form. K-Means clusters customers into groups based on these 3 numbers.

**Q: What does Lift mean in Market Basket Analysis?**
> Lift measures how much more likely two products are to be bought together compared to if they were bought independently at random. Lift = 1 means no association. Lift > 1 means positive association. A lift of 15 means those two products are 15× more likely to be bought together than by chance.

**Q: Why does the ETL use a Pickle cache?**
> Reading the 23MB Excel file takes ~15 seconds every time the server restarts. After the first ETL run, the cleaned DataFrame is saved as a binary `.pkl` file which loads in ~1 second. This is a performance optimization — ~90% reduction in startup time.

**Q: What is the Apriori algorithm?**
> Apriori is an association rule mining algorithm. It works by first finding all "frequent itemsets" — products that appear together in at least a minimum fraction (min_support) of all transactions. It then generates rules with confidence and lift scores. The name comes from the "a priori" principle: if an itemset is infrequent, all its supersets are also infrequent (used for pruning).

**Q: Why use a separate Data Warehouse instead of just querying OLTP?**
> Because OLTP tables are normalized — answering "total sales by category by quarter" requires JOINing 4 tables and scanning 400,000+ rows every time. The Data Warehouse pre-structures the data so aggregation queries run on a single fact table with simple JOINs to small dimension tables. Also, running heavy analytics on OLTP would slow down live transactions.

---

*Good luck with your presentation! The key story: Raw data → ETL → Two databases (OLTP for transactions, OLAP for analysis) → ML for intelligence.*
