#!/usr/bin/env python3
"""
Focused test for the previously failing endpoints
"""

import requests
import json
import sys

BACKEND_URL = "https://71f6fc78-75b4-426a-89b3-a25d31807892.preview.emergentagent.com/api"
TEST_USER_ID = "demo-user-123"
TEST_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b8D485620df4C5c6a6"

def test_critical_endpoints():
    """Test the previously failing critical endpoints"""
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    print("🎯 Testing Previously Failing Critical Endpoints")
    print("=" * 60)
    
    # Step 1: Create a portfolio first
    print("1. Creating portfolio...")
    portfolio_payload = {
        "user_id": TEST_USER_ID,
        "wallet_address": TEST_WALLET_ADDRESS
    }
    
    response = session.post(f"{BACKEND_URL}/portfolio/create", json=portfolio_payload)
    if response.status_code != 200:
        print(f"❌ Portfolio creation failed: {response.status_code} - {response.text}")
        return False
    
    portfolio_data = response.json()
    portfolio_id = portfolio_data['id']
    print(f"✅ Portfolio created: {portfolio_id}")
    
    # Step 2: Test Risk Analysis (previously failing with float serialization)
    print("\n2. Testing Risk Analysis endpoint...")
    risk_payload = {
        "portfolio_id": portfolio_id,
        "time_period": 30
    }
    
    response = session.post(f"{BACKEND_URL}/portfolio/{portfolio_id}/risk-analysis", json=risk_payload)
    if response.status_code != 200:
        print(f"❌ Risk analysis failed: {response.status_code} - {response.text}")
        return False
    
    try:
        risk_data = response.json()
        # Verify all numeric fields are valid JSON-serializable floats
        numeric_fields = ['value_at_risk', 'conditional_var', 'max_drawdown', 'sharpe_ratio', 
                         'sortino_ratio', 'volatility', 'skewness', 'kurtosis']
        
        for field in numeric_fields:
            value = risk_data.get(field)
            if not isinstance(value, (int, float)) or str(value) in ['nan', 'inf', '-inf']:
                print(f"❌ Invalid float value in {field}: {value}")
                return False
        
        print(f"✅ Risk analysis working - VaR: ${risk_data['value_at_risk']:.2f}, Sharpe: {risk_data['sharpe_ratio']:.2f}")
        
    except json.JSONDecodeError as e:
        print(f"❌ Risk analysis JSON decode error: {e}")
        return False
    
    # Step 3: Test Dashboard Data (previously failing with float serialization)
    print("\n3. Testing Dashboard Data endpoint...")
    response = session.get(f"{BACKEND_URL}/dashboard/{TEST_USER_ID}")
    if response.status_code != 200:
        print(f"❌ Dashboard data failed: {response.status_code} - {response.text}")
        return False
    
    try:
        dashboard_data = response.json()
        
        # Verify required sections exist
        required_sections = ['portfolios', 'risk_metrics', 'sentiment_data', 'yield_opportunities', 'alerts', 'summary']
        for section in required_sections:
            if section not in dashboard_data:
                print(f"❌ Missing dashboard section: {section}")
                return False
        
        # Verify summary metrics are valid floats
        summary = dashboard_data['summary']
        if not isinstance(summary['total_portfolio_value'], (int, float)):
            print(f"❌ Invalid total_portfolio_value: {summary['total_portfolio_value']}")
            return False
        
        if not isinstance(summary['avg_risk_score'], (int, float)):
            print(f"❌ Invalid avg_risk_score: {summary['avg_risk_score']}")
            return False
        
        print(f"✅ Dashboard data working - {summary['portfolio_count']} portfolios, total value: ${summary['total_portfolio_value']:.2f}")
        
    except json.JSONDecodeError as e:
        print(f"❌ Dashboard data JSON decode error: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 ALL CRITICAL ENDPOINTS WORKING!")
    print("✅ Risk Analysis Engine - No more float serialization errors")
    print("✅ Dashboard Data - No more JSON serialization issues")
    return True

if __name__ == "__main__":
    success = test_critical_endpoints()
    sys.exit(0 if success else 1)