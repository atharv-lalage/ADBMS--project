import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShoppingCart, Search, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', bounce: 0.4 } }
};

export default function Home() {
  const [products, setProducts] = useState([]);
  const [marketBasket, setMarketBasket] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

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
      .catch((err) => {
        console.error("API Error, using fallback data", err);
        const fallbackData = [
          { id: '1', name: 'WHITE HANGING HEART T-LIGHT HOLDER', category: 'Decoration', price: 267.75 },
          { id: '2', name: 'WHITE METAL LANTERN', category: 'General', price: 355.95 },
          { id: '3', name: 'CREAM CUPID HEARTS COAT HANGER', category: 'Decoration', price: 288.75 },
          { id: '4', name: 'KNITTED UNION FLAG HOT WATER BOTTLE', category: 'General', price: 355.95 },
          { id: '5', name: 'RED WOOLLY HOTTIE WHITE HEART', category: 'General', price: 355.95 },
          { id: '6', name: 'SET 7 BABUSHKA NESTING BOXES', category: 'General', price: 803.25 },
          { id: '7', name: 'GLASS STAR FROSTED T-LIGHT HOLDER', category: 'Decoration', price: 446.25 },
          { id: '8', name: 'HAND WARMER UNION JACK', category: 'General', price: 194.25 },
        ];
        setProducts(fallbackData);
        sessionStorage.setItem('productsCache', JSON.stringify(fallbackData));
        setLoading(false);
      });
  }, []);

  // Get Apriori Recommendations dynamically based on product name
  const getRecommendation = (productName) => {
    if (!marketBasket.length) return null;
    const rule = marketBasket.find(r => r.rule.includes(productName));
    if (rule) {
      const recommendedItems = rule.rule.split(' -> ')[1];
      return recommendedItems;
    }
    return null;
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) && 
    (activeCategory === "All" || p.category.includes(activeCategory))
  );

  return (
    <motion.div 
      className="container"
      initial="initial" animate="in" exit="out" variants={pageVariants}
    >
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
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                color: 'white', padding: '0.5rem 1rem 0.5rem 2.5rem', borderRadius: '8px', outline: 'none'
              }}
            />
          </div>
          <select 
            value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)}
            style={{ background: 'var(--bg-secondary)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.5rem', borderRadius: '8px', outline: 'none' }}
          >
            <option value="All">All Categories</option>
            <option value="Decoration">Decoration</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-grid">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton" style={{ height: '220px' }}></div>
          ))}
        </div>
      ) : (
        <motion.div className="dashboard-grid" variants={containerVariants} initial="hidden" animate="show">
          {filteredProducts.map((product) => {
            const recommendation = getRecommendation(product.name);
            return (
              <motion.div key={product.id} className="glass-panel" variants={itemVariants} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ 
                    background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-primary)', 
                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', marginBottom: '1rem', display: 'inline-block'
                  }}>
                    {product.category}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontFamily: 'Outfit' }}>{product.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Stock ID: {product.id}</p>
                  
                  {recommendation && (
                    <div style={{ background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1), transparent)', borderLeft: '3px solid #10B981', padding: '8px 12px', borderRadius: '0 4px 4px 0', fontSize: '0.85rem' }}>
                      <TrendingUp size={14} style={{ display: 'inline', color: '#10B981', marginRight: 4 }} />
                      <span style={{ color: 'var(--text-muted)' }}>Frequently Bought Together:</span> <br/>
                      <strong style={{ color: '#10B981' }}>{recommendation}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    ₹{product.price?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </div>
                  <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }} onClick={() => alert(`[OLTP TRANSACTION SIMULATED] \n\nINSERT INTO orders (user_id)... \nINSERT INTO order_items (product_id)... \n\nItem: ${product.name}`)}>
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
