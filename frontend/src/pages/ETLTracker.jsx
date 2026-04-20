import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, UploadCloud, DatabaseZap, Box, FileSpreadsheet, Play, RefreshCw, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react';
import axios from 'axios';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const STAGES = [
  { icon: <FileSpreadsheet size={24} color="#6366f1" />, title: "Extraction Phase", keyword: "EXTRACT" },
  { icon: <Activity size={24} color="#eab308" />, title: "Transformation Phase", keyword: "TRANSFORM" },
  { icon: <Box size={24} color="#06b6d4" />, title: "OLTP Loading Sequence", keyword: "LOAD (OLTP)" },
  { icon: <DatabaseZap size={24} color="#10B981" />, title: "Data Warehouse Synchronization", keyword: "LOAD (OLAP)" },
];

export default function ETLTracker() {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | running | complete | error
  const [logs, setLogs] = useState([]);
  const [activeStage, setActiveStage] = useState(-1);
  const pollRef = useRef(null);
  const logEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Upload state
  const [uploadStatus, setUploadStatus] = useState(null); // null | uploading | success | error
  const [uploadMsg, setUploadMsg] = useState('');
  const [datasetFiles, setDatasetFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    // Load dataset info on mount
    axios.get('http://localhost:5000/api/dataset/info')
      .then(res => setDatasetFiles(res.data.files || []))
      .catch(() => {});
  }, [uploadStatus]);

  const handleUpload = async (file) => {
    if (!file) return;
    const allowed = ['xlsx', 'xls', 'csv'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadStatus('error');
      setUploadMsg('Only .xlsx, .xls, or .csv files allowed.');
      return;
    }

    setUploadStatus('uploading');
    setUploadMsg('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://localhost:5000/api/dataset/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadStatus('success');
      setUploadMsg(res.data.message);
    } catch (err) {
      setUploadStatus('error');
      setUploadMsg(err.response?.data?.error || 'Upload failed.');
    }
  };

  const deriveStage = (logLines) => {
    let stage = -1;
    logLines.forEach(line => {
      STAGES.forEach((s, i) => {
        if (line.includes(s.keyword)) stage = Math.max(stage, i);
      });
    });
    return stage;
  };

  const startETL = async () => {
    setStatus('running');
    setLogs([]);
    setActiveStage(-1);
    setJobId(null);

    try {
      const res = await axios.post('http://localhost:5000/api/etl/run');
      const id = res.data.job_id;
      setJobId(id);

      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const poll = await axios.get(`http://localhost:5000/api/etl/status/${id}`);
          const { status: s, logs: l } = poll.data;
          setLogs(l || []);
          setActiveStage(deriveStage(l || []));
          if (s === 'complete' || s === 'error') {
            setStatus(s);
            clearInterval(pollRef.current);
          }
        } catch {
          // backend may be busy — keep polling
        }
      }, 1000);
    } catch (err) {
      setStatus('error');
      setLogs([`ERROR: Could not reach backend — ${err.message}`]);
    }
  };

  // Scroll log to bottom as lines appear
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(pollRef.current), []);

  const logColor = (line) => {
    if (line.startsWith('ERROR')) return '#ef4444';
    if (line.startsWith('WARNING')) return '#eab308';
    if (line.includes('COMPLETE')) return '#10B981';
    if (line.startsWith('EXTRACT')) return '#38bdf8';
    if (line.startsWith('TRANSFORM')) return '#10B981';
    if (line.startsWith('LOAD')) return '#c586c0';
    return '#94a3b8';
  };

  return (
    <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>ETL Pipeline Architecture Monitor</h1>
          <p>Live telemetry of the Extract, Transform, Load script processing raw retail data.</p>
        </div>
        <button
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={startETL}
          disabled={status === 'running'}
        >
          {status === 'running'
            ? <><RefreshCw size={16} className="spin" /> Running Pipeline...</>
            : <><Play size={16} fill="currentColor" /> Run ETL Pipeline</>
          }
        </button>
      </div>

      {/* Dataset Upload Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <FolderOpen size={18} color="var(--accent-primary)" /> Dataset Source
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: '10px', padding: '2rem', textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(99,102,241,0.08)' : 'rgba(0,0,0,0.2)',
              transition: 'all 0.2s'
            }}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => handleUpload(e.target.files[0])} />
            <UploadCloud size={32} color={dragOver ? '#6366f1' : '#94a3b8'} style={{ marginBottom: '0.75rem' }} />
            <div style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: '0.25rem' }}>
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Drop your dataset here'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              or click to browse — .xlsx, .xls, .csv supported
            </div>

            <AnimatePresence>
              {uploadStatus && uploadStatus !== 'uploading' && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    color: uploadStatus === 'success' ? '#10B981' : '#ef4444', fontSize: '0.85rem' }}>
                  {uploadStatus === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {uploadMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Current files */}
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Files in dataset/
            </div>
            {datasetFiles.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No dataset files found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {datasetFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '8px', padding: '0.6rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileSpreadsheet size={16} color="#6366f1" />
                      <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{f.name}</span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{f.size_mb} MB</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              After uploading a new file, click <strong style={{ color: 'white' }}>Run ETL Pipeline</strong> to process it.
              The old pickle cache is automatically cleared on upload.
            </div>
          </div>

        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>

        {/* Left: Stage tracker */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud size={20} color="var(--accent-primary)" /> Execution Trace
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0rem' }}>
            {STAGES.map((stage, index) => {
              const active = activeStage >= index;
              return (
                <div key={index} style={{ display: 'flex', opacity: status === 'idle' ? 0.4 : active ? 1 : 0.35, transition: 'opacity 0.5s ease' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '1.5rem' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: `2px solid ${active ? 'var(--glass-border)' : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      {stage.icon}
                    </div>
                    {index < STAGES.length - 1 && (
                      <div style={{ width: 2, height: 60, background: activeStage >= index + 1 ? '#10B981' : 'rgba(255,255,255,0.1)', margin: '0.5rem 0', transition: 'background 1s' }}></div>
                    )}
                  </div>
                  <div style={{ paddingTop: '0.5rem' }}>
                    <h4 style={{ color: active ? 'white' : 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '1rem' }}>{stage.title}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{stage.keyword}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {status !== 'idle' && (
            <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', borderRadius: '6px', background: status === 'complete' ? 'rgba(16,185,129,0.1)' : status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', border: `1px solid ${status === 'complete' ? 'rgba(16,185,129,0.3)' : status === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`, fontSize: '0.85rem', color: status === 'complete' ? '#10B981' : status === 'error' ? '#ef4444' : 'var(--accent-primary)', textAlign: 'center', fontWeight: 600 }}>
              {status === 'running' ? '● Pipeline in progress...' : status === 'complete' ? '✓ Pipeline Complete' : '✗ Pipeline Error'}
            </div>
          )}
        </div>

        {/* Right: Log terminal + metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ background: '#0a0b10', padding: '1rem 1.5rem', borderBottom: '1px solid #1f2937', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Integrity Logs {jobId && <span style={{ marginLeft: '1rem', color: '#6366f1' }}>Job #{jobId}</span>}
            </div>
            <div style={{ padding: '1.5rem', background: '#0d0f17', fontFamily: 'monospace', fontSize: '0.85rem', minHeight: '300px', maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {status === 'idle' ? (
                <div style={{ color: '#4b5563' }}>[ Pipeline idle — press Run ETL Pipeline to begin ]</div>
              ) : (
                logs.map((line, i) => (
                  <div key={i} style={{ color: logColor(line) }}>{line}</div>
                ))
              )}
              {status === 'running' && (
                <div style={{ color: '#6366f1', animation: 'pulse 1s infinite' }}>▌</div>
              )}
              <div ref={logEndRef} />
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
              <div className="value" style={{ fontSize: '1.5rem', color: '#10B981' }}>4</div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Into Snowflake Schema</span>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
