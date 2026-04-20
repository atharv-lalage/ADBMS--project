import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Database, Key } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

export default function Settings() {
  return (
    <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>
      <div className="page-header">
        <h1>Administrator Settings</h1>
        <p>Manage system preferences and access credentials.</p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Profile Info */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', marginBottom: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Shield size={32} color="white" />
            </div>
            <h3 style={{ margin: 0 }}>Administrator</h3>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Super Admin Role</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email Mapping</label>
              <div style={{ fontWeight: 500 }}>admin@datamart.enterprise</div>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Security Clearance</label>
              <div style={{ display: 'inline-block', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>Level 5 (Max)</div>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Database size={20} color="var(--accent-primary)" /> Database Configuration
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Connection String</label>
                <input type="text" value="postgresql://neondb_owner:***@ep-still-violet-a1kc8wtk-pooler.aws.neon.tech" readOnly style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.25rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cache Strategy</label>
                <select style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                  <option>SessionStorage + Pickle (Aggressive)</option>
                  <option>Redis Memory API</option>
                </select>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Key size={20} color="#ec4899" /> Machine Learning Pipeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Apriori Algorithm Minimum Support</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Controls rule generation strictness</div>
                </div>
                <input type="number" defaultValue="0.03" step="0.01" style={{ width: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Linear Regression Projection Window</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Months ahead to predict sales</div>
                </div>
                <input type="number" defaultValue="3" style={{ width: '80px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem', borderRadius: '4px', textAlign: 'center' }} />
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop: '2rem', float: 'right' }}>Save Configurations</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
