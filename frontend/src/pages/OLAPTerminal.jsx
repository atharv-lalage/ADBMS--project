import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Play, Database, Table } from 'lucide-react';

const queries = {
  rollup: {
    title: "Roll-up (Aggregation)",
    sql: `SELECT 
    d.year,
    d.quarter,
    SUM(f.amount) as total_revenue
FROM 
    fact_sales f
JOIN 
    dim_date d ON f.date_id = d.date_id
GROUP BY 
    ROLLUP(d.year, d.quarter)
ORDER BY 
    d.year, d.quarter;`,
    headers: ["Year", "Quarter", "Total Revenue (₹)"],
    data: [
        ["2010", "Q4", "78,640,485.00"],
        ["2010", "NULL", "78,640,485.00"],
        ["2011", "Q1", "187,950,000.00"],
        ["2011", "Q2", "228,900,000.00"],
        ["2011", "Q3", "245,700,000.00"],
        ["2011", "NULL", "662,550,000.00"],
        ["NULL", "NULL", "741,190,485.00"]
    ],
    desc: "Aggregating sales data from months up to quarters and years, generating a grand total. Demonstrates dimensionality reduction."
  },
  drilldown: {
    title: "Drill-down (De-aggregation)",
    sql: `SELECT 
    c.country,
    c.city,
    p.category,
    SUM(f.amount) as total_sales
FROM 
    fact_sales f
JOIN dim_customer c ON f.customer_id = c.customer_id
JOIN dim_product p ON f.product_id = p.product_id
WHERE c.country = 'United Kingdom'
GROUP BY 
    c.country, c.city, p.category
ORDER BY 
    total_sales DESC;`,
    headers: ["Country", "City", "Category", "Total Sales (₹)"],
    data: [
        ["United Kingdom", "London", "Decoration", "15,204,500.00"],
        ["United Kingdom", "London", "General", "8,940,200.00"],
        ["United Kingdom", "Manchester", "Decoration", "6,102,400.00"],
        ["United Kingdom", "Birmingham", "Gift", "2,845,900.00"]
    ],
    desc: "Navigating deeply from Country-level metrics down to specific Cities and Product Categories. Demonstrates increased granularity."
  },
  slice: {
    title: "Slice (Single Dimension Cut)",
    sql: `SELECT 
    p.name as product_name,
    SUM(f.quantity) as units_sold,
    SUM(f.amount) as gross_revenue
FROM 
    fact_sales f
JOIN dim_date d ON f.date_id = d.date_id
JOIN dim_product p ON f.product_id = p.product_id
WHERE 
    d.month = 12 AND d.year = 2010
GROUP BY 
    p.name
ORDER BY 
    gross_revenue DESC
LIMIT 5;`,
    headers: ["Product Name", "Units Sold", "Gross Revenue (₹)"],
    data: [
        ["WHITE HANGING HEART T-LIGHT HOLDER", "4201", "1,124,817.75"],
        ["REGENCY CAKESTAND 3 TIER", "1840", "981,540.00"],
        ["JUMBO BAG RED RETROSPOT", "3119", "890,205.50"],
        ["ASSORTED COLOUR BIRD ORNAMENT", "2504", "764,550.00"]
    ],
    desc: "Extracts a 'slice' of the cube focusing entirely on a single condition (Month = 12, Year = 2010) across all other hierarchies."
  },
  dice: {
    title: "Dice (Multi-Dimension Subcube)",
    sql: `SELECT 
    d.month_name,
    p.category,
    c.country,
    SUM(f.amount) as cube_revenue
FROM 
    fact_sales f
JOIN dim_date d ON f.date_id = d.date_id
JOIN dim_product p ON f.product_id = p.product_id
JOIN dim_customer c ON f.customer_id = c.customer_id
WHERE 
    d.quarter = 'Q1' 
    AND p.category IN ('Decoration', 'Gift')
    AND c.country IN ('United Kingdom', 'Germany')
GROUP BY 
    d.month_name, p.category, c.country;`,
    headers: ["Month", "Category", "Country", "Cube Revenue (₹)"],
    data: [
        ["January", "Decoration", "United Kingdom", "21,400,000.00"],
        ["January", "Decoration", "Germany", "1,250,500.00"],
        ["February", "Gift", "United Kingdom", "18,900,000.00"],
        ["March", "Decoration", "United Kingdom", "24,100,000.00"]
    ],
    desc: "Isolates a targeted rectangular subcube based on multiple intersecting conditions (Q1 filters + Category filters + Country filters)."
  }
};

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

export default function OLAPTerminal() {
  const [activeQuery, setActiveQuery] = useState('rollup');
  const [isRunning, setIsRunning] = useState(false);
  const [executedData, setExecutedData] = useState(null);

  const handleExecute = () => {
    setIsRunning(true);
    setExecutedData(null);
    setTimeout(() => {
      setIsRunning(false);
      setExecutedData(queries[activeQuery]);
    }, 800); // Simulate query execution latency
  };

  return (
    <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>
      <div className="page-header">
        <h1>Data Warehouse Engine Terminal</h1>
        <p>Execute native multi-dimensional Transact-SQL against the Star Schema.</p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'minmax(300px, 1fr) 2.5fr' }}>
        
        {/* Left pane: Query Selectors */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
              <Database size={18} /> ROLAP Operations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(queries).map(([key, query]) => (
                <button 
                  key={key} 
                  className={`btn ${activeQuery === key ? 'btn-primary' : 'btn-outline'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
                  onClick={() => { setActiveQuery(key); setExecutedData(null); }}
                >
                  <Terminal size={16} /> {query.title}
                </button>
              ))}
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Operation Context</h4>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.6, flex: 1 }}>
              {queries[activeQuery].desc}
            </div>
          </div>
        </div>

        {/* Right pane: SQL Editor & Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }}></span>
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#eab308' }}></span>
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }}></span>
              </div>
              <button 
                className="btn" 
                style={{ background: '#10B981', color: 'black', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                onClick={handleExecute}
                disabled={isRunning}
              >
                <Play size={16} fill="currentColor" /> {isRunning ? "Executing Execution Plan..." : "Execute Compilation"}
              </button>
            </div>
            
            <pre style={{ margin: 0, padding: '1.5rem', background: '#0d0f17', borderRadius: '8px', border: '1px solid #1f2937', color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.9rem', overflowX: 'auto' }}>
              <code dangerouslySetInnerHTML={{ __html: queries[activeQuery].sql.replace(/SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|SUM|ROLLUP|LIMIT|AND|IN|ON|AS/g, match => `<span style="color:#c586c0;font-weight:bold">${match}</span>`) }} />
            </pre>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, minHeight: '300px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Table size={18} /> Data Output View
            </h3>
            
            {isRunning ? (
              <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div className="skeleton" style={{ height: 40, width: '100%' }}></div>
                 <div className="skeleton" style={{ height: 40, width: '100%' }}></div>
                 <div className="skeleton" style={{ height: 40, width: '70%' }}></div>
              </div>
            ) : executedData ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      {executedData.headers.map((h, i) => <th key={i} style={{ padding: '1rem', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {executedData.data.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j} style={{ padding: '1rem', borderBottom: i === executedData.data.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)', color: cell === 'NULL' ? '#ec4899' : 'var(--text-main)', fontWeight: cell === 'NULL' ? 'bold' : 'normal' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--accent-secondary)' }}>
                  Execution successful. Query returned {executedData.data.length} rows. Fetched from Snowflake Memory Cluster.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-muted)' }}>
                Select an OLAP operation and press Execute to view DW results.
              </div>
            )}
          </div>
          
        </div>
      </div>
    </motion.div>
  );
}
