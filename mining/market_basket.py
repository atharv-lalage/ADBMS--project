import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules

def generate_market_basket(df):
    """
    Simulates Market Basket Analysis using Apriori algorithm.
    """
    # Group by InvoiceNo to get items in a basket
    basket = df.groupby(['InvoiceNo', 'Description'])['Quantity'].sum().unstack().reset_index().fillna(0).set_index('InvoiceNo')
    
    # Convert quantities to presence/absence boolean for Apriori
    def encode_units(x):
        if x <= 0: return False
        if x >= 1: return True
        return False
        
    basket_sets = basket.map(encode_units)
    
    # Generate frequent items (using a low min_support since retail items vary heavily)
    frequent_itemsets = apriori(basket_sets, min_support=0.03, use_colnames=True)
    
    if frequent_itemsets.empty:
        return []
        
    # Generate association rules
    rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1.1)
    
    # Sort by lift and take top 10 rules for dashboard
    top_rules = rules.sort_values('lift', ascending=False).head(10)
    
    results = []
    for _, row in top_rules.iterrows():
        ant = list(row['antecedents'])[0]
        con = list(row['consequents'])[0]
        results.append({
            'rule': f"{ant} -> {con}",
            'support': round(row['support'], 4),
            'confidence': round(row['confidence'], 4),
            'lift': round(row['lift'], 4)
        })
        
    return results
