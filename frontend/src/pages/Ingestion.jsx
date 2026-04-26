import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const TARGET_SCHEMA = [
  { key: 'transaction_id', label: 'Transaction / Order ID' },
  { key: 'customer_id', label: 'Customer / User ID' },
  { key: 'product_id', label: 'Product / Stock ID' },
  { key: 'product_name', label: 'Product Name / Description' },
  { key: 'timestamp', label: 'Date / Timestamp' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'price', label: 'Unit Price' }
];

export default function Ingestion() {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      
      const formData = new FormData();
      formData.append('file', selected);
      
      try {
        const res = await fetch('http://127.0.0.1:5000/api/dataset/headers', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.columns) {
          setHeaders(['', ...data.columns]);
          autoMapColumns(data.columns);
        }
      } catch (err) {
        console.error("Failed to read headers", err);
      }
    }
  };

  const autoMapColumns = (cols) => {
    const newMapping = {};
    cols.forEach(header => {
      if (!header) return;
      const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (!newMapping['transaction_id'] && (h.includes('invoiceno') || h.includes('transaction') || h.includes('orderid') || h === 'id')) {
        newMapping['transaction_id'] = header;
      } else if (!newMapping['customer_id'] && (h.includes('customer') || h.includes('userid') || h.includes('buyer'))) {
        newMapping['customer_id'] = header;
      } else if (!newMapping['product_id'] && (h.includes('stockcode') || h.includes('productid') || h.includes('itemid'))) {
        newMapping['product_id'] = header;
      } else if (!newMapping['product_name'] && (h.includes('desc') || h.includes('productname') || h.includes('itemname'))) {
        newMapping['product_name'] = header;
      } else if (!newMapping['timestamp'] && (h.includes('date') || h.includes('time'))) {
        newMapping['timestamp'] = header;
      } else if (!newMapping['quantity'] && (h.includes('qty') || h.includes('quantity') || h === 'count')) {
        newMapping['quantity'] = header;
      } else if (!newMapping['price'] && (h.includes('price') || h.includes('unitprice') || h.includes('cost'))) {
        newMapping['price'] = header;
      }
    });
    setMapping(newMapping);
  };

  const handleMappingChange = (targetKey, csvHeader) => {
    setMapping({...mapping, [targetKey]: csvHeader});
  };

  const executeETL = async () => {
    if (!file) return;
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    
    try {
      const res = await fetch('http://127.0.0.1:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        alert("Upload Failed: " + data.error);
      }
    } catch (err) {
      alert("Error: " + err);
    }
    setUploading(false);
  };

  return (
    <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>
      <div className="page-header">
        <h1>Data Ingestion Hub</h1>
        <p>Upload a raw enterprise CSV/Excel payload and map its generalized schema into our core rigid structure.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px' }}>
        
        {!headers.length > 0 ? (
          <div style={{ border: '2px dashed var(--glass-border)', padding: '4rem', textAlign: 'center', borderRadius: '12px' }}>
            <UploadCloud size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
            <h3>Select External Dataset</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Supports .csv, .xlsx</p>
            <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} style={{ display: 'none' }} id="file-upload" />
            <label htmlFor="file-upload" className="btn-primary" style={{ cursor: 'pointer', padding: '0.8rem 2rem' }}>
              Browse Files
            </label>
          </div>
        ) : !success ? (
          <div>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} color="#eab308" /> Schema Alignment Required (Target Mode)
            </h3>
            <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
              We discovered {headers.length - 1} columns in <strong>{file.name}</strong>. Map your custom payload directly to our formalized pipeline schema.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {TARGET_SCHEMA.map(({ key, label }) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '500' }}>{label} <span style={{color: '#6366f1', fontSize: '0.8rem', marginLeft: '0.5rem'}}>[{key}]</span></div>
                  <select 
                    style={{ padding: '0.5rem', background: '#111827', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px', width: '250px' }}
                    onChange={(e) => handleMappingChange(key, e.target.value)}
                    value={mapping[key] || ''}
                  >
                    {headers.map((h, i) => <option key={i} value={h}>{h || '-- Ignore / Not Present --'}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <button className="btn-primary" onClick={executeETL} disabled={uploading} style={{ width: '100%', padding: '1rem' }}>
              {uploading ? 'Executing Standardized Pipeline...' : 'Compile Dataset & Initiate ETL Pipeline'}
            </button>
          </div>
        ) : (
           <div style={{ padding: '4rem', textAlign: 'center' }}>
            <CheckCircle size={64} color="#10B981" style={{ marginBottom: '1rem' }} />
            <h2 style={{ marginBottom: '1rem' }}>Pipeline Synced Successfully!</h2>
            <p style={{ color: 'var(--text-muted)' }}>Dataset cached securely. Analytics arrays completely regenerated. Routing to dashboard...</p>
          </div>
        )}

      </div>
    </motion.div>
  );
}
