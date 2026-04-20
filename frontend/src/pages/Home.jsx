import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShoppingCart, Search, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', bounce: 0.4 } }
};

const ALL_CATEGORIES = ['All', 'General', 'Decoration', 'Bags', 'Mugs', 'Gift'];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [marketBasket, setMarketBasket] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [txState, setTxState] = useState({}); // productId -> { status, message }

  useEffect(() => {
    const cachedProducts = sessionStorage.getItem('productsCache');
    const cachedBasket = sessionStorage.getItem('basketCache');

    if (cachedBasket) setMarketBasket(JSON.parse(cachedBasket));

    if (cachedProducts) {
      setProducts(JSON.parse(cachedProducts));
      setLoading(false);
      return;
    }

    axios.get('http://localhost:5000/api/products')
      .then(res => {
        setProducts(res.data);
        sessionStorage.setItem('productsCache', JSON.stringify(res.data));
        setLoading(false);
      })
      .catch(() => {
        const fallbackData = [
          { id: '85123A', name: 'WHITE HANGING HEART T-LIGHT HOLDER', category: 'Decoration', price: 267.75 },
          { id: '71053',  name: 'WHITE METAL LANTERN', category: 'General', price: 355.95 },
          { id: '84406B', name: 'CREAM CUPID HEARTS COAT HANGER', category: 'Decoration', price: 288.75 },
          { id: '84029G', name: 'KNITTED UNION FLAG HOT WATER BOTTLE', category: 'General', price: 355.95 },
          { id: '84029E', name: 'RED WOOLLY HOTTIE WHITE HEART', category: 'General', price: 355.95 },
          { id: '22752',  name: 'SET 7 BABUSHKA NESTING BOXES', category: 'General', price: 803.25 },
          { id: '21730',  name: 'GLASS STAR FROSTED T-LIGHT HOLDER', category: 'Decoration', price: 446.25 },
          { id: '22633',  name: 'HAND WARMER UNION JACK', category: 'General', price: 194.25 },
          { id: '22960',  name: 'JAM MAKING SET WITH JARS', category: 'Gift', price: 525.00 },
          { id: '22086',  name: 'PAPER CHAIN KIT 50S CHRISTMAS', category: 'Gift', price: 210.00 },
        ];
        setProducts(fallbackData);
        sessionStorage.setItem('productsCache', JSON.stringify(fallbackData));
        setLoading(false);
      });
  }, []);

  const getRecommendation = (productName) => {
    if (!marketBasket.length) return null;
    const rule = marketBasket.find(r => r.rule.toLowerCase().includes(productName.toLowerCase()));
    if (rule) return rule.rule.split(' -> ')[1];
    return null;
  };

  const simulateTransaction = async (product) => {
    setTxState(prev => ({ ...prev, [product.id]: { status: 'loading' } }));
    try {
      const res = await axios.post('http://localhost:5000/api/transaction', {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        amount: product.price
      });
      const { order_id, message, simulated } = res.data;
      setTxState(prev => ({
        ...prev,
        [product.id]: { status: 'success', message: `Order ${order_id}${simulated ? ' (simulated)' : ''} committed.` }
      }));
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      setTxState(prev => ({ ...prev, [product.id]: { status: 'error', message: errMsg } }));
    }
    // Clear after 4 seconds
    setTimeout(() => setTxState(prev => { const n = { ...prev }; delete n[product.id]; return n; }), 4000);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) &&
    (activeCategory === 'All' || p.category === activeCategory)
  );

  return (
    <motion.div className="container" initial="initial" animate="in" exit="out" variants={pageVariants}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1>Enterprise Storefront</h1>
          <p>Real-time OLTP inventory powered by Apriori Recommendations.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem 1rem 0.5rem 2.5rem', borderRadius: '8px', outline: 'none' }}
            />
          </div>
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            style={{ background: 'var(--bg-secondary)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.5rem', borderRadius: '8px', outline: 'none' }}
          >
            {ALL_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: '220px' }}></div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem', fontSize: '1rem' }}>
          No products found for "{search}" in {activeCategory}.
        </div>
      ) : (
        <motion.div className="dashboard-grid" variants={containerVariants} initial="hidden" animate="show">
          {filteredProducts.map((product) => {
            const recommendation = getRecommendation(product.name);
            const tx = txState[product.id];
            return (
              <motion.div key={product.id} className="glass-panel" variants={itemVariants} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--accent-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', marginBottom: '1rem', display: 'inline-block' }}>
                    {product.category}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontFamily: 'Outfit' }}>{product.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Stock ID: {product.id}</p>

                  {recommendation && (
                    <div style={{ background: 'linear-gradient(90deg, rgba(16,185,129,0.1), transparent)', borderLeft: '3px solid #10B981', padding: '8px 12px', borderRadius: '0 4px 4px 0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                      <TrendingUp size={14} style={{ display: 'inline', color: '#10B981', marginRight: 4 }} />
                      <span style={{ color: 'var(--text-muted)' }}>Frequently Bought Together:</span><br />
                      <strong style={{ color: '#10B981' }}>{recommendation}</strong>
                    </div>
                  )}

                  <AnimatePresence>
                    {tx && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ overflow: 'hidden', marginTop: '0.5rem' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: tx.status === 'success' ? 'rgba(16,185,129,0.1)' : tx.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', border: `1px solid ${tx.status === 'success' ? 'rgba(16,185,129,0.3)' : tx.status === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)'}`, borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.78rem' }}>
                          {tx.status === 'success'
                            ? <CheckCircle size={13} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
                            : tx.status === 'error'
                              ? <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                              : <span style={{ width: 13, height: 13, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
                          }
                          <span style={{ color: tx.status === 'success' ? '#10B981' : tx.status === 'error' ? '#ef4444' : '#6366f1' }}>
                            {tx.status === 'loading' ? 'Committing to OLTP...' : tx.message}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    ₹{product.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                    onClick={() => simulateTransaction(product)}
                    disabled={tx?.status === 'loading'}
                  >
                    <ShoppingCart size={16} /> Simulate Tx
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
