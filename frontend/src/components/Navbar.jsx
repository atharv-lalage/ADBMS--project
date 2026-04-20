import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Database, LayoutDashboard, Store } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        <Store className="inline-block mr-2" size={24} />
        DataMart Analytics
      </Link>
      
      <div className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
          Store
        </Link>
        <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
          <LayoutDashboard className="inline-block mr-1" size={18} /> Dashboard
        </Link>
      </div>
    </nav>
  );
}
