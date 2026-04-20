import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Auth from './pages/Auth';
import Settings from './pages/Settings';
import OLAPTerminal from './pages/OLAPTerminal';
import ETLTracker from './pages/ETLTracker';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/terminal" element={<OLAPTerminal />} />
        <Route path="/etl" element={<ETLTracker />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem('authenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) return <div className="app"></div>;

  if (!isAuthenticated) {
    return <Auth onLogin={() => {
      sessionStorage.setItem('authenticated', 'true');
      setIsAuthenticated(true);
    }} />;
  }

  return (
    <Router>
      <div className="app">
        <Sidebar />
        <div className="main-content">
          <header className="top-header">
            <div className="header-user">
              <span>Administrator</span>
              <div className="avatar"></div>
            </div>
          </header>
          <AnimatedRoutes />
        </div>
      </div>
    </Router>
  );
}

export default App;
