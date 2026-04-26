import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, LogOut, Settings as SettingsIcon, Terminal, Activity, UploadCloud } from 'lucide-react';

export default function Sidebar() {
  
  const handleLogout = (e) => {
    e.preventDefault();
    sessionStorage.removeItem('authenticated');
    window.location.reload();
  };

  return (
    <aside className="sidebar">
      <div className="logo brand-font">
        <Store size={28} color="var(--accent-primary)" />
        DataMart 
      </div>
      
      <div className="nav-links" style={{ flex: 1 }}>
        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '1rem', paddingLeft: '1rem' }}>
          Database Architecture
        </p>
        <NavLink to="/ingestion" className={({ isActive }) => (isActive ? 'active' : '')}>
          <UploadCloud size={18} /> Ingestion Portal
        </NavLink>
        <NavLink to="/etl" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Activity size={18} /> ETL Pipeline Logs
        </NavLink>
        <NavLink to="/terminal" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Terminal size={18} /> OLAP Query Interface
        </NavLink>

        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '1.5rem', paddingLeft: '1rem' }}>
          Business Intelligence
        </p>
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          <LayoutDashboard size={18} /> Machine Learning/ DSS
        </NavLink>
        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Store size={18} /> Simulated Store (OLTP)
        </NavLink>
      </div>

      <div className="nav-links">
        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', paddingLeft: '1rem' }}>
          Preferences
        </p>
        <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
          <SettingsIcon size={18} /> Settings
        </NavLink>
        <a href="#logout" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <LogOut size={18} /> Sign Out
        </a>
      </div>
    </aside>
  );
}
