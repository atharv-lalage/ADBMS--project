import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, UploadCloud, DatabaseZap, Box, FileSpreadsheet } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

export default function ETLTracker() {
  const [pipelineState, setPipelineState] = useState(0);

  useEffect(() => {
    // Simulate real-time ETL ticking
    const timer1 = setTimeout(() => setPipelineState(1), 1500);
    const timer2 = setTimeout(() => setPipelineState(2), 3500);
    const timer3 = setTimeout(() => setPipelineState(3), 5500);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  const logs = [
    { state: 0, icon: <FileSpreadsheet size={24} color="#6366f1" />, title: "Extraction Phase Triggered", desc: "Sourcing 500k+ rows from raw Excel payload 'Online Retail.xlsx'. Parsing blocks into Memory DataFrame." },
    { state: 1, icon: <Activity size={24} color="#eab308" />, title: "Transformation Phase (Cleaning & Formatting)", desc: "Cleaning execution: Handled 135,080 missing CustomerIDs. Removed 8,905 negative-quantity invalid rows. Calculated cross-currency 'UnitPrice' x 105 for INR. Categorized item arrays using NLP partial matching." },
    { state: 2, icon: <Box size={24} color="#06b6d4" />, title: "OLTP Loading Sequence", desc: "Normalized structure into users, products, orders, and order_items tables. Executed structural INSERT statements to NeonDB PostgreSQL instance." },
    { state: 3, icon: <DatabaseZap size={24} color="#10B981" />, title: "Data Warehouse Synchronization", desc: "Processed facts and dimensional tables. Synthesized 'dim_date', 'dim_product', 'dim_customer' and loaded 'fact_sales' cube. OLAP schema successfully established." },
  ];

  return (
    <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>
      <div className="page-header">
        <h1>ETL Pipeline Architecture Monitor</h1>
        <p>Live telemetry of the Extract, Transform, Load script processing raw retail data into the dual-schema backbone.</p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        
        {/* Left Side: Pipeline Flow Status */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud size={20} color="var(--accent-primary)" /> Execution Trace
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0rem' }}>
            {logs.map((log, index) => {
              const active = pipelineState >= log.state;
              return (
                <div key={index} style={{ display: 'flex', opacity: active ? 1 : 0.4, transition: 'opacity 0.5s ease' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '1.5rem' }}>
                    <div style={{ 
                      width: 48, height: 48, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.1)' : 'transparent', border: `2px solid ${active ? 'var(--glass-border)' : 'rgba(255,255,255,0.1)'}`, 
                      display: 'flex', justifyContent: 'center', alignItems: 'center' 
                    }}>
                      {log.icon}
                    </div>
                    {index < logs.length - 1 && (
                      <div style={{ width: 2, height: 60, background: pipelineState >= log.state + 1 ? '#10B981' : 'rgba(255,255,255,0.1)', margin: '0.5rem 0', transition: 'background 1s' }}></div>
                    )}
                  </div>
                  <div>
                    <h4 style={{ color: active ? 'white' : 'var(--text-muted)', marginBottom: '0.4rem', marginTop: '0.5rem', fontSize: '1.05rem' }}>{log.title}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                      {log.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Log Terminal & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ background: '#0a0b10', padding: '1rem 1.5rem', borderBottom: '1px solid #1f2937', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Integrity Logs
            </div>
            <div style={{ padding: '1.5rem', background: '#0d0f17', color: '#c586c0', fontFamily: 'monospace', fontSize: '0.85rem', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>[SYSTEM] Initiating Pandas Pipeline Routine... </div>
              {pipelineState >= 0 && <div><span style={{ color: '#38bdf8' }}>[EXTRACT]</span> Reading Excel buffer... (Warning: Highly memory intensive array 23MB) </div>}
              {pipelineState >= 1 && (
                <>
                  <div style={{ color: '#10B981' }}>[TRANSFORM] 135080 Dropped NaN CustomerIDs...</div>
                  <div style={{ color: '#10B981' }}>[TRANSFORM] Discarding negative Quantities...</div>
                  <div style={{ color: '#10B981' }}>[TRANSFORM] Executing unit conversion (x105 scalar matrix multiplication)</div>
                </>
              )}
              {pipelineState >= 2 && (
                <>
                  <div><span style={{ color: '#eab308' }}>[LOAD]</span> Constructing OLTP Normalization...</div>
                  <div style={{ color: 'white' }}>-- INSERT INTO users (user_id) ...</div>
                  <div style={{ color: 'white' }}>-- INSERT INTO products (product_id, name, price, category) ...</div>
                </>
              )}
              {pipelineState >= 3 && (
                <>
                  <div><span style={{ color: '#ef4444' }}>[LOAD: OLAP]</span> Synthesizing Data Warehouse Star Schema...</div>
                  <div style={{ color: 'white' }}>-- INSERT INTO dim_date (date_id, year, quarter, month, day)...</div>
                  <div style={{ color: 'white' }}>-- INSERT INTO fact_sales (sales_id, date_id, customer_id, product_id, amount, quantity)...</div>
                  <div style={{ color: '#10B981', fontWeight: 'bold', marginTop: '1rem' }}>[SYSTEM] PIPELINE SYNCHRONIZATION COMPLETE.</div>
                </>
              )}
            </div>
          </div>

          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
             <div className="glass-panel stat-card" style={{ padding: '1rem 1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem' }}>Rows Ingested</h3>
                <div className="value" style={{ fontSize: '1.5rem' }}>541,909</div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pre-transformation</span>
             </div>
             <div className="glass-panel stat-card" style={{ padding: '1rem 1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem' }}>Anomalies Removed</h3>
                <div className="value" style={{ fontSize: '1.5rem', color: '#eab308' }}>143,985</div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Noise filter algorithm</span>
             </div>
             <div className="glass-panel stat-card" style={{ padding: '1rem 1.5rem' }}>
                <h3 style={{ fontSize: '0.85rem' }}>Dimensions Loaded</h3>
                <div className="value" style={{ fontSize: '1.5rem', color: '#10B981' }}>3</div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Into Star Schema</span>
             </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
