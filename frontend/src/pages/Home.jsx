import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShoppingCart } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local cache first
    const cachedProducts = sessionStorage.getItem('productsCache');
    if (cachedProducts) {
      setProducts(JSON.parse(cachedProducts));
      setLoading(false);
      return;
    }

    // For demo purposes, we fallback to mock data if the API is unreachable.
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
          { id: '5', name: 'RED WOOLLY HOTTIE WHITE HEART.', category: 'General', price: 355.95 },
          { id: '6', name: 'SET 7 BABUSHKA NESTING BOXES', category: 'General', price: 803.25 },
          { id: '7', name: 'GLASS STAR FROSTED T-LIGHT HOLDER', category: 'Decoration', price: 446.25 },
          { id: '8', name: 'HAND WARMER UNION JACK', category: 'General', price: 194.25 },
        ];
        setProducts(fallbackData);
        sessionStorage.setItem('productsCache', JSON.stringify(fallbackData));
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Store Products</h1>
        <p>Explore our wide range of products from the OLTP database.</p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loader"></div>
        </div>
      ) : (
        <div className="dashboard-grid">
          {products.map(product => (
            <div key={product.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <span style={{ 
                  background: 'rgba(99, 102, 241, 0.2)', 
                  color: 'var(--accent-primary)', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  display: 'inline-block'
                }}>
                  {product.category}
                </span>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', fontFamily: 'Outfit' }}>{product.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Product ID: {product.id}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  ₹{product.price?.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </div>
                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShoppingCart size={16} /> Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
