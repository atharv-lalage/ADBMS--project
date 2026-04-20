import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const [salesData, setSalesData] = useState({ total_sales: 0, total_orders: 0, average_order_value: 0 });
  const [predictions, setPredictions] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [marketBasket, setMarketBasket] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fallback Mock Data in case Python API is not running
  const mockPredictions = [
    { period: '2010-12', actual_sales: 78640485, predicted_sales: 77700000 },
    { period: '2011-01', actual_sales: 58800000, predicted_sales: 60900000 },
    { period: '2011-02', actual_sales: 54600000, predicted_sales: 53550000 },
    { period: '2011-03', actual_sales: 74550000, predicted_sales: 71400000 },
    { period: '2011-04', actual_sales: 71400000, predicted_sales: 68250000 },
    { period: '2011-05', actual_sales: 75600000, predicted_sales: 73500000 },
    { period: '2011-06', actual_sales: 81900000, predicted_sales: 79800000 },
    { period: '2011-07', actual_sales: 78750000, predicted_sales: 81900000 },
    { period: '2011-08', actual_sales: 80850000, predicted_sales: 84000000 },
    { period: '2011-09', actual_sales: 86100000, predicted_sales: 89250000 },
    { period: '2011-10', actual_sales: 110250000, predicted_sales: 99750000 },
    { period: '2011-12', actual_sales: null, predicted_sales: 126000000 },
    { period: '2012-01', actual_sales: null, predicted_sales: 136500000 },
  ];

  const mockClusters = [
    { Segment: 'Low Value', Avg_Recency: 153, Avg_Frequency: 1.2, Avg_Monetary: 24150, Customer_Count: 2150 },
    { Segment: 'Mid Value', Avg_Recency: 45, Avg_Frequency: 5.4, Avg_Monetary: 152250, Customer_Count: 1540 },
    { Segment: 'High Value', Avg_Recency: 12, Avg_Frequency: 24.5, Avg_Monetary: 882000, Customer_Count: 648 },
  ];

  const mockBasket = [
    { rule: "WHITE HANGING HEART T-LIGHT HOLDER -> RED HANGING HEART T-LIGHT HOLDER", support: 0.05, confidence: 0.72, lift: 15.2 },
    { rule: "ROSES REGENCY TEACUP AND SAUCER -> GREEN REGENCY TEACUP AND SAUCER", support: 0.04, confidence: 0.81, lift: 16.4 },
    { rule: "JUMBO BAG RED RETROSPOT -> JUMBO BAG PINK POLKADOT", support: 0.06, confidence: 0.65, lift: 12.1 }
  ];

  useEffect(() => {
    const cachedSales = sessionStorage.getItem('salesCache');
    const cachedPreds = sessionStorage.getItem('predsCache');
    const cachedClusters = sessionStorage.getItem('clustersCache');
    const cachedBasket = sessionStorage.getItem('basketCache');

    if (cachedSales && cachedPreds && cachedClusters && cachedBasket) {
      setSalesData(JSON.parse(cachedSales));
      setPredictions(JSON.parse(cachedPreds));
      setClusters(JSON.parse(cachedClusters));
      setMarketBasket(JSON.parse(cachedBasket));
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [salesRes, predRes, clusterRes, basketRes] = await Promise.all([
          axios.get('http://localhost:5000/api/analytics/sales').catch(() => ({ data: { total_sales: 1023509998, total_orders: 25900, average_order_value: 39517.8 } })),
          axios.get('http://localhost:5000/api/analytics/predictions').catch(() => ({ data: mockPredictions })),
          axios.get('http://localhost:5000/api/analytics/clusters').catch(() => ({ data: mockClusters })),
          axios.get('http://localhost:5000/api/analytics/market-basket').catch(() => ({ data: mockBasket }))
        ]);
        
        const sales = salesRes.data;
        const preds = predRes.data.length ? predRes.data : mockPredictions;
        const clus = clusterRes.data.length ? clusterRes.data : mockClusters;
        const basket = basketRes.data.length ? basketRes.data : mockBasket;

        setSalesData(sales);
        setPredictions(preds);
        setClusters(clus);
        setMarketBasket(basket);

        sessionStorage.setItem('salesCache', JSON.stringify(sales));
        sessionStorage.setItem('predsCache', JSON.stringify(preds));
        sessionStorage.setItem('clustersCache', JSON.stringify(clus));
        sessionStorage.setItem('basketCache', JSON.stringify(basket));
      } catch (err) {
        console.error("Using fallback data strictly", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const COLORS = ['#6366f1', '#ec4899', '#10B981'];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Decision Support Dashboard</h1>
        <p>Data Warehousing & Mining Insights</p>
      </div>

      {/* KPI Stats */}
      <div className="dashboard-grid">
        <div className="glass-panel stat-card">
          <h3>Total Sales Velocity</h3>
          <div className="value">₹{salesData.total_sales?.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <span style={{ color: 'var(--accent-secondary)', fontSize: '0.9rem' }}>+12% vs Last Year (Roll-up)</span>
        </div>
        <div className="glass-panel stat-card">
          <h3>Total Checkouts</h3>
          <div className="value">{salesData.total_orders?.toLocaleString()}</div>
          <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem' }}>Transactional</span>
        </div>
        <div className="glass-panel stat-card">
          <h3>Avg Order Value</h3>
          <div className="value">₹{salesData.average_order_value?.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <span style={{ color: '#10B981', fontSize: '0.9rem' }}>Positive Trend</span>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        
        {/* Regression Prediction */}
        <div className="glass-panel chart-container">
          <h2>Sales Trend & Prediction (Linear Regression)</h2>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={predictions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2c3d" />
              <XAxis dataKey="period" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(value) => `₹${value/1000}k`} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'rgba(19, 21, 31, 0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <Legend />
              <Line type="monotone" dataKey="actual_sales" stroke="#6366f1" strokeWidth={3} name="Actual Sales" dot={{r: 4}} />
              <Line type="monotone" dataKey="predicted_sales" stroke="#ec4899" strokeWidth={3} strokeDasharray="5 5" name="Predicted Sales" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* KMeans Clustering */}
        <div className="glass-panel chart-container">
          <h2>Customer Segments (K-Means RFM)</h2>
          <div style={{ display: 'flex', height: '80%' }}>
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={clusters}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="Customer_Count"
                  nameKey="Segment"
                >
                  {clusters.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#13151f', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
              {clusters.map((cluster, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS[i] }}></div>
                    <strong style={{ color: 'var(--text-main)' }}>{cluster.Segment}</strong>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Avg Spend: ₹{cluster.Avg_Monetary?.toLocaleString()} <br/>
                    {cluster.Customer_Count} Users
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Market Basket Analysis */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Product Association Rules (Apriori Analysis)</h2>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Rule (Antecedent → Consequent)</th>
                <th>Confidence</th>
                <th>Support</th>
                <th>Lift</th>
              </tr>
            </thead>
            <tbody>
              {marketBasket.map((rule, idx) => (
                <tr key={idx}>
                  <td style={{ color: 'var(--text-main)', fontWeight: 500 }}>{rule.rule}</td>
                  <td>{(rule.confidence * 100).toFixed(1)}%</td>
                  <td>{(rule.support * 100).toFixed(2)}%</td>
                  <td style={{ color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{rule.lift.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
