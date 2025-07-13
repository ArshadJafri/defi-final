#!/usr/bin/env python3
"""
Backend API Testing for DeFi Risk Assessment & Portfolio Management System
Tests all major API endpoints with realistic data
"""

import requests
import json
import time
import sys
from datetime import datetime

# Backend URL from frontend/.env
BACKEND_URL = "https://71f6fc78-75b4-426a-89b3-a25d31807892.preview.emergentagent.com/api"

# Test data
TEST_USER_ID = "demo-user-123"
TEST_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b8D485620df4C5c6a6"
TEST_SYMBOLS = ["BTC", "ETH", "LINK", "UNI"]

class DeFiAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.test_results = []
        self.portfolio_id = None
        
    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'response_data': response_data,
            'timestamp': datetime.now().isoformat()
        })
        
    def test_health_check(self):
        """Test basic health check endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Health Check", True, f"API is running: {data['message']}", data)
                    return True
                else:
                    self.log_test("Health Check", False, "Response missing message field", data)
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_portfolio_creation(self):
        """Test portfolio creation with wallet tracking"""
        try:
            payload = {
                "user_id": TEST_USER_ID,
                "wallet_address": TEST_WALLET_ADDRESS
            }
            
            response = self.session.post(f"{self.base_url}/portfolio/create", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate response structure
                required_fields = ['id', 'user_id', 'wallet_address', 'total_value_usd', 'tokens', 'risk_score']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Portfolio Creation", False, f"Missing fields: {missing_fields}", data)
                    return False
                
                # Store portfolio ID for later tests
                self.portfolio_id = data['id']
                
                # Validate data types and values
                if not isinstance(data['tokens'], list):
                    self.log_test("Portfolio Creation", False, "Tokens should be a list", data)
                    return False
                
                if data['total_value_usd'] < 0:
                    self.log_test("Portfolio Creation", False, "Total value should be non-negative", data)
                    return False
                
                self.log_test("Portfolio Creation", True, 
                             f"Portfolio created with {len(data['tokens'])} tokens, total value: ${data['total_value_usd']:.2f}", 
                             data)
                return True
                
            else:
                self.log_test("Portfolio Creation", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Portfolio Creation", False, f"Error: {str(e)}")
            return False
    
    def test_portfolio_retrieval(self):
        """Test portfolio retrieval"""
        if not self.portfolio_id:
            self.log_test("Portfolio Retrieval", False, "No portfolio ID available (portfolio creation failed)")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/portfolio/{self.portfolio_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('id') == self.portfolio_id:
                    self.log_test("Portfolio Retrieval", True, f"Portfolio retrieved successfully", data)
                    return True
                else:
                    self.log_test("Portfolio Retrieval", False, "Portfolio ID mismatch", data)
                    return False
                    
            elif response.status_code == 404:
                self.log_test("Portfolio Retrieval", False, "Portfolio not found", response.text)
                return False
            else:
                self.log_test("Portfolio Retrieval", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Portfolio Retrieval", False, f"Error: {str(e)}")
            return False
    
    def test_risk_analysis(self):
        """Test advanced risk analysis"""
        if not self.portfolio_id:
            self.log_test("Risk Analysis", False, "No portfolio ID available (portfolio creation failed)")
            return False
            
        try:
            payload = {
                "portfolio_id": self.portfolio_id,
                "time_period": 30
            }
            
            response = self.session.post(f"{self.base_url}/portfolio/{self.portfolio_id}/risk-analysis", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate risk metrics fields
                required_fields = ['portfolio_id', 'value_at_risk', 'conditional_var', 'max_drawdown', 
                                 'sharpe_ratio', 'sortino_ratio', 'volatility', 'skewness', 'kurtosis']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Risk Analysis", False, f"Missing risk metrics: {missing_fields}", data)
                    return False
                
                # Validate that metrics are numeric
                numeric_fields = ['value_at_risk', 'conditional_var', 'max_drawdown', 'sharpe_ratio', 
                                'sortino_ratio', 'volatility', 'skewness', 'kurtosis']
                
                for field in numeric_fields:
                    if not isinstance(data.get(field), (int, float)):
                        self.log_test("Risk Analysis", False, f"{field} should be numeric", data)
                        return False
                
                self.log_test("Risk Analysis", True, 
                             f"Risk analysis completed - VaR: ${data['value_at_risk']:.2f}, Sharpe: {data['sharpe_ratio']:.2f}", 
                             data)
                return True
                
            else:
                self.log_test("Risk Analysis", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Risk Analysis", False, f"Error: {str(e)}")
            return False
    
    def test_sentiment_analysis(self):
        """Test multi-source sentiment analysis"""
        try:
            payload = {
                "symbols": TEST_SYMBOLS,
                "sources": ["news", "reddit"]
            }
            
            response = self.session.post(f"{self.base_url}/sentiment/analyze", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    self.log_test("Sentiment Analysis", False, "Response should be a list", data)
                    return False
                
                if len(data) == 0:
                    self.log_test("Sentiment Analysis", False, "No sentiment data returned", data)
                    return False
                
                # Validate sentiment data structure
                for sentiment in data:
                    required_fields = ['symbol', 'sentiment_score', 'confidence', 'volume']
                    missing_fields = [field for field in required_fields if field not in sentiment]
                    
                    if missing_fields:
                        self.log_test("Sentiment Analysis", False, f"Missing sentiment fields: {missing_fields}", data)
                        return False
                    
                    # Validate sentiment score range (-1 to 1)
                    if not -1 <= sentiment['sentiment_score'] <= 1:
                        self.log_test("Sentiment Analysis", False, f"Sentiment score out of range: {sentiment['sentiment_score']}", data)
                        return False
                    
                    # Validate confidence range (0 to 1)
                    if not 0 <= sentiment['confidence'] <= 1:
                        self.log_test("Sentiment Analysis", False, f"Confidence out of range: {sentiment['confidence']}", data)
                        return False
                
                avg_sentiment = sum(s['sentiment_score'] for s in data) / len(data)
                self.log_test("Sentiment Analysis", True, 
                             f"Sentiment analysis completed for {len(data)} symbols, avg sentiment: {avg_sentiment:.2f}", 
                             data)
                return True
                
            else:
                self.log_test("Sentiment Analysis", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Sentiment Analysis", False, f"Error: {str(e)}")
            return False
    
    def test_market_data(self):
        """Test market data retrieval"""
        try:
            test_symbol = "BTC"
            response = self.session.get(f"{self.base_url}/market-data/{test_symbol}")
            
            if response.status_code == 200:
                data = response.json()
                
                required_fields = ['symbol', 'price', 'volume_24h', 'market_cap', 'change_24h', 'volatility']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Market Data", False, f"Missing market data fields: {missing_fields}", data)
                    return False
                
                # Validate data types
                if data['symbol'] != test_symbol:
                    self.log_test("Market Data", False, f"Symbol mismatch: expected {test_symbol}, got {data['symbol']}", data)
                    return False
                
                if data['price'] <= 0:
                    self.log_test("Market Data", False, f"Invalid price: {data['price']}", data)
                    return False
                
                self.log_test("Market Data", True, 
                             f"Market data retrieved for {test_symbol}: ${data['price']:.2f}, 24h change: {data['change_24h']:.2f}%", 
                             data)
                return True
                
            else:
                self.log_test("Market Data", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Market Data", False, f"Error: {str(e)}")
            return False
    
    def test_yield_opportunities(self):
        """Test yield farming opportunities"""
        try:
            response = self.session.get(f"{self.base_url}/yield-opportunities")
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    self.log_test("Yield Opportunities", False, "Response should be a list", data)
                    return False
                
                if len(data) == 0:
                    self.log_test("Yield Opportunities", False, "No yield opportunities returned", data)
                    return False
                
                # Validate yield opportunity structure
                for opportunity in data:
                    required_fields = ['protocol', 'token_pair', 'apy', 'tvl', 'risk_score']
                    missing_fields = [field for field in required_fields if field not in opportunity]
                    
                    if missing_fields:
                        self.log_test("Yield Opportunities", False, f"Missing yield fields: {missing_fields}", data)
                        return False
                    
                    # Validate APY is positive
                    if opportunity['apy'] <= 0:
                        self.log_test("Yield Opportunities", False, f"Invalid APY: {opportunity['apy']}", data)
                        return False
                    
                    # Validate TVL is positive
                    if opportunity['tvl'] <= 0:
                        self.log_test("Yield Opportunities", False, f"Invalid TVL: {opportunity['tvl']}", data)
                        return False
                
                avg_apy = sum(o['apy'] for o in data) / len(data)
                self.log_test("Yield Opportunities", True, 
                             f"Found {len(data)} yield opportunities, avg APY: {avg_apy:.2f}%", 
                             data)
                return True
                
            else:
                self.log_test("Yield Opportunities", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Yield Opportunities", False, f"Error: {str(e)}")
            return False
    
    def test_dashboard_data(self):
        """Test comprehensive dashboard data"""
        try:
            response = self.session.get(f"{self.base_url}/dashboard/{TEST_USER_ID}")
            
            if response.status_code == 200:
                data = response.json()
                
                required_sections = ['portfolios', 'risk_metrics', 'sentiment_data', 'yield_opportunities', 'alerts', 'summary']
                missing_sections = [section for section in required_sections if section not in data]
                
                if missing_sections:
                    self.log_test("Dashboard Data", False, f"Missing dashboard sections: {missing_sections}", data)
                    return False
                
                # Validate summary section
                summary = data['summary']
                required_summary_fields = ['total_portfolio_value', 'portfolio_count', 'avg_risk_score', 'total_alerts']
                missing_summary_fields = [field for field in required_summary_fields if field not in summary]
                
                if missing_summary_fields:
                    self.log_test("Dashboard Data", False, f"Missing summary fields: {missing_summary_fields}", data)
                    return False
                
                # Validate data types
                if not isinstance(data['portfolios'], list):
                    self.log_test("Dashboard Data", False, "Portfolios should be a list", data)
                    return False
                
                self.log_test("Dashboard Data", True, 
                             f"Dashboard loaded: {summary['portfolio_count']} portfolios, total value: ${summary['total_portfolio_value']:.2f}", 
                             data)
                return True
                
            else:
                self.log_test("Dashboard Data", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Dashboard Data", False, f"Error: {str(e)}")
            return False
    
    def test_user_alerts(self):
        """Test user alerts retrieval"""
        try:
            response = self.session.get(f"{self.base_url}/alerts/{TEST_USER_ID}")
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    self.log_test("User Alerts", False, "Response should be a list", data)
                    return False
                
                # Alerts can be empty, that's fine
                self.log_test("User Alerts", True, f"Retrieved {len(data)} alerts for user", data)
                return True
                
            else:
                self.log_test("User Alerts", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("User Alerts", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"🚀 Starting DeFi Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print(f"Test User ID: {TEST_USER_ID}")
        print(f"Test Wallet: {TEST_WALLET_ADDRESS}")
        print("=" * 60)
        
        # Run tests in logical order
        tests = [
            ("Health Check", self.test_health_check),
            ("Portfolio Creation", self.test_portfolio_creation),
            ("Portfolio Retrieval", self.test_portfolio_retrieval),
            ("Risk Analysis", self.test_risk_analysis),
            ("Sentiment Analysis", self.test_sentiment_analysis),
            ("Market Data", self.test_market_data),
            ("Yield Opportunities", self.test_yield_opportunities),
            ("Dashboard Data", self.test_dashboard_data),
            ("User Alerts", self.test_user_alerts)
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            print(f"\n🧪 Running {test_name}...")
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL {test_name}: Unexpected error: {str(e)}")
                failed += 1
            
            # Small delay between tests
            time.sleep(0.5)
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 TEST SUMMARY")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  • {result['test']}: {result['message']}")
        
        return passed, failed

def main():
    """Main test execution"""
    tester = DeFiAPITester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()