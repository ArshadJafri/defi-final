import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in (from localStorage)
    const savedUser = localStorage.getItem('defi_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('defi_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('defi_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Login Component
const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For demo purposes, we'll create a user with any email
      const userData = {
        id: `user_${Date.now()}`,
        email: formData.email,
        name: formData.email.split('@')[0],
        created_at: new Date().toISOString()
      };

      login(userData);
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-user-123',
      email: 'demo@defi.com',
      name: 'Demo User',
      created_at: new Date().toISOString()
    };
    login(demoUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div className="relative z-10 max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">DeFi Risk Manager</h1>
            <p className="text-blue-200">Advanced Portfolio Management & Risk Assessment</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isSignup ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isSignup ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Demo Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-transparent text-gray-300">Or</span>
              </div>
            </div>
            <button
              onClick={handleDemoLogin}
              className="w-full mt-4 bg-white/10 border border-white/20 text-white py-3 rounded-lg font-medium hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-200"
            >
              Try Demo Account
            </button>
          </div>

          {/* Toggle Sign Up */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
            >
              {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Features */}
          <div className="mt-8 text-center">
            <div className="grid grid-cols-3 gap-4 text-xs text-gray-300">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>Secure</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span>Fast</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span>Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portfolios, setPortfolios] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);
  const [yieldOpportunities, setYieldOpportunities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const { user, logout } = useAuth();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API}/dashboard/${user.id}`);
      setDashboardData(response.data);
      setPortfolios(response.data.portfolios || []);
      setSentimentData(response.data.sentiment_data || []);
      setYieldOpportunities(response.data.yield_opportunities || []);
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPortfolio = async () => {
    if (!walletAddress || !user) {
      alert('Please enter a wallet address');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API}/portfolio/create`, {
        user_id: user.id,
        wallet_address: walletAddress
      });
      
      setPortfolios([...portfolios, response.data]);
      setWalletAddress('');
      alert('Portfolio created successfully!');
      loadDashboardData();
    } catch (error) {
      console.error('Error creating portfolio:', error);
      alert('Error creating portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeRisk = async (portfolioId) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await axios.post(`${API}/portfolio/${portfolioId}/risk-analysis`, {
        portfolio_id: portfolioId,
        time_period: 30
      });
      setRiskMetrics(response.data);
    } catch (error) {
      console.error('Error analyzing risk:', error);
      alert('Error analyzing risk. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeSentiment = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const symbols = ['BTC', 'ETH', 'LINK', 'UNI'];
      const response = await axios.post(`${API}/sentiment/analyze`, {
        symbols: symbols,
        sources: ['news', 'reddit']
      });
      setSentimentData(response.data);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      alert('Error analyzing sentiment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadYieldOpportunities = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API}/yield-opportunities`);
      setYieldOpportunities(response.data);
    } catch (error) {
      console.error('Error loading yield opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskScore) => {
    if (riskScore < 30) return 'text-green-400';
    if (riskScore < 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment > 0.2) return 'text-green-400';
    if (sentiment > -0.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // If user is not logged in, show login page
  if (!user) {
    return <LoginPage />;
  }

  const DashboardView = () => (
    <div className="space-y-8">
      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Total Portfolio Value</h3>
              <p className="text-3xl font-bold">
                {dashboardData?.summary?.total_portfolio_value ? formatCurrency(dashboardData.summary.total_portfolio_value) : '$0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Portfolios</h3>
              <p className="text-3xl font-bold">{dashboardData?.summary?.portfolio_count || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Risk Score</h3>
              <p className="text-3xl font-bold">
                {dashboardData?.summary?.avg_risk_score?.toFixed(1) || '0.0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Active Alerts</h3>
              <p className="text-3xl font-bold">{dashboardData?.summary?.total_alerts || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 17v5l5-5H4zM4 7v5l5-5H4zM20 7v5l-5-5h5z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Portfolios */}
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Recent Portfolios
        </h3>
        <div className="space-y-4">
          {portfolios.slice(0, 3).map((portfolio) => (
            <div key={portfolio.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
              <div>
                <p className="font-semibold text-white">{portfolio.wallet_address.slice(0, 8)}...{portfolio.wallet_address.slice(-6)}</p>
                <p className="text-sm text-gray-300">{portfolio.tokens?.length || 0} tokens</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-white">{formatCurrency(portfolio.total_value_usd)}</p>
                <p className={`text-sm ${getRiskColor(portfolio.risk_score)}`}>
                  Risk: {portfolio.risk_score.toFixed(1)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Sentiment */}
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Market Sentiment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sentimentData.slice(0, 4).map((sentiment) => (
            <div key={sentiment.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{sentiment.symbol}</span>
                <span className={`text-sm px-2 py-1 rounded-full ${getSentimentColor(sentiment.sentiment_score)} bg-current/20`}>
                  {sentiment.sentiment_score > 0 ? 'Positive' : sentiment.sentiment_score < 0 ? 'Negative' : 'Neutral'}
                </span>
              </div>
              <p className="text-sm text-gray-300">
                Confidence: {(sentiment.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-300">
                Volume: {sentiment.volume}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const PortfolioView = () => (
    <div className="space-y-8">
      {/* Create Portfolio */}
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New Portfolio
        </h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Enter wallet address (0x...)"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={createPortfolio}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? 'Creating...' : 'Create Portfolio'}
          </button>
        </div>
      </div>

      {/* Portfolio List */}
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Your Portfolios
        </h3>
        <div className="space-y-6">
          {portfolios.map((portfolio) => (
            <div key={portfolio.id} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-lg text-white">
                    {portfolio.wallet_address.slice(0, 10)}...{portfolio.wallet_address.slice(-8)}
                  </p>
                  <p className="text-sm text-gray-300">
                    Created: {new Date(portfolio.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(portfolio.total_value_usd)}
                  </p>
                  <p className={`text-sm ${getRiskColor(portfolio.risk_score)}`}>
                    Risk Score: {portfolio.risk_score.toFixed(1)}
                  </p>
                </div>
              </div>
              
              {/* Token Holdings */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {portfolio.tokens?.map((token) => (
                  <div key={token.id} className="bg-white/5 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{token.symbol}</span>
                      <span className={`text-sm ${token.change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPercent(token.change_24h)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{token.balance.toFixed(4)} {token.symbol}</p>
                    <p className="font-semibold text-white">{formatCurrency(token.value_usd)}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setSelectedPortfolio(portfolio);
                    analyzeRisk(portfolio.id);
                  }}
                  className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
                >
                  Analyze Risk
                </button>
                <button
                  onClick={() => setSelectedPortfolio(portfolio)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Analysis Results */}
      {riskMetrics && (
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Risk Analysis Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-red-500/20 p-4 rounded-lg border border-red-500/30">
              <h4 className="font-semibold text-red-200">Value at Risk (95%)</h4>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(riskMetrics.value_at_risk)}
              </p>
            </div>
            <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/30">
              <h4 className="font-semibold text-blue-200">Sharpe Ratio</h4>
              <p className="text-2xl font-bold text-blue-400">
                {riskMetrics.sharpe_ratio.toFixed(2)}
              </p>
            </div>
            <div className="bg-yellow-500/20 p-4 rounded-lg border border-yellow-500/30">
              <h4 className="font-semibold text-yellow-200">Volatility</h4>
              <p className="text-2xl font-bold text-yellow-400">
                {formatPercent(riskMetrics.volatility * 100)}
              </p>
            </div>
            <div className="bg-red-500/20 p-4 rounded-lg border border-red-500/30">
              <h4 className="font-semibold text-red-200">Max Drawdown</h4>
              <p className="text-2xl font-bold text-red-400">
                {formatPercent(riskMetrics.max_drawdown * 100)}
              </p>
            </div>
            <div className="bg-green-500/20 p-4 rounded-lg border border-green-500/30">
              <h4 className="font-semibold text-green-200">Sortino Ratio</h4>
              <p className="text-2xl font-bold text-green-400">
                {riskMetrics.sortino_ratio.toFixed(2)}
              </p>
            </div>
            <div className="bg-red-500/20 p-4 rounded-lg border border-red-500/30">
              <h4 className="font-semibold text-red-200">Conditional VaR</h4>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(riskMetrics.conditional_var)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const SentimentView = () => (
    <div className="space-y-8">
      {/* Sentiment Analysis Controls */}
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Market Sentiment Analysis
        </h3>
        <button
          onClick={analyzeSentiment}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200"
        >
          {loading ? 'Analyzing...' : 'Analyze Sentiment'}
        </button>
      </div>

      {/* Sentiment Results */}
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-6">Sentiment Results</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sentimentData.map((sentiment) => (
            <div key={sentiment.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-white">{sentiment.symbol}</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  sentiment.sentiment_score > 0.2 ? 'bg-green-500/20 text-green-400' :
                  sentiment.sentiment_score < -0.2 ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {sentiment.sentiment_score > 0.2 ? 'Positive' : 
                   sentiment.sentiment_score < -0.2 ? 'Negative' : 'Neutral'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Sentiment Score:</span>
                  <span className={`font-semibold ${getSentimentColor(sentiment.sentiment_score)}`}>
                    {sentiment.sentiment_score.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Confidence:</span>
                  <span className="font-semibold text-white">{(sentiment.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Volume:</span>
                  <span className="font-semibold text-white">{sentiment.volume}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Source:</span>
                  <span className="font-semibold text-white capitalize">{sentiment.source}</span>
                </div>
              </div>
              {sentiment.text_sample && (
                <div className="mt-3 p-3 bg-white/5 rounded-lg">
                  <p className="text-sm text-gray-300">{sentiment.text_sample}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const YieldView = () => (
    <div className="space-y-8">
      {/* Yield Opportunities Controls */}
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Yield Farming Opportunities
        </h3>
        <button
          onClick={loadYieldOpportunities}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200"
        >
          {loading ? 'Loading...' : 'Refresh Opportunities'}
        </button>
      </div>

      {/* Yield Opportunities */}
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-white/20">
        <h3 className="text-xl font-semibold text-white mb-6">Current Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {yieldOpportunities.map((opportunity) => (
            <div key={opportunity.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-white">{opportunity.protocol}</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  opportunity.risk_score < 2 ? 'bg-green-500/20 text-green-400' :
                  opportunity.risk_score < 4 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  Risk: {opportunity.risk_score.toFixed(1)}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Token Pair:</span>
                  <span className="font-semibold text-white">{opportunity.token_pair}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">APY:</span>
                  <span className="font-semibold text-green-400">{opportunity.apy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">TVL:</span>
                  <span className="font-semibold text-white">{formatCurrency(opportunity.tvl)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">24h Fees:</span>
                  <span className="font-semibold text-white">{formatCurrency(opportunity.fees_24h)}</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white/5 rounded-lg">
                <p className="text-xs text-gray-300">
                  Pool: {opportunity.pool_address.slice(0, 10)}...{opportunity.pool_address.slice(-8)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="absolute inset-0 bg-black/30"></div>
      
      {/* Header */}
      <header className="relative z-10 bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">DeFi Risk Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-300">
                Welcome, {user.name}
              </div>
              <button
                onClick={logout}
                className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'portfolio', label: 'Portfolios', icon: '💼' },
              { id: 'sentiment', label: 'Sentiment', icon: '📈' },
              { id: 'yield', label: 'Yield Farming', icon: '🌾' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main>
          {loading && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white/10 backdrop-blur-lg p-8 rounded-xl shadow-2xl border border-white/20">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mr-4"></div>
                  <p className="text-white text-lg">Processing...</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'portfolio' && <PortfolioView />}
          {activeTab === 'sentiment' && <SentimentView />}
          {activeTab === 'yield' && <YieldView />}
        </main>
      </div>
    </div>
  );
};

// Root App with Auth Provider
const RootApp = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default RootApp;