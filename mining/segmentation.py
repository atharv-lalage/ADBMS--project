import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import json

def generate_segmentation(df):
    """
    Simulates K-Means customer segmentation based on RFM (Recency, Frequency, Monetary value).
    """
    # Create RFM Features
    # Recency (days since last purchase relative to max date)
    max_date = df['InvoiceDate'].max()
    rfm = df.groupby('CustomerID').agg({
        'InvoiceDate': lambda x: (max_date - x.max()).days,
        'InvoiceNo': 'nunique',
        'Amount': 'sum'
    })
    rfm.rename(columns={'InvoiceDate': 'Recency', 'InvoiceNo': 'Frequency', 'Amount': 'Monetary'}, inplace=True)
    
    # Filter out outliers or zero/negative monetary for better clustering
    rfm = rfm[rfm['Monetary'] > 0]
    
    # Scale Data
    scaler = StandardScaler()
    rfm_scaled = scaler.fit_transform(rfm)
    
    # K-Means Clustering (3 clusters: Low, Mid, High value)
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    rfm['Cluster'] = kmeans.fit_predict(rfm_scaled)
    
    # Label Clusters based on Monetary center
    cluster_centers = rfm.groupby('Cluster')['Monetary'].mean().sort_values()
    cluster_mapping = {cluster_centers.index[0]: 'Low Value', 
                       cluster_centers.index[1]: 'Mid Value', 
                       cluster_centers.index[2]: 'High Value'}
    rfm['Segment'] = rfm['Cluster'].map(cluster_mapping)
    
    # Prepare result summary
    summary = rfm.groupby('Segment').agg({
        'Recency': 'mean',
        'Frequency': 'mean',
        'Monetary': ['mean', 'count']
    })
    summary.columns = ['Avg_Recency', 'Avg_Frequency', 'Avg_Monetary', 'Customer_Count']
    summary = summary.reset_index()
    
    return summary.to_dict(orient='records')
